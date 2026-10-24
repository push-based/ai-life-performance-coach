/**
 * Raw resources (ADR-KI-0059): list the files under `3.Resources/0.Raw/`, and convert a
 * PDF once, offline (pdf.js), into notes in its `<kind>/<author>/<work>/` folder:
 *
 *   e-book.pdf                 the original, never changed
 *   text.md                    the book's index: one link per chapter
 *   chapters/NN <title>.md     the text, one note per chapter, a long chapter in parts
 *
 * A book is far larger than a local model's context, so the chapter is the unit an agent
 * reads when it checks a concept note against the book (ADR-KI-0060); none of these notes
 * is sparred. Chapters come from the PDF's outline; a book without one is cut into blocks
 * of pages. Every unit stays under a size limit, splitting at page boundaries.
 */

import { existsSync } from "node:fs";
import { link, mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, posix } from "node:path";
import { yamlString } from "@docs-mcp/core/kernel/md/yaml.js";
import { classify, PARA_FOLDERS, RAW_FOLDER } from "./para.js";
import { safeName } from "./filing.js";
import type { VaultNote } from "./scan.js";

export const RAW_ROOT = posix.join(PARA_FOLDERS.resources, RAW_FOLDER);
/** Fixed names inside a work folder; the folder carries the title (ADR-KI-0059). */
export const RAW_PDF = "e-book.pdf";
export const RAW_TEXT = "text.md";
export const RAW_CHAPTERS = "chapters";
/** About 5,000 tokens: a sparring unit that leaves a small local model room for the dialogue. */
export const MAX_UNIT_CHARS = 20_000;
const CONVERTIBLE = /\.pdf$/i;
/** Outline entries that are not reading matter; they stay in the PDF and are listed in the index. */
const NOT_A_CHAPTER = /^(cover|title page|half title|dedication|epigraph|(table of )?contents|copyright|acknowledg\w*|about the author|also by|praise for|notes|endnotes|index|bibliography)\b/i;

export interface RawItem {
  /** Vault-relative path of the raw file. */
  path: string;
  kind: string | null;
  author: string | null;
  work: string | null;
  /** The note that carries this file's text: itself for markdown, the book index for a converted PDF, else null. */
  note: string | null;
  convertible: boolean;
}

/** Every file under `3.Resources/0.Raw/` except the notes a conversion wrote, with the note that carries its text. */
export async function listRaw(root: string, notes: VaultNote[]): Promise<RawItem[]> {
  const files: string[] = [];
  async function walk(rel: string): Promise<void> {
    let entries;
    try { entries = await readdir(join(root, rel), { withFileTypes: true }); } catch { return; }
    for (const e of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (e.name.startsWith(".")) continue;
      const child = posix.join(rel, e.name);
      if (e.isDirectory()) await walk(child);
      else if (e.isFile()) files.push(child);
    }
  }
  await walk(RAW_ROOT);
  const indexFor = new Map(notes.filter(n => n.convertedFrom && n.rawRole !== "chapter").map(n => [posix.join(posix.dirname(n.path), n.convertedFrom!), n.path]));
  const generated = new Set(notes.filter(n => n.rawRole).map(n => n.path));
  return files
    .filter(f => !generated.has(f))
    .map(path => {
      const at = classify(path);
      return {
        path,
        kind: at.rawKind,
        author: at.rawAuthor,
        work: at.rawWork,
        note: path.endsWith(".md") ? path : indexFor.get(path) ?? null,
        convertible: CONVERTIBLE.test(path),
      };
    });
}

export interface OutlineEntry {
  title: string;
  /** 1-based page the entry points at. */
  page: number;
  /** The top-level entry this one sits under, such as "Part Two"; null for a top-level entry. */
  part: string | null;
  /** True for a top-level entry that has entries under it (a part, not a chapter). */
  isPart: boolean;
}

export interface PdfText {
  title: string | null;
  author: string | null;
  pages: string[];
  /** The PDF's outline, two levels deep, in page order; empty when the PDF has none. */
  outline: OutlineEntry[];
}

