/**
 * Writing plans (ADR-KI-0062 Decision 9): the five plan templates, and `plan_period`,
 * which writes a year, quarter, month, week or day plan with goals and ad-hoc tasks and
 * schedules existing tasks into it. Every write is a preview first; an edit is refused
 * if its note changed after the preview.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, posix } from "node:path";
import { PLANS_ROOT } from "./para.js";
import { noteResolver } from "./graph.js";
import { OPEN_CHECKBOX, planning, planOf, parseTasks, PLAN_LEVELS, SIZE_WEIGHTS, type PlanLevel, type Planning, type Priority, type Size } from "./planning.js";
import { isRecurrence, TaskLine } from "./task-line.js";
import type { VaultNote } from "./scan.js";

/** Templates live beside the plans, one per level; Periodic Notes reads them (Decision 9). */
export const TEMPLATES_FOLDER = posix.join(PLANS_ROOT, "Templates");
export const templatePath = (level: PlanLevel) => posix.join(TEMPLATES_FOLDER, `${PLAN_LEVELS[level]}.md`);

const fence = (lines: string[]) => ["```tasks", ...lines, "```"].join("\n");

/**
 * The built-in templates. `{{title}}` is the period, as Periodic Notes fills it from the
 * file name; `plan_period` fills it the same way. No template holds an empty checkbox,
 * which would read as an unlinked task.
 */
export const TEMPLATES: Record<PlanLevel, string> = {
  year: ["# {{title}}", "", "## Goals", "", "## Review", ""].join("\n"),
  quarter: ["# {{title}}", "", "## Goals", "", "## Review", ""].join("\n"),
  month: [
    "# {{title}}", "", "## Goals", "",
    "## Scheduled", "", fence(["not done", "scheduled in {{title}}", "group by folder"]), "",
    "## Ad-hoc", "",
    "## Review", "",
  ].join("\n"),
  week: [
    "# {{title}}", "", "## Goals", "",
    "## This week", "", fence(["not done", "scheduled in {{title}}", "group by folder"]), "",
    "## Ad-hoc", "",
    "## Done", "", fence(["done in {{title}}", "group by folder"]), "",
    "## Review", "",
  ].join("\n"),
  day: [
    "# {{title}}", "",
    "## Today", "", fence(["not done", "scheduled on or before {{title}}", "group by folder"]), "",
    "## Ad-hoc", "",
    "## Done", "", fence(["done on {{title}}"]), "",
    "## Log", "",
  ].join("\n"),
};

