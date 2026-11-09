import { z } from "zod";
import { defineTool, type ToolDef } from "../../tool-types.js";
import type { Vault } from "@docs-mcp/vault/vault.js";
import { periodOf } from "@docs-mcp/vault/plans.js";
import { isHabitDue } from "@docs-mcp/vault/habits.js";
import { json, fail } from "./json.js";

const SIZE = z.enum(["S", "M", "L"]).optional().describe("Size: S weighs 1, M 3, L 8; none counts as S");
const LINK = z.string().min(1).describe("The project, workstream or area it counts for: a name such as Expo2026, Marketing or Health, or a note path");
const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const PRIORITY = z.enum(["highest", "high", "medium", "low", "lowest"]);
/** The Tasks fields a new task can carry (ADR-KI-0064 Decision 5). */
export const TASK_FIELDS = {
  priority: PRIORITY.optional().describe("Written as 🔺 ⏫ 🔼 🔽 ⏬"),
  recurrence: z.string().optional().describe("A Tasks rule written after 🔁, e.g. 'every week on Monday' or 'every day when done', for repeating work that stays open until done; a habit is add_habits'"),
  id: z.string().optional().describe("A 🆔 unique among the vault's planned tasks, for other tasks to wait on"),
  blockedBy: z.array(z.string()).optional().describe("🆔s of tasks this one waits on, written as ⛔"),
};
export const VERSIONS = z.record(z.string(), z.string()).optional()
  .describe("The 'versions' the preview returned; with execute: true a note that changed since is refused. Always pass them back");
const MORE_LINKS = z.array(z.string()).optional().describe("Links in order; the first is the owner when 'link' is not given, the rest any note, e.g. an area beside a workstream");

const AD_HOC = z.array(z.object({
  text: z.string().min(1).describe("The description only; priority, dates and the rest go in their own fields"),
  link: LINK.optional(),
  links: MORE_LINKS,
  size: SIZE,
  date: DAY.optional().describe("Schedule it on this day of the period"),
  ...TASK_FIELDS,
})).optional().describe("Tasks that belong to no workstream note; they live in the plan");
const SCHEDULE = z.array(z.object({
  note: z.string().describe("The note the task is written in"),
  task: z.string().min(1).describe("The task's description, or a part of it that matches one open task"),
  date: DAY.optional().describe("The day; defaults to the period's first day"),
})).optional().describe("Existing open tasks to schedule into the period");

export function planningOverviewTool(vault: Vault): ToolDef {
  return defineTool({
  name: "planning_overview",
  description: "The planning structure of the vault (ADR-KI-0062, ADR-KI-0064, ADR-KI-0065): projects with status, deadline, definition of done and workstreams; areas; the existing plans; the habits with their rules; and the open tasks (a day plan's habit checks are not tasks and are never overdue). Each task carries its note and line (0-based in the note body; with the note, its address for update_task), block id, 🆔 id and ⛔ blockedBy, owner (project, workstream or area), size, schedule, priority, 🔁 recurrence and slips. Pass 'period' to also get the plan's goals, the tasks scheduled in it, the open tasks overdue before it, and the goals of the plan one level up to link as parents; with scope 'period' only those come back, which is what planning a day or week needs. For a day it also gives the habits due that day and the day plan's habit checks. 'project' and 'area' narrow the open, scheduled and overdue tasks alike.",
  annotations: { readOnlyHint: true, idempotentHint: true },
  schema: {
    period: z.string().optional().describe("A period: YYYY, YYYY-Qn, YYYY-MM, YYYY-Www or YYYY-MM-DD"),
    project: z.string().optional().describe("Only tasks of this project"),
    area: z.string().optional().describe("Only tasks of this area"),
    scope: z.enum(["all", "period"]).optional().describe("'period' (needs 'period'): only the period, its goals, scheduled and overdue tasks and the parent goals, without the projects, areas, plans and every open task"),
  },
  handler: async (args) => {
    const period = args.period ? periodOf(args.period) : null;
    if (args.period && !period) return fail(`"${args.period}" is not a period: use YYYY, YYYY-Qn, YYYY-MM, YYYY-Www or YYYY-MM-DD`);
    if (args.scope === "period" && !period) return fail("scope 'period' needs a period");
    const p = await vault.planning();
    const habit = (h: (typeof p.habits)[number]) => ({ text: h.text, rule: h.rule, note: h.note, line: h.line, owner: h.owner });
    const dayChecks = period?.level === "day" ? p.tasks.filter(t => t.habit && t.plan?.period === period.period) : [];
    const task = (t: (typeof p.tasks)[number]) => ({
      note: t.note, line: t.line, text: t.text, state: t.state, owner: t.owner, size: t.size, scheduled: t.scheduled,
      doneOn: t.doneOn, priority: t.priority, slipped: t.slipped, recurrence: t.recurrence, id: t.id, blockedBy: t.blockedBy,
      blockId: t.blockId, ...(t.goal ? { goal: true, parent: t.parent } : {}),
    });
    const archived = new Set(p.projects.filter(x => x.archived).map(x => x.name));
    const want = (t: Pick<(typeof p.tasks)[number], "owner">) => !archived.has(t.owner.project ?? "") && (!args.project || t.owner.project === args.project) && (!args.area || t.owner.area === args.area);
    const levels = ["year", "quarter", "month", "week", "day"] as const;
    const up = period ? levels[levels.indexOf(period.level) - 1] : undefined;
    const overlaps = (q: { start: string; end: string }) => !!period && q.start <= period.end && q.end >= period.start;
    const ofPeriod = period ? {
      period,
      goals: p.tasks.filter(t => t.goal && t.plan?.period === period.period).map(task),
      ...(period.level === "day" ? {
        habitsDue: p.habits.filter(h => isHabitDue(h.rule, period.start) && want(h)).map(habit),
        habitChecks: dayChecks.filter(want).map(task),
      } : {}),
      scheduled: p.tasks.filter(t => !t.goal && !t.habit && t.scheduled && t.scheduled >= period.start && t.scheduled <= period.end && want(t)).map(task),
      overdue: p.tasks.filter(t => !t.goal && !t.habit && t.state === "open" && t.scheduled && t.scheduled < period.start && want(t)).map(task),
      parentGoals: up ? p.tasks.filter(t => t.goal && t.plan?.level === up && overlaps(periodOf(t.plan.period)!)).map(task) : [],
    } : {};
    if (args.scope === "period") return json({ ...ofPeriod, warnings: p.warnings });
    return json({
      projects: p.projects.filter(pr => !pr.archived).map(({ packets: _p, archived: _a, ...pr }) => ({ ...pr, workstreams: pr.workstreams.map(({ notes: _n, ...w }) => w) })),
      areas: p.areas.map(({ notes: _n, ...a }) => a),
      plans: p.plans.map(x => `${x.level}:${x.period}`).sort(),
      openTasks: p.tasks.filter(t => t.state === "open" && !t.goal && !t.habit && want(t)).map(task),
      habits: p.habits.filter(h => want(h)).map(habit),
      ...ofPeriod,
      warnings: p.warnings,
    });
  },
  });
}

