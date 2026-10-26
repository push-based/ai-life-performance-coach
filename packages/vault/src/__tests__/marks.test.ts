import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createVault, type Vault } from "../vault.js";
import { conceptWarnings, type ConceptInput } from "../concept.js";

let dir: string;
let vault: Vault;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

const WORK = "3.Resources/0.Raw/Books/Tiago Forte/Building a Second Brain";
const CH1 = `${WORK}/chapters/07 Distill (1 of 2).md`;
const CH2 = `${WORK}/chapters/08 Distill (2 of 2).md`;

const chapter = (title: string, from: number, pages: string[]) => [
  "---", `title: "${title}"`, 'raw_role: "chapter"', 'book: "Building a Second Brain"', `pages: "${from}-${from + pages.length - 1}"`, "---", "",
  `# ${title}`, "", "> [!summary]", "> My words about distilling.",
  ...pages.flatMap((text, i) => ["", `## Page ${from + i}`, "", text]), "",
].join("\n");

// Page 100 as the user marked it in the graph view before marks spanned lines: one
// bold per PDF line, highlights inside, and a heading line above the paragraph.
const PAGE_100 = [
  "Chapter 6",
  "Distill—Find the Essence",
  "school. Here is the long first line of the page so the others are measured against it.",
  "**The technique is simple: you highlight the ==main points of a note==, and then**",
  "**highlight the main points of those highlights, and so on, ==distilling the essence== of a**",
  "**note in several “layers.” Each of these ==layers== uses a different kind of formatting so**",
  "**you can easily tell them apart.**",
  "Here is a snapshot of the four layers of Progressive Summarization, unmarked here.",
].join("\n");

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vault-marks-"));
  put(`${WORK}/text.md`, '---\ntitle: "Building a Second Brain"\nraw_role: "index"\nauthor: "Tiago Forte"\n---\n# Building a Second Brain\n');
  put(CH1, chapter("Chapter 6: Distill (1 of 2)", 100, [
    PAGE_100,
    "Nothing marked on this page at all, which is a long enough line to set the width.\nStill nothing.",
  ]));
  put(CH2, chapter("Chapter 6: Distill (2 of 2)", 102, [
    "At layer two, this note is already dramatically more discoverable after distillation.\nIt is **worth it. Really** worth it, and the next sentence stands apart. Unmarked tail.",
  ]));
  vault = createVault(dir);
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("marked passages", () => {
  it("joins a bold cut at every line into the whole sentences around it, past a heading", async () => {
    const [p, ...rest] = (await vault.markedPassages(CH1))!;
    expect(rest).toEqual([]);
    expect(p).toMatchObject({
      note: CH1,
      chapter: "Chapter 6: Distill (1 of 2)",
      page: 100,
      depth: "highlight",
      quote: "The technique is simple: you highlight the main points of a note, and then highlight the main points of those highlights, and so on, distilling the essence of a note in several “layers.” Each of these layers uses a different kind of formatting so you can easily tell them apart.",
    });
    expect(p.marked.map(m => `${m.mark}:${m.text}`)).toEqual([
      "bold:The technique is simple: you highlight the main points of a note, and then highlight the main points of those highlights, and so on, distilling the essence of a note in several “layers.” Each of these layers uses a different kind of formatting so you can easily tell them apart.",
      "highlight:main points of a note",
      "highlight:distilling the essence",
      "highlight:layers",
    ]);
  });

  it("returns quotes create_concept accepts as given", async () => {
    const passages = (await vault.markedPassages(`${WORK}/text.md`))!;
    const r = await vault.createConcept({
      title: "Layers of Progressive Summarization",
      summary: "Bold the best, highlight the best of the bold.",
      core_assertions: ["Each layer is picked from the layer below it."],
      forbidden_buzzwords: ["essence"],
      passages: passages.map(p => ({ note: p.note, quote: p.quote, pages: String(p.page) })),
    }, false);
    expect(r.errors).toEqual([]);
    expect(r.passages.every(p => p.found)).toBe(true);
    expect(r.warnings).toEqual([]);
  });

  it("keeps sentences one mark runs across together, and leaves unmarked ones out", async () => {
    const passages = (await vault.markedPassages(CH2))!;
    expect(passages.map(p => [p.page, p.depth, p.quote])).toEqual([
      [102, "bold", "It is worth it. Really worth it, and the next sentence stands apart."],
    ]);
  });

  it("covers every chapter of a book by its index or work folder, and refuses anything else", async () => {
    expect((await vault.markedPassages(WORK))!.map(p => p.page)).toEqual([100, 102]);
    expect((await vault.markedPassages(`${WORK}/text.md`))!.map(p => p.page)).toEqual([100, 102]);
    expect(await vault.markedPassages("0.Inbox/nope.md")).toBeNull();
  });

  it("reads marks the graph view now writes across lines the same way", async () => {
    const before = (await vault.markedPassages(CH1))![0];
    const text = (await vault.pageText(CH1, 101))!.text;
    const r = await vault.markPage(CH1, 101, 0, text.indexOf("Still"), "bold", text);
    expect(r.ok && r.text).toBe("**Nothing marked on this page at all, which is a long enough line to set the width.**\nStill nothing.");
    const after = (await vault.markedPassages(CH1))!;
    expect(after[0]).toEqual(before);
    expect(after[1]).toMatchObject({ page: 101, depth: "bold", quote: "Nothing marked on this page at all, which is a long enough line to set the width." });
  });
});

describe("concept warnings", () => {
  const notes = async () => vault.notes();
  const base = (over: Partial<ConceptInput> = {}): ConceptInput => ({
    title: "Layers of Progressive Summarization",
    summary: "Mine.",
    core_assertions: ["Each layer is picked only from the layer below it."],
    forbidden_buzzwords: ["essence"],
    passages: [{ note: CH1, quote: "Each of these layers uses a different kind of formatting so you can easily tell them apart." }],
    ...over,
  });

  it("is quiet for a note that would spar well", async () => {
    expect(conceptWarnings(base(), await notes())).toEqual([]);
  });

  it("names fragment quotes, assertions about the learner, duplicates, no banned words and a misspelled title", async () => {
    const w = conceptWarnings(base({
      title: "Distilattion",
      core_assertions: [
        "The learner then highlights portions of the bolded text.",
        "Highlighting occurs within the bolded text portions.",
        "Each layer is picked only from the layer below it.",
      ],
      forbidden_buzzwords: [],
      passages: [
        { note: CH1, quote: "main points of a note" },
        { note: CH1, quote: "you can easily tell them apart." },
        { note: CH1, quote: "The technique is simple: you highlight the main points of a note, and then" },
        { note: CH2, quote: "At layer two, this note is already dramatically more discoverable after distillation." },
      ],
    }), await notes());
    expect(w.filter(x => x.startsWith("passages["))).toHaveLength(3);
    expect(w).toContain("core_assertions[0] describes what the learner or author does; state the idea itself, so a judge can check an explanation against it");
    expect(w).toContain("core_assertions[0] and core_assertions[1] say nearly the same thing; merge them");
    expect(w.some(x => x.startsWith("forbidden_buzzwords is empty"))).toBe(true);
    expect(w).toContain('title word "distilattion" is not in the source; did you mean "distillation"?');
  });

  it("are returned by the preview and never refuse", async () => {
    const r = await vault.createConcept(base({ forbidden_buzzwords: [] }), true);
    expect(r).toMatchObject({ errors: [], executed: true });
    expect(r.warnings).toHaveLength(1);
  });
});
