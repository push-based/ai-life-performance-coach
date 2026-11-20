import {
  DEFAULT_INTERVIEW_LADDER,
  formatTitleFromSlug,
  normalizeSlug,
  parseProblemUrl,
  rankDueProblems,
  scheduleInterviewReview,
  type IndependenceLevel,
  type InterviewDifficulty,
  type InterviewLadder,
  type InterviewMode,
} from '@ai-coach/domain';
import { NotFoundError } from '../errors.js';
import type {
  CodeWorkspace,
  FetchedProblem,
  InterviewStore,
  InterviewWritePlan,
  PracticeRepoInitResult,
  ProblemFetcher,
  SaveInterviewProblemInput,
  ScaffoldedFiles,
  StoredInterviewProblem,
  TestRunResult,
} from '../ports/interview.js';
import type { Clock } from '../ports/state.js';

export interface InterviewDeps {
  store: InterviewStore;
  fetcher: ProblemFetcher;
  workspace: CodeWorkspace;
  clock: Clock;
  ladder?: InterviewLadder;
}

export interface AddProblemRequest {
  urlOrSlug: string;
  title?: string;
  difficulty?: InterviewDifficulty;
  pattern?: string;
  lists?: string[];
  description?: string;
  constraints?: string[];
  examples?: string[];
  starterCode?: string | null;
}

export interface PreparedProblem {
  input: SaveInterviewProblemInput;
  starterCode: string | null;
  fetched: boolean;
  plan: InterviewWritePlan;
}

export interface AddedProblem {
  problem: SaveInterviewProblemInput;
  plan: InterviewWritePlan;
  files: ScaffoldedFiles;
}

export interface LogAttemptRequest {
  slug: string;
  mode: InterviewMode;
  durationSec: number;
  independence: IndependenceLevel;
  hintsUsed: number;
  passedTests: number;
  totalTests: number;
  timeComplexity: string;
  spaceComplexity: string;
  mistakes: string[];
}

export interface PreparedAttempt {
  slug: string;
  date: string;
  nextReview: string;
  intervalDays: number;
  rung: number;
  plan: InterviewWritePlan;
}

export interface PatternSummary {
  pattern: string;
  total: number;
  solo: number;
  assisted: number;
}

export interface InterviewOverview {
  problems: StoredInterviewProblem[];
  byPattern: PatternSummary[];
  total: number;
  soloCount: number;
}

export class Interview {
  private readonly ladder: InterviewLadder;

  constructor(private readonly deps: InterviewDeps) {
    this.ladder = deps.ladder ?? DEFAULT_INTERVIEW_LADDER;
  }

  initPracticeRepo(dir: string): Promise<PracticeRepoInitResult> {
    return this.deps.workspace.initPracticeRepo(dir);
  }

  async prepareAdd(request: AddProblemRequest): Promise<PreparedProblem> {
    const parsed = parseProblemUrl(request.urlOrSlug);
    const fetched: FetchedProblem | null = parsed
      ? await this.deps.fetcher.fetchProblem(parsed.canonicalUrl)
      : null;

    const slug = fetched?.slug ?? parsed?.slug ?? normalizeSlug(request.urlOrSlug);
    const title = request.title ?? fetched?.title ?? formatTitleFromSlug(slug);
    const source = parsed?.canonicalUrl ?? fetched?.source ?? '';
    const difficulty: InterviewDifficulty =
      request.difficulty ?? fetched?.difficulty ?? 'medium';
    const rawPattern =
      request.pattern ?? fetched?.tags[0] ?? 'general';
    const pattern = normalizeSlug(rawPattern);
    const patterns = Array.from(
      new Set([
        pattern,
        ...(fetched?.tags.map((t) => normalizeSlug(t)) ?? []),
      ]),
    );
    const lists = request.lists ?? [];
    const solutionPath = `packages/dsa/${pattern}/${slug}/solution.ts`;
    const input: SaveInterviewProblemInput = {
      slug,
      title,
      source,
      difficulty,
      patterns,
      lists,
      solutionPath,
      description: request.description ?? fetched?.description ?? '',
      constraints: request.constraints ?? fetched?.constraints ?? [],
      examples: request.examples ?? fetched?.examples ?? [],
    };
    const plan = await this.deps.store.saveInterviewProblem(input, false);
    return {
      input,
      starterCode: request.starterCode ?? fetched?.starterCode ?? null,
      fetched: fetched !== null,
      plan,
    };
  }

