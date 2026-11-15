import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createVault, type Vault } from "../vault.js";
import { createVaultViewServer, listenOnLoopback } from "../view.js";
import { compareStructure } from "../climb.js";
import { parseSession } from "../sessions.js";

let dir: string;
let vault: Vault;
let server: Server;
let base: string;
let ticks: number;

const TOKEN = "test-token";
const BOOK = "Design System Architecture";
const CH = `3.Resources/0.Raw/Books/Design Team/${BOOK}/chapters/01 Layers.md`;
const C = (t: string) => `3.Resources/Concepts/${t}.md`;
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("rest of a png")]);

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

function call(path: string, method = "GET", headers: Record<string, string> = {}, payload?: string): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(new URL(path, base), { method, headers }, res => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body: Buffer.concat(chunks).toString("utf-8") }));
    });
    req.on("error", reject);
    req.end(payload);
  });
}
const post = async (path: string, body: unknown, headers: Record<string, string> = {}) => {
  const r = await call(path, "POST", { "content-type": "application/json", "x-vault-token": TOKEN, ...headers }, JSON.stringify(body));
  let data: Record<string, unknown> & { [k: string]: any } = {};
  try { data = JSON.parse(r.body); } catch { data = { text: r.body }; }
  return { status: r.status, data };
};
const getJson = async (path: string) => JSON.parse((await call(path)).body);

const LAYERS = {
  book: BOOK,
  groups: [
    { name: "Tokens", concepts: [C("Design tokens")] },
    { name: "Primitives", concepts: [C("Primitives")] },
    { name: "Components", concepts: [C("Components")] },
    { name: "Patterns", concepts: [C("Patterns")] },
  ],
  builds_on: [{ from: "Primitives", to: "Tokens" }, { from: "Components", to: "Primitives" }, { from: "Patterns", to: "Components" }],
};

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "vault-climb-view-"));
  const pages = ["Design tokens are named values for colour and spacing.", "Primitives are the smallest building blocks of the system.", "Components are composed from primitives in every case.", "Patterns combine components into a recurring solution."];
  put(`3.Resources/0.Raw/Books/Design Team/${BOOK}/text.md`, `---\ntitle: "${BOOK}"\nraw_role: "index"\n---\n# ${BOOK}\n`);
  put(CH, ["---", 'title: "Layers"', 'raw_role: "chapter"', `book: "${BOOK}"`, 'pages: "1-4"', "---", "", "# Layers", "", ...pages.flatMap((p, i) => [`## Page ${i + 1}`, "", p, ""])].join("\n"));
  ticks = 0;
  const now = () => new Date(Date.parse("2026-11-09T09:00:00.000Z") + 1000 * ticks++);
  vault = createVault(dir, { now, newSessionId: () => `s-${ticks}`, newCoachId: () => `c-${ticks}` });
  for (const [i, t] of ["Design tokens", "Primitives", "Components", "Patterns"].entries()) {
    const r = await vault.createConcept({ title: t, summary: `${t} in my words.`, core_assertions: [`${t} matter.`], passages: [{ note: CH, quote: pages[i].split(" ").slice(0, 4).join(" "), pages: String(i + 1) }] }, true);
    expect(r.errors).toEqual([]);
  }
  server = createVaultViewServer(vault, { token: TOKEN, now });
  base = await listenOnLoopback(server, 0);
});
afterEach(async () => {
  await new Promise(r => server.close(r));
  rmSync(dir, { recursive: true, force: true });
});

