import { z } from "zod";
import { defineTool, type ToolDef, type ToolResult } from "../../tool-types.js";
import type { Vault, FilingResult } from "@ai-coach/vault/vault.js";
import { json, fail } from "./json.js";

const WRITES = { readOnlyHint: false, destructiveHint: false, idempotentHint: false } as const;
const EXECUTE = z.boolean().optional().describe("Apply the plan (default: preview only)");

function result(r: FilingResult): ToolResult {
  return r.errors.length ? fail(`refused:\n- ${r.errors.join("\n- ")}`) : json(r);
}

export function initVaultTool(vault: Vault): ToolDef {
  return defineTool({
  name: "init_vault",
  description: "Bring the vault onto the five PARA folders at its root (0.Inbox, 1.Projects, 2.Areas, 3.Resources, 4.Archive). Proposes renaming folders that are PARA folders under another name (including ones nested in a PARA/ folder), creates the missing ones, and moves every note outside them into 4.Archive/old notes/ keeping its relative path and content. It also lays out planning (ADR-KI-0062): creates Plans/ with Yearly, Quarterly, Monthly, Weekly and Daily and their templates, moves day plans at Plans/Daily/YYYY-MM-DD.md into their year's and month's folders, such as Plans/Daily/2026/11-November/, writes a missing project note (<Project>/<Project>.md, status in-progress, empty deadline and done_when, listing its workstreams), and creates the areas passed in 'areas' as 2.Areas/<Name>.md. Previews by default: review the renames, then re-run with execute: true. If any target exists, the preview lists the collisions and execution moves nothing.",
  annotations: WRITES,
  schema: {
    areas: z.array(z.string().min(1)).optional().describe("Area names to create in 2.Areas when missing, e.g. Health, Work"),
    execute: EXECUTE,
  },
  handler: async (args) => result(await vault.initVault(args.execute === true, { areas: args.areas })),
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
  description: "Move a finished project's folder from 1.Projects into 4.Archive. The preview lists suggestions: notes in the project that look like knowledge worth keeping (a concept note, sparring history, cites raw material, or linked from notes outside the project), each with a suggested folder under 3.Resources and the reasons. Ask the user which to keep, then pass keep (or keep_suggested: true): those notes move into Resources, where they stay sparrable, and the rest of the folder moves to the archive. Refuses when 4.Archive already holds a folder of that name or a kept note's target exists. Previews by default.",
  annotations: WRITES,
  schema: {
    project: z.string().describe("Folder name under 1.Projects, e.g. Expo2026"),
    keep: z.array(z.object({
      note: z.string().describe("Vault-relative path of a note in the project"),
      to: z.string().optional().describe("Folder under 3.Resources outside 0.Raw; defaults to the suggested one"),
    })).optional().describe("Notes to move into Resources instead of archiving"),
    keep_suggested: z.boolean().optional().describe("Keep every suggested note at its suggested folder"),
    execute: EXECUTE,
  },
  handler: async (args) => result(await vault.archiveProject(args.project, args.execute === true, { keep: args.keep, keepSuggested: args.keep_suggested })),
  });
}
