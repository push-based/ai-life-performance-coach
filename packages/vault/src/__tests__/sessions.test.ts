import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { insertCoachId, declaresCoachId } from "../identity.js";
import { renderSession, parseSession, type SessionRecord } from "../sessions.js";
import { histories } from "../mastery.js";
import { tier2Payload, PAYLOAD_ITEM_KEYS, PAYLOAD_OPTIONAL_KEYS } from "../payload.js";
import { createVault, type Vault } from "../vault.js";
import type { RecordSessionInput } from "../record.js";

let dir: string;
let vault: Vault;
let ids: number;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
const read = (rel: string) => readFileSync(join(dir, rel), "utf-8");

const SENTINEL = "SENTINEL-7f3a: the private body line that must never leave the vault";

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vault-sessions-"));
  put("3.Resources/TypeScript/Event loop.md", `# Event loop\n\nMicrotasks run before the next macrotask.\n${SENTINEL}\n`);
  put("3.Resources/LLM/Judge.md", "---\ntags: [llm]\n---\nA judge scores claims.\n");
  put("1.Projects/Talk/Outline.md", "Outline.\n");
  ids = 0;
  vault = createVault(dir, {
    now: () => new Date("2026-10-24T10:00:00.000Z"),
    newSessionId: () => `s-test-${++ids}`,
    newCoachId: () => `c-test-${++ids}`,
  });
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

const item = (note: string, over: Partial<RecordSessionInput["items"][number]> = {}) => ({
  note, challenge: "Explain why a resolved promise callback runs before setTimeout.", answer: "Microtasks drain first.",
  verdict: "pass" as const, next_review: "2026-11-01", ...over,
});

describe("insertCoachId", () => {
  it("adds the key as the first line of existing frontmatter and changes nothing else", () => {
    const before = "---\ntags: [llm]\ntitle: \"X\"\n---\nBody\n\n- list\n";
    expect(insertCoachId(before, "c-1")).toBe("---\ncoach_id: \"c-1\"\ntags: [llm]\ntitle: \"X\"\n---\nBody\n\n- list\n");
  });

  it("creates a block holding only the key when the note has none", () => {
    expect(insertCoachId("# Title\n\nBody\n", "c-1")).toBe("---\ncoach_id: \"c-1\"\n---\n# Title\n\nBody\n");
  });

  it("keeps CRLF line endings and handles an empty block", () => {
    expect(insertCoachId("---\r\na: 1\r\n---\r\nBody\r\n", "c-1")).toBe("---\r\ncoach_id: \"c-1\"\r\na: 1\r\n---\r\nBody\r\n");
    expect(insertCoachId("---\n---\nBody\n", "c-1")).toBe("---\ncoach_id: \"c-1\"\n---\nBody\n");
  });

  it("treats a leading horizontal rule without a closing fence as body", () => {
    expect(insertCoachId("---\nNot frontmatter\n", "c-1")).toBe("---\ncoach_id: \"c-1\"\n---\n---\nNot frontmatter\n");
  });

  it("refuses a note that already declares coach_id", () => {
    expect(declaresCoachId("---\ncoach_id: 42\n---\n")).toBe(true);
    expect(() => insertCoachId("---\ncoach_id: c-0\n---\n", "c-1")).toThrow(/already declares/);
  });
});

describe("session files", () => {
  const record: SessionRecord = {
    version: 1, kind: "spar", session_id: "s-1", tier: 1, date: "2026-10-24", recorded_at: "2026-10-24T10:00:00.000Z",
    items: [{ coach_id: "c-1", note_path: "3.Resources/a.md", title: "A", challenge: "Why?\n```json coach-session\n{}\n```", answer: "Because.", verdict: "fail", gaps: ["timing"], next_review: "2026-10-25" }],
  };

  it("round-trips through render and parse, even with a fence inside the challenge", () => {
    expect(parseSession(renderSession(record))).toEqual(record);
  });

  it("reads the record, not the prose: an edited heading changes nothing", () => {
    const edited = renderSession(record).replace("## A", "## Renamed by hand");
    expect(parseSession(edited)).toEqual(record);
  });

  it("rejects a file without a valid record", () => {
    expect(() => parseSession("# nothing")).toThrow(/no json coach-session/);
    expect(() => parseSession("```json coach-session\n{ nope\n```")).toThrow(/not JSON/);
    expect(() => parseSession(`\`\`\`json coach-session\n${JSON.stringify({ ...record, tier: 3 })}\n\`\`\``)).toThrow(/tier/);
  });
});

