import type { ClimbStepName } from '@ai-coach/vault-view-util';

export interface ClimbStepRecordDto {
  date: string;
  evidence: string;
}

export interface ClimbConceptDto {
  path: string;
  title: string;
  book: string | null;
  books?: string[];
  groups?: Record<string, string>;
  steps: Partial<Record<ClimbStepName, ClimbStepRecordDto | null>>;
  skipped: ClimbStepName[];
  next: ClimbStepName | null;
  teach: { ok: boolean; reason?: string };
  current: boolean;
}

export interface ClimbConceptRefDto {
  path: string;
  title: string;
}

export interface ClimbBookDto {
  book: string;
  kind: 'book' | 'topic';
  concepts: ClimbConceptRefDto[];
  candidates?: ClimbConceptRefDto[];
  structure: string | null;
}

export interface ClimbSketchDto {
  path: string;
  name: string;
}

export interface ClimbViewDto {
  vaultName: string;
  books: ClimbBookDto[];
  concepts: ClimbConceptDto[];
  sketches: ClimbSketchDto[];
}

export interface StructureDto {
  groups: { name: string; concepts: { path: string; title: string }[] }[];
  buildsOn: { from: string; to: string }[];
}

export interface BoardDrawingDto {
  groups: { name: string; concepts: string[] }[];
  builds_on: { from: string; to: string }[];
}

export interface StructurePreviewDto {
  path?: string;
  executed?: boolean;
  versions?: Record<string, string>;
  climbs?: { path: string; climb: { group: string } }[];
  warnings?: string[];
  errors?: string[];
}

export type AssertionMarkValue = 'got it' | 'wrong' | 'missed';

export interface RevealMarkDto {
  assertion: string;
  mark: AssertionMarkValue;
  why: string;
}

export interface RevealResultDto {
  id: string;
  attempted_at: string;
  revealed_at: string;
  structure: StructureDto;
  marks: RevealMarkDto[];
  error?: string;
}

export interface GenerateMarkInputDto {
  assertion: string;
  mark: AssertionMarkValue;
  correction?: string;
}

export interface GenerateResultDto {
  executed?: boolean;
  sessionFile?: string;
  session_id?: string;
  climbs?: unknown[];
  warnings?: string[];
  errors?: string[];
}

export interface SketchResultDto {
  executed?: boolean;
  path?: string;
  bytes?: number;
  errors?: string[];
}
