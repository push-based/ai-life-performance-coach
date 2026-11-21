import { constants } from 'node:fs';
import {
  copyFile,
  link,
  mkdir,
  readdir,
  readFile,
  rename,
  rmdir,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join, sep } from 'node:path';
import type {
  NoteStore,
  StoreEntry,
  WriteOptions,
} from '@ai-coach/vault-application';

export function createFsNoteStore(root: string): NoteStore {
  const abs = (path: string) => join(root, path);
  const ensureParent = (path: string) =>
    mkdir(dirname(abs(path)), { recursive: true });
  const flag = (opts?: WriteOptions) => (opts?.create ? 'wx' : 'w');

  async function removeEmpty(dir: string): Promise<void> {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (e.isDirectory()) await removeEmpty(join(dir, e.name));
      else if (e.name === '.DS_Store') await unlink(join(dir, e.name));
    }
    await rmdir(dir).catch(() => undefined);
  }

  return {
    root,
    separator: sep,
    async list(dir) {
      try {
        const entries = await readdir(abs(dir), { withFileTypes: true });
        return entries.map((e): StoreEntry => ({
          name: e.name,
          kind: e.isDirectory() ? 'dir' : e.isFile() ? 'file' : 'other',
        }));
      } catch {
        return [];
      }
    },
    exists: (path) =>
      stat(abs(path)).then(
        () => true,
        () => false,
      ),
    isDir: (path) =>
      stat(abs(path)).then(
        (s) => s.isDirectory(),
        () => false,
      ),
    readText: (path) => readFile(abs(path), 'utf-8'),
    readBytes: async (path) => new Uint8Array(await readFile(abs(path))),
    async writeText(path, text, opts) {
      await ensureParent(path);
      await writeFile(abs(path), text, { flag: flag(opts) });
    },
    async writeBytes(path, bytes, opts) {
      await ensureParent(path);
      await writeFile(abs(path), bytes, { flag: flag(opts) });
    },
    async replaceText(path, text) {
      await ensureParent(path);
      const tmp = `${abs(path)}.${process.pid}.${randomUUID()}.tmp`;
      await writeFile(tmp, text);
      await rename(tmp, abs(path));
    },
    async makeDir(path) {
      await mkdir(abs(path), { recursive: true });
    },
    async moveFile(from, to) {
      await ensureParent(to);
      await link(abs(from), abs(to));
      await unlink(abs(from));
    },
    async moveDir(from, to) {
      if (
        await stat(abs(to)).then(
          () => true,
          () => false,
        )
      )
        throw new Error(`${abs(to)} appeared since the preview`);
      await ensureParent(to);
      await rename(abs(from), abs(to));
    },
    async copyFile(from, to) {
      await ensureParent(to);
      await copyFile(abs(from), abs(to), constants.COPYFILE_EXCL);
    },
    removeEmptyDirs: (path) => removeEmpty(abs(path)),
  };
}
