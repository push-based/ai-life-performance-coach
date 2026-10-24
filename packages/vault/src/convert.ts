/**
 * Raw resources (ADR-KI-0059): list the files under `3.Resources/0.Raw/`, and convert a
 * PDF once into `text.md` beside it, as `e-book.pdf` in its `<kind>/<author>/<work>/` folder. The note carries `converted_from`, so links to
 * the PDF resolve to it, and one `## Page N` heading per page, so a reader can take a
 * page range instead of a whole book. Extraction runs offline (pdf.js) and the PDF is
 * never changed.
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
const CONVERTIBLE = /\.pdf$/i;

export interface RawItem {
  /** Vault-relative path of the raw file. */
  path: string;
  kind: string | null;
  author: string | null;
  work: string | null;
  /** The note converted from this file, or the file itself when it is a note. Null when not yet converted. */
  note: string | null;
  convertible: boolean;
}

/** Every file under `3.Resources/0.Raw/`, with the note that carries its text. */
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
  const convertedFrom = new Map(notes.filter(n => n.convertedFrom).map(n => [posix.join(posix.dirname(n.path), n.convertedFrom!), n.path]));
  const converted = new Set(convertedFrom.values());
  return files
    .filter(f => !converted.has(f))
    .map(path => {
      const at = classify(path);
      return {
        path,
        kind: at.rawKind,
        author: at.rawAuthor,
        work: at.rawWork,
        note: path.endsWith(".md") ? path : convertedFrom.get(path) ?? null,
        convertible: CONVERTIBLE.test(path),
      };
    });
}

export interface PdfText {
  title: string | null;
  author: string | null;
  pages: string[];
}

/** Text of every page of a PDF, offline. */
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
    return { title: text(info.Title), author: text(info.Author), pages };
  } finally {
    await task.destroy();
  }
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

/** `source` is the PDF's vault path; the title falls back to its work folder, then its file name. */
export function renderConversion(source: string, pdf: PdfText, date: string): string {
  const work = classify(source).rawWork;
  const title = pdf.title ?? work ?? posix.basename(source).replace(/\.[^.]+$/, "");
  const lines = [
    "---",
    `title: ${yamlString(title)}`,
    `aliases: [${yamlString(title)}]`,
    ...(pdf.author ? [`author: ${yamlString(pdf.author)}`] : []),
    `converted_from: ${yamlString(posix.basename(source))}`,
    `pages: ${pdf.pages.length}`,
    `converted_at: ${yamlString(date)}`,
    "---",
    "",
    `# ${title}`,
    "",
    `Converted from [[${source}]] by docs-mcp. Each page heading matches a PDF page; a link such as [[${source}#page=12]] resolves to this note, and [[${title}]] links to it by its alias.`,
  ];
  pdf.pages.forEach((text, i) => {
    const body = pageMarkdown(text);
    lines.push("", `## Page ${i + 1}`, "", body || "_(no text on this page)_");
  });
  return `${lines.join("\n")}\n`;
}

export interface ConvertPlan {
  source: string;
  /** Where the PDF moves first: `<kind>/<author>/<title>/e-book.pdf`; null when it is already there. */
  move: { from: string; to: string } | null;
  to: string | null;
  collisions: string[];
  errors: string[];
  pages: number;
  chars: number;
  content: string | null;
}

export interface ConvertOptions {
  /** Author folder name; defaults to the author folder the PDF is in, else the PDF's metadata author. */
  author?: string;
  /** Work folder name; defaults to the PDF's metadata title, else its file name. */
  title?: string;
}

/**
 * Plan converting one raw PDF: extraction runs in the preview too, so its numbers are
 * real. A PDF not yet in a work folder moves first into `<kind>/<author>/<title>/`.
 */
export async function planConvert(root: string, path: string, date: string, opts: ConvertOptions = {}): Promise<ConvertPlan> {
  const plan: ConvertPlan = { source: path, move: null, to: null, collisions: [], errors: [], pages: 0, chars: 0, content: null };
  if (!path.startsWith(`${RAW_ROOT}/`) || path.split("/").some(p => p === ".." || p.startsWith("."))) {
    plan.errors.push(`${path} is not under ${RAW_ROOT}/`);
    return plan;
  }
  if (!CONVERTIBLE.test(path)) { plan.errors.push(`${path} is not a PDF; only PDFs can be converted`); return plan; }
  if (!existsSync(join(root, path))) { plan.errors.push(`no file ${path}`); return plan; }
  const parts = path.split("/");
  if (parts.length < 4) { plan.errors.push(`${path} is not in a kind folder; put it under ${RAW_ROOT}/<kind>/, e.g. Books`); return plan; }
  let pdf: PdfText;
  try {
    pdf = await extractPdf(new Uint8Array(await readFile(join(root, path))));
  } catch (err) {
    plan.errors.push(`${path} could not be read as a PDF: ${err instanceof Error ? err.message : String(err)}`);
    return plan;
  }
  plan.pages = pdf.pages.length;
  plan.chars = pdf.pages.reduce((n, p) => n + p.length, 0);
  if (!pdf.pages.some(p => p.trim())) plan.errors.push(`${path} has no extractable text (a scanned PDF needs OCR first)`);

  // 3.Resources / 0.Raw / <kind> / <author> / <work> / e-book.pdf + text.md
  let folder = posix.dirname(path);
  if (parts.length < 6) {
    const author = safeName(opts.author ?? (parts.length === 5 ? parts[3] : pdf.author ?? ""));
    const work = safeName(opts.title ?? pdf.title ?? posix.basename(path).replace(CONVERTIBLE, ""));
    if (!author) { plan.errors.push(`${path} names no author in its metadata; pass author`); return plan; }
    if (!work) { plan.errors.push(`${path} gives no usable title; pass title`); return plan; }
    folder = posix.join(RAW_ROOT, parts[2], author, work);
  }
  const pdfPath = posix.join(folder, RAW_PDF);
  if (pdfPath !== path) {
    plan.move = { from: path, to: pdfPath };
    if (existsSync(join(root, pdfPath))) plan.collisions.push(pdfPath);
  }
  plan.to = posix.join(folder, RAW_TEXT);
  if (existsSync(join(root, plan.to))) plan.collisions.push(plan.to);
  plan.content = renderConversion(pdfPath, pdf, date);
  return plan;
}

export async function executeConvert(root: string, plan: ConvertPlan): Promise<void> {
  if (plan.errors.length || plan.collisions.length || !plan.to || !plan.content) throw new Error("refusing to write a conversion with errors or collisions");
  if (plan.move) {
    // Link then unlink: a move that fails rather than replace an existing file.
    const dst = join(root, plan.move.to);
    await mkdir(dirname(dst), { recursive: true });
    await link(join(root, plan.move.from), dst);
    await unlink(join(root, plan.move.from));
  }
  await writeFile(join(root, plan.to), plan.content, { flag: "wx" });
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
