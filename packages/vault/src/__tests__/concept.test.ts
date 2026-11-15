import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createVault, type Vault } from "../vault.js";
import { conceptOf, checkPassages, fold, type ConceptInput } from "../concept.js";
import { noteResolver } from "../graph.js";

let dir: string;
let vault: Vault;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

const WORK = "3.Resources/0.Raw/Books/Jane Doe/Notes That Work";
const INDEX = `${WORK}/text.md`;
const DISTILL = `${WORK}/chapters/08 Distill.md`;
const READING = "0.Inbox/NTW reading notes.md";

const input = (over: Partial<ConceptInput> = {}): ConceptInput => ({
  title: "Layered Marking",
  summary: "Compress a note in layers, and only when a project needs it.",
  core_assertions: ["Each layer keeps about 10-20% of the one before.", "Notes are compressed just in time, when touched for a project."],
  forbidden_buzzwords: ["PKM"],
  passages: [{ note: DISTILL, quote: "bold the best 10–20 percent" }],
  from_notes: [READING],
  ...over,
});

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vault-concept-"));
  put(INDEX, '---\ntitle: "Notes That Work"\naliases: ["Notes That Work"]\nraw_role: "index"\n---\n# Notes That Work\n');
  put(DISTILL, [
    "---", 'title: "Chapter 8: Distill"', 'raw_role: "chapter"', 'book: "Notes That Work"', 'pages: "136-138"', "---", "",
    "# Chapter 8: Distill", "",
    "## Page 136", "", "In the second layer you bold the best 10–20 percent of the passages. Do not com-", "press everything at once.", "",
    "## Page 137", "", "\\# A heading-like line. You only summarize a note when you", "",
    "## Page 138", "", "actually touch it again for a project, just in time.", "",
  ].join("\n"));
  put("3.Resources/0.Raw/Articles/Clipped.md", "# Clipped\n\nAn “article” about information hoarding and timing.\n");
  put(READING, "- distill = bold 10-20%, then highlight\n");
  put("3.Resources/PKM/PARA.md", "# PARA\n");
  vault = createVault(dir, { now: () => new Date("2026-10-24T09:00:00Z"), newCoachId: () => "c-concept", newSessionId: () => "s-concept" });
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("quote matching", () => {
  it("folds case, whitespace, typographic quotes and dashes, conversion escapes and words broken at a line end", () => {
    expect(fold("Bold the best 10–20 “percent”")).toBe('bold the best 10-20 "percent"');
    expect(fold("Do not com-\npress\neverything")).toBe("do not compress everything");
    expect(fold("\\# A heading")).toBe("# a heading");
  });

  it("finds a quote on its page, across a page break, and with an elision; reports the pages", async () => {
    const notes = await vault.notes();
    const check = (quote: string, pages?: string) => checkPassages(notes, [{ note: DISTILL, quote, ...(pages ? { pages } : {}) }])[0];
    expect(check("BOLD THE BEST 10-20 percent of the passages")).toMatchObject({ found: true, pages: "136" });
    expect(check("Do not compress everything at once")).toMatchObject({ found: true, pages: "136" });
    expect(check("You only summarize a note when you actually touch it again")).toMatchObject({ found: true, pages: "137-138" });
    expect(check("In the second layer … at once")).toMatchObject({ found: true, pages: "136" });
    expect(check("bold the best 10-20 percent", "137")).toMatchObject({ found: false, problem: `not found on pages 137 of ${DISTILL}` });
    expect(check("bold the best 10-20 percent", "200")).toMatchObject({ found: false, problem: `${DISTILL} has no pages 200` });
    expect(check("highlight the top 10 percent")).toMatchObject({ found: false, problem: `not found in ${DISTILL}` });
    expect(check("the best")).toMatchObject({ found: false, problem: "the quote is shorter than 12 characters" });
  });

  it("matches a raw note without pages as a whole, and refuses pages for it", async () => {
    const notes = await vault.notes();
    const clipped = "3.Resources/0.Raw/Articles/Clipped.md";
    expect(checkPassages(notes, [{ note: clipped, quote: '"article" about information hoarding' }])[0]).toMatchObject({ found: true });
    expect(checkPassages(notes, [{ note: clipped, quote: '"article" about information hoarding', pages: "1" }])[0].problem).toMatch(/has no page headings/);
  });

  it("quotes only raw text: not an index, not a distilled note, not a missing note", async () => {
    const notes = await vault.notes();
    const problems = checkPassages(notes, [
      { note: INDEX, quote: "Notes That Work" },
      { note: "3.Resources/PKM/PARA.md", quote: "PARA is a system" },
      { note: "3.Resources/0.Raw/Nope.md", quote: "something long enough" },
    ]).map(p => p.problem);
    expect(problems).toEqual([
      `${INDEX} is a book's index and holds no text; quote one of its chapters`,
      "3.Resources/PKM/PARA.md is not a raw resource; passages quote material under 3.Resources/0.Raw",
      "no note 3.Resources/0.Raw/Nope.md",
    ]);
  });
});

