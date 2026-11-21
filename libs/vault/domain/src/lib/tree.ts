import { posix } from '@ai-coach/util-path';
import { COACH_ROOT } from './para.js';
import { noteFromContent, type VaultNote } from './note.js';
import type { FrontmatterParser } from './md.js';
import type { VaultListing } from './listing.js';

export type EntryKind = 'file' | 'dir';

export interface TreeEntry {
  path: string;
  kind: EntryKind;
  text?: string;
}

export interface TreeDirent {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
}

const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const key = (path: string) => {
  const p = posix.normalize(path);
  return p === '.' || p === './' ? '' : p.replace(/\/$/, '');
};

export class VaultTree implements VaultListing {
  private readonly kinds = new Map<string, EntryKind>([['', 'dir']]);
  private readonly texts = new Map<string, string>();
  private readonly children = new Map<string, string[]>();

  constructor(
    entries: TreeEntry[],
    private readonly parse: FrontmatterParser,
  ) {
    for (const e of entries) {
      const path = key(e.path);
      this.kinds.set(path, e.kind);
      if (e.text !== undefined) this.texts.set(path, e.text);
      const parent = key(posix.dirname(path));
      const list = this.children.get(parent) ?? [];
      list.push(posix.basename(path));
      this.children.set(parent, list);
    }
    for (const list of this.children.values()) list.sort(byName);
  }

  exists(path: string): boolean {
    return this.kinds.has(key(path));
  }

  isFile(path: string): boolean {
    return this.kinds.get(key(path)) === 'file';
  }

  isDir(path: string): boolean {
    return this.kinds.get(key(path)) === 'dir';
  }

  entries(dir: string): TreeDirent[] {
    const base = key(dir);
    if (!this.isDir(base)) return [];
    return (this.children.get(base) ?? []).map((name) => {
      const kind = this.kinds.get(base ? `${base}/${name}` : name);
      return {
        name,
        isFile: () => kind === 'file',
        isDirectory: () => kind === 'dir',
      };
    });
  }

  text(path: string): string {
    const text = this.texts.get(key(path));
    if (text === undefined) throw new Error(`no such note: ${path}`);
    return text;
  }

  dirsIn(dir: string): string[] {
    return this.entries(dir)
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name);
  }

  mdIn(dir: string): string[] {
    return this.entries(dir)
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name.slice(0, -3));
  }

  notePaths(): string[] {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const e of this.entries(dir)) {
        if (e.name.startsWith('.')) continue;
        const child = dir ? `${dir}/${e.name}` : e.name;
        if (e.isDirectory()) {
          if (child !== COACH_ROOT) walk(child);
        } else if (e.isFile() && e.name.endsWith('.md')) out.push(child);
      }
    };
    walk('');
    return out;
  }

  noteOf(path: string, content: string): VaultNote {
    return noteFromContent(path, content, this.parse);
  }

  notes(): VaultNote[] {
    return this.notePaths().map((p) => this.noteOf(p, this.text(p)));
  }
}
