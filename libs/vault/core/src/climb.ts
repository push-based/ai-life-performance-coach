import { posix } from 'node:path';
import { fold, conceptOf } from './concept.js';
import { chapterSummaryOf, withoutSummaries } from './distill.js';
import {
  yamlString,
  bySessionDate,
  type SessionRecord,
  type SessionItem,
  type SessionKind,
  type VaultNote,
} from '@ai-coach/vault-domain';

export const CLIMB_STEPS = [
  'read',
  'group',
  'generate',
  'retrieve',
  'elaborate',
  'space',
  'teach',
] as const;
export type ClimbStep = (typeof CLIMB_STEPS)[number];

export const READING_NOTES_TYPE = 'reading-notes';
export const STRUCTURE_TYPE = 'structure';
export const GUIDELINE_TYPE = 'guideline';

export const VERBATIM_RUN_WORDS = 6;

export const MIN_ATTEMPT_WORDS = 10;

export const SPACING_DAYS = 1;

export interface StepEvidence {
  date: string;

  evidence: string;
}

export type ClimbSteps = Record<ClimbStep, StepEvidence | null>;

export interface ConceptClimb {
  path: string;
  title: string;
  steps: ClimbSteps;

  stored: Record<ClimbStep, string | null> | null;

  current: boolean;
  next: ClimbStep | null;

  skipped: ClimbStep[];

  spacedPass: StepEvidence | null;

  books: string[];
  groups: Record<string, string>;

  ungroupedIn: string[];

  topic: string | null;
  teach: { ok: boolean; reason?: string };
}

const words = (text: string) =>
  fold(text)
    .split(/[^\p{L}\p{N}']+/u)
    .filter(Boolean);

export function sharesRun(
  text: string,
  source: string,
  n = VERBATIM_RUN_WORDS,
): boolean {
  const a = words(text);
  if (a.length < n) return false;
  const src = ` ${words(source).join(' ')} `;
  for (let i = 0; i + n <= a.length; i++)
    if (src.includes(` ${a.slice(i, i + n).join(' ')} `)) return true;
  return false;
}

export const wordCount = (text: string) => words(text).length;

export const dayDiff = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );

export const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000)
    .toISOString()
    .slice(0, 10);

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function bookOf(raw: VaultNote, notes: VaultNote[]): string | null {
  if (typeof raw.frontmatter.book === 'string' && raw.frontmatter.book.trim())
    return raw.frontmatter.book.trim();
  if (raw.rawRole === 'index') return raw.title;
  const index = notes.find(
    (n) =>
      n.rawRole === 'index' &&
      n.rawWork &&
      n.rawWork === raw.rawWork &&
      n.rawAuthor === raw.rawAuthor,
  );
  return index?.title ?? raw.rawWork ?? null;
}

export function chaptersOf(
  concept: VaultNote,
  notes: VaultNote[],
): VaultNote[] {
  const c = conceptOf(concept);
  if (!c) return [];
  const byPath = new Map(notes.map((n) => [n.path, n]));
  const out: VaultNote[] = [];
  for (const p of c.fields.passages) {
    const raw = byPath.get(p.note);
    if (raw?.raw && !out.includes(raw)) out.push(raw);
  }
  return out;
}

export function conceptBook(
  concept: VaultNote,
  notes: VaultNote[],
): string | null {
  return conceptBooks(concept, notes)[0] ?? null;
}

export function conceptBooks(concept: VaultNote, notes: VaultNote[]): string[] {
  const out: string[] = [];
  for (const ch of chaptersOf(concept, notes)) {
    const b = bookOf(ch, notes);
    if (b && !out.includes(b)) out.push(b);
  }
  return out;
}

export const isConceptNote = (n: VaultNote) =>
  n.concept && n.bucket === 'resources' && !n.raw;

export interface ReadingEntry {
  date: string;
  text: string;
  page: number | null;

  quote: boolean;
}

