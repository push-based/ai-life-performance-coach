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
import { planInit, planCapture, planFileNote, planArchiveProject, executeFiling, type FilingPlan } from "./filing.js";
import { listRaw, planConvert, executeConvert, type RawItem, type ConvertPlan } from "./convert.js";

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
  /** Resources notes whose latest session's next review date is on or before today. */
  due: { path: string; title: string; coachId: string; nextReview: string; mastery: NoteHistory["mastery"] }[];
  /** Resources notes no session covers. */
  unsparred: { path: string; title: string }[];
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
  /** The judge-tier payload for one session; null when no such session exists. */
  tier2Payload(sessionId: string): Promise<Tier2Payload | null>;
  /** Filing (Phase 3): each previews, and with `execute` applies a clean plan. */
  initVault(execute: boolean): Promise<FilingResult>;
  capture(title: string, body: string, execute: boolean): Promise<FilingResult>;
  fileNote(path: string, toFolder: string, execute: boolean): Promise<FilingResult>;
  archiveProject(project: string, execute: boolean): Promise<FilingResult>;
  /** Raw resources (ADR-KI-0059): every file under 3.Resources/0.Raw, and one-time PDF conversion. */
  listRaw(): Promise<RawItem[]>;
  convertRaw(path: string, execute: boolean): Promise<Omit<ConvertPlan, "content"> & { executed: boolean }>;
}

export type FilingResult = Omit<FilingPlan, "contents"> & { executed: boolean };

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
      const resources = notes.filter(n => n.bucket === "resources");
      const carried = new Set(notes.map(n => n.coachId).filter(Boolean));
      return {
        today: day,
        due: resources
          .filter(n => n.history.nextReview !== null && n.history.nextReview <= day)
          .sort((a, b) => (a.history.nextReview! < b.history.nextReview! ? -1 : a.history.nextReview! > b.history.nextReview! ? 1 : 0))
          .map(n => ({ path: n.path, title: n.title, coachId: n.coachId!, nextReview: n.history.nextReview!, mastery: n.history.mastery })),
        unsparred: resources.filter(n => n.history.mastery === "unsparred").map(n => ({ path: n.path, title: n.title })),
        orphaned: [...map.entries()].filter(([id]) => !carried.has(id)).map(([coachId, h]) => ({ coachId, lastSession: h.lastSession })),
        invalidSessions,
      };
    },
    async tier2Payload(sessionId) {
      const { sessions } = await loadSessions(root);
      const session = sessions.find(s => s.session_id === sessionId);
      return session ? tier2Payload(session) : null;
    },
    initVault: async execute => apply(root, await planInit(root), execute),
    capture: async (title, body, execute) => apply(root, planCapture(root, title, body), execute),
    async fileNote(path, toFolder, execute) {
      const rel = notePathOf(root, path) ?? path;
      return apply(root, planFileNote(root, await scanVault(root), rel, toFolder), execute);
    },
    archiveProject: async (project, execute) => apply(root, planArchiveProject(root, project), execute),
    listRaw: async () => listRaw(root, await scanVault(root)),
    async convertRaw(path, execute) {
      const plan = await planConvert(root, posix.normalize(path.split(sep).join("/").replace(/^\/+/, "")), localDate(now()));
      const { content: _content, ...shown } = plan;
      if (!execute || plan.errors.length || plan.collisions.length) return { ...shown, executed: false };
      await executeConvert(root, plan);
      return { ...shown, executed: true };
    },
  };
}
