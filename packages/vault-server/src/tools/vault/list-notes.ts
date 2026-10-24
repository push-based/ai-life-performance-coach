import { z } from "zod";
import { defineTool, type ToolDef } from "../../tool-types.js";
import type { Vault } from "@docs-mcp/vault/vault.js";
import { PARA_BUCKETS } from "@docs-mcp/vault/para.js";
import { json } from "./json.js";

export function listNotesTool(vault: Vault): ToolDef {
  return defineTool({
  name: "list_notes",
  description: "List the vault's notes with their PARA bucket and container (the project, area or resource folder they sit in). Filter by bucket, or pass 'out_of_place' for notes outside the fixed PARA folders. Returns counts per bucket plus the matching notes.",
  annotations: { readOnlyHint: true, idempotentHint: true },
  schema: {
    bucket: z.enum([...PARA_BUCKETS, "out_of_place"]).optional().describe("Only notes in this PARA bucket, or 'out_of_place'"),
    container: z.string().optional().describe("Only notes in this project, area or resource folder"),
  },
  handler: async (args) => {
    const notes = await vault.notes();
    const counts: Record<string, number> = Object.fromEntries([...PARA_BUCKETS, "out_of_place"].map(b => [b, 0]));
    for (const n of notes) counts[n.bucket ?? "out_of_place"]++;
    const matching = notes.filter(n =>
      (!args.bucket || (n.bucket ?? "out_of_place") === args.bucket) &&
      (!args.container || n.container === args.container));
    return json({
      total: notes.length,
      counts,
      notes: matching.map(n => ({ path: n.path, title: n.title, bucket: n.bucket, container: n.container, coachId: n.coachId })),
    });
  },
  });
}
