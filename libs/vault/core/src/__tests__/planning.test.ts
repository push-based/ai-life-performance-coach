import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { scanVault, loadTree } from '../scan.js';
import { planInit } from '../filing.js';
import { createVault } from '../vault.js';
import {
  parseTasks,
  planOf,
  planPathIn,
  planPathOf,
  planning,
} from '@ai-coach/vault-domain';

let dir: string;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'planning-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('planOf', () => {
  it('names the level and period of a plan note', () => {
    expect(planOf('Plans/Yearly/2026.md')).toEqual({
      level: 'year',
      period: '2026',
    });
    expect(planOf('Plans/Quarterly/2026-Q4.md')).toEqual({
      level: 'quarter',
      period: '2026-Q4',
    });
    expect(planOf('Plans/Monthly/2026-11.md')).toEqual({
      level: 'month',
      period: '2026-11',
    });
    expect(planOf('Plans/Weekly/2026-W45.md')).toEqual({
      level: 'week',
      period: '2026-W45',
    });
    expect(planOf('Plans/Daily/2026/11-November/2026-11-03.md')).toEqual({
      level: 'day',
      period: '2026-11-03',
    });
  });

  it('is null for anything else', () => {
    for (const p of [
      'Plans/2026.md',
      'Plans/Weekly/2026-11.md',
      'Plans/Daily/2026-13-01.md',
      'Plans/Daily/2026/10-October/2026-11-03.md',
      'Plans/Daily/2026/2026-11-03.md',
      'Plans/Daily/2026-11/2026-11-03.md',
      'Plans/Daily/2026/11-november/2026-11-03.md',
      'Plans/Quarterly/2026-Q5.md',
      '1.Projects/Plans/Yearly/2026.md',
      'Plans/Weekly/Notes/2026-W45.md',
    ]) {
      expect(planOf(p)).toBeNull();
    }
  });
});

describe('planPathOf', () => {
  it("puts a day plan in its year's and month's folders and every other plan straight in its level", () => {
    expect(planPathOf({ level: 'day', period: '2026-11-03' })).toBe(
      'Plans/Daily/2026/11-November/2026-11-03.md',
    );
    expect(planPathOf({ level: 'week', period: '2026-W45' })).toBe(
      'Plans/Weekly/2026-W45.md',
    );
    expect(planPathOf({ level: 'day', period: '2027-01-04' })).toBe(
      'Plans/Daily/2027/1-January/2027-01-04.md',
    );
  });
});

describe('day plans at the old flat path', () => {
  it("are still read as day plans, and found only while their month's folder holds no plan of that day", () => {
    expect(planOf('Plans/Daily/2026-11-03.md')).toEqual({
      level: 'day',
      period: '2026-11-03',
    });
    const day = { level: 'day' as const, period: '2026-11-03' };
    expect(planPathIn(day, (p) => p === 'Plans/Daily/2026-11-03.md')).toBe(
      'Plans/Daily/2026-11-03.md',
    );
    expect(planPathIn(day, () => true)).toBe(
      'Plans/Daily/2026/11-November/2026-11-03.md',
    );
    expect(planPathIn(day, () => false)).toBe(
      'Plans/Daily/2026/11-November/2026-11-03.md',
    );
  });
});