export function planPeriodTool(vault: Vault): ToolDef {
  return defineTool({
  name: "plan_period",
  description: "Write a year, quarter, month, week or day plan in Plans/ (ADR-KI-0062). Creates the plan from its template in Plans/Templates/ when missing; for a day it adds a check to the plan's ## Habits section for each habit due that day that it does not hold yet (ADR-KI-0065); it adds goals (year to week; each links a project, workstream or area and, below the year, the goal it serves one level up, and gets a block id for its own children) and ad-hoc tasks, and schedules existing open tasks into the period by adding ⏳ <date> to their line where they stand. Ad-hoc tasks can carry priority, a 🔁 recurrence, a 🆔 id and ⛔ blockedBy, and goals and tasks can link further notes after their owner. Work the plan out with the user first (planning_overview shows what there is); then preview, show the user the plan and the task edits, and re-run with execute: true and the preview's versions. Refuses a link that is not a project, workstream or area, a parent that is not a goal one level up, and a date outside the period.",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  schema: {
    period: z.string().describe("YYYY, YYYY-Qn, YYYY-MM, YYYY-Www or YYYY-MM-DD"),
    goals: z.array(z.object({
      text: z.string().min(1).describe("The outcome, e.g. 'All workshop posters out'"),
      link: LINK.optional(),
      links: MORE_LINKS,
      size: SIZE,
      parent: z.string().optional().describe("The goal one level up it serves: <period>#^<block id>, e.g. 2026-Q4#^expo-delivered"),
    })).optional(),
    ad_hoc: AD_HOC,
    schedule: SCHEDULE,
    execute: z.boolean().optional().describe("Write it (default: preview only)"),
    versions: VERSIONS,
  },
  handler: async (args) => {
    const r = await vault.planPeriod({ period: args.period, goals: args.goals, adHoc: args.ad_hoc, schedule: args.schedule }, args.execute === true, args.versions);
    return r.errors.length ? fail(`plan_period refused:\n- ${r.errors.join("\n- ")}`) : json(r);
  },
  });
}