const ENTRY = /^- (\d{4}-\d{2}-\d{2}) · (.+?)\s*$/;
const ENTRY_LINK = /\s+—\s+\[\[[^\]]*\]\]$/;
const QUOTE_MARK = /\s+\(quote\)$/;

export function sectionText(chapter: VaultNote, page: number | null): string {
  const body = withoutSummaries(chapter.body);
  if (page === null) return body;
  const m = body
    .split(/^(?=## Page \d+\s*$)/m)
    .find((s) => s.startsWith(`## Page ${page}`));
  return m ?? '';
}

export function readingEntries(
  file: VaultNote,
  chapter: VaultNote | undefined,
): ReadingEntry[] {
  const out: ReadingEntry[] = [];
  let page: number | null = null;
  for (const line of file.body.split(/\r?\n/)) {
    const h = line.match(/^## Page (\d+)\s*$/);
    if (h) {
      page = Number(h[1]);
      continue;
    }
    if (/^## /.test(line)) {
      page = null;
      continue;
    }
    const m = line.match(ENTRY);
    if (!m) continue;
    const text = m[2]
      .replace(ENTRY_LINK, '')
      .replace(QUOTE_MARK, '')
      .replace(/^“|”$/g, '')
      .trim();
    const against = chapter
      ? sectionText(chapter, page) || sectionText(chapter, null)
      : '';
    out.push({
      date: m[1],
      text,
      page,
      quote: chapter ? sharesRun(text, against) : false,
    });
  }
  return out;
}

const chapterOfFile = (n: VaultNote) =>
  typeof n.frontmatter.chapter === 'string' ? n.frontmatter.chapter : null;

export function readEvidence(
  chapter: VaultNote,
  notes: VaultNote[],
): StepEvidence | null {
  const summary = chapterSummaryOf(chapter.body);
  if (!summary || sharesRun(summary, withoutSummaries(chapter.body)))
    return null;
  let best: StepEvidence | null = null;
  for (const f of notes) {
    if (
      f.frontmatter.type !== READING_NOTES_TYPE ||
      chapterOfFile(f) !== chapter.path
    )
      continue;
    for (const e of readingEntries(f, chapter)) {
      if (e.quote) continue;
      if (!best || e.date < best.date)
        best = { date: e.date, evidence: f.path };
    }
  }
  return best;
}

export interface StructureGroup {
  name: string;

  concepts: string[];
}

export interface Structure {
  path: string;

  book: string | null;
  topic: string | null;
  date: string;
  groups: StructureGroup[];
  buildsOn: { from: string; to: string }[];
}

export function structureOf(n: VaultNote): Structure | null {
  const fm = n.frontmatter;
  if (fm.type !== STRUCTURE_TYPE) return null;
  const book =
    typeof fm.book === 'string' && fm.book.trim() ? fm.book.trim() : null;
  const topic =
    typeof fm.topic === 'string' && fm.topic.trim() ? fm.topic.trim() : null;
  if (!book === !topic) return null;
  const groups: StructureGroup[] = [];
  for (const g of Array.isArray(fm.groups) ? fm.groups : []) {
    const r = g as Record<string, unknown>;
    if (typeof r?.name !== 'string') continue;
    groups.push({
      name: r.name,
      concepts: Array.isArray(r.concepts)
        ? r.concepts.filter((c): c is string => typeof c === 'string')
        : [],
    });
  }
  const buildsOn: Structure['buildsOn'] = [];
  for (const e of Array.isArray(fm.builds_on) ? fm.builds_on : []) {
    const r = e as Record<string, unknown>;
    if (typeof r?.from === 'string' && typeof r?.to === 'string')
      buildsOn.push({ from: r.from, to: r.to });
  }
  return {
    path: n.path,
    book,
    topic,
    date: typeof fm.date === 'string' ? fm.date : '',
    groups,
    buildsOn,
  };
}

export function structureErrors(
  groups: StructureGroup[],
  buildsOn: { from: string; to: string }[],
  bookConcepts: string[] | null,
): string[] {
  const errors: string[] = [];
  if (groups.length < 2 || groups.length > 7)
    errors.push(`a structure has 2 to 7 groups, got ${groups.length}`);
  const names = new Set<string>();
  const placed = new Map<string, string>();
  for (const g of groups) {
    const name = g.name?.trim();
    if (!name) {
      errors.push('every group needs a name');
      continue;
    }
    if (names.has(name.toLowerCase()))
      errors.push(`group "${name}" is named twice`);
    names.add(name.toLowerCase());
    if (!g.concepts.length) errors.push(`group "${name}" is empty`);
    for (const c of g.concepts) {
      const was = placed.get(c);
      if (was)
        errors.push(
          `${c} is in both "${was}" and "${name}"; every concept is in exactly one group`,
        );
      else placed.set(c, name);
      if (bookConcepts && !bookConcepts.includes(c))
        errors.push(`${c} is not a concept note of this book`);
    }
  }
  for (const c of bookConcepts ?? [])
    if (!placed.has(c))
      errors.push(
        `${c} is in no group; every concept of the book is in exactly one group`,
      );
  const edges = new Map<string, string[]>();
  for (const e of buildsOn) {
    const [from, to] = [
      e.from?.trim().toLowerCase(),
      e.to?.trim().toLowerCase(),
    ];
    if (!names.has(from) || !names.has(to)) {
      errors.push(
        `builds_on ${e.from} → ${e.to} names a group that does not exist`,
      );
      continue;
    }
    if (from === to) {
      errors.push(`group "${e.from}" cannot build on itself`);
      continue;
    }
    edges.set(from, [...(edges.get(from) ?? []), to]);
  }
  const cycle = findCycle(edges);
  if (cycle)
    errors.push(
      `"builds on" is a layering, and these groups build on each other in a cycle: ${cycle.join(' → ')}`,
    );
  return errors;
}

function findCycle(edges: Map<string, string[]>): string[] | null {
  const state = new Map<string, 1 | 2>();
  const stack: string[] = [];
  const visit = (n: string): string[] | null => {
    state.set(n, 1);
    stack.push(n);
    for (const m of edges.get(n) ?? []) {
      if (state.get(m) === 1) return [...stack.slice(stack.indexOf(m)), m];
      if (!state.has(m)) {
        const c = visit(m);
        if (c) return c;
      }
    }
    stack.pop();
    state.set(n, 2);
    return null;
  };
  for (const n of edges.keys())
    if (!state.has(n)) {
      const c = visit(n);
      if (c) return c;
    }
  return null;
}

interface Attempt {
  kind: SessionKind;
  tier: 1 | 2;
  date: string;
  session: string;
  item: SessionItem;
}

function attemptsOf(
  concept: VaultNote,
  around: string[],
  sessions: SessionRecord[],
): Attempt[] {
  const out: Attempt[] = [];
  for (const s of [...sessions].sort(bySessionDate)) {
    for (const item of s.items) {
      const mine =
        concept.coachId !== null && item.coach_id === concept.coachId;
      const onWhole =
        s.kind === 'generate' &&
        item.coach_id === null &&
        around.includes(item.note_path);
      if (mine || onWhole)
        out.push({
          kind: s.kind,
          tier: s.tier,
          date: s.date,
          session: s.session_id,
          item,
        });
    }
  }
  return out;
}

export function generateCounts(item: SessionItem): boolean {
  const g = item.generate;
  if (!g) return false;
  if (!(Date.parse(g.attempted_at) < Date.parse(g.revealed_at))) return false;
  return g.marks.every((m) => m.mark !== 'wrong' || !!m.correction?.trim());
}

export function spacedReviews(attempts: Attempt[]): {
  any: StepEvidence | null;
  passed: StepEvidence | null;
} {
  let any: StepEvidence | null = null;
  let passed: StepEvidence | null = null;
  let previous: string | null = null;
  for (const a of attempts.filter((x) => x.tier === 1)) {
    if (
      a.kind === 'spar' &&
      previous !== null &&
      dayDiff(previous, a.date) >= SPACING_DAYS
    ) {
      any ??= { date: a.date, evidence: a.session };
      if (a.item.verdict === 'pass')
        passed ??= { date: a.date, evidence: a.session };
    }
    previous = a.date;
  }
  return { any, passed };
}

export function climbOf(
  concept: VaultNote,
  notes: VaultNote[],
  sessions: SessionRecord[],
): ConceptClimb {
  const chapters = chaptersOf(concept, notes);
  const placing = notes
    .map(structureOf)
    .filter(
      (x): x is Structure =>
        !!x && x.groups.some((g) => g.concepts.includes(concept.path)),
    );
  const structures = placing.map((x) => x.path);
  const placedIn = new Set(
    placing.map((x) => x.book).filter((b): b is string => !!b),
  );
  const topic = placing.find((x) => x.topic)?.topic ?? null;
  const books = conceptBooks(concept, notes);
  const attempts = attemptsOf(
    concept,
    [...chapters.map((c) => c.path), ...structures],
    sessions,
  );
  const first = (pred: (a: Attempt) => boolean): StepEvidence | null => {
    const a = attempts.find(pred);
    return a ? { date: a.date, evidence: a.session } : null;
  };
  let read: StepEvidence | null = null;
  for (const ch of chapters) {
    const e = readEvidence(ch, notes);
    if (e && (!read || e.date < read.date)) read = e;
  }
  let group: StepEvidence | null = null;
  for (const n of notes) {
    const s = structureOf(n);
    if (
      s &&
      s.groups.some((g) => g.concepts.includes(concept.path)) &&
      DATE.test(s.date)
    )
      group = { date: s.date, evidence: s.path };
  }
  const space = spacedReviews(attempts);
  const steps: ClimbSteps = {
    read,
    group,
    generate: first((a) => a.kind === 'generate' && generateCounts(a.item)),
    retrieve: first((a) => a.kind === 'spar' && a.tier === 1),
    elaborate: first((a) => a.kind === 'elaborate'),
    space: space.any,
    teach: first((a) => a.kind === 'teach' && a.item.verdict === 'pass'),
  };
  const stored = storedClimb(concept);
  const current = CLIMB_STEPS.every(
    (s) => (stored?.[s] ?? null) === (steps[s]?.date ?? null),
  );
  const done = CLIMB_STEPS.filter((s) => steps[s]);
  const highest = done.length
    ? Math.max(...done.map((s) => CLIMB_STEPS.indexOf(s)))
    : -1;
  return {
    path: concept.path,
    title: concept.title,
    steps,
    stored,
    current,
    next: CLIMB_STEPS.find((s) => !steps[s]) ?? null,
    skipped: CLIMB_STEPS.filter((s, i) => i < highest && !steps[s]),
    spacedPass: space.passed,
    teach: teachGate(space.passed),
    books,
    topic,
    groups: groupsOf(concept, books[0]),
    ungroupedIn: books.filter((b) => !placedIn.has(b)),
  };
}

export function teachGate(spacedPass: StepEvidence | null): {
  ok: boolean;
  reason?: string;
} {
  return spacedPass
    ? { ok: true }
    : {
        ok: false,
        reason:
          'Teach needs a passed spaced review: a spar passed at least a day after the attempt before it. Spar the note again after a gap first.',
      };
}

export function storedClimb(
  n: Pick<VaultNote, 'frontmatter'>,
): Record<ClimbStep, string | null> | null {
  const c = n.frontmatter.climb;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  const r = c as Record<string, unknown>;
  return Object.fromEntries(
    CLIMB_STEPS.map((s) => [
      s,
      typeof r[s] === 'string' && DATE.test(r[s] as string)
        ? (r[s] as string)
        : null,
    ]),
  ) as Record<ClimbStep, string | null>;
}

export function climbLines(steps: ClimbSteps): string[] {
  return [
    'climb:',
    ...CLIMB_STEPS.map(
      (s) => `  ${s}: ${steps[s] ? yamlString(steps[s]!.date) : 'null'}`,
    ),
  ];
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n?---(?:\r?\n|$)/;

export function setFrontmatterLines(
  content: string,
  key: string,
  lines: string[] | null,
): string {
  const nl = content.includes('\r\n') ? '\r\n' : '\n';
  const m = content.match(FRONTMATTER);
  let fm = m && m[1] !== '' ? m[1].split(/\r?\n/) : [];
  const i = fm.findIndex((l) => new RegExp(`^${key}\\s*:`).test(l));
  let end = i + 1;
  if (i >= 0) while (end < fm.length && /^(\s+\S|-\s|-$)/.test(fm[end])) end++;
  if (i >= 0) fm.splice(i, end - i, ...(lines ?? []));
  else if (lines) fm = [...fm, ...lines];
  const block = fm.length ? `---${nl}${fm.join(nl)}${nl}---${nl}` : '';
  return m ? block + content.slice(m[0].length) : block + content;
}

export function withClimb(content: string, steps: ClimbSteps): string {
  return setFrontmatterLines(content, 'climb', climbLines(steps));
}

export function interleave<T>(items: T[], key: (t: T) => string): T[] {
  const left = [...items];
  const out: T[] = [];
  while (left.length) {
    const prev = out.length ? key(out[out.length - 1]) : null;
    const i = left.findIndex((t) => key(t) !== prev);
    out.push(...left.splice(i < 0 ? 0 : i, 1));
  }
  return out;
}

export function groupsOf(
  n: VaultNote,
  firstBook?: string | null,
): Record<string, string> {
  const g = n.frontmatter.groups;
  const out: Record<string, string> = {};
  if (g && typeof g === 'object' && !Array.isArray(g))
    for (const [book, name] of Object.entries(g))
      if (typeof name === 'string' && name.trim()) out[book] = name.trim();
  if (
    !Object.keys(out).length &&
    typeof n.frontmatter.group === 'string' &&
    n.frontmatter.group.trim() &&
    firstBook
  )
    out[firstBook] = n.frontmatter.group.trim();
  return out;
}

export const topicOf = (n: VaultNote): string | null =>
  typeof n.frontmatter.topic === 'string' && n.frontmatter.topic.trim()
    ? n.frontmatter.topic.trim()
    : null;

export function groupOf(n: VaultNote, notes: VaultNote[] = []): string | null {
  const books = conceptBooks(n, notes);
  const groups = groupsOf(n, books[0]);
  const topic = topicOf(n);
  if (topic && groups[topic]) return groups[topic];
  const book = books.find((b) => groups[b]) ?? Object.keys(groups)[0];
  return book
    ? groups[book]
    : typeof n.frontmatter.group === 'string' && n.frontmatter.group.trim()
      ? n.frontmatter.group.trim()
      : null;
}

export function queueKey(n: VaultNote, notes: VaultNote[]): string {
  const books = conceptBooks(n, notes);
  const groups = groupsOf(n, books[0]);
  const topic = topicOf(n);
  if (topic && groups[topic]) return `topic:${topic}:${groups[topic]}`;
  const inBook = books.find((b) => groups[b]);
  if (inBook) return `group:${inBook}:${groups[inBook]}`;
  const book = books[0] ?? null;
  if (book) return `book:${book}`;
  return `folder:${posix.dirname(n.path)}`;
}

export function structureLabels(
  s: Pick<Structure, 'groups' | 'buildsOn'>,
): string[] {
  return [
    ...s.groups.map((g) => `group: ${g.name}`),
    ...s.buildsOn.map((e) => `${e.from} → ${e.to}`),
  ];
}

export interface DrawnStructure {
  groups: StructureGroup[];
  buildsOn: { from: string; to: string }[];
}

export interface SuggestedMark {
  assertion: string;
  mark: 'got it' | 'wrong' | 'missed';

  why: string;
}

export function compareStructure(
  drawn: DrawnStructure,
  actual: Pick<Structure, 'groups' | 'buildsOn'>,
  titleOf: (path: string) => string = (p) => p,
): SuggestedMark[] {
  const match = new Map<string, StructureGroup | null>();
  for (const g of actual.groups) {
    let best: StructureGroup | null = null;
    let bestShared = 0;
    for (const d of drawn.groups) {
      const shared = d.concepts.filter((c) => g.concepts.includes(c)).length;
      if (shared > bestShared) {
        best = d;
        bestShared = shared;
      }
    }
    match.set(g.name, best);
  }
  const marks: SuggestedMark[] = actual.groups.map((g) => {
    const d = match.get(g.name);
    const label = `group: ${g.name}`;
    if (!d)
      return {
        assertion: label,
        mark: 'missed',
        why: `none of ${g.concepts.map(titleOf).join(', ')} was drawn in a group`,
      };
    const same =
      d.concepts.length === g.concepts.length &&
      d.concepts.every((c) => g.concepts.includes(c));
    if (same)
      return {
        assertion: label,
        mark: 'got it',
        why: `drawn as "${d.name}" with the same concepts`,
      };
    const missing = g.concepts
      .filter((c) => !d.concepts.includes(c))
      .map(titleOf);
    const extra = d.concepts
      .filter((c) => !g.concepts.includes(c))
      .map(titleOf);
    return {
      assertion: label,
      mark: 'wrong',
      why: `closest drawn group "${d.name}"${missing.length ? ` lacks ${missing.join(', ')}` : ''}${missing.length && extra.length ? ' and' : ''}${extra.length ? ` also holds ${extra.join(', ')}` : ''}`,
    };
  });
  const drawnEdge = (a: string, b: string) =>
    drawn.buildsOn.some((e) => e.from === a && e.to === b);
  for (const e of actual.buildsOn) {
    const label = `${e.from} → ${e.to}`;
    const [f, t] = [match.get(e.from), match.get(e.to)];
    if (!f || !t || f === t) {
      marks.push({
        assertion: label,
        mark: 'missed',
        why: 'one of its groups was not drawn apart',
      });
      continue;
    }
    if (drawnEdge(f.name, t.name))
      marks.push({
        assertion: label,
        mark: 'got it',
        why: `drawn as ${f.name} → ${t.name}`,
      });
    else if (drawnEdge(t.name, f.name))
      marks.push({
        assertion: label,
        mark: 'wrong',
        why: `drawn the other way round, ${t.name} → ${f.name}`,
      });
    else
      marks.push({
        assertion: label,
        mark: 'missed',
        why: `no arrow between "${f.name}" and "${t.name}"`,
      });
  }
  return marks;
}

export function drawingText(
  drawn: DrawnStructure,
  titleOf: (path: string) => string = (p) => p,
): string {
  return [
    ...drawn.groups.map(
      (g) => `${g.name}: ${g.concepts.map(titleOf).join(', ') || '(empty)'}`,
    ),
    ...drawn.buildsOn.map((e) => `${e.from} builds on ${e.to}`),
  ].join('\n');
}

export const MIN_DRAWN_GROUPS = 2;

export function drawingErrors(drawn: DrawnStructure): string[] {
  const named = drawn.groups.filter((g) => g.name.trim() && g.concepts.length);
  return named.length >= MIN_DRAWN_GROUPS
    ? []
    : [
        `a drawing is an attempt with at least ${MIN_DRAWN_GROUPS} named groups that each hold a concept; draw more, or press I don't know`,
      ];
}

export function drawnGroupsIn(text: string): number {
  return text
    .split('\n')
    .filter((l) => /^[^:]+:\s*\S/.test(l) && !/:\s*\(empty\)\s*$/.test(l))
    .length;
}
