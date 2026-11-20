import { VaultTree } from './tree.js';

const tree = new VaultTree(
  [
    { path: '1.Projects', kind: 'dir' },
    { path: '1.Projects/Expo', kind: 'dir' },
    { path: '1.Projects/Expo/Expo.md', kind: 'file', text: '# Expo\n' },
    { path: '1.Projects/Expo/poster.png', kind: 'file' },
    { path: '.obsidian', kind: 'dir' },
    { path: 'Coach', kind: 'dir' },
    { path: 'Coach/sessions', kind: 'dir' },
    { path: 'Coach/sessions/s-1.md', kind: 'file', text: 'session' },
    { path: 'Loose.md', kind: 'file', text: 'loose' },
  ],
  (content) => ({ data: {}, content }),
);

describe('VaultTree', () => {
  it('answers what exists, and of which kind', () => {
    expect(tree.exists('1.Projects/Expo')).toBe(true);
    expect(tree.isDir('1.Projects/Expo/')).toBe(true);
    expect(tree.isFile('1.Projects/Expo/poster.png')).toBe(true);
    expect(tree.exists('1.Projects/Nope')).toBe(false);
    expect(tree.isDir('')).toBe(true);
  });

  it('lists a folder sorted by name, hidden entries included, and nothing for a missing one', () => {
    expect(tree.entries('').map((e) => e.name)).toEqual([
      '.obsidian',
      '1.Projects',
      'Coach',
      'Loose.md',
    ]);
    expect(tree.entries('Nope')).toEqual([]);
    expect(tree.dirsIn('')).toEqual(['1.Projects', 'Coach']);
    expect(tree.mdIn('1.Projects/Expo')).toEqual(['Expo']);
  });

  it('reads the text of a note and refuses anything else', () => {
    expect(tree.text('1.Projects/Expo/Expo.md')).toBe('# Expo\n');
    expect(() => tree.text('1.Projects/Expo/poster.png')).toThrow(
      /no such note/,
    );
  });

  it('finds the notes, skipping Coach and hidden folders', () => {
    expect(tree.notePaths()).toEqual(['1.Projects/Expo/Expo.md', 'Loose.md']);
    expect(tree.notes().map((n) => n.title)).toEqual(['Expo', 'Loose']);
  });
});
