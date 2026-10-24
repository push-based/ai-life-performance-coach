import { z } from "zod";
import { defineTool, type ToolDef } from "../../tool-types.js";
import type { Vault } from "@docs-mcp/vault/vault.js";
import { json, fail } from "./json.js";

export function listRawTool(vault: Vault): ToolDef {
  return defineTool({
  name: "list_raw",
  description: "List the raw resources under 3.Resources/0.Raw (full books, articles and other source material kept whole), each with its kind folder, the note that carries its text (null when a PDF is not converted yet), and whether it can be converted.",
  annotations: { readOnlyHint: true, idempotentHint: true },
  schema: {},
  handler: async () => json(await vault.listRaw()),
  });
}

export function convertRawTool(vault: Vault): ToolDef {
  return defineTool({
  name: "convert_raw",
  description: "Convert one PDF under 3.Resources/0.Raw into a markdown note beside it, once: text extracted offline, one '## Page N' heading per page, frontmatter with title, author, page count and converted_from. Links to the PDF then resolve to the note, and read_note can return a page range. The PDF is never changed; an existing note is never replaced. Previews by default (with the real page and character counts); pass execute: true to write.",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  schema: {
    path: z.string().describe("Vault-relative path of the PDF, e.g. 3.Resources/0.Raw/Books/Book.pdf"),
    execute: z.boolean().optional().describe("Write the note (default: preview only)"),
  },
  handler: async (args) => {
    const r = await vault.convertRaw(args.path, args.execute === true);
    return r.errors.length ? fail(`convert_raw refused:\n- ${r.errors.join("\n- ")}`) : json(r);
  },
  });
}
