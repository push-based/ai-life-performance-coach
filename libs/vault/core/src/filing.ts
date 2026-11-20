import type { NoteStore } from './note-store.js';
import { posix } from 'node:path';
import { TEMPLATES, TEMPLATES_FOLDER, templatePath } from './plans.js';
import {
  classify,
  COACH_ROOT,
  PLANS_ROOT,
  PARA_BUCKETS,
  PARA_FOLDERS,
  type ParaBucket,
  noteResolver,
  type VaultNote,
  flatDay,
  PACKETS_FOLDER,
  PLAN_LEVELS,
  WORKSTREAMS_FOLDER,
  type VaultTree,
} from '@ai-coach/vault-domain';

export const OLD_NOTES = posix.join(PARA_FOLDERS.archive, 'old notes');

export type FilingAction =
  | { op: 'rename'; from: string; to: string }
  | { op: 'create'; to: string }
  | { op: 'move'; from: string; to: string }
  | { op: 'write'; to: string }
  | { op: 'remove_empty'; from: string };

export interface FilingPlan {
  actions: FilingAction[];

  collisions: string[];
  errors: string[];

  warnings: string[];

  contents?: Record<string, string>;

  suggestions?: KeepSuggestion[];
}

export interface KeepSuggestion {
  path: string;

  to: string;
  reasons: string[];
}

export interface ArchiveOptions {
  keep?: { note: string; to?: string }[];

  keepSuggested?: boolean;
}

const empty = (): FilingPlan => ({
  actions: [],
  collisions: [],
  errors: [],
  warnings: [],
});
const CANONICAL = new Set<string>(Object.values(PARA_FOLDERS));
const ALIAS: Record<ParaBucket, RegExp> = {
  inbox: /^\d*[\s._-]*inbox$/i,
  projects: /^\d*[\s._-]*projects?$/i,
  areas: /^\d*[\s._-]*areas?$/i,
  resources: /^\d*[\s._-]*resources?$/i,
  archive: /^\d*[\s._-]*archives?$/i,
};
const isHidden = (name: string) => name.startsWith('.');
const bucketOfAlias = (name: string) =>
  PARA_BUCKETS.find((b) => ALIAS[b].test(name)) ?? null;

function mapThrough(
  renames: { from: string; to: string }[],
  p: string,
): string {
  const r = renames.find((r) => p === r.from || p.startsWith(`${r.from}/`));
  return r ? r.to + p.slice(r.from.length) : p;
}

function unmap(renames: { from: string; to: string }[], p: string): string {
  const r = renames.find((r) => p === r.to || p.startsWith(`${r.to}/`));
  return r ? r.from + p.slice(r.to.length) : p;
}

export interface InitOptions {
  areas?: string[];
}