describe("histories", () => {
  const s = (id: string, tier: 1 | 2, at: string, verdict: "pass" | "fail", next = "2026-11-01"): SessionRecord => ({
    version: 1, kind: "spar", session_id: id, tier, date: at.slice(0, 10), recorded_at: at,
    items: [{ coach_id: "c-1", note_path: "p", title: "t", challenge: "c", answer: "a", verdict, gaps: [], next_review: next }],
  });

  it("derives the four mastery states from the latest verdict per tier", () => {
    expect(histories([s("a", 1, "2026-01-01T00:00:00Z", "fail")]).get("c-1")!.mastery).toBe("attempted");
    expect(histories([s("a", 1, "2026-01-01T00:00:00Z", "fail"), s("b", 1, "2026-01-02T00:00:00Z", "pass")]).get("c-1")!.mastery).toBe("tier1_passed");
    expect(histories([s("a", 1, "2026-01-01T00:00:00Z", "pass"), s("b", 2, "2026-01-02T00:00:00Z", "fail")]).get("c-1")!.mastery).toBe("tier1_passed");
    expect(histories([s("a", 1, "2026-01-01T00:00:00Z", "fail"), s("b", 2, "2026-01-02T00:00:00Z", "fail")]).get("c-1")!.mastery).toBe("attempted");
    expect(histories([s("a", 2, "2026-01-01T00:00:00Z", "pass"), s("b", 1, "2026-01-02T00:00:00Z", "fail")]).get("c-1")!.mastery).toBe("tier2_passed");
    expect(histories([s("a", 2, "2026-01-01T00:00:00Z", "pass"), s("b", 2, "2026-01-02T00:00:00Z", "fail"), s("c", 1, "2026-01-03T00:00:00Z", "pass")]).get("c-1")!.mastery).toBe("tier1_passed");
  });

  it("takes the next review date from the latest session at any tier", () => {
    const h = histories([s("a", 1, "2026-01-01T00:00:00Z", "pass", "2026-02-01"), s("b", 2, "2026-01-02T00:00:00Z", "pass", "2026-03-01")]).get("c-1")!;
    expect(h).toEqual({
      mastery: "tier2_passed", nextReview: "2026-03-01", lastSession: "b", sessions: 2,
      entries: [
        { session_id: "a", tier: 1, date: "2026-01-01", verdict: "pass", gaps: [], next_review: "2026-02-01" },
        { session_id: "b", tier: 2, date: "2026-01-02", verdict: "pass", gaps: [], next_review: "2026-03-01" },
      ],
    });
  });
});

