import { z } from "zod";
import { defineTool, type ToolDef } from "../../tool-types.js";
import type { Vault } from "@docs-mcp/vault/vault.js";
import { json } from "./json.js";

export function dueForReviewTool(vault: Vault): ToolDef {
  return defineTool({
  name: "due_for_review",
  description: "Notes under 3.Resources whose latest session's next review date is on or before today, oldest first, plus the Resources notes never sparred. Also lists sessions whose coach_id no note carries any more, and session files that could not be read.",
  annotations: { readOnlyHint: true, idempotentHint: true },
  schema: {
    today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD").optional().describe("The date to compare against; defaults to today"),
  },
  handler: async (args) => json(await vault.dueForReview(args.today)),
  });
}