describe('parseTasks', () => {
  const body = [
    '- [ ] Print workshop posters #S ⏳ 2026-11-03',
    '- [x] Build the agenda #L ✅ 2026-10-28',
    '\t- [-] Cancelled idea',
    '- [ ] Call the venue ⏫ #slipped/2026-W44 #slipped/2026-W45 [[Expo2026]]',
    '- [ ] No size here',
    '```',
    '- [ ] inside a code block',
    '```',
    'Not a task.',
  ].join('\n');

  it('reads Tasks dates, priority, size, weight and slips', () => {
    const [a, b, c, d, e] = parseTasks('1.Projects/P/Workstreams/W.md', body);
    expect(a).toMatchObject({
      text: 'Print workshop posters',
      state: 'open',
      scheduled: '2026-11-03',
      size: 'S',
      weight: 1,
      line: 0,
    });
    expect(b).toMatchObject({
      text: 'Build the agenda',
      state: 'done',
      doneOn: '2026-10-28',
      size: 'L',
      weight: 8,
    });
    expect(c).toMatchObject({ text: 'Cancelled idea', state: 'cancelled' });
    expect(d).toMatchObject({
      text: 'Call the venue [[Expo2026]]',
      priority: 'high',
      slipped: ['2026-W44', '2026-W45'],
    });
    expect(d.links).toEqual([{ kind: 'wikilink', target: 'Expo2026' }]);
    expect(e).toMatchObject({
      size: null,
      weight: 1,
      priority: null,
      slipped: [],
    });
  });

  it('reads a block id that Tasks wrote before a done date', () => {
    const [t] = parseTasks(
      'n.md',
      '- [x] All posters out [[Marketing]] ^all-posters ✅ 2026-11-04',
    );
    expect(t).toMatchObject({
      text: 'All posters out [[Marketing]]',
      blockId: 'all-posters',
      doneOn: '2026-11-04',
    });
  });

  it('reads a Tasks recurrence rule and keeps it out of the text', () => {
    const [a, b] = parseTasks(
      'n.md',
      '- [ ] Up at 6:00 🔁 every day ⏳ 2026-11-01\n- [ ] Run #M 🔁 every week on Sunday when done ⏫ ⏳ 2026-11-01 ^run',
    );
    expect(a).toMatchObject({
      text: 'Up at 6:00',
      recurrence: 'every day',
      scheduled: '2026-11-01',
    });
    expect(b).toMatchObject({
      text: 'Run',
      recurrence: 'every week on Sunday when done',
      size: 'M',
      priority: 'high',
      blockId: 'run',
    });
    expect(parseTasks('n.md', '- [ ] Once')[0].recurrence).toBeNull();
  });

  it('skips code blocks', () => {
    expect(parseTasks('n.md', body)).toHaveLength(5);
  });

  it('marks goals under a Goals heading of a plan above the day, with block id and parent', () => {
    const plan = [
      '## Goals',
      '- [ ] [[Marketing]]: posters out #M ↑ [[2026-Q4#^expo]] ^posters',
      '## This week',
      '- [ ] Call the venue [[Expo2026]]',
    ].join('\n');
    const [goal, task] = parseTasks('Plans/Weekly/2026-W45.md', plan, {
      level: 'week',
      period: '2026-W45',
    });
    expect(goal).toMatchObject({
      goal: true,
      text: '[[Marketing]]: posters out',
      size: 'M',
      blockId: 'posters',
      parent: { target: '2026-Q4', block: 'expo' },
    });
    expect(goal.links).toEqual([{ kind: 'wikilink', target: 'Marketing' }]);
    expect(task.goal).toBe(false);
    expect(
      parseTasks('Plans/Daily/2026/11-November/2026-11-03.md', plan, {
        level: 'day',
        period: '2026-11-03',
      })[0].goal,
    ).toBe(false);
    expect(parseTasks('1.Projects/P/P.md', plan)[0].goal).toBe(false);
  });
});

