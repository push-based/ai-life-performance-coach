import { z } from "zod";
import { defineTool, type ToolDef } from "../../tool-types.js";
import type { Vault } from "@docs-mcp/vault/vault.js";
import { json, fail } from "./json.js";

export function tier2PayloadTool(vault: Vault): ToolDef {
  return defineTool({
  name: "tier2_payload",
  description: "What may be sent to the judge tier for one session: for each note it covered, the challenge and the user's answer, in session order, and nothing else. No note body, path, title, id, verdict or gap is included.",
  annotations: { readOnlyHint: true, idempotentHint: true },
  schema: {
    session_id: z.string().describe("A session_id returned by record_session"),
  },
  handler: async (args) => {
    const payload = await vault.tier2Payload(args.session_id);
    return payload ? json(payload) : fail(`Session not found: ${args.session_id}`);
  },
  });
}
