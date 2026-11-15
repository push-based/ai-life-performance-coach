/**
 * Planning in the vault (ADR-KI-0062): projects with their project notes and
 * workstreams, areas, the year-to-day plans under `Plans/`, and the tasks and goals in
 * them, written in Obsidian Tasks syntax. Reading only: nothing here writes a note.
 *
 * Structure comes from folders, so a workstream folder that holds only images is still
 * a workstream; tasks come from note bodies.
 */

import { readdirSync } from "node:fs";
import { join, posix } from "node:path";
import { PARA_FOLDERS, PLANS_ROOT } from "./para.js";
import { extractLinks, type RawLink } from "./links.js";
import { noteResolver } from "./graph.js";
import type { VaultNote } from "./scan.js";
import { HABITS_HEADING, HABIT_RULES, parseHabits, type HabitDefinition } from "./habits.js";

export const WORKSTREAMS_FOLDER = "Workstreams";
export const PACKETS_FOLDER = "Intermediate Packets";
/** Plan templates, one per level, beside the plans; they are not plans and hold no tasks. */
const TEMPLATES = `${PLANS_ROOT}/Templates`;

export const PLAN_LEVELS = { year: "Yearly", quarter: "Quarterly", month: "Monthly", week: "Weekly", day: "Daily" } as const;
export type PlanLevel = keyof typeof PLAN_LEVELS;

const PERIOD: Record<PlanLevel, RegExp> = {
  year: /^\d{4}$/,
  quarter: /^\d{4}-Q[1-4]$/,
  month: /^\d{4}-(0[1-9]|1[0-2])$/,
  week: /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/,
  day: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
};

/** Shared by projects, workstreams and areas (Decision 2). */
export const STATUSES = ["todo", "in-progress", "blocked", "done"] as const;
export type Status = (typeof STATUSES)[number];

/** Size tags and their weights (Decision 5); a task without one weighs 1. */
export const SIZE_WEIGHTS = { S: 1, M: 3, L: 8 } as const;
export type Size = keyof typeof SIZE_WEIGHTS;

