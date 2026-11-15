import { readdir, readFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { parseFrontmatter, extractBody } from "./md.js";
import { classify, COACH_ROOT, type ParaLocation } from "./para.js";
import { extractLinks, type RawLink } from "./links.js";

export interface VaultNote extends ParaLocation {

  path: string;
  title: string;

  frontmatter: Record<string, unknown>;
  body: string;

  coachId: string | null;

  convertedFrom: string | null;

  rawRole: "index" | "chapter" | null;

  concept: boolean;

  pageRange: [number, number] | null;
  links: RawLink[];
}

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
