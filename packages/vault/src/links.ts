/**
 * Links between notes: Obsidian `[[wikilinks]]` (and `![[embeds]]`) plus relative
 * markdown links. Both become graph edges; neither needs frontmatter.
 */

import { posix } from "node:path";

export interface RawLink {
  kind: "wikilink" | "markdown";
  /** The target as written, without alias or heading. */
  target: string;
  /** The page of a `#page=N` anchor, as Obsidian writes for PDFs. */
  page?: number;
}

function pageAnchor(raw: string): number | undefined {
  const m = raw.match(/#page=(\d+)/);
  return m ? Number(m[1]) : undefined;
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
    const ref = m[1].split("|")[0];
    const target = ref.split("#")[0].trim();
    const page = pageAnchor(ref);
    if (target) out.push(page ? { kind: "wikilink", target, page } : { kind: "wikilink", target });
  }
  for (const m of text.matchAll(MD_LINK)) {
    const href = m[1] ?? m[2];
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#")) continue;
    const target = safeDecode(href.split("#")[0]);
    const page = pageAnchor(href);
    if (target) out.push(page ? { kind: "markdown", target, page } : { kind: "markdown", target });
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
  /** Per converted PDF, the chapter notes and the pages each holds. */
  private readonly chapters = new Map<string, { note: string; from: number; to: number }[]>();

  /**
   * `conversions` maps a converted note's path to the vault path of the file it was
   * converted from, so `[[Book.pdf#page=42]]` resolves to the note (ADR-KI-0059).
   */
  /**
   * `aliases` pairs a note with an Obsidian `aliases` entry, so `[[Notes That Work]]`
   * reaches a book's `text.md`; a note's own name wins over an alias.
   */
  private readonly byAlias = new Map<string, string>();

  /**
   * A conversion with a page range is a chapter: a link to that PDF with a `#page=N`
   * inside the range resolves to the chapter, any other link to the book's index.
   */
  constructor(
    notePaths: string[],
    conversions: [notePath: string, sourcePath: string, pages?: [number, number]][] = [],
    aliases: [notePath: string, alias: string][] = [],
  ) {
    this.paths = new Set(notePaths);
    for (const [note, alias] of aliases) {
      const key = alias.toLowerCase();
      if (!this.byAlias.has(key)) this.byAlias.set(key, note);
    }
    for (const [note, source, pages] of conversions) {
      if (pages) {
        this.chapters.set(source, [...(this.chapters.get(source) ?? []), { note, from: pages[0], to: pages[1] }]);
        continue;
      }
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

  /** The chapter holding `page` of a converted PDF, else the book's index. */
  private toPage(source: string, page: number | undefined): string | null {
    const hit = page ? this.chapters.get(source)?.find(c => page >= c.from && page <= c.to) : undefined;
    return hit?.note ?? this.converted.get(source) ?? null;
  }

  resolve(from: string, link: RawLink): string | null {
    if (link.kind === "markdown") {
      const joined = posix.normalize(posix.join(posix.dirname(from), link.target));
      if (this.converted.has(joined) || this.chapters.has(joined)) return this.toPage(joined, link.page);
      const withExt = joined.endsWith(".md") ? joined : `${joined}.md`;
      return this.paths.has(withExt) ? withExt : null;
    }
    if (/\.(pdf|epub)$/i.test(link.target)) {
      const want = link.target.toLowerCase();
      const sources = [...new Set([...this.converted.keys(), ...this.chapters.keys()])];
      const exact = sources.find(src => src.toLowerCase() === want || src.toLowerCase().endsWith(`/${want}`));
      if (exact) return this.toPage(exact, link.page);
      const byName = this.convertedByName.get(posix.basename(want));
      return byName ?? null;
    }
    const target = link.target.replace(/\.md$/, "");
    const candidates = this.byName.get(posix.basename(target).toLowerCase()) ?? [];
    if (!target.includes("/")) return candidates[0] ?? this.byAlias.get(target.toLowerCase()) ?? null;
    const suffix = `${target}.md`.toLowerCase();
    return candidates.find(p => p.toLowerCase() === suffix || p.toLowerCase().endsWith(`/${suffix}`)) ?? null;
  }
}
