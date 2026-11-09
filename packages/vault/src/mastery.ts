/**
 * Mastery and due dates, derived from sessions by lookup and never stored on a note
 * (ADR-KI-0058 Decision 7). Sessions are matched to notes by `coach_id`, so a note keeps
 * its history wherever it is moved.
 */

import type { SessionRecord, SessionItem, Tier, Verdict } from "./sessions.js";


export type Mastery = "unsparred" | "attempted" | "tier1_passed" | "tier2_passed";

/** One session's outcome for one note. Challenge and answer stay in the session file. */
export interface HistoryEntry {
  session_id: string;
  tier: Tier;
  date: string;
  verdict: Verdict;
  gaps: string[];
  next_review: string;
}

export interface NoteHistory {
  mastery: Mastery;
  /** The next review date from the latest session covering the note. */
  nextReview: string | null;
  lastSession: string | null;
  sessions: number;
  /**
   * Every session covering the note, oldest first. A scheduler needs the run of
   * outcomes at one tier, which the latest next review date alone cannot give it.
   */
  entries: HistoryEntry[];
}

export const UNSPARRED: Readonly<NoteHistory> = Object.freeze({ mastery: "unsparred", nextReview: null, lastSession: null, sessions: 0, entries: [] as HistoryEntry[] });

interface Latest { item: SessionItem; session: SessionRecord }

/**
 * History per coach_id, from sessions ordered oldest first. Mastery and the entries come
 * from sparring sessions only; the next review date is the latest any session set, so a
 * Generate or Teach attempt can schedule a review (ADR-KI-0068 Decision 8).
 */
export function histories(sessions: SessionRecord[]): Map<string, NoteHistory> {
  const latest = new Map<string, { any: Latest | null; byTier: Partial<Record<Tier, Latest>>; entries: HistoryEntry[]; nextReview: string | null }>();
  for (const session of sessions) {
    for (const item of session.items) {
      if (!item.coach_id) continue;
      const entry = latest.get(item.coach_id) ?? { any: null, byTier: {}, entries: [], nextReview: null };
      if (item.next_review) entry.nextReview = item.next_review;
      if (session.kind === "spar" && item.next_review && item.verdict !== "ungraded") {
        entry.any = { item, session };
        entry.byTier[session.tier] = { item, session };
        entry.entries.push({ session_id: session.session_id, tier: session.tier, date: session.date, verdict: item.verdict, gaps: item.gaps, next_review: item.next_review });
      }
      latest.set(item.coach_id, entry);
    }
  }
  const out = new Map<string, NoteHistory>();
  for (const [coachId, e] of latest) {
    const t1 = e.byTier[1]?.item.verdict;
    const t2 = e.byTier[2]?.item.verdict;
    const mastery: Mastery = !e.any ? "unsparred" : t2 === "pass" ? "tier2_passed" : t1 === "pass" ? "tier1_passed" : "attempted";
    out.set(coachId, { mastery, nextReview: e.nextReview, lastSession: e.any?.session.session_id ?? null, sessions: e.entries.length, entries: e.entries });
  }
  return out;
}

export function historyOf(map: Map<string, NoteHistory>, coachId: string | null): NoteHistory {
  return (coachId && map.get(coachId)) || { ...UNSPARRED, entries: [] };
}
