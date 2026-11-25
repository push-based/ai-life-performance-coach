import { readFileSync } from 'node:fs';

const APP_STYLES = new URL(
  '../../../../apps/vault-view/src/styles.css',
  import.meta.url,
);
const APP_INDEX = new URL(
  '../../../../apps/vault-view/src/index.html',
  import.meta.url,
);
const FILTERS_COMPONENT = new URL(
  '../../../vault-view/feat-graph/src/lib/graph-filters.component.ts',
  import.meta.url,
);

describe('view assets', () => {
  it('reference nothing off the machine', () => {
    for (const [label, url] of [
      ['index.html', APP_INDEX],
      ['styles.css', APP_STYLES],
    ] as const) {
      const text = readFileSync(url, 'utf-8');
      const urls = (
        text.match(/\b(?:https?:)?\/\/[\w.-]+\.[a-z]{2,}[^\s"'`)]*/gi) ?? []
      ).filter((u) => u !== 'http://www.w3.org/2000/svg');
      expect(urls, label).toEqual([]);
    }
  });

  it('define distinct plan level colours in dark and light themes and hexagon marks', () => {
    const css = readFileSync(APP_STYLES, 'utf-8');
    const filters = readFileSync(FILTERS_COMPONENT, 'utf-8');
    for (const level of ['year', 'quarter', 'month', 'week', 'day']) {
      const matches = css.match(new RegExp(`--plan-${level}:`, 'g')) ?? [];
      expect(matches.length, `--plan-${level}`).toBe(2);
    }
    expect(filters).toContain('.mark.hex');
    expect(filters).toContain('Plan levels');
  });

  it('define distinct workstream state colours in dark and light themes and filter chips', () => {
    const css = readFileSync(APP_STYLES, 'utf-8');
    const filters = readFileSync(FILTERS_COMPONENT, 'utf-8');
    for (const state of [
      'draft',
      'ready',
      'in-progress',
      'finished',
      'migrated',
    ]) {
      const matches = css.match(new RegExp(`--ws-${state}:`, 'g')) ?? [];
      expect(matches.length, `--ws-${state}`).toBe(2);
    }
    expect(filters).toContain('.mark.ws-draft');
    expect(filters).toContain('.mark.ws-ready');
    expect(filters).toContain('.mark.ws-finished');
    expect(filters).toContain('.mark.ws-migrated');
    expect(filters).toContain('Workstream states');
  });
});