export function rollOverTool(vault: Vault): ToolDef {
  return defineTool({
  name: "roll_over",
  description: "Close a week, month or quarter (ADR-KI-0062): every open task scheduled in it is rescheduled to the next period's first day where it stands, raised to high priority (⏫) and tagged #slipped/<period>; every open goal of its plan is copied into the next period's plan with ⏫ and the slip tags, and the original stays open as the record. Slip tags accumulate. A repeating task (🔁) stays where it is: Tasks makes its next occurrence when ticked; a day's habit check never slips; so does an open task left in an archived project. Refuses a year (review its goals instead) and a day. Run it at the start of the new period; preview, show the user what slips, then execute: true with the preview's versions.",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  schema: {
    period: z.string().describe("The period being closed: YYYY-Www, YYYY-MM or YYYY-Qn"),
    execute: z.boolean().optional().describe("Write it (default: preview only)"),
    versions: VERSIONS,
  },
  handler: async (args) => {
    const r = await vault.rollOver(args.period, args.execute === true, args.versions);
    return r.errors.length ? fail(`roll_over refused:\n- ${r.errors.join("\n- ")}`) : json(r);
  },
  });
}

export function planDaysTool(vault: Vault): ToolDef {
  return defineTool({
  name: "plan_days",
  description: "Plan several days in one preview (ADR-KI-0064): for each day, its ad-hoc tasks and the open tasks to schedule on it, written as plan_period writes a day plan, missing day plans created from the template. Each day also gets its due habit checks, as plan_period adds them. Use it to lay out a week or to spread slipped tasks across days; preview, show the user every day, then execute: true with the preview's versions. Refuses everything if one day has an error.",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  schema: {
    days: z.record(DAY, z.object({ ad_hoc: AD_HOC, schedule: SCHEDULE.describe("Existing open tasks to schedule on this day") })).describe("Day (YYYY-MM-DD) → its ad-hoc tasks and tasks to schedule"),
    execute: z.boolean().optional().describe("Write it (default: preview only)"),
    versions: VERSIONS,
  },
  handler: async (args) => {
    const days = Object.fromEntries(Object.entries(args.days).map(([d, x]) => [d, { adHoc: x.ad_hoc, schedule: x.schedule?.map(s => ({ ...s, date: s.date ?? d })) }]));
    const r = await vault.planDays(days, args.execute === true, args.versions);
    return r.errors.length ? fail(`plan_days refused:\n- ${r.errors.join("\n- ")}`) : json(r);
  },
  });
}

export function reviewPeriodTool(vault: Vault): ToolDef {
  return defineTool({
  name: "review_period",
  description: "Review a year, quarter, month, week or day (ADR-KI-0062): effort as the size-weighted sum of tasks done in it (S 1, M 3, L 8, untagged 1) per project and workstream, per area and unlinked, with how many done tasks had no size; each goal of the period's plan as met, open, missed (open after the period ended) or dropped, with the effort done for its owner and the goals that serve it down the chain; what slipped out of the period; and open items that slipped twice or more; and each habit's due days, ticked days, missed days and current streak (habit checks are not effort). Archived projects still count. Talk the review through with the user; it reads only.",
  annotations: { readOnlyHint: true, idempotentHint: true },
  schema: {
    period: z.string().describe("YYYY, YYYY-Qn, YYYY-MM, YYYY-Www or YYYY-MM-DD"),
    today: DAY.optional().describe("The date to judge open goals against; defaults to today"),
  },
  handler: async (args) => {
    const r = await vault.reviewPeriod(args.period, args.today);
    return "error" in r ? fail(r.error) : json(r);
  },
  });
}

export function harvestWorkstreamTool(vault: Vault): ToolDef {
  return defineTool({
  name: "harvest_workstream",
  description: "Turn a finished workstream into Intermediate Packets (ADR-KI-0062): small reusable outputs another project can start from, such as a checklist, a template, a design or a message. The workstream's status must be done. Call it without 'packets' to list candidates (its notes, sections holding 3+ checkboxes, and files); talk through with the user which are worth reusing and in what words; then pass the packets to preview them and execute: true to write. Each packet becomes a note in <project>/Intermediate Packets/ linking its project and workstream; checklists are reset to unticked without dates, and files it reuses are copied beside it. The workstream is not changed. When the project is archived, its packets move to 3.Resources/Intermediate Packets/<project>/.",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  schema: {
    project: z.string().describe("The project folder name, e.g. Expo2026"),
    workstream: z.string().describe("The workstream name, e.g. Workshops"),
    packets: z.array(z.object({
      title: z.string().min(1).describe("e.g. 'Workshop speaker onboarding checklist'"),
      text: z.string().optional().describe("What it is and how to reuse it, in the user's words"),
      from: z.array(z.string()).optional().describe("A note path, '<note path>#<section>' for one section, or a file path to copy"),
    })).optional().describe("Omit to list candidates"),
    execute: z.boolean().optional().describe("Write the packets (default: preview only)"),
  },
  handler: async (args) => {
    const r = await vault.harvestWorkstream(args.project, args.workstream, args.packets, args.execute === true);
    return r.errors.length ? fail(`harvest_workstream refused:\n- ${r.errors.join("\n- ")}${r.candidates.length ? `\ncandidates: ${JSON.stringify(r.candidates)}` : ""}`) : json(r);
  },
  });
}
