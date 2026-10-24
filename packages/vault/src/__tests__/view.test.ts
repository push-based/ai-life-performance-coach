import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createVault, type Vault } from "../vault.js";
import { createVaultViewServer, listenOnLoopback, writeViewGraph, shortLabel, GRAPH_FILE } from "../view.js";

let dir: string;
let vault: Vault;
let server: Server;
let base: string;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

function get(path: string, method = "GET"): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(new URL(path, base), { method }, res => {
      let body = "";
      res.on("data", c => (body += c));
      res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "vault-view-"));
  put("3.Resources/TS/Event loop.md", "Private body line. [[Promises]]\n");
  put("3.Resources/TS/Promises.md", "Promises.\n");
  put("4.Archive/old notes/Old.md", "Old.\n");
  vault = createVault(dir);
  await vault.recordSession({ tier: 1, items: [{ note: "3.Resources/TS/Event loop.md", challenge: "c", answer: "a", verdict: "pass", next_review: "2026-11-01" }] }, true);
  server = createVaultViewServer(vault);
  base = await listenOnLoopback(server, 0);
});
afterEach(async () => {
  await new Promise(r => server.close(r));
  rmSync(dir, { recursive: true, force: true });
});

describe("vault view server", () => {
  it("listens on loopback only", () => {
    expect(base).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    expect((server.address() as { address: string }).address).toBe("127.0.0.1");
  });

  it("serves the page and its script with a CSP that forbids anything off the machine", async () => {
    const page = await get("/");
    expect(page.status).toBe(200);
    expect(page.body).toContain('<script src="vault-view.js">');
    expect(page.headers["content-security-policy"]).toMatch(/default-src 'none'; script-src 'self';.*connect-src 'self'/);
    expect(page.headers["referrer-policy"]).toBe("no-referrer");
    const script = await get("/vault-view.js");
    expect(script.status).toBe(200);
    expect(script.headers["content-type"]).toMatch(/javascript/);
  });

  it("serves the graph with PARA buckets and mastery, written to Coach/graph.json, and no note body", async () => {
    const res = await get("/graph.json");
    expect(res.status).toBe(200);
    const graph = JSON.parse(res.body);
    expect(graph.vaultName).toMatch(/^vault-view-/);
    expect(graph.nodes.map((n: { id: string; bucket: string; mastery: string }) => [n.id, n.bucket, n.mastery])).toEqual([
      ["3.Resources/TS/Event loop.md", "resources", "tier1_passed"],
      ["3.Resources/TS/Promises.md", "resources", "unsparred"],
      ["4.Archive/old notes/Old.md", "archive", "unsparred"],
    ]);
    expect(graph.edges).toEqual([{ source: "3.Resources/TS/Event loop.md", target: "3.Resources/TS/Promises.md", kind: "wikilink" }]);
    expect(res.body).not.toContain("Private body line");
    expect(JSON.parse(readFileSync(join(dir, GRAPH_FILE), "utf-8")).nodes).toHaveLength(3);
    expect(existsSync(join(dir, `${GRAPH_FILE}.tmp`))).toBe(false);
  });

  it("answers nothing else: no notes, no sessions, no traversal, no writes", async () => {
    for (const path of ["/3.Resources/TS/Event%20loop.md", "/Coach/graph.json", "/Coach/sessions/", "/..%2f..%2fetc%2fpasswd", "/graph.json/../vault-view.js.map", "/favicon.ico"]) {
      expect((await get(path)).status, path).toBe(404);
    }
    expect((await get("/graph.json", "POST")).status).toBe(405);
  });

  it("serves one page of a book's chapter, with the user's marks, and no other note body", async () => {
    const ch = "3.Resources/0.Raw/Books/A/B/chapters/01 One.md";
    put(ch, '---\ntitle: "Chapter 1: One"\nraw_role: "chapter"\npages: "4-5"\n---\n# One\n\n## Page 4\n\n> [!summary]\n> Mine.\n\nThe **author\'s** ==text==.\n\n## Page 5\n\nNext page.\n');
    const q = (note: string, page: number | string) => get(`/page.json?note=${encodeURIComponent(note)}&page=${page}`);
    const res = await q(ch, 4);
    expect(res.status).toBe(200);
    expect(res.headers["content-security-policy"]).toMatch(/default-src 'none'/);
    expect(JSON.parse(res.body)).toEqual({ note: ch, title: "Chapter 1: One", page: 4, text: "> [!summary]\n> Mine.\n\nThe **author's** ==text==." });
    for (const [note, page] of [[ch, 6], [ch, "x"], [ch, 0], ["3.Resources/TS/Event loop.md", 1], ["../../etc/passwd", 1], ["Coach/graph.json", 1]] as const) {
      expect((await q(note, page)).status, `${note} ${page}`).toBe(404);
    }
    expect((await get("/page.json")).status).toBe(404);
  });

  it("regenerates the graph on every load", async () => {
    expect(JSON.parse((await get("/graph.json")).body).nodes).toHaveLength(3);
    put("0.Inbox/New.md", "new");
    expect(JSON.parse((await get("/graph.json")).body).nodes).toHaveLength(4);
  });
});

