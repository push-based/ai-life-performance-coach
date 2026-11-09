/**
 * The climb's writes (ADR-KI-0068): reading notes for Read, a structure note for Group, a
 * guideline from a passed Teach session, and rebuilding `climb:` summaries from the
 * evidence. Each is planned as note writes, previewed, and written only on `execute`
 * with the versions the preview returned (ADR-KI-0064 Decision 2).
 */

import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { yamlString } from "@docs-mcp/core/kernel/md/yaml.js";
import { classify, PARA_FOLDERS } from "./para.js";
import { safeName } from "./filing.js";
import { CONCEPTS_FOLDER, fold } from "./concept.js";
import { noteFromContent, type VaultNote } from "./scan.js";
import type { SessionRecord } from "./sessions.js";
import type { NoteWrites } from "./plans.js";
import {
  bookOf, chaptersOf, climbOf, conceptBook, isConceptNote, readingEntries, sectionText, setFrontmatterLines, sharesRun,
  structureErrors, structureOf, withClimb, wordCount, CLIMB_STEPS, GUIDELINE_TYPE, READING_NOTES_TYPE, STRUCTURE_TYPE,
  type ConceptClimb, type StructureGroup,
} from "./climb.js";

export const READING_NOTES_FOLDER = posix.join(PARA_FOLDERS.resources, "Reading notes");
export const STRUCTURES_FOLDER = posix.join(CONCEPTS_FOLDER, "Structures");
/** Forte keeps each layer to about a tenth to a fifth of the one before. */
export const NOTE_SHARE_WARNING = 0.2;

export interface ClimbWritePlan extends NoteWrites {
  warnings: string[];
  /** Concept notes whose `climb:` summary changes, with the dates it would hold. */
  climbs: { path: string; climb: Record<string, string | null> }[];
}

const emptyPlan = (): ClimbWritePlan => ({ errors: [], warnings: [], originals: {}, writes: {}, created: [], climbs: [] });

const read = (root: string, path: string) => readFileSync(join(root, path), "utf-8");

/** The current text of a note in a plan: what the plan already writes, else the file. */
function current(root: string, plan: ClimbWritePlan, path: string): string {
  if (path in plan.writes) return plan.writes[path];
  if (!(path in plan.originals)) plan.originals[path] = read(root, path);
  return plan.originals[path];
}

function put(root: string, plan: ClimbWritePlan, path: string, content: string, create = false): void {
  if (create) plan.created.push(path);
  else current(root, plan, path);
  plan.writes[path] = content;
}

/** The vault as it will be once the plan's writes are made. */
function afterPlan(notes: VaultNote[], plan: ClimbWritePlan): VaultNote[] {
  const out = notes.map(n => (n.path in plan.writes ? noteFromContent(n.path, plan.writes[n.path]) : n));
  for (const p of plan.created) out.push(noteFromContent(p, plan.writes[p]));
  return out;
}

/** Set each concept's `climb:` from the evidence in the vault as the plan leaves it. */
function refreshClimbs(root: string, notes: VaultNote[], sessions: SessionRecord[], plan: ClimbWritePlan, paths: string[]): void {
  const after = afterPlan(notes, plan);
  for (const path of paths) {
    const note = after.find(n => n.path === path);
    if (!note || !isConceptNote(note)) continue;
    const c = climbOf(note, after, sessions);
    if (c.current) continue;
    put(root, plan, path, withClimb(current(root, plan, path), c.steps));
    plan.climbs.push({ path, climb: Object.fromEntries(CLIMB_STEPS.map(s => [s, c.steps[s]?.date ?? null])) });
  }
}

const conceptsQuoting = (notes: VaultNote[], chapter: string) =>
  notes.filter(isConceptNote).filter(c => chaptersOf(c, notes).some(ch => ch.path === chapter)).map(c => c.path);

// ---------------------------------------------------------------------------------------
// add_reading_notes (Read)
// ---------------------------------------------------------------------------------------

export interface ReadingNotesInput {
  /** A raw chapter of a converted book. */
  chapter: string;
  /** The `## Page N` the notes were written on; absent for the chapter as a whole. */
  page?: number;
  notes: string[];
}

export interface ReadingNotesPlan extends ClimbWritePlan {
  path: string | null;
  /** Each note as classed: a quote shares a run of six or more words with the section. */
  entries: { text: string; quote: boolean }[];
}

