import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { extractBody, parseFrontmatter, yamlString } from './md.js';
import { COACH_ROOT } from './para.js';

export const INTERVIEW_ROOT = posix.join(COACH_ROOT, 'interview');
export const INTERVIEW_PROBLEMS_ROOT = posix.join(INTERVIEW_ROOT, 'problems');

export type VaultIndependenceLevel =
  | 'failed'
  | 'editorial'
  | 'assisted'
  | 'nudge'
  | 'solo';

export type VaultInterviewDifficulty = 'easy' | 'medium' | 'hard';
export type VaultInterviewMode = 'cli' | 'web';

export interface VaultInterviewAttempt {
  id: string;
  date: string;
  mode: VaultInterviewMode;
  durationSec: number;
  independence: VaultIndependenceLevel;
  hintsUsed: number;
  passedTests: number;
  totalTests: number;
  timeComplexity: string;
  spaceComplexity: string;
  mistakes: string[];
  codeSnapshot: string;
}

export interface VaultInterviewProblem {
  slug: string;
  title: string;
  source: string;
  difficulty: VaultInterviewDifficulty;
  patterns: string[];
  lists: string[];
  status: 'active' | 'mastered' | 'archived';
  nextReview: string | null;
  rung: number;
  solutionPath: string;
  notePath: string;
  body: string;
  attempts: VaultInterviewAttempt[];
}

export interface SaveVaultInterviewProblemInput {
  slug: string;
  title: string;
  source: string;
  difficulty: VaultInterviewDifficulty;
  patterns: string[];
  lists: string[];
  solutionPath: string;
  description: string;
  constraints: string[];
  examples: string[];
}

