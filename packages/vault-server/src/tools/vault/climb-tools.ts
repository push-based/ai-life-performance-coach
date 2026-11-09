import { z } from "zod";
import { defineTool, type ToolDef } from "../../tool-types.js";
import type { Vault } from "@docs-mcp/vault/vault.js";
import { json, fail } from "./json.js";
import { VERSIONS } from "./planning-tools.js";

const EXECUTE = z.boolean().optional().describe("Write it (default: preview only)");
const refused = (tool: string, r: { errors: string[] }) => fail(`${tool} refused:\n- ${r.errors.join("\n- ")}`);

export function climbTool(vault: Vault): ToolDef {
  return defineTool({
  name: "climb",
  description: "The climb of each concept note (ADR-KI-0068): seven learning steps, read, group, generate, retrieve, elaborate, space and teach, each with the date it was first done and its evidence (a reading-notes or structure note path, or a session id), worked out from the vault. Also the climb: summary the note holds, whether it matches the evidence (rebuild_climb fixes one that does not), the next step, steps skipped below a done one, the first passed spaced review, and whether teach is unlocked and why not. Give note (path or title) for one concept.",
  annotations: { readOnlyHint: true, idempotentHint: true },
  schema: {
    note: z.string().optional().describe("A concept note by path or title; omit for every concept note"),
  },
  handler: async (args) => {
    const r = await vault.climb(args.note);
    return "error" in r ? fail(r.error) : json(r);
  },
  });
}

export function rebuildClimbTool(vault: Vault): ToolDef {
  return defineTool({
  name: "rebuild_climb",
  description: "Set every concept note's climb: frontmatter summary to what the evidence gives (ADR-KI-0068), changing only that key. Use it when climb reports a summary that does not match, e.g. after a session file was removed or a note was edited by hand. Preview, then execute: true with the preview's versions.",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  schema: { execute: EXECUTE, versions: VERSIONS },
  handler: async (args) => {
    const r = await vault.rebuildClimb(args.execute === true, args.versions);
    return r.errors.length ? refused("rebuild_climb", r) : json(r);
  },
  });
}

export function addReadingNotesTool(vault: Vault): ToolDef {
  return defineTool({
  name: "add_reading_notes",
  description: "Write down what resonated while reading a chapter of a converted book (ADR-KI-0068, the Read step): each note, in the user's own words, is added dated under ## Page N (or ## Notes for the chapter as a whole) of 3.Resources/Reading notes/<book>/<chapter>.md, linking back to the page. A note sharing six or more words in a row with the text is kept as a quote and does not count for Read; the preview warns when a page's notes pass about 20% of its words. Write the user's words only, never a summary or suggested notes. Read is done for a chapter with one own-words note and an own-words chapter summary (write_summary); concept notes quoting the chapter get climb.read. Preview, then execute: true with the preview's versions.",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  schema: {
    chapter: z.string().describe("A chapter note under 3.Resources/0.Raw"),
    page: z.number().int().positive().optional().describe("The ## Page N the notes were written on"),
    notes: z.array(z.string()).min(1).describe("What resonated, in the user's own words; one note each"),
    execute: EXECUTE,
    versions: VERSIONS,
  },
  handler: async (args) => {
    const r = await vault.addReadingNotes({ chapter: args.chapter, page: args.page, notes: args.notes }, args.execute === true, args.versions);
    return r.errors.length ? refused("add_reading_notes", r) : json(r);
  },
  });
}

export function writeStructureTool(vault: Vault): ToolDef {
  return defineTool({
  name: "write_structure",
  description: "Write a book's structure note (ADR-KI-0068, the Group step): the learner's own groups of its concept notes and which group builds on which, at 3.Resources/Concepts/Structures/<book>.md. Refuses fewer than 2 or more than 7 groups, an empty group, a concept in no group or in two, a concept of another book, an edge naming a group that does not exist, and a cycle (builds on is a layering). Warns when a group is named word for word after a heading of the book. Sets group: on each concept note and climb.group. Rewriting it regroups the book. The groups are the learner's: never propose a structure. Preview, then execute: true with the preview's versions.",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  schema: {
    book: z.string().describe("The book's title, as its chapters' book frontmatter or its index give it"),
    groups: z.array(z.object({ name: z.string(), concepts: z.array(z.string()).describe("Concept notes by path or title") })),
    builds_on: z.array(z.object({ from: z.string(), to: z.string() })).optional().describe("from builds on to, by group name"),
    execute: EXECUTE,
    versions: VERSIONS,
  },
  handler: async (args) => {
    const r = await vault.writeStructure({ book: args.book, groups: args.groups, builds_on: args.builds_on }, args.execute === true, args.versions);
    return r.errors.length ? refused("write_structure", r) : json(r);
  },
  });
}

export function saveGuidelineTool(vault: Vault): ToolDef {
  return defineTool({
  name: "save_guideline",
  description: "Save a passed Teach session's lesson as a guideline note (ADR-KI-0068): the learner's own turns, in order, with the student's lines left out, under a folder in 1.Projects or 3.Resources the learner picks. The text comes from the session file, not from the caller. Refuses another kind of session, a failed one, and a note that exists. Previews by default.",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  schema: {
    session_id: z.string(),
    note: z.string().optional().describe("The concept note taught, when the session covers several"),
    title: z.string(),
    folder: z.string().describe("e.g. 1.Projects/Design System or 3.Resources/Guidelines"),
    execute: EXECUTE,
  },
  handler: async (args) => {
    const r = await vault.saveGuideline({ session_id: args.session_id, note: args.note, title: args.title, folder: args.folder }, args.execute === true);
    return r.errors.length ? refused("save_guideline", r) : json(r);
  },
  });
}
