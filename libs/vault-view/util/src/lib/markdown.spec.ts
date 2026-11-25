import { describe, it, expect } from 'vitest';
import { parseNoteBlocks, tokenizeInline } from './markdown.js';

describe('markdown util', () => {
  it('tokenizes bold, highlight, wikilinks and markdown links', () => {
    expect(
      tokenizeInline(
        'Read **bold** and ==hi== in [[Folder/Note|Alias]] [link](https://x)',
      ),
    ).toEqual([
      { kind: 'text', text: 'Read ', bold: false, highlight: false },
      { kind: 'text', text: 'bold', bold: true, highlight: false },
      { kind: 'text', text: ' and ', bold: false, highlight: false },
      { kind: 'text', text: 'hi', bold: false, highlight: true },
      { kind: 'text', text: ' in ', bold: false, highlight: false },
      { kind: 'wikilink', target: 'Folder/Note', label: 'Alias' },
      { kind: 'text', text: ' link', bold: false, highlight: false },
    ]);
  });

  it('parses headings, code blocks, callouts and checklist items', () => {
    const blocks = parseNoteBlocks(
      [
        '## Section',
        '',
        'Paragraph with [[Target]].',
        '',
        '> [!summary] Key idea',
        '> Distilled line.',
        '',
        '- [x] Done task',
        '  - [ ] Nested open',
        '',
        '```ts',
        'const x = 1;',
        '```',
      ].join('\n'),
    );
    expect(blocks.map((b) => b.kind)).toEqual([
      'heading',
      'paragraph',
      'quote',
      'list-item',
      'list-item',
      'code',
    ]);
    expect(blocks[2]).toMatchObject({ kind: 'quote', callout: 'Key idea' });
    expect(blocks[3]).toMatchObject({
      kind: 'list-item',
      depth: 0,
      mark: '☑ ',
    });
    expect(blocks[4]).toMatchObject({
      kind: 'list-item',
      depth: 1,
      mark: '☐ ',
    });
    expect(blocks[5]).toMatchObject({ kind: 'code', code: 'const x = 1;' });
  });
});
