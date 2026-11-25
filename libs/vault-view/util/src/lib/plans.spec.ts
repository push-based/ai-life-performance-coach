import { describe, it, expect } from 'vitest';
import {
  columnShortLabel,
  formatPlansHash,
  goalWithinRange,
  parsePlansHash,
  worstGoalStatus,
  zoomByForLevel,
} from './plans.js';

describe('plans util', () => {
  it('formats column labels and zoom targets by level', () => {
    expect(
      columnShortLabel({
        level: 'week',
        period: '2026-W45',
        start: '2026-11-02',
      }),
    ).toBe('W45');
    expect(
      columnShortLabel({
        level: 'day',
        period: '2026-11-06',
        start: '2026-11-06',
      }),
    ).toBe('11-06');
    expect(
      columnShortLabel({
        level: 'year',
        period: '2026',
        start: '2026-01-01',
      }),
    ).toBe('2026');
    expect(zoomByForLevel('year')).toBe('month');
    expect(zoomByForLevel('quarter')).toBe('week');
    expect(zoomByForLevel('month')).toBe('week');
    expect(zoomByForLevel('week')).toBe('day');
    expect(zoomByForLevel('day')).toBeNull();
  });

  it('checks goal ranges and selects worst status', () => {
    expect(
      goalWithinRange(
        { start: '2026-11-02', end: '2026-11-08' },
        { start: '2026-11-01', end: '2026-11-30' },
      ),
    ).toBe(true);
    expect(
      goalWithinRange(
        { start: '2026-10-26', end: '2026-11-01' },
        { start: '2026-11-01', end: '2026-11-30' },
      ),
    ).toBe(false);
    expect(worstGoalStatus(['met', 'open', 'missed'])).toBe('missed');
    expect(worstGoalStatus(['met', 'open'])).toBe('open');
    expect(worstGoalStatus(['dropped', 'met'])).toBe('met');
    expect(worstGoalStatus(['dropped'])).toBe('dropped');
  });

  it('parses and formats plans hash state', () => {
    expect(parsePlansHash('#span=2026-Q4&by=week&archived=1')).toEqual({
      span: '2026-Q4',
      by: 'week',
      archived: true,
    });
    expect(
      formatPlansHash({ span: '2026-Q4', by: 'week', archived: false }),
    ).toBe('#span=2026-Q4&by=week');
  });
});
