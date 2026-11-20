import { constants } from 'node:fs';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { safeName } from './filing.js';
import {
  noteResolver,
  DATED_SIGNIFIER,
  parseTasks,
  planning,
  PACKETS_FOLDER,
  PRIORITY_SIGNIFIER,
  type Project,
  type Workstream,
  type VaultNote,
  type VaultTree,
} from '@ai-coach/vault-domain';

export const PACKET_TYPE = 'intermediate-packet';

export type Candidate =
  | { kind: 'note'; path: string; title: string; tasks: number }
  | { kind: 'checklist'; path: string; section: string; items: number }
  | { kind: 'file'; path: string };

export interface PacketInput {
  title: string;

  text?: string;

  from?: string[];
}

export interface HarvestPlan {
  project: string;
  workstream: string;
  candidates: Candidate[];
  packets: { title: string; path: string; files: string[] }[];
  errors: string[];
  warnings: string[];
  collisions: string[];

  writes: Record<string, string>;

  copies: { from: string; to: string }[];
}

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const CHECKBOX = /^(\s*[-*+]\s+)\[(.)\]/;
const SPACED_DATE = new RegExp(`\\s*${DATED_SIGNIFIER.source}`, 'gu');
const SPACED_PRIORITY = new RegExp(`\\s*${PRIORITY_SIGNIFIER.source}`, 'gu');

