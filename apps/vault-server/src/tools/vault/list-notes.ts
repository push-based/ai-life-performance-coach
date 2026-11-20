import { z } from 'zod';
import { defineTool, type ToolDef } from '../../tool-types.js';
import type { Vault } from '@ai-coach/vault-application';
import { PARA_BUCKETS, PLANS_ROOT } from '@ai-coach/vault-domain';
import { json } from './json.js';

export function listNotesTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'list_notes',
    description:
      "List the vault's notes with their PARA bucket and container (the project, area or resource folder they sit in). Filter by bucket, pass 'plans' for the year-to-day plans under Plans/, or 'out_of_place' for notes outside the fixed PARA folders and Plans/. Returns counts per bucket plus the matching notes, each with its mastery (unsparred, attempted, tier1_passed, tier2_passed).",
    annotations: { readOnlyHint: true, idempotentHint: true },
    schema: {
      bucket: z
        .enum([...PARA_BUCKETS, 'plans', 'out_of_place'])
        .optional()
        .describe("Only notes in this PARA bucket, 'plans', or 'out_of_place'"),
      container: z
        .string()
        .optional()
        .describe('Only notes in this project, area or resource folder'),
      raw: z
        .boolean()
        .optional()
        .describe('Only raw resources (true) or only distilled notes (false)'),
      concept: z
        .boolean()
        .optional()
        .describe('Only concept notes (true) or only other notes (false)'),
    },
    handler: async (args) => {
      const { notes, invalidSessions } = await vault.notesWithHistory();
      const place = (n: (typeof notes)[number]) =>
        n.bucket ??
        (n.path.startsWith(`${PLANS_ROOT}/`) ? 'plans' : 'out_of_place');
      const counts: Record<string, number> = Object.fromEntries(
        [...PARA_BUCKETS, 'plans', 'out_of_place'].map((b) => [b, 0]),
      );
      for (const n of notes) counts[place(n)]++;
      const matching = notes.filter(
        (n) =>
          (!args.bucket || place(n) === args.bucket) &&
          (!args.container || n.container === args.container) &&
          (args.raw === undefined || n.raw === args.raw) &&
          (args.concept === undefined || n.concept === args.concept),
      );
      return json({
        total: notes.length,
        counts,
        notes: matching.map((n) => ({
          path: n.path,
          title: n.title,
          bucket: n.bucket,
          container: n.container,
          raw: n.raw,
          concept: n.concept,
          coachId: n.coachId,
          mastery: n.history.mastery,
          nextReview: n.history.nextReview,
        })),
        invalidSessions,
      });
    },
  });
}
