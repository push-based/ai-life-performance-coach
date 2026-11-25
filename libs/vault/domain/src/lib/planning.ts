import { posix } from '@ai-coach/util-path';
import { PARA_FOLDERS, PLANS_ROOT } from './para.js';
import { extractLinks, type RawLink } from './links.js';
import { noteResolver } from './graph.js';
import type { VaultNote } from './note.js';
import type { VaultListing } from './listing.js';
import {
  HABITS_HEADING,
  HABIT_RULES,
  parseHabits,
  type HabitDefinition,
} from './habits.js';

export const WORKSTREAMS_FOLDER = 'Workstreams';
export const PACKETS_FOLDER = 'Intermediate Packets';

export function isWorkstreamPath(relPath: string): boolean {
  const parts = relPath.split('/');
  return (
    (parts[0] === PARA_FOLDERS.projects || parts[0] === PARA_FOLDERS.archive) &&
    parts.length > 3 &&
    parts[2] === WORKSTREAMS_FOLDER
  );
}

export function workstreamMainNotePath(relPath: string): string | null {
  if (!isWorkstreamPath(relPath)) return null;
  const parts = relPath.split('/');
  if (parts.length === 4) return relPath;
  return posix.join(
    parts[0],
    parts[1],
    WORKSTREAMS_FOLDER,
    parts[3],
    `${parts[3]}.md`,
  );
}

export function isProjectNotePath(relPath: string): boolean {
  const parts = relPath.split('/');
  return (
    (parts[0] === PARA_FOLDERS.projects || parts[0] === PARA_FOLDERS.archive) &&
    parts.length === 3 &&
    parts[2] === `${parts[1]}.md`
  );
}

export function isPlanPath(relPath: string): boolean {
  return relPath.startsWith(`${PLANS_ROOT}/`);
}

const TEMPLATES = `${PLANS_ROOT}/Templates`;

export function isPlanTemplatePath(relPath: string): boolean {
  return relPath.startsWith(`${TEMPLATES}/`);
}

export const PLAN_LEVELS = {
  year: 'Yearly',
  quarter: 'Quarterly',
  month: 'Monthly',
  week: 'Weekly',
  day: 'Daily',
} as const;
export type PlanLevel = keyof typeof PLAN_LEVELS;

const PERIOD: Record<PlanLevel, RegExp> = {
  year: /^\d{4}$/,
  quarter: /^\d{4}-Q[1-4]$/,
  month: /^\d{4}-(0[1-9]|1[0-2])$/,
  week: /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/,
  day: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
};

export const STATUSES = ['todo', 'in-progress', 'blocked', 'done'] as const;
export type Status = (typeof STATUSES)[number];

export const WORKSTREAM_STATUSES = [
  'draft',
  'ready',
  'in-progress',
  'finished',
  'migrated',
] as const;
export type WorkstreamStatus = (typeof WORKSTREAM_STATUSES)[number];

export function parseWorkstreamStatus(value: unknown): WorkstreamStatus | null {
  if (typeof value !== 'string') return null;
  if ((WORKSTREAM_STATUSES as readonly string[]).includes(value))
    return value as WorkstreamStatus;
  if (value === 'todo') return 'ready';
  if (value === 'done') return 'finished';
  return null;
}

export const SIZE_WEIGHTS = { S: 1, M: 3, L: 8 } as const;
export type Size = keyof typeof SIZE_WEIGHTS;

export interface PlanRef {
  level: PlanLevel;

