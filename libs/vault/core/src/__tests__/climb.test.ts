import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createVault, type Vault } from '../vault.js';
import { interleave, sharesRun, CLIMB_STEPS } from '../climb.js';
import { parseSession } from '../sessions.js';
import type { ConceptClimb } from '../climb.js';
import type { RecordSessionInput } from '../record.js';

let dir: string;
let vault: Vault;
let clock: string;
let ids: number;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
const read = (rel: string) => readFileSync(join(dir, rel), 'utf-8');

const BOOK = 'Design System Architecture';
const WORK = `3.Resources/0.Raw/Books/Design Team/${BOOK}`;
const CH = `${WORK}/chapters/01 Layers.md`;
const PAGES = [
  'Design tokens are named values for colour, spacing and type. Every other layer reads its values from the tokens and never hard-codes them.',
  'Primitives are the smallest building blocks, such as a box, a text and an icon. A primitive takes its colour and spacing from design tokens.',
  'Components such as a button or a dialog are composed from primitives. A component never reaches past the primitives to the raw values.',
  'Patterns combine components into a solution for a recurring task, such as a sign-in form. A pattern documents when to use which component.',
];
const SUMMARY =
  '> [!summary]\n> Four layers stacked on each other: values at the bottom, then small parts, then widgets, then whole recipes.\n';
const chapter = (summary: string) =>
  [
    '---',
    'title: "Chapter 1: Layers"',
    'raw_role: "chapter"',
    `book: "${BOOK}"`,
    'pages: "1-4"',
    '---',
    '',
    '# Chapter 1: Layers',
    '',
    summary,
    ...PAGES.flatMap((p, i) => [`## Page ${i + 1}`, '', p, '']),
  ].join('\n');

const TOKENS = '3.Resources/Concepts/Design tokens.md';
const PRIMITIVES = '3.Resources/Concepts/Primitives.md';
const COMPONENTS = '3.Resources/Concepts/Components.md';
const PATTERNS = '3.Resources/Concepts/Patterns.md';
const TOKEN_ASSERTIONS = [
  'Tokens are the named values of the system.',
  'Every other layer takes its values from tokens.',
];

async function concept(
  title: string,
  page: number,
  quote: string,
  assertions: string[],
): Promise<void> {
  const r = await vault.createConcept(
    {
      title,
      summary: `${title}, as I understand it.`,
      core_assertions: assertions,
      passages: [{ note: CH, quote, pages: String(page) }],
    },
    true,
  );
  expect(r.errors).toEqual([]);
}

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'vault-climb-'));
  put(
    `${WORK}/text.md`,
    `---\ntitle: "${BOOK}"\nraw_role: "index"\n---\n# ${BOOK}\n`,
  );
  put(CH, chapter(SUMMARY));
  put(
    '1.Projects/Checkout/Checkout.md',
    '---\nstatus: in-progress\n---\n# Checkout\n',
  );
  put('3.Resources/CSS/Custom properties.md', '# Custom properties\n');
  clock = '2026-11-09T09:00:00.000Z';
  ids = 0;
  vault = createVault(dir, {
    now: () => new Date(clock),
    newSessionId: () => `s-${++ids}`,
    newCoachId: () => `c-${++ids}`,
  });
  await concept(
    'Design tokens',
    1,
    'Design tokens are named values for colour, spacing and type',
    TOKEN_ASSERTIONS,
  );
  await concept(
    'Primitives',
    2,
    'Primitives are the smallest building blocks',
    ['Primitives are the smallest parts.', 'Primitives use tokens.'],
  );
  await concept(
    'Components',
    3,
    'Components such as a button or a dialog are composed from primitives',
    ['Components are built from primitives.'],
  );
  await concept(
    'Patterns',
    4,
    'Patterns combine components into a solution for a recurring task',
    ['Patterns combine components for a task.'],
  );
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const climbOfNote = async (note: string) =>
  ((await vault.climb(note)) as ConceptClimb[])[0];
const stored = (note: string) =>
  vault
    .note(note)
    .then(
      (n) => n!.frontmatter.climb as Record<string, string | null> | undefined,
    );

const spar = (
  note: string,
  date: string,
  verdict: 'pass' | 'fail' = 'pass',
): RecordSessionInput => ({
  tier: 1,
  date,
  items: [
    {
      note,
      challenge: 'Explain it.',
      answer: 'In my words.',
      verdict,
      next_review: date,
    },
  ],
});