  async commitAdd(prepared: PreparedProblem): Promise<AddedProblem> {
    const plan = await this.deps.store.saveInterviewProblem(
      prepared.input,
      true,
    );
    const pattern = prepared.input.patterns[0] ?? 'general';
    const files = await this.deps.workspace.scaffoldProblemFiles({
      slug: prepared.input.slug,
      title: prepared.input.title,
      pattern,
      source: prepared.input.source,
      starterCode: prepared.starterCode,
      examples: prepared.input.examples,
    });
    return { problem: prepared.input, plan, files };
  }

  async getProblem(slug: string): Promise<StoredInterviewProblem> {
    const normalized = normalizeSlug(slug);
    const found = await this.deps.store.getInterviewProblem(normalized);
    if (!found) {
      throw new NotFoundError(`Interview problem not found: ${normalized}`);
    }
    return found;
  }

  async testProblem(slug: string, timeoutMs?: number): Promise<TestRunResult> {
    const problem = await this.getProblem(slug);
    return this.deps.workspace.runProblemTests(problem.solutionPath, timeoutMs);
  }

  async prepareLogAttempt(request: LogAttemptRequest): Promise<PreparedAttempt> {
    const problem = await this.getProblem(request.slug);
    const date = this.deps.clock.today();
    const schedule = scheduleInterviewReview(
      {
        independence: request.independence,
        date,
        currentRung: problem.rung,
      },
      this.ladder,
    );
    const codeSnapshot =
      (await this.deps.workspace.readSolutionCode(problem.solutionPath)) ?? '';
    const plan = await this.deps.store.logInterviewAttempt(
      {
        slug: problem.slug,
        date,
        mode: request.mode,
        durationSec: request.durationSec,
        independence: request.independence,
        hintsUsed: request.hintsUsed,
        passedTests: request.passedTests,
        totalTests: request.totalTests,
        timeComplexity: request.timeComplexity,
        spaceComplexity: request.spaceComplexity,
        mistakes: request.mistakes,
        codeSnapshot,
        nextReview: schedule.nextReview,
        rung: schedule.rung,
      },
      false,
    );
    return {
      slug: problem.slug,
      date,
      nextReview: schedule.nextReview,
      intervalDays: schedule.intervalDays,
      rung: schedule.rung,
      plan,
    };
  }

  async commitLogAttempt(
    request: LogAttemptRequest,
  ): Promise<PreparedAttempt> {
    const problem = await this.getProblem(request.slug);
    const date = this.deps.clock.today();
    const schedule = scheduleInterviewReview(
      {
        independence: request.independence,
        date,
        currentRung: problem.rung,
      },
      this.ladder,
    );
    const codeSnapshot =
      (await this.deps.workspace.readSolutionCode(problem.solutionPath)) ?? '';
    const plan = await this.deps.store.logInterviewAttempt(
      {
        slug: problem.slug,
        date,
        mode: request.mode,
        durationSec: request.durationSec,
        independence: request.independence,
        hintsUsed: request.hintsUsed,
        passedTests: request.passedTests,
        totalTests: request.totalTests,
        timeComplexity: request.timeComplexity,
        spaceComplexity: request.spaceComplexity,
        mistakes: request.mistakes,
        codeSnapshot,
        nextReview: schedule.nextReview,
        rung: schedule.rung,
      },
      true,
    );
    return {
      slug: problem.slug,
      date,
      nextReview: schedule.nextReview,
      intervalDays: schedule.intervalDays,
      rung: schedule.rung,
      plan,
    };
  }

  async due(): Promise<StoredInterviewProblem[]> {
    const problems = await this.deps.store.listInterviewProblems();
    return rankDueProblems(problems, this.deps.clock.today());
  }

  async list(): Promise<InterviewOverview> {
    const problems = await this.deps.store.listInterviewProblems();
    const byPatternMap = new Map<string, PatternSummary>();
    let soloCount = 0;

    for (const p of problems) {
      const last = p.attempts[p.attempts.length - 1];
      const isSolo = last?.independence === 'solo';
      const isAssisted =
        last?.independence === 'assisted' ||
        last?.independence === 'nudge' ||
        last?.independence === 'editorial';
      if (isSolo) soloCount += 1;

      const pattern = p.patterns[0] ?? 'general';
      const entry = byPatternMap.get(pattern) ?? {
        pattern,
        total: 0,
        solo: 0,
        assisted: 0,
      };
      entry.total += 1;
      if (isSolo) entry.solo += 1;
      if (isAssisted) entry.assisted += 1;
      byPatternMap.set(pattern, entry);
    }

    const byPattern = [...byPatternMap.values()].sort((a, b) =>
      a.pattern.localeCompare(b.pattern),
    );
    return {
      problems: [...problems].sort((a, b) => a.slug.localeCompare(b.slug)),
      byPattern,
      total: problems.length,
      soloCount,
    };
  }
}
