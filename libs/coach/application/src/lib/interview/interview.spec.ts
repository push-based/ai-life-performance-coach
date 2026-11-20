import type {
  CodeWorkspace,
  FetchedProblem,
  InterviewStore,
  InterviewWritePlan,
  LogInterviewAttemptInput,
  ProblemFetcher,
  SaveInterviewProblemInput,
  StoredInterviewProblem,
} from '../ports/interview.js';
import { Interview } from './interview.js';

class FakeStore implements InterviewStore {
  readonly problems = new Map<string, StoredInterviewProblem>();

  async listInterviewProblems(): Promise<StoredInterviewProblem[]> {
    return [...this.problems.values()];
  }

  async getInterviewProblem(
    slug: string,
  ): Promise<StoredInterviewProblem | null> {
    return this.problems.get(slug) ?? null;
  }

  async saveInterviewProblem(
    input: SaveInterviewProblemInput,
    execute: boolean,
  ): Promise<InterviewWritePlan> {
    const path = `Coach/interview/problems/${input.slug}/problem.md`;
    if (execute) {
      this.problems.set(input.slug, {
        slug: input.slug,
        title: input.title,
        source: input.source,
        difficulty: input.difficulty,
        patterns: input.patterns,
        lists: input.lists,
        status: 'active',
        nextReview: null,
        rung: -1,
        solutionPath: input.solutionPath,
        attempts: [],
        notePath: path,
        body: input.description,
      });
    }
    return { executed: execute, paths: [path], preview: input.title, errors: [] };
  }

  async logInterviewAttempt(
    input: LogInterviewAttemptInput,
    execute: boolean,
  ): Promise<InterviewWritePlan> {
    const existing = this.problems.get(input.slug);
    const path = `Coach/interview/problems/${input.slug}/attempts.jsonl`;
    if (execute && existing) {
      existing.nextReview = input.nextReview;
      existing.rung = input.rung;
      existing.attempts.push({
        id: String(existing.attempts.length + 1),
        date: input.date,
        mode: input.mode,
        durationSec: input.durationSec,
        independence: input.independence,
        hintsUsed: input.hintsUsed,
        passedTests: input.passedTests,
        totalTests: input.totalTests,
        timeComplexity: input.timeComplexity,
        spaceComplexity: input.spaceComplexity,
        mistakes: input.mistakes,
        codeSnapshot: input.codeSnapshot,
      });
    }
    return {
      executed: execute,
      paths: [path],
      preview: `${input.slug} -> ${input.nextReview}`,
      errors: [],
    };
  }
}

describe('Interview use case', () => {
  it('adds a problem from URL, scaffolds files, and schedules solo vs assisted reviews', async () => {
    const store = new FakeStore();
    const fetcher: ProblemFetcher = {
      async fetchProblem(): Promise<FetchedProblem | null> {
        return {
          slug: 'two-sum',
          title: 'Two Sum',
          source: 'https://leetcode.com/problems/two-sum/',
          difficulty: 'easy',
          tags: ['Array', 'Hash Table'],
          description: 'Find two numbers adding to target.',
          constraints: ['2 <= nums.length <= 10^4'],
          examples: ['Input: nums = [2,7,11,15], target = 9 -> Output: [0,1]'],
          starterCode: 'export function twoSum(nums: number[], target: number): number[] { return []; }',
        };
      },
    };
    const scaffolded: string[] = [];
    const workspace: CodeWorkspace = {
      async initPracticeRepo(dir) {
        return { root: dir, created: ['package.json'], skipped: [] };
      },
      async scaffoldProblemFiles(input) {
        const solutionPath = `packages/dsa/${input.pattern}/${input.slug}/solution.ts`;
        const testPath = `packages/dsa/${input.pattern}/${input.slug}/solution.test.ts`;
        scaffolded.push(solutionPath, testPath);
        return { solutionPath, testPath, created: [solutionPath, testPath] };
      },
      async readSolutionCode() {
        return 'export function twoSum() { return [0, 1]; }';
      },
      async runProblemTests() {
        return {
          passed: true,
          passedTests: 3,
          totalTests: 3,
          durationMs: 12,
          timedOut: false,
          output: 'ok',
        };
      },
    };

    const interview = new Interview({
      store,
      fetcher,
      workspace,
      clock: { today: () => '2026-11-20' },
    });

    const prepared = await interview.prepareAdd({
      urlOrSlug: 'https://leetcode.com/problems/two-sum/description/',
    });
    expect(prepared.fetched).toBe(true);
    expect(prepared.input.slug).toBe('two-sum');
    expect(prepared.plan.executed).toBe(false);

    const added = await interview.commitAdd(prepared);
    expect(added.plan.executed).toBe(true);
    expect(scaffolded).toHaveLength(2);

    const testResult = await interview.testProblem('two-sum');
    expect(testResult.passed).toBe(true);

    const logged = await interview.commitLogAttempt({
      slug: 'two-sum',
      mode: 'cli',
      durationSec: 420,
      independence: 'assisted',
      hintsUsed: 1,
      passedTests: 3,
      totalTests: 3,
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      mistakes: ['missed-duplicate-value'],
    });
    expect(logged.nextReview).toBe('2026-11-22');
    expect(logged.rung).toBe(-1);

    const overview = await interview.list();
    expect(overview.total).toBe(1);
    expect(overview.soloCount).toBe(0);
    expect(overview.byPattern[0]?.assisted).toBe(1);
  });
});
