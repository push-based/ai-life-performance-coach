import { z } from "zod";
import { defineTool, type ToolDef, type ToolResult } from "../../tool-types.js";
import type { Vault, FilingResult } from "@docs-mcp/vault/vault.js";
import { json, fail } from "./json.js";

const WRITES = { readOnlyHint: false, destructiveHint: false, idempotentHint: false } as const;
const EXECUTE = z.boolean().optional().describe("Apply the plan (default: preview only)");

/** A plan with errors is a failed call; collisions are a preview the user must resolve first. */
function result(r: FilingResult): ToolResult {
  return r.errors.length ? fail(`refused:\n- ${r.errors.join("\n- ")}`) : json(r);
}

export function initVaultTool(vault: Vault): ToolDef {
  return defineTool({
  name: "init_vault",
  description: "Bring the vault onto the five PARA folders at its root (0.Inbox, 1.Projects, 2.Areas, 3.Resources, 4.Archive). Proposes renaming folders that are PARA folders under another name (including ones nested in a PARA/ folder), creates the missing ones, and moves every note outside them into 4.Archive/old notes/ keeping its relative path and content. Previews by default: review the renames, then re-run with execute: true. If any target exists, the preview lists the collisions and execution moves nothing.",
  annotations: WRITES,
  schema: { execute: EXECUTE },
  handler: async (args) => result(await vault.initVault(args.execute === true)),
  });
}

export function captureTool(vault: Vault): ToolDef {
  return defineTool({
  name: "capture",
  description: "Capture a new note into 0.Inbox, named from its title (characters Obsidian forbids in file names become '-'). Refuses to replace an existing note. Previews by default.",
  annotations: WRITES,
  schema: {
    title: z.string().min(1).describe("Note title; becomes the file name"),
    body: z.string().describe("Note content, markdown"),
    execute: EXECUTE,
  },
  handler: async (args) => result(await vault.capture(args.title, args.body, args.execute === true)),
  });
}

export function fileNoteTool(vault: Vault): ToolDef {
  return defineTool({
  name: "file_note",
  description: "Move one note into a folder under one of the five PARA folders, e.g. '3.Resources/TypeScript'. Content is untouched and sparring history follows the note by coach_id. Refuses a target that exists. The preview warns about relative markdown links the move would break; wikilinks resolve by name and survive. Previews by default.",
  annotations: WRITES,
  schema: {
    path: z.string().describe("Vault-relative path of the note"),
    to: z.string().describe("Destination folder, e.g. 3.Resources/TypeScript"),
    execute: EXECUTE,
  },
  handler: async (args) => result(await vault.fileNote(args.path, args.to, args.execute === true)),
  });
}

export function archiveProjectTool(vault: Vault): ToolDef {
  return defineTool({
  name: "archive_project",
  description: "Move a finished project's folder whole from 1.Projects into 4.Archive. Refuses when 4.Archive already holds a folder of that name. Previews by default.",
  annotations: WRITES,
  schema: {
    project: z.string().describe("Folder name under 1.Projects, e.g. DevFest2026"),
    execute: EXECUTE,
  },
  handler: async (args) => result(await vault.archiveProject(args.project, args.execute === true)),
  });
}