async function record(input: RecordSessionInput, at?: string) {
  if (at) clock = at;
  const r = await vault.recordSession(input, true);
  expect(r.errors).toEqual([]);
  return r;
}

const LAYERS = {
  book: BOOK,
  groups: [
    { name: 'Values', concepts: ['Design tokens'] },
    { name: 'Parts', concepts: ['Primitives'] },
    { name: 'Widgets', concepts: ['Components'] },
    { name: 'Recipes', concepts: ['Patterns'] },
  ],
  builds_on: [
    { from: 'Parts', to: 'Values' },
    { from: 'Widgets', to: 'Parts' },
    { from: 'Recipes', to: 'Widgets' },
  ],
};

describe('Read: reading notes', () => {
  it('classes a six-word copy as a quote and a paraphrase as a note, and writes nothing on preview', async () => {
    const preview = await vault.addReadingNotes(
      {
        chapter: CH,
        page: 1,
        notes: [
          'named values for colour, spacing and type',
          'everything below reads one source of truth',
        ],
      },
      false,
    );
    expect(preview.errors).toEqual([]);
    expect(preview.entries).toEqual([
      { text: 'named values for colour, spacing and type', quote: true },
      { text: 'everything below reads one source of truth', quote: false },
    ]);
    expect(preview.warnings.some((w) => /kept as a quote/.test(w))).toBe(true);
    expect(existsSync(join(dir, preview.path!))).toBe(false);
    expect(await stored(TOKENS)).toBeUndefined();
  });

  it('sets climb.read on the concepts quoting the chapter once it has an own-words note and summary', async () => {
    const r = await vault.addReadingNotes(
      {
        chapter: CH,
        page: 1,
        notes: ['everything below reads one source of truth'],
      },
      true,
    );
    expect(r.executed).toBe(true);
    expect(
      read(`3.Resources/Reading notes/${BOOK}/Chapter 1- Layers.md`),
    ).toContain(
      '- 2026-11-09 · everything below reads one source of truth — [[',
    );
    expect((await stored(TOKENS))!.read).toBe('2026-11-09');
    expect((await climbOfNote(TOKENS)).steps.read).toEqual({
      date: '2026-11-09',
      evidence: `3.Resources/Reading notes/${BOOK}/Chapter 1- Layers.md`,
    });
  });

  it('does not set read when the chapter has only quotes', async () => {
    await vault.addReadingNotes(
      {
        chapter: CH,
        page: 1,
        notes: ['named values for colour, spacing and type'],
      },
      true,
    );
    expect((await climbOfNote(TOKENS)).steps.read).toBeNull();
  });

  it("does not set read without a chapter summary in the learner's own words", async () => {
    put(CH, chapter(`> [!summary]\n> ${PAGES[0]}\n`));
    await vault.addReadingNotes(
      {
        chapter: CH,
        page: 1,
        notes: ['everything below reads one source of truth'],
      },
      true,
    );
    expect((await climbOfNote(TOKENS)).steps.read).toBeNull();
  });

  it("warns when a page's notes pass a fifth of its words", async () => {
    const r = await vault.addReadingNotes(
      {
        chapter: CH,
        page: 2,
        notes: [
          'the tiniest pieces: box, label, glyph; each one borrows its colours and gaps from the token layer below',
        ],
      },
      false,
    );
    expect(r.warnings.some((w) => /about 10-20%/.test(w))).toBe(true);
  });
});

