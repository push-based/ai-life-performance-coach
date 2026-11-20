import { posix } from '@ai-coach/util-path';
import type { NoteStore } from './note-store.js';
import { writeViewGraph, type VaultViewGraph } from './view-graph.js';
import {
  loadTree,
  readNote,
  scanVault,
  snapshot as loadSnapshot,
} from './scan.js';
import { loadSessions } from './sessions.js';
import {
  planSession,
  executeSession,
  localDate,
  type RecordPlan,
  type RecordSessionInput,
} from './record.js';
import {
  planInit,
  planCapture,
  planFileNote,
  planArchiveProject,
  executeFiling,
  type FilingPlan,
  type ArchiveOptions,
  type InitOptions,
} from './filing.js';
import {
  listRaw,
  planConvert,
  executeConvert,
  type RawItem,
  type ConvertPlan,
  type ConvertOptions,
  type PdfReader,
  type PdfLoader,
} from './convert.js';
import {
  planConcept,
  executeConcept,
  conceptOf,
  type ConceptInput,
  type ConceptPlan,
} from './concept.js';
import {
  bookProgress,
  citations,
  planMarkRead,
  planSummary,
  executeWrite,
  applyMark,
  editPageContent,
  setPageSummary,
  setChapterSummary,
  chapterSummaryOf,
  pageSection,
  type BookProgress,
  type WritePlan,
  type MarkOp,
  type EditResult,
} from './distill.js';
import {
  searchPassages,
  searchNotes,
  type NoteHit,
  type NoteSearchOptions,
  type SearchRanker,
  type PassageHit,
  type PassageSearchOptions,
} from './search.js';
import { markedPassages, type MarkedPassage } from './marks.js';
import {
  planPeriod,
  planDays,
  executeWrites,
  staleNotes,
  type Digest,
  versionsOf,
  type DayInput,
  type NoteWrites,
  type PlanPeriodInput,
} from './plans.js';
import {
  addHabits,
  addTasks,
  createWorkstream,
  editNote,
  setFrontmatter,
  updateTasks,
  type AddHabitsInput,
  type AddTasksInput,
  type CreateWorkstreamInput,
  type EditNoteInput,
  type FrontmatterValue,
  type TaskUpdate,
} from './note-edits.js';
import { rollOver } from './rollover.js';
import { reviewPeriod, type PeriodReview } from './review.js';
import {
  harvestWorkstream,
  executeHarvest,
  type HarvestPlan,
  type PacketInput,
} from './harvest.js';
import { plansView, type PlansView } from './plansview.js';
import { periodAt } from './plans.js';
import {
  addDays,
  interleave,
  isConceptNote,
  conceptBook,
  groupOf,
  topicOf,
  queueKey,
  READING_NOTES_TYPE,
  STRUCTURE_TYPE,
  type ConceptClimb,
} from './climb.js';
import {
  climbView,
  revealStructure,
  planSketch,
  listTopics,
  extendConcept,
  type ExtendConceptInput,
  type ExtendConceptPlan,
  SKETCHES_FOLDER,
  type ClimbView,
  type SketchPlan,
  type TopicListing,
} from './climb-writes.js';
import {
  addReadingNotes,
  writeStructure,
  saveGuideline,
  climbs,
  rebuildClimbs,
  conceptWithClimb,
  type ReadingNotesInput,
  type StructureInput,
  type GuidelineInput,
  type ClimbWritePlan,
  type ReadingNotesPlan,
  type StructurePlan,
  type GuidelinePlan,
} from './climb-writes.js';
import {
  COACH_ROOT,
  type VaultNote,
  type InvalidSession,
  type SessionRecord,
  histories,
  historyOf,
  type NoteHistory,
  tier2Payload,
  type Tier2Payload,
  planning,
  type Planning,
  type FrontmatterParser,
} from '@ai-coach/vault-domain';

export interface VaultDeps {
  store: NoteStore;
  frontmatter: FrontmatterParser;
  readPdf: PdfReader;
  rank: SearchRanker;
  digest: Digest;
  randomHex: (bytes: number) => string;
}

export interface VaultOptions {
  now?: () => Date;

