import { z } from 'zod';
import { defineTool, type ToolDef } from '../../tool-types.js';
import type { Vault } from '@ai-coach/vault/vault.js';
import { json, fail } from './json.js';
import { VERSIONS } from './planning-tools.js';

const EXECUTE = z
  .boolean()
  .optional()
  .describe('Write it (default: preview only)');
const refused = (tool: string, r: { errors: string[] }) =>
  fail(`${tool} refused:\n- ${r.errors.join('\n- ')}`);

export function climbTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'climb',
    description:
      'The climb of each concept note (ADR-KI-0068): seven learning steps, read, group, generate, retrieve, elaborate, space and teach, each with the date it was first done and its evidence (a reading-notes or structure note path, or a session id), worked out from the vault. Also the climb: summary the note holds, whether it matches the evidence (rebuild_climb fixes one that does not), the next step, steps skipped below a done one, the first passed spaced review, whether teach is unlocked and why not, every book the concept quotes with its group in each (groups) and the books whose structure note does not place it yet (ungroupedIn). Give note (path or title) for one concept.',
    annotations: { readOnlyHint: true, idempotentHint: true },
    schema: {
      note: z
        .string()
        .optional()
        .describe(
          'A concept note by path or title; omit for every concept note',
        ),
    },
    handler: async (args) => {
      const r = await vault.climb(args.note);
      return 'error' in r ? fail(r.error) : json(r);
    },
  });
}

export function rebuildClimbTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'rebuild_climb',
    description:
      "Set every concept note's climb: frontmatter summary to what the evidence gives (ADR-KI-0068), changing only that key. Use it when climb reports a summary that does not match, e.g. after a session file was removed or a note was edited by hand. Preview, then execute: true with the preview's versions.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    },
    schema: { execute: EXECUTE, versions: VERSIONS },
    handler: async (args) => {
      const r = await vault.rebuildClimb(args.execute === true, args.versions);
      return r.errors.length ? refused('rebuild_climb', r) : json(r);
    },
  });
}

export function addReadingNotesTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'add_reading_notes',
    description:
      "Write down what resonated while reading a chapter of a converted book (ADR-KI-0068, the Read step): each note, in the user's own words, is added dated under ## Page N (or ## Notes for the chapter as a whole) of 3.Resources/Reading notes/<book>/<chapter>.md, linking back to the page. A note sharing six or more words in a row with the text is kept as a quote and does not count for Read; the preview warns when a page's notes pass about 20% of its words. Write the user's words only, never a summary or suggested notes. Read is done for a chapter with one own-words note and an own-words chapter summary (write_summary); concept notes quoting the chapter get climb.read. Preview, then execute: true with the preview's versions.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    schema: {
      chapter: z.string().describe('A chapter note under 3.Resources/0.Raw'),
      page: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('The ## Page N the notes were written on'),
      notes: z
        .array(z.string())
        .min(1)
        .describe("What resonated, in the user's own words; one note each"),
      execute: EXECUTE,
      versions: VERSIONS,
    },
    handler: async (args) => {
      const r = await vault.addReadingNotes(
        { chapter: args.chapter, page: args.page, notes: args.notes },
        args.execute === true,
        args.versions,
      );
      return r.errors.length ? refused('add_reading_notes', r) : json(r);
    },
  });
}

