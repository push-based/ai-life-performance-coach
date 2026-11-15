import { z } from "zod";
import { defineTool, type ToolDef, type ToolResult } from "../../tool-types.js";
import type { Vault, WriteResult } from "@docs-mcp/vault/vault.js";
import { json, fail } from "./json.js";

const WRITES = { readOnlyHint: false, destructiveHint: false, idempotentHint: false } as const;

function result(name: string, r: WriteResult): ToolResult {
  return r.errors.length ? fail(`${name} refused:\n- ${r.errors.join("\n- ")}`) : json(r);
}

export function readingProgressTool(vault: Vault): ToolDef {
  return defineTool({
  name: "reading_progress",
  description: "Where each converted book stands, read off the vault: its stage (unread, read, notes, distilling, distilled, concepts), each step on its own (read_on, the user's own notes linking the book, chapters complete and in progress, concept notes quoting it), and per chapter its state (untouched, in_progress, complete) with each page's deepest mark (none, bold, highlight) and whether it has a summary. The user bolds (**…**) and highlights (==…==) in Obsidian; a chapter summary completes a chapter.",
  annotations: { readOnlyHint: true, idempotentHint: true },
  schema: {
    book: z.string().optional().describe("Only this book: its text.md or work folder"),
    chapters: z.boolean().optional().describe("Include each chapter and its pages (default true)"),
  },
  handler: async (args) => {
    const want = args.book?.replace(/\/+$/, "");
    const books = (await vault.readingProgress()).filter(b => !want || b.index === want || b.index === `${want}/text.md`);
    if (want && !books.length) return fail(`No converted book at ${args.book}`);
    return json(args.chapters === false ? books.map(({ chapters: _c, ...b }) => b) : books);
  },
  });
}

export function markReadTool(vault: Vault): ToolDef {
  return defineTool({
  name: "mark_read",
  description: "Mark a converted book as read, the first stage of working through it: adds read_on to its index (text.md), the only edit. Refuses a book already marked. Previews by default.",
  annotations: WRITES,
  schema: {
    book: z.string().describe("The book's text.md or work folder"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD").optional().describe("When reading finished; defaults to today"),
    execute: z.boolean().optional().describe("Write it (default: preview only)"),
  },
  handler: async (args) => result("mark_read", await vault.markRead(args.book, args.date, args.execute === true)),
  });
}

export function writeSummaryTool(vault: Vault): ToolDef {
  return defineTool({
  name: "write_summary",
  description: "Add the user's summary to a book's chapter, as a > [!summary] callout: before its first page for the chapter summary, which completes the chapter, or under ## Page N for an optional page summary. Write the user's own words, not the author's. Never replaces an existing summary (edit that in Obsidian) and changes nothing else. Summaries are not matched as quotes. Previews by default.",
  annotations: WRITES,
  schema: {
    path: z.string().describe("Vault-relative path of the chapter note"),
    text: z.string().min(1).describe("The summary, markdown"),
    page: z.number().int().min(1).optional().describe("A page of the chapter, for a page summary; omit for the chapter summary"),
    execute: z.boolean().optional().describe("Write it (default: preview only)"),
  },
  handler: async (args) => result("write_summary", await vault.writeSummary(args.path, args.text, args.page, args.execute === true)),
  });
}
