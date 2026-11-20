import { z } from 'zod';
import { defineTool, type ToolDef } from '../../tool-types.js';
import type { Vault } from '@ai-coach/vault/vault.js';
import { json, fail } from './json.js';

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');

export function recordSessionTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'record_session',
    description:
      "Record one finished session covering one or more notes under 3.Resources outside 0.Raw, concept notes above all (ADR-KI-0058, ADR-KI-0068). kind is spar (default: challenge, answer, verdict, next_review), generate (an ungraded attempt before the answer was shown: challenge is the prompt, answer the attempt of 10+ words or idk, generate.attempted_at before revealed_at, and every core assertion marked got it, wrong or missed, each wrong with a correction; may name a raw chapter tried before reading it), elaborate (ungraded: one why, connect and apply answer each, checked for a reason, a link to another note or a named thing, a concrete place, and no words copied from the note; appended dated under ## My elaborations in the note), or teach (the learner taught a student that knows only the title and one misconception: teach.turns, the misconception's assertion index, whether it was corrected, terms left undefined; a pass needs the misconception corrected and no undefined term; refused until the note has a passed spaced review). Writes Coach/sessions/<session_id>.md; a note covered for the first time gains a coach_id, and each concept note reached gets its climb: summary set from the evidence. Previews by default; pass execute: true to write. Ids in a preview are provisional. Refuses notes outside 3.Resources and raw resources, a note named twice, and any write onto an existing file.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    schema: {
      kind: z
        .enum(['spar', 'generate', 'elaborate', 'teach'])
        .optional()
        .describe('What the session practised; default spar'),
      tier: z
        .union([z.literal(1), z.literal(2)])
        .describe(
          '1 = local sparring tier, 2 = judge tier (spar and teach only)',
        ),
      date: DATE.optional().describe('Session date; defaults to today'),
      items: z
        .array(
          z.object({
            note: z
              .string()
              .optional()
              .describe('Vault-relative path of the note (or give coach_id)'),
            coach_id: z
              .string()
              .optional()
              .describe('coach_id of an already sparred note (or give note)'),
            challenge: z
              .string()
              .optional()
              .describe(
                'spar: the challenge put. generate: the prompt shown before the reveal',
              ),
            answer: z
              .string()
              .optional()
              .describe(
                "spar: the user's answer, in their own words. generate: the attempt",
              ),
            verdict: z
              .enum(['pass', 'fail'])
              .optional()
              .describe('spar and teach only'),
            gaps: z
              .array(z.string())
              .optional()
              .describe("Gaps found in the user's mental model"),
            next_review: DATE.optional().describe(
              "When to review this note next, chosen by the consumer's scheduler; required for spar and teach",
            ),
            generate: z
              .object({
                attempted_at: z
                  .string()
                  .describe('ISO timestamp the attempt was saved'),
                revealed_at: z
                  .string()
                  .describe('ISO timestamp the answer was shown'),
                idk: z.boolean().optional().describe('The user answered /idk'),
                marks: z.array(
                  z.object({
                    assertion: z.string(),
                    mark: z.enum(['got it', 'wrong', 'missed']),
                    correction: z.string().optional(),
                  }),
                ),
              })
              .optional(),
            elaborate: z
              .object({
                answers: z.array(
                  z.object({
                    kind: z.enum(['why', 'connect', 'apply']),
                    question: z.string(),
                    answer: z.string(),
                    links: z
                      .array(z.string())
                      .optional()
                      .describe('Notes the answer links, by path or title'),
                    named: z
                      .string()
                      .optional()
                      .describe(
                        "connect: a thing from the user's own work; apply: a project, file, team or decision",
                      ),
                  }),
                ),
              })
              .optional(),
            teach: z
              .object({
                turns: z.array(
                  z.object({
                    role: z.enum(['learner', 'student']),
                    text: z.string(),
                  }),
                ),
                misconception: z.object({
                  assertion: z
                    .number()
                    .int()
                    .min(0)
                    .describe('Index of the core assertion it inverts'),
                  text: z.string(),
                }),
                misconception_corrected: z.boolean(),
                unresolved_terms: z.array(z.string()).optional(),
              })
              .optional(),
          }),
        )
        .min(1),
      execute: z
        .boolean()
        .optional()
        .describe('Write the session (default: preview only)'),
    },
    handler: async (args) => {
      const result = await vault.recordSession(
        {
          kind: args.kind,
          tier: args.tier,
          date: args.date,
          items: args.items,
        },
        args.execute === true,
      );
      if (result.errors.length)
        return fail(`record_session refused:\n- ${result.errors.join('\n- ')}`);
      return json({
        executed: result.executed,
        kind: result.record!.kind,
        session_id: result.record!.session_id,
        session_file: result.sessionFile,
        new_coach_ids: result.newIds,
        items: result.record!.items.map((i) => ({
          note: i.note_path,
          coach_id: i.coach_id,
          verdict: i.verdict,
          next_review: i.next_review,
        })),
        climbs: result.climbs,
        elaborations: result.elaborations,
        warnings: result.warnings,
      });
    },
  });
}