  newSessionId?: (now: Date) => string;
  newCoachId?: () => string;
}

export interface NoteWithHistory extends VaultNote {
  history: NoteHistory;
}

export interface DueReport {
  today: string;

  due: {
    path: string;
    title: string;
    concept: boolean;
    coachId: string | null;
    nextReview: string;
    mastery: NoteHistory['mastery'];
    firstReview: boolean;
    book: string | null;
    group: string | null;
    topic: string | null;
  }[];

  unsparred: { path: string; title: string; concept: boolean }[];

  orphaned: { coachId: string; lastSession: string | null }[];
  invalidSessions: InvalidSession[];
}

export interface Vault {
  readonly root: string;

  pathOf(path: string): string | null;

  searchNotes(query: string, opts?: NoteSearchOptions): Promise<NoteHit[]>;

  viewGraph(): Promise<VaultViewGraph>;
  notes(): Promise<VaultNote[]>;

  note(path: string): Promise<VaultNote | null>;

  notesWithHistory(): Promise<{
    notes: NoteWithHistory[];
    invalidSessions: InvalidSession[];
  }>;
  sessions(): Promise<{ sessions: SessionRecord[]; invalid: InvalidSession[] }>;

  recordSession(
    input: RecordSessionInput,
    execute: boolean,
  ): Promise<RecordPlan & { executed: boolean }>;
  dueForReview(today?: string): Promise<DueReport>;

  tier2Payload(
    sessionId: string,
    opts?: { includeAssertions?: boolean },
  ): Promise<Tier2Payload | null>;

  initVault(execute: boolean, opts?: InitOptions): Promise<FilingResult>;
  capture(title: string, body: string, execute: boolean): Promise<FilingResult>;
  fileNote(
    path: string,
    toFolder: string,
    execute: boolean,
  ): Promise<FilingResult>;
  archiveProject(
    project: string,
    execute: boolean,
    opts?: ArchiveOptions,
  ): Promise<FilingResult>;

  listRaw(): Promise<RawListing[]>;
  convertRaw(
    path: string,
    execute: boolean,
    opts?: ConvertOptions,
  ): Promise<Omit<ConvertPlan, 'writes'> & { executed: boolean }>;

  findPassages(
    query: string,
    opts?: PassageSearchOptions,
  ): Promise<PassageHit[]>;
  createConcept(
    input: ConceptInput,
    execute: boolean,
  ): Promise<Omit<ConceptPlan, 'content'> & { executed: boolean }>;

  readingProgress(): Promise<BookProgress[]>;

  markedPassages(target: string): Promise<MarkedPassage[] | null>;

  markRead(
    book: string,
    date: string | undefined,
    execute: boolean,
  ): Promise<WriteResult>;

  writeSummary(
    path: string,
    text: string,
    page: number | undefined,
    execute: boolean,
  ): Promise<WriteResult>;

  pageText(
    path: string,
    page: number,
  ): Promise<{
    note: string;
    title: string;
    page: number;
    text: string;
    chapterSummary: string | null;
  } | null>;
  markPage(
    path: string,
    page: number,
    start: number,
    end: number,
    op: MarkOp,
    base: string,
  ): Promise<PublicEdit>;
  setSummary(
    path: string,
    page: number | null,
    text: string,
    base?: string,
  ): Promise<PublicEdit>;

  planning(): Promise<Planning>;

  planPeriod(
    input: PlanPeriodInput,
    execute: boolean,
    versions?: Versions,
  ): Promise<WriteOutcome<ReturnType<typeof planPeriod>>>;

  planDays(
    days: Record<string, DayInput>,
    execute: boolean,
    versions?: Versions,
  ): Promise<WriteOutcome<ReturnType<typeof planDays>>>;

  rollOver(
    period: string,
    execute: boolean,
    versions?: Versions,
  ): Promise<WriteOutcome<ReturnType<typeof rollOver>>>;

  updateTasks(
    updates: TaskUpdate[],
    execute: boolean,
    versions?: Versions,
  ): Promise<WriteOutcome<ReturnType<typeof updateTasks>>>;

