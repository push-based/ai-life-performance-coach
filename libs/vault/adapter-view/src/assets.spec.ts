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
});
