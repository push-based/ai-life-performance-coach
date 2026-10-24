/**
 * Concept notes (ADR-KI-0060): the unit that is sparred. A concept note holds one idea
 * the user chose to keep, written from their own reading notes, with the assertions a
 * judge checks an explanation against, the words a Feynman drill bans, and verbatim
 * passages from a raw resource that ground it. Raw resources are the reference those
 * passages are checked against and are never sparred themselves.
 *
 * Every passage is verified on write, and again on every read, against the text of the
 * raw note it cites, so a concept note can never quote its source wrongly unnoticed.
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, posix } from "node:path";
import { yamlString } from "@docs-mcp/core/kernel/md/yaml.js";
import { classify, PARA_FOLDERS } from "./para.js";
import { safeName } from "./filing.js";
import type { VaultNote } from "./scan.js";

export const CONCEPT_TYPE = "concept";
export const CONCEPTS_FOLDER = posix.join(PARA_FOLDERS.resources, "Concepts");
export const MAX_ASSERTIONS = 6;
export const MAX_BUZZWORDS = 5;
export const MAX_PASSAGES = 12;
/** A quote shorter than this, once folded, matches too easily to ground anything. */
export const MIN_QUOTE_CHARS = 12;

export interface Passage {
  quote: string;
  /** Vault-relative path of the raw note quoted. */
  note: string;
  /** "N" or "N-M" for a note with `## Page N` headings; absent for one without. */
  pages?: string;
}

export interface PassageCheck extends Passage {
  found: boolean;
  /** Why the quote was not found, when it was not. */
  problem?: string;
}

export interface ConceptFields {
  coreAssertions: string[];
  forbiddenBuzzwords: string[];
  fromNotes: string[];
  passages: Passage[];
}

const isConcept = (fm: Record<string, unknown>) => fm.type === CONCEPT_TYPE;

/**
 * Text as compared for a quote: escapes the conversion added removed, typographic quotes,
 * dashes and ellipses folded, words broken across a line rejoined, whitespace collapsed,
 * case ignored. Copying from a PDF reader or retyping a quote should still match.
 */
