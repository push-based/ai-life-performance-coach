/**
 * Read a vault as it is (ADR-KI-0058 Decisions 1 and 3). Every `*.md` outside
 * dot-folders and `Coach/` is a note; frontmatter is optional and never required.
 * Scanning reads only: no note is written, moved, or touched.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { parseFrontmatter, extractBody } from "@docs-mcp/core/kernel/md/frontmatter.js";
import { classify, COACH_ROOT, type ParaLocation } from "./para.js";
import { extractLinks, type RawLink } from "./links.js";

export interface VaultNote extends ParaLocation {
  /** Vault-relative, forward-slash path; the note's address until Phase 2 adds `coach_id`. */
  path: string;
  title: string;
  /** Parsed frontmatter, or an empty object when the note has none. */
  frontmatter: Record<string, unknown>;
  body: string;
  /** `coach_id` from frontmatter, when the note has been sparred. */
  coachId: string | null;
  /** `converted_from` from frontmatter: the raw file (e.g. a PDF) this note was converted from. */
  convertedFrom: string | null;
  /** `raw_role` from frontmatter: a converted book's `index` (text.md) or one of its `chapter`s. */
  rawRole: "index" | "chapter" | null;
  /** True for a concept note, `type: "concept"` (ADR-KI-0060): the unit that is sparred. */
  concept: boolean;
  /** For a chapter, the PDF pages it holds, from its `pages: "a-b"`. */
  pageRange: [number, number] | null;
  links: RawLink[];
}

/** Vault-relative paths of every note, in code-unit order so a scan is the same everywhere. */
export async function listNotePaths(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(rel: string): Promise<void> {
    let entries;
    try { entries = await readdir(join(root, rel), { withFileTypes: true }); } catch { return; }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const child = rel ? posix.join(rel, e.name) : e.name;
      if (e.isDirectory()) {
        if (child === COACH_ROOT) continue;
        await walk(child);
      } else if (e.isFile() && e.name.endsWith(".md")) {
        out.push(child);
      }
    }
  }
  await walk("");
  return out;
}

function titleOf(path: string, fm: Record<string, unknown>, body: string): string {
  if (typeof fm.title === "string" && fm.title.trim()) return fm.title.trim();
  const h1 = body.match(/^#\s+(.+?)\s*#*\s*$/m);
  if (h1) return h1[1];
  return posix.basename(path, ".md");
}

export async function readNote(root: string, path: string): Promise<VaultNote> {
  return noteFromContent(path, await readFile(join(root, path), "utf-8"));
}

/** A note as the scan reads it, from its path and content; also for a note a plan is about to write. */
export function noteFromContent(path: string, content: string): VaultNote {
  const frontmatter = (parseFrontmatter(content) ?? {}) as Record<string, unknown>;
  const body = Object.keys(frontmatter).length ? extractBody(content) : content;
  const coachId = typeof frontmatter.coach_id === "string" ? frontmatter.coach_id : null;
  const convertedFrom = typeof frontmatter.converted_from === "string" ? frontmatter.converted_from : null;
  const rawRole = frontmatter.raw_role === "index" || frontmatter.raw_role === "chapter" ? frontmatter.raw_role : null;
  const range = rawRole === "chapter" && typeof frontmatter.pages === "string" ? frontmatter.pages.match(/^(\d+)-(\d+)$/) : null;
  const pageRange: [number, number] | null = range ? [Number(range[1]), Number(range[2])] : null;
  const concept = frontmatter.type === "concept";
  return { path, title: titleOf(path, frontmatter, body), frontmatter, body, coachId, convertedFrom, rawRole, concept, pageRange, links: extractLinks(body), ...classify(path) };
}

export async function scanVault(root: string): Promise<VaultNote[]> {
  const paths = await listNotePaths(root);
  return Promise.all(paths.map(p => readNote(root, p)));
}
