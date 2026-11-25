import { describe, expect, it } from 'vitest';
import {
  distillMarkLabel,
  parsePageBlocks,
  splitPageSummary,
} from './distill.js';

describe('distill utilities', () => {
  it('extracts [!summary] callout text and returns null when absent', () => {
    expect(splitPageSummary('Just plain text')).toBeNull();
    expect(
      splitPageSummary('> [!summary]\n> First line\n> Second line\n\nBody'),
    ).toBe('First line\nSecond line');
  });

  it('parses page blocks with accurate source offsets across bold and highlight marks', () => {
    const text = 'Alpha **beta ==gamma==** delta.';
    const blocks = parsePageBlocks(text);
    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    expect(block.kind).toBe('para');
    if (block.kind === 'para') {
      expect(block.spans).toEqual([
        { text: 'Alpha ', src: 0, bold: false, highlight: false },
        { text: 'beta ', src: 8, bold: true, highlight: false },
        { text: 'gamma', src: 15, bold: true, highlight: true },
        { text: ' delta.', src: 24, bold: false, highlight: false },
      ]);
      for (const s of block.spans) {
        expect(text.slice(s.src, s.src + s.text.length)).toBe(s.text);
      }
    }
  });

  it('recognizes empty page marker and headings', () => {
    expect(parsePageBlocks('_(no text on this page)_')).toEqual([
      { kind: 'empty' },
    ]);
    const blocks = parsePageBlocks(
      'Chapter Overview\nThis is a much longer body line that sets the full line width for the block.',
    );
    expect(blocks[0]?.kind).toBe('head');
    expect(blocks[1]?.kind).toBe('para');
  });

  it('formats distill mark labels', () => {
    expect(distillMarkLabel('none', true)).toBe('No text');
    expect(distillMarkLabel('none', false)).toBe('Not marked');
    expect(distillMarkLabel('bold', false)).toBe('Bolded');
    expect(distillMarkLabel('highlight', false)).toBe('Highlighted');
  });
});
