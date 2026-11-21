import { Document, Charset, type DocumentData } from 'flexsearch';
import type { SearchRanker, SearchUnit } from '@ai-coach/vault-application';

const FIELDS = [
  { field: 'title', resolution: 9 },
  { field: 'body', resolution: 3 },
] as const;

type FieldResultList = { field: string; result: (string | number)[] }[];

function buildIndex(units: SearchUnit[]): Document<DocumentData> {
  const index = new Document<DocumentData>({
    tokenize: 'forward',
    encoder: Charset.LatinBalance,
    document: {
      id: 'id',
      index: FIELDS.map((f) => ({
        field: f.field,
        tokenize: 'forward' as const,
        resolution: f.resolution,
      })),
    },
  });
  for (const u of units) index.add({ id: u.id, title: u.title, body: u.body });
  return index;
}

export const rankWithFlexSearch: SearchRanker = async (units, query, limit) => {
  const index = buildIndex(units);
  const weight = Object.fromEntries(
    FIELDS.map((f) => [f.field, f.resolution / 9]),
  );
  const scores = new Map<string, number>();
  const collect = (results: FieldResultList, factor: number) => {
    for (const r of results) {
      r.result.forEach((id, pos) => {
        const key = String(id);
        scores.set(
          key,
          (scores.get(key) ?? 0) +
            factor * ((weight[r.field] ?? 0.3) / (pos + 1)),
        );
      });
    }
  };
  const pool = Math.max(limit, 200);
  collect(
    (await index.searchAsync(query, {
      limit: pool,
      suggest: true,
    })) as unknown as FieldResultList,
    1,
  );
  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length > 1) {
    for (const t of terms)
      collect(
        (await index.searchAsync(t, {
          limit: pool,
        })) as unknown as FieldResultList,
        1 / terms.length,
      );
  }
  return scores;
};
