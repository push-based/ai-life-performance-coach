import { createVault } from './fixtures.js';
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
import { type Vault } from '../vault.js';
import { chaptersOf, type ConceptClimb } from '../climb.js';

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

const WORK = 'Attention at Work';
const TIME = 'Living with Time';
const chapter = (
  book: string,
  file: string,
  title: string,
  pages: string[],
) => {
  const path = `3.Resources/0.Raw/Books/Invented Author/${book}/chapters/${file}.md`;
  put(
    `3.Resources/0.Raw/Books/Invented Author/${book}/text.md`,
    `---\ntitle: "${book}"\nraw_role: "index"\n---\n# ${book}\n`,
  );
  put(
    path,
    [
      '---',
      `title: "${title}"`,
      'raw_role: "chapter"',
      `book: "${book}"`,
      `pages: "1-${pages.length}"`,
      '---',
      '',
      `# ${title}`,
      '',
      '> [!summary]\n> Time slips past unnoticed unless something outside the head keeps it.',
      '',
      ...pages.flatMap((p, i) => [`## Page ${i + 1}`, '', p, '']),
    ].join('\n'),
  );
  return path;
};
let A: string;
let B: string;
const C = (t: string) => `3.Resources/Concepts/${t}.md`;

async function concept(
  title: string,
  passages: { note: string; quote: string; pages: string }[],
  assertions = [`${title} matters.`],
) {
  const r = await vault.createConcept(
    {
      title,
      summary: `${title}, in my words.`,
      core_assertions: assertions,
      passages,
    },
    true,
  );
  expect(r.errors).toEqual([]);
}
const climbOf = async (t: string) =>
  ((await vault.climb(t)) as ConceptClimb[])[0];

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'vault-topics-'));
  A = chapter(WORK, '01 Clocks', 'Chapter 1: Clocks', [
    'Time blindness means the future feels unreal until it is close, so deadlines arrive as surprises.',
    'An outside clock, such as a timer on the desk, carries the time the head does not keep.',
  ]);
  B = chapter(TIME, '02 Routines', 'Chapter 2: Routines', [
    'People who lose track of time do better with routines that start on a cue rather than a plan.',
    'A visible countdown turns an abstract hour into something the eyes can follow.',
  ]);
  clock = '2026-11-09T09:00:00.000Z';
  ids = 0;
  vault = createVault(dir, {
    now: () => new Date(clock),
    newSessionId: () => `s-${++ids}`,
    newCoachId: () => `c-${++ids}`,
  });
  await concept('Time blindness', [
    {
      note: A,
      quote: 'Time blindness means the future feels unreal until it is close',
      pages: '1',
    },
  ]);
  await concept('Outside clock', [
    {
      note: A,
      quote: 'An outside clock, such as a timer on the desk',
      pages: '2',
    },
  ]);
  await concept('Cued routines', [
    {
      note: B,
      quote: 'routines that start on a cue rather than a plan',
      pages: '1',
    },
  ]);
  await concept('Visible countdown', [
    {
      note: B,
      quote: 'A visible countdown turns an abstract hour',
      pages: '2',
    },
  ]);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const TOPIC = {
  topic: 'Focus',
  groups: [
    { name: 'What goes wrong', concepts: ['Time blindness'] },
    {
      name: 'What helps',
      concepts: ['Outside clock', 'Visible countdown', 'Cued routines'],
    },
  ],
  builds_on: [{ from: 'What helps', to: 'What goes wrong' }],
};