  addTasks(
    input: AddTasksInput,
    execute: boolean,
    versions?: Versions,
  ): Promise<WriteOutcome<ReturnType<typeof addTasks>>>;

  addHabits(
    input: AddHabitsInput,
    execute: boolean,
    versions?: Versions,
  ): Promise<WriteOutcome<ReturnType<typeof addHabits>>>;

  setFrontmatter(
    note: string,
    set: Record<string, FrontmatterValue>,
    execute: boolean,
    versions?: Versions,
  ): Promise<WriteOutcome<ReturnType<typeof setFrontmatter>>>;

  editNote(
    input: EditNoteInput,
    execute: boolean,
    versions?: Versions,
  ): Promise<WriteOutcome<ReturnType<typeof editNote>>>;

  createWorkstream(
    input: CreateWorkstreamInput,
    execute: boolean,
    versions?: Versions,
  ): Promise<WriteOutcome<ReturnType<typeof createWorkstream>>>;

  reviewPeriod(
    period: string,
    today?: string,
  ): Promise<PeriodReview | { error: string }>;

  climb(note?: string): Promise<ConceptClimb[] | { error: string }>;

  rebuildClimb(
    execute: boolean,
    versions?: Versions,
  ): Promise<WriteOutcome<ClimbWritePlan>>;
  addReadingNotes(
    input: ReadingNotesInput,
    execute: boolean,
    versions?: Versions,
  ): Promise<WriteOutcome<ReadingNotesPlan>>;
  writeStructure(
    input: StructureInput,
    execute: boolean,
    versions?: Versions,
  ): Promise<WriteOutcome<StructurePlan>>;
  saveGuideline(
    input: GuidelineInput,
    execute: boolean,
  ): Promise<WriteOutcome<GuidelinePlan>>;

  extendConcept(
    input: ExtendConceptInput,
    execute: boolean,
    versions?: Versions,
  ): Promise<WriteOutcome<ExtendConceptPlan>>;

  listTopics(): Promise<TopicListing[]>;

  climbView(): Promise<ClimbView>;

  revealStructure(book: string): Promise<ReturnType<typeof revealStructure>>;

  saveSketch(
    target: string,
    png: Uint8Array,
    execute: boolean,
  ): Promise<SketchPlan & { executed: boolean }>;

  sketch(path: string): Promise<Uint8Array | null>;
  harvestWorkstream(
    project: string,
    workstream: string,
    packets: PacketInput[] | undefined,
    execute: boolean,
  ): Promise<HarvestResult>;

  plansView(span?: string, by?: string): Promise<PlansView | { error: string }>;
}

export type HarvestResult = Omit<HarvestPlan, 'writes'> & {
  executed: boolean;
  contents: Record<string, string>;
};

export type Versions = Record<string, string>;

export type WriteOutcome<T> = Omit<T, 'originals' | 'writes' | 'created'> & {
  versions: Versions;
  executed: boolean;
};

async function applyNoteWrites<T extends NoteWrites & { warnings: string[] }>(
  { store, digest }: Pick<VaultDeps, 'store' | 'digest'>,
  plan: T,
  execute: boolean,
  versions?: Versions,
): Promise<WriteOutcome<T>> {
  const { originals: _o, writes: _w, created: _c, ...rest } = plan;
  const shown = {
    ...rest,
    versions: versionsOf(
      Object.fromEntries(
        Object.keys(plan.writes)
          .filter((k) => k in plan.originals)
          .map((k) => [k, plan.originals[k]]),
      ),
      digest,
    ),
  };
  if (!execute || plan.errors.length) return { ...shown, executed: false };
  if (versions) {
    const stale = staleNotes(plan, versions, digest);
    if (stale.length) return { ...shown, errors: stale, executed: false };
  } else {
    shown.warnings = [
      ...plan.warnings,
      'written without versions: a change made since the preview was not checked',
    ];
  }
  await executeWrites(store, plan);
  return { ...shown, executed: true };
}

export type PublicEdit =
  | { ok: true; text: string }
  | { ok: false; status: 400 | 404 | 409; error: string; text?: string };

export type WriteResult = Omit<WritePlan, 'content' | 'before'> & {
  executed: boolean;
};

