import { posix } from '@ai-coach/util-path';
import type { Vault } from './vault.js';
import type { NoteStore } from './ports/note-store.js';
import { RAW_TEXT } from './convert.js';
import { periodAt } from './plans.js';
import {
  bookProgress,
  citations,
  type ChapterState,
  type PageMark,
  type ReadingStage,
} from './distill.js';
import {
  COACH_ROOT,
  type ParaBucket,
  type PlanLevel,
  buildVaultGraph,
  isPlanPath,
  isPlanTemplatePath,
  isWorkstreamPath,
  parseTasks,
  planOf,
  planPathIn,
  planPathOf,
  type Mastery,
  type VaultNote,
} from '@ai-coach/vault-domain';

export const GRAPH_FILE = posix.join(COACH_ROOT, 'graph.json');

export interface VaultViewGraph {
  generatedAt: string;
  vaultName: string;
  nodes: {
    id: string;
    title: string;

    label: string;
    bucket: ParaBucket | null;
    container: string | null;
    workstream: boolean;
    plan: boolean;
    planLevel: PlanLevel | null;
    raw: boolean;
    rawRole: 'index' | 'chapter' | null;

    concept: boolean;

    book: string | null;

    chapterCount: number | null;

    stage: ReadingStage | null;

    readOn: string | null;
    chaptersComplete: number | null;

    notesFrom: string[] | null;
    conceptsFrom: string[] | null;

    distill: {
      state: ChapterState;
      summary: boolean;
      pages: {
        page: number;
        mark: PageMark;
        summary: boolean;
        empty: boolean;
      }[];
    } | null;
    mastery: Mastery;
    nextReview: string | null;
  }[];
  edges: {
    source: string;
    target: string;
    kind: 'wikilink' | 'markdown' | 'scheduled';
  }[];
  unresolved: number;
}

const LABEL_MAX = 28;
const clip = (s: string) =>
  s.length > LABEL_MAX ? `${s.slice(0, LABEL_MAX - 1).trimEnd()}…` : s;

export function shortLabel(
  note: Pick<VaultNote, 'title' | 'rawRole' | 'frontmatter'>,
): string {
  if (note.rawRole !== 'chapter') return clip(note.title);
  const title = note.title.replace(/\s*\(\d+ of \d+\)$/, '');
  const m = title.match(/^chapter\s+(\d+)\s*[:.\-–—]\s*(.*)$/i);
  const name = (m ? m[2] : title).split(/\s*[:—–]\s*/)[0];
  const section =
    typeof note.frontmatter.section === 'string'
      ? note.frontmatter.section.match(/^(\d+) of (\d+)$/)
      : null;
  const suffix = section ? ` (${section[1]}/${section[2]})` : '';
  return clip(`${m ? `${m[1]}. ` : ''}${name}`) + suffix;
}

export async function writeViewGraph(
  vault: Pick<Vault, 'notesWithHistory' | 'root'>,
  store: NoteStore,
  now: Date,
): Promise<VaultViewGraph> {
  const { notes: allNotes } = await vault.notesWithHistory();
  const notes = allNotes.filter((n) => !isPlanTemplatePath(n.path));
  const history = new Map(notes.map((n) => [n.path, n.history]));
  const byPath = new Map(notes.map((n) => [n.path, n]));
  const g = buildVaultGraph(notes);
  const books = new Map(bookProgress(notes).map((b) => [b.index, b]));
  const chapters = new Map(
    [...books.values()].flatMap((b) =>
      b.chapters.map((c) => [c.path, c] as const),
    ),
  );
  const cited = citations(notes);
  const edges: VaultViewGraph['edges'] = [...g.edges];
  const seenEdges = new Set(
    edges.map((e) =>
      e.source < e.target
        ? `${e.source}\0${e.target}`
        : `${e.target}\0${e.source}`,
    ),
  );
  const addScheduledEdge = (source: string, target: string) => {
    const key =
      source < target ? `${source}\0${target}` : `${target}\0${source}`;
    if (seenEdges.has(key)) return;
    seenEdges.add(key);
    edges.push({ source, target, kind: 'scheduled' });
  };
  for (const note of notes) {
    const ref = planOf(note.path);
    if (ref?.level === 'day') {
      const weekPath = planPathOf(periodAt('week', ref.period));
      if (byPath.has(weekPath)) addScheduledEdge(weekPath, note.path);
      continue;
    }
    if (isPlanPath(note.path)) continue;
    for (const task of parseTasks(note.path, note.body, null)) {
      if (!task.scheduled) continue;
      const dayPath = planPathIn(
        { level: 'day', period: task.scheduled },
        (p) => byPath.has(p),
      );
      if (!byPath.has(dayPath)) continue;
      addScheduledEdge(dayPath, note.path);
    }
  }
  const graph: VaultViewGraph = {
    generatedAt: now.toISOString(),
    vaultName: posix.basename(vault.root.split('\\').join('/')),
    nodes: g.nodes.map((n) => {
      const note = byPath.get(n.id)!;
      const book =
        note.rawRole === 'chapter'
          ? posix.join(posix.dirname(posix.dirname(n.id)), RAW_TEXT)
          : null;
      return {
        id: n.id,
        title: n.title,
        label: shortLabel(note),
        bucket: n.bucket,
        container: n.container,
        workstream: isWorkstreamPath(n.id),
        plan: isPlanPath(n.id),
        planLevel: planOf(n.id)?.level ?? null,
        raw: n.raw,
        rawRole: note.rawRole,
        concept: note.concept,
        book: book && byPath.has(book) ? book : null,
        chapterCount:
          note.rawRole === 'index'
            ? notes.filter(
                (c) =>
                  c.rawRole === 'chapter' &&
                  posix.dirname(posix.dirname(c.path)) === posix.dirname(n.id),
              ).length
            : null,
        stage: books.get(n.id)?.stage ?? null,
        readOn: books.get(n.id)?.steps.readOn ?? null,
        chaptersComplete: books.get(n.id)?.steps.chaptersComplete ?? null,
        notesFrom:
          n.raw && note.rawRole !== 'chapter'
            ? (cited.get(n.id)?.notes ?? [])
            : null,
        conceptsFrom:
          n.raw && note.rawRole !== 'chapter'
            ? (cited.get(n.id)?.concepts ?? [])
            : null,
        distill: ((c) =>
          c ? { state: c.state, summary: c.summary, pages: c.pages } : null)(
          chapters.get(n.id),
        ),
        mastery: history.get(n.id)!.mastery,
        nextReview: history.get(n.id)!.nextReview,
      };
    }),
    edges,
    unresolved: g.unresolved.length,
  };
  await store.replaceText(GRAPH_FILE, `${JSON.stringify(graph, null, 2)}\n`);
  return graph;
}
