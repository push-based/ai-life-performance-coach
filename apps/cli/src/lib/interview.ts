import {
  INDEPENDENCE_LEVELS,
  INTERVIEW_DIFFICULTIES,
  isIndependenceLevel,
  isInterviewDifficulty,
  type IndependenceLevel,
  type InterviewDifficulty,
} from '@ai-coach/domain';
import { UsageError } from './commands.js';
import type { Coach } from './composition.js';
import { confirm, paint, type Terminal } from './terminal.js';

const INTERVIEW_USAGE = `Usage:
  coach interview init <dir>       create a practice monorepo for code solutions
  coach interview add <url|slug>   add a problem to the vault and scaffold TS files
  coach interview start <slug>     display a problem and time a practice session
  coach interview test <slug>      run local TypeScript tests for a problem
  coach interview log <slug>       record an attempt and schedule the next review
  coach interview due              list problems due for review
  coach interview list             list all tracked problems and pattern coverage`;

async function askWithDefault(
  term: Terminal,
  label: string,
  fallback: string,
): Promise<string> {
  const hint = fallback ? ` [${fallback}]` : '';
  const raw = await term.ask(`${label}${hint}: `);
  if (raw === null) return fallback;
  const trimmed = raw.trim();
  return trimmed || fallback;
}

async function askDifficulty(
  term: Terminal,
  fallback: InterviewDifficulty,
): Promise<InterviewDifficulty> {
  for (;;) {
    const raw = await askWithDefault(
      term,
      `Difficulty (${INTERVIEW_DIFFICULTIES.join('|')})`,
      fallback,
    );
    const lowered = raw.toLowerCase();
    if (isInterviewDifficulty(lowered)) return lowered;
    term.print(`Expected one of: ${INTERVIEW_DIFFICULTIES.join(', ')}`);
  }
}

async function askIndependence(term: Terminal): Promise<IndependenceLevel> {
  for (;;) {
    const raw = await askWithDefault(
      term,
      `Independence (${INDEPENDENCE_LEVELS.join('|')})`,
      'solo',
    );
    const lowered = raw.toLowerCase();
    if (isIndependenceLevel(lowered)) return lowered;
    term.print(`Expected one of: ${INDEPENDENCE_LEVELS.join(', ')}`);
  }
}

async function askNumber(
  term: Terminal,
  label: string,
  fallback: number,
): Promise<number> {
  for (;;) {
    const raw = await askWithDefault(term, label, String(fallback));
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed >= 0) return parsed;
    term.print('Enter a whole number >= 0.');
  }
}