async function applyWrite(
  store: NoteStore,
  plan: WritePlan,
  execute: boolean,
): Promise<WriteResult> {
  const { content: _content, before: _before, ...shown } = plan;
  if (!execute || plan.errors.length) return { ...shown, executed: false };
  await executeWrite(store, plan);
  return { ...shown, executed: true };
}

export type FilingResult = Omit<FilingPlan, 'contents'> & { executed: boolean };

export interface RawListing extends RawItem {
  notes: string[];
  concepts: string[];
}

async function apply(
  store: NoteStore,
  plan: FilingPlan,
  execute: boolean,
): Promise<FilingResult> {
  const { contents: _contents, ...shown } = plan;
  if (!execute || plan.errors.length || plan.collisions.length)
    return { ...shown, executed: false };
  await executeFiling(store, plan);
  return { ...shown, executed: true };
}

export function vaultPathOf(path: string, separator = '/'): string {
  return posix.normalize(path.split(separator).join('/').replace(/^\/+/, ''));
}

export function notePathOf(path: string, separator = '/'): string | null {
  const rel = vaultPathOf(path, separator);
  if (!rel.endsWith('.md') || rel.startsWith('..') || /^[A-Za-z]:/.test(rel))
    return null;
  const parts = rel.split('/');
  if (parts.some((p) => p.startsWith('.')) || parts[0] === COACH_ROOT)
    return null;
  return rel;
}