export interface Period {
  level: PlanLevel;
  period: string;
  /** First and last day, inclusive, as YYYY-MM-DD. */
  start: string;
  end: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

/** Monday of ISO week 1: the week holding the year's first Thursday. */
function isoWeekOne(year: number): Date {
  const jan4 = utc(year, 0, 4);
  return utc(year, 0, 4 - ((jan4.getUTCDay() + 6) % 7));
}

/** The ISO week a day falls in, as `YYYY-Www`. */
export function isoWeekOf(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const thursday = utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const year = thursday.getUTCFullYear();
  const week = 1 + Math.round((thursday.getTime() - isoWeekOne(year).getTime() - 3 * 86400000) / (7 * 86400000));
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** A period by its name, or null when the name is not one. */
export function periodOf(name: string): Period | null {
  const ref = (Object.keys(PLAN_LEVELS) as PlanLevel[]).map(l => planOf(`${PLANS_ROOT}/${PLAN_LEVELS[l]}/${name}.md`)).find(Boolean);
  if (!ref) return null;
  const y = Number(name.slice(0, 4));
  switch (ref.level) {
    case "year": return { ...ref, start: `${y}-01-01`, end: `${y}-12-31` };
    case "quarter": {
      const q = Number(name.slice(6));
      return { ...ref, start: iso(utc(y, (q - 1) * 3, 1)), end: iso(utc(y, q * 3, 0)) };
    }
    case "month": {
      const m = Number(name.slice(5, 7));
      return { ...ref, start: iso(utc(y, m - 1, 1)), end: iso(utc(y, m, 0)) };
    }
    case "week": {
      const w = Number(name.slice(6));
      const monday = isoWeekOne(y);
      const start = utc(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + (w - 1) * 7);
      // Week 53 exists only in years whose ISO calendar has it.
      if (isoWeekOf(iso(start)) !== name) return null;
      return { ...ref, start: iso(start), end: iso(utc(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6)) };
    }
    case "day": {
      const d = utc(y, Number(name.slice(5, 7)) - 1, Number(name.slice(8, 10)));
      return iso(d) === name ? { ...ref, start: name, end: name } : null;
    }
  }
}

/** The period of a level that holds a day. */
export function periodAt(level: PlanLevel, day: string): Period {
  const name = { year: day.slice(0, 4), quarter: `${day.slice(0, 4)}-Q${Math.floor((Number(day.slice(5, 7)) - 1) / 3) + 1}`, month: day.slice(0, 7), week: isoWeekOf(day), day }[level];
  return periodOf(name)!;
}

const shift = (day: string, by: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  return iso(utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + by));
};

/** The period of the same level that follows this one. */
export const nextPeriod = (p: Period): Period => periodAt(p.level, shift(p.end, 1));

/** The period of the same level before this one. */
export const previousPeriod = (p: Period): Period => periodAt(p.level, shift(p.start, -1));

export const planPathOf = (p: { level: PlanLevel; period: string }) => posix.join(PLANS_ROOT, PLAN_LEVELS[p.level], `${p.period}.md`);

const PARENT_LEVEL: Record<PlanLevel, PlanLevel | null> = { year: null, quarter: "year", month: "quarter", week: "month", day: "week" };

export interface GoalInput {
  text: string;
  /** A project, workstream or area: its name, or a note path. Defaults to the first of `links`. */
  link?: string;
  /** Further notes it links after its owner, e.g. an area beside a workstream. */
  links?: string[];
  size?: Size;
  /** The goal one level up it serves: `<period>#^<block id>`, e.g. `2026-Q4#^expo`. */
  parent?: string;
}

/** The Tasks fields a new task can carry beside its text, links and size (ADR-KI-0064). */
export interface TaskFields {
  priority?: Priority;
  /** A Tasks recurrence rule, e.g. "every week on Monday". */
  recurrence?: string;
  /** A `🆔` unique among the vault's planned tasks. */
  id?: string;
  /** `🆔`s of tasks this one waits on, written as `⛔`. */
  blockedBy?: string[];
}

export interface AdHocInput extends TaskFields {
  text: string;
  /** The owner: a project, workstream or area. Defaults to the first of `links`. */
  link?: string;
  links?: string[];
  size?: Size;
  /** A day inside the period; the task is scheduled on it. */
  date?: string;
}

export interface ScheduleInput {
  /** The note the task is written in. */
  note: string;
  /** The task's description, or a unique part of it. */
  task: string;
  /** A day inside the period; defaults to its first day. */
  date?: string;
}

export interface PlanPeriodInput {
  period: string;
  goals?: GoalInput[];
  adHoc?: AdHocInput[];
  schedule?: ScheduleInput[];
}

export interface NoteEdit {
  note: string;
  /** 1-based line in the note file. */
  line: number;
  before: string;
  after: string;
}

export interface PlanPeriodPlan {
  plan: string;
  period: Period | null;
  /** True when the plan note does not exist yet and is written from its template. */
  creates: boolean;
  /** The plan note as it will be written. */
  content: string;
  /** Block ids given to the new goals, for child plans to link with `↑ [[<period>#^<id>]]`. */
  goalIds: { text: string; id: string }[];
  /** Task lines edited in other notes to schedule them. */
  edits: NoteEdit[];
  errors: string[];
  warnings: string[];
  /** Notes as previewed, by path; a write is refused if one differs. */
  originals: Record<string, string>;
  /** Full new content of each edited note, by path. */
  writes: Record<string, string>;
}

export const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\x00-\x7f]/g, "").replace(/\[\[[^\]]*\|([^\]]*)\]\]|\[\[([^\]]*)\]\]/g, "$1$2")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24).replace(/-+$/, "") || "goal";

/** The template for a level: the vault's own if it has one, else the built-in. */
export function templateFor(root: string, level: PlanLevel): string {
  const own = join(root, templatePath(level));
  return existsSync(own) ? readFileSync(own, "utf-8") : TEMPLATES[level];
}