/** Text of every page of a PDF and its outline, offline. */
export async function extractPdf(bytes: Uint8Array): Promise<PdfText> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: bytes, disableFontFace: true, verbosity: 0 });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const content = await (await doc.getPage(p)).getTextContent();
      pages.push(content.items.map(i => ("str" in i ? i.str + (i.hasEOL ? "\n" : "") : "")).join(""));
    }
    const info = ((await doc.getMetadata().catch(() => null))?.info ?? {}) as { Title?: unknown; Author?: unknown };
    const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

    type Item = { title: string; dest: unknown; items?: Item[] };
    const pageOf = async (dest: unknown): Promise<number | null> => {
      try {
        const d = typeof dest === "string" ? await doc.getDestination(dest) : dest;
        if (!Array.isArray(d) || !d[0] || typeof d[0] !== "object") return null;
        return (await doc.getPageIndex(d[0] as { num: number; gen: number })) + 1;
      } catch { return null; }
    };
    const outline: OutlineEntry[] = [];
    for (const top of ((await doc.getOutline().catch(() => null)) ?? []) as Item[]) {
      const children = top.items ?? [];
      const page = await pageOf(top.dest);
      if (page) outline.push({ title: top.title.trim(), page, part: null, isPart: children.length > 0 });
      for (const child of children) {
        const p = await pageOf(child.dest);
        if (p) outline.push({ title: child.title.trim(), page: p, part: top.title.trim(), isPart: false });
      }
    }
    outline.sort((a, b) => a.page - b.page);
    return { title: text(info.Title), author: text(info.Author), pages, outline };
  } finally {
    await task.destroy();
  }
}

export interface Unit {
  /** Position of the chapter in the book, 1-based; parts of one chapter share it. */
  seq: number;
  /** The chapter's title as the outline gives it, with " (k of n)" for a part. */
  title: string;
  /** The title used in the file name: no "Chapter N:" prefix. */
  shortTitle: string;
  part: string | null;
  from: number;
  to: number;
  /** "k of n" when the chapter is split, else null. */
  section: string | null;
  chars: number;
}

export interface UnitPlan {
  units: Unit[];
  /** Outline entries left in the PDF: front and back matter. */
  skipped: { title: string; page: number }[];
  /** True when the PDF had no usable outline and the book was cut into blocks of pages. */
  byPages: boolean;
}

/** Cut pages `from..to` into `n` runs of roughly equal size, at page boundaries. */
function balanced(size: (p: number) => number, from: number, to: number, total: number, n: number): [number, number][] {
  const target = total / n;
  const runs: [number, number][] = [];
  let start = from;
  let acc = 0;
  for (let p = from; p <= to; p++) {
    acc += size(p);
    if (acc >= target * (runs.length + 1) && runs.length < n - 1 && p < to) {
      runs.push([start, p]);
      start = p + 1;
    }
  }
  runs.push([start, to]);
  return runs;
}

/**
 * Cut pages `from..to` into the fewest roughly equal runs that each stay under `limit`,
 * at page boundaries. Only a single page larger than the limit may exceed it.
 */
function cut(pages: string[], from: number, to: number, limit: number): [number, number][] {
  const size = (p: number) => pages[p - 1].length;
  const sum = (a: number, b: number) => { let t = 0; for (let p = a; p <= b; p++) t += size(p); return t; };
  const total = sum(from, to);
  for (let n = Math.max(1, Math.ceil(total / limit)); n <= to - from + 1; n++) {
    const runs = balanced(size, from, to, total, n);
    if (runs.every(([a, b]) => a === b || sum(a, b) <= limit)) return runs;
  }
  return Array.from({ length: to - from + 1 }, (_, i) => [from + i, from + i] as [number, number]);
}

const charsOf = (pages: string[], from: number, to: number) => pages.slice(from - 1, to).reduce((n, t) => n + t.length, 0);

