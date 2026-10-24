import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createVault, type Vault } from "../vault.js";
import { pagesOf } from "../convert.js";
import { buildVaultGraph, noteResolver } from "../graph.js";

/** A minimal text PDF, one page per string, with an Info dictionary. */
function makePdf(pages: string[], info: { Title?: string; Author?: string } = {}): Buffer {
  const objs: string[] = [];
  const add = (body: string) => { objs.push(body); return objs.length; };
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pagesId = objs.length + 1 + pages.length * 2 + 1;
  const kids: number[] = [];
  for (const text of pages) {
    const ops = text.split("\n").map((l, i) => `BT /F1 12 Tf 72 ${720 - i * 16} Td (${l.replace(/[()\\]/g, m => `\\${m}`)}) Tj ET`).join("\n");
    const content = add(`<< /Length ${ops.length} >>\nstream\n${ops}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  add(`<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`);
  const infoId = add(`<< ${info.Title ? `/Title (${info.Title})` : ""} ${info.Author ? `/Author (${info.Author})` : ""} >>`);
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((body, i) => { offsets.push(Buffer.byteLength(out)); out += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

let dir: string;
let vault: Vault;

function put(rel: string, content: string | Buffer): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
const read = (rel: string) => readFileSync(join(dir, rel), "utf-8");
const BOOK = "3.Resources/0.Raw/Books/Second Brain.pdf";
const HOME = "3.Resources/0.Raw/Books/Tiago Forte/Building a Second Brain";
const PDF = `${HOME}/e-book.pdf`;
const NOTE = `${HOME}/text.md`;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vault-raw-"));
  vault = createVault(dir, { now: () => new Date("2026-10-24T12:00:00Z"), newSessionId: () => "s-1", newCoachId: () => "c-1" });
  put(BOOK, makePdf(["Capture what resonates.\n# not a heading", "Organize for action: PARA.", "Distill with progressive summa-\nrization."], { Title: "Building a Second Brain", Author: "Tiago Forte" }));
  put("3.Resources/0.Raw/Articles/Clipped.md", "# Clipped article\n\nFull text.\n");
  put("3.Resources/PKM/PARA.md", "Projects are short. See [[Tiago Forte/Building a Second Brain/e-book.pdf#page=2]], [book](../0.Raw/Books/Tiago%20Forte/Building%20a%20Second%20Brain/e-book.pdf) and [[Building a Second Brain]].\n");
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("raw resources", () => {
  it("lists raw files with their kind and whether they carry text yet", async () => {
    expect(await vault.listRaw()).toEqual([
      { path: "3.Resources/0.Raw/Articles/Clipped.md", kind: "Articles", author: null, work: null, note: "3.Resources/0.Raw/Articles/Clipped.md", convertible: false },
      { path: BOOK, kind: "Books", author: null, work: null, note: null, convertible: true },
    ]);
  });

  it("previews a conversion with real numbers and writes nothing", async () => {
    const r = await vault.convertRaw(BOOK, false);
    expect(r).toMatchObject({ executed: false, move: { from: BOOK, to: PDF }, to: NOTE, pages: 3, collisions: [], errors: [] });
    expect(r.chars).toBeGreaterThan(50);
    expect(existsSync(join(dir, HOME))).toBe(false);
    expect(existsSync(join(dir, BOOK))).toBe(true);
  });

  it("moves the PDF to <kind>/<author>/<title>/e-book.pdf and converts it to text.md there once, bytes unchanged", async () => {
    const before = readFileSync(join(dir, BOOK));
    expect((await vault.convertRaw(BOOK, true)).executed).toBe(true);
    expect(existsSync(join(dir, BOOK))).toBe(false);
    const md = read(NOTE);
    expect(md).toMatch(/^---\ntitle: "Building a Second Brain"\naliases: \["Building a Second Brain"\]\nauthor: "Tiago Forte"\nconverted_from: "e-book.pdf"\npages: 3\nconverted_at: "2026-10-24"\n---\n/);
    expect(md).toContain(`Converted from [[${PDF}]]`);
    expect(md).toContain("## Page 1\n\nCapture what resonates.\n\\# not a heading");
    expect(md).toContain("## Page 3\n\nDistill with progressive summarization.");
    expect(readFileSync(join(dir, PDF))).toEqual(before);
    expect((await vault.listRaw()).find(i => i.path === PDF)).toEqual({
      path: PDF, kind: "Books", author: "Tiago Forte", work: "Building a Second Brain", note: NOTE, convertible: true,
    });
    const again = await vault.convertRaw(PDF, true);
    expect(again).toMatchObject({ move: null, collisions: [NOTE], executed: false });
  });

  it("renames a PDF already in its work folder to e-book.pdf", async () => {
    put(`${HOME}/Original name.pdf`, readFileSync(join(dir, BOOK)));
    const r = await vault.convertRaw(`${HOME}/Original name.pdf`, false);
    expect(r).toMatchObject({ move: { from: `${HOME}/Original name.pdf`, to: PDF }, to: NOTE, collisions: [] });
  });

  it("takes author and title overrides, and the author folder a PDF already sits in", async () => {
    const r = await vault.convertRaw(BOOK, false, { author: "T. Forte", title: "BASB: notes?" });
    expect(r.move!.to).toBe("3.Resources/0.Raw/Books/T. Forte/BASB- notes-/e-book.pdf");
    put("3.Resources/0.Raw/Books/Someone/Other.pdf", makePdf(["text"], { Title: "Other Book" }));
    expect((await vault.convertRaw("3.Resources/0.Raw/Books/Someone/Other.pdf", false)).move!.to).toBe("3.Resources/0.Raw/Books/Someone/Other Book/e-book.pdf");
  });

  it("asks for an author when the PDF names none, and refuses a move onto an existing file", async () => {
    put("3.Resources/0.Raw/Books/Anon.pdf", makePdf(["text"]));
    expect((await vault.convertRaw("3.Resources/0.Raw/Books/Anon.pdf", true)).errors.join()).toMatch(/names no author.*pass author/);
    put(PDF, "already here");
    const r = await vault.convertRaw(BOOK, true);
    expect(r).toMatchObject({ executed: false, collisions: [PDF] });
    expect(existsSync(join(dir, BOOK))).toBe(true);
  });

  it("makes the converted book a sparrable Resources note, raw and of its kind", async () => {
    await vault.convertRaw(BOOK, true);
    const note = (await vault.notes()).find(n => n.path === NOTE)!;
    expect(note).toMatchObject({ bucket: "resources", raw: true, rawKind: "Books", rawAuthor: "Tiago Forte", rawWork: "Building a Second Brain", convertedFrom: "e-book.pdf", title: "Building a Second Brain" });
    const s = await vault.recordSession({ tier: 1, items: [{ note: note.path, challenge: "c", answer: "a", verdict: "pass", next_review: "2026-11-01" }] }, true);
    expect(s.errors).toEqual([]);
  });

  it("resolves path wikilinks, markdown links and the title alias onto the converted text", async () => {
    let graph = buildVaultGraph(await vault.notes());
    expect(graph.unresolved.map(u => u.target)).toEqual(["Tiago Forte/Building a Second Brain/e-book.pdf", "Building a Second Brain", "../0.Raw/Books/Tiago Forte/Building a Second Brain/e-book.pdf"]);
    await vault.convertRaw(BOOK, true);
    graph = buildVaultGraph(await vault.notes());
    expect(graph.edges.filter(e => e.source === "3.Resources/PKM/PARA.md").map(e => e.target)).toEqual([NOTE]);
    expect(graph.unresolved).toEqual([]);
    const notes = await vault.notes();
    const para = notes.find(n => n.path === "3.Resources/PKM/PARA.md")!;
    const resolver = noteResolver(notes);
    expect(para.links.map(l => resolver.resolve(para.path, l))).toEqual([NOTE, NOTE, NOTE]);
    expect(graph.nodes.find(n => n.id === NOTE)!.raw).toBe(true);
  });

  it("refuses non-PDFs, paths outside 0.Raw, missing files, and unreadable PDFs", async () => {
    expect((await vault.convertRaw("3.Resources/0.Raw/Articles/Clipped.md", true)).errors.join()).toMatch(/not a PDF/);
    put("3.Resources/PKM/x.pdf", makePdf(["x"]));
    expect((await vault.convertRaw("3.Resources/PKM/x.pdf", true)).errors.join()).toMatch(/not under 3\.Resources\/0\.Raw/);
    expect((await vault.convertRaw("3.Resources/0.Raw/../PKM/x.pdf", true)).errors.join()).toMatch(/not under/);
    expect((await vault.convertRaw("3.Resources/0.Raw/Books/None.pdf", true)).errors.join()).toMatch(/no file/);
    put("3.Resources/0.Raw/Books/Broken.pdf", "not a pdf");
    expect((await vault.convertRaw("3.Resources/0.Raw/Books/Broken.pdf", true)).errors.join()).toMatch(/could not be read as a PDF/);
  });
});

describe("pagesOf", () => {
  const body = "# T\n\nIntro\n\n## Page 1\n\none\n\n## Page 2\n\ntwo\n\n## Page 3\n\nthree\n";
  it("returns one page or a range, and null when there is none", () => {
    expect(pagesOf(body, "2")).toBe("## Page 2\n\ntwo\n");
    expect(pagesOf(body, "2-3")).toBe("## Page 2\n\ntwo\n\n## Page 3\n\nthree\n");
    expect(pagesOf(body, "9")).toBeNull();
    expect(pagesOf(body, "3-1")).toBeNull();
    expect(pagesOf("no pages", "1")).toBeNull();
  });
});