describe('Group: the structure note', () => {
  it('passes the four layers with three builds-on edges, sets group and climb.group', async () => {
    const r = await vault.writeStructure(LAYERS, true);
    expect(r.errors).toEqual([]);
    expect(r.path).toBe(`3.Resources/Concepts/Structures/${BOOK}.md`);
    expect((await vault.note(PRIMITIVES))!.frontmatter.groups).toEqual({
      [BOOK]: 'Parts',
    });
    expect((await stored(PATTERNS))!.group).toBe('2026-11-09');
    expect((await climbOfNote(PATTERNS)).steps.group!.evidence).toBe(r.path);
  });

  it('rejects a cycle and shows it, and an orphan concept', async () => {
    const cyclic = await vault.writeStructure(
      {
        ...LAYERS,
        builds_on: [...LAYERS.builds_on, { from: 'Values', to: 'Recipes' }],
      },
      false,
    );
    expect(cyclic.errors.join('\n')).toMatch(
      /cycle: values → recipes → widgets → parts → values|cycle: .*→.*→/,
    );
    const orphan = await vault.writeStructure(
      { ...LAYERS, groups: LAYERS.groups.slice(0, 3) },
      false,
    );
    expect(orphan.errors).toContain(
      `${PATTERNS} is in no group; every concept of the book is in exactly one group`,
    );
  });

  it('rejects one group, an empty group, and an edge to a group that does not exist', async () => {
    const one = await vault.writeStructure(
      {
        book: BOOK,
        groups: [
          {
            name: 'All',
            concepts: ['Design tokens', 'Primitives', 'Components', 'Patterns'],
          },
        ],
      },
      false,
    );
    expect(one.errors).toContain('a structure has 2 to 7 groups, got 1');
    const empty = await vault.writeStructure(
      {
        ...LAYERS,
        groups: [...LAYERS.groups, { name: 'Themes', concepts: [] }],
      },
      false,
    );
    expect(empty.errors).toContain('group "Themes" is empty');
    const edge = await vault.writeStructure(
      { ...LAYERS, builds_on: [{ from: 'Layouts', to: 'Values' }] },
      false,
    );
    expect(edge.errors).toContain(
      'builds_on Layouts → Values names a group that does not exist',
    );
  });

  it('warns once about a group named after a heading of the book', async () => {
    const r = await vault.writeStructure(
      {
        ...LAYERS,
        groups: [
          { name: 'Chapter 1: Layers', concepts: ['Design tokens'] },
          ...LAYERS.groups.slice(1),
        ],
        builds_on: [],
      },
      false,
    );
    expect(r.errors).toEqual([]);
    expect(
      r.warnings.filter((w) => /heading of the book/.test(w)),
    ).toHaveLength(1);
  });

  it('keeps group and climb closed to set_frontmatter', async () => {
    const r = await vault.setFrontmatter(
      TOKENS,
      { group: 'Mine', groups: 'x', climb: 'x' },
      false,
    );
    expect(r.errors).toEqual([
      'group is written by the vault tools, not by hand',
      'groups is written by the vault tools, not by hand',
      'climb is written by the vault tools, not by hand',
    ]);
  });
});

describe('a concept drawn from several books', () => {
  const CSS = 'CSS in Depth';
  const CSS_CH = `3.Resources/0.Raw/Books/Design Team/${CSS}/chapters/03 Theming.md`;
  const THEME = '3.Resources/Concepts/Theme switch.md';
  beforeEach(async () => {
    put(
      `3.Resources/0.Raw/Books/Design Team/${CSS}/text.md`,
      `---\ntitle: "${CSS}"\nraw_role: "index"\n---\n# ${CSS}\n`,
    );
    put(
      CSS_CH,
      [
        '---',
        'title: "Chapter 3: Theming"',
        'raw_role: "chapter"',
        `book: "${CSS}"`,
        'pages: "40-40"',
        '---',
        '',
        '# Chapter 3: Theming',
        '',
        '## Page 40',
        '',
        'A theme swaps the values of custom properties at the root, and every rule that reads them follows.',
        '',
      ].join('\n'),
    );
    const r = await vault.createConcept(
      {
        title: 'Theme switch',
        summary: 'One switch, every value follows.',
        core_assertions: ['A theme swaps values at the root.'],
        passages: [
          {
            note: CSS_CH,
            quote: 'A theme swaps the values of custom properties at the root',
            pages: '40',
          },
          {
            note: CH,
            quote: 'Every other layer reads its values from the tokens',
            pages: '1',
          },
        ],
      },
      true,
    );
    expect(r.errors).toEqual([]);
  });

  it("belongs to every book it quotes, and each book's structure must place it", async () => {
    expect((await climbOfNote(THEME)).books).toEqual([CSS, BOOK]);
    const without = await vault.writeStructure(LAYERS, false);
    expect(without.errors).toContain(
      `${THEME} is in no group; every concept of the book is in exactly one group`,
    );
    await vault.writeStructure(
      {
        ...LAYERS,
        groups: LAYERS.groups.map((g) =>
          g.name === 'Values'
            ? { ...g, concepts: [...g.concepts, 'Theme switch'] }
            : g,
        ),
      },
      true,
    );
    let c = await climbOfNote(THEME);
    expect(c.steps.group!.date).toBe('2026-11-09');
    expect(c.groups).toEqual({ [BOOK]: 'Values' });
    expect(c.ungroupedIn).toEqual([CSS]);

    const one = await vault.writeStructure(
      { book: CSS, groups: [{ name: 'Theming', concepts: ['Theme switch'] }] },
      false,
    );
    expect(one.errors).toContain('a structure has 2 to 7 groups, got 1');
    c = await climbOfNote(THEME);
    expect(c.ungroupedIn).toEqual([CSS]);
  });

  it('keeps its group in each book, and is shown and interleaved by the group in its first book', async () => {
    const r = await vault.createConcept(
      {
        title: 'Cascade layers',
        summary: 'Order of rules.',
        core_assertions: ['Later layers win.'],
        passages: [
          {
            note: CSS_CH,
            quote: 'every rule that reads them follows',
            pages: '40',
          },
        ],
      },
      true,
    );
    expect(r.errors).toEqual([]);
    await vault.writeStructure(
      {
        ...LAYERS,
        groups: LAYERS.groups.map((g) =>
          g.name === 'Values'
            ? { ...g, concepts: [...g.concepts, 'Theme switch'] }
            : g,
        ),
      },
      true,
    );
    await vault.writeStructure(
      {
        book: CSS,
        groups: [
          { name: 'Theming', concepts: ['Theme switch'] },
          { name: 'Cascade', concepts: ['Cascade layers'] },
        ],
        builds_on: [{ from: 'Theming', to: 'Cascade' }],
      },
      true,
    );
    const note = await vault.note(THEME);
    expect(note!.frontmatter.groups).toEqual({
      [CSS]: 'Theming',
      [BOOK]: 'Values',
    });
    expect(note!.frontmatter.group).toBeUndefined();
    const c = await climbOfNote(THEME);
    expect(c.ungroupedIn).toEqual([]);
    const due = (await vault.dueForReview('2026-11-10')).due.find(
      (d) => d.path === THEME,
    )!;
    expect(due).toMatchObject({ book: CSS, group: 'Theming' });
    const view = await vault.climbView();
    expect(
      view.books
        .filter((b) => b.concepts.some((x) => x.path === THEME))
        .map((b) => b.book),
    ).toEqual([CSS, BOOK]);
  });
});

