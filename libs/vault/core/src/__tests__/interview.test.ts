import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getInterviewProblem,
  listInterviewProblems,
  logInterviewAttempt,
  saveInterviewProblem,
} from '../interview.js';

describe('vault interview storage', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'vault-interview-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('previews before writing, saves a problem, and appends attempts', async () => {
    const preview = await saveInterviewProblem(
      root,
      {
        slug: 'two-sum',
        title: 'Two Sum',
        source: 'https://leetcode.com/problems/two-sum/',
        difficulty: 'easy',
        patterns: ['arrays-hashing'],
        lists: ['neetcode-150'],
        solutionPath: 'packages/dsa/arrays-hashing/two-sum/solution.ts',
        description: 'Return indices of two numbers that sum to target.',
        constraints: ['2 <= nums.length <= 10^4'],
        examples: ['nums = [2,7,11,15], target = 9 => [0,1]'],
      },
      false,
    );
    expect(preview.executed).toBe(false);
    expect(await listInterviewProblems(root)).toHaveLength(0);

    const saved = await saveInterviewProblem(
      root,
      {
        slug: 'two-sum',
        title: 'Two Sum',
        source: 'https://leetcode.com/problems/two-sum/',
        difficulty: 'easy',
        patterns: ['arrays-hashing'],
        lists: ['neetcode-150'],
        solutionPath: 'packages/dsa/arrays-hashing/two-sum/solution.ts',
        description: 'Return indices of two numbers that sum to target.',
        constraints: ['2 <= nums.length <= 10^4'],
        examples: ['nums = [2,7,11,15], target = 9 => [0,1]'],
      },
      true,
    );
    expect(saved.executed).toBe(true);

    const logged = await logInterviewAttempt(
      root,
      {
        slug: 'two-sum',
        date: '2026-11-20',
        mode: 'cli',
        durationSec: 300,
        independence: 'solo',
        hintsUsed: 0,
        passedTests: 3,
        totalTests: 3,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(n)',
        mistakes: [],
        codeSnapshot: 'export function twoSum() { return [0, 1]; }',
        nextReview: '2026-11-27',
        rung: 0,
      },
      true,
    );
    expect(logged.executed).toBe(true);

    const problem = await getInterviewProblem(root, 'two-sum');
    expect(problem?.title).toBe('Two Sum');
    expect(problem?.nextReview).toBe('2026-11-27');
    expect(problem?.rung).toBe(0);
    expect(problem?.attempts).toHaveLength(1);
    expect(problem?.attempts[0]?.independence).toBe('solo');
  });
});
