/**
 * The judge-tier payload (ADR-KI-0058 Decision 10, ADR-KI-0060). Built from an allowlist:
 * for each note a session covers, its challenge and the user's answer, and no other
 * field. Only when the consumer asks, each item also carries the covered concept note's
 * `core_assertions`, so the judge can grade against them; `[]` for a note that has none.
 * Note bodies, paths, titles, ids, verdicts, gaps, buzzwords and passages never leave
 * through here.
 */

import type { SessionRecord } from "./sessions.js";

export const PAYLOAD_ITEM_KEYS = ["challenge", "answer"] as const;
/** The one key a consumer can opt into, per call. */
export const PAYLOAD_OPTIONAL_KEYS = ["core_assertions"] as const;

export interface Tier2Payload {
  items: { challenge: string; answer: string; core_assertions?: string[] }[];
}

/** With `assertions` (core assertions by coach_id), every item gains `core_assertions`. */
export function tier2Payload(session: SessionRecord, assertions?: ReadonlyMap<string, string[]>): Tier2Payload {
  return {
    items: session.items.map(i => ({
      challenge: i.challenge,
      answer: i.answer,
      ...(assertions ? { core_assertions: [...(assertions.get(i.coach_id) ?? [])] } : {}),
    })),
  };
}