  period: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const monthFolder = (month: number): string =>
  `${month}-${MONTH_NAMES[month - 1]}`;

export const planPathOf = (p: PlanRef): string =>
  p.level === 'day'
    ? posix.join(
        PLANS_ROOT,
        PLAN_LEVELS.day,
        p.period.slice(0, 4),
        monthFolder(Number(p.period.slice(5, 7))),
        `${p.period}.md`,
      )
    : posix.join(PLANS_ROOT, PLAN_LEVELS[p.level], `${p.period}.md`);

export const isPeriodName = (level: PlanLevel, name: string): boolean =>
  PERIOD[level].test(name);

export function flatDay(path: string): string | null {
  const parts = path.split('/');
  if (
    parts.length !== 3 ||
    parts[0] !== PLANS_ROOT ||
    parts[1] !== PLAN_LEVELS.day ||
    !path.endsWith('.md')
  )
    return null;
  const period = parts[2].slice(0, -3);
  return isPeriodName('day', period)
    ? planPathOf({ level: 'day', period })
    : null;
}

export function planOf(path: string): PlanRef | null {
  const parts = path.split('/');
  if (parts[0] !== PLANS_ROOT || !path.endsWith('.md')) return null;
  const level = (Object.keys(PLAN_LEVELS) as PlanLevel[]).find(
    (l) => PLAN_LEVELS[l] === parts[1],
  );
  if (!level) return null;
  const ref = { level, period: posix.basename(path, '.md') };
  return isPeriodName(level, ref.period) &&
    (planPathOf(ref) === path || flatDay(path))
    ? ref
    : null;
}

export function planPathIn(p: PlanRef, has: (path: string) => boolean): string {
  const path = planPathOf(p);
  const flat = posix.join(PLANS_ROOT, PLAN_LEVELS.day, `${p.period}.md`);
  return p.level === 'day' && !has(path) && has(flat) ? flat : path;
}

export type Priority = 'highest' | 'high' | 'medium' | 'low' | 'lowest';
const PRIORITY: Record<string, Priority> = {
  '🔺': 'highest',
  '⏫': 'high',
  '🔼': 'medium',
  '🔽': 'low',
  '⏬': 'lowest',
};

export const DATED_SIGNIFIER = /[⏳✅📅🛫➕❌]\uFE0F?\s*\d{4}-\d{2}-\d{2}/gu;
export const PRIORITY_SIGNIFIER = /[🔺⏫🔼🔽⏬]\uFE0F?/gu;

export const FIRST_SIGNIFIER =
  /\s(?:[⏳✅📅🛫➕❌🔺⏫🔼🔽⏬🔁🏁🆔⛔]|\^[A-Za-z0-9-]+\s*$)/u;

export const TASK_ID = /🆔\uFE0F?\s*([A-Za-z0-9_-]+)/u;
export const BLOCKED_BY =
  /⛔\uFE0F?\s*([A-Za-z0-9_-]+(?:\s*,\s*[A-Za-z0-9_-]+)*)/u;

export const OPEN_CHECKBOX = /^\s*[-*+]\s+\[[^xX-]\]/;

export const lines = (text: string) => text.split(/\r?\n/);

export type TaskState = 'open' | 'done' | 'cancelled' | 'missed';

export interface Task {
  note: string;

  line: number;

  text: string;

  state: TaskState;
  scheduled: string | null;
  doneOn: string | null;
  cancelledOn: string | null;
  missedReason: string | null;
  priority: Priority | null;
  size: Size | null;
  weight: number;

  slipped: string[];

  recurrence: string | null;

  id: string | null;

  blockedBy: string[];

  blockId: string | null;

  parent: { target: string; block: string } | null;

  goal: boolean;