export function writeStructureTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'write_structure',
    description:
      "Write a structure note (ADR-KI-0068 Group step, ADR-KI-0070): the learner's own groups of concept notes and which group builds on which, for a book or for a topic, at 3.Resources/Concepts/Structures/<book or topic>.md. Give book or topic, never both. A book's structure places every concept that quotes the book, and a concept quoting several books belongs to each. A topic is a subject the learner reads several books on, such as ADHD: it lists any concept notes the learner puts in it, from any book or none, with no completeness rule, and a concept is in at most one topic. Refuses fewer than 2 or more than 7 groups, an empty group, a concept in two groups, an edge naming a group that does not exist, a cycle (builds on is a layering), a topic named like a book, and a path that is the other kind's structure note. Warns when a group is named word for word after a heading of a book it covers. Sets the entry in each concept note's groups: (book or topic → group), and topic: for a topic, and climb.group; a concept dropped from a rewritten topic loses both. The groups are the learner's: never propose a structure. Preview, then execute: true with the preview's versions.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    },
    schema: {
      book: z
        .string()
        .optional()
        .describe(
          "The book's title, as its chapters' book frontmatter or its index give it",
        ),
      topic: z
        .string()
        .optional()
        .describe('A subject the learner reads several books on, e.g. ADHD'),
      groups: z.array(
        z.object({
          name: z.string(),
          concepts: z
            .array(z.string())
            .describe('Concept notes by path or title'),
        }),
      ),
      builds_on: z
        .array(z.object({ from: z.string(), to: z.string() }))
        .optional()
        .describe('from builds on to, by group name'),
      execute: EXECUTE,
      versions: VERSIONS,
    },
    handler: async (args) => {
      const r = await vault.writeStructure(
        {
          book: args.book,
          topic: args.topic,
          groups: args.groups,
          builds_on: args.builds_on,
        },
        args.execute === true,
        args.versions,
      );
      return r.errors.length ? refused('write_structure', r) : json(r);
    },
  });
}

export function listTopicsTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'list_topics',
    description:
      'Every topic (ADR-KI-0070): a subject the learner reads several books on, with its structure note, the concept notes it lists, and the books those concepts quote.',
    annotations: { readOnlyHint: true, idempotentHint: true },
    schema: {},
    handler: async () => json(await vault.listTopics()),
  });
}

export function saveGuidelineTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'save_guideline',
    description:
      "Save a passed Teach session's lesson as a guideline note (ADR-KI-0068): the learner's own turns, in order, with the student's lines left out, under a folder in 1.Projects or 3.Resources the learner picks. The text comes from the session file, not from the caller. Refuses another kind of session, a failed one, and a note that exists. Previews by default.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    schema: {
      session_id: z.string(),
      note: z
        .string()
        .optional()
        .describe('The concept note taught, when the session covers several'),
      title: z.string(),
      folder: z
        .string()
        .describe('e.g. 1.Projects/Design System or 3.Resources/Guidelines'),
      execute: EXECUTE,
    },
    handler: async (args) => {
      const r = await vault.saveGuideline(
        {
          session_id: args.session_id,
          note: args.note,
          title: args.title,
          folder: args.folder,
        },
        args.execute === true,
      );
      return r.errors.length ? refused('save_guideline', r) : json(r);
    },
  });
}

export function extendConceptTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'extend_concept',
    description:
      "Add another book's passages, more reading notes or more core assertions to an existing concept note (ADR-KI-0071), so one idea read in several books stays one note instead of a duplicate per book. Each passage is verified against the raw text exactly as create_concept verifies it, and the result lists each with found and problem. Never removes or rewrites what is there: appends to source_passages, from_notes and core_assertions and adds the quotes to the body. Refuses a passage the note already quotes, a note that is not a concept note, and going past 12 passages or 6 assertions; warns when added assertions change what past sessions were judged against. Refreshes climb: (Read may become done through the new chapter). Preview, then execute: true with the preview's versions.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    schema: {
      note: z.string().describe('An existing concept note, by path or title'),
      passages: z
        .array(
          z.object({
            note: z.string(),
            quote: z.string(),
            pages: z.string().optional(),
          }),
        )
        .optional(),
      from_notes: z
        .array(z.string())
        .optional()
        .describe('Reading notes this concept now also came from'),
      core_assertions: z
        .array(z.string())
        .optional()
        .describe("Assertions to add, in the learner's own words"),
      execute: EXECUTE,
      versions: VERSIONS,
    },
    handler: async (args) => {
      const r = await vault.extendConcept(
        {
          note: args.note,
          passages: args.passages,
          from_notes: args.from_notes,
          core_assertions: args.core_assertions,
        },
        args.execute === true,
        args.versions,
      );
      return r.errors.length ? refused('extend_concept', r) : json(r);
    },
  });
}
