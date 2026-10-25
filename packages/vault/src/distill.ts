/**
 * Reading progress on a converted book (ADR-KI-0061). A book moves through stages, each
 * read off the vault rather than stored, except the first:
 *
 *   unread      nothing yet
 *   read        the user has finished reading it, wherever: `read_on` on its index
 *   notes       a note of the user's own (not raw, not a concept) links to the book
 *   distilling  a chapter carries bold, highlight or a summary
 *   distilled   every chapter has a chapter summary
 *   concepts    a concept note quotes or links the book
 *
 * Distilling happens in the chapter notes themselves, in Obsidian: `**bold**` the
 * passages that matter, `==highlight==` the best of those, and close the chapter with a
 * `> [!summary]` callout before its first page. A page may carry its own summary callout
 * under its heading, but only the chapter summary completes a chapter. The conversion
 * escapes a `>` at the start of the author's lines, so a callout is always the user's.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { noteResolver } from "./graph.js";
import { insertKey, declaresKey } from "./identity.js";
import { RAW_TEXT } from "./convert.js";
import type { VaultNote } from "./scan.js";

export const READ_KEY = "read_on";
export const READING_STAGES = ["unread", "read", "notes", "distilling", "distilled", "concepts"] as const;
export type ReadingStage = (typeof READING_STAGES)[number];

const BOLD = /(\*\*|__)(?=\S)(?:(?!\n[ \t]*\n)[\s\S])*?\S\1/;
const HIGHLIGHT = /==(?=\S)(?:(?!\n[ \t]*\n)[\s\S])*?\S==/;
const SUMMARY = /^>[ \t]*\[!summary\][^\n]*(?:\n>[^\n]*)*/gim;
const EMPTY_PAGE = "_(no text on this page)_";

/** Text with the user's summary callouts removed: what the author wrote, plus any marks. */
export function withoutSummaries(text: string): string {
  return text.replace(SUMMARY, "");
}

/** The text of the first summary callout in `text`, or null when there is none or it is empty. */
export function summaryOf(text: string): string | null {
  for (const m of text.matchAll(SUMMARY)) {
    const lines = m[0].split("\n");
    const body = [lines[0].replace(/^>[ \t]*\[!summary\][-+]?/i, ""), ...lines.slice(1).map(l => l.replace(/^>[ \t]?/, ""))].join("\n").trim();
    if (body) return body;
  }
  return null;
}

export type PageMark = "none" | "bold" | "highlight";

export interface PageProgress {
  page: number;
  /** The deepest layer on the page: a highlight implies the page has been bolded. */
  mark: PageMark;
  summary: boolean;
  /** No text came out of the PDF for this page; it needs no distilling. */
  empty: boolean;
}

export type ChapterState = "untouched" | "in_progress" | "complete";

export interface ChapterProgress {
  path: string;
  title: string;
  /** The chapter summary, which completes the chapter. */
  summary: boolean;
  state: ChapterState;
  pages: PageProgress[];
}

