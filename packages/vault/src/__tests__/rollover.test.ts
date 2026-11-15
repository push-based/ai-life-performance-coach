import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { rollOver } from "../rollover.js";
import { nextPeriod, periodOf, executeWrites } from "../plans.js";
import { scanVault } from "../scan.js";
import { createVault } from "../vault.js";
import { planning } from "../planning.js";

let dir: string;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
const read = (rel: string) => readFileSync(join(dir, rel), "utf-8");

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "rollover-")); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

function seed(): void {
  put("1.Projects/Expo2026/Expo2026.md", "---\nstatus: in-progress\n---\n# Expo2026\n");
  put("1.Projects/Expo2026/Workstreams/Marketing.md", [
    "---", "status: in-progress", "---",
    "- [ ] Workshop posters #S ⏳ 2026-11-04",
    "- [ ] Panel posters #M #slipped/2026-W44 🔼 ⏳ 2026-11-02 ^pp",
    "- [ ] Urgent thing 🔺 ⏳ 2026-11-05",
    "- [x] Badge design ⏳ 2026-11-03 ✅ 2026-11-03",
    "- [ ] Next week already ⏳ 2026-11-10",
    "- [ ] Not scheduled",
    "",
  ].join("\n"));
  put("2.Areas/Health.md", "# Health\n");
  put("Plans/Monthly/2026-11.md", "## Goals\n\n- [ ] Posters printed [[Marketing]] ^posters-printed\n");
  put("Plans/Weekly/2026-W45.md", [
    "# 2026-W45", "", "## Goals", "",
    "- [ ] All posters out [[Marketing]] #M ↑ [[2026-11#^posters-printed]] ^all-posters-out",
    "- [x] Sleep eight hours [[Health]] ^sleep",
    "- [ ] Run twice [[Health]] #slipped/2026-W44 ^run-twice",
    "", "## Ad-hoc", "",
    "- [ ] Call the venue [[Expo2026]] ⏳ 2026-11-06",
    "- [ ] Water the plants [[Health]]",
    "",
  ].join("\n"));
}

describe("nextPeriod", () => {
  it("steps each level across its boundary", () => {
    expect(nextPeriod(periodOf("2026-W53")!).period).toBe("2027-W01");
    expect(nextPeriod(periodOf("2026-12")!).period).toBe("2027-01");
    expect(nextPeriod(periodOf("2026-Q4")!).period).toBe("2027-Q1");
    expect(nextPeriod(periodOf("2026-W45")!).period).toBe("2026-W46");
    expect(nextPeriod(periodOf("2026")!).period).toBe("2027");
  });
});

