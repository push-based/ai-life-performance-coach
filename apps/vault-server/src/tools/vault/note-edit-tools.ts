import { z } from 'zod';
import { defineTool, type ToolDef } from '../../tool-types.js';
import type { Vault } from '@ai-coach/vault-application';
import { json, fail } from './json.js';
import { TASK_FIELDS, VERSIONS } from './planning-tools.js';

const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const SIZE = z.enum(['S', 'M', 'L']);
const EXECUTE = z
  .boolean()
  .optional()
  .describe('Write it (default: preview only)');
const ADDRESS = {
  line: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      "The task's line as planning_overview reports it (0-based in the note body); executing needs the preview's versions",
    ),
  blockId: z.string().optional().describe("The task's ^block id or its 🆔"),
  task: z
    .string()
    .min(1)
    .optional()
    .describe('Part of the description that matches exactly one open task'),
  include_closed: z
    .boolean()
    .optional()
    .describe(
      "With task: match done and cancelled tasks too, still exactly one; to fix a ticked task's text",
    ),
};
const PREVIEW_LINES =
  'Each previewed edit gives line (0-based in the note body, the same numbering planning_overview reports and line accepts; absent in frontmatter), fileLine (1-based in the file, for showing the user, never to pass back), and under (the heading above it) and above (the line above it) for context.';

const address = <T extends { include_closed?: boolean }>({
  include_closed,
  ...a
}: T) => ({
  ...a,
  ...(include_closed !== undefined ? { includeClosed: include_closed } : {}),
});

const refused = (tool: string, r: { errors: string[] }) =>
  fail(`${tool} refused:\n- ${r.errors.join('\n- ')}`);

export function updateTaskTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'update_task',
    description: `Change existing tasks or goals where they stand (ADR-KI-0064): description, size, priority, scheduled date, state (done writes ✅ today, cancelled writes [-] and ❌ today, open clears both), a goal's parent goal one level up, 🆔 id, ⛔ blockedBy and 🔁 recurrence. Only the fields given change; the rest of the line, slip tags included, stays as it is. Address each task by its note and one of line, blockId or task; task matches open tasks only, unless include_closed: true, which also reaches a done or cancelled task, e.g. to fix a name in a ticked task's text while its [x], ✅ date and every other signifier stay. Several updates go in one preview. ${PREVIEW_LINES} Refuses done or cancelled on a repeating task: tick it in Obsidian so Tasks writes the next occurrence, or set recurrence: null with it to end the habit. Preview, show the user each before/after line, then execute: true with the preview's versions.`,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    },
    schema: {
      updates: z
        .array(
          z.object({
            note: z.string().describe('The note the task is written in'),
            ...ADDRESS,
            set: z
              .object({
                text: z
                  .string()
                  .min(1)
                  .optional()
                  .describe(
                    'The new description with its links; size, slip tags and parent link are kept',
                  ),
                size: SIZE.nullable().optional(),
                priority: z
                  .enum(['highest', 'high', 'medium', 'low', 'lowest'])
                  .nullable()
                  .optional(),
                scheduled: DAY.nullable().optional(),
                state: z.enum(['open', 'done', 'cancelled']).optional(),
                parent: z
                  .string()
                  .nullable()
                  .optional()
                  .describe(
                    "A goal's parent one level up: <period>#^<block id>",
                  ),
                id: z.string().nullable().optional(),
                blockedBy: z.array(z.string()).nullable().optional(),
                recurrence: z
                  .string()
                  .nullable()
                  .optional()
                  .describe(
                    "A Tasks rule such as 'every week on Monday'; null ends the habit",
                  ),
              })
              .describe('Only what changes; null removes a field'),
          }),
        )
        .min(1),
      execute: EXECUTE,
      versions: VERSIONS,
    },
    handler: async (args) => {
      const r = await vault.updateTasks(
        args.updates.map(address),
        args.execute === true,
        args.versions,
      );
      return r.errors.length ? refused('update_task', r) : json(r);
    },
  });
}

