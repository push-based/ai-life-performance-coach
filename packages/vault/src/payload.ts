import type { SessionRecord } from './sessions.js';

export const PAYLOAD_ITEM_KEYS = ['challenge', 'answer'] as const;

export const PAYLOAD_OPTIONAL_KEYS = ['core_assertions'] as const;

export interface Tier2Payload {
  items: { challenge: string; answer: string; core_assertions?: string[] }[];
}

export function tier2Payload(
  session: SessionRecord,
  assertions?: ReadonlyMap<string, string[]>,
): Tier2Payload {
  return {
    items: session.items.map((i) => ({
      challenge: i.challenge,
      answer: i.answer,
      ...(assertions
        ? {
            core_assertions: [
              ...((i.coach_id ? assertions.get(i.coach_id) : undefined) ?? []),
            ],
          }
        : {}),
    })),
  };
}