export function resetChecklist(text: string): string {
  return text
    .split('\n')
    .map((l) => {
      if (!CHECKBOX.test(l)) return l;
      return l
        .replace(CHECKBOX, '$1[ ]')
        .replace(SPACED_DATE, '')
        .replace(SPACED_PRIORITY, '')
        .replace(/\s+#slipped\/[0-9A-Za-z-]+/g, '')
        .replace(/\s+\^[A-Za-z0-9-]+\s*$/, '')
        .replace(/\s+$/, '');
    })
    .join('\n');
}

function sections(body: string): { heading: string; text: string }[] {
  const lines = body.split('\n');
  const out: { heading: string; text: string }[] = [];
  lines.forEach((l, i) => {
    const h = l.match(HEADING);
    if (!h) return;
    let end = lines.findIndex(
      (m, j) => j > i && (m.match(HEADING)?.[1].length ?? 7) <= h[1].length,
    );
    if (end < 0) end = lines.length;
    out.push({
      heading: h[2].trim(),
      text: lines
        .slice(i + 1, end)
        .join('\n')
        .trim(),
    });
  });
  return out;
}

function filesIn(tree: VaultTree, folder: string): string[] {
  const out: string[] = [];
  const walk = (rel: string) => {
    for (const e of tree.entries(rel)) {
      if (e.name.startsWith('.')) continue;
      const child = posix.join(rel, e.name);
      if (e.isDirectory()) walk(child);
      else if (!e.name.endsWith('.md')) out.push(child);
    }
  };
  walk(folder);
  return out;
}

export function harvestWorkstream(
  tree: VaultTree,
  notes: VaultNote[],
  project: string,
  workstream: string,
  packets: PacketInput[] | undefined,
  today: string,
): HarvestPlan {
  const out: HarvestPlan = {
    project,
    workstream,
    candidates: [],
    packets: [],
    errors: [],
    warnings: [],
    collisions: [],
    writes: {},
    copies: [],
  };
  const p = planning(tree, notes);
  const pr: Project | undefined = p.projects.find(
    (x) => x.name === project && !x.archived,
  );
  if (!pr) {
    out.errors.push(`no project ${project} in 1.Projects`);
    return out;
  }
  const ws: Workstream | undefined = pr.workstreams.find(
    (w) => w.name === workstream,
  );
  if (!ws) {
    out.errors.push(
      `no workstream ${workstream} in ${pr.folder}; it has ${pr.workstreams.map((w) => w.name).join(', ') || 'none'}`,
    );
    return out;
  }
  if (ws.status !== 'done')
    out.errors.push(
      `${workstream} is ${ws.status ?? 'without a status'}: set its status to done first, then harvest it`,
    );

  const byPath = new Map(notes.map((n) => [n.path, n]));
  const isFolder = !ws.path.endsWith('.md');
  for (const path of ws.notes) {
    const n = byPath.get(path)!;
    out.candidates.push({
      kind: 'note',
      path,
      title: n.title,
      tasks: parseTasks(path, n.body).length,
    });
    for (const s of sections(n.body)) {
      const items = parseTasks(path, s.text).length;
      if (items >= 3)
        out.candidates.push({
          kind: 'checklist',
          path,
          section: s.heading,
          items,
        });
    }
  }
  if (isFolder)
    for (const f of filesIn(tree, ws.path))
      out.candidates.push({ kind: 'file', path: f });
  if (!packets?.length) return out;

  const folder = posix.join(pr.folder, PACKETS_FOLDER);

  const resolver = noteResolver(notes);
  const linkTo = (note: string | null, name: string) => {
    if (!note) return name;
    const bare = posix.basename(note, '.md');
    if (resolver.resolve(note, { kind: 'wikilink', target: bare }) === note)
      return bare === name ? `[[${bare}]]` : `[[${bare}|${name}]]`;
    out.warnings.push(
      `${bare} names more than one note, so the packet links ${note} by path; that link breaks when the project is archived`,
    );
    return `[[${note.slice(0, -3)}|${name}]]`;
  };
  const projectLink = linkTo(pr.note, pr.name);
  const wsLink = linkTo(ws.note, ws.name);
  const inWorkstream = (path: string) =>
    isFolder ? path.startsWith(`${ws.path}/`) : path === ws.path;
  const targets = new Set<string>();
  const claim = (to: string) => {
    if (tree.exists(to) || targets.has(to)) {
      out.collisions.push(to);
      return false;
    }
    targets.add(to);
    return true;
  };

  for (const k of packets) {
    const name = safeName(k.title);
    if (!name) {
      out.errors.push(
        `packet "${k.title}": the title is empty once characters Obsidian forbids are removed`,
      );
      continue;
    }
    if (!k.text?.trim() && !k.from?.length) {
      out.errors.push(
        `packet "${k.title}": give it text, or what it is built from`,
      );
      continue;
    }
    const path = posix.join(folder, `${name}.md`);
    const body: string[] = [];
    const files: string[] = [];
    for (const ref of k.from ?? []) {
      const [src, section] = ref.split('#');
      if (!inWorkstream(src)) {
        out.errors.push(
          `packet "${k.title}": ${src} is not in the workstream ${workstream}`,
        );
        continue;
      }
      const n = byPath.get(src);
      if (n) {
        const part = section
          ? sections(n.body).find(
              (s) => s.heading.toLowerCase() === section.trim().toLowerCase(),
            )
          : { heading: n.title, text: n.body.trim() };
        if (!part) {
          out.errors.push(
            `packet "${k.title}": no section "${section}" in ${src}`,
          );
          continue;
        }
        body.push(`## ${part.heading}`, '', resetChecklist(part.text), '');
      } else if (tree.exists(src) && tree.isFile(src)) {
        const to = posix.join(folder, posix.basename(src));

        const shared = out.copies.find((c) => c.to === to);
        if (!shared) {
          if (claim(to)) out.copies.push({ from: src, to });
        } else if (shared.from !== src) out.collisions.push(to);
        files.push(to);
        body.push(`![[${posix.basename(src)}]]`, '');
      } else out.errors.push(`packet "${k.title}": no note or file ${src}`);
    }
    if (!claim(path)) continue;
    out.writes[path] = [
      '---',
      `type: ${PACKET_TYPE}`,
      `project: "[[${pr.name}]]"`,
      `workstream: "[[${ws.name}]]"`,
      `harvested: ${today}`,
      '---',
      `# ${k.title}`,
      '',
      `From ${projectLink} → ${wsLink}.`,
      '',
      ...(k.text?.trim() ? [k.text.trim(), ''] : []),
      ...body,
    ]
      .join('\n')
      .replace(/\n+$/, '\n');
    out.packets.push({ title: k.title, path, files });
  }
  if (!out.packets.length && !out.errors.length)
    out.warnings.push('no packet written');
  return out;
}

export async function executeHarvest(
  root: string,
  plan: HarvestPlan,
): Promise<void> {
  if (plan.errors.length || plan.collisions.length)
    throw new Error('refusing to apply a plan with errors or collisions');
  for (const c of plan.copies) {
    await mkdir(dirname(join(root, c.to)), { recursive: true });
    await copyFile(
      join(root, c.from),
      join(root, c.to),
      constants.COPYFILE_EXCL,
    );
  }
  for (const [path, text] of Object.entries(plan.writes)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text, { flag: 'wx' });
  }
}

export const isPacket = (n: VaultNote) => n.frontmatter.type === PACKET_TYPE;