describe("create_concept", () => {
  it("previews with each passage checked, writes nothing until execute, then writes a concept note", async () => {
    const preview = await vault.createConcept(input(), false);
    expect(preview).toMatchObject({ executed: false, errors: [], collisions: [], path: "3.Resources/Concepts/Layered Marking.md" });
    expect(preview.passages).toEqual([{ note: DISTILL, quote: "bold the best 10–20 percent", pages: "136", found: true }]);
    expect(await vault.note("3.Resources/Concepts/Layered Marking.md")).toBeNull();

    const done = await vault.createConcept(input(), true);
    expect(done.executed).toBe(true);
    const text = readFileSync(join(dir, done.path!), "utf-8");
    expect(text).toContain('type: "concept"');
    expect(text).toContain(`> bold the best 10–20 percent\n> — [[${DISTILL.replace(/\.md$/, "")}#Page 136|Notes That Work, p. 136]]`);
    expect(text).toContain("## From my reading notes\n\n- [[0.Inbox/NTW reading notes|NTW reading notes]]");

    const notes = await vault.notes();
    const note = notes.find(n => n.path === done.path)!;
    expect(note.concept).toBe(true);
    expect(conceptOf(note)).toEqual({
      fields: {
        coreAssertions: input().core_assertions,
        forbiddenBuzzwords: ["PKM"],
        fromNotes: [READING],
        passages: [{ quote: "bold the best 10–20 percent", note: DISTILL, pages: "136" }],
      },
      problems: [],
    });
    // The citation and the reading-notes link are graph edges to the chapter and the note.
    const resolver = noteResolver(notes);
    expect(note.links.map(l => resolver.resolve(note.path, l))).toEqual([DISTILL, READING]);
  });

  it("refuses a misquote, raw reading notes, a folder in 0.Raw, empty assertions and summary, and an existing note", async () => {
    const refused = await vault.createConcept(input({
      summary: " ",
      core_assertions: [],
      passages: [{ note: DISTILL, quote: "bold the worst 10-20 percent" }],
      from_notes: [DISTILL, "0.Inbox/Missing.md"],
      folder: `${WORK}/concepts`,
    }), true);
    expect(refused.executed).toBe(false);
    expect(refused.errors).toEqual([
      "summary is empty; write the idea in your own words",
      "core_assertions takes 1 to 6 entries, got 0",
      `${WORK}/concepts is not a folder under 3.Resources outside 0.Raw`,
      `from_notes: ${DISTILL} is a raw resource; name your own reading notes`,
      "from_notes: no note 0.Inbox/Missing.md",
      `passages[0]: not found in ${DISTILL}`,
    ]);

    put("3.Resources/Concepts/Layered Marking.md", "mine");
    const taken = await vault.createConcept(input(), true);
    expect(taken).toMatchObject({ executed: false, collisions: ["3.Resources/Concepts/Layered Marking.md"] });
    expect(readFileSync(join(dir, "3.Resources/Concepts/Layered Marking.md"), "utf-8")).toBe("mine");
  });

  it("re-checks passages on read, so a changed raw note shows the quote as lost", async () => {
    const { path } = await vault.createConcept(input(), true);
    put(DISTILL, readFileSync(join(dir, DISTILL), "utf-8").replace("bold the best", "underline the best"));
    const notes = await vault.notes();
    const concept = conceptOf(notes.find(n => n.path === path)!)!;
    expect(checkPassages(notes, concept.fields.passages)[0]).toMatchObject({ found: false, problem: `not found on pages 136 of ${DISTILL}` });
  });

  it("reports malformed concept frontmatter instead of failing", () => {
    expect(conceptOf({ frontmatter: { type: "concept", core_assertions: "one", source_passages: [{ quote: 1 }] } })!.problems).toEqual([
      "core_assertions must be a list of strings",
      "core_assertions is empty",
      "source_passages[0] needs a quote and a note",
    ]);
    expect(conceptOf({ frontmatter: { title: "Plain" } })).toBeNull();
  });
});

describe("sparring concept notes, not raw text", () => {
  it("spars a concept note and refuses the chapter it quotes; due_for_review marks concept notes and leaves raw out", async () => {
    const { path } = await vault.createConcept(input(), true);
    const refused = await vault.recordSession({ tier: 1, items: [{ note: DISTILL, challenge: "c", answer: "a", verdict: "pass", next_review: "2026-11-01" }] }, true);
    expect(refused.errors).toEqual([`items[0]: ${DISTILL} is a raw resource; raw resources are the reference concept notes are checked against and are not sparred, so spar a concept note that quotes it`]);

    const due = await vault.dueForReview("2026-10-24");
    expect(due.unsparred).toEqual([
      { path: "3.Resources/Concepts/Layered Marking.md", title: "Layered Marking", concept: true },
      { path: "3.Resources/PKM/PARA.md", title: "PARA", concept: false },
    ]);

    const ok = await vault.recordSession({ tier: 1, items: [{ note: path!, challenge: "c", answer: "a", verdict: "pass", next_review: "2026-10-24" }] }, true);
    expect(ok.errors).toEqual([]);
    expect((await vault.dueForReview("2026-10-24")).due).toEqual([
      { path, title: "Layered Marking", concept: true, coachId: "c-concept", nextReview: "2026-10-24", mastery: "tier1_passed", firstReview: false, book: "Notes That Work", group: null, topic: null },
    ]);
    // The coach_id insert keeps the concept fields readable.
    expect(conceptOf((await vault.note(path!))!)!.problems).toEqual([]);
  });
});

describe("find_passages", () => {
  it("returns pages of raw text, leaving distilled notes and the index out, optionally within one work", async () => {
    const hits = await vault.findPassages("summarize a note just in time");
    expect(hits[0]).toMatchObject({ note: DISTILL, source: "Notes That Work", title: "Chapter 8: Distill" });
    expect(hits.map(h => h.page)).toEqual(expect.arrayContaining([137, 138]));
    expect(hits.every(h => h.note.startsWith("3.Resources/0.Raw/") && h.note !== INDEX)).toBe(true);

    expect((await vault.findPassages("information hoarding"))[0]).toMatchObject({ note: "3.Resources/0.Raw/Articles/Clipped.md", page: null });
    expect(await vault.findPassages("information hoarding", { within: WORK })).toEqual([]);
  });
});
