import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type {
  CodeWorkspace,
  PracticeRepoInitResult,
  ProblemScaffoldInput,
  ScaffoldedFiles,
  TestRunResult,
} from '@ai-coach/application';
import { UnavailableError } from '@ai-coach/application';

const DEFAULT_TIMEOUT_MS = 5000;

function extractExportedFunctionName(starterCode: string | null): string {
  if (!starterCode) return 'solve';
  const fnMatch = starterCode.match(/function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/);
  if (fnMatch) return fnMatch[1]!;
  const constMatch = starterCode.match(
    /(?:const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/,
  );
  if (constMatch) return constMatch[1]!;
  return 'solve';
}

function renderSolutionTemplate(input: ProblemScaffoldInput): string {
  if (input.starterCode?.trim()) {
    const code = input.starterCode.trim();
    if (/^\s*export\s+/m.test(code)) return `${code}\n`;
    return `${code.replace(/^(function|const|class)\s+/m, 'export $1 ')}\n`;
  }
  return [
    'export function solve(input: unknown): unknown {',
    '  return input;',
    '}',
    '',
  ].join('\n');
}

function renderTestTemplate(input: ProblemScaffoldInput): string {
  const fnName = extractExportedFunctionName(input.starterCode);
  return [
    "import { describe, it } from 'node:test';",
    "import assert from 'node:assert/strict';",
    "import { performance } from 'node:perf_hooks';",
    `import { ${fnName} } from './solution.ts';`,
    '',
    `describe(${JSON.stringify(input.title)}, () => {`,
    "  it('handles example cases', () => {",
    `    assert.equal(typeof ${fnName}, 'function');`,
    '  });',
    '',
    "  it('handles edge cases', () => {",
    `    assert.equal(typeof ${fnName}, 'function');`,
    '  });',
    '',
    "  it('meets performance budget on large input', () => {",
    '    const start = performance.now();',
    `    assert.equal(typeof ${fnName}, 'function');`,
    '    const elapsedMs = performance.now() - start;',
    '    assert.ok(elapsedMs < 250, `Expected < 250ms, took ${elapsedMs.toFixed(1)}ms`);',
    '  });',
    '});',
    '',
  ].join('\n');
}

function parseNodeTestSummary(output: string): {
  passedTests: number;
  totalTests: number;
} {
  const totalMatch = output.match(/# tests (\d+)/);
  const passMatch = output.match(/# pass (\d+)/);
  const totalTests = totalMatch ? Number(totalMatch[1]) : 0;
  const passedTests = passMatch ? Number(passMatch[1]) : 0;
  return { passedTests, totalTests };
}

export class PracticeWorkspace implements CodeWorkspace {
  constructor(private readonly repoRoot: string | undefined) {}

  private requireRoot(): string {
    if (!this.repoRoot) {
      throw new UnavailableError(
        'practice-repo',
        'No practiceRepo configured: set practiceRepo in coach.config.json or COACH_PRACTICE_REPO, or run `coach interview init <dir>`',
      );
    }
    return resolve(this.repoRoot);
  }

  async initPracticeRepo(dir: string): Promise<PracticeRepoInitResult> {
    const root = resolve(dir);
    await mkdir(root, { recursive: true });
    const created: string[] = [];
    const skipped: string[] = [];

    const files: Record<string, string> = {
      'package.json': `${JSON.stringify(
        {
          name: 'practice-monorepo',
          version: '0.0.1',
          private: true,
          type: 'module',
          scripts: {
            test: 'node --test "packages/**/*.test.ts"',
          },
        },
        null,
        2,
      )}\n`,
      'tsconfig.json': `${JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2024',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            strict: true,
            noEmit: true,
            allowImportingTsExtensions: true,
            skipLibCheck: true,
          },
          include: ['packages/**/*.ts'],
        },
        null,
        2,
      )}\n`,
      '.gitignore': ['node_modules/', '.coach-traces/', 'dist/', ''].join('\n'),
      'README.md': [
        '# Practice Monorepo',
        '',
        'Executable practice repository managed alongside `ai-coach`.',
        '',
        '- `packages/dsa/` — algorithmic problem solutions and tests',
        '- `packages/system-design/` — architecture prototypes and benchmarks',
        '- `packages/papers/` — paper implementations and experiments',
        '',
      ].join('\n'),
      'packages/dsa/.gitkeep': '',
      'packages/system-design/.gitkeep': '',
      'packages/papers/.gitkeep': '',
    };

    for (const [rel, content] of Object.entries(files)) {
      const full = join(root, rel);
      if (existsSync(full)) {
        skipped.push(rel);
        continue;
      }
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, content, 'utf8');
      created.push(rel);
    }

    return { root, created, skipped };
  }

  async scaffoldProblemFiles(
    input: ProblemScaffoldInput,
  ): Promise<ScaffoldedFiles> {
    const root = this.requireRoot();
    const solutionPath = `packages/dsa/${input.pattern}/${input.slug}/solution.ts`;
    const testPath = `packages/dsa/${input.pattern}/${input.slug}/solution.test.ts`;
    const solutionFull = join(root, solutionPath);
    const testFull = join(root, testPath);
    const created: string[] = [];

    await mkdir(dirname(solutionFull), { recursive: true });
    if (!existsSync(solutionFull)) {
      await writeFile(solutionFull, renderSolutionTemplate(input), 'utf8');
      created.push(solutionPath);
    }
    if (!existsSync(testFull)) {
      await writeFile(testFull, renderTestTemplate(input), 'utf8');
      created.push(testPath);
    }

    return { solutionPath, testPath, created };
  }

  async readSolutionCode(solutionPath: string): Promise<string | null> {
    if (!this.repoRoot) return null;
    const full = join(resolve(this.repoRoot), solutionPath);
    if (!existsSync(full)) return null;
    return readFile(full, 'utf8');
  }

  async runProblemTests(
    solutionPath: string,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ): Promise<TestRunResult> {
    const root = this.requireRoot();
    const testRel = solutionPath.replace(/\.ts$/, '.test.ts');
    const testFull = join(root, testRel);
    if (!existsSync(testFull)) {
      throw new UnavailableError(
        'practice-repo',
        `Test file not found: ${testFull}`,
      );
    }

    const start = Date.now();
    return new Promise<TestRunResult>((resolvePromise) => {
      const child = spawn(
        process.execPath,
        [
          '--permission',
          `--allow-fs-read=${root}`,
          '--test',
          '--test-isolation=none',
          '--test-reporter=tap',
          testRel,
        ],
        {
          cwd: root,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);
        const durationMs = Date.now() - start;
        const output = `${stdout}${stderr}`.trim();
        const { passedTests, totalTests } = parseNodeTestSummary(output);
        resolvePromise({
          passed: !timedOut && code === 0,
          passedTests,
          totalTests,
          durationMs,
          timedOut,
          output,
        });
      });
    });
  }
}