describe("recordSession", () => {
  it("previews without writing anything", async () => {
    const before = read("3.Resources/TypeScript/Event loop.md");
    const plan = await vault.recordSession({ tier: 1, items: [item("3.Resources/TypeScript/Event loop.md")] }, false);
    expect(plan).toMatchObject({ errors: [], executed: false, sessionFile: "Coach/sessions/s-test-1.md" });
    expect(plan.newIds).toEqual([{ path: "3.Resources/TypeScript/Event loop.md", coach_id: "c-test-2" }]);
    expect(read("3.Resources/TypeScript/Event loop.md")).toBe(before);
    expect(existsSync(join(dir, "Coach"))).toBe(false);
  });

  it("writes the session and gives a first-time note a coach_id, its only edit", async () => {
    const before = read("3.Resources/LLM/Judge.md");
    const r = await vault.recordSession({ tier: 1, items: [item("3.Resources/LLM/Judge.md", { verdict: "fail", gaps: ["calibration"] })] }, true);
    expect(r.executed).toBe(true);
    expect(read("3.Resources/LLM/Judge.md")).toBe(before.replace("---\n", "---\ncoach_id: \"c-test-2\"\n"));
    const session = parseSession(read("Coach/sessions/s-test-1.md"));
    expect(session).toMatchObject({ session_id: "s-test-1", tier: 1, date: "2026-10-24", items: [{ coach_id: "c-test-2", verdict: "fail", gaps: ["calibration"] }] });
  });

  it("covers several notes in one session and reuses an existing coach_id", async () => {
    await vault.recordSession({ tier: 1, items: [item("3.Resources/LLM/Judge.md")] }, true);
    const r = await vault.recordSession({ tier: 2, items: [{ ...item("x"), note: undefined, coach_id: "c-test-2" }, item("3.Resources/TypeScript/Event loop.md")] }, true);
    expect(r.errors).toEqual([]);
    expect(r.newIds.map(n => n.path)).toEqual(["3.Resources/TypeScript/Event loop.md"]);
    expect(r.record!.items.map(i => i.coach_id)).toEqual(["c-test-2", "c-test-4"]);
  });

  it("refuses notes outside 3.Resources, unknown notes, duplicates, ambiguous names and bad dates", async () => {
    const r = await vault.recordSession({ tier: 1, items: [
      item("1.Projects/Talk/Outline.md"),
      item("3.Resources/Nope.md"),
      item("3.Resources/LLM/Judge.md"),
      item("3.Resources/LLM/Judge.md"),
      { ...item("3.Resources/TypeScript/Event loop.md"), coach_id: "c-x" },
    ] }, true);
    expect(r.executed).toBe(false);
    expect(r.errors.join("\n")).toMatch(/not under 3\.Resources[\s\S]*no note 3\.Resources\/Nope\.md[\s\S]*appears twice[\s\S]*not both or neither/);
    const bad = await vault.recordSession({ tier: 1, items: [item("3.Resources/LLM/Judge.md", { next_review: "next week" })] }, true);
    expect(bad.errors.join()).toMatch(/next_review/);
    expect(readdirSync(dir)).not.toContain("Coach");
  });

  it("never overwrites an existing session file", async () => {
    put("Coach/sessions/s-test-1.md", "mine");
    const r = await vault.recordSession({ tier: 1, items: [item("3.Resources/LLM/Judge.md")] }, true);
    expect(r.errors.join()).toMatch(/already exists/);
    expect(read("Coach/sessions/s-test-1.md")).toBe("mine");
    expect(read("3.Resources/LLM/Judge.md")).not.toContain("coach_id");
  });
});

describe("Phase 2 exit: history follows the note, not its path", () => {
  it("keeps every session resolving to its note after the note is moved by hand", async () => {
    await vault.recordSession({ tier: 1, items: [item("3.Resources/TypeScript/Event loop.md", { next_review: "2026-10-20" })] }, true);
    await vault.recordSession({ tier: 2, items: [item("3.Resources/TypeScript/Event loop.md", { next_review: "2026-10-22" })] }, true);

    // The user drags the note to another Resources folder in Obsidian and renames it.
    mkdirSync(join(dir, "3.Resources/JavaScript"), { recursive: true });
    renameSync(join(dir, "3.Resources/TypeScript/Event loop.md"), join(dir, "3.Resources/JavaScript/The event loop.md"));

    const due = await vault.dueForReview("2026-10-24");
    expect(due.due).toEqual([{ path: "3.Resources/JavaScript/The event loop.md", title: "Event loop", concept: false, coachId: "c-test-2", nextReview: "2026-10-22", mastery: "tier2_passed", firstReview: false, book: null, group: null, topic: null }]);
    expect(due.orphaned).toEqual([]);
    const { notes } = await vault.notesWithHistory();
    expect(notes.find(n => n.path === "3.Resources/JavaScript/The event loop.md")!.history.sessions).toBe(2);
  });

  it("drops a note from due_for_review when it leaves Resources, keeping its history", async () => {
    await vault.recordSession({ tier: 1, items: [item("3.Resources/LLM/Judge.md", { next_review: "2026-10-01" })] }, true);
    mkdirSync(join(dir, "4.Archive"), { recursive: true });
    renameSync(join(dir, "3.Resources/LLM/Judge.md"), join(dir, "4.Archive/Judge.md"));
    expect((await vault.dueForReview("2026-10-24")).due).toEqual([]);
    const { notes } = await vault.notesWithHistory();
    expect(notes.find(n => n.path === "4.Archive/Judge.md")!.history.mastery).toBe("tier1_passed");
  });

  it("lists unsparred Resources notes, not-yet-due notes nowhere, and orphaned sessions", async () => {
    await vault.recordSession({ tier: 1, items: [item("3.Resources/LLM/Judge.md", { next_review: "2026-12-01" })] }, true);
    let due = await vault.dueForReview("2026-10-24");
    expect(due.due).toEqual([]);
    expect(due.unsparred.map(n => n.path)).toEqual(["3.Resources/TypeScript/Event loop.md"]);
    rmSync(join(dir, "3.Resources/LLM/Judge.md"));
    put("Coach/sessions/broken.md", "no record here");
    due = await vault.dueForReview("2026-10-24");
    expect(due.orphaned).toEqual([{ coachId: "c-test-2", lastSession: "s-test-1" }]);
    expect(due.invalidSessions).toEqual([{ file: "Coach/sessions/broken.md", error: "no json coach-session block" }]);
  });
});

