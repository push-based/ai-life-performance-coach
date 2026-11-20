import {
  DEFAULT_INTERVIEW_LADDER,
  formatTitleFromSlug,
  normalizeSlug,
  parseProblemUrl,
  rankDueProblems,
  scheduleInterviewReview,
  type InterviewProblem,
} from './interview.js';

describe('interview domain', () => {
  it('parses LeetCode and NeetCode URLs into normalized slugs', () => {
    expect(
      parseProblemUrl('https://leetcode.com/problems/two-sum/description/'),
    ).toEqual({
      provider: 'leetcode',
      slug: 'two-sum',
      canonicalUrl: 'https://leetcode.com/problems/two-sum/',
    });
    expect(
      parseProblemUrl('https://neetcode.io/problems/contains-duplicate'),
    ).toEqual({
      provider: 'neetcode',
      slug: 'contains-duplicate',
      canonicalUrl: 'https://neetcode.io/problems/contains-duplicate',
    });
    expect(parseProblemUrl('not-a-url')).toBeNull();
  });

  it('normalizes slugs and derives readable titles', () => {
    expect(normalizeSlug('  Two Sum!! ')).toBe('two-sum');
    expect(formatTitleFromSlug('two-sum')).toBe('Two Sum');
  });

  it('schedules reviews strictly by independence level', () => {
    const failed = scheduleInterviewReview(
      { independence: 'failed', date: '2026-11-20', currentRung: 3 },
      DEFAULT_INTERVIEW_LADDER,
    );
    expect(failed).toEqual({
      nextReview: '2026-11-21',
      intervalDays: 1,
      rung: -1,
    });

    const assisted = scheduleInterviewReview(
      { independence: 'assisted', date: '2026-11-20', currentRung: 1 },
      DEFAULT_INTERVIEW_LADDER,
    );
    expect(assisted).toEqual({
      nextReview: '2026-11-22',
      intervalDays: 2,
      rung: 1,
    });

    const nudge = scheduleInterviewReview(
      { independence: 'nudge', date: '2026-11-20', currentRung: 1 },
      DEFAULT_INTERVIEW_LADDER,
    );
    expect(nudge).toEqual({
      nextReview: '2026-11-24',
      intervalDays: 4,
      rung: 1,
    });

    const firstSolo = scheduleInterviewReview(
      { independence: 'solo', date: '2026-11-20', currentRung: -1 },
      DEFAULT_INTERVIEW_LADDER,
    );
    expect(firstSolo).toEqual({
      nextReview: '2026-11-27',
      intervalDays: 7,
      rung: 0,
    });

    const secondSolo = scheduleInterviewReview(
      { independence: 'solo', date: '2026-11-27', currentRung: 0 },
      DEFAULT_INTERVIEW_LADDER,
    );
    expect(secondSolo).toEqual({
      nextReview: '2026-12-11',
      intervalDays: 14,
      rung: 1,
    });
  });

  it('ranks due problems with assisted/failed ahead of solo and never-attempted last', () => {
    const base = (
      slug: string,
      nextReview: string | null,
      independence?: InterviewProblem['attempts'][number]['independence'],
    ): Pick<
      InterviewProblem,
      'slug' | 'status' | 'nextReview' | 'attempts'
    > => ({
      slug,
      status: 'active',
      nextReview,
      attempts: independence
        ? [
            {
              id: '1',
              date: '2026-11-18',
              mode: 'cli',
              durationSec: 600,
              independence,
              hintsUsed: 0,
              passedTests: 3,
              totalTests: 3,
              timeComplexity: 'O(n)',
              spaceComplexity: 'O(n)',
              mistakes: [],
              codeSnapshot: '',
            },
          ]
        : [],
    });

    const ranked = rankDueProblems(
      [
        base('never-tried', null),
        base('solo-due', '2026-11-19', 'solo'),
        base('assisted-due', '2026-11-20', 'assisted'),
        base('failed-due', '2026-11-20', 'failed'),
        base('future-solo', '2026-11-25', 'solo'),
      ],
      '2026-11-20',
    );

    expect(ranked.map((p) => p.slug)).toEqual([
      'failed-due',
      'assisted-due',
      'solo-due',
      'never-tried',
    ]);
  });
});
