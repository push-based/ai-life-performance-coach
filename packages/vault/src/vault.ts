/**
 * The vault handle: one resolved root, and the operations the vault server's tools
 * call. Every call rescans, so an edit made in Obsidian is visible on the next call
 * without a cache to invalidate.
 */

import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join, posix, resolve, sep } from "node:path";
import { isInside } from "./root.js";
import { COACH_ROOT } from "./para.js";
import { listNotePaths, readNote, scanVault, type VaultNote } from "./scan.js";
import { loadSessions, type InvalidSession, type SessionRecord } from "./sessions.js";
import { histories, historyOf, type NoteHistory } from "./mastery.js";
import { planSession, executeSession, localDate, type RecordPlan, type RecordSessionInput } from "./record.js";
import { tier2Payload, type Tier2Payload } from "./payload.js";
import { planInit, planCapture, planFileNote, planArchiveProject, executeFiling, type FilingPlan, type ArchiveOptions } from "./filing.js";
import { listRaw, planConvert, executeConvert, type RawItem, type ConvertPlan, type ConvertOptions } from "./convert.js";
import { planConcept, executeConcept, conceptOf, type ConceptInput, type ConceptPlan } from "./concept.js";
import { bookProgress, citations, planMarkRead, planSummary, executeWrite, applyMark, editPageContent, setPageSummary, setChapterSummary, chapterSummaryOf, pageSection, type BookProgress, type WritePlan, type MarkOp, type EditResult } from "./distill.js";
import { readFile, writeFile } from "node:fs/promises";
import { searchPassages, type PassageHit, type PassageSearchOptions } from "./search.js";
import { markedPassages, type MarkedPassage } from "./marks.js";
import { planning, type Planning } from "./planning.js";

export interface VaultOptions {
  /** The clock; injectable so tests can fix "today". */
  now?: () => Date;
  /** Id generators; injectable so tests get stable ids. */
  newSessionId?: (now: Date) => string;
  newCoachId?: () => string;
}

export interface NoteWithHistory extends VaultNote {
  history: NoteHistory;
}

export interface DueReport {
  today: string;
  /** Sparrable notes (Resources outside 0.Raw) whose latest session's next review date is on or before today. */
  due: { path: string; title: string; concept: boolean; coachId: string; nextReview: string; mastery: NoteHistory["mastery"] }[];
  /** Sparrable notes no session covers. */
  unsparred: { path: string; title: string; concept: boolean }[];
  /** Sessions naming a coach_id no note carries any more. */
  orphaned: { coachId: string; lastSession: string | null }[];
  invalidSessions: InvalidSession[];
}

export interface Vault {
  readonly root: string;
  notes(): Promise<VaultNote[]>;
  /** A note by vault-relative path; null when it is not a note of this vault. */
  note(path: string): Promise<VaultNote | null>;
  /** Every note with its sparring history. */
  notesWithHistory(): Promise<{ notes: NoteWithHistory[]; invalidSessions: InvalidSession[] }>;
  sessions(): Promise<{ sessions: SessionRecord[]; invalid: InvalidSession[] }>;
  /** Preview a session; with `execute`, write it and any new coach_ids. */
  recordSession(input: RecordSessionInput, execute: boolean): Promise<RecordPlan & { executed: boolean }>;
  dueForReview(today?: string): Promise<DueReport>;
  /**
   * The judge-tier payload for one session; null when no such session exists. With
   * `includeAssertions`, each item also carries its concept note's core assertions.
   */
  tier2Payload(sessionId: string, opts?: { includeAssertions?: boolean }): Promise<Tier2Payload | null>;
  /** Filing (Phase 3): each previews, and with `execute` applies a clean plan. */
  initVault(execute: boolean): Promise<FilingResult>;
  capture(title: string, body: string, execute: boolean): Promise<FilingResult>;
  fileNote(path: string, toFolder: string, execute: boolean): Promise<FilingResult>;
  archiveProject(project: string, execute: boolean, opts?: ArchiveOptions): Promise<FilingResult>;
  /** Raw resources (ADR-KI-0059): every file under 3.Resources/0.Raw, and one-time PDF conversion. */
  listRaw(): Promise<RawListing[]>;
  convertRaw(path: string, execute: boolean, opts?: ConvertOptions): Promise<Omit<ConvertPlan, "writes"> & { executed: boolean }>;
  /** Concept notes (ADR-KI-0060): page-level search over raw text, and writing a verified concept note. */
  findPassages(query: string, opts?: PassageSearchOptions): Promise<PassageHit[]>;
  createConcept(input: ConceptInput, execute: boolean): Promise<Omit<ConceptPlan, "content"> & { executed: boolean }>;
  /** Reading progress (ADR-KI-0061): each converted book's stage and each chapter's distilling. */
  readingProgress(): Promise<BookProgress[]>;
  /**
   * The user's bold and highlights as whole-sentence passages ready to quote (ADR-KI-0061
   * Decision 11), for one chapter or every chapter of a book; null for any other path.
   */
  markedPassages(target: string): Promise<MarkedPassage[] | null>;
  /** Mark a book read, by its index or work folder; the date defaults to today. */
  markRead(book: string, date: string | undefined, execute: boolean): Promise<WriteResult>;
  /** Add a summary callout to a chapter, or to one of its pages. */
  writeSummary(path: string, text: string, page: number | undefined, execute: boolean): Promise<WriteResult>;
  /**
   * Editing a chapter from the graph view (ADR-KI-0061 Decision 10): the user's click is
   * the approval, so these write at once. Each refuses a note that is not a chapter, and
   * an edit made against page text that has changed since it was shown.
   */
  pageText(path: string, page: number): Promise<{ note: string; title: string; page: number; text: string; chapterSummary: string | null } | null>;
  markPage(path: string, page: number, start: number, end: number, op: MarkOp, base: string): Promise<PublicEdit>;
  setSummary(path: string, page: number | null, text: string, base?: string): Promise<PublicEdit>;
  /** Projects, workstreams, areas, plans and their tasks (ADR-KI-0062). */
  planning(): Promise<Planning>;
}

