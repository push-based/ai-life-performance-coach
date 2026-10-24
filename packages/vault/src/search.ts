/**
 * Lexical search over vault notes. The same FlexSearch library and LatinBalance charset
 * as the governed corpus, which folds diacritics, so Polish and English notes share one
 * index. Scoring is field weight by rank position, without the corpus's IDF pass: a
 * personal vault is small enough that the whole-query ranking stands on its own.
 */

import { Document, Charset, type DocumentData } from "flexsearch";
import type { ParaBucket } from "./para.js";
import type { VaultNote } from "./scan.js";
import { withoutSummaries } from "./distill.js";

export interface NoteHit {
  path: string;
  title: string;
  bucket: ParaBucket | null;
  container: string | null;
  score: number;
  snippet: string;
}

export interface NoteSearchOptions {
  bucket?: ParaBucket;
  limit?: number;
}

const FIELDS = [
  { field: "title", resolution: 9 },
  { field: "body", resolution: 3 },
] as const;

type FieldResultList = { field: string; result: (string | number)[] }[];

/** A searchable unit: a whole note, or one page of a converted book. */
interface Unit { id: string; title: string; body: string }

function buildIndex(units: Unit[]): Document<DocumentData> {
  const index = new Document<DocumentData>({
    tokenize: "forward",
    encoder: Charset.LatinBalance,
    document: {
      id: "id",
      index: FIELDS.map(f => ({ field: f.field, tokenize: "forward" as const, resolution: f.resolution })),
    },
  });
  for (const u of units) index.add({ id: u.id, title: u.title, body: u.body });
  return index;
}

/** Score units by field weight and rank position, the whole query first, then each term. */
async function rank(units: Unit[], query: string, limit: number): Promise<Map<string, number>> {
  const index = buildIndex(units);
  const weight = Object.fromEntries(FIELDS.map(f => [f.field, f.resolution / 9]));
  const scores = new Map<string, number>();
  const collect = (results: FieldResultList, factor: number) => {
    for (const r of results) {
      r.result.forEach((id, pos) => {
        const key = String(id);
        scores.set(key, (scores.get(key) ?? 0) + factor * ((weight[r.field] ?? 0.3) / (pos + 1)));
      });
    }
  };
  const pool = Math.max(limit, 200);
  collect((await index.searchAsync(query, { limit: pool, suggest: true })) as unknown as FieldResultList, 1);
  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length > 1) {
    for (const t of terms) collect((await index.searchAsync(t, { limit: pool })) as unknown as FieldResultList, 1 / terms.length);
  }
  return scores;
}

function snippetOf(body: string, query: string, size = 200): string {
  const flat = body.replace(/\s+/g, " ").trim();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = flat.toLowerCase();
  const at = terms.map(t => lower.indexOf(t)).filter(i => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, at - 60);
  return (start > 0 ? "…" : "") + flat.slice(start, start + size) + (start + size < flat.length ? "…" : "");
}

export async function searchNotes(notes: VaultNote[], query: string, opts: NoteSearchOptions = {}): Promise<NoteHit[]> {
  const limit = Math.max(0, opts.limit ?? 20);
  if (!query.trim() || limit === 0) return [];
  const byPath = new Map(notes.map(n => [n.path, n]));
  const scores = await rank(notes.map(n => ({ id: n.path, title: n.title, body: n.body })), query, limit);

  return [...scores.entries()]
    .map(([path, score]) => ({ note: byPath.get(path)!, score }))
    .filter(({ note }) => note && (!opts.bucket || note.bucket === opts.bucket))
    .sort((a, b) => b.score - a.score || (a.note.path < b.note.path ? -1 : 1))
    .slice(0, limit)
    .map(({ note, score }) => ({
      path: note.path,
      title: note.title,
      bucket: note.bucket,
      container: note.container,
      score: Math.round(score * 1000) / 1000,
      snippet: snippetOf(note.body, query),
    }));
}

export interface PassageHit {
  /** The raw note holding the passage: a book's chapter, or a raw note without pages. */
  note: string;
  /** The book or note title the passage belongs to. */
  source: string;
  /** The chapter or note title. */
  title: string;
  /** The page, for a converted book; null for a note without page headings. */
  page: number | null;
  score: number;
  snippet: string;
}

export interface PassageSearchOptions {
  /** Only raw notes under this folder, e.g. one book's work folder. */
  within?: string;
  limit?: number;
}

/**
 * Search the text of raw resources a page at a time (ADR-KI-0060), so a reading note can
 * be matched to the pages it came from and a quote taken from there. A book's index holds
 * no text and is left out.
 */
export async function searchPassages(notes: VaultNote[], query: string, opts: PassageSearchOptions = {}): Promise<PassageHit[]> {
  const limit = Math.max(0, opts.limit ?? 10);
  if (!query.trim() || limit === 0) return [];
  const within = opts.within?.replace(/\/+$/, "");
  const raw = notes.filter(n => n.raw && n.rawRole !== "index" && (!within || n.path.startsWith(`${within}/`)));
  const units = new Map<string, { note: VaultNote; page: number | null; body: string }>();
  for (const n of raw) {
    const pages = n.body.split(/^(?=## Page \d+\s*$)/m).filter(s => /^## Page \d+/.test(s));
    if (!pages.length) units.set(n.path, { note: n, page: null, body: withoutSummaries(n.body) });
    for (const s of pages) {
      const page = Number(s.match(/^## Page (\d+)/)![1]);
      units.set(`${n.path}#${page}`, { note: n, page, body: withoutSummaries(s.replace(/^## Page \d+\s*\n/, "")) });
    }
  }
  const scores = await rank([...units].map(([id, u]) => ({ id, title: u.note.title, body: u.body })), query, limit);
  return [...scores.entries()]
    .filter(([id]) => units.has(id))
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
    .map(([id, score]) => {
      const { note, page, body } = units.get(id)!;
      return {
        note: note.path,
        source: typeof note.frontmatter.book === "string" ? note.frontmatter.book : note.title,
        title: note.title,
        page,
        score: Math.round(score * 1000) / 1000,
        snippet: snippetOf(body, query, 400),
      };
    });
}
