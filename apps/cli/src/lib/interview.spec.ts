import { Interview } from '@ai-coach/application';
import type {
  CodeWorkspace,
  InterviewStore,
  ProblemFetcher,
  StoredInterviewProblem,
} from '@ai-coach/application';
import type { Coach } from './composition.js';
import { interview } from './interview.js';
import type { Terminal } from './terminal.js';

function fakeTerminal(answers: string[]): { term: Terminal; out: string[] } {
  const out: string[] = [];
  const queue = [...answers];
  return {
    out,
    term: {
      print(text = '') {
        out.push(text);
      },
      async ask() {
        return queue.shift() ?? '';
      },
    },
  };
}

describe('coach interview CLI', () => {
  it('initializes a practice repo and lists due problems', async () => {
    const problems: StoredInterviewProblem[] = [
      {
        slug: 'two-sum',
        title: 'Two Sum',
        source: 'https://leetcode.com/problems/two-sum/',
        difficulty: 'easy',
        patterns: ['arrays-hashing'],
        lists: [],
        status: 'active',
        nextReview: '2026-11-20',
        rung: -1,
        solutionPath: 'packages/dsa/arrays-hashing/two-sum/solution.ts',
        notePath: 'Coach/interview/problems/two-sum/problem.md',
        body: '',
        attempts: [],
      },
    ];
    const store: InterviewStore = {
      listInterviewProblems: async () => problems,
      getInterviewProblem: async (slug) =>
        problems.find((p) => p.slug === slug) ?? null,
      saveInterviewProblem: async () => ({
        executed: true,
        paths: [],
        preview: 'ok',
        errors: [],
      }),
      logInterviewAttempt: async () => ({
        executed: true,
        paths: [],
        preview: 'ok',
        errors: [],
      }),
    };
    const fetcher: ProblemFetcher = { fetchProblem: async () => null };
    const workspace: CodeWorkspace = {
      initPracticeRepo: async (dir) => ({
        root: dir,
        created: ['package.json'],
        skipped: [],
      }),
      scaffoldProblemFiles: async (input) => ({
        solutionPath: `packages/dsa/${input.pattern}/${input.slug}/solution.ts`,
        testPath: `packages/dsa/${input.pattern}/${input.slug}/solution.test.ts`,
        created: [],
      }),
      readSolutionCode: async () => '',
      runProblemTests: async () => ({
        passed: true,
        passedTests: 3,
        totalTests: 3,
        durationMs: 10,
        timedOut: false,
        output: 'ok',
      }),
    };

    const uc = new Interview({
      store,
      fetcher,
      workspace,
      clock: { today: () => '2026-11-20' },
    });
    const coach = { interview: () => uc } as unknown as Coach;

    const initTerm = fakeTerminal([]);
    await interview(coach, initTerm.term, ['init', '/tmp/practice']);
    expect(initTerm.out.join('\n')).toContain('/tmp/practice');

    const dueTerm = fakeTerminal([]);
    await interview(coach, dueTerm.term, ['due']);
    expect(dueTerm.out.join('\n')).toContain('two-sum');
  });
});
