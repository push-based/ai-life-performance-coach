import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, posix, resolve, sep } from 'node:path';
import { isInside } from './root.js';
import { COACH_ROOT } from './para.js';
import { listNotePaths, readNote, scanVault, type VaultNote } from './scan.js';
import {
  loadSessions,
  type InvalidSession,
  type SessionRecord,
} from './sessions.js';
import { histories, historyOf, type NoteHistory } from './mastery.js';
import {
  planSession,
  executeSession,
  localDate,
  type RecordPlan,
  type RecordSessionInput,
} from './record.js';
import { tier2Payload, type Tier2Payload } from './payload.js';
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
import { readFile, writeFile } from 'node:fs/promises';
import {
  searchPassages,
  type PassageHit,
  type PassageSearchOptions,
} from './search.js';
import { markedPassages, type MarkedPassage } from './marks.js';
import { planning, type Planning } from './planning.js';
import {
  planPeriod,
  planDays,
  executeWrites,
  staleNotes,
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
  listInterviewProblems,
  getInterviewProblem,
  saveInterviewProblem,
  logInterviewAttempt,
  type VaultInterviewProblem,
  type SaveVaultInterviewProblemInput,
  type LogVaultInterviewAttemptInput,
  type VaultInterviewWriteResult,
} from './interview.js';
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
import { readdir, mkdir as mkdirp } from 'node:fs/promises';
import { dirname } from 'node:path';
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
    png: Buffer,
    execute: boolean,
  ): Promise<SketchPlan & { executed: boolean }>;

  sketch(path: string): Promise<Buffer | null>;
  harvestWorkstream(
    project: string,
    workstream: string,
    packets: PacketInput[] | undefined,
    execute: boolean,
  ): Promise<HarvestResult>;

  plansView(span?: string, by?: string): Promise<PlansView | { error: string }>;

  listInterviewProblems(): Promise<VaultInterviewProblem[]>;
  getInterviewProblem(slug: string): Promise<VaultInterviewProblem | null>;
  saveInterviewProblem(
    input: SaveVaultInterviewProblemInput,
    execute: boolean,
  ): Promise<VaultInterviewWriteResult>;
  logInterviewAttempt(
    input: LogVaultInterviewAttemptInput,
    execute: boolean,
  ): Promise<VaultInterviewWriteResult>;
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
  root: string,
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
    ),
  };
  if (!execute || plan.errors.length) return { ...shown, executed: false };
  if (versions) {
    const stale = staleNotes(plan, versions);
    if (stale.length) return { ...shown, errors: stale, executed: false };
  } else {
    shown.warnings = [
      ...plan.warnings,
      'written without versions: a change made since the preview was not checked',
    ];
  }
  await executeWrites(root, plan);
  return { ...shown, executed: true };
}

export type PublicEdit =
  | { ok: true; text: string }
  | { ok: false; status: 400 | 404 | 409; error: string; text?: string };

export type WriteResult = Omit<WritePlan, 'content' | 'before'> & {
  executed: boolean;
};

async function applyWrite(
  root: string,
  plan: WritePlan,
  execute: boolean,
): Promise<WriteResult> {
  const { content: _content, before: _before, ...shown } = plan;
  if (!execute || plan.errors.length) return { ...shown, executed: false };
  await executeWrite(root, plan);
  return { ...shown, executed: true };
}

export type FilingResult = Omit<FilingPlan, 'contents'> & { executed: boolean };

export interface RawListing extends RawItem {
  notes: string[];
  concepts: string[];
}

async function apply(
  root: string,
  plan: FilingPlan,
  execute: boolean,
): Promise<FilingResult> {
  const { contents: _contents, ...shown } = plan;
  if (!execute || plan.errors.length || plan.collisions.length)
    return { ...shown, executed: false };
  await executeFiling(root, plan);
  return { ...shown, executed: true };
}

export function notePathOf(root: string, path: string): string | null {
  const rel = posix.normalize(path.split(sep).join('/').replace(/^\/+/, ''));
  if (!rel.endsWith('.md') || rel.startsWith('..')) return null;
  if (!isInside(resolve(root, rel), root)) return null;
  const parts = rel.split('/');
  if (parts.some((p) => p.startsWith('.')) || parts[0] === COACH_ROOT)
    return null;
  return rel;
}

const defaultSessionId = (now: Date) =>
  `s-${now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}-${randomBytes(2).toString('hex')}`;
const defaultCoachId = () => `c-${randomBytes(5).toString('hex')}`;

