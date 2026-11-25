import type {
  GraphMasteryKey,
  GraphWorkstreamStateKey,
  PlanLevelName,
} from '@ai-coach/vault-view-util';

export interface GraphPageMarkDto {
  page: number;
  mark: 'none' | 'bold' | 'highlight';
  summary: boolean;
  empty: boolean;
}

export interface GraphDistillDto {
  state: 'untouched' | 'in_progress' | 'complete';
  summary: boolean;
  pages: GraphPageMarkDto[];
}

export interface GraphNodeDto {
  id: string;
  title: string;
  label: string;
  bucket: string | null;
  container: string | null;
  project: boolean;
  workstream: boolean;
  workstreamStatus: GraphWorkstreamStateKey | null;
  plan: boolean;
  planLevel: PlanLevelName | null;
  raw: boolean;
  rawRole: 'index' | 'chapter' | null;
  concept: boolean;
  book: string | null;
  chapterCount: number | null;
  stage: string | null;
  readOn: string | null;
  chaptersComplete: number | null;
  notesFrom: string[] | null;
  conceptsFrom: string[] | null;
  distill: GraphDistillDto | null;
  mastery: GraphMasteryKey;
  nextReview: string | null;
}

export interface GraphEdgeDto {
  source: string;
  target: string;
  kind: 'wikilink' | 'markdown' | 'scheduled';
}

export interface VaultGraphDto {
  generatedAt: string;
  vaultName: string;
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
  unresolved: number;
}

export interface BookPageDto {
  note: string;
  title: string;
  page: number;
  text: string;
  chapterSummary: string | null;
}
