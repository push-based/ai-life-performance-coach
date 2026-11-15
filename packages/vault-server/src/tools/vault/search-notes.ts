import { z } from "zod";
import { defineTool, type ToolDef } from "../../tool-types.js";
import type { Vault } from "@ai-coach/vault/vault.js";
import { PARA_BUCKETS } from "@ai-coach/vault/para.js";
import { searchNotes } from "@ai-coach/vault/search.js";
import { json } from "./json.js";

export function searchNotesTool(vault: Vault): ToolDef {
  return defineTool({
  name: "search",
  description: "Full-text search over the vault's notes (title weighted above body; diacritics folded, so Polish and English match alike). Optionally restrict to one PARA bucket. Returns path, title, PARA location, score and a snippet per hit.",
  annotations: { readOnlyHint: true, idempotentHint: true },
  schema: {
    query: z.string().min(1).describe("Search text"),
    bucket: z.enum(PARA_BUCKETS).optional().describe("Only notes in this PARA bucket"),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum hits (default 20)"),
  },
  handler: async (args) => json(await searchNotes(await vault.notes(), args.query, { bucket: args.bucket, limit: args.limit })),
  });
}
