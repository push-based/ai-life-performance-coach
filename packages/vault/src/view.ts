/**
 * The vault view (ADR-KI-0058 Decision 11): a loopback HTTP server rooted at the vault,
 * separate from this repository's view server. It serves the page, its script, the
 * graph, regenerated into `Coach/graph.json` on every request, and one page of a
 * converted book's chapter (ADR-KI-0061), to read and distil there: the user can bold,
 * highlight and summarise from the page, which writes the chapter note. Any other note in
 * the graph is served read-only to read in the view (ADR-KI-0061 Decision 14); sessions and the graph
 * file are not notes and are never served. Only chapters are written, and the page may
 * load nothing from off the machine (Content-Security-Policy), so it works offline and
 * leaks nothing.
 */

import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { join, posix } from "node:path";
import { COACH_ROOT, type ParaBucket } from "./para.js";
import { buildVaultGraph } from "./graph.js";
import type { Mastery } from "./mastery.js";
import type { Vault } from "./vault.js";
import type { VaultNote } from "./scan.js";
import { RAW_TEXT } from "./convert.js";
import { bookProgress, citations, type MarkOp, type ChapterState, type PageMark, type ReadingStage } from "./distill.js";

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
  // A tmp file per write: overlapping requests must not truncate each other's file.
  const tmp = `${abs}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(graph, null, 2)}\n`);
  await rename(tmp, abs);
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
  /** The chapter's summary, written by the user, or null. */
  chapterSummary: string | null;
}

/**
 * One page of a converted book's chapter, or null for anything else: a note that is not
 * a chapter, a page it does not hold, or a path outside the vault.
 */
export async function bookPage(vault: Vault, path: string, page: number): Promise<BookPage | null> {
  return vault.pageText(path, page);
}

export interface NoteBody {
  note: string;
  title: string;
  /** The note's markdown without its frontmatter, for the view to render as text. */
  text: string;
}

/**
 * Any note the graph shows, read-only (ADR-KI-0061 Decision 14), or null for a path that is not one:
 * outside the vault, under `Coach/`, or not a markdown note.
 */
export async function noteBody(vault: Vault, path: string): Promise<NoteBody | null> {
  const note = await vault.note(path);
  return note ? { note: note.path, title: note.title, text: note.body } : null;
}

const MAX_BODY = 64 * 1024;

function readJson(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  return new Promise(resolveBody => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => { size += c.length; if (size <= MAX_BODY) chunks.push(c); });
    req.on("end", () => {
      if (size > MAX_BODY) return resolveBody(null);
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
        resolveBody(v && typeof v === "object" && !Array.isArray(v) ? v : null);
      } catch { resolveBody(null); }
    });
    req.on("error", () => resolveBody(null));
  });
}

export interface ViewServerOptions {
  /** The write token; random per server unless a test fixes it. */
  token?: string;
}

/**
 * The vault view server. Answers `/`, `/vault-view.js`, `/graph.json`,
 * `/page.json?note=<chapter>&page=<N>`, `/note.json?note=<note>`, the read-only plans page
 * `/plans` with `/plans-view.js` and `/plans.json?span=<period>&by=<level>` (ADR-KI-0063),
 * and two writes from the page itself (ADR-KI-0061
 * Decision 10): `POST /api/mark` and `POST /api/summary`; everything else is 404.
 *
 * Every request must name this server's own loopback address in its Host header, which
 * stops another site reaching it by rebinding a domain name to 127.0.0.1. A write must
 * also carry the token embedded in the page this server served, in a custom header,
 * with a JSON body: a page on another origin can neither read the token nor send that
 * header without a preflight this server never grants.
 */
export function createVaultViewServer(vault: Vault, opts: ViewServerOptions = {}): Server {
  const token = opts.token ?? randomBytes(24).toString("hex");
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = url.pathname;
    const send = (status: number, type: string, body: string | Buffer) => {
      res.writeHead(status, { ...HEADERS, "Content-Type": type });
      res.end(body);
    };
    const json = (status: number, value: unknown) => send(status, "application/json; charset=utf-8", JSON.stringify(value));
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;
    const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    if (!hosts.has(String(req.headers.host ?? ""))) return send(403, "text/plain; charset=utf-8", "Forbidden");
    try {
      if (req.method === "POST" && (path === "/api/mark" || path === "/api/summary")) {
        const origin = req.headers.origin;
        if (origin !== undefined && !hosts.has(origin.replace(/^http:\/\//, ""))) return send(403, "text/plain; charset=utf-8", "Forbidden");
        if (req.headers["x-vault-token"] !== token) return send(403, "text/plain; charset=utf-8", "Forbidden");
        if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) return send(415, "text/plain; charset=utf-8", "JSON only");
        const body = await readJson(req);
        if (!body) return json(400, { error: "a JSON object is required" });
        const note = String(body.note ?? "");
        const result = path === "/api/mark"
          ? await vault.markPage(note, Number(body.page), Number(body.start), Number(body.end), body.mark as MarkOp, String(body.base ?? ""))
          : await vault.setSummary(note, body.page === null || body.page === undefined ? null : Number(body.page), body.text as string, typeof body.base === "string" ? body.base : undefined);
        return result.ok ? json(200, { text: result.text }) : json(result.status, { error: result.error, ...(result.text !== undefined ? { text: result.text } : {}) });
      }
      if (req.method !== "GET" && req.method !== "HEAD") return send(405, "text/plain; charset=utf-8", "Method not allowed");
      if (path === "/" || path === "/index.html") {
        const page = asset("vault-view.html").toString("utf-8").replace("</head>", `  <meta name="vault-token" content="${token}">\n</head>`);
        return send(200, "text/html; charset=utf-8", page);
      }
      if (path === "/vault-view.js") return send(200, "text/javascript; charset=utf-8", asset("vault-view.js"));
      if (path === "/plans") return send(200, "text/html; charset=utf-8", asset("plans-view.html"));
      if (path === "/plans-view.js") return send(200, "text/javascript; charset=utf-8", asset("plans-view.js"));
      if (path === "/plans.json") {
        const view = await vault.plansView(url.searchParams.get("span") ?? undefined, url.searchParams.get("by") ?? undefined);
        return "error" in view ? json(400, view) : json(200, { ...view, vaultName: posix.basename(vault.root.split("\\").join("/")) });
      }
      if (path === "/graph.json") return json(200, await writeViewGraph(vault));
      if (path === "/note.json") {
        const note = await noteBody(vault, url.searchParams.get("note") ?? "");
        return note ? json(200, note) : send(404, "text/plain; charset=utf-8", "Not found");
      }
      if (path === "/page.json") {
        const page = await bookPage(vault, url.searchParams.get("note") ?? "", Number(url.searchParams.get("page")));
        return page ? json(200, page) : send(404, "text/plain; charset=utf-8", "Not found");
      }
      return send(404, "text/plain; charset=utf-8", "Not found");
    } catch (err) {
      return send(500, "text/plain; charset=utf-8", err instanceof Error ? err.message : String(err));
    }
  });
  return server;
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
