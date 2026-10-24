/**
 * The vault view (ADR-KI-0058 Decision 11): a loopback HTTP server rooted at the vault,
 * separate from this repository's view server. It serves exactly three things: the
 * page, its script, and the graph, regenerated into `Coach/graph.json` on every
 * request. Note bodies are never served, and the page may load nothing from off the
 * machine (Content-Security-Policy), so it works offline and leaks nothing.
 */

import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { join, posix } from "node:path";
import { COACH_ROOT, type ParaBucket } from "./para.js";
import { buildVaultGraph } from "./graph.js";
import type { Mastery } from "./mastery.js";
import type { Vault } from "./vault.js";

export const GRAPH_FILE = posix.join(COACH_ROOT, "graph.json");

export interface VaultViewGraph {
  generatedAt: string;
  vaultName: string;
  nodes: { id: string; title: string; bucket: ParaBucket | null; container: string | null; mastery: Mastery; nextReview: string | null }[];
  edges: { source: string; target: string; kind: "wikilink" | "markdown" }[];
  unresolved: number;
}

/** Build the view graph from the vault and write it to `Coach/graph.json`, replacing the previous one. */
export async function writeViewGraph(vault: Vault, now: Date = new Date()): Promise<VaultViewGraph> {
  const { notes } = await vault.notesWithHistory();
  const history = new Map(notes.map(n => [n.path, n.history]));
  const g = buildVaultGraph(notes);
  const graph: VaultViewGraph = {
    generatedAt: now.toISOString(),
    vaultName: posix.basename(vault.root.split("\\").join("/")),
    nodes: g.nodes.map(n => ({
      id: n.id, title: n.title, bucket: n.bucket, container: n.container,
      mastery: history.get(n.id)!.mastery, nextReview: history.get(n.id)!.nextReview,
    })),
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

/** The vault view server. Answers `/`, `/vault-view.js` and `/graph.json`; everything else is 404. */
export function createVaultViewServer(vault: Vault): Server {
  return createServer(async (req, res) => {
    const path = (req.url ?? "/").split("?")[0];
    const send = (status: number, type: string, body: string | Buffer) => {
      res.writeHead(status, { ...HEADERS, "Content-Type": type });
      res.end(body);
    };
    if (req.method !== "GET" && req.method !== "HEAD") return send(405, "text/plain; charset=utf-8", "Method not allowed");
    try {
      if (path === "/" || path === "/index.html") return send(200, "text/html; charset=utf-8", asset("vault-view.html"));
      if (path === "/vault-view.js") return send(200, "text/javascript; charset=utf-8", asset("vault-view.js"));
      if (path === "/graph.json") return send(200, "application/json; charset=utf-8", JSON.stringify(await writeViewGraph(vault)));
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
