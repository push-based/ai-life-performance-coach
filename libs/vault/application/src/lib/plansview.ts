import {
  nextPeriod,
  periodAt,
  periodOf,
  previousPeriod,
  type Period,
} from './plans.js';
import {
  planning,
  PLAN_LEVELS,
  type OwnedTask,
  type Owner,
  type PlanLevel,
  type Status,
  type WorkstreamStatus,
  type VaultNote,
  type VaultTree,
} from '@ai-coach/vault-domain';

const ORDER = Object.keys(PLAN_LEVELS) as PlanLevel[];

export interface Cell {
  done: number;

  planned: number;
}

export interface TaskRef {
  text: string;
  note: string;
  state: OwnedTask['state'];
  size: string | null;
  weight: number;
  scheduled: string | null;
  doneOn: string | null;
  slipped: string[];

  column: number;
}

export interface Row {
  id: string;
  kind: 'project' | 'workstream' | 'area' | 'unlinked';
  name: string;

  project: string | null;
  archived: boolean;
  status: Status | WorkstreamStatus | null;

  note: string | null;
  deadline: string | null;
  doneWhen: string | null;
  packets: { path: string; title: string }[];
  cells: Cell[];
  tasks: TaskRef[];
}

export interface GoalNode {
  text: string;
  note: string;
  level: PlanLevel;
  period: string;

  start: string;
  end: string;
  blockId: string | null;
  status: 'met' | 'open' | 'missed' | 'dropped';
  slipped: string[];
  owner: Owner;

  row: string | null;
  children: GoalNode[];
}

export interface PlansView {
  today: string;
  span: Period;
  by: PlanLevel;
  previous: string;
  next: string;
  columns: (Period & { current: boolean })[];
  rows: Row[];
  goals: GoalNode[];

  todayAt: Record<PlanLevel, string>;

  focusAt: Record<PlanLevel, string>;
}

export const rowOf = (o: Owner): string | null =>
  o.workstream
    ? `w:${o.project}/${o.workstream}`
    : o.project
      ? `p:${o.project}`
      : o.area
        ? `a:${o.area}`
        : null;

