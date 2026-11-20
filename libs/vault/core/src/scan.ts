import { readdir, readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import matter from 'gray-matter';
import {
  COACH_ROOT,
  noteFromContent,
  type FrontmatterParser,
  VaultTree,
  type TreeEntry,
  type VaultNote,
} from '@ai-coach/vault-domain';

export const parseMatter: FrontmatterParser = (content) => {
  const { data, content: body } = matter(content);
  return { data, content: body };
};

export const noteOf = (path: string, content: string): VaultNote =>
  noteFromContent(path, content, parseMatter);

export async function loadTree(root: string): Promise<VaultTree> {
  const entries: TreeEntry[] = [];
  async function walk(rel: string): Promise<void> {
    let dirents;
    try {
      dirents = await readdir(join(root, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of dirents) {
      const child = rel ? posix.join(rel, e.name) : e.name;
      if (e.isDirectory()) {
        entries.push({ path: child, kind: 'dir' });
        if (!e.name.startsWith('.')) await walk(child);
      } else if (e.isFile()) {
        entries.push(
          e.name.endsWith('.md') && !e.name.startsWith('.')
            ? {
                path: child,
                kind: 'file',
                text: await readFile(join(root, child), 'utf-8'),
              }
            : { path: child, kind: 'file' },
        );
      }
    }
  }
  await walk('');
  return new VaultTree(entries);
}

export async function snapshot(
  root: string,
): Promise<[VaultTree, VaultNote[]]> {
  const tree = await loadTree(root);
  return [tree, tree.notes(parseMatter)];
}

export async function listNotePaths(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(rel: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(join(root, rel), { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
      if (e.name.startsWith('.')) continue;
      const child = rel ? posix.join(rel, e.name) : e.name;
      if (e.isDirectory()) {
        if (child === COACH_ROOT) continue;
        await walk(child);
      } else if (e.isFile() && e.name.endsWith('.md')) {
        out.push(child);
      }
    }
  }
  await walk('');
  return out;
}

export async function readNote(root: string, path: string): Promise<VaultNote> {
  return noteOf(path, await readFile(join(root, path), 'utf-8'));
}

export async function scanVault(root: string): Promise<VaultNote[]> {
  const paths = await listNotePaths(root);
  return Promise.all(paths.map((p) => readNote(root, p)));
}
