import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createVault, type Vault } from "../vault.js";
import { chapterProgress, summaryOf, withoutSummaries, applyMark, pageSection } from "../distill.js";
import { checkPassages } from "../concept.js";
import { writeViewGraph } from "../view.js";

let dir: string;
let vault: Vault;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
const read = (rel: string) => readFileSync(join(dir, rel), "utf-8");

const WORK = "3.Resources/0.Raw/Books/Tiago Forte/Building a Second Brain";
const INDEX = `${WORK}/text.md`;
const CH1 = `${WORK}/chapters/01 Capture.md`;
const CH2 = `${WORK}/chapters/02 Distill.md`;

const chapter = (title: string, from: number, pages: string[]) => [
  "---", `title: "${title}"`, 'raw_role: "chapter"', 'book: "Building a Second Brain"', `pages: "${from}-${from + pages.length - 1}"`, "---", "",
  `# ${title}`, "", "From [[Building a Second Brain]].",
  ...pages.flatMap((text, i) => ["", `## Page ${from + i}`, "", text]), "",
].join("\n");

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vault-distill-"));
  put(INDEX, '---\ntitle: "Building a Second Brain"\naliases: ["Building a Second Brain"]\nraw_role: "index"\nauthor: "Tiago Forte"\n---\n# Building a Second Brain\n');
  put(CH1, chapter("Chapter 1: Capture", 1, ["Keep what resonates with you.", "Capture ideas as they come.", "_(no text on this page)_"]));
  put(CH2, chapter("Chapter 2: Distill", 4, ["Bold the best ten percent of the passages.", "Then highlight the best of the bolded."]));
  vault = createVault(dir, { now: () => new Date("2026-10-24T09:00:00Z") });
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("reading the marks the user leaves in a chapter", () => {
  it("takes each page's deepest mark, its summary, and the chapter summary before the first page", () => {
    const body = [
      "> [!summary]", "> The chapter in my words.", "",
      "## Page 1", "", "> [!summary] Short page summary", "", "Keep **what resonates**", "with ==you== and **more**.", "",
      "## Page 2", "", "Some **bold\nacross a line** here.", "",
      "## Page 3", "", "** not bold ** and = = nothing", "",
      "## Page 4", "", "_(no text on this page)_", "",
    ].join("\n");
    expect(chapterProgress({ path: "c.md", title: "C", body })).toEqual({
      path: "c.md", title: "C", summary: true, state: "complete",
      pages: [
        { page: 1, mark: "highlight", summary: true, empty: false },
        { page: 2, mark: "bold", summary: false, empty: false },
        { page: 3, mark: "none", summary: false, empty: false },
        { page: 4, mark: "none", summary: false, empty: true },
      ],
    });
  });

  it("counts an empty summary callout as no summary, and escaped author quotes as no callout", () => {
    expect(summaryOf("> [!summary]\n>\n")).toBeNull();
    expect(summaryOf("\\> [!summary] the author wrote this")).toBeNull();
    expect(summaryOf("> [!SUMMARY]- Title line\n> and more")).toBe("Title line\nand more");
    expect(withoutSummaries("before\n> [!summary]\n> mine\nafter")).toBe("before\n\nafter");
  });

  it("is untouched, then in progress with any mark or page summary, and complete only with the chapter summary", async () => {
    const state = async (path: string) => chapterProgress((await vault.note(path))!).state;
    expect(await state(CH1)).toBe("untouched");
    put(CH1, read(CH1).replace("Keep what resonates", "Keep **what resonates**"));
    expect(await state(CH1)).toBe("in_progress");
    put(CH1, read(CH1).replace("## Page 1", "> [!summary]\n> Capture only what resonates.\n\n## Page 1"));
    expect(await state(CH1)).toBe("complete");
  });
});

