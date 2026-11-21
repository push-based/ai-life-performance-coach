import { posix } from '@ai-coach/util-path';
import {
  VaultTree,
  type FrontmatterParser,
  type TreeEntry,
  type VaultNote,
} from '@ai-coach/vault-domain';
import type { NoteStore } from './ports/note-store.js';

export async function loadTree(
  store: NoteStore,
  parse: FrontmatterParser,
  texts = true,
): Promise<VaultTree> {
  const entries: TreeEntry[] = [];
  async function walk(rel: string): Promise<void> {
    for (const e of await store.list(rel)) {
      const child = rel ? posix.join(rel, e.name) : e.name;
      if (e.kind === 'dir') {
        entries.push({ path: child, kind: 'dir' });
        if (!e.name.startsWith('.')) await walk(child);
      } else if (e.kind === 'file') {
        entries.push(
          texts && e.name.endsWith('.md') && !e.name.startsWith('.')
            ? { path: child, kind: 'file', text: await store.readText(child) }
            : { path: child, kind: 'file' },
        );
      }
    }
  }
  await walk('');
  return new VaultTree(entries, parse);
}

export async function snapshot(
  store: NoteStore,
  parse: FrontmatterParser,
): Promise<[VaultTree, VaultNote[]]> {
  const tree = await loadTree(store, parse);
  return [tree, tree.notes()];
}

export async function scanVault(
  store: NoteStore,
  parse: FrontmatterParser,
): Promise<VaultNote[]> {
  return (await snapshot(store, parse))[1];
}

export async function readNote(
  store: NoteStore,
  parse: FrontmatterParser,
  path: string,
): Promise<VaultNote | null> {
  const tree = await loadTree(store, parse, false);
  return tree.notePaths().includes(path)
    ? tree.noteOf(path, await store.readText(path))
    : null;
}