/** Split a chapter's body into the part before its first page and its `## Page N` sections. */
function sections(body: string): { preamble: string; pages: { page: number; text: string }[] } {
  const parts = body.split(/^(?=## Page \d+[ \t]*$)/m);
  const pages = parts
    .filter(s => /^## Page \d+/.test(s))
    .map(s => ({ page: Number(s.match(/^## Page (\d+)/)![1]), text: s.replace(/^## Page \d+[ \t]*\n?/, "") }));
  return { preamble: parts.filter(s => !/^## Page \d+/.test(s)).join(""), pages };
}

export function chapterProgress(note: Pick<VaultNote, "path" | "title" | "body">): ChapterProgress {
  const { preamble, pages } = sections(note.body);
  const progress: PageProgress[] = pages.map(({ page, text }) => {
    const author = withoutSummaries(text);
    return {
      page,
      mark: HIGHLIGHT.test(author) ? "highlight" : BOLD.test(author) ? "bold" : "none",
      summary: summaryOf(text) !== null,
      empty: author.trim() === EMPTY_PAGE,
    };
  });
  const summary = summaryOf(preamble) !== null;
  const touched = progress.some(p => p.mark !== "none" || p.summary);
  return { path: note.path, title: note.title, summary, state: summary ? "complete" : touched ? "in_progress" : "untouched", pages: progress };
}

export interface BookProgress {
  /** The book's index, `text.md`. */
  index: string;
  title: string;
  author: string | null;
  stage: ReadingStage;
  /** Each step on its own, so a step skipped on the way is visible. */
  steps: {
    readOn: string | null;
    /** The user's own notes that link to the book or one of its chapters. */
    notes: string[];
    chaptersComplete: number;
    chaptersInProgress: number;
    chapters: number;
    /** Concept notes that quote or link the book. */
    concepts: string[];
  };
  chapters: ChapterProgress[];
}

/** The raw source a raw note belongs to: a chapter or index to its book's index, any other raw note to itself. */
export function sourceOf(note: Pick<VaultNote, "path" | "raw" | "rawRole">): string | null {
  if (!note.raw) return null;
  return note.rawRole === "chapter" ? posix.join(posix.dirname(posix.dirname(note.path)), RAW_TEXT) : note.path;
}

export interface Citations {
  /** The user's own notes (not raw, not concept notes) that link the source or any part of it. */
  notes: string[];
  /** Concept notes that quote or link it. */
  concepts: string[];
}

/** For each raw source (a book's index, or a raw note of its own), the notes made from it. */
export function citations(notes: VaultNote[]): Map<string, Citations> {
  const resolver = noteResolver(notes);
  const byPath = new Map(notes.map(n => [n.path, n]));
  const found = new Map<string, { notes: Set<string>; concepts: Set<string> }>();
  for (const n of notes) {
    if (n.raw) continue;
    for (const l of n.links) {
      const target = resolver.resolve(n.path, l);
      const source = target ? sourceOf(byPath.get(target)!) : null;
      if (!source) continue;
      const entry = found.get(source) ?? { notes: new Set<string>(), concepts: new Set<string>() };
      (n.concept ? entry.concepts : entry.notes).add(n.path);
      found.set(source, entry);
    }
  }
  return new Map([...found].map(([k, v]) => [k, { notes: [...v.notes].sort(), concepts: [...v.concepts].sort() }]));
}

/** Every converted book in the vault, with its stage and each chapter's distilling. */
export function bookProgress(notes: VaultNote[]): BookProgress[] {
  const indexes = notes.filter(n => n.rawRole === "index");
  const bookOf = new Map<string, string>();
  for (const n of notes) if (n.rawRole === "chapter") bookOf.set(n.path, sourceOf(n)!);
  const cited = citations(notes);
  return indexes.map(index => {
    const chapters = notes.filter(n => n.rawRole === "chapter" && bookOf.get(n.path) === index.path).map(chapterProgress);
    const readOn = typeof index.frontmatter[READ_KEY] === "string" ? (index.frontmatter[READ_KEY] as string) : null;
    const { notes: own, concepts } = cited.get(index.path) ?? { notes: [], concepts: [] };
    const complete = chapters.filter(c => c.state === "complete").length;
    const inProgress = chapters.filter(c => c.state === "in_progress").length;
    const stage: ReadingStage =
      concepts.length ? "concepts"
      : chapters.length && complete === chapters.length ? "distilled"
      : complete + inProgress ? "distilling"
      : own.length ? "notes"
      : readOn ? "read"
      : "unread";
    return {
      index: index.path,
      title: index.title,
      author: typeof index.frontmatter.author === "string" ? index.frontmatter.author : null,
      stage,
      steps: { readOn, notes: own, chaptersComplete: complete, chaptersInProgress: inProgress, chapters: chapters.length, concepts },
      chapters,
    };
  });
}

export interface WritePlan {
  path: string | null;
  errors: string[];
  /** What changes, for the preview. */
  change: string | null;
  content: string | null;
  /** The note as the plan read it; the write is refused if it changed since. */
  before: string | null;
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Mark a book as read: `read_on` on its index, the only edit. */
export async function planMarkRead(root: string, notes: VaultNote[], book: string, date: string): Promise<WritePlan> {
  const fail = (e: string): WritePlan => ({ path: null, errors: [e], change: null, content: null, before: null });
  const index = notes.find(n => n.rawRole === "index" && (n.path === book || posix.dirname(n.path) === book.replace(/\/+$/, "")));
  if (!index) return fail(`no converted book at ${book}; give its text.md or its work folder`);
  if (!isDate(date)) return fail(`date ${date} is not YYYY-MM-DD`);
  const content = await readFile(join(root, index.path), "utf-8");
  if (declaresKey(content, READ_KEY)) return fail(`${index.path} is already marked read on ${String(index.frontmatter[READ_KEY])}`);
  return { path: index.path, errors: [], change: `add ${READ_KEY}: "${date}" to ${index.path}`, content: insertKey(content, READ_KEY, date), before: content };
}

function callout(text: string): string {
  return ["> [!summary]", ...text.trim().split(/\r?\n/).map(l => (l.trim() ? `> ${l}` : ">"))].join("\n");
}

/**
 * Add a summary callout to a chapter: before its first page for the chapter summary, or
 * under `## Page N` for a page summary. An existing summary is never replaced; edit it in
 * Obsidian instead.
 */
export async function planSummary(root: string, notes: VaultNote[], path: string, text: string, page?: number): Promise<WritePlan> {
  const fail = (e: string): WritePlan => ({ path: null, errors: [e], change: null, content: null, before: null });
  const note = notes.find(n => n.path === path);
  if (!note || note.rawRole !== "chapter") return fail(`${path} is not a chapter of a converted book`);
  if (!text.trim()) return fail("the summary is empty");
  const content = await readFile(join(root, path), "utf-8");
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const block = callout(text).split("\n").join(eol);
  const progress = chapterProgress(note);
  if (page === undefined) {
    if (progress.summary) return fail(`${path} already has a chapter summary; edit it in Obsidian`);
    const first = content.search(/^## Page \d+[ \t]*\r?$/m);
    if (first < 0) return fail(`${path} has no page headings`);
    return { path, errors: [], change: `add the chapter summary to ${path}`, content: `${content.slice(0, first)}${block}${eol}${eol}${content.slice(first)}`, before: content };
  }
  const at = progress.pages.find(p => p.page === page);
  if (!at) return fail(`${path} has no page ${page}`);
  if (at.summary) return fail(`page ${page} of ${path} already has a summary; edit it in Obsidian`);
  const heading = new RegExp(`^## Page ${page}[ \\t]*\\r?$`, "m").exec(content)!;
  const end = heading.index + heading[0].length;
  return { path, errors: [], change: `add a summary to page ${page} of ${path}`, content: `${content.slice(0, end)}${eol}${eol}${block}${content.slice(end)}`, before: content };
}

/** Write a clean plan, refusing when the note changed since the preview. */
export async function executeWrite(root: string, plan: WritePlan): Promise<void> {
  if (plan.errors.length || !plan.path || plan.content === null) throw new Error("refusing to write a plan with errors");
  const abs = join(root, plan.path);
  if ((await readFile(abs, "utf-8")) !== plan.before) throw new Error(`${plan.path} changed since the preview; run it again`);
  await writeFile(abs, plan.content);
}

/* ── Editing from the graph view (ADR-KI-0061 Decision 10) ─────────────────── */

export interface Section {
  /** The page's text: from after its heading's blank line to before trailing whitespace. */
  text: string;
  start: number;
  end: number;
}

/** Where page N's text sits in a chapter note's content; null when the note has no such page. */
export function pageSection(content: string, page: number): Section | null {
  const heading = new RegExp(`^## Page ${page}[ \\t]*\\r?$`, "m").exec(content);
  if (!heading) return null;
  const from = heading.index + heading[0].length;
  const next = content.slice(from).search(/^## Page \d+[ \t]*\r?$/m);
  const stop = next < 0 ? content.length : from + next;
  const raw = content.slice(from, stop);
  const lead = (raw.match(/^(?:\r?\n)*/) as RegExpMatchArray)[0].length;
  const text = raw.slice(lead).replace(/\s+$/, "");
  return { text, start: from + lead, end: from + lead + text.length };
}

export type MarkOp = "bold" | "highlight" | "clear";

interface MarkChar { ch: string; src: number; b: boolean; h: boolean }
type MarkLine = { verbatim: string } | { prefix: string; chars: MarkChar[] };

const MARKER = /^(\*\*|__|==)/;

/**
 * A page's text as lines of characters, each knowing whether it is bold or highlighted
 * and where it sits in the text. Summary callouts stay verbatim; a leading `\` (the
 * conversion's escape) is kept apart. Bold and highlight carry across lines within a
 * paragraph, as Obsidian renders them.
 */
function parseMarks(text: string): MarkLine[] {
  const out: MarkLine[] = [];
  let b = false, h = false, at = 0;
  for (const line of text.split("\n")) {
    const start = at;
    at += line.length + 1;
    if (/^>/.test(line) || !line.trim()) { out.push({ verbatim: line }); b = h = false; continue; }
    const prefix = line.startsWith("\\") ? "\\" : "";
    const chars: MarkChar[] = [];
    for (let i = prefix.length; i < line.length;) {
      const m = MARKER.exec(line.slice(i));
      if (m) { if (m[1] === "==") h = !h; else b = !b; i += 2; continue; }
      chars.push({ ch: line[i], src: start + i, b, h });
      i++;
    }
    out.push({ prefix, chars });
  }
  return out;
}

/** Spans [from, to) of chars where `on` holds, cut at `cut` boundaries, trimmed of spaces. */
function runs(chars: MarkChar[], on: (c: MarkChar) => boolean, cut: (i: number) => boolean = () => false): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  while (i < chars.length) {
    if (!on(chars[i])) { i++; continue; }
    let j = i + 1;
    while (j < chars.length && on(chars[j]) && !cut(j)) j++;
    let a = i, z = j;
    while (a < z && /\s/.test(chars[a].ch)) a++;
    while (z > a && /\s/.test(chars[z - 1].ch)) z--;
    if (z > a) out.push([a, z]);
    i = j;
  }
  return out;
}

/** One line back to markdown: bold runs outside, highlight runs nested inside them. */
function emitLine(prefix: string, chars: MarkChar[]): string {
  const bold = runs(chars, c => c.b);
  const boldStart = new Set(bold.map(r => r[0])), boldEnd = new Set(bold.map(r => r[1]));
  const high = runs(chars, c => c.h, i => boldStart.has(i) || boldEnd.has(i));
  const open = new Map<number, string>(), close = new Map<number, string>();
  for (const [a, z] of bold) { open.set(a, "**"); close.set(z, "**"); }
  for (const [a, z] of high) { open.set(a, (open.get(a) ?? "") + "=="); close.set(z, "==" + (close.get(z) ?? "")); }
  let s = prefix;
  for (let i = 0; i <= chars.length; i++) {
    s += close.get(i) ?? "";
    if (i < chars.length) s += (open.get(i) ?? "") + chars[i].ch;
  }
  return s;
}

/**
 * Bold, highlight or clear the characters of a page's text whose positions fall in
 * [start, end), and write the result back as Obsidian markdown. Marks stay balanced and
 * never start or end on a space; a highlight inside bold nests as `**…==…==…**`.
 */
export function applyMark(text: string, start: number, end: number, op: MarkOp): string {
  const lines = parseMarks(text);
  for (const l of lines) {
    if ("verbatim" in l) continue;
    for (const c of l.chars) {
      if (c.src < start || c.src >= end) continue;
      if (op === "bold") c.b = true;
      else if (op === "highlight") c.h = true;
      else c.b = c.h = false;
    }
  }
  return lines.map(l => ("verbatim" in l ? l.verbatim : emitLine(l.prefix, l.chars))).join("\n");
}

const SUMMARY_ONE = /^>[ \t]*\[!summary\][^\n]*(?:\n>[^\n]*)*/im;

/** Set, replace or (with empty text) remove the summary callout at the top of a region of text. */
function withSummary(region: string, summary: string): string {
  const text = summary.trim();
  const m = SUMMARY_ONE.exec(region);
  if (m) {
    if (!text) return (region.slice(0, m.index) + region.slice(m.index + m[0].length).replace(/^\n+/, "")).replace(/\n{3,}/g, "\n\n");
    return region.slice(0, m.index) + callout(text) + region.slice(m.index + m[0].length);
  }
  return text ? `${callout(text)}\n\n${region}` : region;
}

export type EditResult = { ok: true; text: string; content: string } | { ok: false; status: 400 | 404 | 409; error: string; text?: string };

/**
 * Edit page N of a chapter note's content. `base` is the page text the editor showed; if
 * the page changed since (in Obsidian, say), the edit is refused with the current text.
 */
export function editPageContent(content: string, page: number, base: string | undefined, edit: (text: string) => string): EditResult {
  const section = pageSection(content, page);
  if (!section) return { ok: false, status: 404, error: `no page ${page}` };
  if (base !== undefined && base !== section.text) return { ok: false, status: 409, error: "the page changed since it was shown; showing it again", text: section.text };
  const text = edit(section.text);
  return { ok: true, text, content: content.slice(0, section.start) + text + content.slice(section.end) };
}

/** A chapter's summary text, or null. */
export function chapterSummaryOf(content: string): string | null {
  const first = content.search(/^## Page \d+[ \t]*\r?$/m);
  return summaryOf(first < 0 ? content : content.slice(0, first));
}

/** Set, replace or remove a chapter's summary: the callout before its first page. */
export function setChapterSummary(content: string, summary: string): EditResult {
  const first = content.search(/^## Page \d+[ \t]*\r?$/m);
  if (first < 0) return { ok: false, status: 404, error: "the note has no page headings" };
  const fm = /^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/.exec(content);
  const bodyStart = fm ? fm[0].length : 0;
  const head = content.slice(bodyStart, first);
  const m = SUMMARY_ONE.exec(head);
  const text = summary.trim();
  let next: string;
  if (m) next = withSummary(head, text);
  else if (text) next = `${head.replace(/\n*$/, "\n\n")}${callout(text)}\n\n`;
  else return { ok: false, status: 400, error: "there is no chapter summary to remove" };
  return { ok: true, text: text, content: content.slice(0, bodyStart) + next + content.slice(first) };
}

/** Set, replace or remove page N's summary. */
export function setPageSummary(content: string, page: number, summary: string, base?: string): EditResult {
  return editPageContent(content, page, base, text => withSummary(text, summary));
}
