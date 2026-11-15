import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createVault, type Vault } from "../vault.js";
import { pagesOf, planUnits, type PdfText } from "../convert.js";
import { buildVaultGraph, noteResolver } from "../graph.js";

interface Entry { title: string; page: number; children?: Entry[] }

/** A minimal text PDF: one page per string, an Info dictionary, and an optional outline. */
function makePdf(pages: string[], info: { Title?: string; Author?: string } = {}, outline: Entry[] = []): Buffer {
  const objs: string[] = [];
  const reserve = () => { objs.push(""); return objs.length; };
  const set = (id: number, body: string) => { objs[id - 1] = body; };
  const esc = (s: string) => s.replace(/[()\\]/g, m => `\\${m}`);
  const font = reserve();
  set(font, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pagesId = reserve();
  const kids = pages.map(text => {
    const ops = text.split("\n").map((l, i) => `BT /F1 10 Tf 40 ${760 - i * 12} Td (${esc(l)}) Tj ET`).join("\n");
    const content = reserve();
    set(content, `<< /Length ${ops.length} >>\nstream\n${ops}\nendstream`);
    const page = reserve();
    set(page, `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`);
    return page;
  });
  set(pagesId, `<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`);
  let outlinesRef = "";
  if (outline.length) {
    const outlinesId = reserve();
    const build = (entries: Entry[], parent: number): number[] => {
      const ids = entries.map(() => reserve());
      entries.forEach((e, i) => {
        const children = e.children ? build(e.children, ids[i]) : [];
        set(ids[i], `<< /Title (${esc(e.title)}) /Parent ${parent} 0 R ${i > 0 ? `/Prev ${ids[i - 1]} 0 R` : ""} ${i < ids.length - 1 ? `/Next ${ids[i + 1]} 0 R` : ""} ${children.length ? `/First ${children[0]} 0 R /Last ${children.at(-1)} 0 R /Count ${children.length}` : ""} /Dest [${kids[e.page - 1]} 0 R /Fit] >>`);
      });
      return ids;
    };
    const top = build(outline, outlinesId);
    set(outlinesId, `<< /Type /Outlines /First ${top[0]} 0 R /Last ${top.at(-1)} 0 R /Count ${top.length} >>`);
    outlinesRef = ` /Outlines ${outlinesId} 0 R`;
  }
  const catalog = reserve();
  set(catalog, `<< /Type /Catalog /Pages ${pagesId} 0 R${outlinesRef} >>`);
  const infoId = reserve();
  set(infoId, `<< ${info.Title ? `/Title (${esc(info.Title)})` : ""} ${info.Author ? `/Author (${esc(info.Author)})` : ""} >>`);
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

const BOOK = "3.Resources/0.Raw/Books/Notes That Work.pdf";
const HOME = "3.Resources/0.Raw/Books/Jane Doe/Notes That Work";
const PDF = `${HOME}/e-book.pdf`;
const INDEX = `${HOME}/text.md`;
const CH = (name: string) => `${HOME}/chapters/${name}.md`;

/** Seven pages: title, intro, a part holding chapters 1 and 2, then the index. */
const PAGES = [
  "Notes That Work",
  "Introduction text.\n# not a heading",
  "Part One",
  "Capture what resonates.",
  "Organize for action: PARA.",
  "Distill with layered mark-\ning.",
  "Index: PARA, 5",
];
const OUTLINE: Entry[] = [
  { title: "Title Page", page: 1 },
  { title: "Introduction: The Promise", page: 2 },
  { title: "Part One: The Method", page: 3, children: [
    { title: "Chapter 1: Capture", page: 4 },
    { title: "Chapter 2: Organize and Distill", page: 5 },
  ] },
  { title: "Index", page: 7 },
];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vault-raw-"));
  vault = createVault(dir, { now: () => new Date("2026-10-24T12:00:00Z"), newSessionId: () => "s-1", newCoachId: () => "c-1" });
  put(BOOK, makePdf(PAGES, { Title: "Notes That Work", Author: "Jane Doe" }, OUTLINE));
  put("3.Resources/0.Raw/Articles/Clipped.md", "# Clipped article\n\nFull text.\n");
  put("3.Resources/PKM/PARA.md", [
    "See [[Jane Doe/Notes That Work/e-book.pdf#page=5]],",
    "[book](../0.Raw/Books/Jane%20Doe/Notes%20That%20Work/e-book.pdf)",
    "and [[Notes That Work]].",
  ].join(" ") + "\n");
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("convert_raw splits a book into chapters", () => {
  it("previews the move and the chapter list from the outline, writing nothing", async () => {
    const r = await vault.convertRaw(BOOK, false);
    expect(r).toMatchObject({ executed: false, move: { from: BOOK, to: PDF }, to: INDEX, pages: 7, byPages: false, collisions: [], errors: [] });
    expect(r.chapters.map(c => [c.path, c.title, c.pages])).toEqual([
      [CH("01 Introduction- The Promise"), "Introduction: The Promise", "2-2"],
      [CH("02 Capture"), "Chapter 1: Capture", "4-4"],
      [CH("03 Organize and Distill"), "Chapter 2: Organize and Distill", "5-6"],
    ]);
    expect(r.skipped).toEqual([{ title: "Title Page", page: 1 }, { title: "Index", page: 7 }]);
    expect(r).not.toHaveProperty("writes");
    expect(existsSync(join(dir, HOME))).toBe(false);
  });

  it("writes the chapters and an index, leaving the PDF bytes unchanged", async () => {
    const before = readFileSync(join(dir, BOOK));
    expect((await vault.convertRaw(BOOK, true)).executed).toBe(true);
    expect(readFileSync(join(dir, PDF))).toEqual(before);
    expect(readdirSync(join(dir, HOME)).sort()).toEqual(["chapters", "e-book.pdf", "text.md"]);

    const ch = read(CH("03 Organize and Distill"));
    expect(ch).toMatch(/^---\ntitle: "Chapter 2: Organize and Distill"\nraw_role: "chapter"\nbook: "Notes That Work"\nauthor: "Jane Doe"\npart: "Part One: The Method"\nchapter: 3\npages: "5-6"\nconverted_from: "\.\.\/e-book\.pdf"\n---\n/);
    expect(ch).toContain("## Page 5\n\nOrganize for action: PARA.");
    expect(ch).toContain("## Page 6\n\nDistill with layered marking.");
    expect(ch).not.toContain("## Page 4");
    expect(read(CH("01 Introduction- The Promise"))).toContain("Introduction text.\n\\# not a heading");

    const index = read(INDEX);
    expect(index).toMatch(/^---\ntitle: "Notes That Work"\naliases: \["Notes That Work"\]\nraw_role: "index"\nauthor: "Jane Doe"\nconverted_from: "e-book\.pdf"\npages: 7\nchapters: 3\nconverted_at: "2026-10-24"\n---\n/);
    expect(index).toContain(`## Part One: The Method\n\n- [[${CH("02 Capture").slice(0, -3)}|Chapter 1: Capture]] · pages 4–4`);
    expect(index).toContain(`- [[${PDF}#page=7|Index]] · page 7`);
    expect(index).not.toContain("## Page");
  });

  it("splits a chapter over the size limit into parts at page boundaries", async () => {
    const long = Array.from({ length: 6 }, (_, i) => `Page ${i + 1}\n` + Array(12).fill("x".repeat(50)).join("\n"));
    put("3.Resources/0.Raw/Books/Long.pdf", makePdf(long, { Title: "Long", Author: "A" }, [{ title: "Chapter 1: Everything", page: 1 }]));
    const r = await vault.convertRaw("3.Resources/0.Raw/Books/Long.pdf", false, { maxChars: 1500 });
    expect(r.chapters.map(c => [c.title, c.pages])).toEqual([
      ["Chapter 1: Everything (1 of 3)", "1-2"],
      ["Chapter 1: Everything (2 of 3)", "3-4"],
      ["Chapter 1: Everything (3 of 3)", "5-6"],
    ]);
    expect(r.chapters.map(c => c.path.split("/").pop())).toEqual(["01 Everything (1 of 3).md", "01 Everything (2 of 3).md", "01 Everything (3 of 3).md"]);
    expect(r.chapters.every(c => c.chars <= 1500)).toBe(true);
  });

  it("cuts a book without an outline into blocks of pages", async () => {
    const long = Array.from({ length: 5 }, (_, i) => `Page ${i + 1}\n` + Array(16).fill("y".repeat(50)).join("\n"));
    put("3.Resources/0.Raw/Books/Flat.pdf", makePdf(long, { Title: "Flat", Author: "B" }));
    const r = await vault.convertRaw("3.Resources/0.Raw/Books/Flat.pdf", false, { maxChars: 2000 });
    expect(r.byPages).toBe(true);
    expect(r.chapters.map(c => [c.title, c.path.split("/").pop()])).toEqual([
      ["Pages 1–2", "01 Pages 1-2.md"],
      ["Pages 3–4", "02 Pages 3-4.md"],
      ["Pages 5–5", "03 Pages 5-5.md"],
    ]);
  });

  it("refuses to convert twice, naming every existing file", async () => {
    await vault.convertRaw(BOOK, true);
    const again = await vault.convertRaw(PDF, true);
    expect(again).toMatchObject({ executed: false, move: null });
    expect(again.collisions).toEqual([CH("01 Introduction- The Promise"), CH("02 Capture"), CH("03 Organize and Distill"), INDEX]);
  });
});

describe("converted books in the vault", () => {
  it("lists the PDF with its index and hides the generated notes from list_raw", async () => {
    await vault.convertRaw(BOOK, true);
    expect(await vault.listRaw()).toEqual([
      { path: "3.Resources/0.Raw/Articles/Clipped.md", kind: "Articles", author: null, work: null, note: "3.Resources/0.Raw/Articles/Clipped.md", convertible: false, notes: [], concepts: [] },
      // PARA.md links the book three ways (a page of the PDF, its title, a relative link): one note made from it.
      { path: PDF, kind: "Books", author: "Jane Doe", work: "Notes That Work", note: INDEX, convertible: true, notes: ["3.Resources/PKM/PARA.md"], concepts: [] },
    ]);
  });

  it("spars no raw note, chapter or index; due_for_review lists only distilled notes", async () => {
    await vault.convertRaw(BOOK, true);
    const notes = await vault.notes();
    expect(notes.find(n => n.path === CH("02 Capture"))).toMatchObject({ rawRole: "chapter", pageRange: [4, 4], raw: true, rawWork: "Notes That Work" });
    expect(notes.find(n => n.path === INDEX)).toMatchObject({ rawRole: "index", pageRange: null });

    for (const note of [INDEX, CH("02 Capture"), "3.Resources/0.Raw/Articles/Clipped.md"]) {
      const refused = await vault.recordSession({ tier: 1, items: [{ note, challenge: "c", answer: "a", verdict: "pass", next_review: "2026-11-01" }] }, true);
      expect(refused.errors.join(), note).toMatch(/is a raw resource; .* spar a concept note that quotes it/);
    }

    const due = await vault.dueForReview("2026-10-24");
    expect(due.unsparred).toEqual([{ path: "3.Resources/PKM/PARA.md", title: "PARA", concept: false }]);
  });

  it("resolves a page link to the chapter holding that page, other PDF links and the title to the index", async () => {
    await vault.convertRaw(BOOK, true);
    const notes = await vault.notes();
    const para = notes.find(n => n.path === "3.Resources/PKM/PARA.md")!;
    const resolver = noteResolver(notes);
    expect(para.links.map(l => [l.target, l.page ?? null, resolver.resolve(para.path, l)])).toEqual([
      ["Jane Doe/Notes That Work/e-book.pdf", 5, CH("03 Organize and Distill")],
      ["Notes That Work", null, INDEX],
      ["../0.Raw/Books/Jane Doe/Notes That Work/e-book.pdf", null, INDEX],
    ]);
    const graph = buildVaultGraph(notes);
    expect(graph.unresolved).toEqual([]);
    expect(graph.edges.filter(e => e.source === INDEX).map(e => e.target).sort()).toEqual(
      [CH("01 Introduction- The Promise"), CH("02 Capture"), CH("03 Organize and Distill")].sort(),
    );
  });

  it("refuses non-PDFs, paths outside 0.Raw, missing files, unreadable PDFs and a missing author", async () => {
    expect((await vault.convertRaw("3.Resources/0.Raw/Articles/Clipped.md", true)).errors.join()).toMatch(/not a PDF/);
    put("3.Resources/PKM/x.pdf", makePdf(["x"]));
    expect((await vault.convertRaw("3.Resources/PKM/x.pdf", true)).errors.join()).toMatch(/not under 3\.Resources\/0\.Raw/);
    expect((await vault.convertRaw("3.Resources/0.Raw/../PKM/x.pdf", true)).errors.join()).toMatch(/not under/);
    expect((await vault.convertRaw("3.Resources/0.Raw/Books/None.pdf", true)).errors.join()).toMatch(/no file/);
    put("3.Resources/0.Raw/Books/Broken.pdf", "not a pdf");
    expect((await vault.convertRaw("3.Resources/0.Raw/Books/Broken.pdf", true)).errors.join()).toMatch(/could not be read as a PDF/);
    put("3.Resources/0.Raw/Books/Anon.pdf", makePdf(["text"]));
    expect((await vault.convertRaw("3.Resources/0.Raw/Books/Anon.pdf", true)).errors.join()).toMatch(/names no author.*pass author/);
    expect((await vault.convertRaw(BOOK, true, { maxChars: 10 })).errors.join()).toMatch(/maxChars must be at least 1000/);
  });

  it("takes author and title overrides, and renames a PDF already in its work folder", async () => {
    expect((await vault.convertRaw(BOOK, false, { author: "J. Doe", title: "NTW: notes?" })).move!.to).toBe("3.Resources/0.Raw/Books/J. Doe/NTW- notes-/e-book.pdf");
    put(`${HOME}/Original name.pdf`, readFileSync(join(dir, BOOK)));
    expect((await vault.convertRaw(`${HOME}/Original name.pdf`, false)).move).toEqual({ from: `${HOME}/Original name.pdf`, to: PDF });
  });
});

describe("planUnits", () => {
  const pdf = (outline: PdfText["outline"], pages = ["a", "b", "c", "d"]): PdfText => ({ title: "T", author: "A", pages, outline });

  it("ends each chapter where the next outline entry starts, parts included", () => {
    const plan = planUnits(pdf([
      { title: "Chapter 1: One", page: 1, part: null, isPart: false },
      { title: "Part Two", page: 3, part: null, isPart: true },
      { title: "Chapter 2: Two", page: 4, part: "Part Two", isPart: false },
    ]));
    expect(plan.units.map(u => [u.title, u.from, u.to, u.part])).toEqual([["Chapter 1: One", 1, 2, null], ["Chapter 2: Two", 4, 4, "Part Two"]]);
  });

  it("never lets a part exceed the limit when page sizes are uneven", () => {
    const sizes = [900, 100, 100, 900, 100, 900]; // a balanced cut into 2 would put 1,100 in one part
    const plan = planUnits(pdf([{ title: "Uneven", page: 1, part: null, isPart: false }], sizes.map(n => "w".repeat(n))), 1000);
    expect(plan.units.every(u => u.chars <= 1000)).toBe(true);
    expect(plan.units.map(u => [u.from, u.to])).toEqual([[1, 2], [3, 4], [5, 6]]);
  });

  it("leaves front and back matter in the PDF, acknowledgments included", () => {
    const plan = planUnits(pdf(["Dedication", "Chapter 1: One", "Acknowledgments", "About the Author"].map((title, i) => ({ title, page: i + 1, part: null, isPart: false }))));
    expect(plan.units.map(u => u.title)).toEqual(["Chapter 1: One"]);
    expect(plan.skipped.map(s => s.title)).toEqual(["Dedication", "Acknowledgments", "About the Author"]);
  });

  it("keeps a single page that is over the limit whole", () => {
    const plan = planUnits(pdf([{ title: "Big", page: 1, part: null, isPart: false }], ["z".repeat(5000)]), 1000);
    expect(plan.units.map(u => [u.from, u.to])).toEqual([[1, 1]]);
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
