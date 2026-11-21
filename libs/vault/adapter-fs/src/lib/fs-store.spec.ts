import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFsNoteStore } from './fs-store.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fs-store-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('createFsNoteStore', () => {
  it('writes into missing folders, and refuses to create over a file', async () => {
    const store = createFsNoteStore(dir);
    await store.writeText('a/b/note.md', 'one', { create: true });
    expect(readFileSync(join(dir, 'a/b/note.md'), 'utf-8')).toBe('one');
    await expect(
      store.writeText('a/b/note.md', 'two', { create: true }),
    ).rejects.toThrow();
    await store.writeText('a/b/note.md', 'two');
    expect(await store.readText('a/b/note.md')).toBe('two');
  });

  it('moves a file without clobbering one already there', async () => {
    const store = createFsNoteStore(dir);
    writeFileSync(join(dir, 'x.md'), 'x');
    writeFileSync(join(dir, 'y.md'), 'y');
    await expect(store.moveFile('x.md', 'y.md')).rejects.toThrow();
    await store.moveFile('x.md', 'sub/x.md');
    expect(await store.exists('x.md')).toBe(false);
    expect(await store.readText('sub/x.md')).toBe('x');
  });

  it('lists a symlink as neither file nor folder, and a missing folder as empty', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'outside-'));
    try {
      mkdirSync(join(dir, 'r'));
      symlinkSync(outside, join(dir, 'r', 'link'));
      const store = createFsNoteStore(dir);
      expect(await store.list('r')).toEqual([{ name: 'link', kind: 'other' }]);
      expect(await store.list('nope')).toEqual([]);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('removes folders that hold nothing but folders and .DS_Store', async () => {
    mkdirSync(join(dir, 'old/inner'), { recursive: true });
    writeFileSync(join(dir, 'old/inner/.DS_Store'), '');
    await createFsNoteStore(dir).removeEmptyDirs('old');
    expect(await createFsNoteStore(dir).exists('old')).toBe(false);
  });
});