describe("roll_over", () => {
  it("reschedules open tasks where they stand, raised and tagged, and copies open goals into the next plan", async () => {
    seed();
    const plan = rollOver(dir, await scanVault(dir), "2026-W45");
    expect(plan.errors).toEqual([]);
    expect(plan.to?.period).toBe("2026-W46");
    expect(plan.tasks.map(e => [e.fileLine, e.after])).toEqual([
      [4, "- [ ] Workshop posters #S #slipped/2026-W45 ⏳ 2026-11-09 ⏫"],
      [5, "- [ ] Panel posters #M #slipped/2026-W44 #slipped/2026-W45 ⏳ 2026-11-09 ⏫ ^pp"],
      [6, "- [ ] Urgent thing #slipped/2026-W45 🔺 ⏳ 2026-11-09"],
      [11, "- [ ] Call the venue [[Expo2026]] #slipped/2026-W45 ⏳ 2026-11-09 ⏫"],
    ]);
    expect(plan.goals).toEqual([{ text: "All posters out [[Marketing]]", id: "all-posters-out" }, { text: "Run twice [[Health]]", id: "run-twice" }]);
    expect(plan).toMatchObject({ plan: "Plans/Weekly/2026-W46.md", creates: true });
    expect(plan.warnings).toEqual(['"Water the plants [[Health]]" in Plans/Weekly/2026-W45.md is not scheduled, so it stays where it is']);

    await executeWrites(dir, plan);
    const week = read("Plans/Weekly/2026-W46.md");
    expect(week).toContain("## Goals\n\n- [ ] All posters out [[Marketing]] #M #slipped/2026-W45 ↑ [[2026-11#^posters-printed]] ⏫ ^all-posters-out\n- [ ] Run twice [[Health]] #slipped/2026-W44 #slipped/2026-W45 ⏫ ^run-twice\n");

    expect(read("Plans/Weekly/2026-W45.md")).toContain("- [ ] All posters out [[Marketing]] #M ↑ [[2026-11#^posters-printed]] ^all-posters-out");
    const p = planning(dir, await scanVault(dir));
    const panel = p.tasks.find(t => t.text === "Panel posters")!;
    expect(panel).toMatchObject({ scheduled: "2026-11-09", priority: "high", slipped: ["2026-W44", "2026-W45"], blockId: "pp" });
    expect(p.tasks.find(t => t.text === "Badge design")).toMatchObject({ scheduled: "2026-11-03", state: "done" });
  });

  it("leaves repeating tasks where they stand: a missed habit day is not a slip", async () => {
    seed();
    put("1.Projects/Promise/Workstreams/Morning.md", "- [ ] Up at 6:00 🔁 every day ⏳ 2026-11-06\n- [ ] Read 🔁 every day\n");
    const plan = rollOver(dir, await scanVault(dir), "2026-W45");
    expect(plan.tasks.map(e => e.note)).not.toContain("1.Projects/Promise/Workstreams/Morning.md");
    expect(plan.warnings.join("\n")).not.toContain("Read");
  });

  it("is safe to run twice", async () => {
    seed();
    const vault = createVault(dir);
    expect((await vault.rollOver("2026-W45", true)).executed).toBe(true);
    const again = await vault.rollOver("2026-W45", false);
    expect(again.tasks).toEqual([]);
    expect(again.goals).toEqual([]);
    expect(again.warnings).toEqual([
      'goal "All posters out [[Marketing]]" was already rolled into 2026-W46',
      'goal "Run twice [[Health]]" was already rolled into 2026-W46',
      '"Water the plants [[Health]]" in Plans/Weekly/2026-W45.md is not scheduled, so it stays where it is',
      "nothing open in 2026-W45 to roll over",
    ]);
  });

  it("rolls a month into the next month and warns when a goal's parent does not reach it", async () => {
    seed();
    put("Plans/Monthly/2026-12.md", "## Goals\n\n- [ ] Retro written [[Expo2026]] ↑ [[2026-Q4#^expo]] ^retro-written\n");
    const plan = rollOver(dir, await scanVault(dir), "2026-12");
    expect(plan.to?.period).toBe("2027-01");
    expect(plan.warnings).toContain('goal "Retro written [[Expo2026]]": its parent in 2026-Q4 does not overlap 2027-01; link a new parent if it moved on');
    expect(plan.goals).toEqual([{ text: "Retro written [[Expo2026]]", id: "retro-written" }]);
  });

  it("adds to an existing next plan, keeping block ids unique", async () => {
    seed();
    put("Plans/Weekly/2026-W46.md", "# 2026-W46\n\n## Goals\n\n- [ ] Something else [[Health]] ^all-posters-out\n\n## Review\n");
    const plan = rollOver(dir, await scanVault(dir), "2026-W45");
    expect(plan.creates).toBe(false);
    expect(plan.goals[0].id).toBe("all-posters-out-2");
    expect(plan.writes["Plans/Weekly/2026-W46.md"]).toMatch(/\^all-posters-out\n- \[ \] All posters out .* \^all-posters-out-2\n- \[ \] Run twice .*\n\n## Review\n$/);
  });

  it("refuses a year, a day and a non-period", async () => {
    seed();
    const notes = await scanVault(dir);
    expect(rollOver(dir, notes, "2026").errors[0]).toMatch(/a year does not roll over/);
    expect(rollOver(dir, notes, "2026-11-03").errors[0]).toMatch(/a day carries no slip/);
    expect(rollOver(dir, notes, "last week").errors[0]).toMatch(/is not a period/);
  });

  it("previews by default and writes nothing", async () => {
    seed();
    const before = read("1.Projects/Expo2026/Workstreams/Marketing.md");
    const r = await createVault(dir).rollOver("2026-W45", false);
    expect(r.executed).toBe(false);
    expect(read("1.Projects/Expo2026/Workstreams/Marketing.md")).toBe(before);
    expect(existsSync(join(dir, "Plans/Weekly/2026-W46.md"))).toBe(false);
  });
});

describe("roll_over edge cases", () => {
  it("keeps other emoji in a goal's text whole", async () => {
    put("2.Areas/Reading.md", "# Reading\n");
    put("Plans/Weekly/2026-W45.md", "## Goals\n\n- [ ] 📚 Read 3 books [[Reading]] 🔼 ^read\n");
    const plan = rollOver(dir, await scanVault(dir), "2026-W45");
    expect(plan.errors).toEqual([]);
    expect(plan.writes["Plans/Weekly/2026-W46.md"]).toContain("- [ ] 📚 Read 3 books [[Reading]] #slipped/2026-W45 ⏫ ^read");
  });

  it("rolls a task with a custom open status such as [/]", async () => {
    put("1.Projects/Expo2026/Workstreams/Marketing.md", "- [/] Draft slides ⏳ 2026-11-04\n");
    const plan = rollOver(dir, await scanVault(dir), "2026-W45");
    expect(plan.errors).toEqual([]);
    expect(plan.tasks.map(t => t.after)).toEqual(["- [/] Draft slides #slipped/2026-W45 ⏳ 2026-11-09 ⏫"]);
  });

  it("reads and edits a CRLF note, keeping its line endings", async () => {
    put("1.Projects/Expo2026/Workstreams/Marketing.md", "---\r\nstatus: todo\r\n---\r\n- [ ] Print badges ⏳ 2026-11-04\r\n- [x] Done ✅ 2026-11-03\r\n");
    const notes = await scanVault(dir);
    expect(planning(dir, notes).tasks.map(t => t.text)).toEqual(["Print badges", "Done"]);
    const plan = rollOver(dir, notes, "2026-W45");
    await executeWrites(dir, plan);
    expect(read("1.Projects/Expo2026/Workstreams/Marketing.md"))
      .toBe("---\r\nstatus: todo\r\n---\r\n- [ ] Print badges #slipped/2026-W45 ⏳ 2026-11-09 ⏫\r\n- [x] Done ✅ 2026-11-03\r\n");
  });

  it("leaves an archived project's open tasks where they were left", async () => {
    put("4.Archive/Old/Old.md", "---\nstatus: done\n---\n- [ ] Send invoice ⏳ 2026-11-04\n");
    const plan = rollOver(dir, await scanVault(dir), "2026-W45");
    expect(plan.tasks).toEqual([]);
  });

  it("adds rolled goals on top of a task it rescheduled inside the next plan", async () => {
    put("2.Areas/Health.md", "# Health\n");
    put("Plans/Weekly/2026-W45.md", "## Goals\n\n- [ ] Run twice [[Health]] ^run\n");
    put("Plans/Weekly/2026-W46.md", "## Goals\n\n## Ad-hoc\n\n- [ ] Book a physio [[Health]] ⏳ 2026-11-06\n");
    const plan = rollOver(dir, await scanVault(dir), "2026-W45");
    expect(plan.errors).toEqual([]);
    const next = plan.writes["Plans/Weekly/2026-W46.md"];
    expect(next).toContain("- [ ] Run twice [[Health]] #slipped/2026-W45 ⏫ ^run");
    expect(next).toContain("- [ ] Book a physio [[Health]] #slipped/2026-W45 ⏳ 2026-11-09 ⏫");
  });
});
