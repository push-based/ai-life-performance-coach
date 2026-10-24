/**
 * The vault handle: one resolved root, and the read operations the vault server's tools
 * call. Every read rescans, so an edit made in Obsidian is visible on the next call
 * without a cache to invalidate.
 */

import { posix, resolve, sep } from "node:path";
import { isInside } from "./root.js";
import { COACH_ROOT } from "./para.js";
import { listNotePaths, readNote, scanVault, type VaultNote } from "./scan.js";

export interface Vault {
  readonly root: string;
  notes(): Promise<VaultNote[]>;
  /** A note by vault-relative path; null when it is not a note of this vault. */
  note(path: string): Promise<VaultNote | null>;
}

/**
 * Normalize a caller-supplied path to a vault-relative note path, or null when it
 * escapes the vault, names a dot-folder or `Coach/`, or is not markdown.
 */
export function notePathOf(root: string, path: string): string | null {
  const rel = posix.normalize(path.split(sep).join("/").replace(/^\/+/, ""));
  if (!rel.endsWith(".md") || rel.startsWith("..")) return null;
  if (!isInside(resolve(root, rel), root)) return null;
  const parts = rel.split("/");
  if (parts.some(p => p.startsWith(".")) || parts[0] === COACH_ROOT) return null;
  return rel;
}

export function createVault(root: string): Vault {
  return {
    root,
    notes: () => scanVault(root),
    async note(path) {
      const rel = notePathOf(root, path);
      if (!rel) return null;
      const all = await listNotePaths(root);
      return all.includes(rel) ? readNote(root, rel) : null;
    },
  };
}
