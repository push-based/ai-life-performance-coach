/**
 * Lexical search over vault notes. The same FlexSearch library and LatinBalance charset
 * as the governed corpus, which folds diacritics, so Polish and English notes share one
 * index. Scoring is field weight by rank position, without the corpus's IDF pass: a
 * personal vault is small enough that the whole-query ranking stands on its own.
 */

import { Document, Charset, type DocumentData } from "flexsearch";
import type { ParaBucket } from "./para.js";
import type { VaultNote } from "./scan.js";

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

export function buildNoteIndex(notes: VaultNote[]): Document<DocumentData> {
  const index = new Document<DocumentData>({
    tokenize: "forward",
    encoder: Charset.LatinBalance,
    document: {
      id: "path",
      index: FIELDS.map(f => ({ field: f.field, tokenize: "forward" as const, resolution: f.resolution })),
    },
  });
  for (const n of notes) index.add({ path: n.path, title: n.title, body: n.body });
  return index;
}

function snippetOf(body: string, query: string): string {
  const flat = body.replace(/\s+/g, " ").trim();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = flat.toLowerCase();
  const at = terms.map(t => lower.indexOf(t)).filter(i => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, at - 60);
  return (start > 0 ? "…" : "") + flat.slice(start, start + 200) + (start + 200 < flat.length ? "…" : "");
}

export async function searchNotes(notes: VaultNote[], query: string, opts: NoteSearchOptions = {}): Promise<NoteHit[]> {
  const limit = Math.max(0, opts.limit ?? 20);
  if (!query.trim() || limit === 0) return [];
  const index = buildNoteIndex(notes);
  const byPath = new Map(notes.map(n => [n.path, n]));
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