describe('Generate: try before you look', () => {
  const generate = (
    over: Partial<
      NonNullable<RecordSessionInput['items'][number]['generate']>
    > = {},
    answer = 'I think tokens hold the raw values that the upper layers all read from',
  ): RecordSessionInput => ({
    kind: 'generate',
    tier: 1,
    date: '2026-11-09',
    items: [
      {
        note: TOKENS,
        challenge: 'Design tokens',
        answer,
        generate: {
          attempted_at: '2026-11-09T09:00:00Z',
          revealed_at: '2026-11-09T09:01:00Z',
          marks: [
            { assertion: TOKEN_ASSERTIONS[0], mark: 'got it' },
            { assertion: TOKEN_ASSERTIONS[1], mark: 'missed' },
          ],
          ...over,
        },
      },
    ],
  });

  it('records an ungraded attempt and sets climb.generate', async () => {
    const r = await record(generate());
    expect(r.record!.items[0]).toMatchObject({
      verdict: 'ungraded',
      next_review: null,
    });
    expect((await stored(TOKENS))!.generate).toBe('2026-11-09');
    expect(parseSession(read(r.sessionFile!)).kind).toBe('generate');
  });

  it('does not count a reveal before the attempt', async () => {
    const r = await record(generate({ revealed_at: '2026-11-09T08:59:00Z' }));
    expect(r.warnings.join()).toMatch(/does not count for Generate/);
    expect((await climbOfNote(TOKENS)).steps.generate).toBeNull();
  });

  it('refuses a wrong mark without a correction, an unmarked assertion, a short attempt and a verdict', async () => {
    const wrong = await vault.recordSession(
      generate({
        marks: [
          { assertion: TOKEN_ASSERTIONS[0], mark: 'wrong' },
          { assertion: TOKEN_ASSERTIONS[1], mark: 'got it' },
        ],
      }),
      false,
    );
    expect(wrong.errors.join()).toMatch(/marked wrong and needs a correction/);
    const unmarked = await vault.recordSession(
      generate({ marks: [{ assertion: TOKEN_ASSERTIONS[0], mark: 'got it' }] }),
      false,
    );
    expect(unmarked.errors.join()).toMatch(/is not marked/);
    const short = await vault.recordSession(generate({}, 'just values'), false);
    expect(short.errors.join()).toMatch(/at least 10 words, or \/idk/);
    const idk = await vault.recordSession(generate({ idk: true }, ''), false);
    expect(idk.errors).toEqual([]);
    expect(idk.record!.items[0].answer).toBe('/idk');
    const graded = generate();
    graded.items[0].verdict = 'pass';
    expect((await vault.recordSession(graded, false)).errors.join()).toMatch(
      /not graded/,
    );
  });

  it('takes an attempt on a raw chapter before reading, and counts it for the concepts quoting it', async () => {
    await record({
      kind: 'generate',
      tier: 1,
      date: '2026-11-09',
      items: [
        {
          note: CH,
          challenge: 'Chapter 1: Layers — headings only',
          answer:
            'I expect a stack of layers where each one is built from the one under it',
          generate: {
            attempted_at: '2026-11-09T09:00:00Z',
            revealed_at: '2026-11-09T09:05:00Z',
            marks: [{ assertion: 'a stack of layers', mark: 'got it' }],
          },
        },
      ],
    });
    expect(read(CH)).not.toContain('coach_id');
    expect((await stored(COMPONENTS))!.generate).toBe('2026-11-09');
  });
});

