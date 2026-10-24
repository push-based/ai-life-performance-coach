import { z } from "zod";
import { defineTool, type ToolDef } from "../../tool-types.js";
import type { Vault } from "@docs-mcp/vault/vault.js";
import { json } from "./json.js";

export function dueForReviewTool(vault: Vault): ToolDef {
  return defineTool({
  name: "due_for_review",
  description: "Sparrable notes, those under 3.Resources outside 0.Raw, whose latest session's next review date is on or before today, oldest first, plus those never sparred; each says whether it is a concept note. Raw resources are never listed: they are not sparred. Also lists sessions whose coach_id no note carries any more, and session files that could not be read.",
  annotations: { readOnlyHint: true, idempotentHint: true },
  schema: {
    today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD").optional().describe("The date to compare against; defaults to today"),
  },
  handler: async (args) => json(await vault.dueForReview(args.today)),
  });
}