describe("a book's stages", () => {
  const stage = async () => (await vault.readingProgress())[0];

  it("moves from unread through read, notes, distilling and distilled to concepts", async () => {
    expect((await stage()).stage).toBe("unread");

    const preview = await vault.markRead(WORK, "2026-10-20", false);
    expect(preview).toMatchObject({ executed: false, errors: [], path: INDEX, change: `add read_on: "2026-10-20" to ${INDEX}` });
    expect((await stage()).stage).toBe("unread");
    expect((await vault.markRead(INDEX, "2026-10-20", true)).executed).toBe(true);
    expect(read(INDEX)).toMatch(/^---\nread_on: "2026-10-20"\ntitle: "Building a Second Brain"/);
    expect(await stage()).toMatchObject({ stage: "read", steps: { readOn: "2026-10-20" } });
    expect((await vault.markRead(WORK, undefined, true)).errors).toEqual([`${INDEX} is already marked read on 2026-10-20`]);

    put("0.Inbox/BASB notes.md", "What resonated in [[Building a Second Brain]]: capture less.\n");
    expect(await stage()).toMatchObject({ stage: "notes", steps: { notes: ["0.Inbox/BASB notes.md"] } });

    put(CH2, read(CH2).replace("Bold the best", "**Bold the best**"));
    expect(await stage()).toMatchObject({ stage: "distilling", steps: { chaptersComplete: 0, chaptersInProgress: 1, chapters: 2 } });

    for (const ch of [CH1, CH2]) expect((await vault.writeSummary(ch, "In my words.", undefined, true)).executed).toBe(true);
    expect(await stage()).toMatchObject({ stage: "distilled", steps: { chaptersComplete: 2, chaptersInProgress: 0 } });

    put("3.Resources/Concepts/Distill.md", `---\ntype: "concept"\ncore_assertions: ["x"]\n---\nSee [[${CH2.replace(/\.md$/, "")}#Page 4|p. 4]].\n`);
    expect(await stage()).toMatchObject({ stage: "concepts", steps: { concepts: ["3.Resources/Concepts/Distill.md"], notes: ["0.Inbox/BASB notes.md"] } });
  });

  it("reports a skipped step: distilling without having marked the book read", async () => {
    await vault.writeSummary(CH1, "Mine.", undefined, true);
    expect(await stage()).toMatchObject({ stage: "distilling", steps: { readOn: null, notes: [] } });
  });
});

describe("write_summary", () => {
  it("puts the chapter summary before the first page and a page summary under its heading, changing nothing else", async () => {
    const before = read(CH2);
    const preview = await vault.writeSummary(CH2, "Bold, then highlight.\nOnly when needed.", undefined, false);
    expect(preview).toMatchObject({ executed: false, errors: [], change: `add the chapter summary to ${CH2}` });
    expect(read(CH2)).toBe(before);

    await vault.writeSummary(CH2, "Bold, then highlight.\n\nOnly when needed.", undefined, true);
    await vault.writeSummary(CH2, "Layer two.", 4, true);
    expect(read(CH2)).toBe(before
      .replace("\n## Page 4\n", "\n> [!summary]\n> Bold, then highlight.\n>\n> Only when needed.\n\n## Page 4\n\n> [!summary]\n> Layer two.\n"));
    expect(chapterProgress((await vault.note(CH2))!)).toMatchObject({ summary: true, state: "complete", pages: [{ page: 4, summary: true }, { page: 5, summary: false }] });
  });

  it("never replaces a summary and refuses what is not a chapter page", async () => {
    await vault.writeSummary(CH2, "Mine.", undefined, true);
    await vault.writeSummary(CH2, "Page.", 5, true);
    expect((await vault.writeSummary(CH2, "Again.", undefined, true)).errors).toEqual([`${CH2} already has a chapter summary; edit it in Obsidian`]);
    expect((await vault.writeSummary(CH2, "Again.", 5, true)).errors).toEqual([`page 5 of ${CH2} already has a summary; edit it in Obsidian`]);
    expect((await vault.writeSummary(CH2, "x", 9, true)).errors).toEqual([`${CH2} has no page 9`]);
    expect((await vault.writeSummary(INDEX, "x", undefined, true)).errors).toEqual([`${INDEX} is not a chapter of a converted book`]);
    expect((await vault.writeSummary(CH2, "  ", undefined, true)).errors).toEqual(["the summary is empty"]);
  });
});

describe("quotes and search after distilling", () => {
  it("still match the author's text through the user's marks, and never match the user's summaries", async () => {
    put(CH2, read(CH2).replace("Bold the best ten percent", "**Bold the ==best== ten** percent"));
    await vault.writeSummary(CH2, "My own words about layers of compression.", 4, true);
    const notes = await vault.notes();
    const [author, mine] = checkPassages(notes, [
      { note: CH2, quote: "Bold the best ten percent of the passages" },
      { note: CH2, quote: "My own words about layers" },
    ]);
    expect(author).toMatchObject({ found: true, pages: "4" });
    expect(mine).toMatchObject({ found: false });
    for (const hit of await vault.findPassages("my own words layers of compression")) expect(hit.snippet).not.toMatch(/my own words/i);
  });
});