/** The chapters of a book, each under `limit` characters, from its outline or else by pages. */
export function planUnits(pdf: PdfText, limit = MAX_UNIT_CHARS): UnitPlan {
  const last = pdf.pages.length;
  const skipped: UnitPlan["skipped"] = [];
  const chapters: { title: string; part: string | null; from: number; to: number }[] = [];
  pdf.outline.forEach((e, i) => {
    if (e.isPart) return;
    if (NOT_A_CHAPTER.test(e.title)) { skipped.push({ title: e.title, page: e.page }); return; }
    const next = pdf.outline.slice(i + 1).find(n => n.page > e.page)?.page ?? last + 1;
    chapters.push({ title: e.title, part: e.part, from: e.page, to: Math.min(last, Math.max(e.page, next - 1)) });
  });
  const byPages = chapters.length === 0;
  if (byPages) chapters.push({ title: "Pages", part: null, from: 1, to: last });

  const units: Unit[] = [];
  chapters.forEach((c, i) => {
    const runs = cut(pdf.pages, c.from, c.to, limit);
    const shortTitle = c.title.replace(/^chapter\s+\d+\s*[:.\-–—]\s*/i, "");
    runs.forEach(([from, to], k) => {
      if (byPages) {
        units.push({ seq: k + 1, title: `Pages ${from}–${to}`, shortTitle: `Pages ${from}-${to}`, part: null, from, to, section: null, chars: charsOf(pdf.pages, from, to) });
        return;
      }
      const section = runs.length > 1 ? `${k + 1} of ${runs.length}` : null;
      const suffix = section ? ` (${section})` : "";
      units.push({ seq: i + 1, title: c.title + suffix, shortTitle: shortTitle + suffix, part: c.part, from, to, section, chars: charsOf(pdf.pages, from, to) });
    });
  });
  return { units, skipped, byPages };
}