export function plansView(
  tree: VaultTree,
  notes: VaultNote[],
  spanName: string,
  byLevel: string,
  today: string,
): PlansView | { error: string } {
  const span = periodOf(spanName);
  if (!span) return { error: `"${spanName}" is not a period` };
  const by = byLevel as PlanLevel;
  if (!ORDER.includes(by) || ORDER.indexOf(by) <= ORDER.indexOf(span.level)) {
    return {
      error: `"${byLevel}" is not a level below ${span.level}: use one of ${ORDER.slice(ORDER.indexOf(span.level) + 1).join(', ') || 'none'}`,
    };
  }

  const columns: PlansView['columns'] = [];
  for (
    let c = periodAt(by, span.start);
    c.start <= span.end;
    c = nextPeriod(c)
  ) {
    columns.push({ ...c, current: c.start <= today && today <= c.end });
  }
  const columnOf = (day: string | null) =>
    day ? columns.findIndex((c) => c.start <= day && day <= c.end) : -1;

  const p = planning(tree, notes);
  const byPath = new Map(notes.map((n) => [n.path, n]));
  const titleOf = (path: string) => byPath.get(path)?.title ?? path;
  const empty = (): Cell[] => columns.map(() => ({ done: 0, planned: 0 }));
  const row = (r: Omit<Row, 'cells' | 'tasks'>): Row => ({
    ...r,
    cells: empty(),
    tasks: [],
  });

  const rows: Row[] = [];
  const index = new Map<string, Row>();
  const push = (r: Row) => {
    rows.push(r);
    index.set(r.id, r);
  };

  for (const pr of [...p.projects].sort(
    (a, b) =>
      Number(a.archived) - Number(b.archived) || (a.name < b.name ? -1 : 1),
  )) {
    push(
      row({
        id: `p:${pr.name}`,
        kind: 'project',
        name: pr.name,
        project: null,
        archived: pr.archived,
        status: pr.status,
        note: pr.note,
        deadline: pr.deadline,
        doneWhen: pr.doneWhen,
        packets: pr.packets.map((path) => ({ path, title: titleOf(path) })),
      }),
    );
    for (const w of pr.workstreams) {
      push(
        row({
          id: `w:${pr.name}/${w.name}`,
          kind: 'workstream',
          name: w.name,
          project: pr.name,
          archived: pr.archived,
          status: w.status,
          note: w.note,
          deadline: null,
          doneWhen: null,
          packets: [],
        }),
      );
    }
  }
  for (const a of p.areas)
    push(
      row({
        id: `a:${a.name}`,
        kind: 'area',
        name: a.name,
        project: null,
        archived: false,
        status: a.status,
        note: a.note,
        deadline: null,
        doneWhen: null,
        packets: [],
      }),
    );
  push(
    row({
      id: 'unlinked',
      kind: 'unlinked',
      name: 'Unlinked',
      project: null,
      archived: false,
      status: null,
      note: null,
      deadline: null,
      doneWhen: null,
      packets: [],
    }),
  );

  for (const t of p.tasks) {
    if (t.goal || t.habit || t.state === 'cancelled' || t.state === 'missed')
      continue;
    const col = t.state === 'done' ? columnOf(t.doneOn) : columnOf(t.scheduled);
    if (col < 0) continue;
    const ref: TaskRef = {
      text: t.text,
      note: t.note,
      state: t.state,
      size: t.size,
      weight: t.weight,
      scheduled: t.scheduled,
      doneOn: t.doneOn,
      slipped: t.slipped,
      column: col,
    };

    const ids = [
      rowOf(t.owner) ?? 'unlinked',
      ...(t.owner.workstream ? [`p:${t.owner.project}`] : []),
    ];
    for (const id of ids) {
      const r = index.get(id);
      if (!r) continue;
      if (t.state === 'done') r.cells[col].done += t.weight;
      else r.cells[col].planned += t.weight;
      r.tasks.push(ref);
    }
  }

  const overlapping = p.tasks.filter((t) => {
    if (!t.goal || !t.plan) return false;
    const gp = periodOf(t.plan.period);
    return !!gp && gp.start <= span.end && gp.end >= span.start;
  });
  const node = (g: OwnedTask): GoalNode => {
    const gp = periodOf(g.plan!.period)!;
    return {
      text: g.text,
      note: g.note,
      level: gp.level,
      period: gp.period,
      start: gp.start,
      end: gp.end,
      blockId: g.blockId,
      status:
        g.state === 'done'
          ? 'met'
          : g.state === 'cancelled'
            ? 'dropped'
            : g.state === 'missed' || today > gp.end
              ? 'missed'
              : 'open',
      slipped: g.slipped,
      owner: g.owner,
      row: rowOf(g.owner),
      children: [],
    };
  };
  const nodes = overlapping.map((g) => ({ g, n: node(g) }));
  const byAddress = new Map(
    nodes
      .filter((x) => x.n.blockId)
      .map((x) => [`${x.n.period}#${x.n.blockId}`, x.n]),
  );
  const roots: GoalNode[] = [];
  for (const { g, n } of nodes) {
    const parent = g.parent
      ? byAddress.get(`${g.parent.target}#${g.parent.block}`)
      : undefined;
    if (parent && parent !== n) parent.children.push(n);
    else roots.push(n);
  }
  const sort = (list: GoalNode[]) => {
    list.sort(
      (a, b) =>
        ORDER.indexOf(a.level) - ORDER.indexOf(b.level) ||
        (a.period < b.period ? -1 : a.period > b.period ? 1 : 0),
    );
    for (const n of list) sort(n.children);
  };
  sort(roots);

  const at = (day: string) =>
    Object.fromEntries(
      ORDER.map((l) => [l, periodAt(l, day).period]),
    ) as Record<PlanLevel, string>;
  const focus = span.start <= today && today <= span.end ? today : span.start;
  return {
    today,
    span,
    by,
    previous: previousPeriod(span).period,
    next: nextPeriod(span).period,
    columns,
    rows,
    goals: roots,
    todayAt: at(today),
    focusAt: at(focus),
  };
}