describe("the graph view", () => {
  it("carries each book's stage and each chapter's pages", async () => {
    put(CH1, read(CH1).replace("Capture ideas", "==Capture ideas=="));
    await vault.writeSummary(CH2, "Done.", undefined, true);
    const graph = await writeViewGraph(vault);
    const node = (id: string) => graph.nodes.find(n => n.id === id)!;
    expect(node(INDEX)).toMatchObject({ stage: "distilling", chaptersComplete: 1, chapterCount: 2, distill: null });
    expect(node(CH1).distill).toEqual({
      state: "in_progress", summary: false,
      pages: [{ page: 1, mark: "none", summary: false, empty: false }, { page: 2, mark: "highlight", summary: false, empty: false }, { page: 3, mark: "none", summary: false, empty: true }],
    });
    expect(node(CH2).distill).toMatchObject({ state: "complete", summary: true });
  });
});

describe("marking text from the graph view", () => {
  const at = (text: string, part: string) => [text.indexOf(part), text.indexOf(part) + part.length] as const;

  it("wraps a selection, trimming spaces out of the marks", () => {
    const t = "Keep what resonates with you.";
    const [s, e] = at(t, " what resonates ");
    expect(applyMark(t, s, e, "bold")).toBe("Keep **what resonates** with you.");
  });

  it("merges into an existing bold, nests a highlight, and clears part of it", () => {
    let t = "Keep **what** resonates with you.";
    t = applyMark(t, ...at(t, "what** resonates"), "bold");
    expect(t).toBe("Keep **what resonates** with you.");
    t = applyMark(t, ...at(t, "resonates"), "highlight");
    expect(t).toBe("Keep **what ==resonates==** with you.");
    t = applyMark(t, ...at(t, "what"), "clear");
    expect(t).toBe("Keep what **==resonates==** with you.");
    t = applyMark(t, ...at(t, "**==resonates==**"), "clear");
    expect(t).toBe("Keep what resonates with you.");
  });

  it("marks across lines as one mark, keeps escapes and summaries untouched", () => {
    const t = "> [!summary]\n> Mine.\n\n\\# Not a heading\nfirst line\nsecond line";
    expect(applyMark(t, t.indexOf("Not"), t.indexOf("second") + 6, "highlight"))
      .toBe("> [!summary]\n> Mine.\n\n\\# ==Not a heading\nfirst line\nsecond== line");
  });

  it("keeps an escape inside a mark that runs across its line, and nests a highlight across lines", () => {
    let t = "one two\n\\> three four\nfive six";
    t = applyMark(t, t.indexOf("two"), t.indexOf("five") + 4, "bold");
    expect(t).toBe("one **two\n\\> three four\nfive** six");
    t = applyMark(t, ...at(t, "four\nfive"), "highlight");
    expect(t).toBe("one **two\n\\> three ==four\nfive==** six");
  });

  it("merges marks left line by line when the page is edited, and never across a blank line", () => {
    const t = "**The technique is simple: you**\n**highlight the main points.**\nPlain.\n\n**Next paragraph.**";
    expect(applyMark(t, ...at(t, "Plain"), "highlight"))
      .toBe("**The technique is simple: you\nhighlight the main points.**\n==Plain==.\n\n**Next paragraph.**");
  });

  it("ends a mark before a line break when the next line starts unmarked", () => {
    const t = "first line\nsecond line";
    expect(applyMark(t, 0, t.indexOf("\n") + 1, "bold")).toBe("**first line**\nsecond line");
  });

  it("leaves text without a selected character as it was", () => {
    const t = "> [!summary]\n> Mine.\n\nPlain.";
    expect(applyMark(t, 0, 10, "bold")).toBe(t);
  });

  it("finds a page's text between its heading and the next", () => {
    const c = "---\nx: 1\n---\n# T\n\n## Page 4\n\nOne.\nTwo.\n\n## Page 5\n\nThree.\n";
    const s = pageSection(c, 4)!;
    expect(s.text).toBe("One.\nTwo.");
    expect(c.slice(s.start, s.end)).toBe("One.\nTwo.");
    expect(pageSection(c, 5)!.text).toBe("Three.");
    expect(pageSection(c, 6)).toBeNull();
  });
});
