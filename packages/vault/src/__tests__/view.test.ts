import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

function get(path: string, method = "GET", headers: Record<string, string> = {}, payload?: string): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(new URL(path, base), { method, headers }, res => {
      let body = "";
      res.on("data", c => (body += c));
      res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end(payload);
  });
}
const TOKEN = "test-token";
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  get(path, "POST", { "content-type": "application/json", "x-vault-token": TOKEN, ...headers }, JSON.stringify(body));

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "vault-view-"));
  put("3.Resources/TS/Event loop.md", "Private body line. [[Promises]]\n");
  put("3.Resources/TS/Promises.md", "Promises.\n");
  put("4.Archive/old notes/Old.md", "Old.\n");
  vault = createVault(dir);
  await vault.recordSession({ tier: 1, items: [{ note: "3.Resources/TS/Event loop.md", challenge: "c", answer: "a", verdict: "pass", next_review: "2026-11-01" }] }, true);
  server = createVaultViewServer(vault, { token: TOKEN });
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
    expect(JSON.parse(res.body)).toEqual({ note: ch, title: "Chapter 1: One", page: 4, text: "> [!summary]\n> Mine.\n\nThe **author's** ==text==.", chapterSummary: null });
    for (const [note, page] of [[ch, 6], [ch, "x"], [ch, 0], ["3.Resources/TS/Event loop.md", 1], ["../../etc/passwd", 1], ["Coach/graph.json", 1]] as const) {
      expect((await q(note, page)).status, `${note} ${page}`).toBe(404);
    }
    expect((await get("/page.json")).status).toBe(404);
  });

  it("serves any note in the graph read-only, without its frontmatter, and nothing outside it", async () => {
    put("3.Resources/Concepts/Idea.md", '---\ncoach_id: "c-1"\ntype: "concept"\n---\n# Idea\n\nMy **own** words.\n');
    const q = (note: string) => get(`/note.json?note=${encodeURIComponent(note)}`);
    const own = await q("3.Resources/TS/Event loop.md");
    expect(own.status).toBe(200);
    expect(own.headers["content-security-policy"]).toMatch(/default-src 'none'/);
    expect(JSON.parse(own.body)).toEqual({ note: "3.Resources/TS/Event loop.md", title: "Event loop", text: "Private body line. [[Promises]]\n" });
    expect(JSON.parse((await q("3.Resources/Concepts/Idea.md")).body).text).toBe("# Idea\n\nMy **own** words.\n");
    const session = `Coach/sessions/${readdirSync(join(dir, "Coach/sessions"))[0]}`;
    for (const note of [session, "Coach/graph.json", "../../etc/passwd", "3.Resources/TS/Missing.md", "3.Resources/TS", ""]) {
      expect((await q(note)).status, note).toBe(404);
    }
    expect((await get("/note.json", "POST")).status).toBe(405);
  });

  describe("editing a chapter from the page", () => {
    const ch = "3.Resources/0.Raw/Books/A/B/chapters/01 One.md";
    const content = '---\ntitle: "Chapter 1: One"\nraw_role: "chapter"\npages: "4-5"\n---\n# One\n\n## Page 4\n\nKeep what resonates with you.\nCapture less.\n\n## Page 5\n\nNext page.\n';
    beforeEach(() => put(ch, content));
    const file = () => readFileSync(join(dir, ch), "utf-8");

    it("embeds the write token in the page it serves", async () => {
      expect((await get("/")).body).toContain(`<meta name="vault-token" content="${TOKEN}">`);
    });

    it("bolds and highlights a selected range, writing the chapter note", async () => {
      const base = "Keep what resonates with you.\nCapture less.";
      const bold = await post("/api/mark", { note: ch, page: 4, start: 5, end: 28, mark: "bold", base });
      expect(bold.status).toBe(200);
      expect(JSON.parse(bold.body).text).toBe("Keep **what resonates with you**.\nCapture less.");
      const high = await post("/api/mark", { note: ch, page: 4, start: 12, end: 21, mark: "highlight", base: "Keep **what resonates with you**.\nCapture less." });
      expect(JSON.parse(high.body).text).toBe("Keep **what ==resonates== with you**.\nCapture less.");
      expect(file()).toContain("## Page 4\n\nKeep **what ==resonates== with you**.\nCapture less.\n\n## Page 5\n\nNext page.\n");
    });

    it("refuses a stale page with the current text, so the editor can show it again", async () => {
      const r = await post("/api/mark", { note: ch, page: 4, start: 0, end: 4, mark: "bold", base: "something older" });
      expect(r.status).toBe(409);
      expect(JSON.parse(r.body).text).toBe("Keep what resonates with you.\nCapture less.");
      expect(file()).toBe(content);
    });

    it("sets, replaces and removes page and chapter summaries", async () => {
      expect((await post("/api/summary", { note: ch, page: 4, text: "Mine." })).status).toBe(200);
      expect((await post("/api/summary", { note: ch, page: 4, text: "Mine, better." })).status).toBe(200);
      expect((await post("/api/summary", { note: ch, page: null, text: "The chapter." })).status).toBe(200);
      expect(file()).toBe(content
        .replace("# One\n\n## Page 4\n\n", "# One\n\n> [!summary]\n> The chapter.\n\n## Page 4\n\n> [!summary]\n> Mine, better.\n\n"));
      const page = JSON.parse((await get(`/page.json?note=${encodeURIComponent(ch)}&page=4`)).body);
      expect(page).toMatchObject({ chapterSummary: "The chapter.", text: "> [!summary]\n> Mine, better.\n\nKeep what resonates with you.\nCapture less." });
      expect((await post("/api/summary", { note: ch, page: 4, text: "" })).status).toBe(200);
      expect((await post("/api/summary", { note: ch, page: null, text: "" })).status).toBe(200);
      expect(file()).toBe(content);
    });

    it("refuses writes without the token, from another origin, to another host, and to notes that are not chapters", async () => {
      const ok = { note: ch, page: 4, start: 0, end: 4, mark: "bold", base: "Keep what resonates with you.\nCapture less." };
      expect((await post("/api/mark", ok, { "x-vault-token": "wrong" })).status).toBe(403);
      expect((await get("/api/mark", "POST", { "content-type": "application/json" }, JSON.stringify(ok))).status).toBe(403);
      expect((await post("/api/mark", ok, { origin: "http://evil.example" })).status).toBe(403);
      expect((await post("/api/mark", ok, { host: "evil.example" })).status).toBe(403);
      expect((await get("/graph.json", "GET", { host: "rebound.example:4747" })).status).toBe(403);
      expect((await post("/api/mark", ok, { "content-type": "text/plain" })).status).toBe(415);
      expect((await post("/api/mark", { ...ok, note: "3.Resources/TS/Promises.md" })).status).toBe(404);
      expect((await post("/api/summary", { note: "3.Resources/TS/Promises.md", page: null, text: "x" })).status).toBe(404);
      expect(file()).toBe(content);
      expect(readFileSync(join(dir, "3.Resources/TS/Promises.md"), "utf-8")).toBe("Promises.\n");
    });
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
    expect(shortLabel(chapter("Chapter 4: Capture—Keep What Matters (1 of 3)", "1 of 3"))).toBe("4. Capture (1/3)");
    expect(shortLabel(chapter("Chapter 2: What Is a Note? (2 of 2)", "2 of 2"))).toBe("2. What Is a Note? (2/2)");
    expect(shortLabel(chapter("Introduction: The Promise of Notes"))).toBe("Introduction");
    expect(shortLabel(chapter("Chapter 9: The Essential Habits of Careful Readers (1 of 3)", "1 of 3"))).toBe("9. The Essential Habits of… (1/3)");
    expect(shortLabel({ title: "A note with a rather long title that keeps going", rawRole: null, frontmatter: {} })).toBe("A note with a rather long t…");
  });

  it("marks concept notes", async () => {
    put("3.Resources/Concepts/Idea.md", "---\ntitle: \"Idea\"\ntype: \"concept\"\n---\n");
    expect((await writeViewGraph(vault)).nodes.find(n => n.id === "3.Resources/Concepts/Idea.md")).toMatchObject({ concept: true, label: "Idea" });
  });

  it("counts the notes and concept notes made from each raw source", async () => {
    const home = "3.Resources/0.Raw/Books/A/B";
    put(`${home}/text.md`, "---\ntitle: \"B\"\naliases: [\"B\"]\nraw_role: \"index\"\n---\n# B\n");
    put(`${home}/chapters/01 One.md`, "---\ntitle: \"Chapter 1: One\"\nraw_role: \"chapter\"\npages: \"1-2\"\n---\n");
    put("0.Inbox/Reading B.md", "Notes on [[B]].\n");
    put("3.Resources/Concepts/Idea.md", `---\ntype: "concept"\n---\nFrom [[${home}/chapters/01 One|ch 1]].\n`);
    const graph = await writeViewGraph(vault);
    const node = (id: string) => graph.nodes.find(n => n.id === id)!;
    expect(node(`${home}/text.md`)).toMatchObject({ notesFrom: ["0.Inbox/Reading B.md"], conceptsFrom: ["3.Resources/Concepts/Idea.md"] });
    expect(node(`${home}/chapters/01 One.md`)).toMatchObject({ notesFrom: null, conceptsFrom: null });
    expect(node("3.Resources/TS/Promises.md")).toMatchObject({ notesFrom: null, conceptsFrom: null });
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
