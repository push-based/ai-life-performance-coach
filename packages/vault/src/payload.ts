/**
 * The judge-tier payload (ADR-KI-0058 Decision 10). Built from an allowlist: for each
 * note a session covers, its challenge and the user's answer, and no other field. Note
 * bodies, paths, titles, ids, verdicts and gaps never leave through here.
 */

import type { SessionRecord } from "./sessions.js";

export const PAYLOAD_ITEM_KEYS = ["challenge", "answer"] as const;

export interface Tier2Payload {
  items: { challenge: string; answer: string }[];
}

export function tier2Payload(session: SessionRecord): Tier2Payload {
  return { items: session.items.map(i => ({ challenge: i.challenge, answer: i.answer })) };
}
