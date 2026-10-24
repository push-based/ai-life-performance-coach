/**
 * `record_session` (ADR-KI-0058 Decisions 5, 6 and 9): validate a finished sparring
 * session, preview what it would write, and write it only on `execute`. A note gains a
 * `coach_id` in the same step the first time it is sparred. Only notes under
 * `3.Resources` can be sparred, and no write ever overwrites an existing file.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { insertCoachId, declaresCoachId } from "./identity.js";
import { renderSession, sessionPath, isDate, type SessionRecord, type SessionItem, type Tier, type Verdict } from "./sessions.js";
import type { VaultNote } from "./scan.js";

export interface SessionItemInput {
  /** The note, by vault-relative path or by coach_id; exactly one. */
  note?: string;
  coach_id?: string;
  challenge: string;
  answer: string;
  verdict: Verdict;
  gaps?: string[];
  next_review: string;
}

export interface RecordSessionInput {
  tier: Tier;
  /** YYYY-MM-DD; defaults to the clock's local date. */
  date?: string;
  items: SessionItemInput[];
}

export interface RecordPlan {
  errors: string[];
  record: SessionRecord | null;
  /** Vault-relative path the session file would be written to. */
  sessionFile: string | null;
  /** Notes that gain a coach_id, with the id each would get. */
  newIds: { path: string; coach_id: string }[];
}

export interface RecordContext {
  root: string;
  notes: VaultNote[];
  now: Date;
  newSessionId: () => string;
  newCoachId: () => string;
  /** True when a vault-relative path already exists. */
  exists: (rel: string) => boolean;
}

export function localDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function planSession(input: RecordSessionInput, ctx: RecordContext): RecordPlan {
  const errors: string[] = [];
  const fail = (e: string): RecordPlan => ({ errors: [...errors, e], record: null, sessionFile: null, newIds: [] });
  if (input.tier !== 1 && input.tier !== 2) return fail("tier must be 1 or 2");
  const date = input.date ?? localDate(ctx.now);
  if (!isDate(date)) return fail(`date ${date} is not YYYY-MM-DD`);
  if (!Array.isArray(input.items) || input.items.length === 0) return fail("a session covers at least one note");

  const sessionId = ctx.newSessionId();
  const byPath = new Map(ctx.notes.map(n => [n.path, n]));
  const byCoachId = new Map(ctx.notes.filter(n => n.coachId).map(n => [n.coachId!, n]));
  const taken = new Set(byCoachId.keys());
  const newIds: RecordPlan["newIds"] = [];
  const seen = new Set<string>();
  const items: SessionItem[] = [];

  input.items.forEach((it, n) => {
    const at = `items[${n}]`;
    if (!!it.note === !!it.coach_id) { errors.push(`${at}: name the note by path or by coach_id, not both or neither`); return; }
    const note = it.note ? byPath.get(it.note) : byCoachId.get(it.coach_id!);
    if (!note) { errors.push(`${at}: no note ${it.note ?? `with coach_id ${it.coach_id}`}`); return; }
    if (note.bucket !== "resources") { errors.push(`${at}: ${note.path} is not under 3.Resources; only Resources notes are sparred`); return; }
    if (seen.has(note.path)) { errors.push(`${at}: ${note.path} appears twice in one session`); return; }
    seen.add(note.path);
    if (typeof it.challenge !== "string" || !it.challenge.trim()) errors.push(`${at}: challenge is empty`);
    if (typeof it.answer !== "string") errors.push(`${at}: answer must be a string`);
    if (it.verdict !== "pass" && it.verdict !== "fail") errors.push(`${at}: verdict must be pass or fail`);
    if (!isDate(it.next_review)) errors.push(`${at}: next_review ${String(it.next_review)} is not YYYY-MM-DD`);
    const gaps = it.gaps ?? [];
    if (!Array.isArray(gaps) || gaps.some(g => typeof g !== "string")) errors.push(`${at}: gaps must be a string array`);

    let coachId = note.coachId;
    if (!coachId) {
      do coachId = ctx.newCoachId(); while (taken.has(coachId));
      taken.add(coachId);
      newIds.push({ path: note.path, coach_id: coachId });
    }
    items.push({ coach_id: coachId, note_path: note.path, title: note.title, challenge: it.challenge, answer: it.answer, verdict: it.verdict, gaps, next_review: it.next_review });
  });

  const record: SessionRecord = { version: 1, session_id: sessionId, tier: input.tier, date, recorded_at: ctx.now.toISOString(), items };
  const sessionFile = sessionPath(record.session_id);
  if (ctx.exists(sessionFile)) errors.push(`${sessionFile} already exists`);
  return errors.length ? { errors, record: null, sessionFile: null, newIds: [] } : { errors, record, sessionFile, newIds };
}

/**
 * Write a clean plan: coach_ids first, then the session file. Each note is re-read and
 * re-checked just before its edit, so a note changed since the plan is refused rather
 * than overwritten with a stale id.
 */
export async function executeSession(root: string, plan: RecordPlan): Promise<void> {
  if (plan.errors.length || !plan.record || !plan.sessionFile) throw new Error("refusing to write a plan with errors");
  for (const { path, coach_id } of plan.newIds) {
    const abs = join(root, path);
    const content = await readFile(abs, "utf-8");
    if (declaresCoachId(content)) throw new Error(`${path} gained a coach_id since the preview; re-run record_session`);
    await writeFile(abs, insertCoachId(content, coach_id), { flag: "r+" });
  }
  const abs = join(root, plan.sessionFile);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, renderSession(plan.record), { flag: "wx" });
}
