import { z } from "zod";
import { defineTool, type ToolDef } from "../../tool-types.js";
import type { Vault } from "@docs-mcp/vault/vault.js";
import { periodOf } from "@docs-mcp/vault/plans.js";
import { json, fail } from "./json.js";

const SIZE = z.enum(["S", "M", "L"]).optional().describe("Size: S weighs 1, M 3, L 8; none counts as S");
const LINK = z.string().min(1).describe("The project, workstream or area it counts for: a name such as DevFest2026, Marketing or Health, or a note path");
const DAY = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

export function planningOverviewTool(vault: Vault): ToolDef {
  return defineTool({
  name: "planning_overview",
  description: "The planning structure of the vault (ADR-KI-0062): projects with status, deadline, definition of done and workstreams; areas; the existing plans; and the open tasks, each with its owner (project, workstream or area), size, schedule, priority and slips. Read this before planning a period with plan_period. Pass 'period' to also get the plan's goals and the tasks scheduled in it, and the goals of the plan one level up to link as parents.",
  annotations: { readOnlyHint: true, idempotentHint: true },
  schema: {
    period: z.string().optional().describe("A period: YYYY, YYYY-Qn, YYYY-MM, YYYY-Www or YYYY-MM-DD"),
    project: z.string().optional().describe("Only tasks of this project"),
    area: z.string().optional().describe("Only tasks of this area"),
  },
  handler: async (args) => {
    const period = args.period ? periodOf(args.period) : null;
    if (args.period && !period) return fail(`"${args.period}" is not a period: use YYYY, YYYY-Qn, YYYY-MM, YYYY-Www or YYYY-MM-DD`);
    const p = await vault.planning();
    const task = (t: (typeof p.tasks)[number]) => ({
      note: t.note, line: t.line, text: t.text, state: t.state, owner: t.owner, size: t.size, scheduled: t.scheduled,
      doneOn: t.doneOn, priority: t.priority, slipped: t.slipped, ...(t.goal ? { goal: true, blockId: t.blockId, parent: t.parent } : {}),
    });
    const archived = new Set(p.projects.filter(x => x.archived).map(x => x.name));
    const want = (t: (typeof p.tasks)[number]) => !archived.has(t.owner.project ?? "") && (!args.project || t.owner.project === args.project) && (!args.area || t.owner.area === args.area);
    const levels = ["year", "quarter", "month", "week", "day"] as const;
    const up = period ? levels[levels.indexOf(period.level) - 1] : undefined;
    const overlaps = (q: { start: string; end: string }) => !!period && q.start <= period.end && q.end >= period.start;
    return json({
      projects: p.projects.filter(pr => !pr.archived).map(({ packets: _p, archived: _a, ...pr }) => ({ ...pr, workstreams: pr.workstreams.map(({ notes: _n, ...w }) => w) })),
      areas: p.areas.map(({ notes: _n, ...a }) => a),
      plans: p.plans.map(x => `${x.level}:${x.period}`).sort(),
      openTasks: p.tasks.filter(t => t.state === "open" && !t.goal && want(t)).map(task),
      ...(period ? {
        period,
        goals: p.tasks.filter(t => t.goal && t.plan?.period === period.period).map(task),
        scheduled: p.tasks.filter(t => !t.goal && t.scheduled && t.scheduled >= period.start && t.scheduled <= period.end && want(t)).map(task),
        parentGoals: up ? p.tasks.filter(t => t.goal && t.plan?.level === up && overlaps(periodOf(t.plan.period)!)).map(task) : [],
      } : {}),
      warnings: p.warnings,
    });
  },
  });
}

export function planPeriodTool(vault: Vault): ToolDef {
  return defineTool({
  name: "plan_period",
  description: "Write a year, quarter, month, week or day plan in Plans/ (ADR-KI-0062). Creates the plan from its template in Plans/Templates/ when missing, adds goals (year to week; each links a project, workstream or area and, below the year, the goal it serves one level up, and gets a block id for its own children) and ad-hoc tasks, and schedules existing open tasks into the period by adding ⏳ <date> to their line where they stand. Work the plan out with the user first (planning_overview shows what there is); then preview, show the user the plan and the task edits, and re-run with execute: true. Refuses a link that is not a project, workstream or area, a parent that is not a goal one level up, and a date outside the period.",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  schema: {
    period: z.string().describe("YYYY, YYYY-Qn, YYYY-MM, YYYY-Www or YYYY-MM-DD"),
    goals: z.array(z.object({
      text: z.string().min(1).describe("The outcome, e.g. 'All workshop posters out'"),
      link: LINK,
      size: SIZE,
      parent: z.string().optional().describe("The goal one level up it serves: <period>#^<block id>, e.g. 2026-Q4#^devfest-delivered"),
    })).optional(),
    ad_hoc: z.array(z.object({
      text: z.string().min(1),
      link: LINK,
      size: SIZE,
      date: DAY.optional().describe("Schedule it on this day of the period"),
    })).optional().describe("Tasks that belong to no workstream note; they live in the plan"),
    schedule: z.array(z.object({
      note: z.string().describe("The note the task is written in"),
      task: z.string().min(1).describe("The task's description, or a part of it that matches one open task"),
      date: DAY.optional().describe("The day; defaults to the period's first day"),
    })).optional().describe("Existing open tasks to schedule into the period"),
    execute: z.boolean().optional().describe("Write it (default: preview only)"),
  },
  handler: async (args) => {
    const r = await vault.planPeriod({ period: args.period, goals: args.goals, adHoc: args.ad_hoc, schedule: args.schedule }, args.execute === true);
    return r.errors.length ? fail(`plan_period refused:\n- ${r.errors.join("\n- ")}`) : json(r);
  },
  });
}

export function rollOverTool(vault: Vault): ToolDef {
  return defineTool({
  name: "roll_over",
  description: "Close a week, month or quarter (ADR-KI-0062): every open task scheduled in it is rescheduled to the next period's first day where it stands, raised to high priority (⏫) and tagged #slipped/<period>; every open goal of its plan is copied into the next period's plan with ⏫ and the slip tags, and the original stays open as the record. Slip tags accumulate. Refuses a year (review its goals instead) and a day. Run it at the start of the new period; preview, show the user what slips, then execute: true.",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  schema: {
    period: z.string().describe("The period being closed: YYYY-Www, YYYY-MM or YYYY-Qn"),
    execute: z.boolean().optional().describe("Write it (default: preview only)"),
  },
  handler: async (args) => {
    const r = await vault.rollOver(args.period, args.execute === true);
    return r.errors.length ? fail(`roll_over refused:\n- ${r.errors.join("\n- ")}`) : json(r);
  },
  });
}

export function reviewPeriodTool(vault: Vault): ToolDef {
  return defineTool({
  name: "review_period",
  description: "Review a year, quarter, month, week or day (ADR-KI-0062): effort as the size-weighted sum of tasks done in it (S 1, M 3, L 8, untagged 1) per project and workstream, per area and unlinked, with how many done tasks had no size; each goal of the period's plan as met, open, missed (open after the period ended) or dropped, with the effort done for its owner and the goals that serve it down the chain; what slipped out of the period; and open items that slipped twice or more. Archived projects still count. Talk the review through with the user; it reads only.",
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
