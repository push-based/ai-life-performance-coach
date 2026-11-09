/**
 * The climb (ADR-KI-0068): seven learning steps per concept note, from reading to
 * teaching. Each step is worked out from evidence the vault holds (reading notes and a
 * chapter summary, a structure note, session files), and the result is kept as a
 * `climb:` summary in the concept note's frontmatter. The summary is only ever written
 * from the evidence, so a disagreement is fixed by rebuilding it, never by hand.
 */

import { posix } from "node:path";
import { yamlString } from "@docs-mcp/core/kernel/md/yaml.js";
import { fold, conceptOf } from "./concept.js";
import { chapterSummaryOf, withoutSummaries } from "./distill.js";
import type { SessionRecord, SessionItem, SessionKind } from "./sessions.js";
import type { VaultNote } from "./scan.js";

export const CLIMB_STEPS = ["read", "group", "generate", "retrieve", "elaborate", "space", "teach"] as const;
export type ClimbStep = (typeof CLIMB_STEPS)[number];

export const READING_NOTES_TYPE = "reading-notes";
export const STRUCTURE_TYPE = "structure";
export const GUIDELINE_TYPE = "guideline";

/** A run of this many words shared with the source makes a note a quote (ADR-KI-0068 Decision 3). */
export const VERBATIM_RUN_WORDS = 6;
/** A Generate attempt shorter than this, and not marked /idk, is not an attempt. */
export const MIN_ATTEMPT_WORDS = 10;
/** A spaced review comes at least this many days after the previous attempt. */
export const SPACING_DAYS = 1;

export interface StepEvidence {
  date: string;
  /** A vault path or a session id that proves the step. */
  evidence: string;
}

export type ClimbSteps = Record<ClimbStep, StepEvidence | null>;

export interface ConceptClimb {
  path: string;
  title: string;
  steps: ClimbSteps;
  /** The `climb:` block as the note holds it now; null when it has none. */
  stored: Record<ClimbStep, string | null> | null;
  /** True when the stored block holds exactly the dates the evidence gives; no block holds no dates. */
  current: boolean;
  next: ClimbStep | null;
  /** Steps left open below a step that is done: shown as skipped, never blocked. */
  skipped: ClimbStep[];
  /** A passed review at least a day after the previous attempt, which Teach needs. */
  spacedPass: StepEvidence | null;
  teach: { ok: boolean; reason?: string };
}