export function fold(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/^\\/gm, "")
    .replace(/[‘’ʼ′`]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/(\p{L})-\s*\n\s*(\p{Ll})/gu, "$1$2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** A quote's pieces between elisions ("…", "...", "[…]"), each folded. */
function segments(quote: string): string[] {
  return quote.split(/\[?(?:\.\.\.|…)\]?/).map(fold).filter(Boolean);
}

function inOrder(text: string, parts: string[]): boolean {
  let at = 0;
  for (const p of parts) {
    const i = text.indexOf(p, at);
    if (i < 0) return false;
    at = i + p.length;
  }
  return true;
}

/** A note's `## Page N` sections, in order; empty for a note without them. */
function pagesIn(body: string): { page: number; text: string }[] {
  return body
    .split(/^(?=## Page \d+\s*$)/m)
    .map(s => ({ page: Number(s.match(/^## Page (\d+)/)?.[1]), text: s.replace(/^## Page \d+\s*\n/, "") }))
    .filter(s => Number.isInteger(s.page) && s.page > 0);
}

/**
 * Find a quote in a raw note. With `pages`, only there; without, on any one page or two
 * neighbouring pages (a quote can cross a page break), and the pages found are returned.
 */
export function locateQuote(note: VaultNote, quote: string, pages?: string): { found: boolean; pages?: string; problem?: string } {
  const parts = segments(quote);
  if (parts.join(" ").length < MIN_QUOTE_CHARS) return { found: false, problem: `the quote is shorter than ${MIN_QUOTE_CHARS} characters` };
  const sections = pagesIn(note.body);
  if (!sections.length) {
    if (pages) return { found: false, problem: `${note.path} has no page headings, so pages cannot be given` };
    return inOrder(fold(note.body), parts) ? { found: true } : { found: false, problem: `not found in ${note.path}` };
  }
  const text = (from: number, to: number) => fold(sections.filter(s => s.page >= from && s.page <= to).map(s => s.text).join("\n"));
  const label = (from: number, to: number) => (from === to ? String(from) : `${from}-${to}`);
  if (pages) {
    const m = pages.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) return { found: false, problem: `pages ${pages} is not N or N-M` };
    const from = Number(m[1]), to = m[2] ? Number(m[2]) : from;
    if (!sections.some(s => s.page >= from && s.page <= to)) return { found: false, problem: `${note.path} has no pages ${pages}` };
    return inOrder(text(from, to), parts) ? { found: true, pages: label(from, to) } : { found: false, problem: `not found on pages ${pages} of ${note.path}` };
  }
  for (const s of sections) if (inOrder(text(s.page, s.page), parts)) return { found: true, pages: String(s.page) };
  for (let i = 0; i + 1 < sections.length; i++) {
    const [a, b] = [sections[i].page, sections[i + 1].page];
    if (inOrder(text(a, b), parts)) return { found: true, pages: label(a, b) };
  }
  return { found: false, problem: `not found in ${note.path}` };
}

/** Check passages against the vault as it is now. */
export function checkPassages(notes: VaultNote[], passages: Passage[]): PassageCheck[] {
  const byPath = new Map(notes.map(n => [n.path, n]));
  return passages.map(p => {
    const note = byPath.get(p.note);
    if (!note) return { ...p, found: false, problem: `no note ${p.note}` };
    if (!note.raw) return { ...p, found: false, problem: `${p.note} is not a raw resource; passages quote material under 3.Resources/0.Raw` };
    if (note.rawRole === "index") return { ...p, found: false, problem: `${p.note} is a book's index and holds no text; quote one of its chapters` };
    const at = locateQuote(note, p.quote, p.pages);
    return at.found ? { ...p, ...(at.pages ? { pages: at.pages } : {}), found: true } : { ...p, found: false, problem: at.problem };
  });
}

const strings = (v: unknown): string[] | null => (Array.isArray(v) && v.every(s => typeof s === "string") ? v : v === undefined ? [] : null);

/**
 * A concept note's fields as its frontmatter holds them, with what is wrong with them;
 * null for a note that is not a concept note.
 */
export function conceptOf(note: Pick<VaultNote, "frontmatter">): { fields: ConceptFields; problems: string[] } | null {
  const fm = note.frontmatter;
  if (!isConcept(fm)) return null;
  const problems: string[] = [];
  const list = (key: string) => {
    const v = strings(fm[key]);
    if (v === null) problems.push(`${key} must be a list of strings`);
    return v ?? [];
  };
  const coreAssertions = list("core_assertions");
  if (!coreAssertions.length) problems.push("core_assertions is empty");
  const passages: Passage[] = [];
  const raw = fm.source_passages;
  if (raw !== undefined && !Array.isArray(raw)) problems.push("source_passages must be a list");
  for (const [i, p] of (Array.isArray(raw) ? raw : []).entries()) {
    const r = p as Record<string, unknown>;
    if (!r || typeof r.quote !== "string" || typeof r.note !== "string") { problems.push(`source_passages[${i}] needs a quote and a note`); continue; }
    passages.push({ quote: r.quote, note: r.note, ...(r.pages !== undefined ? { pages: String(r.pages) } : {}) });
  }
  return { fields: { coreAssertions, forbiddenBuzzwords: list("forbidden_buzzwords"), fromNotes: list("from_notes"), passages }, problems };
}

export interface ConceptInput {
  title: string;
  /** The idea in the user's own words; the note's body. */
  summary: string;
  core_assertions: string[];
  forbidden_buzzwords?: string[];
  passages: Passage[];
  /** The user's reading notes the concept was distilled from. */
  from_notes?: string[];
  /** Folder under 3.Resources, outside 0.Raw; defaults to 3.Resources/Concepts. */
  folder?: string;
}

export interface ConceptPlan {
  path: string | null;
  errors: string[];
  collisions: string[];
  /** Each passage as checked, with the pages it was found on. */
  passages: PassageCheck[];
  content: string | null;
}

const wikilink = (path: string, anchor: string, text: string) => `[[${path.replace(/\.md$/, "")}${anchor}|${text}]]`;

export function renderConcept(input: ConceptInput, passages: Passage[], notes: VaultNote[], date: string): string {
  const byPath = new Map(notes.map(n => [n.path, n]));
  const list = (key: string, values: string[]) => (values.length ? [`${key}:`, ...values.map(v => `  - ${yamlString(v)}`)] : [`${key}: []`]);
  const lines = [
    "---",
    `title: ${yamlString(input.title)}`,
    `type: ${yamlString(CONCEPT_TYPE)}`,
    ...list("core_assertions", input.core_assertions),
    ...list("forbidden_buzzwords", input.forbidden_buzzwords ?? []),
    "source_passages:",
    ...passages.flatMap(p => [`  - quote: ${yamlString(p.quote)}`, `    note: ${yamlString(p.note)}`, ...(p.pages ? [`    pages: ${yamlString(p.pages)}`] : [])]),
    ...list("from_notes", input.from_notes ?? []),
    `created: ${yamlString(date)}`,
    "---",
    "",
    `# ${input.title}`,
    "",
    input.summary.trim(),
    "",
    "## Source passages",
  ];
  for (const p of passages) {
    const raw = byPath.get(p.note);
    const book = typeof raw?.frontmatter.book === "string" ? raw.frontmatter.book : raw?.title ?? p.note;
    const first = p.pages?.split("-")[0];
    const cite = first ? wikilink(p.note, `#Page ${first}`, `${book}, p. ${p.pages!.replace("-", "–")}`) : wikilink(p.note, "", book);
    lines.push("", ...p.quote.trim().split("\n").map(l => `> ${l}`), `> — ${cite}`);
  }
  if (input.from_notes?.length) {
    lines.push("", "## From my reading notes", "");
    for (const n of input.from_notes) lines.push(`- ${wikilink(n, "", byPath.get(n)?.title ?? posix.basename(n, ".md"))}`);
  }
  return `${lines.join("\n")}\n`;
}

const nonEmpty = (xs: unknown, key: string, max: number, min: number, errors: string[]) => {
  if (!Array.isArray(xs) || xs.some(x => typeof x !== "string" || !x.trim())) { errors.push(`${key} must be a list of non-empty strings`); return; }
  if (xs.length < min || xs.length > max) errors.push(`${key} takes ${min} to ${max} entries, got ${xs.length}`);
};

/** Validate a concept note, verify every passage, and render it; nothing is written. */
export function planConcept(root: string, notes: VaultNote[], input: ConceptInput, date: string): ConceptPlan {
  const errors: string[] = [];
  const name = safeName(input.title ?? "");
  if (!name) errors.push("title must contain a character other than those Obsidian forbids in a file name");
  if (typeof input.summary !== "string" || !input.summary.trim()) errors.push("summary is empty; write the idea in your own words");
  nonEmpty(input.core_assertions, "core_assertions", MAX_ASSERTIONS, 1, errors);
  nonEmpty(input.forbidden_buzzwords ?? [], "forbidden_buzzwords", MAX_BUZZWORDS, 0, errors);
  if (!Array.isArray(input.passages) || input.passages.length === 0) errors.push("a concept note quotes at least one passage from a raw resource");
  else if (input.passages.length > MAX_PASSAGES) errors.push(`at most ${MAX_PASSAGES} passages, got ${input.passages.length}`);

  const folder = posix.normalize((input.folder ?? CONCEPTS_FOLDER).replace(/\/+$/, ""));
  const at = classify(`${folder}/x.md`);
  if (folder.startsWith("..") || at.bucket !== "resources" || at.raw) errors.push(`${folder} is not a folder under 3.Resources outside 0.Raw`);

  const byPath = new Map(notes.map(n => [n.path, n]));
  for (const n of input.from_notes ?? []) {
    const note = byPath.get(n);
    if (!note) errors.push(`from_notes: no note ${n}`);
    else if (note.raw) errors.push(`from_notes: ${n} is a raw resource; name your own reading notes`);
  }

  const passages = Array.isArray(input.passages) ? checkPassages(notes, input.passages) : [];
  passages.forEach((p, i) => { if (!p.found) errors.push(`passages[${i}]: ${p.problem}`); });

  const path = name ? posix.join(folder, `${name}.md`) : null;
  const collisions = path && existsSync(join(root, path)) ? [path] : [];
  const clean = !errors.length && path;
  return {
    path,
    errors,
    collisions,
    passages,
    content: clean ? renderConcept(input, passages.map(({ found: _f, problem: _p, ...p }) => p), notes, date) : null,
  };
}

export async function executeConcept(root: string, plan: ConceptPlan): Promise<void> {
  if (plan.errors.length || plan.collisions.length || !plan.path || !plan.content) throw new Error("refusing to write a plan with errors or collisions");
  const abs = join(root, plan.path);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, plan.content, { flag: "wx" });
}