const chapterLink = (chapter: VaultNote, page: number | null, label: string) =>
  `[[${chapter.path.replace(/\.md$/, "")}${page !== null ? `#Page ${page}` : ""}|${label}]]`;

export function addReadingNotes(root: string, notes: VaultNote[], sessions: SessionRecord[], input: ReadingNotesInput, date: string): ReadingNotesPlan {
  const plan: ReadingNotesPlan = { ...emptyPlan(), path: null, entries: [] };
  const chapter = notes.find(n => n.path === input.chapter);
  if (!chapter || chapter.rawRole !== "chapter") { plan.errors.push(`${input.chapter} is not a chapter of a converted book`); return plan; }
  const page = input.page ?? null;
  if (page !== null && !/^## Page \d+/.test(sectionText(chapter, page))) { plan.errors.push(`${chapter.path} has no page ${page}`); return plan; }
  const texts = (Array.isArray(input.notes) ? input.notes : []).map(t => (typeof t === "string" ? t.trim().replace(/\s*\n\s*/g, " ") : "")).filter(Boolean);
  if (!texts.length) { plan.errors.push("no notes: write down what resonated, in your own words"); return plan; }

  const section = sectionText(chapter, page) || sectionText(chapter, null);
  plan.entries = texts.map(text => ({ text, quote: sharesRun(text, section) }));
  for (const e of plan.entries) if (e.quote) plan.warnings.push(`"${e.text.slice(0, 60)}${e.text.length > 60 ? "…" : ""}" shares six or more words in a row with the text, so it is kept as a quote; only notes in your own words count for Read`);

  const book = bookOf(chapter, notes) ?? chapter.title;
  const path = posix.join(READING_NOTES_FOLDER, safeName(book) ?? "Book", `${safeName(chapter.title) ?? "Chapter"}.md`);
  plan.path = path;
  const existing = notes.find(n => n.path === path);
  if (existing && (existing.frontmatter.type !== READING_NOTES_TYPE || existing.frontmatter.chapter !== chapter.path)) { plan.errors.push(`${path} exists and is not the reading notes of ${chapter.path}`); return plan; }
  if (!existing && existsSync(join(root, path))) { plan.errors.push(`${path} exists and is not a note`); return plan; }

  const heading = page !== null ? `## Page ${page}` : "## Notes";
  const lines = plan.entries.map(e => `- ${date} · ${e.quote ? `“${e.text}” (quote)` : e.text} — ${chapterLink(chapter, page, page !== null ? `p. ${page}` : chapter.title)}`);
  const original = existing ? current(root, plan, path) : [
    "---", `type: ${yamlString(READING_NOTES_TYPE)}`, `chapter: ${yamlString(chapter.path)}`, `book: ${yamlString(book)}`, "---", "",
    `# Reading notes: ${chapter.title}`, "", `From ${chapterLink(chapter, null, `${book}, ${chapter.title}`)}.`, "",
  ].join("\n");
  const content = insertUnder(original, heading, lines);
  put(root, plan, path, content, !existing);

  const written = readingEntries(noteFromContent(path, content), chapter).filter(e => e.page === page);
  const share = wordCount(written.map(e => e.text).join(" ")) / Math.max(1, wordCount(section));
  if (share > NOTE_SHARE_WARNING) plan.warnings.push(`the notes on ${page !== null ? `page ${page}` : "this chapter"} hold ${Math.round(share * 100)}% of its words; keep what resonates, about 10-20%`);

  refreshClimbs(root, notes, sessions, plan, conceptsQuoting(notes, chapter.path));
  return plan;
}

/** Lines added at the end of a `## ` section, the section created at the end when missing. */
function insertUnder(content: string, heading: string, add: string[]): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const at = lines.findIndex(l => l.trimEnd() === heading);
  if (at < 0) {
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    return `${[...lines, "", heading, "", ...add].join("\n")}\n`;
  }
  let end = lines.findIndex((l, i) => i > at && /^#{1,2} /.test(l));
  if (end < 0) end = lines.length;
  let last = end;
  while (last > at + 1 && lines[last - 1] === "") last--;
  const out = [...lines.slice(0, last), ...add, ...(end < lines.length ? [""] : []), ...lines.slice(end)];
  return `${out.join("\n").replace(/\n+$/, "")}\n`;
}

// ---------------------------------------------------------------------------------------
// write_structure (Group)
// ---------------------------------------------------------------------------------------

export interface StructureInput {
  book: string;
  /** Each group, named by the learner, with its concept notes by path or title. */
  groups: { name: string; concepts: string[] }[];
  /** "from builds on to", both group names. */
  builds_on?: { from: string; to: string }[];
}

export interface StructurePlan extends ClimbWritePlan {
  path: string | null;
}

export function writeStructure(root: string, notes: VaultNote[], sessions: SessionRecord[], input: StructureInput, date: string): StructurePlan {
  const plan: StructurePlan = { ...emptyPlan(), path: null };
  const book = typeof input.book === "string" ? input.book.trim() : "";
  const concepts = notes.filter(isConceptNote).filter(c => conceptBook(c, notes) === book);
  if (!concepts.length) { plan.errors.push(`no concept note quotes a book named "${book}"; run create_concept first`); return plan; }
  const resolve = (ref: string) => concepts.find(c => c.path === ref || c.path === `${ref}.md`) ?? concepts.find(c => c.title === ref || posix.basename(c.path, ".md") === ref);

  const groups: StructureGroup[] = [];
  for (const g of Array.isArray(input.groups) ? input.groups : []) {
    const members: string[] = [];
    for (const ref of Array.isArray(g?.concepts) ? g.concepts : []) {
      const c = typeof ref === "string" ? resolve(ref.trim()) : undefined;
      if (!c) plan.errors.push(`group "${g?.name}": ${String(ref)} is not a concept note of ${book}`);
      else members.push(c.path);
    }
    groups.push({ name: typeof g?.name === "string" ? g.name.trim() : "", concepts: members });
  }
  const buildsOn = (Array.isArray(input.builds_on) ? input.builds_on : []).map(e => ({ from: String(e?.from ?? "").trim(), to: String(e?.to ?? "").trim() }));
  plan.errors.push(...structureErrors(groups, buildsOn, concepts.map(c => c.path)));
  if (plan.errors.length) return plan;

  const canonical = (name: string) => groups.find(g => g.name.toLowerCase() === name.toLowerCase())!.name;
  const edges = buildsOn.map(e => ({ from: canonical(e.from), to: canonical(e.to) }));
  const headings = new Set(notes.filter(n => n.raw && bookOf(n, notes) === book).flatMap(n => [...n.body.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map(m => fold(m[1]))).filter(h => !/^page \d+$/.test(h)));
  for (const g of groups) if (headings.has(fold(g.name))) plan.warnings.push(`group "${g.name}" is a heading of the book word for word; a name in your own words builds the frame better`);
  for (const g of groups) if (!edges.some(e => e.to === g.name) && edges.length) plan.warnings.push(`nothing builds on "${g.name}"`);

  const path = posix.join(STRUCTURES_FOLDER, `${safeName(book) ?? "Book"}.md`);
  plan.path = path;
  const existing = notes.find(n => n.path === path);
  if (existing && structureOf(existing)?.book !== book) { plan.errors.push(`${path} exists and is not the structure note of ${book}`); return plan; }
  if (!existing && existsSync(join(root, path))) { plan.errors.push(`${path} exists and is not a note`); return plan; }

  const title = (p: string) => concepts.find(c => c.path === p)!.title;
  const content = [
    "---",
    `type: ${yamlString(STRUCTURE_TYPE)}`,
    `book: ${yamlString(book)}`,
    `date: ${yamlString(date)}`,
    "groups:",
    ...groups.flatMap(g => [`  - name: ${yamlString(g.name)}`, "    concepts:", ...g.concepts.map(c => `      - ${yamlString(c)}`)]),
    ...(edges.length ? ["builds_on:", ...edges.flatMap(e => [`  - from: ${yamlString(e.from)}`, `    to: ${yamlString(e.to)}`])] : ["builds_on: []"]),
    "---",
    "",
    `# Structure: ${book}`,
    "",
    "Written by the coach from the groups and layers you gave. Edits here are not read back; the record is the frontmatter.",
    ...groups.flatMap(g => ["", `## ${g.name}`, "", ...g.concepts.map(c => `- [[${c.replace(/\.md$/, "")}|${title(c)}]]`)]),
    ...(edges.length ? ["", "## Builds on", "", ...edges.map(e => `- ${e.from} → ${e.to}`)] : []),
    "",
  ].join("\n");
  put(root, plan, path, content, !existing);
  for (const g of groups) for (const c of g.concepts) {
    const next = setFrontmatterLines(current(root, plan, c), "group", [`group: ${yamlString(g.name)}`]);
    if (next !== current(root, plan, c)) put(root, plan, c, next);
  }
  refreshClimbs(root, notes, sessions, plan, concepts.map(c => c.path));
  return plan;
}

// ---------------------------------------------------------------------------------------
// save_guideline (Teach)
// ---------------------------------------------------------------------------------------

export interface GuidelineInput {
  session_id: string;
  /** The concept note taught, by path; needed only when the session covers several. */
  note?: string;
  title: string;
  /** A folder under 1.Projects or 3.Resources, outside 0.Raw. */
  folder: string;
}

export interface GuidelinePlan extends ClimbWritePlan {
  path: string | null;
}

export function saveGuideline(root: string, notes: VaultNote[], sessions: SessionRecord[], input: GuidelineInput): GuidelinePlan {
  const plan: GuidelinePlan = { ...emptyPlan(), path: null };
  const session = sessions.find(s => s.session_id === input.session_id);
  if (!session) { plan.errors.push(`no session ${input.session_id}`); return plan; }
  if (session.kind !== "teach") { plan.errors.push(`${input.session_id} is a ${session.kind} session; a guideline is saved from a Teach session`); return plan; }
  const items = input.note ? session.items.filter(i => i.note_path === input.note) : session.items;
  if (items.length !== 1) { plan.errors.push(input.note ? `${input.session_id} does not cover ${input.note}` : `${input.session_id} covers ${items.length} notes; name the one to save`); return plan; }
  const item = items[0];
  if (item.verdict !== "pass") { plan.errors.push("only a passed Teach session is saved as a guideline"); return plan; }
  const folder = posix.normalize(String(input.folder ?? "").replace(/\/+$/, ""));
  const at = classify(`${folder}/x.md`);
  if (folder.startsWith("..") || (at.bucket !== "projects" && at.bucket !== "resources") || at.raw) { plan.errors.push(`${folder} is not a folder under 1.Projects or 3.Resources outside 0.Raw`); return plan; }
  const name = safeName(input.title ?? "");
  if (!name) { plan.errors.push("title must contain a character other than those Obsidian forbids in a file name"); return plan; }
  const path = posix.join(folder, `${name}.md`);
  plan.path = path;
  if (existsSync(join(root, path))) { plan.errors.push(`${path} already exists`); return plan; }
  const lesson = (item.teach?.turns ?? []).filter(t => t.role === "learner").map(t => t.text.trim()).filter(Boolean);
  const content = [
    "---", `type: ${yamlString(GUIDELINE_TYPE)}`, `concept: ${yamlString(item.note_path)}`, `from_session: ${yamlString(session.session_id)}`, "---", "",
    `# ${input.title.trim()}`, "", ...lesson.flatMap(t => [t, ""]),
  ].join("\n");
  put(root, plan, path, content, true);
  return plan;
}

// ---------------------------------------------------------------------------------------
// climb and rebuild_climb
// ---------------------------------------------------------------------------------------

export function climbs(notes: VaultNote[], sessions: SessionRecord[], note?: string): ConceptClimb[] | { error: string } {
  const concepts = notes.filter(isConceptNote);
  if (!note) return concepts.map(c => climbOf(c, notes, sessions));
  const c = concepts.find(n => n.path === note || n.title === note || posix.basename(n.path, ".md") === note);
  return c ? [climbOf(c, notes, sessions)] : { error: `${note} is not a concept note` };
}

export function rebuildClimbs(root: string, notes: VaultNote[], sessions: SessionRecord[]): ClimbWritePlan {
  const plan = emptyPlan();
  refreshClimbs(root, notes, sessions, plan, notes.filter(isConceptNote).map(n => n.path));
  return plan;
}

/** A concept note about to be created, with its `climb:` set when the vault already holds evidence for it. */
export function conceptWithClimb(path: string, content: string, notes: VaultNote[], sessions: SessionRecord[]): string {
  const note = noteFromContent(path, content);
  const c = climbOf(note, [...notes, note], sessions);
  return CLIMB_STEPS.some(s => c.steps[s]) ? withClimb(content, c.steps) : content;
}
