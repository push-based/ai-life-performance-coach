import { posix } from '@ai-coach/util-path';
import type {
  NoteStore,
  StoreEntry,
  WriteOptions,
} from '../lib/ports/note-store.js';

export interface MemoryNoteStore extends NoteStore {
  files: Map<string, string | Uint8Array>;
  dirs: Set<string>;
}

export function createMemoryNoteStore(
  files: Record<string, string> = {},
): MemoryNoteStore {
  const store = new Map<string, string | Uint8Array>();
  const dirs = new Set<string>(['']);
  const addDirs = (path: string) => {
    for (let d = posix.dirname(path); d !== '.'; d = posix.dirname(d))
      dirs.add(d);
  };
  const put = (
    path: string,
    content: string | Uint8Array,
    opts?: WriteOptions,
  ) => {
    if (opts?.create && store.has(path)) throw new Error(`${path} exists`);
    addDirs(path);
    store.set(path, content);
  };
  for (const [path, text] of Object.entries(files)) put(path, text);
  const text = (path: string) => {
    const v = store.get(path);
    if (v === undefined) throw new Error(`no such file: ${path}`);
    if (typeof v !== 'string') throw new Error(`${path} is not text`);
    return v;
  };
  const children = (dir: string): StoreEntry[] => {
    const prefix = dir ? `${dir}/` : '';
    const names = new Map<string, StoreEntry['kind']>();
    for (const d of dirs)
      if (
        d.startsWith(prefix) &&
        d !== dir &&
        !d.slice(prefix.length).includes('/')
      )
        names.set(d.slice(prefix.length), 'dir');
    for (const f of store.keys())
      if (f.startsWith(prefix) && !f.slice(prefix.length).includes('/'))
        names.set(f.slice(prefix.length), 'file');
    return [...names].map(([name, kind]) => ({ name, kind }));
  };
  return {
    root: '/memory',
    separator: '/',
    files: store,
    dirs,
    list: async (dir) => (dirs.has(dir) ? children(dir) : []),
    exists: async (path) => store.has(path) || dirs.has(path),
    isDir: async (path) => dirs.has(path),
    readText: async (path) => text(path),
    readBytes: async (path) => {
      const v = store.get(path);
      if (v === undefined) throw new Error(`no such file: ${path}`);
      return typeof v === 'string'
        ? Uint8Array.from(v, (c) => c.charCodeAt(0))
        : v;
    },
    writeText: async (path, content, opts) => put(path, content, opts),
    writeBytes: async (path, bytes, opts) => put(path, bytes, opts),
    replaceText: async (path, content) => put(path, content),
    makeDir: async (path) => {
      dirs.add(path);
      addDirs(path);
    },
    moveFile: async (from, to) => {
      put(to, store.get(from) ?? text(from), { create: true });
      store.delete(from);
    },
    moveDir: async (from, to) => {
      if (dirs.has(to)) throw new Error(`${to} appeared since the preview`);
      for (const d of [...dirs])
        if (d === from || d.startsWith(`${from}/`)) {
          dirs.delete(d);
          dirs.add(to + d.slice(from.length));
        }
      for (const [f, v] of [...store])
        if (f.startsWith(`${from}/`)) {
          store.delete(f);
          put(to + f.slice(from.length), v);
        }
      addDirs(to);
    },
    copyFile: async (from, to) =>
      put(to, store.get(from) ?? text(from), { create: true }),
    removeEmptyDirs: async (path) => {
      const empty = (d: string): boolean =>
        children(d).every(
          (e) => e.kind === 'dir' && empty(d ? `${d}/${e.name}` : e.name),
        );
      if (!empty(path)) return;
      for (const d of [...dirs])
        if (d === path || d.startsWith(`${path}/`)) dirs.delete(d);
    },
  };
}
