import { readFileSync } from 'node:fs';

describe('view assets', () => {
  it('reference nothing off the machine', () => {
    for (const file of ['vault-view.html', 'vault-view.js']) {
      const text = readFileSync(
        new URL(`../assets/${file}`, import.meta.url),
        'utf-8',
      );
      const urls = (
        text.match(/\b(?:https?:)?\/\/[\w.-]+\.[a-z]{2,}[^\s"'`)]*/gi) ?? []
      ).filter((u) => u !== 'http://www.w3.org/2000/svg');
      expect(urls, file).toEqual([]);
    }
  });

  it('define distinct plan level colours in dark and light themes and hexagon marks', () => {
    const html = readFileSync(
      new URL('../assets/vault-view.html', import.meta.url),
      'utf-8',
    );
    for (const level of ['year', 'quarter', 'month', 'week', 'day']) {
      const matches = html.match(new RegExp(`--plan-${level}:`, 'g')) ?? [];
      expect(matches.length, `--plan-${level}`).toBe(2);
    }
    expect(html).toContain('.mark.hex');
    expect(html).toContain('id="plan-levels"');
  });

  it('define distinct workstream state colours in dark and light themes and filter chips', () => {
    const html = readFileSync(
      new URL('../assets/vault-view.html', import.meta.url),
      'utf-8',
    );
    for (const state of [
      'draft',
      'ready',
      'in-progress',
      'finished',
      'migrated',
    ]) {
      const matches = html.match(new RegExp(`--ws-${state}:`, 'g')) ?? [];
      expect(matches.length, `--ws-${state}`).toBe(2);
    }
    expect(html).toContain('.mark.ws-draft');
    expect(html).toContain('.mark.ws-ready');
    expect(html).toContain('.mark.ws-finished');
    expect(html).toContain('.mark.ws-migrated');
    expect(html).toContain('id="workstream-states"');
  });
});
