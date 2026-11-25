export type PlanLevelName = 'year' | 'quarter' | 'month' | 'week' | 'day';
export type GoalStatusName = 'met' | 'open' | 'missed' | 'dropped';

export interface PlanZoomOption {
  level: 'year' | 'quarter' | 'month' | 'week';
  by: 'month' | 'week' | 'day';
  label: string;
}

export const PLAN_ZOOM_OPTIONS: readonly PlanZoomOption[] = [
  { level: 'year', by: 'month', label: 'Year' },
  { level: 'quarter', by: 'week', label: 'Quarter' },
  { level: 'month', by: 'week', label: 'Month' },
  { level: 'week', by: 'day', label: 'Week' },
];

export const GOAL_STATUS_ORDER: readonly GoalStatusName[] = [
  'met',
  'open',
  'missed',
  'dropped',
];

export function columnShortLabel(col: {
  level: PlanLevelName;
  period: string;
  start: string;
}): string {
  if (col.level === 'week' || col.level === 'day') return col.period.slice(5);
  if (col.level === 'month') {
    return new Date(`${col.start}T00:00:00Z`).toLocaleString(undefined, {
      month: 'short',
      timeZone: 'UTC',
    });
  }
  return col.period;
}

export function zoomByForLevel(level: PlanLevelName): PlanLevelName | null {
  switch (level) {
    case 'year':
      return 'month';
    case 'quarter':
      return 'week';
    case 'month':
      return 'week';
    case 'week':
      return 'day';
    default:
      return null;
  }
}

export function goalWithinRange(
  goal: { start: string; end: string },
  range: { start: string; end: string },
): boolean {
  return goal.start >= range.start && goal.end <= range.end;
}

export function worstGoalStatus(
  statuses: readonly GoalStatusName[],
): GoalStatusName {
  if (statuses.includes('missed')) return 'missed';
  if (statuses.includes('open')) return 'open';
  if (statuses.includes('met')) return 'met';
  return 'dropped';
}

export interface PlansHashState {
  span: string | null;
  by: string | null;
  archived: boolean;
}

export function parsePlansHash(hash: string): PlansHashState {
  const params = new URLSearchParams(
    hash.startsWith('#') ? hash.slice(1) : hash,
  );
  return {
    span: params.get('span'),
    by: params.get('by'),
    archived: params.get('archived') === '1',
  };
}

export function formatPlansHash(state: PlansHashState): string {
  const params = new URLSearchParams();
  if (state.span) params.set('span', state.span);
  if (state.by) params.set('by', state.by);
  if (state.archived) params.set('archived', '1');
  return `#${params.toString()}`;
}
