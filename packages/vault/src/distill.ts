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

/** Every converted book in the vault, with its stage and each chapter's distilling. */
export function bookProgress(notes: VaultNote[]): BookProgress[] {
  const resolver = noteResolver(notes);
  const indexes = notes.filter(n => n.rawRole === "index");
  const bookOf = new Map<string, string>();
  for (const n of notes) {
    if (n.rawRole === "index") bookOf.set(n.path, n.path);
    if (n.rawRole === "chapter") bookOf.set(n.path, posix.join(posix.dirname(posix.dirname(n.path)), RAW_TEXT));
  }
  const citing = new Map<string, { notes: Set<string>; concepts: Set<string> }>(indexes.map(i => [i.path, { notes: new Set(), concepts: new Set() }]));
  for (const n of notes) {
    if (n.raw) continue;
    for (const l of n.links) {
      const target = resolver.resolve(n.path, l);
      const entry = target ? citing.get(bookOf.get(target) ?? "") : undefined;
      if (entry) (n.concept ? entry.concepts : entry.notes).add(n.path);
    }
  }
  return indexes.map(index => {
    const chapters = notes.filter(n => n.rawRole === "chapter" && bookOf.get(n.path) === index.path).map(chapterProgress);
    const readOn = typeof index.frontmatter[READ_KEY] === "string" ? (index.frontmatter[READ_KEY] as string) : null;
    const { notes: own, concepts } = citing.get(index.path)!;
    const complete = chapters.filter(c => c.state === "complete").length;
    const inProgress = chapters.filter(c => c.state === "in_progress").length;
    const stage: ReadingStage =
      concepts.size ? "concepts"
      : chapters.length && complete === chapters.length ? "distilled"
      : complete + inProgress ? "distilling"
      : own.size ? "notes"
      : readOn ? "read"
      : "unread";
    return {
      index: index.path,
      title: index.title,
      author: typeof index.frontmatter.author === "string" ? index.frontmatter.author : null,
      stage,
      steps: { readOn, notes: [...own].sort(), chaptersComplete: complete, chaptersInProgress: inProgress, chapters: chapters.length, concepts: [...concepts].sort() },
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