export function createVault(deps: VaultDeps, opts: VaultOptions = {}): Vault {
  const { store, frontmatter: parse, randomHex } = deps;
  const root = store.root;
  const pathOf = (path: string) => notePathOf(path, store.separator);
  const now = opts.now ?? (() => new Date());
  const newSessionId =
    opts.newSessionId ??
    ((at: Date) =>
      `s-${at.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}-${randomHex(2)}`);
  const newCoachId = opts.newCoachId ?? (() => `c-${randomHex(5)}`);

  const snapshot = () => loadSnapshot(store, parse);

  const loadPdf: PdfLoader = async (path) =>
    deps.readPdf(await store.readBytes(path));

  async function notesWithHistory() {
    const [notes, { sessions, invalid }] = await Promise.all([
      scanVault(store, parse),
      loadSessions(store),
    ]);
    const map = histories(sessions);
    return {
      notes: notes.map((n) => ({ ...n, history: historyOf(map, n.coachId) })),
      invalidSessions: invalid,
      map,
    };
  }

  async function chapterAt(path: string) {
    const rel = pathOf(path);
    const note = rel ? await readNote(store, parse, rel) : null;
    if (!rel || !note || note.rawRole !== 'chapter') return null;
    return {
      path: rel,
      title: note.title,
      content: await store.readText(rel),
    };
  }

  async function edit(
    path: string,
    change: (content: string) => EditResult,
  ): Promise<PublicEdit> {
    const at = await chapterAt(path);
    if (!at)
      return {
        ok: false,
        status: 404,
        error: `${path} is not a chapter of a converted book`,
      };
    const r = change(at.content);
    if (!r.ok) return r;
    if ((await store.readText(at.path)) !== at.content)
      return {
        ok: false,
        status: 409,
        error: 'the note changed while saving; try again',
      };
    await store.writeText(at.path, r.content);
    return { ok: true, text: r.text };
  }

  const vault: Vault = {
    root,
    pathOf,
    viewGraph: () => writeViewGraph(vault, store, now()),
    searchNotes: async (query, opts) =>
      searchNotes(deps.rank, await scanVault(store, parse), query, opts),
    notes: () => scanVault(store, parse),
    async note(path) {
      const rel = pathOf(path);
      if (!rel) return null;
      return readNote(store, parse, rel);
    },
    async notesWithHistory() {
      const { notes, invalidSessions } = await notesWithHistory();
      return { notes, invalidSessions };
    },
    sessions: () => loadSessions(store),
    async recordSession(input, execute) {
      const at = now();
      const [tree, notes] = await snapshot();
      const plan = planSession(input, {
        tree,
        notes,
        sessions: (await loadSessions(store)).sessions,
        now: at,
        newSessionId: () => newSessionId(at),
        newCoachId,
        exists: (rel) => tree.exists(rel),
      });
      if (!execute || plan.errors.length) return { ...plan, executed: false };
      await executeSession(store, plan);
      return { ...plan, executed: true };
    },
    async dueForReview(today) {
      const day = today ?? localDate(now());
      const { notes, invalidSessions, map } = await notesWithHistory();
      const resources = notes.filter(
        (n) =>
          n.bucket === 'resources' &&
          !n.raw &&
          n.frontmatter.type !== READING_NOTES_TYPE &&
          n.frontmatter.type !== STRUCTURE_TYPE,
      );
      const carried = new Set(notes.map((n) => n.coachId).filter(Boolean));
      const created = (n: NoteWithHistory) =>
        typeof n.frontmatter.created === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(n.frontmatter.created)
          ? n.frontmatter.created
          : null;
      const dueOn = (
        n: NoteWithHistory,
      ): { date: string; first: boolean } | null => {
        if (n.history.nextReview !== null)
          return { date: n.history.nextReview, first: false };
        const c =
          isConceptNote(n) && n.history.mastery === 'unsparred'
            ? created(n)
            : null;
        return c ? { date: addDays(c, 1), first: true } : null;
      };
      const due = resources
        .map((n) => ({ n, at: dueOn(n) }))
        .filter(
          (
            x,
          ): x is {
            n: NoteWithHistory;
            at: { date: string; first: boolean };
          } => x.at !== null && x.at.date <= day,
        )
        .sort((a, b) =>
          a.at.date < b.at.date
            ? -1
            : a.at.date > b.at.date
              ? 1
              : a.n.path < b.n.path
                ? -1
                : a.n.path > b.n.path
                  ? 1
                  : 0,
        );
      return {
        today: day,
        due: interleave(due, (x) => queueKey(x.n, notes)).map(({ n, at }) => ({
          path: n.path,
          title: n.title,
          concept: n.concept,
          coachId: n.coachId,
          nextReview: at.date,
          mastery: n.history.mastery,
          firstReview: at.first,
          book: n.concept ? conceptBook(n, notes) : null,
          group: n.concept ? groupOf(n, notes) : null,
          topic: n.concept ? topicOf(n) : null,
        })),
        unsparred: resources
          .filter((n) => n.history.mastery === 'unsparred')
          .map((n) => ({ path: n.path, title: n.title, concept: n.concept })),
        orphaned: [...map.entries()]
          .filter(([id]) => !carried.has(id))
          .map(([coachId, h]) => ({ coachId, lastSession: h.lastSession })),
        invalidSessions,
      };
    },
    async tier2Payload(sessionId, opts) {
      const { sessions } = await loadSessions(store);
      const session = sessions.find((s) => s.session_id === sessionId);
      if (!session) return null;
      if (!opts?.includeAssertions) return tier2Payload(session);
      const assertions = new Map<string, string[]>();
      for (const n of await scanVault(store, parse)) {
        const concept = n.coachId ? conceptOf(n) : null;
        if (concept) assertions.set(n.coachId!, concept.fields.coreAssertions);
      }
      return tier2Payload(session, assertions);
    },
    initVault: async (execute, opts) =>
      apply(store, planInit(await loadTree(store, parse), opts), execute),
    capture: async (title, body, execute) =>
      apply(
        store,
        planCapture(await loadTree(store, parse), title, body),
        execute,
      ),
    async fileNote(path, toFolder, execute) {
      const rel = pathOf(path) ?? path;
      return apply(
        store,
        planFileNote(...(await snapshot()), rel, toFolder),
        execute,
      );
    },
    async archiveProject(project, execute, opts) {
      const [tree, notes] = await snapshot();
      return apply(
        store,
        planArchiveProject(tree, project, notes, opts),
        execute,
      );
    },
    async listRaw() {
      const [tree, notes] = await snapshot();
      const cited = citations(notes);
      return listRaw(tree, notes).map((item) => ({
        ...item,
        ...(cited.get(item.note ?? '') ?? { notes: [], concepts: [] }),
      }));
    },
    async convertRaw(path, execute, opts) {
      const plan = await planConvert(
        await loadTree(store, parse),
        loadPdf,
        vaultPathOf(path, store.separator),
        localDate(now()),
        opts,
      );
      const { writes: _writes, ...shown } = plan;
      if (!execute || plan.errors.length || plan.collisions.length)
        return { ...shown, executed: false };
      await executeConvert(store, plan);
      return { ...shown, executed: true };
    },
    readingProgress: async () => bookProgress(await scanVault(store, parse)),
    markedPassages: async (target) =>
      markedPassages(await scanVault(store, parse), pathOf(target) ?? target),
    markRead: async (book, date, execute) =>
      applyWrite(
        store,
        await planMarkRead(
          ...(await snapshot()),
          book,
          date ?? localDate(now()),
        ),
        execute,
      ),
    async writeSummary(path, text, page, execute) {
      const rel = pathOf(path) ?? path;
      return applyWrite(
        store,
        await planSummary(...(await snapshot()), rel, text, page),
        execute,
      );
    },
    async pageText(path, page) {
      const at = await chapterAt(path);
      if (!at || !Number.isInteger(page) || page < 1) return null;
      const section = pageSection(at.content, page);
      return section
        ? {
            note: at.path,
            title: at.title,
            page,
            text: section.text,
            chapterSummary: chapterSummaryOf(at.content),
          }
        : null;
    },
    async markPage(path, page, start, end, op, base) {
      if (!['bold', 'highlight', 'clear'].includes(op))
        return { ok: false, status: 400, error: `unknown mark ${String(op)}` };
      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        end <= start
      )
        return { ok: false, status: 400, error: 'select some text first' };
      return edit(path, (content) =>
        editPageContent(content, page, base, (text) =>
          applyMark(text, start, end, op),
        ),
      );
    },
    async setSummary(path, page, text, base) {
      if (typeof text !== 'string')
        return { ok: false, status: 400, error: 'the summary must be text' };
      return edit(path, (content) =>
        page === null
          ? setChapterSummary(content, text)
          : setPageSummary(content, page, text, base),
      );
    },
    planning: async () => planning(...(await snapshot())),
    async planPeriod(input, execute, versions) {
      const plan = planPeriod(...(await snapshot()), input);
      return applyNoteWrites(
        deps,
        { ...plan, created: plan.creates ? [plan.plan] : [] },
        execute,
        versions,
      );
    },
    planDays: async (days, execute, versions) =>
      applyNoteWrites(
        deps,
        planDays(...(await snapshot()), days),
        execute,
        versions,
      ),
    async updateTasks(updates, execute, versions) {
      const plan = updateTasks(
        ...(await snapshot()),
        updates,
        localDate(now()),
      );
      if (execute && !versions && updates.some((u) => u.line !== undefined)) {
        plan.errors.push(
          'a task addressed by line is updated only with the versions its preview returned, so a line that moved is not changed',
        );
      }
      return applyNoteWrites(deps, plan, execute, versions);
    },
    addTasks: async (input, execute, versions) =>
      applyNoteWrites(
        deps,
        addTasks(...(await snapshot()), input),
        execute,
        versions,
      ),
    addHabits: async (input, execute, versions) =>
      applyNoteWrites(
        deps,
        addHabits(...(await snapshot()), input),
        execute,
        versions,
      ),
    setFrontmatter: async (note, set, execute, versions) =>
      applyNoteWrites(
        deps,
        setFrontmatter(...(await snapshot()), note, set),
        execute,
        versions,
      ),
    editNote: async (input, execute, versions) =>
      applyNoteWrites(
        deps,
        editNote(...(await snapshot()), input),
        execute,
        versions,
      ),
    createWorkstream: async (input, execute, versions) =>
      applyNoteWrites(
        deps,
        createWorkstream(...(await snapshot()), input),
        execute,
        versions,
      ),
    async plansView(span, by) {
      const today = localDate(now());
      return plansView(
        ...(await snapshot()),
        span || periodAt('quarter', today).period,
        by || 'week',
        today,
      );
    },
    async harvestWorkstream(project, workstream, packets, execute) {
      const plan = harvestWorkstream(
        ...(await snapshot()),
        project,
        workstream,
        packets,
        localDate(now()),
      );
      const { writes, ...shown } = plan;
      const ok =
        execute &&
        !plan.errors.length &&
        !plan.collisions.length &&
        plan.packets.length > 0;
      if (ok) await executeHarvest(store, plan);
      return { ...shown, contents: writes, executed: ok };
    },
    reviewPeriod: async (period, today) =>
      reviewPeriod(...(await snapshot()), period, today ?? localDate(now())),
    rollOver: async (period, execute, versions) =>
      applyNoteWrites(
        deps,
        rollOver(...(await snapshot()), period),
        execute,
        versions,
      ),
    findPassages: async (query, opts) =>
      searchPassages(deps.rank, await scanVault(store, parse), query, opts),
    async climb(note) {
      return climbs(
        await scanVault(store, parse),
        (await loadSessions(store)).sessions,
        note,
      );
    },
    rebuildClimb: async (execute, versions) =>
      applyNoteWrites(
        deps,
        rebuildClimbs(
          ...(await snapshot()),
          (await loadSessions(store)).sessions,
        ),
        execute,
        versions,
      ),
    addReadingNotes: async (input, execute, versions) =>
      applyNoteWrites(
        deps,
        addReadingNotes(
          ...(await snapshot()),
          (await loadSessions(store)).sessions,
          input,
          localDate(now()),
        ),
        execute,
        versions,
      ),
    writeStructure: async (input, execute, versions) =>
      applyNoteWrites(
        deps,
        writeStructure(
          ...(await snapshot()),
          (await loadSessions(store)).sessions,
          input,
          localDate(now()),
        ),
        execute,
        versions,
      ),
    saveGuideline: async (input, execute) =>
      applyNoteWrites(
        deps,
        saveGuideline(
          ...(await snapshot()),
          (await loadSessions(store)).sessions,
          input,
        ),
        execute,
      ),
    async climbView() {
      const files = (await store.list(SKETCHES_FOLDER))
        .map((e) => e.name)
        .filter((f) => f.endsWith('.png'))
        .sort()
        .map((f) => posix.join(SKETCHES_FOLDER, f));
      return climbView(
        await scanVault(store, parse),
        (await loadSessions(store)).sessions,
        files,
      );
    },
    revealStructure: async (book) =>
      revealStructure(await scanVault(store, parse), book),
    listTopics: async () => listTopics(await scanVault(store, parse)),
    extendConcept: async (input, execute, versions) =>
      applyNoteWrites(
        deps,
        extendConcept(
          ...(await snapshot()),
          (await loadSessions(store)).sessions,
          input,
        ),
        execute,
        versions,
      ),
    async saveSketch(target, png, execute) {
      const plan = planSketch(
        ...(await snapshot()),
        target,
        png,
        localDate(now()),
      );
      if (!execute || plan.errors.length || !plan.path)
        return { ...plan, executed: false };
      await store.writeBytes(plan.path, png, { create: true });
      return { ...plan, executed: true };
    },
    async sketch(path) {
      const rel = posix.normalize(String(path).replace(/^\/+/, ''));
      if (
        !rel.startsWith(`${SKETCHES_FOLDER}/`) ||
        !rel.endsWith('.png') ||
        rel.includes('..') ||
        posix.dirname(rel) !== SKETCHES_FOLDER
      )
        return null;
      try {
        return await store.readBytes(rel);
      } catch {
        return null;
      }
    },
    async createConcept(input, execute) {
      const [tree, notes] = await snapshot();
      const plan = planConcept(tree, notes, input, localDate(now()));
      if (plan.content && plan.path)
        plan.content = conceptWithClimb(
          tree,
          plan.path,
          plan.content,
          notes,
          (await loadSessions(store)).sessions,
        );
      const { content: _content, ...shown } = plan;
      if (!execute || plan.errors.length || plan.collisions.length)
        return { ...shown, executed: false };
      await executeConcept(store, plan);
      return { ...shown, executed: true };
    },
  };
  return vault;
}