describe("the climb page", () => {
  it("serves the page with its token and the climb of every concept", async () => {
    const page = await call("/climb");
    expect(page.status).toBe(200);
    expect(page.body).toContain('<meta name="vault-token" content="test-token">');
    expect(page.body).toContain('<script src="/climb-view.js">');
    expect(String(page.headers["content-security-policy"])).toContain("default-src 'none'");
    expect((await call("/climb-view.js")).status).toBe(200);
    expect(page.body).toContain('<script type="module" src="/climb-board/main.js">');
    expect(page.body).toContain('<link rel="stylesheet" href="/climb-board/styles.css">');
    const board = await call("/climb-board/main.js");
    expect(board.status).toBe(200);
    expect(board.headers["content-type"]).toBe("text/javascript; charset=utf-8");
    expect(board.body).toContain("climbBoard");
    expect(board.body).not.toMatch(/\beval\(|new Function\(/);
    expect((await call("/climb-board/styles.css")).status).toBe(200);
    const data = await getJson("/climb.json");
    expect(data.concepts.map((c: { title: string }) => c.title).sort()).toEqual(["Components", "Design tokens", "Patterns", "Primitives"]);
    expect(data.books).toEqual([{ book: BOOK, kind: "book", concepts: expect.any(Array), candidates: expect.any(Array), structure: null }]);
  });

  it("writes a drawn structure only after a preview, with the preview's versions", async () => {
    const preview = await post("/api/structure", LAYERS);
    expect(preview.status).toBe(200);
    expect(preview.data.executed).toBe(false);
    expect(existsSync(join(dir, preview.data.path))).toBe(false);
    const written = await post("/api/structure", { ...LAYERS, execute: true, versions: preview.data.versions });
    expect(written.data.executed).toBe(true);
    expect((await getJson(`/structure.json?book=${encodeURIComponent(BOOK)}`)).buildsOn).toHaveLength(3);
    const cyclic = await post("/api/structure", { ...LAYERS, builds_on: [...LAYERS.builds_on, { from: "Tokens", to: "Patterns" }] });
    expect(cyclic.status).toBe(400);
    expect(cyclic.data.errors.join()).toMatch(/cycle/);
  });

  it("saves a drawing from memory before revealing the structure, and records it as a Generate attempt", async () => {
    expect((await post("/api/reveal", LAYERS)).status).toBe(404);
    const thin = await post("/api/reveal", { book: BOOK, groups: [{ name: "Values", concepts: [C("Design tokens")] }], builds_on: [] });
    expect(thin.status).toBe(400);
    expect(thin.data.error).toMatch(/at least 2 named groups/);
    expect(thin.data.structure).toBeUndefined();
    const s = await post("/api/structure", LAYERS);
    await post("/api/structure", { ...LAYERS, execute: true, versions: s.data.versions });

    const drawn = { book: BOOK, groups: [{ name: "Values", concepts: [C("Design tokens")] }, { name: "Parts", concepts: [C("Primitives"), C("Components")] }, { name: "Recipes", concepts: [C("Patterns")] }], builds_on: [{ from: "Values", to: "Parts" }] };
    const reveal = await post("/api/reveal", drawn);
    expect(reveal.status).toBe(200);
    expect(Date.parse(reveal.data.attempted_at)).toBeLessThan(Date.parse(reveal.data.revealed_at));
    const marks = Object.fromEntries(reveal.data.marks.map((m: { assertion: string; mark: string }) => [m.assertion, m.mark]));
    expect(marks).toEqual({
      "group: Tokens": "got it", "group: Primitives": "wrong", "group: Components": "wrong", "group: Patterns": "got it",
      "Primitives → Tokens": "wrong", "Components → Primitives": "missed", "Patterns → Components": "missed",
    });

    const asSuggested = reveal.data.marks.map((m: { assertion: string; mark: string }) => ({ assertion: m.assertion, mark: m.mark }));
    const refused = await post("/api/generate", { id: reveal.data.id, marks: asSuggested });
    expect(refused.data.errors.join()).toMatch(/marked wrong and needs a correction/);

    const corrected = asSuggested.map((m: { assertion: string; mark: string }) => (m.mark === "wrong" ? { ...m, correction: "primitives sit on tokens, and components on primitives" } : m));
    const preview = await post("/api/generate", { id: reveal.data.id, marks: corrected });
    expect(preview.data.errors).toEqual([]);
    expect(preview.data.executed).toBe(false);
    const done = await post("/api/generate", { id: reveal.data.id, marks: corrected, execute: true });
    expect(done.data.executed).toBe(true);
    const session = parseSession(readFileSync(join(dir, done.data.sessionFile), "utf-8"));
    expect(session).toMatchObject({ kind: "generate", items: [{ coach_id: null, note_path: s.data.path }] });
    expect(session.items[0].answer).toContain("Parts: Primitives, Components");
    const tokens = (await getJson("/climb.json")).concepts.find((c: { title: string }) => c.title === "Design tokens");
    expect(tokens.steps.generate).toEqual({ date: "2026-11-09", evidence: session.session_id });
    expect((await post("/api/generate", { id: reveal.data.id, marks: corrected, execute: true })).status).toBe(404);
  });

  it("saves a PNG sketch under Concepts/Sketches after a preview, never over another, and serves it back", async () => {
    const png = PNG.toString("base64");
    const preview = await post("/api/sketch", { target: "Design tokens", png });
    expect(preview.data).toMatchObject({ errors: [], executed: false, path: "3.Resources/Concepts/Sketches/Design tokens 2026-11-09.png" });
    expect((await post("/api/sketch", { target: "Design tokens", png, execute: true })).data.executed).toBe(true);
    expect((await post("/api/sketch", { target: "Design tokens", png })).data.path).toBe("3.Resources/Concepts/Sketches/Design tokens 2026-11-09 (2).png");
    expect((await post("/api/sketch", { target: BOOK, png })).data.path).toBe(`3.Resources/Concepts/Sketches/${BOOK} 2026-11-09.png`);
    expect((await post("/api/sketch", { target: "Design tokens", png: Buffer.from("not a png").toString("base64") })).data.errors).toEqual(["a sketch is a PNG image"]);
    expect((await post("/api/sketch", { target: "Nobody", png })).status).toBe(400);
    const back = await call(`/sketch.png?path=${encodeURIComponent(preview.data.path)}`);
    expect(back.status).toBe(200);
    expect(back.headers["content-type"]).toBe("image/png");
    expect((await call(`/sketch.png?path=${encodeURIComponent(CH)}`)).status).toBe(404);
    expect((await getJson("/climb.json")).sketches).toEqual([{ path: preview.data.path, name: "Design tokens 2026-11-09" }]);
  });

  it("refuses every new write without the page's token or from another origin", async () => {
    for (const path of ["/api/structure", "/api/reveal", "/api/generate", "/api/sketch"]) {
      expect((await post(path, {}, { "x-vault-token": "wrong" })).status).toBe(403);
      expect((await call(path, "POST", { "content-type": "application/json", "x-vault-token": TOKEN, origin: "http://evil.example" }, "{}")).status).toBe(403);
    }
  });
});

describe("comparing a drawing with the structure", () => {
  it("suggests got it for the same members and the same arrow, wrong for a reversed arrow, missed for an undrawn group", () => {
    const actual = { groups: [{ name: "A", concepts: ["a"] }, { name: "B", concepts: ["b"] }, { name: "C", concepts: ["c"] }], buildsOn: [{ from: "B", to: "A" }, { from: "C", to: "B" }] };
    const marks = compareStructure({ groups: [{ name: "x", concepts: ["a"] }, { name: "y", concepts: ["b"] }], buildsOn: [{ from: "x", to: "y" }] }, actual);
    expect(marks.map(m => [m.assertion, m.mark])).toEqual([["group: A", "got it"], ["group: B", "got it"], ["group: C", "missed"], ["B → A", "wrong"], ["C → B", "missed"]]);
  });
});
