import { DomainError } from './errors.js';
import { addDays } from './review-ladder.js';

export const INDEPENDENCE_LEVELS = [
  'failed',
  'editorial',
  'assisted',
  'nudge',
  'solo',
] as const;
export type IndependenceLevel = (typeof INDEPENDENCE_LEVELS)[number];

export const INTERVIEW_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type InterviewDifficulty = (typeof INTERVIEW_DIFFICULTIES)[number];

export const INTERVIEW_MODES = ['cli', 'web'] as const;
export type InterviewMode = (typeof INTERVIEW_MODES)[number];

export interface InterviewLadder {
  failedDays: number;
  editorialDays: number;
  assistedDays: number;
  nudgeDays: number;
  soloPassDays: number[];
}

export const DEFAULT_INTERVIEW_LADDER: InterviewLadder = {
  failedDays: 1,
  editorialDays: 1,
  assistedDays: 2,
  nudgeDays: 4,
  soloPassDays: [7, 14, 30, 60, 120],
};

export interface InterviewAttempt {
  id: string;
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
}

export interface InterviewProblem {
  slug: string;
  title: string;
  source: string;
  difficulty: InterviewDifficulty;
  patterns: string[];
  lists: string[];
  status: 'active' | 'mastered' | 'archived';
  nextReview: string | null;
  rung: number;
  solutionPath: string;
  attempts: InterviewAttempt[];
}

export interface InterviewReviewSchedule {
  nextReview: string;
  intervalDays: number;
  rung: number;
}

export interface ParsedProblemUrl {
  provider: 'leetcode' | 'neetcode';
  slug: string;
  canonicalUrl: string;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isIndependenceLevel(value: string): value is IndependenceLevel {
  return (INDEPENDENCE_LEVELS as readonly string[]).includes(value);
}

export function isInterviewDifficulty(
  value: string,
): value is InterviewDifficulty {
  return (INTERVIEW_DIFFICULTIES as readonly string[]).includes(value);
}

export function normalizeSlug(raw: string): string {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug || !SLUG_PATTERN.test(slug)) {
    throw new DomainError(`Invalid problem slug: ${raw}`);
  }
  return slug;
}

export function parseProblemUrl(input: string): ParsedProblemUrl | null {
  const trimmed = input.trim();
  const leetcode = trimmed.match(
    /^https?:\/\/(?:www\.)?leetcode\.com\/problems\/([a-z0-9-]+)(?:\/|$|\?)/i,
  );
  if (leetcode) {
    const slug = normalizeSlug(leetcode[1]!);
    return {
      provider: 'leetcode',
      slug,
      canonicalUrl: `https://leetcode.com/problems/${slug}/`,
    };
  }
  const neetcode = trimmed.match(
    /^https?:\/\/(?:www\.)?neetcode\.io\/problems\/([a-z0-9-]+)(?:\/|$|\?)/i,
  );
  if (neetcode) {
    const slug = normalizeSlug(neetcode[1]!);
    return {
      provider: 'neetcode',
      slug,
      canonicalUrl: `https://neetcode.io/problems/${slug}`,
    };
  }
  return null;
}

export function validateInterviewLadder(
  ladder: InterviewLadder,
): InterviewLadder {
  const fixed = [
    ladder.failedDays,
    ladder.editorialDays,
    ladder.assistedDays,
    ladder.nudgeDays,
    ...ladder.soloPassDays,
  ];
  if (
    !ladder.soloPassDays.length ||
    fixed.some((d) => !Number.isInteger(d) || d < 1)
  ) {
    throw new DomainError(
      'Every interview ladder interval must be a whole number of days, at least 1',
    );
  }
  if (
    ladder.soloPassDays.some(
      (d, i) => i > 0 && d <= ladder.soloPassDays[i - 1]!,
    )
  ) {
    throw new DomainError('Solo pass intervals must strictly increase');
  }
  return ladder;
}

export function scheduleInterviewReview(
  input: {
    independence: IndependenceLevel;
    date: string;
    currentRung: number;
  },
  ladder: InterviewLadder = DEFAULT_INTERVIEW_LADDER,
): InterviewReviewSchedule {
  validateInterviewLadder(ladder);
  const top = ladder.soloPassDays.length - 1;
  const clamped = Math.max(-1, Math.min(input.currentRung, top));

  if (input.independence === 'failed') {
    return {
      nextReview: addDays(input.date, ladder.failedDays),
      intervalDays: ladder.failedDays,
      rung: -1,
    };
  }
  if (input.independence === 'editorial') {
    return {
      nextReview: addDays(input.date, ladder.editorialDays),
      intervalDays: ladder.editorialDays,
      rung: -1,
    };
  }
  if (input.independence === 'assisted') {
    return {
      nextReview: addDays(input.date, ladder.assistedDays),
      intervalDays: ladder.assistedDays,
      rung: clamped,
    };
  }
  if (input.independence === 'nudge') {
    return {
      nextReview: addDays(input.date, ladder.nudgeDays),
      intervalDays: ladder.nudgeDays,
      rung: clamped,
    };
  }

  const nextRung = Math.min(clamped + 1, top);
  const intervalDays = ladder.soloPassDays[nextRung]!;
  return {
    nextReview: addDays(input.date, intervalDays),
    intervalDays,
    rung: nextRung,
  };
}

const INDEPENDENCE_PRIORITY: Record<IndependenceLevel, number> = {
  failed: 0,
  editorial: 1,
  assisted: 2,
  nudge: 3,
  solo: 4,
};

export function latestIndependence(
  problem: Pick<InterviewProblem, 'attempts'>,
): IndependenceLevel | null {
  if (!problem.attempts.length) return null;
  return problem.attempts[problem.attempts.length - 1]!.independence;
}

export function isProblemDue(
  problem: Pick<InterviewProblem, 'status' | 'nextReview'>,
  today: string,
): boolean {
  if (problem.status === 'archived') return false;
  if (!problem.nextReview) return true;
  return problem.nextReview <= today;
}

export function rankDueProblems<
  T extends Pick<InterviewProblem, 'slug' | 'status' | 'nextReview' | 'attempts'>,
>(problems: readonly T[], today: string): T[] {
  return problems
    .filter((p) => isProblemDue(p, today))
    .sort((a, b) => {
      const aNever = a.nextReview === null ? 1 : 0;
      const bNever = b.nextReview === null ? 1 : 0;
      if (aNever !== bNever) return aNever - bNever;

      const aInd = latestIndependence(a);
      const bInd = latestIndependence(b);
      const aPrio = aInd ? INDEPENDENCE_PRIORITY[aInd] : 5;
      const bPrio = bInd ? INDEPENDENCE_PRIORITY[bInd] : 5;
      if (aPrio !== bPrio) return aPrio - bPrio;

      const aDate = a.nextReview ?? '';
      const bDate = b.nextReview ?? '';
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return a.slug.localeCompare(b.slug);
    });
}

export function formatTitleFromSlug(slug: string): string {
  return normalizeSlug(slug)
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
