import { describe, it, expect } from 'vitest';
import {
  goalDisplayText,
  graphNoteHref,
  obsidianUri,
  pluralize,
  stripWikilinks,
} from './links.js';

describe('links util', () => {
  it('builds encoded Obsidian URIs and graph links', () => {
    expect(obsidianUri('My Vault', '1.Projects/AI/AI.md')).toBe(
      'obsidian://open?vault=My%20Vault&file=1.Projects%2FAI%2FAI.md',
    );
    expect(graphNoteHref('1.Projects/AI/AI.md')).toBe(
      '/#open=1.Projects%2FAI%2FAI.md',
    );
  });

  it('strips wikilinks and extracts goal display words', () => {
    expect(stripWikilinks('Ship [[Talks|the talks]] today')).toBe(
      'Ship the talks today',
    );
    expect(goalDisplayText('[[Marketing]]: posters out')).toBe('posters out');
    expect(goalDisplayText('[[Talks]]')).toBe('Talks');
  });

  it('pluralizes counts', () => {
    expect(pluralize(1, 'goal')).toBe('1 goal');
    expect(pluralize(0, 'goal')).toBe('0 goals');
    expect(pluralize(3, 'goal')).toBe('3 goals');
  });
});