  habit: boolean;
  links: RawLink[];
}

const CHECKBOX = /^(\s*)[-*+]\s+\[(.)\]\s+(.*)$/;
const DATE = (sign: string) =>
  new RegExp(`${sign}\\uFE0F?\\s*(\\d{4}-\\d{2}-\\d{2})`);
const SCHEDULED = DATE('⏳');
const DONE = DATE('✅');
const CANCELLED = DATE('❌');
const PARENT = /↑\s*\[\[([^\]|#]+)#\^([A-Za-z0-9-]+)(?:\|[^\]]*)?\]\]/;
const SIZE = /(?:^|\s)#([SML])(?=\s|$)/;
const SLIPPED = /(?:^|\s)#slipped\/([0-9A-Za-z-]+)/g;
const MISSED_TAG = /(?:^|\s)#missed(?=\s|$)/g;
const MISSED_REASON = /^(\s*)[-*+]\s+missed:\s*(.+)$/i;
const RECURRENCE = /🔁\uFE0F?\s*([^⏳✅📅🛫➕❌🔺⏫🔼🔽⏬🏁🆔⛔↑#^]*)/u;
const BLOCK_ID = /\s\^([A-Za-z0-9-]+)\s*$/;
const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FENCE_LINE = /^\s*(```|~~~)/;

const indentWidth = (ws: string) => ws.replace(/\t/g, '  ').length;

function findMissedReason(
  all: string[],
  taskLine: number,
  taskIndent: string,
): string | null {
  const base = indentWidth(taskIndent);
  for (let i = taskLine + 1; i < all.length; i++) {
    const raw = all[i];
    if (!raw.trim() || HEADING.test(raw)) break;
    const ws = raw.match(/^(\s*)/)?.[1] ?? '';
    if (indentWidth(ws) <= base) break;
    const hit = raw.match(MISSED_REASON);
    if (hit) return hit[2].trim();
  }
  return null;
}

export function parseTasks(
  note: string,
  body: string,
  plan: PlanRef | null = null,
): Task[] {
  const out: Task[] = [];
  let fenced = false;
  let inGoals = false;
  let inHabits = false;
  const all = lines(body);
  all.forEach((raw, line) => {
    if (FENCE_LINE.test(raw)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    const h = raw.match(HEADING);
    if (h) {
      const name = h[2].trim().toLowerCase();
      inGoals = name === 'goals';
      inHabits = name === HABITS_HEADING.toLowerCase();
      return;
    }
    const m = raw.match(CHECKBOX);
    if (!m) return;
    const taskIndent = m[1];
    const mark = m[2];
    let rest = m[3];
    const hasMissed = mark === '-' && MISSED_TAG.test(rest);
    MISSED_TAG.lastIndex = 0;
    const state: TaskState =
      mark === 'x' || mark === 'X'
        ? 'done'
        : hasMissed
          ? 'missed'
          : mark === '-'
            ? 'cancelled'
            : 'open';
    const scheduled = rest.match(SCHEDULED)?.[1] ?? null;
    const doneOn = rest.match(DONE)?.[1] ?? null;
    const cancelledOn = rest.match(CANCELLED)?.[1] ?? null;
    const missedReason =
      state === 'missed' ? findMissedReason(all, line, taskIndent) : null;
    const priority = [...rest].map((c) => PRIORITY[c]).find(Boolean) ?? null;
    const size = (rest.match(SIZE)?.[1] as Size | undefined) ?? null;
    const slipped = [...rest.matchAll(SLIPPED)].map((s) => s[1]);
    const recurrence = rest.match(RECURRENCE)?.[1].trim() || null;
    const id = rest.match(TASK_ID)?.[1] ?? null;
    const blockedBy =
      rest
        .match(BLOCKED_BY)?.[1]
        .split(',')
        .map((x) => x.trim()) ?? [];
    const p = rest.match(PARENT);
    const parent = p ? { target: p[1].trim(), block: p[2] } : null;

    rest = rest
      .replace(PARENT, '')
      .replace(RECURRENCE, '')
      .replace(TASK_ID, '')
      .replace(BLOCKED_BY, '')
      .replace(/🏁\uFE0F?\s*[a-z]+/u, '')
      .replace(DATED_SIGNIFIER, '')
      .replace(PRIORITY_SIGNIFIER, '');
    const blockId = rest.match(BLOCK_ID)?.[1] ?? null;
    rest = rest
      .replace(BLOCK_ID, '')
      .replace(/(?:^|\s)#[SML](?=\s|$)/g, ' ')
      .replace(SLIPPED, ' ')
      .replace(MISSED_TAG, ' ');
    out.push({
      note,
      line,
      text: rest.replace(/\s+/g, ' ').trim(),
      state,
      scheduled,
      doneOn,
      cancelledOn,
      missedReason,
      priority,
      size,
      weight: size ? SIZE_WEIGHTS[size] : 1,
      slipped,
      recurrence,
      id,
      blockedBy,
      blockId,
      parent,
      goal: inGoals && plan !== null && plan.level !== 'day',
      habit: inHabits && plan?.level === 'day',

      links: extractLinks(m[3].replace(PARENT, '')),
    });
  });
  return out;
}

export interface Workstream {
  name: string;
  project: string;

  path: string;

  note: string | null;
  status: WorkstreamStatus | null;

  notes: string[];
}

export interface Project {
  name: string;
  folder: string;

  note: string | null;
  status: Status | null;
  deadline: string | null;
  doneWhen: string | null;
  workstreams: Workstream[];

  packets: string[];

  archived: boolean;
}

export interface Area {
  name: string;
  path: string;
  note: string | null;
  status: Status | null;
  notes: string[];
}

export interface Plan extends PlanRef {
  path: string;
  title: string;
}

export interface Owner {
  project: string | null;
  workstream: string | null;
  area: string | null;
}

export interface OwnedTask extends Task {
  owner: Owner;

  plan: PlanRef | null;
}

export interface Habit extends HabitDefinition {
  note: string;
  owner: Owner;
}

export interface Planning {
  projects: Project[];
  areas: Area[];
  plans: Plan[];

  habits: Habit[];

  tasks: OwnedTask[];
  warnings: string[];
}

function statusOf(
  note: VaultNote | undefined,
  warnings: string[],
): Status | null {
  const s = note?.frontmatter.status;
  if (s === undefined || s === null) return null;
  if (typeof s === 'string' && (STATUSES as readonly string[]).includes(s))
    return s as Status;
  warnings.push(
    `${note!.path}: status "${String(s)}" is not one of ${STATUSES.join(', ')}`,
  );
  return null;
}

function workstreamStatusOf(
  note: VaultNote | undefined,
  warnings: string[],
): WorkstreamStatus | null {
  const s = note?.frontmatter.status;
  if (s === undefined || s === null) return null;
  const parsed = parseWorkstreamStatus(s);
  if (parsed) return parsed;
  warnings.push(
    `${note!.path}: status "${String(s)}" is not one of ${WORKSTREAM_STATUSES.join(', ')}`,
  );
  return null;
}

const text = (v: unknown) =>
  typeof v === 'string' && v.trim()
    ? v.trim()
    : v instanceof Date
      ? v.toISOString().slice(0, 10)
      : null;
const under = (p: string, folder: string) => p.startsWith(`${folder}/`);

function units(
  listing: VaultListing,
  dir: string,
  notes: VaultNote[],
  skip: string[] = [],
) {
  const folders = new Set(listing.dirsIn(dir));
  const names = new Set(
    [...folders, ...listing.mdIn(dir)].filter((n) => !skip.includes(n)),
  );
  const inDir = notes.filter((n) => under(n.path, dir));
  return [...names].sort().map((name) => {
    const folder = posix.join(dir, name);
    const single = `${folder}.md`;
    const own = `${folder}/${name}.md`;
    const isFolder = folders.has(name);
    const members = inDir
      .filter((n) => (isFolder && under(n.path, folder)) || n.path === single)
      .map((n) => n.path);
    const note = members.includes(own)
      ? own
      : members.includes(single)
        ? single
        : null;
    return { name, path: isFolder ? folder : single, note, notes: members };
  });
}

export function planning(listing: VaultListing, notes: VaultNote[]): Planning {
  const warnings: string[] = [];
  const byPath = new Map(notes.map((n) => [n.path, n]));

  const project = (
    bucket: string,
    name: string,
    archived: boolean,
  ): Project => {
    const folder = posix.join(bucket, name);
    const notePath = `${folder}/${name}.md`;
    const pn = byPath.get(notePath);
    const ws = posix.join(folder, WORKSTREAMS_FOLDER);
    if (!archived && !pn)
      warnings.push(`${folder}: no project note ${notePath}`);
    return {
      name,
      folder,
      note: pn ? notePath : null,
      status: statusOf(pn, archived ? [] : warnings),
      deadline: text(pn?.frontmatter.deadline),
      doneWhen: text(pn?.frontmatter.done_when),
      workstreams: units(listing, ws, notes).map((u) => ({
        ...u,
        project: name,
        status: workstreamStatusOf(
          byPath.get(u.note ?? ''),
          archived ? [] : warnings,
        ),
      })),
      packets: notes
        .filter((n) => under(n.path, posix.join(folder, PACKETS_FOLDER)))
        .map((n) => n.path),
      archived,
    };
  };
  const active = listing.dirsIn(PARA_FOLDERS.projects);

  const archivedNames = listing
    .dirsIn(PARA_FOLDERS.archive)
    .filter(
      (name) =>
        !active.includes(name) &&
        (byPath.has(posix.join(PARA_FOLDERS.archive, name, `${name}.md`)) ||
          listing
            .dirsIn(posix.join(PARA_FOLDERS.archive, name))
            .includes(WORKSTREAMS_FOLDER)),
    );
  const projects: Project[] = [
    ...active.map((name) => project(PARA_FOLDERS.projects, name, false)),
    ...archivedNames.map((name) => project(PARA_FOLDERS.archive, name, true)),
  ];

  const areas: Area[] = units(listing, PARA_FOLDERS.areas, notes).map((u) => ({
    ...u,
    status: statusOf(byPath.get(u.note ?? ''), warnings),
  }));

  const plans: Plan[] = [];
  for (const n of notes) {
    if (!under(n.path, PLANS_ROOT) || under(n.path, TEMPLATES)) continue;
    const ref = planOf(n.path);
    if (ref) plans.push({ ...ref, path: n.path, title: n.title });
    else
      warnings.push(
        `${n.path}: not a plan name; expected ${PLANS_ROOT}/<${Object.values(PLAN_LEVELS).join('|')}>/<period>.md, a day as ${PLANS_ROOT}/${PLAN_LEVELS.day}/<year>/<month number>-<month name>/YYYY-MM-DD.md`,
      );
    const grouped = flatDay(n.path);
    if (grouped)
      warnings.push(
        `${n.path}: a day plan outside its month's folder; init_vault moves it to ${grouped}`,
      );
  }

  const ownerByNote = new Map<string, Owner>();
  const projectByFolder = new Map(projects.map((p) => [p.folder, p]));
  for (const n of notes) {
    const p = projectByFolder.get(n.path.split('/').slice(0, 2).join('/'));
    if (p && !under(n.path, posix.join(p.folder, PACKETS_FOLDER)))
      ownerByNote.set(n.path, {
        project: p.name,
        workstream: null,
        area: null,
      });
  }
  for (const p of projects)
    for (const w of p.workstreams)
      for (const n of w.notes)
        ownerByNote.set(n, { project: p.name, workstream: w.name, area: null });
  for (const a of areas)
    for (const n of a.notes)
      ownerByNote.set(n, { project: null, workstream: null, area: a.name });

  const resolver = noteResolver(notes);
  const none: Owner = { project: null, workstream: null, area: null };

  const tasks: OwnedTask[] = [];
  for (const n of notes) {
    const plan = planOf(n.path);

    if ((!plan && !ownerByNote.has(n.path)) || under(n.path, TEMPLATES))
      continue;
    for (const t of parseTasks(n.path, n.body, plan)) {
      let owner = ownerByNote.get(n.path) ?? none;
      if (plan) {
        owner = none;
        for (const link of t.links) {
          const target = resolver.resolve(n.path, link);
          const o = target ? ownerByNote.get(target) : undefined;
          if (o) {
            owner = o;
            break;
          }
        }
        if (owner === none)
          warnings.push(
            `${n.path}:${t.line + 1}: "${t.text}" links no project, workstream or area`,
          );
        if (t.goal && plan.level !== 'year' && !t.parent)
          warnings.push(
            `${n.path}:${t.line + 1}: goal "${t.text}" links no parent goal`,
          );
      }
      tasks.push({ ...t, owner, plan });
    }
  }
  const finished = new Set<string>();
  for (const pr of projects) {
    for (const w of pr.workstreams)
      if (pr.archived || w.status === 'finished' || w.status === 'migrated')
        w.notes.forEach((n) => finished.add(n));
    if (pr.archived)
      for (const n of notes) if (under(n.path, pr.folder)) finished.add(n.path);
  }
  for (const a of areas)
    if (a.status === 'done') a.notes.forEach((n) => finished.add(n));
  const habits: Habit[] = [];
  for (const n of notes) {
    const owner = ownerByNote.get(n.path);
    if (!owner || planOf(n.path) || finished.has(n.path)) continue;
    const found = parseHabits(n.body);
    for (const h of found.habits) habits.push({ ...h, note: n.path, owner });
    for (const h of found.invalid)
      warnings.push(
        `${n.path}:${h.line + 1}: habit "${h.text}" has the rule "${h.rule}"; use ${HABIT_RULES}`,
      );
  }
  return { projects, areas, plans, habits, tasks, warnings };
}