/** Page text as markdown that cannot turn into structure: no stray headings, rules, or fences. */
function pageMarkdown(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
    .split("\n")
    .map(l => l.replace(/\s+$/, ""))
    .map(l => (/^\s*(#|>|```|~~~|---\s*$|===\s*$)/.test(l) ? `\\${l.trimStart()}` : l))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const noExt = (p: string) => p.replace(/\.md$/, "");

export function chapterFile(folder: string, unit: Unit, digits: number): string {
  return posix.join(folder, RAW_CHAPTERS, `${String(unit.seq).padStart(digits, "0")} ${safeName(unit.shortTitle) ?? "Untitled"}.md`);
}

interface Book { title: string; author: string | null; folder: string; pdfPath: string; date: string }

export function renderChapter(book: Book, unit: Unit, path: string, pdf: PdfText): string {
  const lines = [
    "---",
    `title: ${yamlString(unit.title)}`,
    `raw_role: "chapter"`,
    `book: ${yamlString(book.title)}`,
    ...(book.author ? [`author: ${yamlString(book.author)}`] : []),
    ...(unit.part ? [`part: ${yamlString(unit.part)}`] : []),
    `chapter: ${unit.seq}`,
    ...(unit.section ? [`section: ${yamlString(unit.section)}`] : []),
    `pages: ${yamlString(`${unit.from}-${unit.to}`)}`,
    `converted_from: ${yamlString(posix.relative(posix.dirname(path), book.pdfPath))}`,
    "---",
    "",
    `# ${unit.title}`,
    "",
    `From [[${noExt(posix.join(book.folder, RAW_TEXT))}|${book.title}]], pages ${unit.from}–${unit.to}. The PDF opens at [[${book.pdfPath}#page=${unit.from}]].`,
  ];
  for (let p = unit.from; p <= unit.to; p++) lines.push("", `## Page ${p}`, "", pageMarkdown(pdf.pages[p - 1]) || "_(no text on this page)_");
  return `${lines.join("\n")}\n`;
}

export function renderIndex(book: Book, plan: UnitPlan, paths: string[], pdf: PdfText): string {
  const lines = [
    "---",
    `title: ${yamlString(book.title)}`,
    `aliases: [${yamlString(book.title)}]`,
    `raw_role: "index"`,
    ...(book.author ? [`author: ${yamlString(book.author)}`] : []),
    `converted_from: ${yamlString(RAW_PDF)}`,
    `pages: ${pdf.pages.length}`,
    `chapters: ${plan.units.length}`,
    `converted_at: ${yamlString(book.date)}`,
    "---",
    "",
    `# ${book.title}`,
    "",
    `Converted from [[${book.pdfPath}]] by docs-mcp. The text is in the chapter notes below, the reference concept notes quote and are checked against. A link to a page of the PDF, such as [[${book.pdfPath}#page=12]], resolves to the chapter holding that page.`,
  ];
  let part: string | null | undefined;
  plan.units.forEach((u, i) => {
    if (u.part !== part) {
      part = u.part;
      lines.push("", `## ${part ?? (plan.byPages ? "Pages" : "Chapters")}`, "");
    }
    lines.push(`- [[${noExt(paths[i])}|${u.title}]] · pages ${u.from}–${u.to}`);
  });
  if (plan.skipped.length) {
    lines.push("", "## Not split", "", "Left in the PDF:", "");
    for (const s of plan.skipped) lines.push(`- [[${book.pdfPath}#page=${s.page}|${s.title}]] · page ${s.page}`);
  }
  return `${lines.join("\n")}\n`;
}

export interface ConvertOptions {
  /** Author folder name; defaults to the author folder the PDF is in, else the PDF's metadata author. */
  author?: string;
  /** Work folder name; defaults to the PDF's metadata title, else its file name. */
  title?: string;
  /** Largest unit in characters before a chapter splits into parts; defaults to MAX_UNIT_CHARS. */
  maxChars?: number;
}

export interface ConvertPlan {
  source: string;
  /** Where the PDF moves first: `<kind>/<author>/<title>/e-book.pdf`; null when it is already there. */
  move: { from: string; to: string } | null;
  /** The book index, `text.md`. */
  to: string | null;
  chapters: { path: string; title: string; pages: string; chars: number }[];
  skipped: { title: string; page: number }[];
  /** True when the PDF had no outline and was cut into blocks of pages. */
  byPages: boolean;
  collisions: string[];
  errors: string[];
  pages: number;
  chars: number;
  /** Files to write, index last; internal, never returned by the tool. */
  writes: { path: string; content: string }[];
}

/**
 * Plan converting one raw PDF. Extraction and chapter planning run in the preview too, so
 * its numbers and file names are the ones `execute` writes. A PDF not yet in a work folder
 * moves first into `<kind>/<author>/<title>/e-book.pdf`.
 */
export async function planConvert(root: string, path: string, date: string, opts: ConvertOptions = {}): Promise<ConvertPlan> {
  const plan: ConvertPlan = { source: path, move: null, to: null, chapters: [], skipped: [], byPages: false, collisions: [], errors: [], pages: 0, chars: 0, writes: [] };
  if (!path.startsWith(`${RAW_ROOT}/`) || path.split("/").some(p => p === ".." || p.startsWith("."))) {
    plan.errors.push(`${path} is not under ${RAW_ROOT}/`);
    return plan;
  }
  if (!CONVERTIBLE.test(path)) { plan.errors.push(`${path} is not a PDF; only PDFs can be converted`); return plan; }
  if (!existsSync(join(root, path))) { plan.errors.push(`no file ${path}`); return plan; }
  const parts = path.split("/");
  if (parts.length < 4) { plan.errors.push(`${path} is not in a kind folder; put it under ${RAW_ROOT}/<kind>/, e.g. Books`); return plan; }
  if (opts.maxChars !== undefined && !(opts.maxChars >= 1000)) { plan.errors.push("maxChars must be at least 1000"); return plan; }
  let pdf: PdfText;
  try {
    pdf = await extractPdf(new Uint8Array(await readFile(join(root, path))));
  } catch (err) {
    plan.errors.push(`${path} could not be read as a PDF: ${err instanceof Error ? err.message : String(err)}`);
    return plan;
  }
  plan.pages = pdf.pages.length;
  plan.chars = pdf.pages.reduce((n, p) => n + p.length, 0);
  if (!pdf.pages.some(p => p.trim())) { plan.errors.push(`${path} has no extractable text (a scanned PDF needs OCR first)`); return plan; }

  // 3.Resources / 0.Raw / <kind> / <author> / <work> / e-book.pdf + text.md + chapters/
  let folder = posix.dirname(path);
  if (parts.length < 6) {
    const author = safeName(opts.author ?? (parts.length === 5 ? parts[3] : pdf.author ?? ""));
    const work = safeName(opts.title ?? pdf.title ?? posix.basename(path).replace(CONVERTIBLE, ""));
    if (!author) { plan.errors.push(`${path} names no author in its metadata; pass author`); return plan; }
    if (!work) { plan.errors.push(`${path} gives no usable title; pass title`); return plan; }
    folder = posix.join(RAW_ROOT, parts[2], author, work);
  }
  const pdfPath = posix.join(folder, RAW_PDF);
  if (pdfPath !== path) plan.move = { from: path, to: pdfPath };
  plan.to = posix.join(folder, RAW_TEXT);

  const units = planUnits(pdf, opts.maxChars ?? MAX_UNIT_CHARS);
  const book: Book = { title: pdf.title ?? posix.basename(folder), author: pdf.author, folder, pdfPath, date };
  const digits = Math.max(2, String(units.units.at(-1)?.seq ?? 1).length);
  const paths = units.units.map(u => chapterFile(folder, u, digits));
  plan.chapters = units.units.map((u, i) => ({ path: paths[i], title: u.title, pages: `${u.from}-${u.to}`, chars: u.chars }));
  plan.skipped = units.skipped;
  plan.byPages = units.byPages;
  plan.writes = [
    ...units.units.map((u, i) => ({ path: paths[i], content: renderChapter(book, u, paths[i], pdf) })),
    { path: plan.to, content: renderIndex(book, units, paths, pdf) },
  ];
  for (const target of [...(plan.move ? [plan.move.to] : []), ...plan.writes.map(w => w.path)]) {
    if (existsSync(join(root, target))) plan.collisions.push(target);
  }
  const dupes = paths.filter((p, i) => paths.indexOf(p) !== i);
  if (dupes.length) plan.errors.push(`two chapters would share a file name: ${[...new Set(dupes)].join(", ")}`);
  return plan;
}

export async function executeConvert(root: string, plan: ConvertPlan): Promise<void> {
  if (plan.errors.length || plan.collisions.length || !plan.to || !plan.writes.length) throw new Error("refusing to write a conversion with errors or collisions");
  if (plan.move) {
    // Link then unlink: a move that fails rather than replace an existing file.
    const dst = join(root, plan.move.to);
    await mkdir(dirname(dst), { recursive: true });
    await link(join(root, plan.move.from), dst);
    await unlink(join(root, plan.move.from));
  }
  for (const w of plan.writes) {
    await mkdir(dirname(join(root, w.path)), { recursive: true });
    await writeFile(join(root, w.path), w.content, { flag: "wx" });
  }
}

/**
 * The body limited to a page range, for notes converted with `## Page N` headings.
 * `range` is "N" or "N-M"; returns null when the note has no such pages.
 */
export function pagesOf(body: string, range: string): string | null {
  const m = range.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  if (!m) return null;
  const from = Number(m[1]);
  const to = m[2] ? Number(m[2]) : from;
  if (from < 1 || to < from) return null;
  const sections = body.split(/^(?=## Page \d+\s*$)/m);
  const picked = sections.filter(s => {
    const n = Number(s.match(/^## Page (\d+)/)?.[1]);
    return n >= from && n <= to;
  });
  return picked.length ? picked.join("").trimEnd() + "\n" : null;
}
