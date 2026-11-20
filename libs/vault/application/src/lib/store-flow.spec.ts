import { createMemoryNoteStore } from '../testing/memory-store.js';
import { loadTree, snapshot } from './scan.js';
import { executeWrites } from './plans.js';
import { loadSessions } from './sessions.js';

const parse = (content: string) => {
  const m = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, content };
  return {
    data: Object.fromEntries(
      m[1].split('\n').map((l) => l.split(/:\s*/) as [string, string]),
    ),
    content: m[2],
  };
};

describe('reading the vault through a NoteStore', () => {
  it('snapshots notes and folders, skipping Coach and hidden folders', async () => {
    const store = createMemoryNoteStore({
      '1.Projects/Expo/Expo.md': '---\nstatus: todo\n---\n# Expo\n',
      '.obsidian/app.md': 'hidden',
      'Coach/sessions/x.md': 'session',
    });
    await store.makeDir('1.Projects/Empty');
    const [tree, notes] = await snapshot(store, parse);
    expect(notes.map((n) => [n.path, n.frontmatter.status])).toEqual([
      ['1.Projects/Expo/Expo.md', 'todo'],
    ]);
    expect(tree.dirsIn('1.Projects')).toEqual(['Empty', 'Expo']);
    expect(tree.isDir('.obsidian')).toBe(true);
    expect(tree.exists('.obsidian/app.md')).toBe(false);
  });

  it('can list paths without reading every note', async () => {
    const store = createMemoryNoteStore({ 'a.md': 'A', 'b/c.md': 'C' });
    const tree = await loadTree(store, parse, false);
    expect(tree.notePaths()).toEqual(['a.md', 'b/c.md']);
    expect(() => tree.text('a.md')).toThrow(/no such note/);
  });

  it('reports a session that does not parse instead of failing', async () => {
    const store = createMemoryNoteStore({
      'Coach/sessions/bad.md': 'no record here',
    });
    const { sessions, invalid } = await loadSessions(store);
    expect(sessions).toEqual([]);
    expect(invalid[0].file).toBe('Coach/sessions/bad.md');
  });
});

describe('executeWrites', () => {
  it('writes the planned notes when nothing changed since the preview', async () => {
    const store = createMemoryNoteStore({ 'a.md': 'old' });
    await executeWrites(store, {
      errors: [],
      originals: { 'a.md': 'old' },
      writes: { 'a.md': 'new', 'b/new.md': 'fresh' },
      created: ['b/new.md'],
    });
    expect(await store.readText('a.md')).toBe('new');
    expect(await store.readText('b/new.md')).toBe('fresh');
  });

  it('refuses a note changed since the preview, and one that appeared', async () => {
    const store = createMemoryNoteStore({ 'a.md': 'edited', 'c.md': 'here' });
    await expect(
      executeWrites(store, {
        errors: [],
        originals: { 'a.md': 'old' },
        writes: { 'a.md': 'new' },
        created: [],
      }),
    ).rejects.toThrow(/a.md changed since the preview/);
    await expect(
      executeWrites(store, {
        errors: [],
        originals: {},
        writes: { 'c.md': 'new' },
        created: ['c.md'],
      }),
    ).rejects.toThrow(/c.md appeared since the preview/);
  });
});
