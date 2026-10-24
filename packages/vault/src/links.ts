/**
 * Links between notes: Obsidian `[[wikilinks]]` (and `![[embeds]]`) plus relative
 * markdown links. Both become graph edges; neither needs frontmatter.
 */

import { posix } from "node:path";

export interface RawLink {
  kind: "wikilink" | "markdown";
  /** The target as written, without alias or heading. */
  target: string;
}

const WIKILINK = /!?\[\[([^\]\n]+?)\]\]/g;
const MD_LINK = /(?<!!)\[[^\]\n]*\]\((?:<([^>\n]+)>|([^)\s]+))(?:\s+"[^"]*")?\)/g;
const FENCE = /^(```|~~~)[\s\S]*?^\1/gm;
const INLINE_CODE = /`[^`\n]*`/g;

/** Links in a note body, code blocks and inline code excluded. */
export function extractLinks(body: string): RawLink[] {
  const text = body.replace(FENCE, "").replace(INLINE_CODE, "");
  const out: RawLink[] = [];
  for (const m of text.matchAll(WIKILINK)) {
    const target = m[1].split("|")[0].split("#")[0].trim();
    if (target) out.push({ kind: "wikilink", target });
  }
  for (const m of text.matchAll(MD_LINK)) {
    const href = m[1] ?? m[2];
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#")) continue;
    const target = safeDecode(href.split("#")[0]);
    if (target) out.push({ kind: "markdown", target });
  }
  return out;
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/**
 * Resolves link targets to note paths the way Obsidian does: a wikilink by note name,
 * or by path suffix when it names folders, preferring the shortest path on a tie; a
 * markdown link relative to the linking note.
 */
export class LinkResolver {
  private readonly byName = new Map<string, string[]>();
  private readonly paths: Set<string>;
  /** Converted raw files (a PDF's vault path) to the note converted from them. */
  private readonly converted = new Map<string, string>();
  private readonly convertedByName = new Map<string, string>();

  /**
   * `conversions` maps a converted note's path to the vault path of the file it was
   * converted from, so `[[Book.pdf#page=42]]` resolves to the note (ADR-KI-0059).
   */
  /**
   * `aliases` pairs a note with an Obsidian `aliases` entry, so `[[Building a Second Brain]]`
   * reaches a book's `text.md`; a note's own name wins over an alias.
   */
  private readonly byAlias = new Map<string, string>();

  constructor(notePaths: string[], conversions: [notePath: string, sourcePath: string][] = [], aliases: [notePath: string, alias: string][] = []) {
    this.paths = new Set(notePaths);
    for (const [note, alias] of aliases) {
      const key = alias.toLowerCase();
      if (!this.byAlias.has(key)) this.byAlias.set(key, note);
    }
    for (const [note, source] of conversions) {
      this.converted.set(source, note);
      const name = posix.basename(source).toLowerCase();
      if (!this.convertedByName.has(name)) this.convertedByName.set(name, note);
    }
    for (const p of notePaths) {
      const key = posix.basename(p, ".md").toLowerCase();
      const list = this.byName.get(key) ?? [];
      list.push(p);
      this.byName.set(key, list);
    }
    for (const list of this.byName.values()) list.sort((a, b) => a.length - b.length || (a < b ? -1 : 1));
  }

  resolve(from: string, link: RawLink): string | null {
    if (link.kind === "markdown") {
      const joined = posix.normalize(posix.join(posix.dirname(from), link.target));
      if (this.converted.has(joined)) return this.converted.get(joined)!;
      const withExt = joined.endsWith(".md") ? joined : `${joined}.md`;
      return this.paths.has(withExt) ? withExt : null;
    }
    if (/\.(pdf|epub)$/i.test(link.target)) {
      const exact = [...this.converted.entries()].find(([src]) => src.toLowerCase() === link.target.toLowerCase() || src.toLowerCase().endsWith(`/${link.target.toLowerCase()}`));
      return exact ? exact[1] : this.convertedByName.get(posix.basename(link.target).toLowerCase()) ?? null;
    }
    const target = link.target.replace(/\.md$/, "");
    const candidates = this.byName.get(posix.basename(target).toLowerCase()) ?? [];
    if (!target.includes("/")) return candidates[0] ?? this.byAlias.get(target.toLowerCase()) ?? null;
    const suffix = `${target}.md`.toLowerCase();
    return candidates.find(p => p.toLowerCase() === suffix || p.toLowerCase().endsWith(`/${suffix}`)) ?? null;
  }
}
