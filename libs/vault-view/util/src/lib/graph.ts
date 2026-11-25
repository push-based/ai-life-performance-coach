export type GraphBucketKey =
  | 'inbox'
  | 'projects'
  | 'workstreams'
  | 'project-notes'
  | 'areas'
  | 'resources'
  | 'plans'
  | 'archive'
  | 'none';

export type GraphKindKey = 'note' | 'concept' | 'raw' | 'plan';

export type GraphWorkstreamStateKey =
  'draft' | 'ready' | 'in-progress' | 'finished' | 'migrated';

export type GraphMasteryKey =
  'unsparred' | 'attempted' | 'tier1_passed' | 'tier2_passed';

export const GRAPH_BUCKETS: readonly [GraphBucketKey, string][] = [
  ['inbox', 'Inbox'],
  ['projects', 'Projects'],
  ['workstreams', 'Workstreams'],
  ['project-notes', 'Project notes'],
  ['areas', 'Areas'],
  ['resources', 'Resources'],
  ['plans', 'Plans'],
  ['archive', 'Archive'],
  ['none', 'Out of place'],
];

export const GRAPH_KINDS: readonly [GraphKindKey, string, string][] = [
  ['note', 'Notes', ''],
  ['concept', 'Concept notes', 'dia'],
  ['raw', 'Raw resources', 'sq'],
  ['plan', 'Plans', 'hex'],
];

export const GRAPH_PLAN_LEVELS: readonly [string, string][] = [
  ['year', 'Yearly'],
  ['quarter', 'Quarterly'],
  ['month', 'Monthly'],
  ['week', 'Weekly'],
  ['day', 'Daily'],
];

export const GRAPH_WORKSTREAM_STATES: readonly [
  GraphWorkstreamStateKey,
  string,
][] = [
  ['draft', 'Draft'],
  ['ready', 'Ready for start'],
  ['in-progress', 'In progress'],
  ['finished', 'Finished'],
  ['migrated', 'Migrated to Intermediate Packet'],
];

export const GRAPH_MASTERY: readonly [GraphMasteryKey, string][] = [
  ['unsparred', 'Unsparred'],
  ['attempted', 'Attempted'],
  ['tier1_passed', 'Tier 1 passed'],
  ['tier2_passed', 'Tier 2 passed'],
];

export const GRAPH_MASTERY_RING: Partial<Record<GraphMasteryKey, string>> = {
  attempted: 'var(--attempted)',
  tier1_passed: 'var(--tier1)',
  tier2_passed: 'var(--tier2)',
};

export const GRAPH_STAGES: readonly [string, string][] = [
  ['unread', 'Not read yet'],
  ['read', 'Read'],
  ['notes', 'Notes'],
  ['distilling', 'Distilling'],
  ['distilled', 'Distilled'],
  ['concepts', 'Concepts'],
];

export const GRAPH_STAGE_FILL: Record<string, string> = {
  unread: 'var(--untouched)',
  read: 'var(--resources)',
  notes: 'var(--resources)',
  distilling: 'var(--bold)',
  distilled: 'var(--complete)',
  concepts: 'var(--complete)',
};

export const GRAPH_MARK_FILL: Record<string, string> = {
  none: 'var(--untouched)',
  bold: 'var(--bold)',
  highlight: 'var(--highlight)',
};

export const GRAPH_CHAPTER_STATE_LABEL: Record<string, string> = {
  untouched: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
};

export interface GraphNodeLike {
  bucket: string | null;
  project: boolean;
  workstream: boolean;
  workstreamStatus: GraphWorkstreamStateKey | null;
  plan: boolean;
  planLevel: string | null;
  raw: boolean;
  rawRole: 'index' | 'chapter' | null;
  concept: boolean;
  stage: string | null;
  distill: {
    state: 'untouched' | 'in_progress' | 'complete';
    summary: boolean;
    pages: { page: number; mark: string; summary: boolean; empty: boolean }[];
  } | null;
}

export function labelOf(
  list: readonly (readonly [string, string, ...unknown[]])[],
  key: string | null | undefined,
): string {
  if (!key) return '';
  return list.find(([k]) => k === key)?.[1] ?? key;
}

export function bucketOfNode(n: GraphNodeLike): GraphBucketKey {
  if (n.workstream && n.bucket === 'projects') return 'workstreams';
  if (n.plan) return 'plans';
  if (n.bucket === 'projects' && !n.project) return 'project-notes';
  return (n.bucket as GraphBucketKey | null) || 'none';
}

export function kindOfNode(n: GraphNodeLike): GraphKindKey {
  if (n.concept) return 'concept';
  if (n.raw) return 'raw';
  if (n.plan) return 'plan';
  return 'note';
}

export function chapterFillOf(n: GraphNodeLike): string | null {
  const d = n.distill;
  if (!d) return null;
  if (d.state === 'complete') return 'var(--complete)';
  const mark = d.pages.some((p) => p.mark === 'highlight')
    ? 'highlight'
    : d.pages.some((p) => p.mark === 'bold')
      ? 'bold'
      : 'none';
  return GRAPH_MARK_FILL[mark];
}

export function workstreamFillOf(
  status: GraphWorkstreamStateKey | null,
): string {
  return status ? `var(--ws-${status})` : 'var(--workstreams)';
}

export function fillOfNode(n: GraphNodeLike): string {
  if (n.rawRole === 'index' && n.stage) {
    return GRAPH_STAGE_FILL[n.stage] ?? 'var(--resources)';
  }
  const ch = chapterFillOf(n);
  if (ch) return ch;
  if (n.plan) {
    return n.planLevel ? `var(--plan-${n.planLevel})` : 'var(--plans)';
  }
  if (n.workstream && n.bucket === 'projects') {
    return workstreamFillOf(n.workstreamStatus);
  }
  return `var(--${bucketOfNode(n)})`;
}
