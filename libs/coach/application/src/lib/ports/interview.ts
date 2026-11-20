import type {
  IndependenceLevel,
  InterviewAttempt,
  InterviewDifficulty,
  InterviewMode,
  InterviewProblem,
} from '@ai-coach/domain';

export interface StoredInterviewProblem extends InterviewProblem {
  notePath: string;
  body: string;
}

export interface SaveInterviewProblemInput {
  slug: string;
  title: string;
  source: string;
  difficulty: InterviewDifficulty;
  patterns: string[];
  lists: string[];
  solutionPath: string;
  description: string;
  constraints: string[];
  examples: string[];
}

export interface LogInterviewAttemptInput {
  slug: string;
  date: string;
  mode: InterviewMode;
  durationSec: number;
  independence: IndependenceLevel;
  hintsUsed: number;
  passedTests: number;
  totalTests: number;
  timeComplexity: string;
  spaceComplexity: string;
  mistakes: string[];
  codeSnapshot: string;
  nextReview: string;
  rung: number;
}

export interface InterviewWritePlan {
  executed: boolean;
  paths: string[];
  preview: string;
  errors: string[];
}

export interface InterviewStore {
  listInterviewProblems(): Promise<StoredInterviewProblem[]>;
  getInterviewProblem(slug: string): Promise<StoredInterviewProblem | null>;
  saveInterviewProblem(
    input: SaveInterviewProblemInput,
    execute: boolean,
  ): Promise<InterviewWritePlan>;
  logInterviewAttempt(
    input: LogInterviewAttemptInput,
    execute: boolean,
  ): Promise<InterviewWritePlan>;
}

export interface FetchedProblem {
  slug: string;
  title: string;
  source: string;
  difficulty: InterviewDifficulty;
  tags: string[];
  description: string;
  constraints: string[];
  examples: string[];
  starterCode: string | null;
}

export interface ProblemFetcher {
  fetchProblem(url: string): Promise<FetchedProblem | null>;
}

export interface PracticeRepoInitResult {
  root: string;
  created: string[];
  skipped: string[];
}

export interface ProblemScaffoldInput {
  slug: string;
  title: string;
  pattern: string;
  source: string;
  starterCode: string | null;
  examples: string[];
}

export interface ScaffoldedFiles {
  solutionPath: string;
  testPath: string;
  created: string[];
}

export interface TestRunResult {
  passed: boolean;
  passedTests: number;
  totalTests: number;
  durationMs: number;
  timedOut: boolean;
  output: string;
}

export interface CodeWorkspace {
  initPracticeRepo(dir: string): Promise<PracticeRepoInitResult>;
  scaffoldProblemFiles(input: ProblemScaffoldInput): Promise<ScaffoldedFiles>;
  readSolutionCode(solutionPath: string): Promise<string | null>;
  runProblemTests(
    solutionPath: string,
    timeoutMs?: number,
  ): Promise<TestRunResult>;
}

export type RecordedAttemptSummary = Pick<
  InterviewAttempt,
  | 'date'
  | 'independence'
  | 'durationSec'
  | 'passedTests'
  | 'totalTests'
  | 'timeComplexity'
  | 'spaceComplexity'
>;