export type PublicEdit = { ok: true; text: string } | { ok: false; status: 400 | 404 | 409; error: string; text?: string };

export type WriteResult = Omit<WritePlan, "content" | "before"> & { executed: boolean };

async function applyWrite(root: string, plan: WritePlan, execute: boolean): Promise<WriteResult> {
  const { content: _content, before: _before, ...shown } = plan;
  if (!execute || plan.errors.length) return { ...shown, executed: false };
  await executeWrite(root, plan);
  return { ...shown, executed: true };
}

export type FilingResult = Omit<FilingPlan, "contents"> & { executed: boolean };

/** A raw file with what was made from it (ADR-KI-0061): the user's notes and concept notes. */
export interface RawListing extends RawItem {
  notes: string[];
  concepts: string[];
}

async function apply(root: string, plan: FilingPlan, execute: boolean): Promise<FilingResult> {
  const { contents: _contents, ...shown } = plan;
  if (!execute || plan.errors.length || plan.collisions.length) return { ...shown, executed: false };
  await executeFiling(root, plan);
  return { ...shown, executed: true };
}

/**
 * Normalize a caller-supplied path to a vault-relative note path, or null when it
 * escapes the vault, names a dot-folder or `Coach/`, or is not markdown.
 */
export function notePathOf(root: string, path: string): string | null {
  const rel = posix.normalize(path.split(sep).join("/").replace(/^\/+/, ""));
  if (!rel.endsWith(".md") || rel.startsWith("..")) return null;
  if (!isInside(resolve(root, rel), root)) return null;
  const parts = rel.split("/");
  if (parts.some(p => p.startsWith(".")) || parts[0] === COACH_ROOT) return null;
  return rel;
}

const defaultSessionId = (now: Date) =>
  `s-${now.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-")}-${randomBytes(2).toString("hex")}`;
const defaultCoachId = () => `c-${randomBytes(5).toString("hex")}`;