describe('planning', () => {
  function seed(): void {
    put(
      '1.Projects/Expo2026/Expo2026.md',
      '---\nstatus: in-progress\ndeadline: 2026-11-22\ndone_when: The conference ran and the retro is written\n---\n- [ ] Book the venue #L\n',
    );
    put(
      '1.Projects/Expo2026/Workstreams/Workshops.md',
      '---\nstatus: done\n---\n- [x] All slots taken #M ✅ 2026-10-20\n',
    );
    put(
      '1.Projects/Expo2026/Workstreams/Marketing/Marketing.md',
      '---\nstatus: in-progress\n---\n# Marketing\n',
    );
    put(
      '1.Projects/Expo2026/Workstreams/Marketing/Items.md',
      '- [ ] Workshop posters #S ⏳ 2026-11-03\n',
    );
    put('1.Projects/Expo2026/Workstreams/Marketing/Poster.jpeg', 'binary');
    put('1.Projects/Expo2026/Workstreams/Badges/Facilitator.jpeg', 'binary');
    put(
      '1.Projects/Expo2026/Workstreams/Panels/List.md',
      '- [ ] Find a moderator\n',
    );
    put(
      '1.Projects/Expo2026/Intermediate Packets/Speaker onboarding checklist.md',
      'Checklist.\n',
    );
    put(
      '1.Projects/Garden/Notes/Slides.md',
      '---\nstatus: In Progress\n---\n- [ ] Group one slides\n',
    );
    put('2.Areas/Health.md', '---\nstatus: todo\n---\n');
    put('2.Areas/Reading/Reading.md', '# Reading\n');
    put('2.Areas/Reading/Books to buy.md', '- [ ] Buy a book #S\n');
    put(
      'Plans/Quarterly/2026-Q4.md',
      '## Goals\n- [ ] Expo delivered [[Expo2026]] ^expo\n',
    );
    put(
      'Plans/Weekly/2026-W45.md',
      [
        '## Goals',
        '- [ ] [[Marketing]]: posters out #M ↑ [[2026-Q4#^expo]]',
        '- [ ] Sleep eight hours [[Health]]',
        '## Ad-hoc',
        '- [ ] Call the venue #S [[Items]]',
        '- [ ] Water the plants',
      ].join('\n'),
    );
    put('3.Resources/Reading notes.md', '- [ ] Not planned work\n');
    put('0.Inbox/Idea.md', '- [ ] Not planned either\n');
    put(
      'Plans/Daily/2026/11-November/2026-11-03.md',
      '## Today\n```tasks\nscheduled on 2026-11-03\n```\n## Log\nGood day.\n',
    );
    put('Plans/Weekly/notes.md', 'A stray note.\n');
  }

  it('reads projects with their note, status, deadline, definition of done and workstreams', async () => {
    seed();
    const p = planning(await loadTree(dir), await scanVault(dir));
    const expo = p.projects.find((x) => x.name === 'Expo2026')!;
    expect(expo).toMatchObject({
      note: '1.Projects/Expo2026/Expo2026.md',
      status: 'in-progress',
      deadline: '2026-11-22',
      doneWhen: 'The conference ran and the retro is written',
      packets: [
        '1.Projects/Expo2026/Intermediate Packets/Speaker onboarding checklist.md',
      ],
    });
    expect(
      expo.workstreams.map((w) => [
        w.name,
        w.path,
        w.note,
        w.status,
        w.notes.length,
      ]),
    ).toEqual([
      ['Badges', '1.Projects/Expo2026/Workstreams/Badges', null, null, 0],
      [
        'Marketing',
        '1.Projects/Expo2026/Workstreams/Marketing',
        '1.Projects/Expo2026/Workstreams/Marketing/Marketing.md',
        'in-progress',
        2,
      ],
      ['Panels', '1.Projects/Expo2026/Workstreams/Panels', null, null, 1],
      [
        'Workshops',
        '1.Projects/Expo2026/Workstreams/Workshops.md',
        '1.Projects/Expo2026/Workstreams/Workshops.md',
        'done',
        1,
      ],
    ]);
  });

  it('warns about a missing project note and reads status only from project, workstream and area notes', async () => {
    seed();
    const p = planning(await loadTree(dir), await scanVault(dir));
    expect(p.projects.find((x) => x.name === 'Garden')).toMatchObject({
      note: null,
      workstreams: [],
    });
    expect(p.warnings).toEqual(
      expect.arrayContaining([
        '1.Projects/Garden: no project note 1.Projects/Garden/Garden.md',
      ]),
    );
    expect(p.warnings.some((w) => w.includes('In Progress'))).toBe(false);
  });

  it('reads areas as notes or folders', async () => {
    seed();
    const p = planning(await loadTree(dir), await scanVault(dir));
    expect(
      p.areas.map((a) => [a.name, a.note, a.status, a.notes.length]),
    ).toEqual([
      ['Health', '2.Areas/Health.md', 'todo', 1],
      ['Reading', '2.Areas/Reading/Reading.md', null, 2],
    ]);
  });

  it('lists plans and warns about a note in Plans/ that is not one', async () => {
    seed();
    const p = planning(await loadTree(dir), await scanVault(dir));
    expect(p.plans.map((x) => `${x.level}:${x.period}`).sort()).toEqual([
      'day:2026-11-03',
      'quarter:2026-Q4',
      'week:2026-W45',
    ]);
    expect(p.warnings).toContain(
      'Plans/Weekly/notes.md: not a plan name; expected Plans/<Yearly|Quarterly|Monthly|Weekly|Daily>/<period>.md, a day as Plans/Daily/<year>/<month number>-<month name>/YYYY-MM-DD.md',
    );
  });

  it('gives each task its owner: by path in a project or area, by link in a plan', async () => {
    seed();
    const p = planning(await loadTree(dir), await scanVault(dir));
    const owner = (text: string) =>
      p.tasks.find((t) => t.text.startsWith(text))!.owner;
    expect(owner('Book the venue')).toEqual({
      project: 'Expo2026',
      workstream: null,
      area: null,
    });
    expect(owner('Workshop posters')).toEqual({
      project: 'Expo2026',
      workstream: 'Marketing',
      area: null,
    });
    expect(owner('Find a moderator')).toEqual({
      project: 'Expo2026',
      workstream: 'Panels',
      area: null,
    });
    expect(owner('Group one slides')).toEqual({
      project: 'Garden',
      workstream: null,
      area: null,
    });
    expect(owner('Buy a book')).toEqual({
      project: null,
      workstream: null,
      area: 'Reading',
    });
    expect(owner('[[Marketing]]: posters out')).toEqual({
      project: 'Expo2026',
      workstream: 'Marketing',
      area: null,
    });
    expect(owner('Sleep eight hours')).toEqual({
      project: null,
      workstream: null,
      area: 'Health',
    });
    expect(owner('Call the venue')).toEqual({
      project: 'Expo2026',
      workstream: 'Marketing',
      area: null,
    });
    expect(owner('Expo delivered')).toEqual({
      project: 'Expo2026',
      workstream: null,
      area: null,
    });
    expect(owner('Water the plants')).toEqual({
      project: null,
      workstream: null,
      area: null,
    });
    expect(p.tasks.some((t) => t.text.startsWith('Not planned'))).toBe(false);
  });

  it('warns about unlinked plan items and goals below the year without a parent', async () => {
    seed();
    const p = planning(await loadTree(dir), await scanVault(dir));
    expect(p.warnings).toContain(
      'Plans/Weekly/2026-W45.md:6: "Water the plants" links no project, workstream or area',
    );
    expect(p.warnings).toContain(
      'Plans/Weekly/2026-W45.md:3: goal "Sleep eight hours [[Health]]" links no parent goal',
    );
    expect(p.warnings).toContain(
      'Plans/Quarterly/2026-Q4.md:2: goal "Expo delivered [[Expo2026]]" links no parent goal',
    );
    expect(p.warnings.some((w) => w.includes('posters out'))).toBe(false);
  });

  it('reports a status outside the vocabulary', async () => {
    put('1.Projects/X/X.md', '---\nstatus: Done\n---\n');
    const p = planning(await loadTree(dir), await scanVault(dir));
    expect(p.warnings).toContain(
      '1.Projects/X/X.md: status "Done" is not one of todo, in-progress, blocked, done',
    );
  });
});