export function addHabitsTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'add_habits',
    description:
      "Define habits (ADR-KI-0065): routines such as getting up at 6:00, a walk or reading, done on given days and simply missed on a day they are not done. Each is written as a plain list item with its 🔁 rule under ## Habits in a project, workstream or area note. plan_period and plan_days then add that day's checks to each day plan's ## Habits section; an unticked check is a missed day that never slips, is never overdue and is never rolled over, and review_period counts each habit's ticked days and streak. Use add_tasks with a 🔁 recurrence instead for repeating work that must still get done when a day is missed, such as a cleaning cycle. Change or end a habit with edit_note on its line. Refuses a plan note, a rule it cannot read, and a habit the note already defines. Preview, show the user the lines, then execute: true with the preview's versions.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    schema: {
      note: z
        .string()
        .describe(
          'The workstream, area or project note, e.g. 1.Projects/The Promise to Sylwia/Workstreams/Morning routine.md',
        ),
      habits: z
        .array(
          z.object({
            text: z
              .string()
              .min(1)
              .describe(
                "What is done, e.g. 'Up at 6:00'; no links, size or signifiers",
              ),
            rule: z
              .string()
              .min(1)
              .describe(
                "every day, every weekday, every weekend, or every week on <days>, e.g. 'every week on Monday, Wednesday and Friday'",
              ),
          }),
        )
        .min(1),
      execute: EXECUTE,
      versions: VERSIONS,
    },
    handler: async (args) => {
      const r = await vault.addHabits(
        { note: args.note, habits: args.habits },
        args.execute === true,
        args.versions,
      );
      return r.errors.length ? refused('add_habits', r) : json(r);
    },
  });
}

export function addTasksTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'add_tasks',
    description: `Add tasks to an existing project, workstream, area or plan note (ADR-KI-0064), so a task lives in its owner's note rather than as an ad-hoc line in a plan. They go into a section by heading, as subtasks under an existing task, or at the end of the note. In a section they go after its own lines and before its first subheading, so under a ### heading with #### children they land above the children. A heading that names several sections is refused with their paths; give it as a path such as 'Robotics: Machinekind/Marketing'. A missing heading, or the missing last part of a path, is created at the end of the section above it (subsections included) or of the note, at level (2–6), or one level below its parent, or 2; e.g. heading 'Keynotes/AI keynote: Łukasz Jaźwa' adds a ### under ## Keynotes. Each can carry size, priority, scheduled date, 🔁 recurrence (repeating work that stays open until done; a habit that is simply missed on a day is add_habits'), 🆔 id, ⛔ blockedBy and links; signifiers are written after the text in the order Tasks reads them. In a plan the first link is the task's project, workstream or area. Refuses an id already used, a blockedBy no task has as its 🆔, and a note outside projects, areas and plans. ${PREVIEW_LINES} Preview, show the user the lines, then execute: true with the preview's versions.`,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    schema: {
      note: z
        .string()
        .describe('The note, e.g. 1.Projects/DevFest2026/Workstreams/Talks.md'),
      heading: z
        .string()
        .optional()
        .describe(
          "The section to add to, or a path to it such as 'Robotics: Machinekind/Marketing'; without it and parent, the end of the note",
        ),
      level: z
        .number()
        .int()
        .min(2)
        .max(6)
        .optional()
        .describe(
          'With heading: the level of a heading that is created (default one below its parent, or 2)',
        ),
      parent: z
        .object(ADDRESS)
        .optional()
        .describe('An existing task to indent the new ones under'),
      tasks: z
        .array(
          z.object({
            text: z.string().min(1).describe('The description only'),
            size: SIZE.optional(),
            scheduled: DAY.optional(),
            links: z
              .array(z.string())
              .optional()
              .describe(
                'Notes linked after the text; in a plan the first is the owner',
              ),
            ...TASK_FIELDS,
          }),
        )
        .min(1),
      execute: EXECUTE,
      versions: VERSIONS,
    },
    handler: async (args) => {
      const r = await vault.addTasks(
        {
          note: args.note,
          heading: args.heading,
          level: args.level,
          parent: args.parent && address(args.parent),
          tasks: args.tasks,
        },
        args.execute === true,
        args.versions,
      );
      return r.errors.length ? refused('add_tasks', r) : json(r);
    },
  });
}

