import { rankWithFlexSearch } from './flexsearch-ranker.js';

describe('rankWithFlexSearch', () => {
  const units = [
    { id: 'body', title: 'Notes', body: 'the judge decides' },
    { id: 'title', title: 'Judge', body: 'nothing else' },
    { id: 'none', title: 'Other', body: 'unrelated' },
  ];

  it('scores a title match above a body match and leaves out non-matches', async () => {
    const scores = await rankWithFlexSearch(units, 'judge', 10);
    expect(scores.get('title')!).toBeGreaterThan(scores.get('body')!);
    expect(scores.has('none')).toBe(false);
  });

  it('folds diacritics', async () => {
    const scores = await rankWithFlexSearch(
      [{ id: 'pl', title: 'Gęś', body: 'jaźń' }],
      'ges',
      10,
    );
    expect(scores.has('pl')).toBe(true);
  });
});