export function planInit(tree: VaultTree, opts: InitOptions = {}): FilingPlan {
  const plan = empty();
  const top = tree
    .dirsIn('')
    .filter((n) => n !== COACH_ROOT && n !== PLANS_ROOT);
  const candidates = new Map<ParaBucket, string[]>();
  const consider = (rel: string, name: string) => {
    const b = bucketOfAlias(name);
    if (b && !tree.exists(PARA_FOLDERS[b]))
      candidates.set(b, [...(candidates.get(b) ?? []), rel]);
  };
  for (const name of top) {
    if (CANONICAL.has(name)) continue;
    if (name.toLowerCase() === 'para')
      for (const child of tree.dirsIn(name))
        consider(posix.join(name, child), child);
    else consider(name, name);
  }
  const renames: { from: string; to: string }[] = [];
  for (const b of PARA_BUCKETS) {
    const found = candidates.get(b) ?? [];
    if (found.length > 1)
      plan.errors.push(
        `more than one folder could be ${PARA_FOLDERS[b]}: ${found.join(', ')}; rename one by hand`,
      );
    else if (found.length === 1)
      renames.push({ from: found[0], to: PARA_FOLDERS[b] });
  }
  for (const r of renames) plan.actions.push({ op: 'rename', ...r });
  for (const b of PARA_BUCKETS) {
    const folder = PARA_FOLDERS[b];
    if (!tree.exists(folder) && !renames.some((r) => r.to === folder))
      plan.actions.push({ op: 'create', to: folder });
  }

  const notes = tree.notePaths().map((p) => ({
    from: p,
    after: mapThrough(renames, p),
  }));
  const afterSet = new Set(notes.map((n) => n.after));
  const moving = notes.filter(
    (n) =>
      classify(n.after).bucket === null &&
      !n.after.startsWith(`${PLANS_ROOT}/`),
  );
  for (const n of moving) {
    const to = posix.join(OLD_NOTES, n.after);
    if (afterSet.has(to) || tree.exists(unmap(renames, to)))
      plan.collisions.push(to);
    else plan.actions.push({ op: 'move', from: n.after, to });
  }

  const movingSet = new Set(moving.map((n) => n.after));
  const stays: string[] = [];
  const walk = (rel: string): boolean => {
    let onlyNotes = true;
    for (const e of tree.entries(unmap(renames, rel))) {
      const child = posix.join(rel, e.name);
      if (e.name === '.DS_Store' || renames.some((r) => r.from === child))
        continue;
      if (e.isDirectory() && !isHidden(e.name))
        onlyNotes = walk(child) && onlyNotes;
      else if (!movingSet.has(child)) {
        stays.push(child);
        onlyNotes = false;
      }
    }
    return onlyNotes;
  };
  for (const name of tree
    .dirsIn('')
    .filter((n) => n !== COACH_ROOT && n !== PLANS_ROOT && !CANONICAL.has(n))) {
    if (renames.some((r) => r.from === name)) continue;
    if (walk(name)) plan.actions.push({ op: 'remove_empty', from: name });
  }
  for (const e of tree.entries('')) {
    if (e.isFile() && !isHidden(e.name) && !e.name.endsWith('.md'))
      stays.push(e.name);
  }
  if (stays.length)
    plan.warnings.push(`left in place (not notes): ${stays.join(', ')}`);
  planPlanningLayout(tree, plan, renames, opts);
  return plan;
}

function planPlanningLayout(
  tree: VaultTree,
  plan: FilingPlan,
  renames: { from: string; to: string }[],
  opts: InitOptions,
): void {
  const contents = (plan.contents ??= {});
  const planned = new Set(
    plan.actions.flatMap((a) => ('to' in a ? [a.to] : [])),
  );

  for (const folder of [
    PLANS_ROOT,
    ...Object.values(PLAN_LEVELS).map((l) => posix.join(PLANS_ROOT, l)),
    TEMPLATES_FOLDER,
  ]) {
    if (!tree.exists(folder)) plan.actions.push({ op: 'create', to: folder });
  }
  const dayFolder = posix.join(PLANS_ROOT, PLAN_LEVELS.day);
  for (const file of filesIn(tree, dayFolder)) {
    const from = posix.join(dayFolder, file);
    const to = flatDay(from);
    if (!to) continue;
    if (tree.exists(to)) plan.collisions.push(to);
    else plan.actions.push({ op: 'move', from, to });
  }
  for (const level of Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]) {
    const to = templatePath(level);
    if (tree.exists(to)) continue;
    plan.actions.push({ op: 'write', to });
    contents[to] = TEMPLATES[level];
  }

  const projectsRoot = PARA_FOLDERS.projects;
  if (
    renames.some((r) => r.to === projectsRoot) ||
    !tree.exists(projectsRoot)
  ) {
    plan.warnings.push(
      `${projectsRoot} is created or renamed by this run; run init_vault again to write its missing project notes`,
    );
  } else {
    for (const name of tree.dirsIn(projectsRoot)) {
      const folder = posix.join(projectsRoot, name);
      const ws = posix.join(folder, WORKSTREAMS_FOLDER);
      const projectNote = posix.join(folder, `${name}.md`);
      if (tree.exists(projectNote) || planned.has(projectNote)) continue;
      const units = [
        ...tree.dirsIn(ws).map((d) => ({
          name: d,
          note: tree.exists(posix.join(ws, d, `${d}.md`))
            ? `${d}/${d}.md`
            : null,
        })),
        ...filesIn(tree, ws)
          .filter((f) => f.endsWith('.md'))
          .map((f) => ({ name: f.slice(0, -3), note: f })),
      ].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      const list = units.map((u) =>
        u.note
          ? `- [[${posix.join(ws, u.note).slice(0, -3)}|${u.name}]]`
          : `- ${u.name} (folder)`,
      );
      plan.actions.push({ op: 'write', to: projectNote });
      contents[projectNote] =
        `---\nstatus: in-progress\ndeadline:\ndone_when:\n---\n# ${name}\n\n## Workstreams\n\n${list.length ? list.join('\n') : 'None yet.'}\n`;
    }
  }

  const areasRoot = PARA_FOLDERS.areas;
  for (const raw of opts.areas ?? []) {
    const name = safeName(raw);
    if (!name) {
      plan.errors.push(
        `area name "${raw}" is empty once characters Obsidian forbids are removed`,
      );
      continue;
    }
    const to = posix.join(areasRoot, `${name}.md`);

    if (
      tree.exists(unmap(renames, to)) ||
      tree.exists(unmap(renames, posix.join(areasRoot, name))) ||
      planned.has(to)
    )
      continue;
    if (
      !tree.exists(areasRoot) &&
      !plan.actions.some((a) => a.op === 'create' && a.to === areasRoot) &&
      !renames.some((r) => r.to === areasRoot)
    ) {
      plan.actions.push({ op: 'create', to: areasRoot });
    }
    plan.actions.push({ op: 'write', to });
    contents[to] = `# ${name}\n`;
    planned.add(to);
  }
}

