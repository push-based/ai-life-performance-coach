/**
 * `review_period` (ADR-KI-0062 Decision 11): where a year, quarter, month, week or day
 * went. Effort is the size-weighted sum of tasks done in the period, per project and its
 * workstreams, per area, and unlinked; goals are met, open, missed or dropped, each with
 * the goals that serve it down the chain. Reading only.
 */

import { planning, type OwnedTask, type Owner } from "./planning.js";
import { periodOf, planPathOf, type Period } from "./plans.js";
import type { VaultNote } from "./scan.js";

export interface Effort {
  /** Size-weighted sum: S 1, M 3, L 8, untagged 1. */
  weight: number;
  tasks: number;
}

export interface ProjectEffort extends Effort {
  name: string;
  archived: boolean;
  /** Work done in the project's own notes, outside any workstream. */
  direct: Effort;
  workstreams: (Effort & { name: string })[];
}

export type GoalStatus = "met" | "open" | "missed" | "dropped";

export interface GoalReview {
  text: string;
  note: string;
  blockId: string | null;
  owner: Owner;
  status: GoalStatus;
  slipped: string[];
  /** Weighted work done in the period for the goal's workstream, project or area. */
  effort: Effort;
  /** Goals one level down that link this one as their parent, reviewed the same way. */
  children: GoalReview[];
}

export interface PeriodReview {
  period: Period;
  today: string;
  /** True once the period has ended; an open goal is then missed. */
  closed: boolean;
  plan: string | null;
  effort: { total: Effort; projects: ProjectEffort[]; areas: (Effort & { name: string })[]; unlinked: Effort };
  /** Done tasks without a size tag, counted as S. */
  untaggedDone: number;
  goals: GoalReview[];
  goalCounts: Record<GoalStatus, number>;
  /** Items that slipped out of this period (tagged #slipped/<period>). */
  slipped: { text: string; note: string; owner: Owner; goal: boolean; slips: number }[];
  /** Open items that have slipped twice or more, whichever periods. */
  slippedRepeatedly: { text: string; note: string; owner: Owner; slipped: string[] }[];
  /** Planning warnings about this period's plan: unlinked items, goals without a parent. */
  warnings: string[];
}

const zero = (): Effort => ({ weight: 0, tasks: 0 });
const add = (e: Effort, t: OwnedTask) => { e.weight += t.weight; e.tasks++; };
const byWeight = <T extends Effort & { name: string }>(a: T, b: T) => b.weight - a.weight || (a.name < b.name ? -1 : 1);

export function reviewPeriod(root: string, notes: VaultNote[], periodName: string, today: string): PeriodReview | { error: string } {
  const period = periodOf(periodName);
  if (!period) return { error: `"${periodName}" is not a period: use YYYY, YYYY-Qn, YYYY-MM, YYYY-Www or YYYY-MM-DD` };
  const p = planning(root, notes);
  const inPeriod = (d: string | null) => !!d && d >= period.start && d <= period.end;
  const done = p.tasks.filter(t => !t.goal && t.state === "done" && inPeriod(t.doneOn));

  const total = zero();
  const unlinked = zero();
  const projects = new Map<string, ProjectEffort>();
  const areas = new Map<string, Effort & { name: string }>();
  for (const t of done) {
    add(total, t);
    const { project, workstream, area } = t.owner;
    if (project) {
      const pr = projects.get(project) ?? { name: project, archived: !!p.projects.find(x => x.name === project)?.archived, ...zero(), direct: zero(), workstreams: [] };
      add(pr, t);
      if (workstream) {
        let w = pr.workstreams.find(x => x.name === workstream);
        if (!w) pr.workstreams.push((w = { name: workstream, ...zero() }));
        add(w, t);
      } else add(pr.direct, t);
      projects.set(project, pr);
    } else if (area) {
      const a = areas.get(area) ?? { name: area, ...zero() };
      add(a, t);
      areas.set(area, a);
    } else add(unlinked, t);
  }
  for (const pr of projects.values()) pr.workstreams.sort(byWeight);

  const closed = today > period.end;
  const effortFor = (o: Owner): Effort => {
    const e = zero();
    for (const t of done) {
      const hit = o.workstream ? t.owner.project === o.project && t.owner.workstream === o.workstream
        : o.project ? t.owner.project === o.project : o.area ? t.owner.area === o.area : false;
      if (hit) add(e, t);
    }
    return e;
  };
  // Goals by the address their children link: `<period>#<block id>`.
  const children = new Map<string, OwnedTask[]>();
  for (const g of p.tasks) {
    if (g.goal && g.parent) {
      const key = `${g.parent.target}#${g.parent.block}`;
      children.set(key, [...(children.get(key) ?? []), g]);
    }
  }
  const review = (g: OwnedTask, depth: number): GoalReview => {
    const gp = periodOf(g.plan!.period)!;
    const status: GoalStatus = g.state === "done" ? "met" : g.state === "cancelled" ? "dropped" : today > gp.end ? "missed" : "open";
    const kids = depth < 4 && g.blockId ? children.get(`${gp.period}#${g.blockId}`) ?? [] : [];
    return {
      text: g.text, note: g.note, blockId: g.blockId, owner: g.owner, status, slipped: g.slipped,
      effort: effortFor(g.owner), children: kids.map(k => review(k, depth + 1)),
    };
  };
  const plan = p.plans.find(x => x.period === period.period) ?? null;
  const goals = p.tasks.filter(t => t.goal && t.plan?.period === period.period).map(g => review(g, 0));
  const goalCounts: Record<GoalStatus, number> = { met: 0, open: 0, missed: 0, dropped: 0 };
  for (const g of goals) goalCounts[g.status]++;

  return {
    period, today, closed, plan: plan?.path ?? null,
    effort: { total, projects: [...projects.values()].sort(byWeight), areas: [...areas.values()].sort(byWeight), unlinked },
    untaggedDone: done.filter(t => !t.size).length,
    goals, goalCounts,
    slipped: p.tasks.filter(t => t.slipped.includes(period.period))
      .map(t => ({ text: t.text, note: t.note, owner: t.owner, goal: t.goal, slips: t.slipped.length })),
    slippedRepeatedly: p.tasks.filter(t => t.state === "open" && t.slipped.length >= 2)
      .map(t => ({ text: t.text, note: t.note, owner: t.owner, slipped: t.slipped })),
    warnings: p.warnings.filter(w => w.startsWith(`${planPathOf(period)}:`)),
  };
}
