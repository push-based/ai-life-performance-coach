/**
 * Editing existing notes for planning (ADR-KI-0064): `update_task`, `add_tasks`,
 * `set_frontmatter`, `edit_note` and `create_workstream`. Each builds a preview of every
 * changed line and writes nothing; `executeWrites` applies a preview that has no errors.
 * Every edit is surgical (ADR-KI-0006 Decision 1): the lines it does not name stay
 * byte-for-byte as they were.
 */

import { readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { PARA_FOLDERS, PLANS_ROOT, RAW_FOLDER } from "./para.js";
import { noteResolver } from "./graph.js";
import { parseTasks, planning, planOf, STATUSES, SIZE_WEIGHTS, WORKSTREAMS_FOLDER, PACKETS_FOLDER, type Planning, type Priority, type Size, type Task } from "./planning.js";
import { addToSection, applyFields, checkTaskIds, periodOf, planPathOf, TaskLineEditor, wikilinkTo, type NoteEdit, type NoteWrites, type TaskFields } from "./plans.js";
import { TaskLine, isRecurrence } from "./task-line.js";
import { HABITS_HEADING, HABIT_RULES, habitDays, habitKey, parseHabits } from "./habits.js";
import type { VaultNote } from "./scan.js";

export interface EditPlan extends NoteWrites {
  /**
   * Changed lines: `line` 0-based in the note body (the address update_task takes), `fileLine`
   * 1-based in the file; an added line has an empty `before`, a removed one an empty `after`.
   */
  edits: NoteEdit[];
  warnings: string[];
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SIGNIFIER_IN_TEXT = /[🆔⛔🔺⏫🔼🔽⏬🔁🏁➕🛫⏳📅❌✅]/u;
const SIZE_TAG = /(?:^|\s)#[SML](?=\s|$)/g;
const SLIP_TAGS = /\s#slipped\/[0-9A-Za-z-]+/g;
const PARENT_LINK = /\s*↑\s*\[\[[^\]]*\]\]/g;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n?---[ \t]*(?:\r?\n|$)/;

const empty = (): EditPlan => ({ edits: [], errors: [], warnings: [], originals: {}, writes: {}, created: [] });
const byPathOf = (notes: VaultNote[]) => new Map(notes.map(n => [n.path, n]));
const findNote = (byPath: Map<string, VaultNote>, path: string) => byPath.get(path) ?? byPath.get(`${path}.md`);

/** The project, workstream, area or plan a note belongs to, or why tasks are not planned there. */
function plannedNoteError(p: Planning, path: string): string | null {
  if (planOf(path)) return null;
  for (const pr of p.projects) {
    if (!path.startsWith(`${pr.folder}/`)) continue;
    if (pr.archived) return `${path} is in the archived project ${pr.name}`;
    if (path.startsWith(`${pr.folder}/${PACKETS_FOLDER}/`)) return `${path} is an Intermediate Packet, reusable material rather than open work`;
    return null;
  }
  if (p.areas.some(a => a.notes.includes(path))) return null;
  return `${path} is not in a project, workstream, area or plan`;
}

/** Notes the body and frontmatter tools may edit: the PARA folders and Plans/, never raw text or coach state. */
function editableError(path: string): string | null {
  const top = path.split("/")[0];
  if (path.startsWith(`${PARA_FOLDERS.resources}/${RAW_FOLDER}/`)) return `${path} is raw text that concept notes are checked against; it is not edited`;
  if (top === PLANS_ROOT || (Object.values(PARA_FOLDERS) as string[]).includes(top)) return null;
  return `${path} is outside the PARA folders and ${PLANS_ROOT}/`;
}

/** Where a note's body starts in its file, counted as the task tools count body lines. */
const bodyStartOf = (original: string, note: VaultNote) => original.split("\n").length - note.body.split("\n").length;

/**
 * One hunk per note: the lines between the common head and tail of before and after, with
 * the heading it falls under and the line above it. `bodyStart` gives its body line; a hunk
 * that starts in the frontmatter has none.
 */
function hunk(note: string, before: string, after: string, bodyStart: number): NoteEdit[] {
  const a = before.split("\n");
  const b = after.split("\n");
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const was = a.slice(head, a.length - tail);
  const now = b.slice(head, b.length - tail);
  if (!was.length && !now.length) return [];
  const edit: NoteEdit = { note, ...(head >= bodyStart ? { line: head - bodyStart } : {}), fileLine: head + 1, before: was.join("\n"), after: now.join("\n") };
  if (head >= bodyStart) {
    const under = a.slice(bodyStart, head).reverse().find(l => HEADING.test(l));
    if (under !== undefined) edit.under = under;
    if (head > bodyStart) edit.above = a[head - 1];
  }
  return [edit];
}

const read = (root: string, path: string) => readFileSync(join(root, path), "utf-8");

// ---------------------------------------------------------------------------------------
// Addressing a task
// ---------------------------------------------------------------------------------------

export interface TaskAddress {
  note: string;
  /** 0-based line in the note body, as planning_overview reports it. */
  line?: number;
  /** `^id` at the end of the line, or the task's `🆔`. */
  blockId?: string;
  /** Part of the description that matches exactly one open task. */
  task?: string;
  /** With `task`: match done and cancelled tasks too, still exactly one. */
  includeClosed?: boolean;
}

function findTask(byPath: Map<string, VaultNote>, a: TaskAddress, what: string, errors: string[]): { note: VaultNote; task: Task } | null {
  const note = findNote(byPath, a.note);
  if (!note) { errors.push(`${what}: no note ${a.note}`); return null; }
  const given = [a.line !== undefined, a.blockId !== undefined, a.task !== undefined].filter(Boolean).length;
  if (given !== 1) { errors.push(`${what}: address the task by exactly one of line, blockId or task`); return null; }
  const tasks = parseTasks(note.path, note.body, planOf(note.path));
  let hits: Task[];
  if (a.line !== undefined) hits = tasks.filter(t => t.line === a.line);
  else if (a.blockId !== undefined) hits = tasks.filter(t => t.blockId === a.blockId || t.id === a.blockId);
  else {
    const want = a.task!.toLowerCase();
    hits = tasks.filter(t => (a.includeClosed || t.state === "open") && t.text.toLowerCase().includes(want));
  }
  if (hits.length !== 1) {
    const how = a.line !== undefined ? `line ${a.line}` : a.blockId !== undefined ? `^${a.blockId}` : `"${a.task}"`;
    const closed = a.task !== undefined && !a.includeClosed && !hits.length
      ? tasks.filter(t => t.state !== "open" && t.text.toLowerCase().includes(a.task!.toLowerCase())).length : 0;
    const hint = closed ? ` (${closed} done or cancelled ${closed === 1 ? "task matches" : "tasks match"}; pass include_closed: true to reach ${closed === 1 ? "it" : "them"})` : "";
    errors.push(`${what}: ${hits.length ? `${hits.length} tasks` : a.task !== undefined && !a.includeClosed ? "no open task" : "no task"} in ${note.path} match ${how}${hits.length ? `: ${hits.map(h => `line ${h.line}: ${h.text}`).join("; ")}` : hint}`);
    return null;
  }
  return { note, task: hits[0] };
}

/** A parent goal one level up, as `<period>#^<id>`; returns the link text or pushes an error. */
function parentLink(byPath: Map<string, VaultNote>, of: Task, plan: string, value: string, what: string, errors: string[]): string | null {
  const ref = planOf(plan);
  const levels = ["year", "quarter", "month", "week", "day"] as const;
  const up = ref ? levels[levels.indexOf(ref.level) - 1] : undefined;
  const m = value.match(/^([^#]+)#\^([A-Za-z0-9-]+)$/);
  const pp = m ? periodOf(m[1]) : null;
  if (!of.goal || !ref) { errors.push(`${what}: only a goal in a plan links a parent goal`); return null; }
  if (!m || !pp) { errors.push(`${what}: parent "${value}" is not <period>#^<block id>`); return null; }
  if (pp.level !== up) { errors.push(`${what}: a ${ref.level} goal's parent is a ${up ?? "nothing"} goal, not a ${pp.level} goal`); return null; }
  const parentPlan = byPath.get(planPathOf(pp));
  if (!parentPlan || !parseTasks(parentPlan.path, parentPlan.body, pp).some(t => t.goal && t.blockId === m[2])) {
    errors.push(`${what}: no goal ^${m[2]} in ${planPathOf(pp)}`);
    return null;
  }
  return ` ↑ [[${pp.period}#^${m[2]}]]`;
}

// ---------------------------------------------------------------------------------------
// update_task
// ---------------------------------------------------------------------------------------

export interface TaskChanges {
  /** The new description with its links; the size tag, slip tags and parent link are kept. */
  text?: string;
  size?: Size | null;
  priority?: Priority | null;
  scheduled?: string | null;
  state?: "open" | "done" | "cancelled";
  /** A goal's parent one level up, `<period>#^<id>`; null removes it. */
  parent?: string | null;
  id?: string | null;
  blockedBy?: string[] | null;
  recurrence?: string | null;
}

export interface TaskUpdate extends TaskAddress {
  set: TaskChanges;
}

/** Put a size tag in a description, before its parent link when it has one. */
function withSize(desc: string, size: Size | null): string {
  const plain = desc.replace(SIZE_TAG, "");
  if (!size) return plain;
  const p = plain.search(/\s*↑\s*\[\[/);
  return p < 0 ? `${plain.replace(/\s+$/, "")} #${size}` : `${plain.slice(0, p)} #${size}${plain.slice(p)}`;
}

export function updateTasks(root: string, notes: VaultNote[], updates: TaskUpdate[], today: string): EditPlan {
  const out = empty();
  if (!updates.length) { out.errors.push("give at least one update"); return out; }
  const byPath = byPathOf(notes);
  const p = planning(root, notes);
  const editor = new TaskLineEditor(root, out.originals);
  const known = new Map(p.tasks.filter(t => t.id).map(t => [t.id!, t]));
  const newIds = new Set(updates.map(u => u.set.id).filter((x): x is string => !!x));

  updates.forEach((u, i) => {
    const what = `update ${i + 1}`;
    const errors: string[] = [];
    const hit = findTask(byPath, u, what, errors);
    const s = u.set ?? {};
    if (hit) {
      const err = plannedNoteError(p, hit.note.path);
      if (err) errors.push(`${what}: ${err}`);
    }
    if (!Object.keys(s).length) errors.push(`${what}: nothing to set`);
    if (s.text !== undefined && (!s.text.trim() || SIGNIFIER_IN_TEXT.test(s.text))) errors.push(`${what}: text must be the description only; give priority, dates, recurrence, id and blockedBy as their own fields`);
    if (s.size && !(s.size in SIZE_WEIGHTS)) errors.push(`${what}: size "${s.size}" is not one of S, M, L`);
    if (s.scheduled && !DAY.test(s.scheduled)) errors.push(`${what}: scheduled "${s.scheduled}" is not YYYY-MM-DD`);
    if (s.state && !["open", "done", "cancelled"].includes(s.state)) errors.push(`${what}: state "${s.state}" is not open, done or cancelled`);
    if (s.recurrence && !isRecurrence(s.recurrence)) errors.push(`${what}: recurrence "${s.recurrence}" is not a Tasks rule such as "every week on Monday"`);
    if (s.priority && !["highest", "high", "medium", "low", "lowest"].includes(s.priority)) errors.push(`${what}: priority "${s.priority}" is not highest, high, medium, low or lowest`);
    if (s.id) {
      if (!/^[A-Za-z0-9_-]+$/.test(s.id)) errors.push(`${what}: id "${s.id}" may hold only letters, digits, - and _`);
      const owner = known.get(s.id);
      if (owner && !(hit && owner.note === hit.note.path && owner.line === hit.task.line)) errors.push(`${what}: id "${s.id}" is already used in ${owner.note}`);
      if (updates.filter(x => x.set.id === s.id).length > 1) errors.push(`${what}: id "${s.id}" is given to more than one task`);
    }
    for (const b of s.blockedBy ?? []) if (!known.has(b) && !newIds.has(b)) errors.push(`${what}: blocked by "${b}", which no task has as its 🆔`);
    if (hit && s.recurrence !== null && (s.state === "done" || s.state === "cancelled") && (hit.task.recurrence || s.recurrence)) {
      errors.push(`${what}: "${hit.task.text}" repeats (🔁); tick it in Obsidian so Tasks writes its next occurrence, or set recurrence: null to end the habit`);
    }
    const parent = hit && s.parent ? parentLink(byPath, hit.task, hit.note.path, s.parent, what, errors) : null;
    if (hit && s.parent === null && !hit.task.goal) errors.push(`${what}: only a goal has a parent goal`);
    if (errors.length || !hit) { out.errors.push(...errors); return; }

    const err = editor.edit(hit.note, hit.task.line, raw => {
      const line = TaskLine.parse(raw)!;
      if (s.text !== undefined) {
        const keep = line.description.match(SIZE_TAG)?.[0] ?? "";
        const slips = (line.description.match(SLIP_TAGS) ?? []).join("");
        const up = line.description.match(PARENT_LINK)?.[0] ?? "";
        line.description = `${s.text.trim()}${keep}${slips}${up}`;
      }
      if (s.size !== undefined) line.description = withSize(line.description, s.size);
      if (s.parent !== undefined) {
        line.description = line.description.replace(PARENT_LINK, "");
        line.stripTails(PARENT_LINK);
        if (parent) line.description += parent;
      }
      if (s.priority !== undefined) line.set("priority", s.priority);
      if (s.recurrence !== undefined) line.set("recurrence", s.recurrence?.trim() ?? null);
      if (s.id !== undefined) line.set("id", s.id);
      if (s.blockedBy !== undefined) line.set("blockedBy", s.blockedBy?.length ? s.blockedBy.join(",") : null);
      if (s.scheduled !== undefined) line.set("scheduled", s.scheduled);
      if (s.state === "open") { line.setStatus(" "); line.set("done", null); line.set("cancelled", null); }
      if (s.state === "done") { line.setStatus("x"); line.set("cancelled", null); if (!line.get("done")) line.set("done", today); }
      if (s.state === "cancelled") { line.setStatus("-"); line.set("done", null); if (!line.get("cancelled")) line.set("cancelled", today); }
      return line.toString();
    }, true);
    if (err) out.errors.push(`${what}: ${err}`);
  });
  out.edits = editor.edits;
  Object.assign(out.writes, editor.writes());
  if (!out.errors.length && !out.edits.length) out.warnings.push("every task already reads as asked; nothing changes");
  return out;
}

// ---------------------------------------------------------------------------------------
// add_tasks
// ---------------------------------------------------------------------------------------

export interface NewTask extends TaskFields {
  text: string;
  size?: Size;
  scheduled?: string;
  /** Notes it links after its text; in a plan the first is its project, workstream or area. */
  links?: string[];
}

export interface AddTasksInput {
  note: string;
  /**
   * The section the tasks go into, after its own lines and before its first subheading. A
   * path such as `Robotics: Machinekind/Marketing` picks one of several sections of one name.
   * A missing last part is created at the end of the section above it, or of the note.
   */
  heading?: string;
  /** The level (2–6) of a heading that is created; defaults to one below its parent, or 2. */
  level?: number;
  /** An existing task the new ones go under as subtasks. */
  parent?: Omit<TaskAddress, "note">;
  tasks: NewTask[];
}

const indentOf = (line: string) => line.match(/^\s*/)![0];

interface Heading { i: number; level: number; name: string }

function headingsOf(lines: string[]): Heading[] {
  const out: Heading[] = [];
  let fenced = false;
  lines.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) { fenced = !fenced; return; }
    const m = !fenced && l.match(HEADING);
    if (m) out.push({ i, level: m[1].length, name: m[2].trim() });
  });
  return out;
}

/** A heading's path from the top, `Parent/Child`, to tell sections of one name apart. */
function headingPath(hs: Heading[], h: Heading): string {
  const path = [h.name];
  let level = h.level;
  for (let k = hs.indexOf(h) - 1; k >= 0 && level > 1; k--) if (hs[k].level < level) { path.unshift(hs[k].name); level = hs[k].level; }
  return path.join("/");
}

/**
 * Put lines into the section a heading or heading path names: after the section's own lines,
 * before its first subheading. A missing last part of the path is created, at `level` or one
 * below its parent, at the end of the parent section (subsections included) or of the body.
 */
function addUnderHeading(body: string, heading: string, level: number | undefined, add: string[]): { body: string } | { error: string } {
  const all = body.split("\n");
  const hs = headingsOf(all);
  const name = heading.replace(/^#+\s*/, "").trim();
  const same = (h: Heading, n: string) => h.name.toLowerCase() === n.toLowerCase();
  // A heading whose own text holds a "/" is matched whole before the text is read as a path.
  const parts = hs.some(h => same(h, name)) || !name.includes("/") ? [name] : name.split("/").map(x => x.trim()).filter(Boolean);
  let parent: Heading | null = null;
  let from = 0;
  let to = all.length;
  for (const [k, part] of parts.entries()) {
    const hits = hs.filter(h => h.i >= from && h.i < to && h.level > (parent?.level ?? 0) && same(h, part));
    if (hits.length > 1) {
      const paths = hits.map(h => `"${headingPath(hs, h)}"`);
      return { error: `${hits.length} sections are headed "${parts.slice(0, k + 1).join("/")}": ${paths.join(", ")}; give the heading as a path to one of them, e.g. ${paths[0]}` };
    }
    if (!hits.length) {
      if (k < parts.length - 1) return { error: `no section "${part}"${parent ? ` under "${headingPath(hs, parent)}"` : ""}; only the last part of a heading path is created` };
      const lvl = level ?? (parent ? Math.min(parent.level + 1, 6) : 2);
      if (parent && lvl <= parent.level) return { error: `a level ${lvl} heading cannot go under "${headingPath(hs, parent)}", which is level ${parent.level}` };
      let last = to - 1;
      while (last >= from && all[last].trim() === "") last--;
      const before = all.slice(0, last + 1);
      const rest = all.slice(last + 1);
      const created = [...(before.length ? [""] : []), `${"#".repeat(lvl)} ${part}`, "", ...add];
      return { body: [...before, ...created, ...(rest.length ? (rest[0].trim() === "" ? rest : ["", ...rest]) : [""])].join("\n") };
    }
    parent = hits[0];
    from = parent.i + 1;
    const next = hs.find(h => h.i > parent!.i && h.level <= parent!.level);
    to = next ? next.i : all.length;
  }
  const h = parent!;
  if (level !== undefined && level !== h.level) return { error: `"${headingPath(hs, h)}" exists at level ${h.level}, not ${level}` };
  const sub = hs.find(x => x.i > h.i && x.i < to);
  const end = sub ? sub.i : to;
  let last = end - 1;
  while (last > h.i && all[last].trim() === "") last--;
  const after = all.slice(last + 1);
  const lines = last === h.i ? ["", ...add] : add;
  return { body: [...all.slice(0, last + 1), ...lines, ...(after.length && after[0].trim() !== "" ? [""] : after.length ? [] : [""]), ...after].join("\n") };
}

export function addTasks(root: string, notes: VaultNote[], input: AddTasksInput): EditPlan {
  const out = empty();
  const byPath = byPathOf(notes);
  const note = findNote(byPath, input.note);
  if (!note) { out.errors.push(`no note ${input.note}`); return out; }
  const p = planning(root, notes);
  const where = plannedNoteError(p, note.path);
  if (where) { out.errors.push(where); return out; }
  if (!input.tasks?.length) { out.errors.push("give at least one task"); return out; }
  if (input.heading && input.parent) { out.errors.push("give heading or parent, not both: subtasks go under their parent wherever it is"); return out; }
  if (input.level !== undefined && (!input.heading || !Number.isInteger(input.level) || input.level < 2 || input.level > 6)) { out.errors.push("level is a heading level from 2 to 6, given with heading"); return out; }
  const inPlan = planOf(note.path) !== null;
  const resolver = noteResolver(notes);
  const owners = new Set<string>();
  for (const pr of p.projects) { if (pr.note) owners.add(pr.note); for (const w of pr.workstreams) w.notes.forEach(n => owners.add(n)); }
  for (const a of p.areas) a.notes.forEach(n => owners.add(n));

  out.errors.push(...checkTaskIds(p, input.tasks.map(t => ({ what: `task "${t.text}"`, id: t.id, blockedBy: t.blockedBy }))));
  const original = read(root, note.path);
  out.originals[note.path] = original;
  const file = original.split("\n");
  const bodyStart = file.length - note.body.split("\n").length;

  let at = -1;
  let indent = "";
  if (input.parent) {
    const hit = findTask(byPath, { note: note.path, ...input.parent }, "parent", out.errors);
    if (hit) {
      const i = bodyStart + hit.task.line;
      const base = indentOf(file[i]).length;
      let end = i + 1;
      while (end < file.length && file[end].trim() !== "" && indentOf(file[end]).length > base) end++;
      at = end;
      indent = end > i + 1 ? indentOf(file[i + 1]) : `${indentOf(file[i])}\t`;
    }
  }

  const lines: string[] = [];
  for (const t of input.tasks) {
    const what = `task "${t.text}"`;
    if (!t.text?.trim() || SIGNIFIER_IN_TEXT.test(t.text)) { out.errors.push(`${what}: text must be the description only; give priority, dates, recurrence, id and blockedBy as their own fields`); continue; }
    if (t.size && !(t.size in SIZE_WEIGHTS)) out.errors.push(`${what}: size "${t.size}" is not one of S, M, L`);
    if (t.scheduled && !DAY.test(t.scheduled)) out.errors.push(`${what}: scheduled "${t.scheduled}" is not YYYY-MM-DD`);
    const links = (t.links ?? []).map((l, i) => {
      const target = resolver.resolve(note.path, { kind: "wikilink", target: l.replace(/\.md$/, "") });
      if (!target) { out.errors.push(`${what}: no note "${l}" to link`); return ""; }
      if (i === 0 && inPlan && !owners.has(target)) out.errors.push(`${what}: in a plan the first link is a project, workstream or area; "${l}" is not one`);
      return wikilinkTo(resolver, note.path, target);
    });
    if (inPlan && !links.length) out.errors.push(`${what}: a task in a plan links its project, workstream or area as the first of links`);
    const line = TaskLine.create(indent, `${t.text.trim()}${links.length ? ` ${links.join(" ")}` : ""}${t.size ? ` #${t.size}` : ""}`);
    out.errors.push(...applyFields(line, t, what));
    lines.push(line.toString());
  }
  if (out.errors.length) return out;

  let content: string;
  if (at >= 0) content = [...file.slice(0, at), ...lines, ...file.slice(at)].join("\n");
  else if (input.heading) {
    const fm = original.match(FRONTMATTER)?.[0] ?? "";
    const r = addUnderHeading(original.slice(fm.length), input.heading, input.level, lines);
    if ("error" in r) { out.errors.push(r.error); return out; }
    content = fm + r.body;
  } else content = `${original.replace(/\n*$/, "\n")}${lines.join("\n")}\n`;
  out.writes[note.path] = content;
  out.edits = hunk(note.path, original, content, bodyStart);
  return out;
}

// ---------------------------------------------------------------------------------------
// set_frontmatter
// ---------------------------------------------------------------------------------------

export interface NewHabit {
  /** What is done, e.g. "Up at 6:00". */
  text: string;
  /** every day, every weekday, every weekend, or every week on <days>. */
  rule: string;
}

export interface AddHabitsInput {
  note: string;
  habits: NewHabit[];
}

/**
 * `add_habits` (ADR-KI-0065): define habits under the `## Habits` heading of a project,
 * workstream or area note, as plain list items with a `🔁` rule. The day plans check them
 * off; a definition is changed or ended with `edit_note`.
 */
export function addHabits(root: string, notes: VaultNote[], input: AddHabitsInput): EditPlan {
  const out = empty();
  const note = findNote(byPathOf(notes), input.note);
  if (!note) { out.errors.push(`no note ${input.note}`); return out; }
  if (planOf(note.path)) { out.errors.push(`${note.path} is a plan; a habit is defined in its workstream, area or project note, and plan_period checks it off in the day plans`); return out; }
  const where = plannedNoteError(planning(root, notes), note.path);
  if (where) { out.errors.push(where); return out; }
  if (!input.habits?.length) { out.errors.push("give at least one habit"); return out; }
  const taken = new Set(parseHabits(note.body).habits.map(h => habitKey(h.text)));
  const lines: string[] = [];
  for (const h of input.habits) {
    const what = `habit "${h.text}"`;
    if (!h.text?.trim() || SIGNIFIER_IN_TEXT.test(h.text) || /\[\[|#[SML]\b/.test(h.text)) { out.errors.push(`${what}: text is what is done, without links, size or signifiers`); continue; }
    if (!habitDays(h.rule ?? "")) { out.errors.push(`${what}: rule "${h.rule}" is not one of ${HABIT_RULES}`); continue; }
    const key = habitKey(h.text);
    if (taken.has(key)) { out.errors.push(`${what}: ${note.path} already defines it`); continue; }
    taken.add(key);
    lines.push(`- ${h.text.trim()} 🔁 ${h.rule.trim().replace(/\s+/g, " ")}`);
  }
  if (out.errors.length) return out;
  const original = read(root, note.path);
  out.originals[note.path] = original;
  const fm = original.match(FRONTMATTER)?.[0] ?? "";
  const content = fm + addToSection(original.slice(fm.length), HABITS_HEADING, lines);
  out.writes[note.path] = content;
  out.edits = hunk(note.path, original, content, bodyStartOf(original, note));
  return out;
}

export type FrontmatterValue = string | number | boolean | string[] | null;
/** Keys other tools own: a session's tie to its note, and a converted book's provenance. */
const MACHINE_KEYS = ["coach_id", "converted_from", "raw_role", "pages", "climb", "group", "groups"];

function yamlValue(v: Exclude<FrontmatterValue, null>): string {
  if (Array.isArray(v)) return `[${v.map(x => JSON.stringify(x)).join(", ")}]`;
  if (typeof v !== "string") return String(v);
  const plain = /^[A-Za-z0-9][A-Za-z0-9 _.,/()'-]*$/.test(v) && !/^(true|false|null|yes|no|on|off|~|[\d.]+)$/i.test(v) && !/\s$/.test(v);
  return plain ? v : JSON.stringify(v);
}

export function setFrontmatter(root: string, notes: VaultNote[], path: string, set: Record<string, FrontmatterValue>): EditPlan {
  const out = empty();
  const note = findNote(byPathOf(notes), path);
  if (!note) { out.errors.push(`no note ${path}`); return out; }
  const where = editableError(note.path);
  if (where) { out.errors.push(where); return out; }
  const keys = Object.keys(set ?? {});
  if (!keys.length) out.errors.push("nothing to set");
  for (const k of keys) {
    const v = set[k];
    if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(k)) out.errors.push(`"${k}" is not a frontmatter key this tool writes: letters, digits, - and _`);
    if (MACHINE_KEYS.includes(k)) out.errors.push(`${k} is written by the vault tools, not by hand`);
    if (k === "status" && v !== null && !(STATUSES as readonly string[]).includes(String(v))) out.errors.push(`status "${String(v)}" is not one of ${STATUSES.join(", ")}`);
    if (k === "deadline" && v !== null && !(typeof v === "string" && DAY.test(v))) out.errors.push(`deadline "${String(v)}" is not YYYY-MM-DD`);
    if (v !== null && !["string", "number", "boolean"].includes(typeof v) && !(Array.isArray(v) && v.every(x => typeof x === "string"))) out.errors.push(`${k}: a value is text, a number, true or false, a list of text, or null to remove the key`);
  }
  if (out.errors.length) return out;

  const original = read(root, note.path);
  out.originals[note.path] = original;
  const nl = original.includes("\r\n") ? "\r\n" : "\n";
  const m = original.match(FRONTMATTER);
  let fm = m ? m[1].split(/\r?\n/) : [];
  if (m && m[1] === "") fm = [];
  for (const k of keys) {
    const v = set[k];
    const i = fm.findIndex(l => new RegExp(`^${k}\\s*:`).test(l));
    let end = i + 1;
    // A key's value runs on over indented lines and list items below it.
    if (i >= 0) while (end < fm.length && /^(\s+\S|-\s|-$)/.test(fm[end])) end++;
    const lines = v === null ? [] : [`${k}: ${yamlValue(v)}`];
    if (i >= 0) fm.splice(i, end - i, ...lines);
    else if (v !== null) fm.push(...lines);
    else out.warnings.push(`${k} is not set in ${note.path}; nothing to remove`);
  }
  const block = fm.length ? `---${nl}${fm.join(nl)}${nl}---${nl}` : "";
  const content = m ? block + original.slice(m[0].length) : block + original;
  if (content !== original) out.writes[note.path] = content;
  out.edits = hunk(note.path, original, content, bodyStartOf(original, note));
  return out;
}

// ---------------------------------------------------------------------------------------
// edit_note
// ---------------------------------------------------------------------------------------

export interface EditNoteInput {
  note: string;
  /** Exact replacements in the body, applied in order; each `old` must occur exactly once. */
  edits?: { old: string; new: string }[];
  /** Replace or append to one section by its heading text. */
  heading?: string;
  content?: string;
  mode?: "replace" | "append";
}

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/** A body's task lines, sorted, to tell whether an edit adds, removes or changes one. */
function taskLinesOf(body: string): string {
  const lines = body.split("\n");
  return parseTasks("", body).map(t => lines[t.line].replace(/\r$/, "")).sort().join("\n");
}
const TASKS_ARE_TASK_TOOLS = "tasks are changed with update_task (include_closed: true reaches a done or cancelled one) and added with add_tasks, which keep their Tasks signifiers intact";

export function editNote(root: string, notes: VaultNote[], input: EditNoteInput): EditPlan {
  const out = empty();
  const note = findNote(byPathOf(notes), input.note);
  if (!note) { out.errors.push(`no note ${input.note}`); return out; }
  const where = editableError(note.path);
  if (where) { out.errors.push(where); return out; }
  const bySection = input.heading !== undefined;
  if (bySection === !!input.edits?.length) { out.errors.push("give either edits or heading with content and mode"); return out; }

  const original = read(root, note.path);
  out.originals[note.path] = original;
  const fm = original.match(FRONTMATTER)?.[0] ?? "";
  let body = original.slice(fm.length);

  if (!bySection) {
    input.edits!.forEach((e, i) => {
      if (!e.old) { out.errors.push(`edit ${i + 1}: old is empty; give the exact text to replace`); return; }
      const count = body.split(e.old).length - 1;
      if (count !== 1) { out.errors.push(`edit ${i + 1}: the text occurs ${count} times in the body of ${note.path}; it must occur exactly once${fm.includes(e.old) ? " (frontmatter is set_frontmatter's)" : ""}`); return; }
      const next = body.replace(e.old, () => e.new);
      if (taskLinesOf(next) !== taskLinesOf(body)) { out.errors.push(`edit ${i + 1}: it changes a task line; ${TASKS_ARE_TASK_TOOLS}`); return; }
      body = next;
    });
  } else {
    if (input.content === undefined || !input.mode || !["replace", "append"].includes(input.mode)) { out.errors.push("a section edit needs content and mode: replace or append"); return out; }
    const was = body;
    const lines = body.split("\n");
    const want = input.heading!.replace(/^#+\s*/, "").trim().toLowerCase();
    const hits = lines.map((l, i) => ({ i, m: l.match(HEADING) })).filter(x => x.m && x.m[2].trim().toLowerCase() === want);
    const text = input.content.replace(/\n+$/, "");
    if (hits.length > 1) { out.errors.push(`${hits.length} sections in ${note.path} are headed "${input.heading}"; edit them with edits instead`); return out; }
    if (!hits.length) {
      body = `${body.replace(/\n*$/, "\n")}\n## ${input.heading!.replace(/^#+\s*/, "").trim()}\n\n${text}\n`;
      out.warnings.push(`no section "${input.heading}" in ${note.path}; it is added at the end`);
    } else {
      const { i, m } = hits[0];
      const level = m![1].length;
      let end = lines.findIndex((l, j) => j > i && (l.match(HEADING)?.[1].length ?? 7) <= level);
      if (end < 0) end = lines.length;
      let last = end - 1;
      while (last > i && lines[last].trim() === "") last--;
      if (input.mode === "append" && last > i) {
        // After the section's last line, keeping the blank lines and headings that follow.
        body = [...lines.slice(0, last + 1), text, ...lines.slice(last + 1)].join("\n");
      } else {
        // A replaced (or empty) section: one blank line, the content, one blank line before the next heading.
        const rest = lines.slice(end);
        body = [...lines.slice(0, i + 1), "", text, ...(rest.length ? ["", ...rest] : [""])].join("\n");
      }
    }
    if (taskLinesOf(body) !== taskLinesOf(was)) out.errors.push(`the section edit changes task lines; ${TASKS_ARE_TASK_TOOLS}`);
  }
  if (out.errors.length) return out;
  const content = fm + body;
  if (content !== original) out.writes[note.path] = content;
  else out.warnings.push("the note already reads as asked; nothing changes");
  out.edits = hunk(note.path, original, content, bodyStartOf(original, note));
  return out;
}

// ---------------------------------------------------------------------------------------
// create_workstream
// ---------------------------------------------------------------------------------------

export interface CreateWorkstreamInput {
  project: string;
  name: string;
  /** A folder `<Name>/<Name>.md` for a workstream that will hold several notes or files. */
  folder?: boolean;
  status?: string;
  description?: string;
  /** The area it serves, linked from its frontmatter. */
  area?: string;
}

export function createWorkstream(root: string, notes: VaultNote[], input: CreateWorkstreamInput): EditPlan & { note: string } {
  const out = { ...empty(), note: "" };
  const p = planning(root, notes);
  const pr = p.projects.find(x => !x.archived && x.name === input.project);
  if (!pr) { out.errors.push(`no active project "${input.project}" under ${PARA_FOLDERS.projects}/`); return out; }
  if (!pr.note) { out.errors.push(`${pr.folder} has no project note ${pr.folder}/${pr.name}.md to list the workstream in`); return out; }
  const name = (input.name ?? "").trim();
  if (!name || /[\\/:*?"<>|#^[\]]/.test(name)) { out.errors.push(`"${input.name}" is not a workstream name: no / \\ : * ? " < > | # ^ [ ]`); return out; }
  if (pr.workstreams.some(w => w.name.toLowerCase() === name.toLowerCase())) { out.errors.push(`${pr.name} already has a workstream ${name}`); return out; }
  const status = input.status ?? "todo";
  if (!(STATUSES as readonly string[]).includes(status)) out.errors.push(`status "${status}" is not one of ${STATUSES.join(", ")}`);
  const area = input.area ? p.areas.find(a => a.name === input.area) : undefined;
  if (input.area && !area) out.errors.push(`no area "${input.area}" under ${PARA_FOLDERS.areas}/`);
  if (out.errors.length) return out;

  const dir = posix.join(pr.folder, WORKSTREAMS_FOLDER);
  const path = input.folder ? posix.join(dir, name, `${name}.md`) : posix.join(dir, `${name}.md`);
  out.note = path;
  const resolver = noteResolver(notes);
  const areaLink = area?.note ? wikilinkTo(resolver, path, area.note) : null;
  const fm = [`status: ${status}`, ...(areaLink ? [`area: ${JSON.stringify(areaLink)}`] : [])];
  out.writes[path] = `---\n${fm.join("\n")}\n---\n# ${name}\n${input.description?.trim() ? `\n${input.description.trim()}\n` : ""}`;
  out.created.push(path);
  out.edits.push({ note: path, fileLine: 1, before: "", after: out.writes[path].replace(/\n$/, "") });

  const original = read(root, pr.note);
  out.originals[pr.note] = original;
  const clash = notes.some(n => posix.basename(n.path, ".md") === name);
  const link = clash ? `[[${path.slice(0, -3)}|${name}]]` : `[[${name}]]`;
  const fmText = original.match(FRONTMATTER)?.[0] ?? "";
  let body = original.slice(fmText.length);
  body = body.replace(/^## Workstreams\n\nNone yet\.\n/m, "## Workstreams\n\n");
  const content = fmText + addToSection(body, "Workstreams", [`- ${link}`]);
  out.writes[pr.note] = content;
  const prNote = notes.find(n => n.path === pr.note);
  out.edits.push(...hunk(pr.note, original, content, prNote ? bodyStartOf(original, prNote) : 0));
  return out;
}
