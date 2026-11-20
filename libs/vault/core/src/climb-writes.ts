import { posix } from 'node:path';
import { safeName } from './filing.js';
import {
  CONCEPTS_FOLDER,
  MAX_ASSERTIONS,
  MAX_PASSAGES,
  checkPassages,
  conceptListLines,
  conceptOf,
  fold,
  fromNoteLine,
  passageLines,
  passagesLines,
  type Passage,
  type PassageCheck,
} from './concept.js';
import type { NoteWrites } from './plans.js';
import {
  bookOf,
  chaptersOf,
  climbOf,
  conceptBook,
  conceptBooks,
  groupsOf,
  groupOf,
  topicOf,
  isConceptNote,
  readingEntries,
  sectionText,
  setFrontmatterLines,
  sharesRun,
  structureErrors,
  structureOf,
  withClimb,
  wordCount,
  CLIMB_STEPS,
  GUIDELINE_TYPE,
  READING_NOTES_TYPE,
  STRUCTURE_TYPE,
  type ConceptClimb,
  type StructureGroup,
} from './climb.js';
import {
  yamlString,
  classify,
  PARA_FOLDERS,
  type VaultNote,
  type SessionRecord,
  type VaultTree,
} from '@ai-coach/vault-domain';

export const READING_NOTES_FOLDER = posix.join(
  PARA_FOLDERS.resources,
  'Reading notes',
);
export const STRUCTURES_FOLDER = posix.join(CONCEPTS_FOLDER, 'Structures');

export const NOTE_SHARE_WARNING = 0.2;

export interface ClimbWritePlan extends NoteWrites {
  warnings: string[];

  climbs: { path: string; climb: Record<string, string | null> }[];
}

const emptyPlan = (): ClimbWritePlan => ({
  errors: [],
  warnings: [],
  originals: {},
  writes: {},
  created: [],
  climbs: [],
});

const read = (tree: VaultTree, path: string) => tree.text(path);

function current(tree: VaultTree, plan: ClimbWritePlan, path: string): string {
  if (path in plan.writes) return plan.writes[path];
  if (!(path in plan.originals)) plan.originals[path] = read(tree, path);
  return plan.originals[path];
}

function put(
  tree: VaultTree,
  plan: ClimbWritePlan,
  path: string,
  content: string,
  create = false,
): void {
  if (create) plan.created.push(path);
  else current(tree, plan, path);
  plan.writes[path] = content;
}

function afterPlan(
  tree: VaultTree,
  notes: VaultNote[],
  plan: ClimbWritePlan,
): VaultNote[] {
  const out = notes.map((n) =>
    n.path in plan.writes ? tree.noteOf(n.path, plan.writes[n.path]) : n,
  );
  for (const p of plan.created) out.push(tree.noteOf(p, plan.writes[p]));
  return out;
}

function refreshClimbs(
  tree: VaultTree,
  notes: VaultNote[],
  sessions: SessionRecord[],
  plan: ClimbWritePlan,
  paths: string[],
): void {
  const after = afterPlan(tree, notes, plan);
  for (const path of paths) {
    const note = after.find((n) => n.path === path);
    if (!note || !isConceptNote(note)) continue;
    const c = climbOf(note, after, sessions);
    if (c.current) continue;
    put(tree, plan, path, withClimb(current(tree, plan, path), c.steps));
    plan.climbs.push({
      path,
      climb: Object.fromEntries(
        CLIMB_STEPS.map((s) => [s, c.steps[s]?.date ?? null]),
      ),
    });
  }
}

const conceptsQuoting = (notes: VaultNote[], chapter: string) =>
  notes
    .filter(isConceptNote)
    .filter((c) => chaptersOf(c, notes).some((ch) => ch.path === chapter))
    .map((c) => c.path);

export interface ReadingNotesInput {
  chapter: string;

  page?: number;
  notes: string[];
}

export interface ReadingNotesPlan extends ClimbWritePlan {
  path: string | null;

