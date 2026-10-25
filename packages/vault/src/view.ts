/**
 * The vault view (ADR-KI-0058 Decision 11): a loopback HTTP server rooted at the vault,
 * separate from this repository's view server. It serves exactly four things: the
 * page, its script, the graph, regenerated into `Coach/graph.json` on every request,
 * and one page of a converted book's chapter (ADR-KI-0061), to read while distilling.
 * No other note body is ever served, and the page may load nothing from off the machine
 * (Content-Security-Policy), so it works offline and leaks nothing.
 */

import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { join, posix } from "node:path";
import { COACH_ROOT, type ParaBucket } from "./para.js";
import { buildVaultGraph } from "./graph.js";
import type { Mastery } from "./mastery.js";
import type { Vault } from "./vault.js";
import type { VaultNote } from "./scan.js";
import { RAW_TEXT, pagesOf } from "./convert.js";
import { bookProgress, citations, type ChapterState, type PageMark, type ReadingStage } from "./distill.js";

export const GRAPH_FILE = posix.join(COACH_ROOT, "graph.json");

export interface VaultViewGraph {
  generatedAt: string;
  vaultName: string;
  nodes: {
    id: string;
    title: string;
    /** A short label for the graph; the full title stays in `title`. */
    label: string;
    bucket: ParaBucket | null;
    container: string | null;
    raw: boolean;
    rawRole: "index" | "chapter" | null;
    /** A concept note (ADR-KI-0060), drawn as a diamond. */
    concept: boolean;
    /** For a chapter, the id of its book's index, so the view can fold a book into one node. */
    book: string | null;
    /** For a book index, how many chapter notes it has. */
    chapterCount: number | null;
    /** For a book index, its reading stage and how many chapters are complete (ADR-KI-0061). */
    stage: ReadingStage | null;
    /** For a book index, when the user marked it read. */
    readOn: string | null;
    chaptersComplete: number | null;
    /** For a raw source (a book's index or a raw note), the user's notes and concept notes made from it. */
    notesFrom: string[] | null;
    conceptsFrom: string[] | null;
    /** For a chapter, its distilling: the chapter state and each page's mark and summary. */
    distill: { state: ChapterState; summary: boolean; pages: { page: number; mark: PageMark; summary: boolean; empty: boolean }[] } | null;
    mastery: Mastery;
    nextReview: string | null;
  }[];
  edges: { source: string; target: string; kind: "wikilink" | "markdown" }[];
  unresolved: number;
}

const LABEL_MAX = 28;
const clip = (s: string) => (s.length > LABEL_MAX ? `${s.slice(0, LABEL_MAX - 1).trimEnd()}…` : s);

/**
 * A label short enough to read in a crowded graph. A chapter drops "Chapter N:" for its
 * number and keeps the words before a dash or colon: "4. Capture (1/3)".
 */
export function shortLabel(note: Pick<VaultNote, "title" | "rawRole" | "frontmatter">): string {
  if (note.rawRole !== "chapter") return clip(note.title);
  const title = note.title.replace(/\s*\(\d+ of \d+\)$/, "");
  const m = title.match(/^chapter\s+(\d+)\s*[:.\-–—]\s*(.*)$/i);
  const name = (m ? m[2] : title).split(/\s*[:—–]\s*/)[0];
  const section = typeof note.frontmatter.section === "string" ? note.frontmatter.section.match(/^(\d+) of (\d+)$/) : null;
  const suffix = section ? ` (${section[1]}/${section[2]})` : "";
  return clip(`${m ? `${m[1]}. ` : ""}${name}`) + suffix;
}