describe("view assets", () => {
  it("reference nothing off the machine", () => {
    for (const file of ["vault-view.html", "vault-view.js"]) {
      const text = readFileSync(new URL(`../../assets/${file}`, import.meta.url), "utf-8");
      const urls = (text.match(/\b(?:https?:)?\/\/[\w.-]+\.[a-z]{2,}[^\s"'`)]*/gi) ?? []).filter(u => u !== "http://www.w3.org/2000/svg");
      expect(urls, file).toEqual([]);
    }
  });

  it("writeViewGraph replaces the previous file", async () => {
    put(GRAPH_FILE, "stale");
    await writeViewGraph(vault, new Date("2026-10-24T00:00:00Z"));
    expect(JSON.parse(readFileSync(join(dir, GRAPH_FILE), "utf-8")).generatedAt).toBe("2026-10-24T00:00:00.000Z");
  });
});

describe("graph labels and book folding", () => {
  const chapter = (title: string, section?: string) => ({ title, rawRole: "chapter" as const, frontmatter: section ? { section } : {} });

  it("shortens chapter titles to a number and their first words", () => {
    expect(shortLabel(chapter("Chapter 4: Capture—Keep What Resonates (1 of 3)", "1 of 3"))).toBe("4. Capture (1/3)");
    expect(shortLabel(chapter("Chapter 2: What Is a Second Brain? (2 of 2)", "2 of 2"))).toBe("2. What Is a Second Brain? (2/2)");
    expect(shortLabel(chapter("Introduction: The Promise of a Second Brain"))).toBe("Introduction");
    expect(shortLabel(chapter("Chapter 9: The Essential Habits of Digital Organizers (1 of 3)", "1 of 3"))).toBe("9. The Essential Habits of… (1/3)");
    expect(shortLabel({ title: "A note with a rather long title that keeps going", rawRole: null, frontmatter: {} })).toBe("A note with a rather long t…");
  });

  it("marks concept notes", async () => {
    put("3.Resources/Concepts/Idea.md", "---\ntitle: \"Idea\"\ntype: \"concept\"\n---\n");
    expect((await writeViewGraph(vault)).nodes.find(n => n.id === "3.Resources/Concepts/Idea.md")).toMatchObject({ concept: true, label: "Idea" });
  });

  it("ties each chapter to its book's index and counts a book's chapters", async () => {
    const home = "3.Resources/0.Raw/Books/A/B";
    put(`${home}/text.md`, "---\ntitle: \"B\"\nraw_role: \"index\"\n---\n# B\n");
    put(`${home}/chapters/01 One.md`, "---\ntitle: \"Chapter 1: One\"\nraw_role: \"chapter\"\npages: \"1-2\"\n---\n");
    put(`${home}/chapters/02 Two.md`, "---\ntitle: \"Chapter 2: Two (1 of 2)\"\nraw_role: \"chapter\"\nsection: \"1 of 2\"\npages: \"3-4\"\n---\n");
    const graph = await writeViewGraph(vault);
    const node = (id: string) => graph.nodes.find(n => n.id === id)!;
    expect(node(`${home}/text.md`)).toMatchObject({ rawRole: "index", chapterCount: 2, book: null, label: "B" });
    expect(node(`${home}/chapters/02 Two.md`)).toMatchObject({ rawRole: "chapter", book: `${home}/text.md`, label: "2. Two (1/2)" });
    expect(node("3.Resources/TS/Promises.md")).toMatchObject({ rawRole: null, book: null, chapterCount: null, concept: false });
  });
});
