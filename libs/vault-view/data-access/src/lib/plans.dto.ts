import type { GoalStatusName, PlanLevelName } from '@ai-coach/vault-view-util';

export interface PlanPeriodDto {
  level: PlanLevelName;
  period: string;
  start: string;
  end: string;
}

export interface PlanColumnDto extends PlanPeriodDto {
  current: boolean;
}

export interface PlanCellDto {
  done: number;
  planned: number;
}

export interface PlanTaskRefDto {
  text: string;
  note: string;
  state: 'open' | 'done' | 'cancelled' | 'missed';
  size: string | null;
  weight: number;
  scheduled: string | null;
  doneOn: string | null;
  slipped: string[];
  column: number;
}

export interface PlanPacketDto {
  path: string;
  title: string;
}

export interface PlanRowDto {
  id: string;
  kind: 'project' | 'workstream' | 'area' | 'unlinked';
  name: string;
  project: string | null;
  archived: boolean;
  status: string | null;
  note: string | null;
  deadline: string | null;
  doneWhen: string | null;
  packets: PlanPacketDto[];
  cells: PlanCellDto[];
  tasks: PlanTaskRefDto[];
}

export interface PlanOwnerDto {
  project: string | null;
  workstream: string | null;
  area: string | null;
}

export interface GoalNodeDto {
  text: string;
  note: string;
  level: PlanLevelName;
  period: string;
  start: string;
  end: string;
  blockId: string | null;
  status: GoalStatusName;
  slipped: string[];
  owner: PlanOwnerDto;
  row: string | null;
  children: GoalNodeDto[];
}

export interface PlansViewDto {
  today: string;
  span: PlanPeriodDto;
  by: PlanLevelName;
  previous: string;
  next: string;
  columns: PlanColumnDto[];
  rows: PlanRowDto[];
  goals: GoalNodeDto[];
  todayAt: Record<PlanLevelName, string>;
  focusAt: Record<PlanLevelName, string>;
  vaultName: string;
}

export type PlansSelection =
  | { kind: 'goal'; goal: GoalNodeDto }
  | { kind: 'row'; row: PlanRowDto; column?: number };