export function createVault(root: string, opts: VaultOptions = {}): Vault {
  const now = opts.now ?? (() => new Date());
  const newSessionId = opts.newSessionId ?? defaultSessionId;
  const newCoachId = opts.newCoachId ?? defaultCoachId;

  async function notesWithHistory() {
    const [notes, { sessions, invalid }] = await Promise.all([
      scanVault(root),
      loadSessions(root),
    ]);
    const map = histories(sessions);
    return {
      notes: notes.map((n) => ({ ...n, history: historyOf(map, n.coachId) })),
      invalidSessions: invalid,
      map,
    };
  }

  async function chapterAt(path: string) {
    const rel = notePathOf(root, path);
    if (!rel || !(await listNotePaths(root)).includes(rel)) return null;
    const note = await readNote(root, rel);
    if (note.rawRole !== 'chapter') return null;
    return {
      path: rel,
      title: note.title,
      content: await readFile(join(root, rel), 'utf-8'),
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
    const abs = join(root, at.path);
    if ((await readFile(abs, 'utf-8')) !== at.content)
      return {
        ok: false,
        status: 409,
        error: 'the note changed while saving; try again',
      };
    await writeFile(abs, r.content);
    return { ok: true, text: r.text };
  }

  return {
    root,
    notes: () => scanVault(root),
    async note(path) {
      const rel = notePathOf(root, path);
      if (!rel) return null;
      const all = await listNotePaths(root);
      return all.includes(rel) ? readNote(root, rel) : null;
    },
    async notesWithHistory() {
      const { notes, invalidSessions } = await notesWithHistory();
      return { notes, invalidSessions };
    },
    sessions: () => loadSessions(root),
    async recordSession(input, execute) {
      const at = now();
      const plan = planSession(input, {
        root,
        notes: await scanVault(root),
        sessions: (await loadSessions(root)).sessions,
        now: at,
        newSessionId: () => newSessionId(at),
        newCoachId,
        exists: (rel) => existsSync(join(root, rel)),
      });
      if (!execute || plan.errors.length) return { ...plan, executed: false };
      await executeSession(root, plan);
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
      const { sessions } = await loadSessions(root);
      const session = sessions.find((s) => s.session_id === sessionId);
      if (!session) return null;
      if (!opts?.includeAssertions) return tier2Payload(session);
      const assertions = new Map<string, string[]>();
      for (const n of await scanVault(root)) {
        const concept = n.coachId ? conceptOf(n) : null;
        if (concept) assertions.set(n.coachId!, concept.fields.coreAssertions);
      }
      return tier2Payload(session, assertions);
    },
    initVault: async (execute, opts) =>
      apply(root, await planInit(root, opts), execute),
    capture: async (title, body, execute) =>
      apply(root, planCapture(root, title, body), execute),
    async fileNote(path, toFolder, execute) {
      const rel = notePathOf(root, path) ?? path;
      return apply(
        root,
        planFileNote(root, await scanVault(root), rel, toFolder),
        execute,
      );
    },
    archiveProject: async (project, execute, opts) =>
      apply(
        root,
        planArchiveProject(root, project, await scanVault(root), opts),
        execute,
      ),
    async listRaw() {
      const notes = await scanVault(root);
      const cited = citations(notes);
      return (await listRaw(root, notes)).map((item) => ({
        ...item,
        ...(cited.get(item.note ?? '') ?? { notes: [], concepts: [] }),
      }));
    },
    async convertRaw(path, execute, opts) {
      const plan = await planConvert(
        root,
        posix.normalize(path.split(sep).join('/').replace(/^\/+/, '')),
        localDate(now()),
        opts,
      );
      const { writes: _writes, ...shown } = plan;
      if (!execute || plan.errors.length || plan.collisions.length)
        return { ...shown, executed: false };
      await executeConvert(root, plan);
      return { ...shown, executed: true };
    },
    readingProgress: async () => bookProgress(await scanVault(root)),
    markedPassages: async (target) =>
      markedPassages(await scanVault(root), notePathOf(root, target) ?? target),
    markRead: async (book, date, execute) =>
      applyWrite(
        root,
        await planMarkRead(
          root,
          await scanVault(root),
          book,
          date ?? localDate(now()),
        ),
        execute,
      ),
    async writeSummary(path, text, page, execute) {
      const rel = notePathOf(root, path) ?? path;
      return applyWrite(
        root,
        await planSummary(root, await scanVault(root), rel, text, page),
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
    planning: async () => planning(root, await scanVault(root)),
    async planPeriod(input, execute, versions) {
      const plan = planPeriod(root, await scanVault(root), input);
      return applyNoteWrites(
        root,
        { ...plan, created: plan.creates ? [plan.plan] : [] },
        execute,
        versions,
      );
    },
    planDays: async (days, execute, versions) =>
      applyNoteWrites(
        root,
        planDays(root, await scanVault(root), days),
        execute,
        versions,
      ),
    async updateTasks(updates, execute, versions) {
      const plan = updateTasks(
        root,
        await scanVault(root),
        updates,
        localDate(now()),
      );
      if (execute && !versions && updates.some((u) => u.line !== undefined)) {
        plan.errors.push(
          'a task addressed by line is updated only with the versions its preview returned, so a line that moved is not changed',
        );
      }
      return applyNoteWrites(root, plan, execute, versions);
    },
    addTasks: async (input, execute, versions) =>
      applyNoteWrites(
        root,
        addTasks(root, await scanVault(root), input),
        execute,
        versions,
      ),
    addHabits: async (input, execute, versions) =>
      applyNoteWrites(
        root,
        addHabits(root, await scanVault(root), input),
        execute,
        versions,
      ),
    setFrontmatter: async (note, set, execute, versions) =>
      applyNoteWrites(
        root,
        setFrontmatter(root, await scanVault(root), note, set),
        execute,
        versions,
      ),
    editNote: async (input, execute, versions) =>
      applyNoteWrites(
        root,
        editNote(root, await scanVault(root), input),
        execute,
        versions,
      ),
    createWorkstream: async (input, execute, versions) =>
      applyNoteWrites(
        root,
        createWorkstream(root, await scanVault(root), input),
        execute,
        versions,
      ),
    async plansView(span, by) {
      const today = localDate(now());
      return plansView(
        root,
        await scanVault(root),
        span || periodAt('quarter', today).period,
        by || 'week',
        today,
      );
    },
    async harvestWorkstream(project, workstream, packets, execute) {
      const plan = harvestWorkstream(
        root,
        await scanVault(root),
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
      if (ok) await executeHarvest(root, plan);
      return { ...shown, contents: writes, executed: ok };
    },
    reviewPeriod: async (period, today) =>
      reviewPeriod(
        root,
        await scanVault(root),
        period,
        today ?? localDate(now()),
      ),
    rollOver: async (period, execute, versions) =>
      applyNoteWrites(
        root,
        rollOver(root, await scanVault(root), period),
        execute,
        versions,
      ),
    findPassages: async (query, opts) =>
      searchPassages(await scanVault(root), query, opts),
    async climb(note) {
      return climbs(
        await scanVault(root),
        (await loadSessions(root)).sessions,
        note,
      );
    },
    rebuildClimb: async (execute, versions) =>
      applyNoteWrites(
        root,
        rebuildClimbs(
          root,
          await scanVault(root),
          (await loadSessions(root)).sessions,
        ),
        execute,
        versions,
      ),
    addReadingNotes: async (input, execute, versions) =>
      applyNoteWrites(
        root,
        addReadingNotes(
          root,
          await scanVault(root),
          (await loadSessions(root)).sessions,
          input,
          localDate(now()),
        ),
        execute,
        versions,
      ),
    writeStructure: async (input, execute, versions) =>
      applyNoteWrites(
        root,
        writeStructure(
          root,
          await scanVault(root),
          (await loadSessions(root)).sessions,
          input,
          localDate(now()),
        ),
        execute,
        versions,
      ),
    saveGuideline: async (input, execute) =>
      applyNoteWrites(
        root,
        saveGuideline(
          root,
          await scanVault(root),
          (await loadSessions(root)).sessions,
          input,
        ),
        execute,
      ),
    async climbView() {
      let files: string[] = [];
      try {
        files = (await readdir(join(root, SKETCHES_FOLDER)))
          .filter((f) => f.endsWith('.png'))
          .sort()
          .map((f) => posix.join(SKETCHES_FOLDER, f));
      } catch {
        files = [];
      }
      return climbView(
        await scanVault(root),
        (await loadSessions(root)).sessions,
        files,
      );
    },
    revealStructure: async (book) =>
      revealStructure(await scanVault(root), book),
    listTopics: async () => listTopics(await scanVault(root)),
    extendConcept: async (input, execute, versions) =>
      applyNoteWrites(
        root,
        extendConcept(
          root,
          await scanVault(root),
          (await loadSessions(root)).sessions,
          input,
        ),
        execute,
        versions,
      ),
    async saveSketch(target, png, execute) {
      const plan = planSketch(
        root,
        await scanVault(root),
        target,
        png,
        localDate(now()),
      );
      if (!execute || plan.errors.length || !plan.path)
        return { ...plan, executed: false };
      await mkdirp(dirname(join(root, plan.path)), { recursive: true });
      await writeFile(join(root, plan.path), png, { flag: 'wx' });
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
        return await readFile(join(root, rel));
      } catch {
        return null;
      }
    },
    async createConcept(input, execute) {
      const notes = await scanVault(root);
      const plan = planConcept(root, notes, input, localDate(now()));
      if (plan.content && plan.path)
        plan.content = conceptWithClimb(
          plan.path,
          plan.content,
          notes,
          (await loadSessions(root)).sessions,
        );
      const { content: _content, ...shown } = plan;
      if (!execute || plan.errors.length || plan.collisions.length)
        return { ...shown, executed: false };
      await executeConcept(root, plan);
      return { ...shown, executed: true };
    },
    listInterviewProblems: () => listInterviewProblems(root),
    getInterviewProblem: (slug) => getInterviewProblem(root, slug),
    saveInterviewProblem: (input, execute) =>
      saveInterviewProblem(root, input, execute),
    logInterviewAttempt: (input, execute) =>
      logInterviewAttempt(root, input, execute),
  };
}
