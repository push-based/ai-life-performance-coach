import { readFileSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, posix } from "node:path";
import { insertCoachId, declaresCoachId } from "./identity.js";
import { renderSession, sessionPath, isDate, SESSION_KINDS, ELABORATION_KINDS, type SessionRecord, type SessionItem, type SessionKind, type Tier, type Verdict, type GenerateDetail, type Elaboration, type TeachDetail, type TeachTurn, type AssertionMark } from "./sessions.js";
import { conceptOf } from "./concept.js";
import { climbOf, chaptersOf, isConceptNote, sharesRun, wordCount, withClimb, structureOf, structureLabels, drawnGroupsIn, MIN_DRAWN_GROUPS, MIN_ATTEMPT_WORDS, CLIMB_STEPS, type ClimbSteps } from "./climb.js";
import { PARA_FOLDERS } from "./para.js";
import type { VaultNote } from "./scan.js";

export interface SessionItemInput {

  note?: string;
  coach_id?: string;

  challenge?: string;

  answer?: string;

  verdict?: Verdict;
  gaps?: string[];

  next_review?: string;
  generate?: { attempted_at: string; revealed_at: string; idk?: boolean; marks: { assertion: string; mark: AssertionMark; correction?: string }[] };
  elaborate?: { answers: { kind: Elaboration["kind"]; question: string; answer: string; links?: string[]; named?: string }[] };
  teach?: { turns: TeachTurn[]; misconception: { assertion: number; text: string }; misconception_corrected: boolean; unresolved_terms?: string[] };
}

export interface RecordSessionInput {

  kind?: SessionKind;
  tier: Tier;

  date?: string;
  items: SessionItemInput[];
}

export interface NoteChange {
  path: string;
  original: string;
  content: string;
}

export interface RecordPlan {
  errors: string[];

  warnings: string[];
  record: SessionRecord | null;

  sessionFile: string | null;

  newIds: { path: string; coach_id: string }[];

  climbs: { path: string; climb: Record<string, string | null> }[];

  elaborations: { path: string; text: string }[];

  changes: NoteChange[];
}

export interface RecordContext {
  root: string;
  notes: VaultNote[];
  sessions: SessionRecord[];
  now: Date;
  newSessionId: () => string;
  newCoachId: () => string;

  exists: (rel: string) => boolean;
}

export function localDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const CAUSAL = /\b(because|so that|otherwise|therefore|since|which means|that means|so|thus|hence|in order to|or else)\b/i;
const iso = (s: unknown) => typeof s === "string" && !Number.isNaN(Date.parse(s));
const strings = (xs: unknown) => Array.isArray(xs) && xs.every(x => typeof x === "string");

function noteText(note: VaultNote): string {
  const c = conceptOf(note);
  return [note.body, ...(c?.fields.coreAssertions ?? []), ...(c?.fields.passages.map(p => p.quote) ?? [])].join("\n");
}

function resolveNote(notes: VaultNote[], ref: string): VaultNote | undefined {
  const r = ref.replace(/^\[\[|\]\]$/g, "").split("|")[0].split("#")[0].trim();
  return notes.find(n => n.path === r || n.path === `${r}.md`) ?? notes.find(n => posix.basename(n.path, ".md") === r || n.title === r);
}

const wikilink = (path: string) => `[[${path.replace(/\.md$/, "")}|${posix.basename(path, ".md")}]]`;

function renderElaborations(date: string, answers: Elaboration[]): string {
  const label = { why: "Why", connect: "Connect", apply: "Apply" } as const;
  const lines = [`### ${date}`, ""];
  for (const a of answers) {
    const refs = [...a.links.map(wikilink), ...(a.named ? [a.named] : [])];
    lines.push(`- **${label[a.kind]}:** ${a.answer.trim().replace(/\s*\n\s*/g, " ")}${refs.length ? ` (${refs.join(", ")})` : ""}`);
  }
  return lines.join("\n");
}