export interface LogVaultInterviewAttemptInput {
  slug: string;
  date: string;
  mode: VaultInterviewMode;
  durationSec: number;
  independence: VaultIndependenceLevel;
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

export interface VaultInterviewWriteResult {
  executed: boolean;
  paths: string[];
  preview: string;
  errors: string[];
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

function problemDir(slug: string): string {
  return posix.join(INTERVIEW_PROBLEMS_ROOT, slug);
}

function problemNotePath(slug: string): string {
  return posix.join(problemDir(slug), 'problem.md');
}

function attemptsPath(slug: string): string {
  return posix.join(problemDir(slug), 'attempts.jsonl');
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function renderFrontmatter(meta: {
  slug: string;
  title: string;
  source: string;
  difficulty: VaultInterviewDifficulty;
  patterns: string[];
  lists: string[];
  status: 'active' | 'mastered' | 'archived';
  nextReview: string | null;
  rung: number;
  solutionPath: string;
}): string {
  const lines = [
    '---',
    'type: interview-problem',
    `slug: ${yamlString(meta.slug)}`,
    `title: ${yamlString(meta.title)}`,
    `source: ${yamlString(meta.source)}`,
    `difficulty: ${meta.difficulty}`,
    'patterns:',
    ...(meta.patterns.length
      ? meta.patterns.map((p) => `  - ${yamlString(p)}`)
      : ['  - general']),
    ...(meta.lists.length
      ? ['lists:', ...meta.lists.map((l) => `  - ${yamlString(l)}`)]
      : ['lists: []']),
    `status: ${meta.status}`,
    `nextReview: ${meta.nextReview ? yamlString(meta.nextReview) : 'null'}`,
    `rung: ${meta.rung}`,
    `solutionPath: ${yamlString(meta.solutionPath)}`,
    '---',
  ];
  return lines.join('\n');
}

function renderProblemBody(input: SaveVaultInterviewProblemInput): string {
  const sections: string[] = [`# ${input.title}`];
  if (input.source) {
    sections.push(`Source: ${input.source}`);
  }
  sections.push(`Solution file: \`${input.solutionPath}\``);
  if (input.description.trim()) {
    sections.push(`## Description\n\n${input.description.trim()}`);
  }
  if (input.examples.length) {
    sections.push(
      `## Examples\n\n${input.examples.map((e, i) => `### Example ${i + 1}\n\n\`\`\`text\n${e.trim()}\n\`\`\``).join('\n\n')}`,
    );
  }
  if (input.constraints.length) {
    sections.push(
      `## Constraints\n\n${input.constraints.map((c) => `- ${c}`).join('\n')}`,
    );
  }
  sections.push('## Notes\n');
  return sections.join('\n\n');
}

async function readAttempts(
  root: string,
  slug: string,
): Promise<VaultInterviewAttempt[]> {
  const full = join(root, attemptsPath(slug));
  if (!existsSync(full)) return [];
  const raw = await readFile(full, 'utf8');
  const out: VaultInterviewAttempt[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as VaultInterviewAttempt;
      if (parsed && typeof parsed.id === 'string') {
        out.push(parsed);
      }
    } catch {
      continue;
    }
  }
  return out;
}

export async function getInterviewProblem(
  root: string,
  slug: string,
): Promise<VaultInterviewProblem | null> {
  if (!isValidSlug(slug)) return null;
  const rel = problemNotePath(slug);
  const full = join(root, rel);
  if (!existsSync(full)) return null;
  const raw = await readFile(full, 'utf8');
  const fm = parseFrontmatter(raw) ?? {};
  const body = extractBody(raw);
  const attempts = await readAttempts(root, slug);
  const difficulty =
    fm.difficulty === 'easy' ||
    fm.difficulty === 'medium' ||
    fm.difficulty === 'hard'
      ? fm.difficulty
      : 'medium';
  const status =
    fm.status === 'active' ||
    fm.status === 'mastered' ||
    fm.status === 'archived'
      ? fm.status
      : 'active';
  const nextReview =
    typeof fm.nextReview === 'string' && fm.nextReview.trim()
      ? fm.nextReview.trim()
      : null;
  const rung = typeof fm.rung === 'number' ? fm.rung : -1;

  return {
    slug,
    title: typeof fm.title === 'string' ? fm.title : slug,
    source: typeof fm.source === 'string' ? fm.source : '',
    difficulty,
    patterns: asStringArray(fm.patterns),
    lists: asStringArray(fm.lists),
    status,
    nextReview,
    rung,
    solutionPath:
      typeof fm.solutionPath === 'string' ? fm.solutionPath : '',
    notePath: rel,
    body,
    attempts,
  };
}

export async function listInterviewProblems(
  root: string,
): Promise<VaultInterviewProblem[]> {
  const dir = join(root, INTERVIEW_PROBLEMS_ROOT);
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const problems: VaultInterviewProblem[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const problem = await getInterviewProblem(root, entry.name);
    if (problem) problems.push(problem);
  }
  return problems.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function saveInterviewProblem(
  root: string,
  input: SaveVaultInterviewProblemInput,
  execute: boolean,
): Promise<VaultInterviewWriteResult> {
  const errors: string[] = [];
  if (!isValidSlug(input.slug)) {
    errors.push(`Invalid problem slug: ${input.slug}`);
  }
  if (!input.title.trim()) {
    errors.push('Problem title is required');
  }
  if (errors.length) {
    return { executed: false, paths: [], preview: '', errors };
  }

  const existing = await getInterviewProblem(root, input.slug);
  const rel = problemNotePath(input.slug);
  const frontmatter = renderFrontmatter({
    slug: input.slug,
    title: input.title,
    source: input.source,
    difficulty: input.difficulty,
    patterns: input.patterns,
    lists: input.lists,
    status: existing?.status ?? 'active',
    nextReview: existing?.nextReview ?? null,
    rung: existing?.rung ?? -1,
    solutionPath: input.solutionPath,
  });
  const body = renderProblemBody(input);
  const content = `${frontmatter}\n\n${body}\n`;
  const preview = `${existing ? 'Update' : 'Create'} ${rel}\nTitle: ${input.title} (${input.difficulty})\nPatterns: ${input.patterns.join(', ') || 'general'}\nSolution: ${input.solutionPath}`;

  if (!execute) {
    return { executed: false, paths: [rel], preview, errors: [] };
  }

  const full = join(root, rel);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content, 'utf8');
  return { executed: true, paths: [rel], preview, errors: [] };
}

export async function logInterviewAttempt(
  root: string,
  input: LogVaultInterviewAttemptInput,
  execute: boolean,
): Promise<VaultInterviewWriteResult> {
  const errors: string[] = [];
  if (!isValidSlug(input.slug)) {
    errors.push(`Invalid problem slug: ${input.slug}`);
  }
  const existing = await getInterviewProblem(root, input.slug);
  if (!existing) {
    errors.push(`Interview problem not found: ${input.slug}`);
  }
  if (errors.length || !existing) {
    return { executed: false, paths: [], preview: '', errors };
  }

  const attempt: VaultInterviewAttempt = {
    id: `${input.date}-${existing.attempts.length + 1}`,
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
  };

  const noteRel = problemNotePath(input.slug);
  const attemptsRel = attemptsPath(input.slug);
  const frontmatter = renderFrontmatter({
    slug: existing.slug,
    title: existing.title,
    source: existing.source,
    difficulty: existing.difficulty,
    patterns: existing.patterns,
    lists: existing.lists,
    status: existing.status,
    nextReview: input.nextReview,
    rung: input.rung,
    solutionPath: existing.solutionPath,
  });
  const updatedNote = `${frontmatter}\n\n${existing.body.trim()}\n`;
  const preview = `Log attempt ${attempt.id} for ${input.slug}\nIndependence: ${input.independence} | Tests: ${input.passedTests}/${input.totalTests} | Duration: ${input.durationSec}s\nNext review: ${input.nextReview} (rung ${input.rung})`;

  if (!execute) {
    return {
      executed: false,
      paths: [noteRel, attemptsRel],
      preview,
      errors: [],
    };
  }

  const noteFull = join(root, noteRel);
  const attemptsFull = join(root, attemptsRel);
  await mkdir(dirname(noteFull), { recursive: true });
  await writeFile(noteFull, updatedNote, 'utf8');
  const previous = existsSync(attemptsFull)
    ? await readFile(attemptsFull, 'utf8')
    : '';
  const line = `${JSON.stringify(attempt)}\n`;
  await writeFile(attemptsFull, `${previous}${line}`, 'utf8');
  return {
    executed: true,
    paths: [noteRel, attemptsRel],
    preview,
    errors: [],
  };
}
