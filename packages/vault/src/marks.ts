/**
 * The user's marks in a book's chapters as quotable passages (ADR-KI-0061 Decision 11).
 * A mark is wherever the user's bold or highlight falls, which may be a few words or a
 * run cut at the PDF's line ends; a passage is the whole sentence or sentences around it,
 * as the author wrote them, so a concept note quotes something that reads on its own.
 * Sentences joined by one unbroken mark make one passage. Every passage is checked with
 * the same matcher `create_concept` uses before it is returned.
 */

import { posix } from "node:path";
import { RAW_TEXT } from "./convert.js";
import { parseMarks, sourceOf, withoutSummaries, type MarkChar } from "./distill.js";
import { locateQuote } from "./concept.js";
import type { VaultNote } from "./scan.js";

/** A passage longer than this is cut down to the marked run itself. */
export const MAX_PASSAGE_CHARS = 600;

export interface MarkedPassage {
  /** The chapter note, for `create_concept`'s `note`. */
  note: string;
  chapter: string;
  page: number;
  /** The whole sentence(s), verbatim; passes `create_concept` with `pages` as given. */
  quote: string;
  /** The deepest mark inside it: a highlight is the best of the bold. */
  depth: "bold" | "highlight";
  /** What the user marked inside the quote, in order. */
  marked: { mark: "bold" | "highlight"; text: string }[];
}

type Ch = Pick<MarkChar, "ch" | "b" | "h">;

/** The text as a reader sees it: a word split at a line end rejoined, whitespace collapsed. */
function readable(chars: Ch[]): string {
  return chars.map(c => c.ch).join("")
    .replace(/(\p{L})-\s*\n\s*(\p{Ll})/gu, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Runs of one mark in a stretch of text, joined across whitespace, each as readable text. */
function runsOf(chars: Ch[], on: (c: Ch) => boolean, mark: "bold" | "highlight"): MarkedPassage["marked"] {
  const out: MarkedPassage["marked"] = [];
  let i = 0;
  while (i < chars.length) {
    if (!on(chars[i])) { i++; continue; }
    let j = i + 1, last = i;
    while (j < chars.length && (on(chars[j]) || /\s/.test(chars[j].ch))) { if (on(chars[j])) last = j; j++; }
    const text = readable(chars.slice(i, last + 1));
    if (text) out.push({ mark, text });
    i = last + 1;
  }
  return out;
}

const SENTENCE_END = /[.!?]/;
const CLOSER = /["'”’)\]]/;

/**
 * One page's paragraphs as sentences of marked characters. The PDF gives no blank lines
 * between paragraphs, so a line well short of the page's longest also ends a sentence,
 * as it does in the graph view: it is the end of a paragraph or a heading.
 */
function sentences(text: string): Ch[][] {
  const lines = parseMarks(withoutSummaries(text));
  const plain = (l: { chars: MarkChar[] }) => l.chars.map(c => c.ch).join("").trim();
  const full = Math.max(0, ...lines.map(l => ("chars" in l ? plain(l).length : 0)));
  const out: Ch[][] = [];
  let cur: Ch[] = [];
  const end = () => { if (cur.some(c => /\S/.test(c.ch))) out.push(cur); cur = []; };
  for (const l of lines) {
    if ("verbatim" in l) { end(); continue; }
    for (let i = 0; i < l.chars.length; i++) {
      const c = l.chars[i];
      cur.push(c);
      if (!SENTENCE_END.test(c.ch)) continue;
      let j = i + 1;
      while (j < l.chars.length && CLOSER.test(l.chars[j].ch)) cur.push(l.chars[j++]);
      if (j === l.chars.length || /\s/.test(l.chars[j].ch)) end();
      i = j - 1;
    }
    if (plain(l).length < full * 0.7) end();
    else if (cur.length) cur.push({ ch: "\n", b: false, h: false });
  }
  end();
  return out;
}

const marked = (c: Ch) => c.b || c.h;
const edge = (s: Ch[], from: "start" | "end") => {
  const xs = s.filter(c => /\S/.test(c.ch));
  return from === "start" ? xs[0] : xs[xs.length - 1];
};

/** One chapter's marks as passages, page by page. */
export function chapterPassages(note: VaultNote): MarkedPassage[] {
  const out: MarkedPassage[] = [];
  for (const part of note.body.split(/^(?=## Page \d+[ \t]*$)/m)) {
    const m = /^## Page (\d+)[ \t]*\n?/.exec(part);
    if (!m) continue;
    const page = Number(m[1]);
    const ss = sentences(part.slice(m[0].length));
    for (let i = 0; i < ss.length; i++) {
      if (!ss[i].some(marked)) continue;
      // One unbroken mark across a sentence end keeps the next sentence in the passage.
      let j = i;
      while (j + 1 < ss.length && marked(edge(ss[j], "end")) && marked(edge(ss[j + 1], "start"))) j++;
      const group = ss.slice(i, j + 1).flatMap((s, k) => (k ? [{ ch: " ", b: false, h: false }, ...s] : s));
      i = j;
      const runs = [...runsOf(group, c => c.b, "bold"), ...runsOf(group, c => c.h, "highlight")];
      let quote = readable(group);
      if (quote.length > MAX_PASSAGE_CHARS) {
        const first = group.findIndex(marked), last = group.length - 1 - [...group].reverse().findIndex(marked);
        quote = readable(group.slice(first, last + 1));
      }
      if (!locateQuote(note, quote, String(page)).found) continue;
      out.push({
        note: note.path,
        chapter: note.title,
        page,
        quote,
        depth: group.some(c => c.h) ? "highlight" : "bold",
        marked: runs.sort((a, b) => quote.indexOf(a.text) - quote.indexOf(b.text)),
      });
    }
  }
  return out;
}

/**
 * Passages for a chapter, or for every chapter of a book given its `text.md` or work
 * folder; null when the path is neither.
 */
export function markedPassages(notes: VaultNote[], target: string): MarkedPassage[] | null {
  const want = target.replace(/\/+$/, "");
  const chapter = notes.find(n => n.path === want && n.rawRole === "chapter");
  if (chapter) return chapterPassages(chapter);
  const index = want.endsWith(`/${RAW_TEXT}`) ? want : posix.join(want, RAW_TEXT);
  if (!notes.some(n => n.path === index && n.rawRole === "index")) return null;
  return notes
    .filter(n => n.rawRole === "chapter" && sourceOf(n) === index)
    .sort((a, b) => a.path.localeCompare(b.path))
    .flatMap(chapterPassages);
}