describe('Retrieve and Space', () => {
  it('a spar sets retrieve; a same-day re-spar is not spaced; a review a day later is', async () => {
    await record(spar(TOKENS, '2026-11-09'));
    await record(spar(TOKENS, '2026-11-09'));
    let c = await climbOfNote(TOKENS);
    expect(c.steps.retrieve!.date).toBe('2026-11-09');
    expect(c.steps.space).toBeNull();
    await record(
      spar(TOKENS, '2026-11-10', 'fail'),
      '2026-11-10T09:00:00.000Z',
    );
    c = await climbOfNote(TOKENS);
    expect(c.steps.space!.date).toBe('2026-11-10');
    expect(c.spacedPass).toBeNull();
    expect(c.teach.ok).toBe(false);
  });

  it('orders attempts by their date, not by when they were recorded (a --today in the future)', async () => {
    await record(spar(TOKENS, '2026-11-09'));
    await record(spar(TOKENS, '2026-11-11'));
    await record({
      kind: 'teach',
      tier: 1,
      date: '2026-11-17',
      items: [
        {
          note: TOKENS,
          verdict: 'pass',
          next_review: '2026-11-24',
          teach: {
            turns: [
              {
                role: 'learner',
                text: 'Tokens are the values; primitives read them.',
              },
              { role: 'student', text: "Oh, so primitives don't use tokens?" },
              { role: 'learner', text: 'They do, always.' },
            ],
            misconception: {
              assertion: 1,
              text: "Primitives don't use tokens.",
            },
            misconception_corrected: true,
          },
        },
      ],
    });
    await record(spar(TOKENS, '2026-11-10', 'fail'));
    const c = await climbOfNote(TOKENS);
    expect(c.steps.space).toEqual({
      date: '2026-11-10',
      evidence: expect.any(String),
    });
    expect(c.spacedPass!.date).toBe('2026-11-11');
    expect(c.steps.teach!.date).toBe('2026-11-17');
    expect(c.current).toBe(true);
    const n = (await vault.notesWithHistory()).notes.find(
      (x) => x.path === TOKENS,
    )!;
    expect(n.history.nextReview).toBe('2026-11-24');
    expect(n.history.entries.map((e) => e.date)).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
    ]);
  });

  it("a judge's verdict recorded a day later is no spaced review and opens no Teach", async () => {
    await record(spar(TOKENS, '2026-11-09'));
    await record(
      {
        tier: 2,
        date: '2026-11-10',
        items: [
          {
            note: TOKENS,
            challenge: 'Explain it.',
            answer: 'In my words.',
            verdict: 'pass',
            next_review: '2026-11-17',
          },
        ],
      },
      '2026-11-10T09:00:00.000Z',
    );
    let c = await climbOfNote(TOKENS);
    expect(c.steps.space).toBeNull();
    expect(c.teach.ok).toBe(false);
    await record(spar(TOKENS, '2026-11-11'), '2026-11-11T09:00:00.000Z');
    c = await climbOfNote(TOKENS);
    expect(c.steps.space!.date).toBe('2026-11-11');
    expect(c.teach.ok).toBe(true);
  });

  it('a new concept is due the day after it was made, and not before', async () => {
    expect((await vault.dueForReview('2026-11-09')).due).toEqual([]);
    const due = (await vault.dueForReview('2026-11-10')).due;
    expect(due.map((d) => d.path).sort()).toEqual(
      [COMPONENTS, TOKENS, PATTERNS, PRIMITIVES].sort(),
    );
    expect(
      due.every(
        (d) => d.firstReview && d.mastery === 'unsparred' && d.book === BOOK,
      ),
    ).toBe(true);
  });

  it('interleaves the due queue by group: A1 A2 B1 becomes A1 B1 A2', async () => {
    expect(interleave(['A1', 'A2', 'B1'], (x) => x[0])).toEqual([
      'A1',
      'B1',
      'A2',
    ]);
    await vault.writeStructure(
      {
        book: BOOK,
        groups: [
          { name: 'Base', concepts: ['Components', 'Design tokens'] },
          { name: 'Top', concepts: ['Patterns', 'Primitives'] },
        ],
      },
      true,
    );
    const due = (await vault.dueForReview('2026-11-10')).due;
    expect(due.map((d) => d.group)).toEqual(['Base', 'Top', 'Base', 'Top']);
    expect((await vault.dueForReview('2026-11-10')).due).toEqual(due);
  });

  it('never drops a concept, however many passes it has', async () => {
    for (const [i, d] of ['2026-11-09', '2026-11-12', '2026-11-19'].entries())
      await record({
        tier: 2,
        date: d,
        items: [
          {
            note: TOKENS,
            challenge: 'c',
            answer: 'a',
            verdict: 'pass',
            next_review: ['2026-11-12', '2026-11-19', '2027-11-19'][i],
          },
        ],
      });
    expect(
      (await vault.dueForReview('2027-11-19')).due.map((d) => d.path),
    ).toContain(TOKENS);
  });
});