describe('init_vault and Plans/', () => {
  it('leaves Plans/ in place', async () => {
    for (const f of [
      '0.Inbox',
      '1.Projects',
      '2.Areas',
      '3.Resources',
      '4.Archive',
    ])
      mkdirSync(join(dir, f));
    put('Plans/Weekly/2026-W45.md', '## Goals\n');
    put('Stray.md', 'Outside PARA.\n');
    const plan = await planInit(await loadTree(dir));
    expect(plan.actions).toEqual([
      { op: 'move', from: 'Stray.md', to: '4.Archive/old notes/Stray.md' },
      { op: 'create', to: 'Plans/Yearly' },
      { op: 'create', to: 'Plans/Quarterly' },
      { op: 'create', to: 'Plans/Monthly' },
      { op: 'create', to: 'Plans/Daily' },
      { op: 'create', to: 'Plans/Templates' },
      { op: 'write', to: 'Plans/Templates/Yearly.md' },
      { op: 'write', to: 'Plans/Templates/Quarterly.md' },
      { op: 'write', to: 'Plans/Templates/Monthly.md' },
      { op: 'write', to: 'Plans/Templates/Weekly.md' },
      { op: 'write', to: 'Plans/Templates/Daily.md' },
    ]);
  });
});

describe('init_vault planning layout (Decision 14)', () => {
  function seedProjects(): void {
    for (const f of ['0.Inbox', '2.Areas', '3.Resources', '4.Archive'])
      mkdirSync(join(dir, f));
    put(
      '1.Projects/Expo2026/Workstreams/Workshops.md',
      '- [x] All slots taken\n',
    );
    put(
      '1.Projects/Expo2026/Workstreams/Panels.md',
      '- [ ] Find a moderator\n',
    );
    put('1.Projects/Expo2026/Workstreams/Marketing/Items.md', '## Posters\n');
    put('1.Projects/Garden/Garden.md', '---\nstatus: todo\n---\n# Garden\n');
  }

  it('previews the layout, a note for each project without one, and the areas asked for', async () => {
    seedProjects();
    const plan = await planInit(await loadTree(dir), {
      areas: ['Health', 'Public Speaking'],
    });
    expect(plan.errors).toEqual([]);
    expect(plan.collisions).toEqual([]);
    expect(plan.actions).toEqual([
      { op: 'create', to: 'Plans' },
      { op: 'create', to: 'Plans/Yearly' },
      { op: 'create', to: 'Plans/Quarterly' },
      { op: 'create', to: 'Plans/Monthly' },
      { op: 'create', to: 'Plans/Weekly' },
      { op: 'create', to: 'Plans/Daily' },
      { op: 'create', to: 'Plans/Templates' },
      { op: 'write', to: 'Plans/Templates/Yearly.md' },
      { op: 'write', to: 'Plans/Templates/Quarterly.md' },
      { op: 'write', to: 'Plans/Templates/Monthly.md' },
      { op: 'write', to: 'Plans/Templates/Weekly.md' },
      { op: 'write', to: 'Plans/Templates/Daily.md' },
      { op: 'write', to: '1.Projects/Expo2026/Expo2026.md' },
      { op: 'write', to: '2.Areas/Health.md' },
      { op: 'write', to: '2.Areas/Public Speaking.md' },
    ]);
    expect(plan.contents!['1.Projects/Expo2026/Expo2026.md']).toBe(
      [
        '---',
        'status: in-progress',
        'deadline:',
        'done_when:',
        '---',
        '# Expo2026',
        '',
        '## Workstreams',
        '',
        '- Marketing (folder)',
        '- [[1.Projects/Expo2026/Workstreams/Panels|Panels]]',
        '- [[1.Projects/Expo2026/Workstreams/Workshops|Workshops]]',
        '',
      ].join('\n'),
    );
  });

  it('applies the plan, after which planning reads the projects and a second run has nothing to do', async () => {
    seedProjects();
    const vault = createVault(dir);
    expect((await vault.initVault(true, { areas: ['Health'] })).executed).toBe(
      true,
    );
    const p = await vault.planning();
    const expo = p.projects.find((x) => x.name === 'Expo2026')!;
    expect(expo).toMatchObject({
      status: 'in-progress',
      note: '1.Projects/Expo2026/Expo2026.md',
    });
    expect(expo.workstreams.map((w) => w.name)).toEqual([
      'Marketing',
      'Panels',
      'Workshops',
    ]);
    expect(p.areas.map((a) => a.name)).toEqual(['Health']);
    expect(
      (await vault.initVault(false, { areas: ['Health'] })).actions,
    ).toEqual([]);
  });
});

describe('init_vault areas under a folder it renames', () => {
  it('sees an area note inside an Areas/ folder that becomes 2.Areas, and plans no write onto it', async () => {
    put('Areas/Health.md', '# Health\n');
    const plan = await planInit(await loadTree(dir), {
      areas: ['Health', 'Sport'],
    });
    expect(plan.actions).toContainEqual({
      op: 'rename',
      from: 'Areas',
      to: '2.Areas',
    });
    expect(
      plan.actions.filter(
        (a) => a.op === 'write' && a.to.startsWith('2.Areas/'),
      ),
    ).toEqual([{ op: 'write', to: '2.Areas/Sport.md' }]);
    const vault = createVault(dir);
    expect(
      (await vault.initVault(true, { areas: ['Health', 'Sport'] })).executed,
    ).toBe(true);
    expect(readFileSync(join(dir, '2.Areas/Health.md'), 'utf-8')).toBe(
      '# Health\n',
    );
  });
});