describe('topic structure notes', () => {
  it("lists concepts from two books in one topic; the same groups under a book refuse the other book's concepts", async () => {
    const r = await vault.writeStructure(TOPIC, true);
    expect(r.errors).toEqual([]);
    expect(r.path).toBe('3.Resources/Concepts/Structures/Focus.md');
    const note = read(r.path!);
    expect(note).toContain('topic: "Focus"');
    expect(note).not.toContain('book:');
    const asBook = await vault.writeStructure(
      { ...TOPIC, topic: undefined, book: WORK },
      false,
    );
    expect(asBook.errors).toContain(
      `group "What helps": Visible countdown is not a concept note of ${WORK}`,
    );
    expect((await climbOf('Visible countdown')).steps.group!.evidence).toBe(
      r.path,
    );
  });

  it('has no completeness rule: a concept left out is simply not in the topic', async () => {
    const r = await vault.writeStructure(
      {
        topic: 'Focus',
        groups: [
          { name: 'Problem', concepts: ['Time blindness'] },
          { name: 'Fix', concepts: ['Outside clock'] },
        ],
      },
      true,
    );
    expect(r.errors).toEqual([]);
    expect((await climbOf('Cued routines')).steps.group).toBeNull();
  });

  it('refuses a concept already in another topic, naming it, and both names with both', async () => {
    await vault.writeStructure(TOPIC, true);
    const other = await vault.writeStructure(
      {
        topic: 'Habits',
        groups: [
          { name: 'Cues', concepts: ['Cued routines'] },
          { name: 'Tools', concepts: ['Outside clock'] },
        ],
      },
      false,
    );
    expect(other.errors).toContain(
      `${C('Cued routines')} is already in topic Focus; a concept is in at most one topic`,
    );
    expect(
      (await vault.writeStructure({ ...TOPIC, book: WORK }, false)).errors,
    ).toEqual(['give either book or topic, not both or neither']);
  });

  it("refuses a topic named like a book, and a topic over a book's structure note", async () => {
    expect(
      (await vault.writeStructure({ ...TOPIC, topic: WORK }, false)).errors,
    ).toEqual([`"${WORK}" is a book's title; give the topic another name`]);
    put(
      '3.Resources/Concepts/Structures/Shelf.md',
      '---\ntype: "structure"\nbook: "Shelf"\ndate: "2026-11-01"\ngroups: []\nbuilds_on: []\n---\n',
    );
    expect(
      (
        await vault.writeStructure({ ...TOPIC, topic: 'Shelf' }, false)
      ).errors.join(),
    ).toMatch(/is not the structure note of topic Shelf; it is book Shelf's/);
  });

  it("shows and interleaves a concept by its topic group, falling back to its book's", async () => {
    await vault.writeStructure(
      {
        book: WORK,
        groups: [
          { name: 'Symptoms', concepts: ['Time blindness'] },
          { name: 'Tools', concepts: ['Outside clock'] },
        ],
      },
      true,
    );
    let tb = (await vault.dueForReview('2026-11-10')).due.find(
      (d) => d.path === C('Time blindness'),
    )!;
    expect(tb).toMatchObject({ group: 'Symptoms', topic: null, book: WORK });
    await vault.writeStructure(TOPIC, true);
    tb = (await vault.dueForReview('2026-11-10')).due.find(
      (d) => d.path === C('Time blindness'),
    )!;
    expect(tb).toMatchObject({
      group: 'What goes wrong',
      topic: 'Focus',
      book: WORK,
    });
    expect((await vault.note(C('Time blindness')))!.frontmatter).toMatchObject({
      topic: 'Focus',
      groups: { Focus: 'What goes wrong', [WORK]: 'Symptoms' },
    });
  });

  it('mixes the due queue by topic group whatever books the concepts quote: A1 A2 B1 is A1 B1 A2', async () => {
    await vault.writeStructure(
      {
        topic: 'Focus',
        groups: [
          { name: 'A', concepts: ['Cued routines', 'Outside clock'] },
          { name: 'B', concepts: ['Time blindness'] },
        ],
      },
      true,
    );
    const due = (await vault.dueForReview('2026-11-10')).due.filter(
      (d) => d.topic === 'Focus',
    );
    expect(due.map((d) => d.group)).toEqual(['A', 'B', 'A']);
    expect(due.map((d) => d.title)).toEqual([
      'Cued routines',
      'Time blindness',
      'Outside clock',
    ]);
  });

  it('drops a concept left out of a rewritten topic from it', async () => {
    const first = await vault.writeStructure(TOPIC, true);
    const again = await vault.writeStructure(
      {
        ...TOPIC,
        groups: [
          TOPIC.groups[0],
          { name: 'What helps', concepts: ['Outside clock'] },
        ],
      },
      false,
    );
    expect(again.errors).toEqual([]);
    await vault.writeStructure(
      {
        ...TOPIC,
        groups: [
          TOPIC.groups[0],
          { name: 'What helps', concepts: ['Outside clock'] },
        ],
      },
      true,
      again.versions,
    );
    const fm = (await vault.note(C('Cued routines')))!.frontmatter;
    expect(fm.topic).toBeUndefined();
    expect(fm.groups).toBeUndefined();
    expect((await climbOf('Cued routines')).steps.group).toBeNull();
    expect(first.path).toBe(again.path);
  });

  it('leaves a vault with only book structures as it was: no topic key, no topic in the queue', async () => {
    const r = await vault.writeStructure(
      {
        book: TIME,
        groups: [
          { name: 'Cues', concepts: ['Cued routines'] },
          { name: 'Seeing time', concepts: ['Visible countdown'] },
        ],
      },
      true,
    );
    expect(read(r.path!).split('\n').slice(0, 4)).toEqual([
      '---',
      'type: "structure"',
      `book: "${TIME}"`,
      'date: "2026-11-09"',
    ]);
    const content = read(C('Cued routines'));
    expect(content).not.toContain('topic:');
    expect(content).toContain(`groups:\n  "${TIME}": "Cues"`);
    expect(
      (await vault.dueForReview('2026-11-10')).due.every(
        (d) => d.topic === null,
      ),
    ).toBe(true);
    expect(await vault.listTopics()).toEqual([]);
  });

  it('lists topics with their concepts and the books they quote', async () => {
    await vault.writeStructure(TOPIC, true);
    expect(await vault.listTopics()).toEqual([
      {
        topic: 'Focus',
        path: '3.Resources/Concepts/Structures/Focus.md',
        concepts: [
          C('Time blindness'),
          C('Outside clock'),
          C('Visible countdown'),
          C('Cued routines'),
        ],
        books: [WORK, TIME],
      },
    ]);
  });
});

describe('extend_concept', () => {
  let more: {
    note: string;
    passages: { note: string; quote: string; pages: string }[];
  };
  beforeEach(() => {
    more = {
      note: 'Time blindness',
      passages: [
        {
          note: B,
          quote: 'People who lose track of time do better with routines',
          pages: '1',
        },
      ],
    };
  });

  it("adds a second book's quote, keeps the first, and the concept now quotes chapters of both books", async () => {
    const preview = await vault.extendConcept(more, false);
    expect(preview.errors).toEqual([]);
    expect(preview.passages).toEqual([{ ...more.passages[0], found: true }]);
    expect(read(C('Time blindness'))).not.toContain('lose track of time');
    const done = await vault.extendConcept(more, true, preview.versions);
    expect(done.executed).toBe(true);
    const n = (await vault.note(C('Time blindness')))!;
    expect(
      (n.frontmatter.source_passages as { note: string }[]).map((p) => p.note),
    ).toEqual([A, B]);
    expect(chaptersOf(n, await vault.notes()).map((c) => c.path)).toEqual([
      A,
      B,
    ]);
    expect(n.body).toContain(
      '> Time blindness means the future feels unreal until it is close',
    );
    expect(n.body).toContain(
      `> People who lose track of time do better with routines\n> — [[${B.replace(/\.md$/, '')}#Page 1|${TIME}, p. 1]]`,
    );
    expect((await climbOf('Time blindness')).books).toEqual([WORK, TIME]);
  });

  it('reports a quote not in the chapter and writes nothing; refuses a duplicate and a non-concept', async () => {
    const missing = await vault.extendConcept(
      {
        note: 'Time blindness',
        passages: [
          {
            note: B,
            quote: 'this sentence is in neither book at all',
            pages: '1',
          },
        ],
      },
      false,
    );
    expect(missing.errors).toEqual([
      `passages[0]: not found on pages 1 of ${B}`,
    ]);
    expect(missing.passages[0].found).toBe(false);
    const dup = await vault.extendConcept(
      {
        note: 'Time blindness',
        passages: [
          {
            note: A,
            quote:
              'TIME BLINDNESS means the future feels unreal until it is close',
            pages: '1',
          },
        ],
      },
      false,
    );
    expect(dup.errors).toEqual([
      `passages[0]: ${C('Time blindness')} already quotes this passage`,
    ]);
    expect(
      (await vault.extendConcept({ note: A, passages: more.passages }, false))
        .errors,
    ).toEqual([`${A} is not a concept note`]);
  });

  it('adds reading notes and assertions, refuses past six assertions, and warns that past sessions saw fewer', async () => {
    put('0.Inbox/Focus notes.md', '- deadlines surprise me\n');
    await vault.recordSession(
      {
        tier: 1,
        items: [
          {
            note: C('Time blindness'),
            challenge: 'Explain it.',
            answer: 'Mine.',
            verdict: 'pass',
            next_review: '2026-11-10',
          },
        ],
      },
      true,
    );
    const r = await vault.extendConcept(
      {
        note: 'Time blindness',
        from_notes: ['0.Inbox/Focus notes.md'],
        core_assertions: ['Deadlines feel unreal until they are close.'],
      },
      true,
    );
    expect(r.errors).toEqual([]);
    expect(r.warnings).toContain(
      `${C('Time blindness')} has 1 session judged against its 1 assertion; the next review checks all 2`,
    );
    const n = (await vault.note(C('Time blindness')))!;
    expect(n.frontmatter.core_assertions).toEqual([
      'Time blindness matters.',
      'Deadlines feel unreal until they are close.',
    ]);
    expect(n.body).toContain(
      '## From my reading notes\n\n- [[0.Inbox/Focus notes|Focus notes]]',
    );
    const tooMany = await vault.extendConcept(
      {
        note: 'Time blindness',
        core_assertions: ['a1', 'a2', 'a3', 'a4', 'a5'],
      },
      false,
    );
    expect(tooMany.errors).toEqual([
      `a concept note has at most 6 core assertions; it has 2 and 5 would be added`,
    ]);
  });

  it('sets Read through the new chapter when that chapter is the read one', async () => {
    await vault.addReadingNotes(
      { chapter: B, page: 1, notes: ['start on a cue, not on a plan'] },
      true,
    );
    expect((await climbOf('Time blindness')).steps.read).toBeNull();
    await vault.extendConcept(more, true);
    expect(
      (await vault.note(C('Time blindness')))!.frontmatter.climb,
    ).toMatchObject({ read: '2026-11-09' });
  });
});

describe('the vault without topics', () => {
  it('still has no Structures folder until one is written', () => {
    expect(existsSync(join(dir, '3.Resources/Concepts/Structures'))).toBe(
      false,
    );
  });
});