export interface PlanRef {
  level: PlanLevel;
  /** `2026`, `2026-Q4`, `2026-11`, `2026-W45` or `2026-11-03`. */
  period: string;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A month's folder name, its number then its name, such as `11-November`. */
export const monthFolder = (month: number): string => `${month}-${MONTH_NAMES[month - 1]}`;

/** Where a plan lives: `Plans/<Level>/<period>.md`, and a day in its year's and month's folders, `Plans/Daily/2026/11-November/2026-11-09.md` (ADR-KI-0067). */
export const planPathOf = (p: PlanRef): string =>
  p.level === "day"
    ? posix.join(PLANS_ROOT, PLAN_LEVELS.day, p.period.slice(0, 4), monthFolder(Number(p.period.slice(5, 7))), `${p.period}.md`)
    : posix.join(PLANS_ROOT, PLAN_LEVELS[p.level], `${p.period}.md`);

/** True for a period name of that level, such as `2026-W45` for a week. */
export const isPeriodName = (level: PlanLevel, name: string): boolean => PERIOD[level].test(name);

/** A day plan still at `Plans/Daily/YYYY-MM-DD.md`, outside its month's folder: the path it belongs at, else null. */
export function flatDay(path: string): string | null {
  const parts = path.split("/");
  if (parts.length !== 3 || parts[0] !== PLANS_ROOT || parts[1] !== PLAN_LEVELS.day || !path.endsWith(".md")) return null;
  const period = parts[2].slice(0, -3);
  return isPeriodName("day", period) ? planPathOf({ level: "day", period }) : null;
}

/** The plan a path names, or null when it is not a plan note. */
export function planOf(path: string): PlanRef | null {
  const parts = path.split("/");
  if (parts[0] !== PLANS_ROOT || !path.endsWith(".md")) return null;
  const level = (Object.keys(PLAN_LEVELS) as PlanLevel[]).find(l => PLAN_LEVELS[l] === parts[1]);
  if (!level) return null;
  const ref = { level, period: posix.basename(path, ".md") };
  return isPeriodName(level, ref.period) && (planPathOf(ref) === path || flatDay(path)) ? ref : null;
}

/** Where a plan is in this vault: its path, or a day plan's old flat path while only that one exists (ADR-KI-0067). */
export function planPathIn(p: PlanRef, has: (path: string) => boolean): string {
  const path = planPathOf(p);
  const flat = posix.join(PLANS_ROOT, PLAN_LEVELS.day, `${p.period}.md`);
  return p.level === "day" && !has(path) && has(flat) ? flat : path;
}

export type Priority = "highest" | "high" | "medium" | "low" | "lowest";
const PRIORITY: Record<string, Priority> = { "🔺": "highest", "⏫": "high", "🔼": "medium", "🔽": "low", "⏬": "lowest" };

/**
 * Obsidian Tasks signifiers, defined once. Several are astral-plane emoji, so every pattern
 * carries the `u` flag: without it a character class holds lone surrogates and strips half
 * of any other emoji in the line.
 */
export const DATED_SIGNIFIER = /[⏳✅📅🛫➕❌]\uFE0F?\s*\d{4}-\d{2}-\d{2}/gu;
export const PRIORITY_SIGNIFIER = /[🔺⏫🔼🔽⏬]\uFE0F?/gu;
/** The first signifier or a trailing block id on a line: where a task's description ends. */
export const FIRST_SIGNIFIER = /\s(?:[⏳✅📅🛫➕❌🔺⏫🔼🔽⏬🔁🏁🆔⛔]|\^[A-Za-z0-9-]+\s*$)/u;
/** A task's 🆔 and the ids its ⛔ waits on; Tasks allows letters, digits, `-` and `_`. */
export const TASK_ID = /🆔\uFE0F?\s*([A-Za-z0-9_-]+)/u;
export const BLOCKED_BY = /⛔\uFE0F?\s*([A-Za-z0-9_-]+(?:\s*,\s*[A-Za-z0-9_-]+)*)/u;
/** A checkbox the Tasks plugin treats as not done: any status but done (`x`) or cancelled (`-`). */
export const OPEN_CHECKBOX = /^\s*[-*+]\s+\[[^xX-]\]/;
/** Split a note into lines, accepting CRLF as well as LF. */
export const lines = (text: string) => text.split(/\r?\n/);

export interface Task {
  /** The note the checkbox is written in. */
  note: string;
  /** 0-based line within the note body. */
  line: number;
  /** The description, without dates, priority, tags this module reads, block id or parent link. */
  text: string;
  /** `x` done, `-` cancelled, anything else open. */
  state: "open" | "done" | "cancelled";
  scheduled: string | null;
  doneOn: string | null;
  priority: Priority | null;
  size: Size | null;
  weight: number;
  /** Periods named by `#slipped/<period>` tags, in the order written. */
  slipped: string[];
  /** The Tasks recurrence rule after `🔁`, e.g. `every day`; a repeating task does not slip. Habits are defined apart (ADR-KI-0065). */
  recurrence: string | null;
  /** The Tasks id after `🆔`, which other tasks name in `⛔` to wait on it. */
  id: string | null;
  /** The ids after `⛔`: the tasks this one waits on. */
  blockedBy: string[];
  /** `^id` at the end of the line, for a child goal's parent link. */
  blockId: string | null;
  /** The goal this one serves, from `↑ [[<plan>#^<id>]]` (Decision 7). */
  parent: { target: string; block: string } | null;
  /** True for a checkbox under a `Goals` heading of a year, quarter, month or week plan. */
  goal: boolean;
  /** True for a checkbox under a `Habits` heading of a day plan: that day's check of a habit (ADR-KI-0065). */
  habit: boolean;
  links: RawLink[];
}

const CHECKBOX = /^\s*[-*+]\s+\[(.)\]\s+(.*)$/;
const DATE = (sign: string) => new RegExp(`${sign}\\uFE0F?\\s*(\\d{4}-\\d{2}-\\d{2})`);
const SCHEDULED = DATE("⏳");
const DONE = DATE("✅");
const PARENT = /↑\s*\[\[([^\]|#]+)#\^([A-Za-z0-9-]+)(?:\|[^\]]*)?\]\]/;
const SIZE = /(?:^|\s)#([SML])(?=\s|$)/;
const SLIPPED = /(?:^|\s)#slipped\/([0-9A-Za-z-]+)/g;
const RECURRENCE = /🔁\uFE0F?\s*([^⏳✅📅🛫➕❌🔺⏫🔼🔽⏬🏁🆔⛔↑#^]*)/u;
const BLOCK_ID = /\s\^([A-Za-z0-9-]+)\s*$/;
const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FENCE_LINE = /^\s*(```|~~~)/;

/** Every checkbox in a note body, outside code blocks. */
export function parseTasks(note: string, body: string, plan: PlanRef | null = null): Task[] {
  const out: Task[] = [];
  let fenced = false;
  let inGoals = false;
  let inHabits = false;
  lines(body).forEach((raw, line) => {
    if (FENCE_LINE.test(raw)) { fenced = !fenced; return; }
    if (fenced) return;
    const h = raw.match(HEADING);
    if (h) {
      const name = h[2].trim().toLowerCase();
      inGoals = name === "goals";
      inHabits = name === HABITS_HEADING.toLowerCase();
      return;
    }
    const m = raw.match(CHECKBOX);
    if (!m) return;
    let rest = m[2];
    const state = m[1] === "x" || m[1] === "X" ? "done" : m[1] === "-" ? "cancelled" : "open";
    const scheduled = rest.match(SCHEDULED)?.[1] ?? null;
    const doneOn = rest.match(DONE)?.[1] ?? null;
    const priority = [...rest].map(c => PRIORITY[c]).find(Boolean) ?? null;
    const size = (rest.match(SIZE)?.[1] as Size | undefined) ?? null;
    const slipped = [...rest.matchAll(SLIPPED)].map(s => s[1]);
    const recurrence = rest.match(RECURRENCE)?.[1].trim() || null;
    const id = rest.match(TASK_ID)?.[1] ?? null;
    const blockedBy = rest.match(BLOCKED_BY)?.[1].split(",").map(x => x.trim()) ?? [];
    const p = rest.match(PARENT);
    const parent = p ? { target: p[1].trim(), block: p[2] } : null;
    // Dates and priority first: Tasks may write a done date after the block id.
    rest = rest
      .replace(PARENT, "")
      .replace(RECURRENCE, "")
      .replace(TASK_ID, "")
      .replace(BLOCKED_BY, "")
      .replace(/🏁\uFE0F?\s*[a-z]+/u, "")
      .replace(DATED_SIGNIFIER, "")
      .replace(PRIORITY_SIGNIFIER, "");
    const blockId = rest.match(BLOCK_ID)?.[1] ?? null;
    rest = rest
      .replace(BLOCK_ID, "")
      .replace(/(?:^|\s)#[SML](?=\s|$)/g, " ")
      .replace(SLIPPED, " ");
    out.push({
      note, line, text: rest.replace(/\s+/g, " ").trim(), state, scheduled, doneOn, priority, size,
      weight: size ? SIZE_WEIGHTS[size] : 1, slipped, recurrence, id, blockedBy, blockId, parent,
      goal: inGoals && plan !== null && plan.level !== "day",
      habit: inHabits && plan?.level === "day",
      // The parent link points at a plan, not at the work, so it is not a link to an owner.
      links: extractLinks(m[2].replace(PARENT, "")),
    });
  });
  return out;
}

export interface Workstream {
  name: string;
  project: string;
  /** The note, or the folder, that is the workstream. */
  path: string;
  /** The workstream's own note: the single note, or `<Name>/<Name>.md`; null for a folder without one. */
  note: string | null;
  status: Status | null;
  /** Every note in the workstream, its own note included. */
  notes: string[];
}

export interface Project {
  name: string;
  folder: string;
  /** `<Project>/<Project>.md`; null when it is missing (Decision 1). */
  note: string | null;
  status: Status | null;
  deadline: string | null;
  doneWhen: string | null;
  workstreams: Workstream[];
  /** Notes under the project's `Intermediate Packets/` folder. */
  packets: string[];
  /** True for a project archived under `4.Archive/`, kept so reviews of past periods still count its work. */
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
  /** Who the task counts for; all null when a plan item links nothing (Decision 8). */
  owner: Owner;
  /** The plan the checkbox is written in, when it is in one. */
  plan: PlanRef | null;
}

/** A habit defined in a project, workstream or area note (ADR-KI-0065). */
export interface Habit extends HabitDefinition {
  /** The note the habit is defined in, which its day checks link. */
  note: string;
  owner: Owner;
}

export interface Planning {
  projects: Project[];
  areas: Area[];
  plans: Plan[];
  /** Habits of active projects, workstreams and areas whose status is not done. */
  habits: Habit[];
  /** Checkboxes in projects, areas and plans; those elsewhere in the vault are not planned work. */
  tasks: OwnedTask[];
  warnings: string[];
}

const dirsIn = (abs: string) => {
  try { return readdirSync(abs, { withFileTypes: true }).filter(e => e.isDirectory() && !e.name.startsWith(".")).map(e => e.name).sort(); } catch { return []; }
};
const mdIn = (abs: string) => {
  try { return readdirSync(abs, { withFileTypes: true }).filter(e => e.isFile() && e.name.endsWith(".md")).map(e => e.name.slice(0, -3)).sort(); } catch { return []; }
};

function statusOf(note: VaultNote | undefined, warnings: string[]): Status | null {
  const s = note?.frontmatter.status;
  if (s === undefined || s === null) return null;
  if (typeof s === "string" && (STATUSES as readonly string[]).includes(s)) return s as Status;
  warnings.push(`${note!.path}: status "${String(s)}" is not one of ${STATUSES.join(", ")}`);
  return null;
}

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : v instanceof Date ? v.toISOString().slice(0, 10) : null);
const under = (p: string, folder: string) => p.startsWith(`${folder}/`);

/**
 * A note-or-folder unit (Decision 3): `<dir>/<Name>.md`, or `<dir>/<Name>/` whose own
 * note is `<Name>/<Name>.md`.
 */
function units(root: string, dir: string, notes: VaultNote[], skip: string[] = []) {
  const folders = new Set(dirsIn(join(root, dir)));
  const names = new Set([...folders, ...mdIn(join(root, dir))].filter(n => !skip.includes(n)));
  const inDir = notes.filter(n => under(n.path, dir));
  return [...names].sort().map(name => {
    const folder = posix.join(dir, name);
    const single = `${folder}.md`;
    const own = `${folder}/${name}.md`;
    const isFolder = folders.has(name);
    const members = inDir.filter(n => (isFolder && under(n.path, folder)) || n.path === single).map(n => n.path);
    const note = members.includes(own) ? own : members.includes(single) ? single : null;
    return { name, path: isFolder ? folder : single, note, notes: members };
  });
}

export function planning(root: string, notes: VaultNote[]): Planning {
  const warnings: string[] = [];
  const byPath = new Map(notes.map(n => [n.path, n]));

  const project = (bucket: string, name: string, archived: boolean): Project => {
    const folder = posix.join(bucket, name);
    const notePath = `${folder}/${name}.md`;
    const pn = byPath.get(notePath);
    const ws = posix.join(folder, WORKSTREAMS_FOLDER);
    if (!archived && !pn) warnings.push(`${folder}: no project note ${notePath}`);
    return {
      name, folder, note: pn ? notePath : null,
      status: statusOf(pn, archived ? [] : warnings),
      deadline: text(pn?.frontmatter.deadline),
      doneWhen: text(pn?.frontmatter.done_when),
      workstreams: units(root, ws, notes).map(u => ({ ...u, project: name, status: statusOf(byPath.get(u.note ?? ""), archived ? [] : warnings) })),
      packets: notes.filter(n => under(n.path, posix.join(folder, PACKETS_FOLDER))).map(n => n.path),
      archived,
    };
  };
  const active = dirsIn(join(root, PARA_FOLDERS.projects));
  // An archived folder is a project when it kept a project note or workstreams; other archive folders are not.
  const archivedNames = dirsIn(join(root, PARA_FOLDERS.archive)).filter(name =>
    !active.includes(name) && (byPath.has(posix.join(PARA_FOLDERS.archive, name, `${name}.md`)) || dirsIn(join(root, PARA_FOLDERS.archive, name)).includes(WORKSTREAMS_FOLDER)));
  const projects: Project[] = [
    ...active.map(name => project(PARA_FOLDERS.projects, name, false)),
    ...archivedNames.map(name => project(PARA_FOLDERS.archive, name, true)),
  ];

  const areas: Area[] = units(root, PARA_FOLDERS.areas, notes).map(u => ({ ...u, status: statusOf(byPath.get(u.note ?? ""), warnings) }));

  const plans: Plan[] = [];
  for (const n of notes) {
    if (!under(n.path, PLANS_ROOT) || under(n.path, TEMPLATES)) continue;
    const ref = planOf(n.path);
    if (ref) plans.push({ ...ref, path: n.path, title: n.title });
    else warnings.push(`${n.path}: not a plan name; expected ${PLANS_ROOT}/<${Object.values(PLAN_LEVELS).join("|")}>/<period>.md, a day as ${PLANS_ROOT}/${PLAN_LEVELS.day}/<year>/<month number>-<month name>/YYYY-MM-DD.md`);
    const grouped = flatDay(n.path);
    if (grouped) warnings.push(`${n.path}: a day plan outside its month's folder; init_vault moves it to ${grouped}`);
  }

  // Owner of a note by where it sits. An Intermediate Packet is reusable material, not the
  // project's open work, so its checkboxes belong to no one.
  const ownerByNote = new Map<string, Owner>();
  const projectByFolder = new Map(projects.map(p => [p.folder, p]));
  for (const n of notes) {
    const p = projectByFolder.get(n.path.split("/").slice(0, 2).join("/"));
    if (p && !under(n.path, posix.join(p.folder, PACKETS_FOLDER))) ownerByNote.set(n.path, { project: p.name, workstream: null, area: null });
  }
  for (const p of projects) for (const w of p.workstreams) for (const n of w.notes) ownerByNote.set(n, { project: p.name, workstream: w.name, area: null });
  for (const a of areas) for (const n of a.notes) ownerByNote.set(n, { project: null, workstream: null, area: a.name });
  // A project folder linked by a plan resolves through its project note; a workstream folder through its own note.
  const resolver = noteResolver(notes);
  const none: Owner = { project: null, workstream: null, area: null };

  const tasks: OwnedTask[] = [];
  for (const n of notes) {
    const plan = planOf(n.path);
    // Checkboxes in Inbox, Resources and the archive are not planned work.
    if ((!plan && !ownerByNote.has(n.path)) || under(n.path, TEMPLATES)) continue;
    for (const t of parseTasks(n.path, n.body, plan)) {
      let owner = ownerByNote.get(n.path) ?? none;
      if (plan) {
        // A plan item counts for the first project, workstream or area it links.
        owner = none;
        for (const link of t.links) {
          const target = resolver.resolve(n.path, link);
          const o = target ? ownerByNote.get(target) : undefined;
          if (o) { owner = o; break; }
        }
        if (owner === none) warnings.push(`${n.path}:${t.line + 1}: "${t.text}" links no project, workstream or area`);
        if (t.goal && plan.level !== "year" && !t.parent) warnings.push(`${n.path}:${t.line + 1}: goal "${t.text}" links no parent goal`);
      }
      tasks.push({ ...t, owner, plan });
    }
  }
  const finished = new Set<string>();
  for (const pr of projects) {
    for (const w of pr.workstreams) if (pr.archived || w.status === "done") w.notes.forEach(n => finished.add(n));
    if (pr.archived) for (const n of notes) if (under(n.path, pr.folder)) finished.add(n.path);
  }
  for (const a of areas) if (a.status === "done") a.notes.forEach(n => finished.add(n));
  const habits: Habit[] = [];
  for (const n of notes) {
    const owner = ownerByNote.get(n.path);
    if (!owner || planOf(n.path) || finished.has(n.path)) continue;
    const found = parseHabits(n.body);
    for (const h of found.habits) habits.push({ ...h, note: n.path, owner });
    for (const h of found.invalid) warnings.push(`${n.path}:${h.line + 1}: habit "${h.text}" has the rule "${h.rule}"; use ${HABIT_RULES}`);
  }
  return { projects, areas, plans, habits, tasks, warnings };
}
