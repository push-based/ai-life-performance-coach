import { parseFrontmatter } from '@ai-coach/vault-domain';
import { parseMatter } from './markdown.js';

describe('parseMatter', () => {
  it('splits YAML frontmatter from the body', () => {
    expect(parseMatter('---\ntitle: Idea\ntags: [a, b]\n---\nBody\n')).toEqual({
      data: { title: 'Idea', tags: ['a', 'b'] },
      content: 'Body\n',
    });
  });

  it('gives the domain dates it can normalise to days', () => {
    expect(
      parseFrontmatter('---\ncreated: 2026-11-20\n---\n', parseMatter),
    ).toEqual({ created: '2026-11-20' });
  });
});