/** Insert lines at the end of a `## <heading>` section, or append the section when it is missing. */
export function addToSection(content: string, heading: string, lines: string[]): string {
  if (!lines.length) return content;
  const all = content.split("\n");
  const at = all.findIndex(l => /^#{1,6}\s/.test(l) && l.replace(/^#+\s*/, "").trim().toLowerCase() === heading.toLowerCase());
  if (at < 0) return `${content.replace(/\n*$/, "\n")}\n## ${heading}\n\n${lines.join("\n")}\n`;
  let end = all.findIndex((l, i) => i > at && /^#{1,6}\s/.test(l));
  if (end < 0) end = all.length;
  // Insert after the section's last non-blank line, keeping one blank line before the next heading.
  let last = end - 1;
  while (last > at && all[last].trim() === "") last--;
  const before = all.slice(0, last + 1);
  const body = last === at ? ["", ...lines] : lines;
  const after = all.slice(last + 1);
  return [...before, ...body, ...(after.length && after[0].trim() !== "" ? [""] : after.length ? [] : [""]), ...after].join("\n");
}

/**
 * Edits task lines in place, one note file read once, recording each note as it was
 * for the stale-preview check. A task is addressed by its 0-based body line.
 */
export class TaskLineEditor {
  private readonly files = new Map<string, string[]>();
  readonly edits: NoteEdit[] = [];
  /**
   * `overlay` holds notes as an earlier step of the same call left them, unwritten; a note
   * read from it keeps the original from disk for the stale-preview check.
   */
  constructor(private readonly root: string, private readonly originals: Record<string, string>, private readonly overlay: Record<string, string> = {}) {}

  /**
   * Change one task's line; returns an error, or null when it was edited or left as it was.
   * Only an open task is edited unless `anyState` is set.
   */
  edit(note: VaultNote, bodyLine: number, change: (line: string) => string, anyState = false): string | null {
    let file = this.files.get(note.path);
    if (!file) {
      const disk = readFileSync(join(this.root, note.path), "utf-8");
      this.originals[note.path] ??= disk;
      file = (this.overlay[note.path] ?? disk).split("\n");
      this.files.set(note.path, file);
    }
    // The body starts after the frontmatter, if the note has one.
    const i = file.length - note.body.split("\n").length + bodyLine;
    const raw = file[i] ?? "";
    if (!(anyState ? /^\s*[-*+]\s+\[.\]/ : OPEN_CHECKBOX).test(raw)) return `line ${i + 1} of ${note.path} is not ${anyState ? "a" : "an open"} task`;
    // A CRLF note keeps its line ending: the change sees the line without it.
    const cr = raw.endsWith("\r") ? "\r" : "";
    const before = cr ? raw.slice(0, -1) : raw;
    const after = change(before);
    if (after !== before) { file[i] = after + cr; this.edits.push({ note: note.path, line: i + 1, before, after }); }
    return null;
  }

  /** A note's content with the edits so far, or null when no edit touched it. */
  contentOf(path: string): string | null {
    return this.edits.some(e => e.note === path) ? this.files.get(path)!.join("\n") : null;
  }

  /** Every changed note's new content. */
  writes(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const note of new Set(this.edits.map(e => e.note))) out[note] = this.contentOf(note)!;
    return out;
  }
}

const SCHEDULED_DATE = /⏳\uFE0F?\s*\d{4}-\d{2}-\d{2}/;
/** Set a task line's scheduled date, replacing any it has. */
export const scheduleLine = (line: string, day: string) =>
  SCHEDULED_DATE.test(line) ? line.replace(SCHEDULED_DATE, `⏳ ${day}`) : insertBeforeBlockId(line, ` ⏳ ${day}`);

/** A note's version as a preview shows it: the first 12 hex digits of its SHA-256. */
export const versionOf = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 12);
export const versionsOf = (originals: Record<string, string>) =>
  Object.fromEntries(Object.entries(originals).map(([k, v]) => [k, versionOf(v)]));

/**
 * The stale-preview check across calls (ADR-KI-0064 Decision 2): each existing note a write
 * changes must still be the version its preview returned. Returns one error per note that
 * differs or that the preview did not show.
 */
export function staleNotes(w: Pick<NoteWrites, "originals" | "writes">, expected: Record<string, string>): string[] {
  const out: string[] = [];
  for (const note of Object.keys(w.writes)) {
    const was = w.originals[note];
    if (was === undefined) continue;
    if (!(note in expected)) out.push(`${note} was not in the preview; preview again`);
    else if (expected[note] !== versionOf(was)) out.push(`${note} changed since the preview; preview again`);
  }
  return out;
}