export function setFrontmatterTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'set_frontmatter',
    description:
      "Set or remove frontmatter keys of a note under the PARA folders or Plans/ (ADR-KI-0064), changing only those keys' lines: a project's status, deadline or done_when, a workstream's or area's status. status must be todo, in-progress, blocked or done, and deadline YYYY-MM-DD; null removes a key. Refuses keys the vault tools own (coach_id, converted_from, raw_role, pages, climb, group, groups) and raw text. Preview, then execute: true with the preview's versions.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    },
    schema: {
      note: z.string().describe('e.g. 1.Projects/AI-Coach/AI-Coach.md'),
      set: z
        .record(
          z.string(),
          z.union([
            z.string(),
            z.number(),
            z.boolean(),
            z.array(z.string()),
            z.null(),
          ]),
        )
        .describe('Key → value; null removes the key'),
      execute: EXECUTE,
      versions: VERSIONS,
    },
    handler: async (args) => {
      const r = await vault.setFrontmatter(
        args.note,
        args.set,
        args.execute === true,
        args.versions,
      );
      return r.errors.length ? refused('set_frontmatter', r) : json(r);
    },
  });
}

export function editNoteTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'edit_note',
    description:
      "Edit the body of a note under the PARA folders or Plans/ (ADR-KI-0064): exact replacements, each 'old' occurring exactly once in the body, or one section by heading replaced or appended to (a missing section is added at the end). For prose and tables, such as a column in an agenda table, a workstream's description, a plan's Review or a day's Log, and a habit's definition line. Refuses an edit that adds, removes or changes a task line (a checkbox): tasks go through update_task (include_closed: true for a ticked or cancelled one) and add_tasks, which keep their Tasks signifiers intact; frontmatter goes through set_frontmatter. Also refuses raw text, Coach/ and anything outside the vault's folders. Preview, show the user the before/after, then execute: true with the preview's versions.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    schema: {
      note: z.string(),
      edits: z
        .array(z.object({ old: z.string().min(1), new: z.string() }))
        .optional()
        .describe('Applied in order'),
      heading: z
        .string()
        .optional()
        .describe("The section's heading text, for a section edit"),
      content: z
        .string()
        .optional()
        .describe("The section's new content, or what to append"),
      mode: z.enum(['replace', 'append']).optional(),
      execute: EXECUTE,
      versions: VERSIONS,
    },
    handler: async (args) => {
      const r = await vault.editNote(
        {
          note: args.note,
          edits: args.edits,
          heading: args.heading,
          content: args.content,
          mode: args.mode,
        },
        args.execute === true,
        args.versions,
      );
      return r.errors.length ? refused('edit_note', r) : json(r);
    },
  });
}

export function createWorkstreamTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'create_workstream',
    description:
      "Start a workstream in an active project (ADR-KI-0064): writes 1.Projects/<Project>/Workstreams/<Name>.md, or <Name>/<Name>.md with folder: true for one that will hold several notes or files, with its status (default todo), an optional description and an optional area linked in its frontmatter, and lists it under the project note's ## Workstreams. Preview, then execute: true with the preview's versions.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    schema: {
      project: z.string().describe('The project folder name, e.g. DevFest2026'),
      name: z.string().min(1).describe('e.g. Talks'),
      folder: z.boolean().optional(),
      status: z.enum(['todo', 'in-progress', 'blocked', 'done']).optional(),
      description: z.string().optional(),
      area: z.string().optional().describe('An area name, e.g. Health'),
      execute: EXECUTE,
      versions: VERSIONS,
    },
    handler: async (args) => {
      const { execute, versions, ...input } = args;
      const r = await vault.createWorkstream(input, execute === true, versions);
      return r.errors.length ? refused('create_workstream', r) : json(r);
    },
  });
}
