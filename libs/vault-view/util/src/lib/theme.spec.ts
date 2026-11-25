import { describe, it, expect } from 'vitest';
import {
  THEME_STORAGE_KEY,
  hasPresentQuery,
  readStoredTheme,
  resolveInitialTheme,
  writeStoredTheme,
} from './theme.js';

describe('theme util', () => {
  it('prefers query param over stored theme and defaults to dark', () => {
    expect(resolveInitialTheme('?theme=light', 'dark')).toBe('light');
    expect(resolveInitialTheme('?theme=dark', 'light')).toBe('dark');
    expect(resolveInitialTheme('', 'light')).toBe('light');
    expect(resolveInitialTheme('', null)).toBe('dark');
    expect(resolveInitialTheme('?theme=other', 'other')).toBe('dark');
  });

  it('reads and writes theme safely when storage throws', () => {
    const map = new Map<string, string>();
    const okStorage = {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => {
        map.set(k, v);
      },
    };
    expect(writeStoredTheme('light', okStorage)).toBe(true);
    expect(map.get(THEME_STORAGE_KEY)).toBe('light');
    expect(readStoredTheme(okStorage)).toBe('light');

    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readStoredTheme(broken)).toBeNull();
    expect(writeStoredTheme('dark', broken)).toBe(false);
  });

  it('detects present query flag', () => {
    expect(hasPresentQuery('?present=1')).toBe(true);
    expect(hasPresentQuery('?present')).toBe(true);
    expect(hasPresentQuery('?theme=dark')).toBe(false);
  });
});
