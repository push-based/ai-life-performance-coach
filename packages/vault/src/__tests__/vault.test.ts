import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { resolveVaultRoot, defaultVaultConfigFile } from "../root.js";
import { classify } from "../para.js";
import { extractLinks, LinkResolver } from "../links.js";
import { scanVault, listNotePaths } from "../scan.js";
import { createVault, notePathOf } from "../vault.js";
import { buildVaultGraph } from "../graph.js";
import { searchNotes } from "../search.js";

let dir: string;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

/** A small vault on the fixed PARA folders, plus everything the scanner must skip. */
function seedVault(): void {
  put("0.Inbox/Quick idea.md", "Ship the ugly prototype.\n");
  put("1.Projects/Expo2026/Talk outline.md", "# Talk outline\n\nSee [[Event loop]] and [judge](../../3.Resources/LLM/LLM%20as%20judge.md) and [again](<../../3.Resources/LLM/LLM as judge.md>).\n");
  put("2.Areas/Health/Sleep.md", "Eight hours.\n");
  put("3.Resources/TypeScript/Event loop.md", "---\ntitle: The event loop\ncoach_id: c-123\n---\nMicrotasks run before the next macrotask. [[Missing note]]\n");
  put("3.Resources/LLM/LLM as judge.md", "# LLM as judge\n\nZażółć gęślą jaźń: a judge scores claims. Links back to [[TypeScript/Event loop|the loop]].\n");
  put("3.Resources/Loose resource.md", "A note directly in the bucket.\n");
  put("4.Archive/old notes/ERC/Plan.md", "Old plan.\n");
  put("Stray.md", "Outside PARA.\n");
  put("Misnamed/Note.md", "Wrong bucket folder.\n");
  put(".obsidian/workspace.md", "not a note\n");
  put("Coach/sessions/2026-10-24.md", "not a note\n");
  put("3.Resources/image.png", "binary");
}

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "vault-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("resolveVaultRoot", () => {
  const base = () => ({ home: dir, cwd: dir, protectedRoots: [] as string[] });

  it("takes the flag over the environment over the config file", () => {
    for (const d of ["a", "b", "c"]) mkdirSync(join(dir, d));
    const configFile = join(dir, "config.json");
    writeFileSync(configFile, JSON.stringify({ vault: { root: "c" } }));
    expect(resolveVaultRoot({ ...base(), flag: "a", env: "b", configFile })).toEqual({ root: join(dir, "a"), source: "flag" });
    expect(resolveVaultRoot({ ...base(), env: "b", configFile })).toEqual({ root: join(dir, "b"), source: "env" });
    expect(resolveVaultRoot({ ...base(), configFile })).toEqual({ root: join(dir, "c"), source: "config" });
  });

  it("expands a leading ~ against the home directory", () => {
    mkdirSync(join(dir, "vault"), { recursive: true });
    expect(resolveVaultRoot({ ...base(), cwd: "/", flag: "~/vault" }).root).toBe(join(dir, "vault"));
  });

  it("throws when nothing names a vault, naming every source", () => {
    expect(() => resolveVaultRoot({ ...base(), configFile: join(dir, "absent.json") })).toThrow(/--vault.*DOCS_MCP_VAULT.*vault\.root/);
  });

  it("throws when the vault is not a directory", () => {
    expect(() => resolveVaultRoot({ ...base(), flag: "nope" })).toThrow(/not a directory/);
  });

  it("refuses a vault inside a protected docs-mcp workspace", () => {
    mkdirSync(join(dir, "kb", "vault"), { recursive: true });
    expect(() => resolveVaultRoot({ ...base(), flag: "kb/vault", protectedRoots: [join(dir, "kb")] })).toThrow(/inside the docs-mcp workspace/);
    expect(() => resolveVaultRoot({ ...base(), flag: "kb", protectedRoots: [join(dir, "kb")] })).toThrow(/inside the docs-mcp workspace/);
  });

  it("rejects a config file that is not JSON", () => {
    const configFile = join(dir, "config.json");
    writeFileSync(configFile, "{ nope");
    expect(() => resolveVaultRoot({ ...base(), configFile })).toThrow(/not valid JSON/);
  });

  it("defaults the config file under XDG_CONFIG_HOME, else ~/.config", () => {
    expect(defaultVaultConfigFile("/home/u")).toBe(join("/home/u", ".config", "docs-mcp", "config.json"));
    expect(defaultVaultConfigFile("/home/u", "/xdg")).toBe(join("/xdg", "docs-mcp", "config.json"));
  });
});