export async function interview(
  coach: Coach,
  term: Terminal,
  args: string[],
): Promise<void> {
  const [sub = 'due', ...rest] = args;
  const uc = coach.interview();

  if (sub === 'help' || sub === '--help') {
    term.print(INTERVIEW_USAGE);
    return;
  }

  if (sub === 'init') {
    const dir = rest[0];
    if (!dir) {
      throw new UsageError('Usage: coach interview init <dir>');
    }
    const result = await uc.initPracticeRepo(dir);
    term.print(paint('green', `Practice monorepo ready at ${result.root}`));
    if (result.created.length) {
      term.print(`Created: ${result.created.join(', ')}`);
    }
    if (result.skipped.length) {
      term.print(`Skipped existing: ${result.skipped.join(', ')}`);
    }
    term.print(
      `Next: set "practiceRepo": ${JSON.stringify(result.root)} in coach.config.json (and run git init in that folder).`,
    );
    return;
  }

  if (sub === 'add') {
    const target = rest[0];
    if (!target) {
      throw new UsageError('Usage: coach interview add <url|slug>');
    }
    let prepared = await uc.prepareAdd({ urlOrSlug: target });
    if (!prepared.fetched) {
      term.print(
        paint(
          'yellow',
          'Could not fetch problem metadata automatically — enter details manually:',
        ),
      );
      const title = await askWithDefault(term, 'Title', prepared.input.title);
      const difficulty = await askDifficulty(term, prepared.input.difficulty);
      const pattern = await askWithDefault(
        term,
        'Pattern (e.g. arrays-hashing, trees, graphs, 1d-dp)',
        prepared.input.patterns[0] ?? 'general',
      );
      const listsRaw = await askWithDefault(
        term,
        'Lists (comma-separated, optional)',
        '',
      );
      const description = await askWithDefault(
        term,
        'Short description (optional)',
        '',
      );
      prepared = await uc.prepareAdd({
        urlOrSlug: target,
        title,
        difficulty,
        pattern,
        lists: listsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        description,
      });
    }

    term.print('');
    term.print(prepared.plan.preview);
    term.print('');
    const ok = await confirm(term, 'Save problem to vault and scaffold TS files?', true);
    if (!ok) {
      term.print('Cancelled.');
      return;
    }
    const added = await uc.commitAdd(prepared);
    term.print(paint('green', `Saved ${added.problem.slug} to vault.`));
    term.print(`Solution: ${added.files.solutionPath}`);
    term.print(`Tests:    ${added.files.testPath}`);
    return;
  }

  if (sub === 'start') {
    const slug = rest[0];
    if (!slug) {
      throw new UsageError('Usage: coach interview start <slug>');
    }
    const problem = await uc.getProblem(slug);
    term.print(paint('bold', `${problem.title} [${problem.difficulty}]`));
    if (problem.source) term.print(`Source:   ${problem.source}`);
    term.print(`Patterns: ${problem.patterns.join(', ') || 'general'}`);
    term.print(`File:     ${problem.solutionPath}`);
    term.print('');
    if (problem.body.trim()) {
      term.print(problem.body.trim());
      term.print('');
    }
    const startedAt = Date.now();
    term.print(
      paint(
        'cyan',
        'Timer started. Solve in your editor without autocomplete, then press Enter when done.',
      ),
    );
    await term.ask('Press Enter to stop timer...');
    const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    term.print(`Elapsed: ${mins}m ${secs}s (${elapsedSec}s)`);
    term.print(
      `Run \`coach interview test ${problem.slug}\` and \`coach interview log ${problem.slug}\` to record your attempt.`,
    );
    return;
  }

  if (sub === 'test') {
    const slug = rest[0];
    if (!slug) {
      throw new UsageError('Usage: coach interview test <slug>');
    }
    const result = await uc.testProblem(slug);
    const status = result.timedOut
      ? paint('red', 'TIMED OUT')
      : result.passed
        ? paint('green', 'PASS')
        : paint('red', 'FAIL');
    term.print(
      `${status} ${result.passedTests}/${result.totalTests} tests (${result.durationMs}ms)`,
    );
    if (result.output) {
      term.print('');
      term.print(result.output);
    }
    return;
  }

  if (sub === 'log') {
    const slug = rest[0];
    if (!slug) {
      throw new UsageError('Usage: coach interview log <slug>');
    }
    const problem = await uc.getProblem(slug);
    term.print(paint('bold', `Log attempt for ${problem.title}`));

    let passedTests = 0;
    let totalTests = 0;
    try {
      const testRun = await uc.testProblem(problem.slug);
      passedTests = testRun.passedTests;
      totalTests = testRun.totalTests;
      term.print(
        `Latest test run: ${testRun.passed ? 'PASS' : 'FAIL'} (${passedTests}/${totalTests} in ${testRun.durationMs}ms)`,
      );
    } catch {
      passedTests = await askNumber(term, 'Passed tests', 0);
      totalTests = await askNumber(term, 'Total tests', passedTests);
    }

    const independence = await askIndependence(term);
    const durationMin = await askNumber(term, 'Duration (minutes)', 25);
    const hintsUsed = await askNumber(term, 'Hints used', 0);
    const timeComplexity = await askWithDefault(term, 'Time complexity', 'O(n)');
    const spaceComplexity = await askWithDefault(term, 'Space complexity', 'O(n)');
    const mistakesRaw = await askWithDefault(
      term,
      'Mistakes / takeaways (comma-separated, optional)',
      '',
    );

    const request = {
      slug: problem.slug,
      mode: 'cli' as const,
      durationSec: durationMin * 60,
      independence,
      hintsUsed,
      passedTests,
      totalTests,
      timeComplexity,
      spaceComplexity,
      mistakes: mistakesRaw
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
    };

    const preview = await uc.prepareLogAttempt(request);
    term.print('');
    term.print(preview.plan.preview);
    term.print('');
    const ok = await confirm(term, 'Record attempt to vault?', true);
    if (!ok) {
      term.print('Cancelled.');
      return;
    }
    const saved = await uc.commitLogAttempt(request);
    term.print(
      paint(
        'green',
        `Recorded attempt. Next review: ${saved.nextReview} (in ${saved.intervalDays}d).`,
      ),
    );
    return;
  }

  if (sub === 'due') {
    const due = await uc.due();
    if (!due.length) {
      term.print('No interview problems due today.');
      return;
    }
    term.print(paint('bold', `Due interview problems (${due.length}):`));
    for (const p of due) {
      const last = p.attempts[p.attempts.length - 1];
      const tag = last ? last.independence : 'new';
      const dueDate = p.nextReview ?? 'never tried';
      term.print(
        `  ${p.slug}  [${p.difficulty}]  (${p.patterns[0] ?? 'general'})  last: ${tag}  due: ${dueDate}`,
      );
    }
    return;
  }

  if (sub === 'list') {
    const overview = await uc.list();
    if (!overview.total) {
      term.print(
        'No interview problems tracked yet. Run `coach interview add <url|slug>`.',
      );
      return;
    }
    term.print(
      paint(
        'bold',
        `Tracked problems: ${overview.total} (solo: ${overview.soloCount})`,
      ),
    );
    for (const p of overview.problems) {
      const last = p.attempts[p.attempts.length - 1];
      const tag = last ? last.independence : 'new';
      term.print(
        `  ${p.slug}  [${p.difficulty}]  ${p.patterns[0] ?? 'general'}  attempts: ${p.attempts.length}  last: ${tag}  next: ${p.nextReview ?? '-'}`,
      );
    }
    term.print('');
    term.print('By pattern:');
    for (const row of overview.byPattern) {
      term.print(
        `  ${row.pattern}: ${row.total} total, ${row.solo} solo, ${row.assisted} assisted`,
      );
    }
    return;
  }

  throw new UsageError(`Unknown interview subcommand: ${sub}\n\n${INTERVIEW_USAGE}`);
}
