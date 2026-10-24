import { z } from "zod";
import { defineTool, type ToolDef } from "../../tool-types.js";
import type { Vault } from "@docs-mcp/vault/vault.js";
import { json, fail } from "./json.js";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

export function recordSessionTool(vault: Vault): ToolDef {
  return defineTool({
  name: "record_session",
  description: "Record one finished sparring session covering one or more notes under 3.Resources. Writes Coach/sessions/<session_id>.md and, for a note sparred for the first time, inserts a coach_id frontmatter key into that note (its only edit). Previews by default; pass execute: true to write. Ids in a preview are provisional. Refuses notes outside 3.Resources, a note named twice, and any write onto an existing file.",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  schema: {
    tier: z.union([z.literal(1), z.literal(2)]).describe("1 = local sparring tier, 2 = judge tier"),
    date: DATE.optional().describe("Session date; defaults to today"),
    items: z.array(z.object({
      note: z.string().optional().describe("Vault-relative path of the note (or give coach_id)"),
      coach_id: z.string().optional().describe("coach_id of an already sparred note (or give note)"),
      challenge: z.string().describe("The challenge put to the user"),
      answer: z.string().describe("The user's answer, in their own words"),
      verdict: z.enum(["pass", "fail"]),
      gaps: z.array(z.string()).optional().describe("Gaps found in the user's mental model"),
      next_review: DATE.describe("When to review this note next, chosen by the consumer's scheduler"),
    })).min(1),
    execute: z.boolean().optional().describe("Write the session (default: preview only)"),
  },
  handler: async (args) => {
    const result = await vault.recordSession({ tier: args.tier, date: args.date, items: args.items }, args.execute === true);
    if (result.errors.length) return fail(`record_session refused:\n- ${result.errors.join("\n- ")}`);
    return json({
      executed: result.executed,
      session_id: result.record!.session_id,
      session_file: result.sessionFile,
      new_coach_ids: result.newIds,
      items: result.record!.items.map(i => ({ note: i.note_path, coach_id: i.coach_id, verdict: i.verdict, next_review: i.next_review })),
    });
  },
  });
}