/** Every 🆔 already used by a planned task, and an error for each clash or unknown ⛔ in new tasks. */
export function checkTaskIds(p: Planning, inputs: { what: string; id?: string; blockedBy?: string[] }[]): string[] {
  const errors: string[] = [];
  const known = new Set(p.tasks.map(t => t.id).filter((x): x is string => !!x));
  const fresh = new Set<string>();
  for (const t of inputs) {
    if (t.id === undefined) continue;
    if (!/^[A-Za-z0-9_-]+$/.test(t.id)) errors.push(`${t.what}: id "${t.id}" may hold only letters, digits, - and _`);
    else if (known.has(t.id) || fresh.has(t.id)) errors.push(`${t.what}: id "${t.id}" is already used`);
    fresh.add(t.id);
  }
  for (const t of inputs) for (const b of t.blockedBy ?? []) {
    if (!known.has(b) && !fresh.has(b)) errors.push(`${t.what}: blocked by "${b}", which no task has as its 🆔`);
  }
  return errors;
}

/** Write a task's Tasks fields onto a line in the plugin's order; returns errors for bad values. */
export function applyFields(line: TaskLine, f: TaskFields & { scheduled?: string | null }, what: string): string[] {
  const errors: string[] = [];
  if (f.priority !== undefined) {
    if (!["highest", "high", "medium", "low", "lowest"].includes(f.priority)) errors.push(`${what}: priority "${f.priority}" is not highest, high, medium, low or lowest`);
    else line.set("priority", f.priority);
  }
  if (f.recurrence !== undefined) {
    if (!isRecurrence(f.recurrence)) errors.push(`${what}: recurrence "${f.recurrence}" is not a Tasks rule such as "every week on Monday"`);
    else line.set("recurrence", f.recurrence.trim());
  }
  if (f.id !== undefined) line.set("id", f.id);
  if (f.blockedBy?.length) line.set("blockedBy", f.blockedBy.join(","));
  if (f.scheduled) line.set("scheduled", f.scheduled);
  return errors;
}