export function createVault(root: string, opts: VaultOptions = {}): Vault {
  const now = opts.now ?? (() => new Date());
  const newSessionId = opts.newSessionId ?? defaultSessionId;
  const newCoachId = opts.newCoachId ?? defaultCoachId;

  async function notesWithHistory() {
    const [notes, { sessions, invalid }] = await Promise.all([scanVault(root), loadSessions(root)]);
    const map = histories(sessions);
    return { notes: notes.map(n => ({ ...n, history: historyOf(map, n.coachId) })), invalidSessions: invalid, map };
  }

  /** A chapter note by path, with its raw content; null for anything else. */
  async function chapterAt(path: string) {
    const rel = notePathOf(root, path);
    if (!rel || !(await listNotePaths(root)).includes(rel)) return null;
    const note = await readNote(root, rel);
    if (note.rawRole !== "chapter") return null;
    return { path: rel, title: note.title, content: await readFile(join(root, rel), "utf-8") };
  }

  /** Apply an edit to a chapter note, refusing if the file changed while it was computed. */
  async function edit(path: string, change: (content: string) => EditResult): Promise<PublicEdit> {
    const at = await chapterAt(path);
    if (!at) return { ok: false, status: 404, error: `${path} is not a chapter of a converted book` };
    const r = change(at.content);
    if (!r.ok) return r;
    const abs = join(root, at.path);
    if ((await readFile(abs, "utf-8")) !== at.content) return { ok: false, status: 409, error: "the note changed while saving; try again" };
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
        now: at,
        newSessionId: () => newSessionId(at),
        newCoachId,
        exists: rel => existsSync(join(root, rel)),
      });
      if (!execute || plan.errors.length) return { ...plan, executed: false };
      await executeSession(root, plan);
      return { ...plan, executed: true };
    },
    async dueForReview(today) {
      const day = today ?? localDate(now());
      const { notes, invalidSessions, map } = await notesWithHistory();
      const resources = notes.filter(n => n.bucket === "resources" && !n.raw);
      const carried = new Set(notes.map(n => n.coachId).filter(Boolean));
      return {
        today: day,
        due: resources
          .filter(n => n.history.nextReview !== null && n.history.nextReview <= day)
          .sort((a, b) => (a.history.nextReview! < b.history.nextReview! ? -1 : a.history.nextReview! > b.history.nextReview! ? 1 : 0))
          .map(n => ({ path: n.path, title: n.title, concept: n.concept, coachId: n.coachId!, nextReview: n.history.nextReview!, mastery: n.history.mastery })),
        unsparred: resources.filter(n => n.history.mastery === "unsparred").map(n => ({ path: n.path, title: n.title, concept: n.concept })),
        orphaned: [...map.entries()].filter(([id]) => !carried.has(id)).map(([coachId, h]) => ({ coachId, lastSession: h.lastSession })),
        invalidSessions,
      };
    },
    async tier2Payload(sessionId, opts) {
      const { sessions } = await loadSessions(root);
      const session = sessions.find(s => s.session_id === sessionId);
      if (!session) return null;
      if (!opts?.includeAssertions) return tier2Payload(session);
      const assertions = new Map<string, string[]>();
      for (const n of await scanVault(root)) {
        const concept = n.coachId ? conceptOf(n) : null;
        if (concept) assertions.set(n.coachId!, concept.fields.coreAssertions);
      }
      return tier2Payload(session, assertions);
    },
    initVault: async execute => apply(root, await planInit(root), execute),
    capture: async (title, body, execute) => apply(root, planCapture(root, title, body), execute),
    async fileNote(path, toFolder, execute) {
      const rel = notePathOf(root, path) ?? path;
      return apply(root, planFileNote(root, await scanVault(root), rel, toFolder), execute);
    },
    archiveProject: async (project, execute, opts) => apply(root, planArchiveProject(root, project, await scanVault(root), opts), execute),
    async listRaw() {
      const notes = await scanVault(root);
      const cited = citations(notes);
      return (await listRaw(root, notes)).map(item => ({ ...item, ...(cited.get(item.note ?? "") ?? { notes: [], concepts: [] }) }));
    },
    async convertRaw(path, execute, opts) {
      const plan = await planConvert(root, posix.normalize(path.split(sep).join("/").replace(/^\/+/, "")), localDate(now()), opts);
      const { writes: _writes, ...shown } = plan;
      if (!execute || plan.errors.length || plan.collisions.length) return { ...shown, executed: false };
      await executeConvert(root, plan);
      return { ...shown, executed: true };
    },
    readingProgress: async () => bookProgress(await scanVault(root)),
    markedPassages: async target => markedPassages(await scanVault(root), notePathOf(root, target) ?? target),
    markRead: async (book, date, execute) => applyWrite(root, await planMarkRead(root, await scanVault(root), book, date ?? localDate(now())), execute),
    async writeSummary(path, text, page, execute) {
      const rel = notePathOf(root, path) ?? path;
      return applyWrite(root, await planSummary(root, await scanVault(root), rel, text, page), execute);
    },
    async pageText(path, page) {
      const at = await chapterAt(path);
      if (!at || !Number.isInteger(page) || page < 1) return null;
      const section = pageSection(at.content, page);
      return section ? { note: at.path, title: at.title, page, text: section.text, chapterSummary: chapterSummaryOf(at.content) } : null;
    },
    async markPage(path, page, start, end, op, base) {
      if (!["bold", "highlight", "clear"].includes(op)) return { ok: false, status: 400, error: `unknown mark ${String(op)}` };
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) return { ok: false, status: 400, error: "select some text first" };
      return edit(path, content => editPageContent(content, page, base, text => applyMark(text, start, end, op)));
    },
    async setSummary(path, page, text, base) {
      if (typeof text !== "string") return { ok: false, status: 400, error: "the summary must be text" };
      return edit(path, content => (page === null ? setChapterSummary(content, text) : setPageSummary(content, page, text, base)));
    },
    planning: async () => planning(root, await scanVault(root)),
    findPassages: async (query, opts) => searchPassages(await scanVault(root), query, opts),
    async createConcept(input, execute) {
      const plan = planConcept(root, await scanVault(root), input, localDate(now()));
      const { content: _content, ...shown } = plan;
      if (!execute || plan.errors.length || plan.collisions.length) return { ...shown, executed: false };
      await executeConcept(root, plan);
      return { ...shown, executed: true };
    },
  };
}
