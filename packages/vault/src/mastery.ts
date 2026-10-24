/**
 * Mastery and due dates, derived from sessions by lookup and never stored on a note
 * (ADR-KI-0058 Decision 7). Sessions are matched to notes by `coach_id`, so a note keeps
 * its history wherever it is moved.
 */

import type { SessionRecord, SessionItem, Tier } from "./sessions.js";

export type Mastery = "unsparred" | "attempted" | "tier1_passed" | "tier2_passed";

export interface NoteHistory {
  mastery: Mastery;
  /** The next review date from the latest session covering the note. */
  nextReview: string | null;
  lastSession: string | null;
  sessions: number;
}

export const UNSPARRED: NoteHistory = { mastery: "unsparred", nextReview: null, lastSession: null, sessions: 0 };

interface Latest { item: SessionItem; session: SessionRecord }

/** History per coach_id, from sessions ordered oldest first. */
export function histories(sessions: SessionRecord[]): Map<string, NoteHistory> {
  const latest = new Map<string, { any: Latest; byTier: Partial<Record<Tier, Latest>>; count: number }>();
  for (const session of sessions) {
    for (const item of session.items) {
      const entry = latest.get(item.coach_id) ?? { any: { item, session }, byTier: {}, count: 0 };
      entry.any = { item, session };
      entry.byTier[session.tier] = { item, session };
      entry.count++;
      latest.set(item.coach_id, entry);
    }
  }
  const out = new Map<string, NoteHistory>();
  for (const [coachId, e] of latest) {
    const t1 = e.byTier[1]?.item.verdict;
    const t2 = e.byTier[2]?.item.verdict;
    const mastery: Mastery = t2 === "pass" ? "tier2_passed" : t1 === "pass" ? "tier1_passed" : "attempted";
    out.set(coachId, { mastery, nextReview: e.any.item.next_review, lastSession: e.any.session.session_id, sessions: e.count });
  }
  return out;
}

export function historyOf(map: Map<string, NoteHistory>, coachId: string | null): NoteHistory {
  return (coachId && map.get(coachId)) || UNSPARRED;
}
