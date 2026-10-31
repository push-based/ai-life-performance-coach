/**
 * Writing plans (ADR-KI-0062 Decision 9): the five plan templates, and `plan_period`,
 * which writes a year, quarter, month, week or day plan with goals and ad-hoc tasks and
 * schedules existing tasks into it. Every write is a preview first; an edit is refused
 * if its note changed after the preview.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, posix } from "node:path";
import { PLANS_ROOT } from "./para.js";
import { noteResolver } from "./graph.js";
import { planning, planOf, parseTasks, PLAN_LEVELS, SIZE_WEIGHTS, type PlanLevel, type Planning, type Size } from "./planning.js";
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

/** The period of the same level that follows this one. */
export function nextPeriod(p: Period): Period {
  const d = new Date(`${p.end}T00:00:00Z`);
  const next = iso(utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1));
  const name = { year: next.slice(0, 4), quarter: `${next.slice(0, 4)}-Q${Math.floor((Number(next.slice(5, 7)) - 1) / 3) + 1}`, month: next.slice(0, 7), week: isoWeekOf(next), day: next }[p.level];
  return periodOf(name)!;
}

export const planPathOf = (p: { level: PlanLevel; period: string }) => posix.join(PLANS_ROOT, PLAN_LEVELS[p.level], `${p.period}.md`);

const PARENT_LEVEL: Record<PlanLevel, PlanLevel | null> = { year: null, quarter: "year", month: "quarter", week: "month", day: "week" };

export interface GoalInput {
  text: string;
  /** A project, workstream or area: its name, or a note path. */
  link: string;
  size?: Size;
  /** The goal one level up it serves: `<period>#^<block id>`, e.g. `2026-Q4#^devfest`. */
  parent?: string;
}

export interface AdHocInput {
  text: string;
  link: string;
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
  constructor(private readonly root: string, private readonly originals: Record<string, string>) {}

  /** Change one open task's line; returns an error, or null when it was edited or left as it was. */
  edit(note: VaultNote, bodyLine: number, change: (line: string) => string): string | null {
    const file = this.files.get(note.path) ?? readFileSync(join(this.root, note.path), "utf-8").split("\n");
    if (!this.files.has(note.path)) { this.originals[note.path] = file.join("\n"); this.files.set(note.path, file); }
    // The body starts after the frontmatter, if the note has one.
    const i = file.length - note.body.split("\n").length + bodyLine;
    const before = file[i];
    if (!/^\s*[-*+]\s+\[ \]/.test(before ?? "")) return `line ${i + 1} of ${note.path} is not an open task`;
    const after = change(before);
    if (after !== before) { file[i] = after; this.edits.push({ note: note.path, line: i + 1, before, after }); }
    return null;
  }

  /** Every changed note's new content. */
  writes(): Record<string, string> {
    const out: Record<string, string> = {};
    const changed = new Set(this.edits.map(e => e.note));
    for (const [note, lines] of this.files) if (changed.has(note)) out[note] = lines.join("\n");
    return out;
  }
}

const SCHEDULED_DATE = /⏳\uFE0F?\s*\d{4}-\d{2}-\d{2}/;
/** Set a task line's scheduled date, replacing any it has. */
export const scheduleLine = (line: string, day: string) =>
  SCHEDULED_DATE.test(line) ? line.replace(SCHEDULED_DATE, `⏳ ${day}`) : insertBeforeBlockId(line, ` ⏳ ${day}`);

export function planPeriod(root: string, notes: VaultNote[], input: PlanPeriodInput): PlanPeriodPlan {
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
  const linkFor = (what: string, link: string): string | null => {
    const target = resolver.resolve(path, { kind: "wikilink", target: link.replace(/\.md$/, "") });
    if (!target || !owners.has(target)) {
      out.errors.push(`${what}: "${link}" is not a project note, workstream note or area note`);
      return null;
    }
    const name = posix.basename(target, ".md");
    // A bare name when it resolves to the same note from anywhere; the path otherwise.
    return resolver.resolve(path, { kind: "wikilink", target: name }) === target ? `[[${name}]]` : `[[${target.slice(0, -3)}|${name}]]`;
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
  out.creates = !existing;
  const original = existing ? readFileSync(join(root, path), "utf-8") : null;
  let content = original ?? templateFor(root, period.level).replace(/\{\{title\}\}/g, period.period);
  if (original !== null) out.originals[path] = original;

  // Goals, each with a block id unique in the note and a parent one level up (Decision 7).
  const goals = input.goals ?? [];
  if (goals.length && period.level === "day") out.errors.push("a day plan holds no goals; add the work as ad-hoc tasks or schedule tasks into it");
  const taken = new Set(parseTasks(path, content).map(t => t.blockId).filter(Boolean));
  const parentLevel = PARENT_LEVEL[period.level];
  const goalLines: string[] = [];
  for (const g of period.level === "day" ? [] : goals) {
    const link = linkFor(`goal "${g.text}"`, g.link);
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
  content = addToSection(content, "Goals", goalLines);

  const adHocLines: string[] = [];
  for (const t of input.adHoc ?? []) {
    const link = linkFor(`task "${t.text}"`, t.link);
    const day = t.date === undefined ? null : inPeriod(`task "${t.text}"`, t.date);
    if (link !== null) adHocLines.push(`- [ ] ${t.text} ${link}${meta(t.size)}${day ? ` ⏳ ${day}` : ""}`);
  }
  content = addToSection(content, "Ad-hoc", adHocLines);
  out.content = content;
  if (original === null || content !== original) out.writes[path] = content;

  // Scheduling: add or replace ⏳ on an open task's line, where it stands.
  const editor = new TaskLineEditor(root, out.originals);
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

  return out;
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