describe("classify", () => {
  it("maps the five fixed folders and names the container", () => {
    const at = (bucket: string, container: string | null) => ({ bucket, container, raw: false, rawKind: null, rawAuthor: null, rawWork: null });
    expect(classify("0.Inbox/x.md")).toEqual(at("inbox", null));
    expect(classify("1.Projects/Expo2026/Workstreams/x.md")).toEqual(at("projects", "Expo2026"));
    expect(classify("2.Areas/Health/x.md")).toEqual(at("areas", "Health"));
    expect(classify("3.Resources/x.md")).toEqual(at("resources", null));
    expect(classify("4.Archive/old notes/ERC/x.md")).toEqual(at("archive", "old notes"));
  });

  it("marks 3.Resources/0.Raw as raw, with its kind folder", () => {
    const raw = (rawKind: string | null, rawAuthor: string | null, rawWork: string | null) => ({ bucket: "resources", container: "0.Raw", raw: true, rawKind, rawAuthor, rawWork });
    expect(classify("3.Resources/0.Raw/Books/Jane Doe/Notes That Work/NTW.md")).toEqual(raw("Books", "Jane Doe", "Notes That Work"));
    expect(classify("3.Resources/0.Raw/Books/Jane Doe/NTW.md")).toEqual(raw("Books", "Jane Doe", null));
    expect(classify("3.Resources/0.Raw/Books/NTW.md")).toEqual(raw("Books", null, null));
    expect(classify("3.Resources/0.Raw/Loose.md")).toEqual(raw(null, null, null));
    expect(classify("4.Archive/0.Raw/Books/x.md").raw).toBe(false);
  });

  it("leaves everything else out of place", () => {
    for (const p of ["x.md", "1.Projects", "Projects/a/x.md", "Notes/1.Projects/x.md", "PARA/1.Projects/x.md"]) {
      expect(classify(p), p).toEqual({ bucket: null, container: null, raw: false, rawKind: null, rawAuthor: null, rawWork: null });
    }
  });
});

describe("links", () => {
  it("extracts wikilinks, embeds and relative markdown links, ignoring code and URLs", () => {
    const body = [
      "[[A]] [[B|alias]] [[C#Heading]] ![[D]]",
      "[e](sub/E.md) [f](F%20G.md#part) [h](<H I.md>) [web](https://x.y) [anchor](#top) ![img](pic.png)",
      "`[[Inline]]`",
      "```\n[[Fenced]]\n```",
    ].join("\n");
    expect(extractLinks(body)).toEqual([
      { kind: "wikilink", target: "A" },
      { kind: "wikilink", target: "B" },
      { kind: "wikilink", target: "C" },
      { kind: "wikilink", target: "D" },
      { kind: "markdown", target: "sub/E.md" },
      { kind: "markdown", target: "F G.md" },
      { kind: "markdown", target: "H I.md" },
    ]);
  });

  it("resolves wikilinks by name (shortest path wins) or path suffix, markdown links relatively", () => {
    const r = new LinkResolver(["a/deep/Note.md", "b/Note.md", "c/Other.md"]);
    expect(r.resolve("c/Other.md", { kind: "wikilink", target: "Note" })).toBe("b/Note.md");
    expect(r.resolve("c/Other.md", { kind: "wikilink", target: "note" })).toBe("b/Note.md");
    expect(r.resolve("c/Other.md", { kind: "wikilink", target: "deep/Note" })).toBe("a/deep/Note.md");
    expect(r.resolve("c/Other.md", { kind: "markdown", target: "../a/deep/Note.md" })).toBe("a/deep/Note.md");
    expect(r.resolve("c/Other.md", { kind: "markdown", target: "../b/Note" })).toBe("b/Note.md");
    expect(r.resolve("c/Other.md", { kind: "wikilink", target: "Missing" })).toBeNull();
  });
});