describe('Elaborate', () => {
  const answers = (over: Record<string, unknown> = {}) =>
    [
      {
        kind: 'why' as const,
        question: 'Why keep values apart from parts?',
        answer:
          'Because a rebrand then touches one file, otherwise every widget drifts on its own.',
      },
      {
        kind: 'connect' as const,
        question: 'What is it like?',
        answer: 'Like CSS custom properties I already use.',
        links: ['Custom properties'],
      },
      {
        kind: 'apply' as const,
        question: 'Where this month?',
        answer: 'In the checkout theme switch.',
        links: ['1.Projects/Checkout/Checkout.md'],
      },
    ].map((a) => ({ ...a, ...(over[a.kind] as object) }));
  const elaborate = (a = answers()): RecordSessionInput => ({
    kind: 'elaborate',
    tier: 1,
    date: '2026-11-10',
    items: [{ note: TOKENS, elaborate: { answers: a } }],
  });

  it('appends the answers under ## My elaborations only on execute, and sets climb.elaborate', async () => {
    const preview = await vault.recordSession(elaborate(), false);
    expect(preview.errors).toEqual([]);
    expect(read(TOKENS)).not.toContain('## My elaborations');
    await record(elaborate());
    const text = read(TOKENS);
    expect(text).toContain(
      '## My elaborations\n\n### 2026-11-10\n\n- **Why:** Because a rebrand',
    );
    expect(text).toContain(
      '- **Connect:** Like CSS custom properties I already use. ([[3.Resources/CSS/Custom properties|Custom properties]])',
    );
    expect((await stored(TOKENS))!.elaborate).toBe('2026-11-10');
  });

  it('fails a connect answer without a link or named item, and does not count a self-link', async () => {
    const none = await vault.recordSession(
      elaborate(answers({ connect: { links: [] } })),
      false,
    );
    expect(none.errors.join()).toMatch(
      /link another note in the vault or name a thing/,
    );
    const self = await vault.recordSession(
      elaborate(answers({ connect: { links: [TOKENS] } })),
      false,
    );
    expect(self.errors.join()).toMatch(/links? to the concept note itself/);
    const named = await vault.recordSession(
      elaborate(
        answers({ connect: { links: [], named: 'our Figma variables' } }),
      ),
      false,
    );
    expect(named.errors).toEqual([]);
  });

  it('needs a reason in why, a place in apply, and no words copied from the note', async () => {
    const why = await vault.recordSession(
      elaborate(answers({ why: { answer: 'It is just nicer.' } })),
      false,
    );
    expect(why.errors.join()).toMatch(/gives a reason/);
    const apply = await vault.recordSession(
      elaborate(answers({ apply: { links: [] } })),
      false,
    );
    expect(apply.errors.join()).toMatch(/concrete place/);
    const copied = await vault.recordSession(
      elaborate(answers({ why: { answer: `Because ${TOKEN_ASSERTIONS[1]}` } })),
      false,
    );
    expect(copied.errors.join()).toMatch(/copies the note/);
    const leading = await vault.recordSession(
      elaborate(
        answers({
          why: {
            question: `Why is it that every other layer takes its values from tokens?`,
          },
        }),
      ),
      false,
    );
    expect(leading.errors.join()).toMatch(/gives the answer away/);
  });
});

