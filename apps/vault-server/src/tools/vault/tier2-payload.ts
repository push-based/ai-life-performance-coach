import { z } from 'zod';
import { defineTool, type ToolDef } from '../../tool-types.js';
import type { Vault } from '@ai-coach/vault-application';
import { json, fail } from './json.js';

export function tier2PayloadTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'tier2_payload',
    description:
      "What may be sent to the judge tier for one session: for each note it covered, the challenge and the user's answer, in session order, and nothing else. With include_assertions: true, each item also carries core_assertions, the covered concept note's assertions ([] for a note that is not a concept note), so the judge can grade against them; leave it off to send nothing from the vault. No note body, path, title, id, verdict, gap, buzzword or passage is ever included.",
    annotations: { readOnlyHint: true, idempotentHint: true },
    schema: {
      session_id: z
        .string()
        .describe('A session_id returned by record_session'),
      include_assertions: z
        .boolean()
        .optional()
        .describe(
          "Add each concept note's core_assertions to its item (default: off)",
        ),
    },
    handler: async (args) => {
      const payload = await vault.tier2Payload(args.session_id, {
        includeAssertions: args.include_assertions === true,
      });
      return payload
        ? json(payload)
        : fail(`Session not found: ${args.session_id}`);
    },
  });
}