describe("scanVault", () => {
  it("reads every note outside dot-folders and Coach/, with or without frontmatter", async () => {
    seedVault();
    const notes = await scanVault(dir);
    expect(notes.map(n => n.path)).toEqual([
      "0.Inbox/Quick idea.md",
      "1.Projects/Expo2026/Talk outline.md",
      "2.Areas/Health/Sleep.md",
      "3.Resources/LLM/LLM as judge.md",
      "3.Resources/Loose resource.md",
      "3.Resources/TypeScript/Event loop.md",
      "4.Archive/old notes/ERC/Plan.md",
      "Misnamed/Note.md",
      "Stray.md",
    ]);
    const loop = notes.find(n => n.path.endsWith("Event loop.md"))!;
    expect(loop).toMatchObject({ title: "The event loop", coachId: "c-123", bucket: "resources", container: "TypeScript" });
    expect(loop.body.startsWith("Microtasks")).toBe(true);
    const judge = notes.find(n => n.path.endsWith("LLM as judge.md"))!;
    expect(judge).toMatchObject({ title: "LLM as judge", coachId: null, frontmatter: {} });
    expect(notes.find(n => n.path === "0.Inbox/Quick idea.md")!.title).toBe("Quick idea");
    expect(notes.find(n => n.path === "Stray.md")!.bucket).toBeNull();
  });

  it("does not follow a symlinked folder out of the vault", async () => {
    const outside = mkdtempSync(join(tmpdir(), "outside-"));
    try {
      writeFileSync(join(outside, "Secret.md"), "secret");
      mkdirSync(join(dir, "3.Resources"), { recursive: true });
      symlinkSync(outside, join(dir, "3.Resources", "link"));
      expect(await listNotePaths(dir)).toEqual([]);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it("changes nothing in the vault: every file keeps its bytes and mtime", async () => {
    seedVault();
    const files = ["3.Resources/TypeScript/Event loop.md", "Stray.md", "Coach/sessions/2026-10-24.md"];
    const before = files.map(f => [readFileSync(join(dir, f), "utf-8"), statSync(join(dir, f)).mtimeMs]);
    const vault = createVault(dir);
    const notes = await vault.notes();
    await vault.note("3.Resources/TypeScript/Event loop.md");
    buildVaultGraph(notes);
    await searchNotes(notes, "loop");
    expect(files.map(f => [readFileSync(join(dir, f), "utf-8"), statSync(join(dir, f)).mtimeMs])).toEqual(before);
  });
});

describe("notePathOf and vault.note", () => {
  it("accepts vault-relative markdown paths and refuses escapes, dot-folders and Coach/", () => {
    expect(notePathOf(dir, "0.Inbox/x.md")).toBe("0.Inbox/x.md");
    expect(notePathOf(dir, "/0.Inbox/x.md")).toBe("0.Inbox/x.md");
    for (const bad of ["../x.md", "../../x.md", ".obsidian/a.md", "Coach/sessions/s.md", "x.png"]) {
      expect(notePathOf(dir, bad), bad).toBeNull();
    }
  });

  it("returns a note by path and null for anything that is not one of its notes", async () => {
    seedVault();
    const vault = createVault(dir);
    expect((await vault.note("2.Areas/Health/Sleep.md"))?.title).toBe("Sleep");
    expect(await vault.note("2.Areas/Health/Absent.md")).toBeNull();
    expect(await vault.note("Coach/sessions/2026-10-24.md")).toBeNull();
    expect(await vault.note("../etc/passwd.md")).toBeNull();
  });
});

describe("buildVaultGraph", () => {
  it("links notes by wikilink and markdown link, deduplicated, and lists unresolved targets", async () => {
    seedVault();
    const graph = buildVaultGraph(await scanVault(dir));
    expect(graph.nodes).toHaveLength(9);
    expect(graph.edges).toEqual([
      { source: "1.Projects/Expo2026/Talk outline.md", target: "3.Resources/TypeScript/Event loop.md", kind: "wikilink" },
      { source: "1.Projects/Expo2026/Talk outline.md", target: "3.Resources/LLM/LLM as judge.md", kind: "markdown" },
      { source: "3.Resources/LLM/LLM as judge.md", target: "3.Resources/TypeScript/Event loop.md", kind: "wikilink" },
    ]);
    expect(graph.unresolved).toEqual([{ source: "3.Resources/TypeScript/Event loop.md", target: "Missing note" }]);
  });
});

describe("searchNotes", () => {
  it("ranks title matches first and folds Polish diacritics", async () => {
    seedVault();
    const notes = await scanVault(dir);
    const hits = await searchNotes(notes, "judge");
    expect(hits[0].path).toBe("3.Resources/LLM/LLM as judge.md");
    expect((await searchNotes(notes, "zazolc gesla"))[0].path).toBe("3.Resources/LLM/LLM as judge.md");
  });

  it("filters by bucket and honours the limit", async () => {
    seedVault();
    const notes = await scanVault(dir);
    const all = await searchNotes(notes, "loop");
    expect(all.length).toBeGreaterThan(1);
    expect((await searchNotes(notes, "loop", { bucket: "projects" })).map(h => h.path)).toEqual(["1.Projects/Expo2026/Talk outline.md"]);
    expect(await searchNotes(notes, "loop", { limit: 1 })).toHaveLength(1);
    expect(await searchNotes(notes, "   ")).toEqual([]);
  });
});