  entries: { text: string; quote: boolean }[];
}

const chapterLink = (chapter: VaultNote, page: number | null, label: string) =>
  `[[${chapter.path.replace(/\.md$/, '')}${page !== null ? `#Page ${page}` : ''}|${label}]]`;

export function addReadingNotes(
  tree: VaultTree,
  notes: VaultNote[],
  sessions: SessionRecord[],
  input: ReadingNotesInput,
  date: string,
): ReadingNotesPlan {
  const plan: ReadingNotesPlan = { ...emptyPlan(), path: null, entries: [] };
  const chapter = notes.find((n) => n.path === input.chapter);
  if (!chapter || chapter.rawRole !== 'chapter') {
    plan.errors.push(`${input.chapter} is not a chapter of a converted book`);
    return plan;
  }
  const page = input.page ?? null;
  if (page !== null && !/^## Page \d+/.test(sectionText(chapter, page))) {
    plan.errors.push(`${chapter.path} has no page ${page}`);
    return plan;
  }
  const texts = (Array.isArray(input.notes) ? input.notes : [])
    .map((t) =>
      typeof t === 'string' ? t.trim().replace(/\s*\n\s*/g, ' ') : '',
    )
    .filter(Boolean);
  if (!texts.length) {
    plan.errors.push('no notes: write down what resonated, in your own words');
    return plan;
  }

  const section = sectionText(chapter, page) || sectionText(chapter, null);
  plan.entries = texts.map((text) => ({
    text,
    quote: sharesRun(text, section),
  }));
  for (const e of plan.entries)
    if (e.quote)
      plan.warnings.push(
        `"${e.text.slice(0, 60)}${e.text.length > 60 ? '…' : ''}" shares six or more words in a row with the text, so it is kept as a quote; only notes in your own words count for Read`,
      );

  const book = bookOf(chapter, notes) ?? chapter.title;
  const path = posix.join(
    READING_NOTES_FOLDER,
    safeName(book) ?? 'Book',
    `${safeName(chapter.title) ?? 'Chapter'}.md`,
  );
  plan.path = path;
  const existing = notes.find((n) => n.path === path);
  if (
    existing &&
    (existing.frontmatter.type !== READING_NOTES_TYPE ||
      existing.frontmatter.chapter !== chapter.path)
  ) {
    plan.errors.push(
      `${path} exists and is not the reading notes of ${chapter.path}`,
    );
    return plan;
  }
  if (!existing && tree.exists(path)) {
    plan.errors.push(`${path} exists and is not a note`);
    return plan;
  }

  const heading = page !== null ? `## Page ${page}` : '## Notes';
  const lines = plan.entries.map(
    (e) =>
      `- ${date} · ${e.quote ? `“${e.text}” (quote)` : e.text} — ${chapterLink(chapter, page, page !== null ? `p. ${page}` : chapter.title)}`,
  );
  const original = existing
    ? current(tree, plan, path)
    : [
        '---',
        `type: ${yamlString(READING_NOTES_TYPE)}`,
        `chapter: ${yamlString(chapter.path)}`,
        `book: ${yamlString(book)}`,
        '---',
        '',
        `# Reading notes: ${chapter.title}`,
        '',
        `From ${chapterLink(chapter, null, `${book}, ${chapter.title}`)}.`,
        '',
      ].join('\n');
  const content = insertUnder(original, heading, lines);
  put(tree, plan, path, content, !existing);

  const written = readingEntries(tree.noteOf(path, content), chapter).filter(
    (e) => e.page === page,
  );
  const share =
    wordCount(written.map((e) => e.text).join(' ')) /
    Math.max(1, wordCount(section));
  if (share > NOTE_SHARE_WARNING)
    plan.warnings.push(
      `the notes on ${page !== null ? `page ${page}` : 'this chapter'} hold ${Math.round(share * 100)}% of its words; keep what resonates, about 10-20%`,
    );

  refreshClimbs(
    tree,
    notes,
    sessions,
    plan,
    conceptsQuoting(notes, chapter.path),
  );
  return plan;
}