export function appendElaborations(content: string, block: string): string {
  const nl = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const at = lines.findIndex(l => /^## My elaborations\s*$/.test(l));
  const blockLines = block.split("\n");
  if (at < 0) {
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    return [...lines, "", "## My elaborations", "", ...blockLines, ""].join(nl);
  }
  let end = lines.findIndex((l, i) => i > at && /^#{1,2} /.test(l));
  if (end < 0) end = lines.length;
  let last = end;
  while (last > at + 1 && lines[last - 1] === "") last--;
  const out = [...lines.slice(0, last), "", ...blockLines, ...(end < lines.length ? [""] : []), ...lines.slice(end)];
  if (end === lines.length) out.push("");
  return out.join(nl);
}

function checkGenerate(at: string, it: SessionItemInput, note: VaultNote, errors: string[], warnings: string[]): GenerateDetail | null {
  const g = it.generate;
  if (!g) { errors.push(`${at}: a Generate item needs generate: attempted_at, revealed_at and marks`); return null; }
  if (!iso(g.attempted_at) || !iso(g.revealed_at)) { errors.push(`${at}: attempted_at and revealed_at must be ISO timestamps`); return null; }
  if (!(Date.parse(g.attempted_at) < Date.parse(g.revealed_at))) warnings.push(`${at}: the answer was revealed before the attempt was saved, so this attempt is recorded but does not count for Generate`);
  const idk = g.idk === true;
  const structure = structureOf(note);
  if (!idk && structure && drawnGroupsIn(it.answer ?? "") < MIN_DRAWN_GROUPS) errors.push(`${at}: a drawing is an attempt with at least ${MIN_DRAWN_GROUPS} named groups that each hold a concept, or /idk (idk: true)`);
  if (!idk && !structure && wordCount(it.answer ?? "") < MIN_ATTEMPT_WORDS) errors.push(`${at}: an attempt is at least ${MIN_ATTEMPT_WORDS} words, or /idk (idk: true)`);
  if (!Array.isArray(g.marks)) { errors.push(`${at}: marks must be a list`); return null; }
  const assertions = structure ? structureLabels(structure) : conceptOf(note)?.fields.coreAssertions ?? null;
  const seen = new Set<string>();
  for (const [n, m] of g.marks.entries()) {
    if (!["got it", "wrong", "missed"].includes(m?.mark)) errors.push(`${at}: marks[${n}].mark must be got it, wrong or missed`);
    if (typeof m?.assertion !== "string" || !m.assertion.trim()) { errors.push(`${at}: marks[${n}] names no assertion`); continue; }
    if (assertions && !assertions.includes(m.assertion)) errors.push(`${at}: marks[${n}] "${m.assertion}" is not ${structure ? "a group or edge" : "a core assertion"} of ${note.path}`);
    if (seen.has(m.assertion)) errors.push(`${at}: "${m.assertion}" is marked twice`);
    seen.add(m.assertion);
    if (m.mark === "wrong" && !m.correction?.trim()) errors.push(`${at}: "${m.assertion}" is marked wrong and needs a correction in the learner's own words`);
  }
  if (assertions) for (const a of assertions) if (!seen.has(a)) errors.push(`${at}: ${structure ? "" : "core assertion "}"${a}" is not marked; mark each one got it, wrong or missed`);
  if (!assertions && !g.marks.length) errors.push(`${at}: mark at least one point of the chapter got it, wrong or missed`);
  return { attempted_at: g.attempted_at, revealed_at: g.revealed_at, idk, marks: g.marks.map(m => ({ assertion: m.assertion, mark: m.mark, ...(m.correction?.trim() ? { correction: m.correction.trim() } : {}) })) };
}

function checkElaborate(at: string, it: SessionItemInput, note: VaultNote, notes: VaultNote[], errors: string[]): Elaboration[] | null {
  const answers = it.elaborate?.answers;
  if (!Array.isArray(answers)) { errors.push(`${at}: an Elaborate item needs elaborate.answers`); return null; }
  const kinds = answers.map(a => a?.kind);
  for (const k of ELABORATION_KINDS) if (kinds.filter(x => x === k).length !== 1) errors.push(`${at}: answer each of why, connect and apply exactly once`);
  const text = noteText(note);
  const out: Elaboration[] = [];
  for (const [n, a] of answers.entries()) {
    const where = `${at}: answers[${n}] (${a?.kind})`;
    if (!(ELABORATION_KINDS as readonly string[]).includes(a?.kind)) { errors.push(`${where}: kind must be why, connect or apply`); continue; }
    if (typeof a.question !== "string" || !a.question.trim()) errors.push(`${where}: question is empty`);
    else if (sharesRun(a.question, text)) errors.push(`${where}: the question repeats the note's words and so gives the answer away`);
    if (typeof a.answer !== "string" || !a.answer.trim()) { errors.push(`${where}: answer is empty`); continue; }
    if (sharesRun(a.answer, text)) errors.push(`${where}: the answer copies the note or its source; put it in your own words`);
    const links: string[] = [];
    for (const l of a.links ?? []) {
      const target = typeof l === "string" ? resolveNote(notes, l) : undefined;
      if (!target) { errors.push(`${where}: no note ${String(l)}`); continue; }
      if (target.path === note.path) { errors.push(`${where}: a link to the concept note itself connects it to nothing`); continue; }
      if (!links.includes(target.path)) links.push(target.path);
    }
    const named = typeof a.named === "string" && a.named.trim() ? a.named.trim() : undefined;
    if (a.kind === "why" && !CAUSAL.test(a.answer)) errors.push(`${where}: a why answer gives a reason, with because, so that, otherwise or the like, and what follows from it`);
    if (a.kind === "connect" && !links.length && !named) errors.push(`${where}: link another note in the vault or name a thing from your own work`);
    if (a.kind === "apply" && !named && !links.some(p => p.startsWith(`${PARA_FOLDERS.projects}/`))) errors.push(`${where}: name a concrete place (a project, file, team or decision) or link a 1.Projects note`);
    out.push({ kind: a.kind, question: a.question.trim(), answer: a.answer.trim(), links, ...(named ? { named } : {}) });
  }
  return out;
}

function checkTeach(at: string, it: SessionItemInput, note: VaultNote, errors: string[]): TeachDetail | null {
  const t = it.teach;
  if (!t || !Array.isArray(t.turns)) { errors.push(`${at}: a Teach item needs teach.turns, misconception and misconception_corrected`); return null; }
  const assertions = conceptOf(note)?.fields.coreAssertions ?? [];
  if (t.turns.some(x => (x?.role !== "learner" && x?.role !== "student") || typeof x.text !== "string")) { errors.push(`${at}: every turn has role learner or student and a text`); return null; }
  const learner = t.turns.filter(x => x.role === "learner").map(x => x.text).join("\n");
  if (!learner.trim()) errors.push(`${at}: the learner gave no lesson`);
  const m = t.misconception;
  if (!m || !Number.isInteger(m.assertion) || m.assertion < 0 || m.assertion >= assertions.length) errors.push(`${at}: misconception.assertion must be the index of one of the note's ${assertions.length} core assertions`);
  if (!m || typeof m.text !== "string" || !m.text.trim()) errors.push(`${at}: misconception.text is empty`);
  const text = noteText(note);
  for (const [n, s] of t.turns.entries()) {
    if (s.role !== "student") continue;
    if (sharesRun(s.text, text) && !sharesRun(s.text, `${learner}\n${m?.text ?? ""}`)) errors.push(`${at}: turns[${n}]: the student repeats the note's words the learner never said; the student only knows the title and its one misconception`);
  }
  const unresolved = strings(t.unresolved_terms) ? (t.unresolved_terms as string[]) : [];
  if (it.verdict === "pass") {
    if (t.misconception_corrected !== true) errors.push(`${at}: a pass needs the student's misconception corrected explicitly; silence is not a correction`);
    if (unresolved.length) errors.push(`${at}: a pass leaves no undefined term, and ${unresolved.join(", ")} ${unresolved.length > 1 ? "are" : "is"} still undefined`);
  }
  return { turns: t.turns.map(x => ({ role: x.role, text: x.text })), misconception: { assertion: m?.assertion ?? -1, text: m?.text ?? "" }, misconception_corrected: t.misconception_corrected === true, unresolved_terms: unresolved };
}

export function planSession(input: RecordSessionInput, ctx: RecordContext): RecordPlan {
  const errors: string[] = [];
  const warnings: string[] = [];
  const empty = (): RecordPlan => ({ errors, warnings, record: null, sessionFile: null, newIds: [], climbs: [], elaborations: [], changes: [] });
  const fail = (e: string): RecordPlan => { errors.push(e); return empty(); };
  const kind: SessionKind = input.kind ?? "spar";
  if (!(SESSION_KINDS as readonly string[]).includes(kind)) return fail(`kind must be one of ${SESSION_KINDS.join(", ")}`);
  if (input.tier !== 1 && input.tier !== 2) return fail("tier must be 1 or 2");
  if ((kind === "generate" || kind === "elaborate") && input.tier !== 1) return fail(`a ${kind} session is Tier 1; it is not judged`);
  const date = input.date ?? localDate(ctx.now);
  if (!isDate(date)) return fail(`date ${date} is not YYYY-MM-DD`);
  if (!Array.isArray(input.items) || input.items.length === 0) return fail("a session covers at least one note");

  const graded = kind === "spar" || kind === "teach";
  const sessionId = ctx.newSessionId();
  const byPath = new Map(ctx.notes.map(n => [n.path, n]));
  const byCoachId = new Map(ctx.notes.filter(n => n.coachId).map(n => [n.coachId!, n]));
  const taken = new Set(byCoachId.keys());
  const newIds: RecordPlan["newIds"] = [];
  const seen = new Set<string>();
  const items: SessionItem[] = [];
  const elaborations: RecordPlan["elaborations"] = [];

  input.items.forEach((it, n) => {
    const at = `items[${n}]`;
    if (!!it.note === !!it.coach_id) { errors.push(`${at}: name the note by path or by coach_id, not both or neither`); return; }
    const note = it.note ? byPath.get(it.note) : byCoachId.get(it.coach_id!);
    if (!note) { errors.push(`${at}: no note ${it.note ?? `with coach_id ${it.coach_id}`}`); return; }
    const onWhole = kind === "generate" && (note.rawRole === "chapter" || structureOf(note) !== null);
    if (note.bucket !== "resources") { errors.push(`${at}: ${note.path} is not under 3.Resources; only Resources notes are sparred`); return; }
    if (note.raw && !onWhole) { errors.push(`${at}: ${note.path} is a raw resource; raw resources are the reference concept notes are checked against and are not sparred, so spar a concept note that quotes it${kind === "generate" ? " (a Generate attempt may name a raw chapter, before reading it)" : ""}`); return; }
    if (kind !== "spar" && !onWhole && !isConceptNote(note)) { errors.push(`${at}: ${note.path} is not a concept note; ${kind} works on a concept note's core assertions`); return; }
    if (seen.has(note.path)) { errors.push(`${at}: ${note.path} appears twice in one session`); return; }
    seen.add(note.path);

    let challenge = it.challenge;
    let answer = it.answer;
    let detail: Partial<Pick<SessionItem, "generate" | "elaborate" | "teach">> = {};
    if (kind === "generate") {
      const g = checkGenerate(at, it, note, errors, warnings);
      if (g) detail = { generate: g };
      if (g?.idk && !answer?.trim()) answer = "/idk";
    } else if (kind === "elaborate") {
      const answers = checkElaborate(at, it, note, ctx.notes, errors);
      if (answers) {
        detail = { elaborate: { answers } };
        challenge = answers.map(a => a.question).join("\n\n");
        answer = answers.map(a => `${a.kind}: ${a.answer}`).join("\n\n");
        if (!errors.length) elaborations.push({ path: note.path, text: renderElaborations(date, answers) });
      }
    } else if (kind === "teach") {
      const t = checkTeach(at, it, note, errors);
      if (t) {
        detail = { teach: t };
        challenge = t.turns.filter(x => x.role === "student").map(x => x.text).join("\n\n");
        answer = t.turns.filter(x => x.role === "learner").map(x => x.text).join("\n\n");
      }
      const gate = climbOf(note, ctx.notes, ctx.sessions.filter(s => s.date <= date));
      if (!gate.teach.ok) errors.push(`${at}: ${note.path}: ${gate.teach.reason}`);
    }
    if (kind !== "elaborate" && kind !== "teach") {
      if (typeof challenge !== "string" || !challenge.trim()) errors.push(`${at}: challenge is empty`);
      if (typeof answer !== "string") errors.push(`${at}: answer must be a string`);
    }
    if (graded) {
      if (it.verdict !== "pass" && it.verdict !== "fail") errors.push(`${at}: verdict must be pass or fail`);
      if (!isDate(it.next_review)) errors.push(`${at}: next_review ${String(it.next_review)} is not YYYY-MM-DD`);
    } else {
      if (it.verdict !== undefined) errors.push(`${at}: a ${kind} attempt is not graded; give no verdict`);
      if (it.next_review !== undefined && !isDate(it.next_review)) errors.push(`${at}: next_review ${String(it.next_review)} is not YYYY-MM-DD`);
    }
    const gaps = it.gaps ?? [];
    if (!strings(gaps)) errors.push(`${at}: gaps must be a string array`);

    let coachId: string | null = note.coachId;
    if (!coachId && !onWhole) {
      do coachId = ctx.newCoachId(); while (taken.has(coachId));
      taken.add(coachId);
      newIds.push({ path: note.path, coach_id: coachId });
    }
    items.push({
      coach_id: onWhole ? null : coachId, note_path: note.path, title: note.title,
      challenge: challenge ?? "", answer: answer ?? "",
      verdict: graded ? it.verdict! : "ungraded", gaps, next_review: it.next_review ?? null, ...detail,
    });
  });

  const record: SessionRecord = { version: kind === "spar" ? 1 : 2, kind, session_id: sessionId, tier: input.tier, date, recorded_at: ctx.now.toISOString(), items };
  const sessionFile = sessionPath(record.session_id);
  if (ctx.exists(sessionFile)) errors.push(`${sessionFile} already exists`);
  if (errors.length) return empty();

  const idOf = new Map(newIds.map(x => [x.path, x.coach_id]));
  const after = ctx.notes.map(n => (idOf.has(n.path) ? { ...n, coachId: idOf.get(n.path)! } : n));
  const sessions = [...ctx.sessions, record];
  const reached = new Set<string>();
  for (const i of items) {
    const note = byPath.get(i.note_path)!;
    if (isConceptNote(note)) reached.add(note.path);
    else if (note.rawRole === "chapter") for (const c of after.filter(isConceptNote)) if (chaptersOf(c, after).some(ch => ch.path === note.path)) reached.add(c.path);
    else for (const g of structureOf(note)?.groups ?? []) for (const c of g.concepts) if (byPath.has(c)) reached.add(c);
  }
  const climbs: RecordPlan["climbs"] = [];
  const changes: NoteChange[] = [];
  const touched = new Set([...idOf.keys(), ...reached, ...elaborations.map(e => e.path)]);
  for (const path of [...touched].sort()) {
    const original = readFileSync(join(ctx.root, path), "utf-8");
    let content = original;
    if (idOf.has(path)) content = insertCoachId(content, idOf.get(path)!);
    const e = elaborations.find(x => x.path === path);
    if (e) content = appendElaborations(content, e.text);
    if (reached.has(path)) {
      const c = climbOf(after.find(n => n.path === path)!, after, sessions);
      if (!c.current) {
        content = withClimb(content, c.steps);
        climbs.push({ path, climb: stepDates(c.steps) });
      }
    }
    if (content !== original) changes.push({ path, original, content });
  }
  return { errors, warnings, record, sessionFile, newIds, climbs, elaborations, changes };
}

export const stepDates = (steps: ClimbSteps) => Object.fromEntries(CLIMB_STEPS.map(s => [s, steps[s]?.date ?? null]));

export async function executeSession(root: string, plan: RecordPlan): Promise<void> {
  if (plan.errors.length || !plan.record || !plan.sessionFile) throw new Error("refusing to write a plan with errors");
  for (const { path, original, content } of plan.changes) {
    const abs = join(root, path);
    const now = await readFile(abs, "utf-8");
    if (now !== original) {
      if (plan.newIds.some(x => x.path === path) && declaresCoachId(now)) throw new Error(`${path} gained a coach_id since the preview; re-run record_session`);
      throw new Error(`${path} changed since the preview; re-run record_session`);
    }
    await writeFile(abs, content);
  }
  const abs = join(root, plan.sessionFile);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, renderSession(plan.record), { flag: "wx" });
}