/** Build the view graph from the vault and write it to `Coach/graph.json`, replacing the previous one. */
export async function writeViewGraph(vault: Vault, now: Date = new Date()): Promise<VaultViewGraph> {
  const { notes } = await vault.notesWithHistory();
  const history = new Map(notes.map(n => [n.path, n.history]));
  const byPath = new Map(notes.map(n => [n.path, n]));
  const g = buildVaultGraph(notes);
  const books = new Map(bookProgress(notes).map(b => [b.index, b]));
  const chapters = new Map([...books.values()].flatMap(b => b.chapters.map(c => [c.path, c] as const)));
  const cited = citations(notes);
  const graph: VaultViewGraph = {
    generatedAt: now.toISOString(),
    vaultName: posix.basename(vault.root.split("\\").join("/")),
    nodes: g.nodes.map(n => {
      const note = byPath.get(n.id)!;
      const book = note.rawRole === "chapter" ? posix.join(posix.dirname(posix.dirname(n.id)), RAW_TEXT) : null;
      return {
        id: n.id, title: n.title, label: shortLabel(note), bucket: n.bucket, container: n.container, raw: n.raw,
        rawRole: note.rawRole, concept: note.concept, book: book && byPath.has(book) ? book : null,
        chapterCount: note.rawRole === "index" ? notes.filter(c => c.rawRole === "chapter" && posix.dirname(posix.dirname(c.path)) === posix.dirname(n.id)).length : null,
        stage: books.get(n.id)?.stage ?? null,
        readOn: books.get(n.id)?.steps.readOn ?? null,
        chaptersComplete: books.get(n.id)?.steps.chaptersComplete ?? null,
        notesFrom: n.raw && note.rawRole !== "chapter" ? cited.get(n.id)?.notes ?? [] : null,
        conceptsFrom: n.raw && note.rawRole !== "chapter" ? cited.get(n.id)?.concepts ?? [] : null,
        distill: (c => (c ? { state: c.state, summary: c.summary, pages: c.pages } : null))(chapters.get(n.id)),
        mastery: history.get(n.id)!.mastery, nextReview: history.get(n.id)!.nextReview,
      };
    }),
    edges: g.edges,
    unresolved: g.unresolved.length,
  };
  const abs = join(vault.root, GRAPH_FILE);
  await mkdir(join(vault.root, COACH_ROOT), { recursive: true });
  await writeFile(`${abs}.tmp`, `${JSON.stringify(graph, null, 2)}\n`);
  await rename(`${abs}.tmp`, abs);
  return graph;
}

const ASSETS = new URL("../assets/", import.meta.url);
const asset = (name: string) => readFileSync(new URL(name, ASSETS));

const HEADERS = {
  "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
};

export interface BookPage {
  note: string;
  title: string;
  page: number;
  /** The page as it stands in the chapter note: the author's text with the user's marks and summary. */
  text: string;
}

/**
 * One page of a converted book's chapter, or null for anything else: a note that is not
 * a chapter, a page it does not hold, or a path outside the vault.
 */
export async function bookPage(vault: Vault, path: string, page: number): Promise<BookPage | null> {
  if (!Number.isInteger(page) || page < 1) return null;
  const note = await vault.note(path);
  if (!note || note.rawRole !== "chapter") return null;
  const section = pagesOf(note.body, String(page));
  return section === null ? null : { note: note.path, title: note.title, page, text: section.replace(/^## Page \d+[ \t]*\n+/, "").trimEnd() };
}

/**
 * The vault view server. Answers `/`, `/vault-view.js`, `/graph.json` and
 * `/page.json?note=<chapter>&page=<N>`; everything else is 404.
 */
export function createVaultViewServer(vault: Vault): Server {
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = url.pathname;
    const send = (status: number, type: string, body: string | Buffer) => {
      res.writeHead(status, { ...HEADERS, "Content-Type": type });
      res.end(body);
    };
    if (req.method !== "GET" && req.method !== "HEAD") return send(405, "text/plain; charset=utf-8", "Method not allowed");
    try {
      if (path === "/" || path === "/index.html") return send(200, "text/html; charset=utf-8", asset("vault-view.html"));
      if (path === "/vault-view.js") return send(200, "text/javascript; charset=utf-8", asset("vault-view.js"));
      if (path === "/graph.json") return send(200, "application/json; charset=utf-8", JSON.stringify(await writeViewGraph(vault)));
      if (path === "/page.json") {
        const page = await bookPage(vault, url.searchParams.get("note") ?? "", Number(url.searchParams.get("page")));
        return page ? send(200, "application/json; charset=utf-8", JSON.stringify(page)) : send(404, "text/plain; charset=utf-8", "Not found");
      }
      return send(404, "text/plain; charset=utf-8", "Not found");
    } catch (err) {
      return send(500, "text/plain; charset=utf-8", err instanceof Error ? err.message : String(err));
    }
  });
}

/** Listen on loopback only; resolves to the URL to open. */
export function listenOnLoopback(server: Server, port: number): Promise<string> {
  return new Promise((resolveUrl, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const addr = server.address();
      resolveUrl(`http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : port}/`);
    });
  });
}