describe('Teach', () => {
  const lesson = (
    corrected: boolean,
    studentLine = "Oh, so primitives don't use tokens?",
  ): RecordSessionInput => ({
    kind: 'teach',
    tier: 1,
    date: '2026-11-10',
    items: [
      {
        note: TOKENS,
        verdict: corrected ? 'pass' : 'fail',
        next_review: '2026-11-17',
        teach: {
          turns: [
            {
              role: 'learner',
              text: 'Tokens are just CSS variables, nothing builds on them.',
            },
            { role: 'student', text: studentLine },
            {
              role: 'learner',
              text: corrected
                ? 'No: primitives read their colour and spacing from tokens, and everything above reads from primitives.'
                : 'Right.',
            },
          ],
          misconception: { assertion: 1, text: "Primitives don't use tokens." },
          misconception_corrected: corrected,
        },
      },
    ],
  });

  async function spacedPass() {
    await record(spar(TOKENS, '2026-11-09'));
    await record(spar(TOKENS, '2026-11-10'), '2026-11-10T09:00:00.000Z');
  }

  it('refuses a concept with no passed spaced review', async () => {
    await record(spar(TOKENS, '2026-11-09'));
    const r = await vault.recordSession(lesson(true), false);
    expect(r.errors.join()).toMatch(/Teach needs a passed spaced review/);
    expect((await climbOfNote(TOKENS)).teach.ok).toBe(false);
  });

  it('fails a lesson that never corrects the misconception, and refuses to call it a pass', async () => {
    await spacedPass();
    const asPass = lesson(false);
    asPass.items[0].verdict = 'pass';
    expect((await vault.recordSession(asPass, false)).errors.join()).toMatch(
      /silence is not a correction/,
    );
    await record(lesson(false));
    expect((await climbOfNote(TOKENS)).steps.teach).toBeNull();
  });

  it("refuses a student that repeats the note's words the learner never said", async () => {
    await spacedPass();
    const r = await vault.recordSession(
      lesson(true, `So ${TOKEN_ASSERTIONS[1]}`),
      false,
    );
    expect(r.errors.join()).toMatch(/the student repeats the note's words/);
  });

  it("a corrected lesson passes, sets climb.teach and can be saved as a guideline of the learner's words only", async () => {
    await spacedPass();
    const r = await record(lesson(true));
    expect(r.record!.items[0].challenge).toBe(
      "Oh, so primitives don't use tokens?",
    );
    expect(r.record!.items[0].answer).not.toContain('Oh, so');
    const c = await climbOfNote(TOKENS);
    expect(c.steps.teach!.date).toBe('2026-11-10');
    expect(await stored(TOKENS)).toMatchObject({
      retrieve: '2026-11-09',
      space: '2026-11-10',
      teach: '2026-11-10',
    });

    const g = await vault.saveGuideline(
      {
        session_id: r.record!.session_id,
        title: 'Design tokens guideline',
        folder: '1.Projects/Checkout',
      },
      true,
    );
    expect(g.errors).toEqual([]);
    const text = read('1.Projects/Checkout/Design tokens guideline.md');
    expect(text).toContain(
      'No: primitives read their colour and spacing from tokens',
    );
    expect(text).not.toContain('Oh, so');
    expect(
      (
        await vault.saveGuideline(
          {
            session_id: r.record!.session_id,
            title: 'x',
            folder: '3.Resources/0.Raw',
          },
          false,
        )
      ).errors.join(),
    ).toMatch(/not a folder under 1.Projects or 3.Resources/);
  });

  it("gives the judge the student's questions and the learner's lesson, never the note", async () => {
    await spacedPass();
    const r = await record(lesson(true));
    const payload = JSON.stringify(
      await vault.tier2Payload(r.record!.session_id),
    );
    expect(payload).toContain("Oh, so primitives don't use tokens?");
    expect(payload).toContain(
      'No: primitives read their colour and spacing from tokens',
    );
    expect(payload).not.toContain('as I understand it');
    expect(payload).not.toContain(TOKEN_ASSERTIONS[0]);
  });
});

describe('the climb record', () => {
  it('runs the demo path to all seven steps, with the next step and skipped steps along the way', async () => {
    let c = await climbOfNote(TOKENS);
    expect(c.next).toBe('read');
    await record(spar(TOKENS, '2026-11-09'));
    c = await climbOfNote(TOKENS);
    expect(c.skipped).toEqual(['read', 'group', 'generate']);

    await vault.addReadingNotes(
      {
        chapter: CH,
        page: 1,
        notes: ['everything below reads one source of truth'],
      },
      true,
    );
    await vault.writeStructure(LAYERS, true);
    await record({
      kind: 'generate',
      tier: 1,
      date: '2026-11-09',
      items: [
        {
          note: TOKENS,
          challenge: 'Design tokens',
          answer:
            'the raw values every upper layer reads, so nothing hard-codes a colour',
          generate: {
            attempted_at: '2026-11-09T10:00:00Z',
            revealed_at: '2026-11-09T10:01:00Z',
            marks: TOKEN_ASSERTIONS.map((a) => ({
              assertion: a,
              mark: 'got it' as const,
            })),
          },
        },
      ],
    });
    await record({
      kind: 'elaborate',
      tier: 1,
      date: '2026-11-09',
      items: [
        {
          note: TOKENS,
          elaborate: {
            answers: [
              {
                kind: 'why',
                question: 'Why?',
                answer: 'So that a rebrand is one change.',
              },
              {
                kind: 'connect',
                question: 'Like what?',
                answer: 'Like my CSS custom properties.',
                links: ['Custom properties'],
              },
              {
                kind: 'apply',
                question: 'Where?',
                answer: 'Checkout theming.',
                named: 'the checkout theme switch',
              },
            ],
          },
        },
      ],
    });
    await record(spar(TOKENS, '2026-11-10'), '2026-11-10T09:00:00.000Z');
    await record({
      kind: 'teach',
      tier: 1,
      date: '2026-11-10',
      items: [
        {
          note: TOKENS,
          verdict: 'pass',
          next_review: '2026-11-17',
          teach: {
            turns: [
              {
                role: 'learner',
                text: 'Tokens are the values; primitives read them.',
              },
              { role: 'student', text: "Oh, so primitives don't use tokens?" },
              { role: 'learner', text: 'They do, always.' },
            ],
            misconception: {
              assertion: 1,
              text: "Primitives don't use tokens.",
            },
            misconception_corrected: true,
          },
        },
      ],
    });

    c = await climbOfNote(TOKENS);
    expect(CLIMB_STEPS.filter((s) => !c.steps[s])).toEqual([]);
    expect(c.next).toBeNull();
    expect(c.current).toBe(true);
    expect(await stored(TOKENS)).toEqual({
      read: '2026-11-09',
      group: '2026-11-09',
      generate: '2026-11-09',
      retrieve: '2026-11-09',
      elaborate: '2026-11-09',
      space: '2026-11-10',
      teach: '2026-11-10',
    });
  });

  it('reports a summary that disagrees with the evidence and rebuilds it', async () => {
    await record(spar(TOKENS, '2026-11-09'));
    put(
      TOKENS,
      read(TOKENS).replace('retrieve: "2026-11-09"', 'retrieve: "2020-01-01"'),
    );
    expect((await climbOfNote(TOKENS)).current).toBe(false);
    const preview = await vault.rebuildClimb(false);
    expect(preview.climbs.map((c) => c.path)).toEqual([TOKENS]);
    expect((await vault.rebuildClimb(true, preview.versions)).executed).toBe(
      true,
    );
    expect((await climbOfNote(TOKENS)).current).toBe(true);
  });

  it('still reads version 1 sparring sessions', async () => {
    const r = await record(spar(TOKENS, '2026-11-09'));
    const file = read(r.sessionFile!);
    expect(parseSession(file)).toMatchObject({ version: 1, kind: 'spar' });
  });

  it('checks verbatim runs on folded words', () => {
    expect(
      sharesRun('Named VALUES for colour, spacing and type!', PAGES[0]),
    ).toBe(true);
    expect(sharesRun('values for colour spacing', PAGES[0])).toBe(false);
  });
});