export function planPeriod(root: string, notes: VaultNote[], input: PlanPeriodInput, overlay: Record<string, string> = {}): PlanPeriodPlan {
  const period = periodOf(input.period);
  const out: PlanPeriodPlan = { plan: "", period, creates: false, content: "", goalIds: [], edits: [], errors: [], warnings: [], originals: {}, writes: {} };
  if (!period) {
    out.errors.push(`"${input.period}" is not a period: use YYYY, YYYY-Qn, YYYY-MM, YYYY-Www or YYYY-MM-DD`);
    return out;
  }
  const path = planPathOf(period);
  out.plan = path;
  const p: Planning = planning(root, notes);
  const resolver = noteResolver(notes);
  const byPath = new Map(notes.map(n => [n.path, n]));

  // Which project, workstream or area a link names (Decision 8).
  const owners = new Map<string, string>();
  for (const pr of p.projects) {
    if (pr.note) owners.set(pr.note, pr.name);
    for (const w of pr.workstreams) for (const n of w.notes) owners.set(n, `${pr.name} → ${w.name}`);
  }
  for (const a of p.areas) for (const n of a.notes) owners.set(n, a.name);
  const linkFor = (what: string, link: string | undefined): string | null => {
    if (!link) { out.errors.push(`${what}: give the project, workstream or area it counts for as link or the first of links`); return null; }
    const target = resolver.resolve(path, { kind: "wikilink", target: link.replace(/\.md$/, "") });
    if (!target || !owners.has(target)) {
      out.errors.push(`${what}: "${link}" is not a project note, workstream note or area note`);
      return null;
    }
    return wikilinkTo(resolver, path, target);
  };
  // The owner, then any further links, each to a note that exists.
  const linksFor = (what: string, x: { link?: string; links?: string[] }): string | null => {
    const [owner, ...more] = x.link ? [x.link, ...(x.links ?? [])] : (x.links ?? []);
    const first = linkFor(what, owner);
    const rest = more.map(l => {
      const target = resolver.resolve(path, { kind: "wikilink", target: l.replace(/\.md$/, "") });
      if (!target) out.errors.push(`${what}: no note "${l}" to link`);
      return target ? wikilinkTo(resolver, path, target) : null;
    });
    return first === null || rest.includes(null) ? null : [first, ...rest].join(" ");
  };
  const inPeriod = (what: string, date: string | undefined) => {
    const d = date ?? period.start;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d < period.start || d > period.end) {
      out.errors.push(`${what}: ${date} is not a day in ${period.period} (${period.start} to ${period.end})`);
      return null;
    }
    return d;
  };
  const meta = (size: Size | undefined) => {
    if (size && !(size in SIZE_WEIGHTS)) { out.errors.push(`size "${size}" is not one of S, M, L`); return ""; }
    return size ? ` #${size}` : "";
  };

  const existing = byPath.get(path);
  out.creates = !existing && overlay[path] === undefined;
  const original = existing ? readFileSync(join(root, path), "utf-8") : null;
  let content = overlay[path] ?? original ?? templateFor(root, period.level).replace(/\{\{title\}\}/g, period.period);
  if (original !== null) out.originals[path] = original;

  // Goals, each with a block id unique in the note and a parent one level up (Decision 7).
  const goals = input.goals ?? [];
  if (goals.length && period.level === "day") out.errors.push("a day plan holds no goals; add the work as ad-hoc tasks or schedule tasks into it");
  const taken = new Set(parseTasks(path, content).map(t => t.blockId).filter(Boolean));
  const parentLevel = PARENT_LEVEL[period.level];
  const goalLines: string[] = [];
  for (const g of period.level === "day" ? [] : goals) {
    const link = linksFor(`goal "${g.text}"`, g);
    let parent = "";
    if (g.parent) {
      const m = g.parent.match(/^([^#]+)#\^([A-Za-z0-9-]+)$/);
      const pp = m ? periodOf(m[1]) : null;
      if (!m || !pp) out.errors.push(`goal "${g.text}": parent "${g.parent}" is not <period>#^<block id>`);
      else if (pp.level !== parentLevel) out.errors.push(`goal "${g.text}": a ${period.level} goal's parent is a ${parentLevel ?? "nothing"} goal, not a ${pp.level} goal`);
      else {
        const parentPlan = byPath.get(planPathOf(pp));
        const found = parentPlan && parseTasks(parentPlan.path, parentPlan.body, pp).some(t => t.goal && t.blockId === m[2]);
        if (!found) out.errors.push(`goal "${g.text}": no goal ^${m[2]} in ${planPathOf(pp)}`);
        else {
          if (pp.end < period.start || pp.start > period.end) out.warnings.push(`goal "${g.text}": ${pp.period} does not overlap ${period.period}`);
          parent = ` ↑ [[${pp.period}#^${m[2]}]]`;
        }
      }
    } else if (parentLevel) {
      out.warnings.push(`goal "${g.text}" has no parent goal`);
    }
    let id = slug(g.text);
    for (let i = 2; taken.has(id); i++) id = `${slug(g.text)}-${i}`;
    taken.add(id);
    out.goalIds.push({ text: g.text, id });
    if (link !== null) goalLines.push(`- [ ] ${g.text} ${link}${meta(g.size)}${parent} ^${id}`);
  }

  const adHocLines: string[] = [];
  out.errors.push(...checkTaskIds(p, (input.adHoc ?? []).map(t => ({ what: `task "${t.text}"`, id: t.id, blockedBy: t.blockedBy }))));
  for (const t of input.adHoc ?? []) {
    const what = `task "${t.text}"`;
    const link = linksFor(what, t);
    const day = t.date === undefined ? null : inPeriod(what, t.date);
    const line = TaskLine.create("", `${t.text} ${link ?? ""}${meta(t.size)}`);
    out.errors.push(...applyFields(line, { ...t, scheduled: day }, what));
    if (link !== null) adHocLines.push(line.toString());
  }

  // Scheduling: add or replace ⏳ on an open task's line, where it stands.
  const editor = new TaskLineEditor(root, out.originals, overlay);
  for (const s of input.schedule ?? []) {
    const n = byPath.get(s.note) ?? byPath.get(`${s.note}.md`);
    if (!n) { out.errors.push(`schedule: no note ${s.note}`); continue; }
    if (!p.tasks.some(t => t.note === n.path)) { out.errors.push(`schedule: ${n.path} is not in a project, area or plan`); continue; }
    const want = s.task.toLowerCase();
    const hits = parseTasks(n.path, n.body).filter(t => t.state === "open" && t.text.toLowerCase().includes(want));
    if (hits.length !== 1) {
      out.errors.push(`schedule: ${hits.length ? `${hits.length} open tasks` : "no open task"} in ${n.path} match "${s.task}"${hits.length ? `: ${hits.map(h => h.text).join("; ")}` : ""}`);
      continue;
    }
    const day = inPeriod(`schedule "${s.task}"`, s.date);
    if (!day) continue;
    const count = editor.edits.length;
    const err = editor.edit(n, hits[0].line, line => scheduleLine(line, day));
    if (err) out.errors.push(`schedule: ${err}`);
    else if (editor.edits.length === count) out.warnings.push(`schedule: "${hits[0].text}" is already scheduled on ${day}`);
  }
  out.edits = editor.edits;
  Object.assign(out.writes, editor.writes());

  // Goals and ad-hoc tasks go in last, on top of any scheduling edit made to the plan itself.
  content = addToSection(addToSection(editor.contentOf(path) ?? content, "Goals", goalLines), "Ad-hoc", adHocLines);
  out.content = content;
  if (original === null || content !== original) out.writes[path] = content;

  return out;
}

/** A wikilink to a note: its bare name when that resolves to it from `from`, the path otherwise. */
export function wikilinkTo(resolver: ReturnType<typeof noteResolver>, from: string, target: string): string {
  const name = posix.basename(target, ".md");
  return resolver.resolve(from, { kind: "wikilink", target: name }) === target ? `[[${name}]]` : `[[${target.slice(0, -3)}|${name}]]`;
}

/** Put text before a trailing `^block-id`, so the id stays last on the line. */
export function insertBeforeBlockId(line: string, text: string): string {
  const m = line.match(/\s\^[A-Za-z0-9-]+\s*$/);
  return m ? `${line.slice(0, m.index)}${text}${line.slice(m.index)}` : `${line.replace(/\s+$/, "")}${text}`;
}

/** A set of note writes checked against the preview: edits of notes as they were, and new notes. */
export interface NoteWrites {
  errors: string[];
  originals: Record<string, string>;
  writes: Record<string, string>;
  /** Notes the writes create; refused if one appeared since the preview. */
  created: string[];
}

export async function executeWrites(root: string, w: NoteWrites): Promise<void> {
  if (w.errors.length) throw new Error("refusing to apply a plan with errors");
  for (const [note, text] of Object.entries(w.originals)) {
    if ((await readFile(join(root, note), "utf-8")) !== text) throw new Error(`${note} changed since the preview`);
  }
  for (const note of w.created) if (existsSync(join(root, note))) throw new Error(`${note} appeared since the preview`);
  for (const [note, text] of Object.entries(w.writes)) {
    await mkdir(dirname(join(root, note)), { recursive: true });
    await writeFile(join(root, note), text, w.created.includes(note) ? { flag: "wx" } : {});
  }
}

export const executePlanPeriod = (root: string, plan: PlanPeriodPlan) =>
  executeWrites(root, { ...plan, created: plan.creates ? [plan.plan] : [] });

export interface DayInput {
  adHoc?: AdHocInput[];
  schedule?: ScheduleInput[];
}

export interface PlanDaysPlan extends NoteWrites {
  /** Each day's plan as `plan_period` would write it, in date order. */
  days: Omit<PlanPeriodPlan, "originals" | "writes" | "errors">[];
  warnings: string[];
}

/**
 * Several day plans in one preview (ADR-KI-0064 Decision 7): each day is planned as
 * `plan_period` plans it, on top of the notes as the days before it left them, so two days
 * can schedule tasks in the same note.
 */
export function planDays(root: string, notes: VaultNote[], days: Record<string, DayInput>): PlanDaysPlan {
  const out: PlanDaysPlan = { days: [], errors: [], warnings: [], originals: {}, writes: {}, created: [] };
  const names = Object.keys(days).sort();
  if (!names.length) out.errors.push("give at least one day");
  for (const day of names) {
    const period = periodOf(day);
    if (!period || period.level !== "day") { out.errors.push(`"${day}" is not a day: use YYYY-MM-DD`); continue; }
    const plan = planPeriod(root, notes, { period: day, adHoc: days[day].adHoc, schedule: days[day].schedule }, out.writes);
    const { originals, writes, errors, ...shown } = plan;
    out.errors.push(...errors.map(e => `${day}: ${e}`));
    out.warnings.push(...plan.warnings.map(w => `${day}: ${w}`));
    for (const [k, v] of Object.entries(originals)) out.originals[k] ??= v;
    Object.assign(out.writes, writes);
    if (plan.creates && writes[plan.plan] !== undefined) out.created.push(plan.plan);
    out.days.push(shown);
  }
  return out;
}