const words = (text: string) => fold(text).split(/[^\p{L}\p{N}']+/u).filter(Boolean);

/** True when `text` shares a run of `n` or more words with `source`, both folded. */
export function sharesRun(text: string, source: string, n = VERBATIM_RUN_WORDS): boolean {
  const a = words(text);
  if (a.length < n) return false;
  const src = ` ${words(source).join(" ")} `;
  for (let i = 0; i + n <= a.length; i++) if (src.includes(` ${a.slice(i, i + n).join(" ")} `)) return true;
  return false;
}

export const wordCount = (text: string) => words(text).length;

export const dayDiff = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The book a raw note belongs to: a chapter's `book`, else its index's title, else its work folder. */
export function bookOf(raw: VaultNote, notes: VaultNote[]): string | null {
  if (typeof raw.frontmatter.book === "string" && raw.frontmatter.book.trim()) return raw.frontmatter.book.trim();
  if (raw.rawRole === "index") return raw.title;
  const index = notes.find(n => n.rawRole === "index" && n.rawWork && n.rawWork === raw.rawWork && n.rawAuthor === raw.rawAuthor);
  return index?.title ?? raw.rawWork ?? null;
}

/** The raw chapters a concept note quotes, in passage order. */
export function chaptersOf(concept: VaultNote, notes: VaultNote[]): VaultNote[] {
  const c = conceptOf(concept);
  if (!c) return [];
  const byPath = new Map(notes.map(n => [n.path, n]));
  const out: VaultNote[] = [];
  for (const p of c.fields.passages) {
    const raw = byPath.get(p.note);
    if (raw?.raw && !out.includes(raw)) out.push(raw);
  }
  return out;
}

/** The book a concept note belongs to: that of its first quoted raw note. */
export function conceptBook(concept: VaultNote, notes: VaultNote[]): string | null {
  const first = chaptersOf(concept, notes)[0];
  return first ? bookOf(first, notes) : null;
}

export const isConceptNote = (n: VaultNote) => n.concept && n.bucket === "resources" && !n.raw;

// ---------------------------------------------------------------------------------------
// Reading notes (step 1)
// ---------------------------------------------------------------------------------------

export interface ReadingEntry {
  date: string;
  text: string;
  page: number | null;
  /** True when the entry shares a run of words with the section it was written on. */
  quote: boolean;
}

const ENTRY = /^- (\d{4}-\d{2}-\d{2}) · (.+?)\s*$/;
const ENTRY_LINK = /\s+—\s+\[\[[^\]]*\]\]$/;
const QUOTE_MARK = /\s+\(quote\)$/;

/** The text of a chapter's page, or of the whole chapter, as a reading note is checked against. */
export function sectionText(chapter: VaultNote, page: number | null): string {
  const body = withoutSummaries(chapter.body);
  if (page === null) return body;
  const m = body.split(/^(?=## Page \d+\s*$)/m).find(s => s.startsWith(`## Page ${page}`));
  return m ?? "";
}

/** A reading-notes file's entries, each checked again against its chapter. */
export function readingEntries(file: VaultNote, chapter: VaultNote | undefined): ReadingEntry[] {
  const out: ReadingEntry[] = [];
  let page: number | null = null;
  for (const line of file.body.split(/\r?\n/)) {
    const h = line.match(/^## Page (\d+)\s*$/);
    if (h) { page = Number(h[1]); continue; }
    if (/^## /.test(line)) { page = null; continue; }
    const m = line.match(ENTRY);
    if (!m) continue;
    const text = m[2].replace(ENTRY_LINK, "").replace(QUOTE_MARK, "").replace(/^“|”$/g, "").trim();
    const against = chapter ? sectionText(chapter, page) || sectionText(chapter, null) : "";
    out.push({ date: m[1], text, page, quote: chapter ? sharesRun(text, against) : false });
  }
  return out;
}

const chapterOfFile = (n: VaultNote) => (typeof n.frontmatter.chapter === "string" ? n.frontmatter.chapter : null);

/** Read is done for a chapter with an own-words reading note and an own-words chapter summary. */
export function readEvidence(chapter: VaultNote, notes: VaultNote[]): StepEvidence | null {
  const summary = chapterSummaryOf(chapter.body);
  if (!summary || sharesRun(summary, withoutSummaries(chapter.body))) return null;
  let best: StepEvidence | null = null;
  for (const f of notes) {
    if (f.frontmatter.type !== READING_NOTES_TYPE || chapterOfFile(f) !== chapter.path) continue;
    for (const e of readingEntries(f, chapter)) {
      if (e.quote) continue;
      if (!best || e.date < best.date) best = { date: e.date, evidence: f.path };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------------------
// Structure notes (step 2)
// ---------------------------------------------------------------------------------------

export interface StructureGroup {
  name: string;
  /** Vault-relative paths of the concept notes in the group. */
  concepts: string[];
}

export interface Structure {
  path: string;
  book: string;
  date: string;
  groups: StructureGroup[];
  buildsOn: { from: string; to: string }[];
}

/** A structure note's record, read from its frontmatter; null for any other note. */
export function structureOf(n: VaultNote): Structure | null {
  const fm = n.frontmatter;
  if (fm.type !== STRUCTURE_TYPE || typeof fm.book !== "string") return null;
  const groups: StructureGroup[] = [];
  for (const g of Array.isArray(fm.groups) ? fm.groups : []) {
    const r = g as Record<string, unknown>;
    if (typeof r?.name !== "string") continue;
    groups.push({ name: r.name, concepts: Array.isArray(r.concepts) ? r.concepts.filter((c): c is string => typeof c === "string") : [] });
  }
  const buildsOn: Structure["buildsOn"] = [];
  for (const e of Array.isArray(fm.builds_on) ? fm.builds_on : []) {
    const r = e as Record<string, unknown>;
    if (typeof r?.from === "string" && typeof r?.to === "string") buildsOn.push({ from: r.from, to: r.to });
  }
  return { path: n.path, book: fm.book, date: typeof fm.date === "string" ? fm.date : "", groups, buildsOn };
}

/** The structure rules (ADR-KI-0068 Decision 4): what is wrong with a set of groups and edges. */
export function structureErrors(groups: StructureGroup[], buildsOn: { from: string; to: string }[], bookConcepts: string[]): string[] {
  const errors: string[] = [];
  if (groups.length < 2 || groups.length > 7) errors.push(`a structure has 2 to 7 groups, got ${groups.length}`);
  const names = new Set<string>();
  const placed = new Map<string, string>();
  for (const g of groups) {
    const name = g.name?.trim();
    if (!name) { errors.push("every group needs a name"); continue; }
    if (names.has(name.toLowerCase())) errors.push(`group "${name}" is named twice`);
    names.add(name.toLowerCase());
    if (!g.concepts.length) errors.push(`group "${name}" is empty`);
    for (const c of g.concepts) {
      const was = placed.get(c);
      if (was) errors.push(`${c} is in both "${was}" and "${name}"; every concept is in exactly one group`);
      else placed.set(c, name);
      if (!bookConcepts.includes(c)) errors.push(`${c} is not a concept note of this book`);
    }
  }
  for (const c of bookConcepts) if (!placed.has(c)) errors.push(`${c} is in no group; every concept of the book is in exactly one group`);
  const edges = new Map<string, string[]>();
  for (const e of buildsOn) {
    const [from, to] = [e.from?.trim().toLowerCase(), e.to?.trim().toLowerCase()];
    if (!names.has(from) || !names.has(to)) { errors.push(`builds_on ${e.from} → ${e.to} names a group that does not exist`); continue; }
    if (from === to) { errors.push(`group "${e.from}" cannot build on itself`); continue; }
    edges.set(from, [...(edges.get(from) ?? []), to]);
  }
  const cycle = findCycle(edges);
  if (cycle) errors.push(`"builds on" is a layering, and these groups build on each other in a cycle: ${cycle.join(" → ")}`);
  return errors;
}

function findCycle(edges: Map<string, string[]>): string[] | null {
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (n: string): string[] | null => {
    state.set(n, 1);
    stack.push(n);
    for (const m of edges.get(n) ?? []) {
      if (state.get(m) === 1) return [...stack.slice(stack.indexOf(m)), m];
      if (!state.has(m)) { const c = visit(m); if (c) return c; }
    }
    stack.pop();
    state.set(n, 2);
    return null;
  };
  for (const n of edges.keys()) if (!state.has(n)) { const c = visit(n); if (c) return c; }
  return null;
}

// ---------------------------------------------------------------------------------------
// Sessions (steps 3 to 7)
// ---------------------------------------------------------------------------------------

interface Attempt { kind: SessionKind; date: string; session: string; item: SessionItem }

function attemptsOf(concept: VaultNote, chapters: string[], sessions: SessionRecord[]): Attempt[] {
  const out: Attempt[] = [];
  for (const s of sessions) {
    for (const item of s.items) {
      const mine = concept.coachId !== null && item.coach_id === concept.coachId;
      const onChapter = s.kind === "generate" && item.coach_id === null && chapters.includes(item.note_path);
      if (mine || onChapter) out.push({ kind: s.kind, date: s.date, session: s.session_id, item });
    }
  }
  return out;
}

/** A Generate attempt counts when it was saved before the reveal and every wrong mark is corrected. */
export function generateCounts(item: SessionItem): boolean {
  const g = item.generate;
  if (!g) return false;
  if (!(Date.parse(g.attempted_at) < Date.parse(g.revealed_at))) return false;
  return g.marks.every(m => m.mark !== "wrong" || !!m.correction?.trim());
}

/** Reviews of the note at least a day after the attempt before them; the first, and the first passed. */
export function spacedReviews(attempts: Attempt[]): { any: StepEvidence | null; passed: StepEvidence | null } {
  let any: StepEvidence | null = null;
  let passed: StepEvidence | null = null;
  let previous: string | null = null;
  for (const a of attempts) {
    if (a.kind === "spar" && previous !== null && dayDiff(previous, a.date) >= SPACING_DAYS) {
      any ??= { date: a.date, evidence: a.session };
      if (a.item.verdict === "pass") passed ??= { date: a.date, evidence: a.session };
    }
    previous = a.date;
  }
  return { any, passed };
}

/** Every step's evidence for one concept note, from the vault as it is and the sessions given. */
export function climbOf(concept: VaultNote, notes: VaultNote[], sessions: SessionRecord[]): ConceptClimb {
  const chapters = chaptersOf(concept, notes);
  const attempts = attemptsOf(concept, chapters.map(c => c.path), sessions);
  const first = (pred: (a: Attempt) => boolean): StepEvidence | null => {
    const a = attempts.find(pred);
    return a ? { date: a.date, evidence: a.session } : null;
  };
  let read: StepEvidence | null = null;
  for (const ch of chapters) {
    const e = readEvidence(ch, notes);
    if (e && (!read || e.date < read.date)) read = e;
  }
  let group: StepEvidence | null = null;
  for (const n of notes) {
    const s = structureOf(n);
    if (s && s.groups.some(g => g.concepts.includes(concept.path)) && DATE.test(s.date)) group = { date: s.date, evidence: s.path };
  }
  const space = spacedReviews(attempts);
  const steps: ClimbSteps = {
    read,
    group,
    generate: first(a => a.kind === "generate" && generateCounts(a.item)),
    retrieve: first(a => a.kind === "spar"),
    elaborate: first(a => a.kind === "elaborate"),
    space: space.any,
    teach: first(a => a.kind === "teach" && a.item.verdict === "pass"),
  };
  const stored = storedClimb(concept);
  const current = CLIMB_STEPS.every(s => (stored?.[s] ?? null) === (steps[s]?.date ?? null));
  const done = CLIMB_STEPS.filter(s => steps[s]);
  const highest = done.length ? Math.max(...done.map(s => CLIMB_STEPS.indexOf(s))) : -1;
  return {
    path: concept.path,
    title: concept.title,
    steps,
    stored,
    current,
    next: CLIMB_STEPS.find(s => !steps[s]) ?? null,
    skipped: CLIMB_STEPS.filter((s, i) => i < highest && !steps[s]),
    spacedPass: space.passed,
    teach: teachGate(space.passed),
  };
}

export function teachGate(spacedPass: StepEvidence | null): { ok: boolean; reason?: string } {
  return spacedPass ? { ok: true } : { ok: false, reason: "Teach needs a passed spaced review: a spar passed at least a day after the attempt before it. Spar the note again after a gap first." };
}

/** The `climb:` block of a note's frontmatter; null when it has none. */
export function storedClimb(n: Pick<VaultNote, "frontmatter">): Record<ClimbStep, string | null> | null {
  const c = n.frontmatter.climb;
  if (!c || typeof c !== "object" || Array.isArray(c)) return null;
  const r = c as Record<string, unknown>;
  return Object.fromEntries(CLIMB_STEPS.map(s => [s, typeof r[s] === "string" && DATE.test(r[s] as string) ? (r[s] as string) : null])) as Record<ClimbStep, string | null>;
}

export function climbLines(steps: ClimbSteps): string[] {
  return ["climb:", ...CLIMB_STEPS.map(s => `  ${s}: ${steps[s] ? yamlString(steps[s]!.date) : "null"}`)];
}

// ---------------------------------------------------------------------------------------
// Frontmatter keys written line by line
// ---------------------------------------------------------------------------------------

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n?---(?:\r?\n|$)/;

/**
 * Set one top-level frontmatter key to the given lines (the key's own line and any
 * indented lines under it), or remove it with null. Every other line stays as it is.
 */
export function setFrontmatterLines(content: string, key: string, lines: string[] | null): string {
  const nl = content.includes("\r\n") ? "\r\n" : "\n";
  const m = content.match(FRONTMATTER);
  let fm = m && m[1] !== "" ? m[1].split(/\r?\n/) : [];
  const i = fm.findIndex(l => new RegExp(`^${key}\\s*:`).test(l));
  let end = i + 1;
  if (i >= 0) while (end < fm.length && /^(\s+\S|-\s|-$)/.test(fm[end])) end++;
  if (i >= 0) fm.splice(i, end - i, ...(lines ?? []));
  else if (lines) fm = [...fm, ...lines];
  const block = fm.length ? `---${nl}${fm.join(nl)}${nl}---${nl}` : "";
  return m ? block + content.slice(m[0].length) : block + content;
}

/** The content with its `climb:` block set to the steps, or unchanged when it already holds them. */
export function withClimb(content: string, steps: ClimbSteps): string {
  return setFrontmatterLines(content, "climb", climbLines(steps));
}

// ---------------------------------------------------------------------------------------
// Interleaving the due queue (step 6)
// ---------------------------------------------------------------------------------------

/**
 * Reorder so no two neighbours share a key whenever another item allows it, keeping the
 * given order otherwise: each place takes the earliest remaining item whose key differs
 * from the one before.
 */
export function interleave<T>(items: T[], key: (t: T) => string): T[] {
  const left = [...items];
  const out: T[] = [];
  while (left.length) {
    const prev = out.length ? key(out[out.length - 1]) : null;
    const i = left.findIndex(t => key(t) !== prev);
    out.push(...left.splice(i < 0 ? 0 : i, 1));
  }
  return out;
}

export const groupOf = (n: VaultNote): string | null => (typeof n.frontmatter.group === "string" && n.frontmatter.group.trim() ? n.frontmatter.group.trim() : null);

/** Where a concept is kept for interleaving: its group within its book, else its book, else its folder. */
export function queueKey(n: VaultNote, notes: VaultNote[]): string {
  const book = conceptBook(n, notes);
  const group = groupOf(n);
  if (group) return `group:${book ?? ""}:${group}`;
  if (book) return `book:${book}`;
  return `folder:${posix.dirname(n.path)}`;
}
