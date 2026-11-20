import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PracticeWorkspace } from './practice-workspace.js';

describe('PracticeWorkspace', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'practice-repo-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('initializes a practice monorepo, scaffolds a problem, and runs tests in a sandbox', async () => {
    const ws = new PracticeWorkspace(root);
    const init = await ws.initPracticeRepo(root);
    expect(init.created).toContain('package.json');
    expect(init.created).toContain('tsconfig.json');
    expect(init.created).toContain('packages/dsa/.gitkeep');
    expect(init.created).toContain('packages/papers/.gitkeep');

    const files = await ws.scaffoldProblemFiles({
      slug: 'two-sum',
      title: 'Two Sum',
      pattern: 'arrays-hashing',
      source: 'https://leetcode.com/problems/two-sum/',
      starterCode:
        'function twoSum(nums: number[], target: number): number[] { return []; }',
      examples: [],
    });
    expect(files.solutionPath).toBe(
      'packages/dsa/arrays-hashing/two-sum/solution.ts',
    );
    expect(files.testPath).toBe(
      'packages/dsa/arrays-hashing/two-sum/solution.test.ts',
    );

    const code = await ws.readSolutionCode(files.solutionPath);
    expect(code).toContain('export function twoSum');

    const run = await ws.runProblemTests(files.solutionPath);
    expect(run.timedOut).toBe(false);
    expect(run.passed).toBe(true);
    expect(run.passedTests).toBe(3);
    expect(run.totalTests).toBe(3);
  });
});