function insertUnder(content: string, heading: string, add: string[]): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const at = lines.findIndex((l) => l.trimEnd() === heading);
  if (at < 0) {
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return `${[...lines, '', heading, '', ...add].join('\n')}\n`;
  }
  let end = lines.findIndex((l, i) => i > at && /^#{1,2} /.test(l));
  if (end < 0) end = lines.length;
  let last = end;
  while (last > at + 1 && lines[last - 1] === '') last--;
  const out = [
    ...lines.slice(0, last),
    ...add,
    ...(end < lines.length ? [''] : []),
    ...lines.slice(end),
  ];
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

export interface StructureInput {
  book?: string;

  topic?: string;

  groups: { name: string; concepts: string[] }[];

  builds_on?: { from: string; to: string }[];
}

export interface StructurePlan extends ClimbWritePlan {
  path: string | null;
}

const allBooks = (notes: VaultNote[]) =>
  new Set(notes.filter(isConceptNote).flatMap((c) => conceptBooks(c, notes)));

export function writeStructure(
  tree: VaultTree,
  notes: VaultNote[],
  sessions: SessionRecord[],
  input: StructureInput,
  date: string,
): StructurePlan {
  const plan: StructurePlan = { ...emptyPlan(), path: null };
  const bookIn = typeof input.book === 'string' ? input.book.trim() : '';
  const topicIn = typeof input.topic === 'string' ? input.topic.trim() : '';
  if (!bookIn === !topicIn) {
    plan.errors.push('give either book or topic, not both or neither');
    return plan;
  }
  const name = bookIn || topicIn;
  const isTopic = !!topicIn;
  const all = notes.filter(isConceptNote);
  const concepts = isTopic
    ? all
    : all.filter((c) => conceptBooks(c, notes).includes(name));
  if (!isTopic && !concepts.length) {
    plan.errors.push(
      `no concept note quotes a book named "${name}"; run create_concept first`,
    );
    return plan;
  }
  if (isTopic && allBooks(notes).has(name)) {
    plan.errors.push(
      `"${name}" is a book's title; give the topic another name`,
    );
    return plan;
  }
  const resolve = (ref: string) =>
    concepts.find((c) => c.path === ref || c.path === `${ref}.md`) ??
    concepts.find(
      (c) => c.title === ref || posix.basename(c.path, '.md') === ref,
    );

  const groups: StructureGroup[] = [];
  for (const g of Array.isArray(input.groups) ? input.groups : []) {
    const members: string[] = [];
    for (const ref of Array.isArray(g?.concepts) ? g.concepts : []) {
      const c = typeof ref === 'string' ? resolve(ref.trim()) : undefined;
      if (!c)
        plan.errors.push(
          `group "${g?.name}": ${String(ref)} is not a concept note${isTopic ? '' : ` of ${name}`}`,
        );
      else members.push(c.path);
    }
    groups.push({
      name: typeof g?.name === 'string' ? g.name.trim() : '',
      concepts: members,
    });
  }
  const buildsOn = (Array.isArray(input.builds_on) ? input.builds_on : []).map(
    (e) => ({
      from: String(e?.from ?? '').trim(),
      to: String(e?.to ?? '').trim(),
    }),
  );
  plan.errors.push(
    ...structureErrors(
      groups,
      buildsOn,
      isTopic ? null : concepts.map((c) => c.path),
    ),
  );

  const path = posix.join(
    STRUCTURES_FOLDER,
    `${safeName(name) ?? (isTopic ? 'Topic' : 'Book')}.md`,
  );
  plan.path = path;
  const existing = notes.find((n) => n.path === path);
  const was = existing ? structureOf(existing) : null;
  if (existing && !(isTopic ? was?.topic === name : was?.book === name))
    plan.errors.push(
      `${path} exists and is not the structure note of ${isTopic ? 'topic' : 'book'} ${name}${was?.book ? `; it is book ${was.book}'s` : was?.topic ? `; it is topic ${was.topic}'s` : ''}`,
    );
  else if (!existing && tree.exists(path))
    plan.errors.push(`${path} exists and is not a note`);
  if (isTopic) {
    const members = new Set(groups.flatMap((g) => g.concepts));
    for (const other of notes.map(structureOf)) {
      if (!other?.topic || other.topic === name) continue;
      for (const c of other.groups.flatMap((g) => g.concepts))
        if (members.has(c))
          plan.errors.push(
            `${c} is already in topic ${other.topic}; a concept is in at most one topic`,
          );
    }
  }
  if (plan.errors.length) return plan;

  const canonical = (n: string) =>
    groups.find((g) => g.name.toLowerCase() === n.toLowerCase())!.name;
  const edges = buildsOn.map((e) => ({
    from: canonical(e.from),
    to: canonical(e.to),
  }));
  const placedConcepts = all.filter((c) =>
    groups.some((g) => g.concepts.includes(c.path)),
  );
  const books = new Set(
    isTopic ? placedConcepts.flatMap((c) => conceptBooks(c, notes)) : [name],
  );
  const headings = new Set(
    notes
      .filter((n) => n.raw && books.has(bookOf(n, notes) ?? ''))
      .flatMap((n) =>
        [...n.body.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((m) => fold(m[1])),
      )
      .filter((h) => !/^page \d+$/.test(h)),
  );
  for (const g of groups)
    if (headings.has(fold(g.name)))
      plan.warnings.push(
        `group "${g.name}" is a heading of ${isTopic ? 'a book it quotes' : 'the book'} word for word; a name in your own words builds the frame better`,
      );
  for (const g of groups)
    if (!edges.some((e) => e.to === g.name) && edges.length)
      plan.warnings.push(`nothing builds on "${g.name}"`);

  const title = (p: string) => all.find((c) => c.path === p)!.title;
  const content = [
    '---',
    `type: ${yamlString(STRUCTURE_TYPE)}`,
    isTopic ? `topic: ${yamlString(name)}` : `book: ${yamlString(name)}`,
    `date: ${yamlString(date)}`,
    'groups:',
    ...groups.flatMap((g) => [
      `  - name: ${yamlString(g.name)}`,
      '    concepts:',
      ...g.concepts.map((c) => `      - ${yamlString(c)}`),
    ]),
    ...(edges.length
      ? [
          'builds_on:',
          ...edges.flatMap((e) => [
            `  - from: ${yamlString(e.from)}`,
            `    to: ${yamlString(e.to)}`,
          ]),
        ]
      : ['builds_on: []']),
    '---',
    '',
    `# Structure: ${name}`,
    '',
    'Written by the coach from the groups and layers you gave. Edits here are not read back; the record is the frontmatter.',
    ...groups.flatMap((g) => [
      '',
      `## ${g.name}`,
      '',
      ...g.concepts.map((c) => `- [[${c.replace(/\.md$/, '')}|${title(c)}]]`),
    ]),
    ...(edges.length
      ? ['', '## Builds on', '', ...edges.map((e) => `- ${e.from} → ${e.to}`)]
      : []),
    '',
  ].join('\n');
  put(tree, plan, path, content, !existing);

  const setGroup = (c: string, group: string | null) => {
    const note = all.find((n) => n.path === c)!;
    const cbooks = conceptBooks(note, notes);
    const byKey: Record<string, string> = { ...groupsOf(note, cbooks[0]) };
    if (group === null) delete byKey[name];
    else byKey[name] = group;
    const ordered = [
      ...(topicOf(note) && byKey[topicOf(note)!] ? [topicOf(note)!] : []),
      ...cbooks.filter((b) => byKey[b]),
      ...Object.keys(byKey).filter(
        (k) => !cbooks.includes(k) && k !== topicOf(note),
      ),
    ];
    const keys = [
      ...new Set(
        isTopic && group !== null
          ? [name, ...ordered.filter((k) => k !== name)]
          : ordered,
      ),
    ];
    let next = setFrontmatterLines(
      current(tree, plan, c),
      'groups',
      keys.length
        ? [
            'groups:',
            ...keys.map((k) => `  ${yamlString(k)}: ${yamlString(byKey[k])}`),
          ]
        : null,
    );
    next = setFrontmatterLines(next, 'group', null);
    if (isTopic)
      next = setFrontmatterLines(
        next,
        'topic',
        group === null ? null : [`topic: ${yamlString(name)}`],
      );
    if (next !== current(tree, plan, c)) put(tree, plan, c, next);
  };
  for (const g of groups) for (const c of g.concepts) setGroup(c, g.name);
  const dropped = (was?.groups.flatMap((g) => g.concepts) ?? []).filter(
    (c) =>
      !placedConcepts.some((p) => p.path === c) &&
      all.some((n) => n.path === c),
  );
  for (const c of dropped) setGroup(c, null);
  refreshClimbs(tree, notes, sessions, plan, [
    ...(isTopic ? placedConcepts : concepts).map((c) => c.path),
    ...dropped,
  ]);
  return plan;
}

export interface TopicListing {
  topic: string;
  path: string;
  concepts: string[];

  books: string[];
}

export function listTopics(notes: VaultNote[]): TopicListing[] {
  const out: TopicListing[] = [];
  for (const s of notes.map(structureOf)) {
    if (!s?.topic) continue;
    const concepts = s.groups.flatMap((g) => g.concepts);
    const books = [
      ...new Set(
        concepts.flatMap((c) => {
          const n = notes.find((x) => x.path === c);
          return n ? conceptBooks(n, notes) : [];
        }),
      ),
    ].sort((a, b) => a.localeCompare(b));
    out.push({ topic: s.topic, path: s.path, concepts, books });
  }
  return out.sort((a, b) => a.topic.localeCompare(b.topic));
}

export interface GuidelineInput {
  session_id: string;

  note?: string;
  title: string;

  folder: string;
}

export interface GuidelinePlan extends ClimbWritePlan {
  path: string | null;
}

export function saveGuideline(
  tree: VaultTree,
  notes: VaultNote[],
  sessions: SessionRecord[],
  input: GuidelineInput,
): GuidelinePlan {
  const plan: GuidelinePlan = { ...emptyPlan(), path: null };
  const session = sessions.find((s) => s.session_id === input.session_id);
  if (!session) {
    plan.errors.push(`no session ${input.session_id}`);
    return plan;
  }
  if (session.kind !== 'teach') {
    plan.errors.push(
      `${input.session_id} is a ${session.kind} session; a guideline is saved from a Teach session`,
    );
    return plan;
  }
  const items = input.note
    ? session.items.filter((i) => i.note_path === input.note)
    : session.items;
  if (items.length !== 1) {
    plan.errors.push(
      input.note
        ? `${input.session_id} does not cover ${input.note}`
        : `${input.session_id} covers ${items.length} notes; name the one to save`,
    );
    return plan;
  }
  const item = items[0];
  if (item.verdict !== 'pass') {
    plan.errors.push('only a passed Teach session is saved as a guideline');
    return plan;
  }
  const folder = posix.normalize(
    String(input.folder ?? '').replace(/\/+$/, ''),
  );
  const at = classify(`${folder}/x.md`);
  if (
    folder.startsWith('..') ||
    (at.bucket !== 'projects' && at.bucket !== 'resources') ||
    at.raw
  ) {
    plan.errors.push(
      `${folder} is not a folder under 1.Projects or 3.Resources outside 0.Raw`,
    );
    return plan;
  }
  const name = safeName(input.title ?? '');
  if (!name) {
    plan.errors.push(
      'title must contain a character other than those Obsidian forbids in a file name',
    );
    return plan;
  }
  const path = posix.join(folder, `${name}.md`);
  plan.path = path;
  if (tree.exists(path)) {
    plan.errors.push(`${path} already exists`);
    return plan;
  }
  const lesson = (item.teach?.turns ?? [])
    .filter((t) => t.role === 'learner')
    .map((t) => t.text.trim())
    .filter(Boolean);
  const content = [
    '---',
    `type: ${yamlString(GUIDELINE_TYPE)}`,
    `concept: ${yamlString(item.note_path)}`,
    `from_session: ${yamlString(session.session_id)}`,
    '---',
    '',
    `# ${input.title.trim()}`,
    '',
    ...lesson.flatMap((t) => [t, '']),
  ].join('\n');
  put(tree, plan, path, content, true);
  return plan;
}

export function climbs(
  notes: VaultNote[],
  sessions: SessionRecord[],
  note?: string,
): ConceptClimb[] | { error: string } {
  const concepts = notes.filter(isConceptNote);
  if (!note) return concepts.map((c) => climbOf(c, notes, sessions));
  const c = concepts.find(
    (n) =>
      n.path === note ||
      n.title === note ||
      posix.basename(n.path, '.md') === note,
  );
  return c
    ? [climbOf(c, notes, sessions)]
    : { error: `${note} is not a concept note` };
}

export function rebuildClimbs(
  tree: VaultTree,
  notes: VaultNote[],
  sessions: SessionRecord[],
): ClimbWritePlan {
  const plan = emptyPlan();
  refreshClimbs(
    tree,
    notes,
    sessions,
    plan,
    notes.filter(isConceptNote).map((n) => n.path),
  );
  return plan;
}

export function conceptWithClimb(
  tree: VaultTree,
  path: string,
  content: string,
  notes: VaultNote[],
  sessions: SessionRecord[],
): string {
  const note = tree.noteOf(path, content);
  const c = climbOf(note, [...notes, note], sessions);
  return CLIMB_STEPS.some((s) => c.steps[s])
    ? withClimb(content, c.steps)
    : content;
}

export const SKETCHES_FOLDER = posix.join(CONCEPTS_FOLDER, 'Sketches');
export const MAX_SKETCH_BYTES = 4 * 1024 * 1024;
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export interface ClimbView {
  concepts: (ConceptClimb & { book: string | null; group: string | null })[];

  books: {
    book: string;
    kind: 'book' | 'topic';
    concepts: { path: string; title: string }[];
    candidates: { path: string; title: string }[];
    structure: string | null;
  }[];
  sketches: { path: string; name: string }[];
}

export function climbView(
  notes: VaultNote[],
  sessions: SessionRecord[],
  sketchFiles: string[],
): ClimbView {
  const concepts = notes.filter(isConceptNote).map((c) => ({
    ...climbOf(c, notes, sessions),
    book: conceptBook(c, notes),
    group: groupOf(c, notes),
  }));
  const ref = (c: { path: string; title: string }) => ({
    path: c.path,
    title: c.title,
  });
  const byBook = new Map<string, { path: string; title: string }[]>();
  for (const c of concepts)
    for (const b of c.books) byBook.set(b, [...(byBook.get(b) ?? []), ref(c)]);
  const structures = notes
    .map(structureOf)
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const books = [...byBook.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([book, cs]) => ({
      book,
      kind: 'book' as const,
      concepts: cs,
      candidates: cs,
      structure: structures.find((s) => s.book === book)?.path ?? null,
    }));
  const topics = listTopics(notes).map((t) => ({
    book: t.topic,
    kind: 'topic' as const,
    concepts: concepts.filter((c) => t.concepts.includes(c.path)).map(ref),
    candidates: concepts.map(ref),
    structure: t.path,
  }));
  return {
    concepts,
    books: [...topics, ...books],
    sketches: sketchFiles.map((p) => ({
      path: p,
      name: posix.basename(p, '.png'),
    })),
  };
}

export function revealStructure(notes: VaultNote[], name: string) {
  const s =
    notes.map(structureOf).find((x) => x?.book === name || x?.topic === name) ??
    null;
  if (!s) return null;
  const title = (p: string) =>
    notes.find((n) => n.path === p)?.title ?? posix.basename(p, '.md');
  return {
    path: s.path,
    kind: s.topic ? 'topic' : 'book',
    groups: s.groups.map((g) => ({
      name: g.name,
      concepts: g.concepts.map((c) => ({ path: c, title: title(c) })),
    })),
    buildsOn: s.buildsOn,
    title,
  };
}

export interface SketchPlan {
  errors: string[];
  path: string | null;
  bytes: number;
}

export function planSketch(
  tree: VaultTree,
  notes: VaultNote[],
  target: string,
  png: Uint8Array,
  date: string,
): SketchPlan {
  const plan: SketchPlan = { errors: [], path: null, bytes: png.length };
  const concept = notes
    .filter(isConceptNote)
    .find((c) => c.path === target || c.title === target);
  const book = concept
    ? null
    : (notes
        .filter(isConceptNote)
        .flatMap((c) => conceptBooks(c, notes))
        .find((b) => b === target) ?? null);
  if (!concept && !book)
    plan.errors.push(
      `${target} is neither a concept note nor a book with concept notes`,
    );
  if (png.length < PNG.length || PNG.some((b, i) => png[i] !== b))
    plan.errors.push('a sketch is a PNG image');
  if (png.length > MAX_SKETCH_BYTES)
    plan.errors.push(
      `a sketch is at most ${MAX_SKETCH_BYTES / 1024 / 1024} MB`,
    );
  if (plan.errors.length) return plan;
  const base = `${safeName(concept?.title ?? book!) ?? 'Sketch'} ${date}`;
  let path = posix.join(SKETCHES_FOLDER, `${base}.png`);
  for (let n = 2; tree.exists(path); n++)
    path = posix.join(SKETCHES_FOLDER, `${base} (${n}).png`);
  plan.path = path;
  return plan;
}

export interface ExtendConceptInput {
  note: string;
  passages?: Passage[];

  from_notes?: string[];

  core_assertions?: string[];
}

export interface ExtendConceptPlan extends ClimbWritePlan {
  path: string | null;

  passages: PassageCheck[];
}

function addToSection(
  content: string,
  heading: string,
  add: string[],
  before: string[],
): string {
  const nl = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const isHeading = (l: string, h: string) => l.trimEnd() === `## ${h}`;
  const at = lines.findIndex((l) => isHeading(l, heading));
  if (at < 0) {
    const next = lines.findIndex((l) => before.some((h) => isHeading(l, h)));
    const block = [`## ${heading}`, '', ...add, ''];
    if (next >= 0)
      return [...lines.slice(0, next), ...block, ...lines.slice(next)].join(nl);
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return [...lines, '', ...block].join(nl);
  }
  let end = lines.findIndex((l, i) => i > at && /^#{1,2} /.test(l));
  if (end < 0) end = lines.length;
  let last = end;
  while (last > at + 1 && lines[last - 1] === '') last--;
  return [
    ...lines.slice(0, last),
    ...add,
    ...(end < lines.length ? [''] : []),
    ...lines.slice(end),
  ].join(nl);
}

export function extendConcept(
  tree: VaultTree,
  notes: VaultNote[],
  sessions: SessionRecord[],
  input: ExtendConceptInput,
): ExtendConceptPlan {
  const plan: ExtendConceptPlan = { ...emptyPlan(), path: null, passages: [] };
  const ref = String(input.note ?? '').trim();
  const note =
    notes.find((n) => n.path === ref || n.path === `${ref}.md`) ??
    notes
      .filter(isConceptNote)
      .find((n) => n.title === ref || posix.basename(n.path, '.md') === ref);
  if (!note) {
    plan.errors.push(`no note ${ref}`);
    return plan;
  }
  const c = conceptOf(note);
  if (!c || !isConceptNote(note)) {
    plan.errors.push(`${note.path} is not a concept note`);
    return plan;
  }
  plan.path = note.path;
  const fields = c.fields;
  const passages = Array.isArray(input.passages) ? input.passages : [];
  const fromNotes = (
    Array.isArray(input.from_notes) ? input.from_notes : []
  ).map(String);
  const assertions = (
    Array.isArray(input.core_assertions) ? input.core_assertions : []
  ).map((a) => String(a).trim());
  if (!passages.length && !fromNotes.length && !assertions.length) {
    plan.errors.push(
      'nothing to add: give passages, from_notes or core_assertions',
    );
    return plan;
  }

  plan.passages = checkPassages(notes, passages);
  const have = new Set(fields.passages.map((p) => fold(p.quote)));
  plan.passages.forEach((p, i) => {
    if (!p.found) plan.errors.push(`passages[${i}]: ${p.problem}`);
    if (have.has(fold(p.quote)))
      plan.errors.push(
        `passages[${i}]: ${note.path} already quotes this passage`,
      );
    have.add(fold(p.quote));
  });
  if (fields.passages.length + passages.length > MAX_PASSAGES)
    plan.errors.push(
      `a concept note quotes at most ${MAX_PASSAGES} passages; it has ${fields.passages.length} and ${passages.length} would be added`,
    );

  const byPath = new Map(notes.map((n) => [n.path, n]));
  for (const n of fromNotes) {
    const r = byPath.get(n);
    if (!r) plan.errors.push(`from_notes: no note ${n}`);
    else if (r.raw)
      plan.errors.push(
        `from_notes: ${n} is a raw resource; name your own reading notes`,
      );
    else if (fields.fromNotes.includes(n))
      plan.errors.push(`from_notes: ${note.path} already names ${n}`);
  }
  const known = new Set(fields.coreAssertions.map(fold));
  for (const a of assertions) {
    if (!a) plan.errors.push('core_assertions: an assertion is empty');
    else if (known.has(fold(a)))
      plan.errors.push(
        `core_assertions: "${a}" is already an assertion of ${note.path}`,
      );
    known.add(fold(a));
  }
  if (fields.coreAssertions.length + assertions.length > MAX_ASSERTIONS)
    plan.errors.push(
      `a concept note has at most ${MAX_ASSERTIONS} core assertions; it has ${fields.coreAssertions.length} and ${assertions.length} would be added`,
    );
  if (plan.errors.length) return plan;

  const judged = note.coachId
    ? sessions.filter((s) => s.items.some((i) => i.coach_id === note.coachId))
        .length
    : 0;
  if (assertions.length && judged)
    plan.warnings.push(
      `${note.path} has ${judged} session${judged > 1 ? 's' : ''} judged against its ${fields.coreAssertions.length} assertion${fields.coreAssertions.length > 1 ? 's' : ''}; the next review checks all ${fields.coreAssertions.length + assertions.length}`,
    );

  const added = plan.passages.map(({ found: _f, problem: _p, ...p }) => p);
  let content = current(tree, plan, note.path);
  if (added.length)
    content = setFrontmatterLines(
      content,
      'source_passages',
      passagesLines([...fields.passages, ...added]),
    );
  if (fromNotes.length)
    content = setFrontmatterLines(
      content,
      'from_notes',
      conceptListLines('from_notes', [...fields.fromNotes, ...fromNotes]),
    );
  if (assertions.length)
    content = setFrontmatterLines(
      content,
      'core_assertions',
      conceptListLines('core_assertions', [
        ...fields.coreAssertions,
        ...assertions,
      ]),
    );
  if (added.length)
    content = addToSection(
      content,
      'Source passages',
      added.flatMap((p) => ['', ...passageLines(p, byPath)]),
      ['From my reading notes', 'My elaborations'],
    );
  if (fromNotes.length)
    content = addToSection(
      content,
      'From my reading notes',
      fromNotes.map((n) => fromNoteLine(n, byPath)),
      ['My elaborations'],
    );
  put(tree, plan, note.path, content);
  refreshClimbs(tree, notes, sessions, plan, [note.path]);
  return plan;
}