describe("Phase 2 exit: the judge-tier payload leaks nothing but challenges and answers", () => {
  it("holds exactly the allowlisted keys and never the planted body line", async () => {
    const r = await vault.recordSession({ tier: 1, items: [item("3.Resources/TypeScript/Event loop.md"), item("3.Resources/LLM/Judge.md")] }, true);
    expect(read("3.Resources/TypeScript/Event loop.md")).toContain(SENTINEL);

    const payload = await vault.tier2Payload(r.record!.session_id);
    expect(Object.keys(payload!)).toEqual(["items"]);
    for (const it of payload!.items) expect(Object.keys(it)).toEqual([...PAYLOAD_ITEM_KEYS]);

    const wire = JSON.stringify(payload);
    for (const secret of [SENTINEL, "Microtasks run before the next macrotask", "3.Resources", "Event loop", "Judge", "c-test-", "pass", "2026-11-01"]) {
      expect(wire, secret).not.toContain(secret);
    }
    expect(await vault.tier2Payload("s-missing")).toBeNull();
  });

  it("adds core assertions only on request, for concept notes only, and still no body, buzzword or passage", async () => {
    put("3.Resources/Concepts/Microtasks.md", [
      "---", 'type: "concept"', "core_assertions:", '  - "Microtasks drain before the next macrotask."', "forbidden_buzzwords:", '  - "event loop"',
      "source_passages:", '  - quote: "a planted passage quote"', '    note: "3.Resources/0.Raw/x.md"', "---", "", SENTINEL, "",
    ].join("\n"));
    const r = await vault.recordSession({ tier: 1, items: [item("3.Resources/Concepts/Microtasks.md"), item("3.Resources/LLM/Judge.md")] }, true);
    const id = r.record!.session_id;

    const plain = await vault.tier2Payload(id);
    for (const it of plain!.items) expect(Object.keys(it)).toEqual([...PAYLOAD_ITEM_KEYS]);

    const withAssertions = await vault.tier2Payload(id, { includeAssertions: true });
    for (const it of withAssertions!.items) expect(Object.keys(it)).toEqual([...PAYLOAD_ITEM_KEYS, ...PAYLOAD_OPTIONAL_KEYS]);
    expect(withAssertions!.items.map(i => i.core_assertions)).toEqual([["Microtasks drain before the next macrotask."], []]);
    const wire = JSON.stringify(withAssertions);
    for (const secret of [SENTINEL, "event loop", "a planted passage quote", "3.Resources", "c-test-"]) expect(wire, secret).not.toContain(secret);
  });

  it("is built from the allowlist even when a record carries extra fields", () => {
    const record = {
      version: 1, session_id: "s", tier: 1, date: "2026-10-24", recorded_at: "2026-10-24T00:00:00Z",
      items: [{ coach_id: "c", note_path: "p", title: "t", challenge: "q", answer: "a", verdict: "pass", gaps: [], next_review: "2026-10-25", body: SENTINEL }],
    } as unknown as SessionRecord;
    expect(tier2Payload(record)).toEqual({ items: [{ challenge: "q", answer: "a" }] });
  });
});
