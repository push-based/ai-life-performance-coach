import { withoutSummaries } from './distill.js';
import { type ParaBucket, type VaultNote } from '@ai-coach/vault-domain';

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

export interface SearchUnit {
  id: string;
  title: string;
  body: string;
}

export type SearchRanker = (
  units: SearchUnit[],
  query: string,
  limit: number,
) => Promise<Map<string, number>>;

function snippetOf(body: string, query: string, size = 200): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = flat.toLowerCase();
  const at =
    terms
      .map((t) => lower.indexOf(t))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, at - 60);
  return (
    (start > 0 ? '…' : '') +
    flat.slice(start, start + size) +
    (start + size < flat.length ? '…' : '')
  );
}

export async function searchNotes(
  rank: SearchRanker,
  notes: VaultNote[],
  query: string,
  opts: NoteSearchOptions = {},
): Promise<NoteHit[]> {
  const limit = Math.max(0, opts.limit ?? 20);
  if (!query.trim() || limit === 0) return [];
  const byPath = new Map(notes.map((n) => [n.path, n]));
  const scores = await rank(
    notes.map((n) => ({ id: n.path, title: n.title, body: n.body })),
    query,
    limit,
  );

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
  note: string;

  source: string;

  title: string;

  page: number | null;
  score: number;
  snippet: string;
}

export interface PassageSearchOptions {
  within?: string;
  limit?: number;
}

export async function searchPassages(
  rank: SearchRanker,
  notes: VaultNote[],
  query: string,
  opts: PassageSearchOptions = {},
): Promise<PassageHit[]> {
  const limit = Math.max(0, opts.limit ?? 10);
  if (!query.trim() || limit === 0) return [];
  const within = opts.within?.replace(/\/+$/, '');
  const raw = notes.filter(
    (n) =>
      n.raw &&
      n.rawRole !== 'index' &&
      (!within || n.path.startsWith(`${within}/`)),
  );
  const units = new Map<
    string,
    { note: VaultNote; page: number | null; body: string }
  >();
  for (const n of raw) {
    const pages = n.body
      .split(/^(?=## Page \d+\s*$)/m)
      .filter((s) => /^## Page \d+/.test(s));
    if (!pages.length)
      units.set(n.path, {
        note: n,
        page: null,
        body: withoutSummaries(n.body),
      });
    for (const s of pages) {
      const page = Number(s.match(/^## Page (\d+)/)![1]);
      units.set(`${n.path}#${page}`, {
        note: n,
        page,
        body: withoutSummaries(s.replace(/^## Page \d+\s*\n/, '')),
      });
    }
  }
  const scores = await rank(
    [...units].map(([id, u]) => ({ id, title: u.note.title, body: u.body })),
    query,
    limit,
  );
  return [...scores.entries()]
    .filter(([id]) => units.has(id))
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
    .map(([id, score]) => {
      const { note, page, body } = units.get(id)!;
      return {
        note: note.path,
        source:
          typeof note.frontmatter.book === 'string'
            ? note.frontmatter.book
            : note.title,
        title: note.title,
        page,
        score: Math.round(score * 1000) / 1000,
        snippet: snippetOf(body, query, 400),
      };
    });
}