function filesIn(tree: VaultTree, dir: string): string[] {
  return tree
    .entries(dir)
    .filter((e) => e.isFile())
    .map((e) => e.name);
}

const UNSAFE = /[\\/:*?"<>|#^[\]]/g;

export function safeName(name: string): string | null {
  const s = name
    .replace(UNSAFE, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '');
  return /[^\s-]/.test(s) ? s : null;
}

export function planCapture(
  tree: VaultTree,
  title: string,
  body: string,
): FilingPlan {
  const plan = empty();
  const name = safeName(title);
  if (!name) {
    plan.errors.push(
      'title is empty once characters Obsidian forbids in file names are removed',
    );
    return plan;
  }
  const to = posix.join(PARA_FOLDERS.inbox, `${name}.md`);
  if (!tree.exists(PARA_FOLDERS.inbox))
    plan.actions.push({ op: 'create', to: PARA_FOLDERS.inbox });
  if (tree.exists(to)) plan.collisions.push(to);
  else plan.actions.push({ op: 'write', to });
  plan.contents = { [to]: body.endsWith('\n') ? body : `${body}\n` };
  return plan;
}

function brokenByMove(notes: VaultNote[], from: string, to: string): string[] {
  const before = noteResolver(notes);
  const after = noteResolver(notes, { from, to });
  const out: string[] = [];
  for (const n of notes) {
    for (const l of n.links.filter((l) => l.kind === 'markdown')) {
      const was = before.resolve(n.path, l);
      if (!was || (n.path !== from && was !== from)) continue;
      const now = after.resolve(n.path === from ? to : n.path, l);
      if (now !== (was === from ? to : was))
        out.push(`${n.path} → ${l.target}`);
    }
  }
  return out;
}

export function planFileNote(
  tree: VaultTree,
  notes: VaultNote[],
  path: string,
  toFolder: string,
): FilingPlan {
  const plan = empty();
  const note = notes.find((n) => n.path === path);
  if (!note) {
    plan.errors.push(`no note ${path}`);
    return plan;
  }
  const folder = posix
    .normalize(toFolder.replace(/\\/g, '/'))
    .replace(/^\/+|\/+$/g, '');
  const parts = folder.split('/');
  if (
    !CANONICAL.has(parts[0]) ||
    parts.some((p) => p === '..' || isHidden(p))
  ) {
    plan.errors.push(
      `${toFolder} is not a folder under ${Object.values(PARA_FOLDERS).join(', ')}`,
    );
    return plan;
  }
  const to = posix.join(folder, posix.basename(path));
  if (to === path) {
    plan.errors.push(`${path} is already in ${folder}`);
    return plan;
  }
  if (!tree.exists(folder)) plan.actions.push({ op: 'create', to: folder });
  if (tree.exists(to)) plan.collisions.push(to);
  else plan.actions.push({ op: 'move', from: path, to });
  const broken = brokenByMove(notes, path, to);
  if (broken.length)
    plan.warnings.push(
      `relative markdown links that will no longer resolve: ${broken.join('; ')}`,
    );
  return plan;
}

export function keepSuggestions(
  notes: VaultNote[],
  project: string,
): KeepSuggestion[] {
  const folder = posix.join(PARA_FOLDERS.projects, project);
  const inside = (p: string) => p.startsWith(`${folder}/`);

  const packet = (p: string) =>
    p.startsWith(`${posix.join(folder, PACKETS_FOLDER)}/`);
  const resolver = noteResolver(notes);
  const byPath = new Map(notes.map((n) => [n.path, n]));
  const linkedFrom = new Map<string, Set<string>>();
  for (const n of notes) {
    if (inside(n.path)) continue;
    for (const l of n.links) {
      const t = resolver.resolve(n.path, l);
      if (t && inside(t))
        linkedFrom.set(t, (linkedFrom.get(t) ?? new Set()).add(n.path));
    }
  }
  const out: KeepSuggestion[] = [];
  for (const n of notes.filter((x) => inside(x.path) && !packet(x.path))) {
    const reasons: string[] = [];
    if (n.concept) reasons.push('a concept note');
    if (n.coachId) reasons.push('has sparring history');
    if (
      n.links.some((l) => {
        const t = resolver.resolve(n.path, l);
        return !!t && !!byPath.get(t)?.raw;
      })
    )
      reasons.push('cites raw material');
    const outside = linkedFrom.get(n.path)?.size ?? 0;
    if (outside)
      reasons.push(
        `linked from ${outside} note${outside === 1 ? '' : 's'} outside the project`,
      );
    if (reasons.length)
      out.push({
        path: n.path,
        to: n.concept
          ? posix.join(PARA_FOLDERS.resources, 'Concepts')
          : posix.join(PARA_FOLDERS.resources, project),
        reasons,
      });
  }
  return out;
}

export const RESOURCE_PACKETS = posix.join(
  PARA_FOLDERS.resources,
  PACKETS_FOLDER,
);

export function planArchiveProject(
  tree: VaultTree,
  project: string,
  notes: VaultNote[] = [],
  opts: ArchiveOptions = {},
): FilingPlan {
  const plan = empty();
  if (
    !project ||
    project.includes('/') ||
    project.includes('\\') ||
    isHidden(project) ||
    project === '..'
  ) {
    plan.errors.push(`${project} is not a project folder name`);
    return plan;
  }
  const from = posix.join(PARA_FOLDERS.projects, project);
  if (!tree.isDir(from)) {
    plan.errors.push(`no project folder ${from}`);
    return plan;
  }
  const to = posix.join(PARA_FOLDERS.archive, project);
  const packetsFrom = posix.join(from, PACKETS_FOLDER);
  const packetsTo = posix.join(RESOURCE_PACKETS, project);
  const hasPackets = tree.exists(packetsFrom) && tree.isDir(packetsFrom);
  if (hasPackets) {
    if (!tree.exists(RESOURCE_PACKETS))
      plan.actions.push({ op: 'create', to: RESOURCE_PACKETS });
    if (tree.exists(packetsTo)) plan.collisions.push(packetsTo);
    else plan.actions.push({ op: 'move', from: packetsFrom, to: packetsTo });
  }
  const suggestions = keepSuggestions(notes, project);
  plan.suggestions = suggestions;
  const suggested = new Map(suggestions.map((s) => [s.path, s.to]));
  const keep = [
    ...(opts.keepSuggested
      ? suggestions.map((s) => ({ note: s.path, to: s.to }))
      : []),
    ...(opts.keep ?? []),
  ];
  const seen = new Set<string>(),
    created = new Set<string>(),
    targets = new Set<string>(),
    kept = new Set<string>();
  for (const k of keep) {
    if (seen.has(k.note)) continue;
    seen.add(k.note);
    if (
      !k.note.startsWith(`${from}/`) ||
      !notes.some((n) => n.path === k.note)
    ) {
      plan.errors.push(`keep: ${k.note} is not a note in ${from}`);
      continue;
    }
    if (hasPackets && k.note.startsWith(`${packetsFrom}/`)) {
      plan.warnings.push(
        `keep: ${k.note} moves with the Intermediate Packets to ${packetsTo}`,
      );
      continue;
    }
    const dest = posix
      .normalize(
        (
          k.to ??
          suggested.get(k.note) ??
          posix.join(PARA_FOLDERS.resources, project)
        ).replace(/\\/g, '/'),
      )
      .replace(/^\/+|\/+$/g, '');
    const at = classify(`${dest}/x.md`);
    if (
      dest.split('/').some((p) => p === '..' || isHidden(p)) ||
      at.bucket !== 'resources' ||
      at.raw
    ) {
      plan.errors.push(
        `keep: ${dest} is not a folder under 3.Resources outside 0.Raw`,
      );
      continue;
    }
    const target = posix.join(dest, posix.basename(k.note));
    if (!tree.exists(dest) && !created.has(dest)) {
      plan.actions.push({ op: 'create', to: dest });
      created.add(dest);
    }
    if (tree.exists(target) || targets.has(target))
      plan.collisions.push(target);
    else {
      plan.actions.push({ op: 'move', from: k.note, to: target });
      targets.add(target);
      kept.add(k.note);
    }
    const broken = brokenByMove(notes, k.note, target);
    if (broken.length)
      plan.warnings.push(
        `relative markdown links that will no longer resolve: ${broken.join('; ')}`,
      );
  }

  const leaves = (f: string) =>
    kept.has(posix.join(from, f)) ||
    (hasPackets && posix.join(from, f).startsWith(`${packetsFrom}/`));
  if ((kept.size || hasPackets) && filesUnder(tree, from).every(leaves)) {
    plan.actions.push({ op: 'remove_empty', from });
    return plan;
  }
  if (!tree.exists(PARA_FOLDERS.archive))
    plan.actions.push({ op: 'create', to: PARA_FOLDERS.archive });
  if (tree.exists(to)) plan.collisions.push(to);
  else plan.actions.push({ op: 'move', from, to });
  return plan;
}

function filesUnder(tree: VaultTree, dir: string, rel = ''): string[] {
  return tree
    .entries(posix.join(dir, rel))
    .filter((e) => !isHidden(e.name))
    .flatMap((e) =>
      e.isDirectory()
        ? filesUnder(tree, dir, posix.join(rel, e.name))
        : [posix.join(rel, e.name)],
    );
}

export async function executeFiling(
  store: NoteStore,
  plan: FilingPlan,
): Promise<void> {
  if (plan.errors.length || plan.collisions.length)
    throw new Error('refusing to apply a plan with errors or collisions');
  for (const a of plan.actions) {
    switch (a.op) {
      case 'rename':
        await store.moveDir(a.from, a.to);
        break;
      case 'create':
        await store.makeDir(a.to);
        break;
      case 'move':
        if (await store.isDir(a.from)) await store.moveDir(a.from, a.to);
        else await store.moveFile(a.from, a.to);
        break;
      case 'write':
        await store.writeText(a.to, plan.contents![a.to], { create: true });
        break;
      case 'remove_empty':
        await store.removeEmptyDirs(a.from);
        break;
    }
  }
}
