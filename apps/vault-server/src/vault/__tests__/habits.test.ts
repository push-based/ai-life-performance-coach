import { scanVault, loadTree, snapshot, createVault } from './fixtures.js';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  planDays,
  planPeriod,
  TEMPLATES,
  reviewPeriod,
  type PeriodReview,
  rollOver,
  addHabits,
} from '@ai-coach/vault-application';

import {
  habitDays,
  isHabitDue,
  parseHabits,
  planning,
} from '@ai-coach/vault-domain';

let dir: string;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
const read = (rel: string) => readFileSync(join(dir, rel), 'utf-8');

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'habits-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const MORNING = '1.Projects/Promise/Workstreams/Morning routine.md';
const GYM = '1.Projects/Promise/Workstreams/Gym.md';

function seed(): void {
  put(
    '1.Projects/Promise/Promise.md',
    '---\nstatus: in-progress\n---\n# Promise\n',
  );
  put(
    MORNING,
    [
      '---',
      'status: in-progress',
      '---',
      '# Morning routine',
      '',
      'Every morning.',
      '',
      '## Habits',
      '',
      '- Up at 6:00 🔁 every day',
      '- Water before coffee 🔁 every weekday',
      '- Stretch 🔁 every fortnight',
      '',
      '## Tasks',
      '',
      '- [ ] Buy a new alarm clock #S ⏳ 2026-11-03',
    ].join('\n'),
  );
  put(
    GYM,
    '---\nstatus: in-progress\n---\n## Habits\n\n- Gym 🔁 every week on Monday, Wednesday and Friday\n',
  );
  put(
    '1.Projects/Promise/Workstreams/Old habit.md',
    '---\nstatus: done\n---\n## Habits\n\n- Old one 🔁 every day\n',
  );
}

describe('habit rules', () => {
  it('reads every day, every weekday, every weekend and every week on named days', () => {
    expect([...habitDays('every day')!]).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect([...habitDays('Every Weekday')!]).toEqual([1, 2, 3, 4, 5]);
    expect([...habitDays('every weekend')!]).toEqual([0, 6]);
    expect(
      [...habitDays('every week on Monday, Wednesday and Friday')!].sort(),
    ).toEqual([1, 3, 5]);
    expect(habitDays('every week on Funday')).toBeNull();
    expect(habitDays('every 2 days')).toBeNull();
  });

  it('knows whether a habit is due on a day', () => {
    expect(isHabitDue('every weekday', '2026-11-02')).toBe(true);
    expect(isHabitDue('every weekday', '2026-11-07')).toBe(false);
    expect(isHabitDue('every week on Monday', '2026-11-02')).toBe(true);
  });

  it('parses plain list items under Habits only, and keeps the unreadable apart', () => {
    const body =
      '## Habits\n\n- Up at 6:00 🔁 every day\n- [ ] A task 🔁 every day\n- Odd 🔁 every 3 days\n\n## Other\n\n- Not a habit 🔁 every day\n';
    const r = parseHabits(body);
    expect(r.habits).toEqual([
      { line: 2, text: 'Up at 6:00', rule: 'every day' },
    ]);
    expect(r.invalid).toEqual([{ line: 4, text: 'Odd', rule: 'every 3 days' }]);
  });
});

describe('planning', () => {
  it("lists active habits with their owner, warns about unreadable rules, and marks a day plan's checks", async () => {
    seed();
    put(
      'Plans/Daily/2026/11-November/2026-11-02.md',
      '## Habits\n\n- [x] Up at 6:00 [[Morning routine]] ✅ 2026-11-02\n\n## Ad-hoc\n\n- [ ] Call mum [[Promise]]\n',
    );
    const p = planning(await loadTree(dir), await scanVault(dir));
    expect(
      p.habits.map((h) => `${h.text}|${h.rule}|${h.owner.workstream}`),
    ).toEqual([
      'Gym|every week on Monday, Wednesday and Friday|Gym',
      'Up at 6:00|every day|Morning routine',
      'Water before coffee|every weekday|Morning routine',
    ]);
    expect(p.warnings.some((w) => w.includes('habit "Stretch"'))).toBe(true);
    const day = p.tasks.filter(
      (t) => t.note === 'Plans/Daily/2026/11-November/2026-11-02.md',
    );
    expect(day.map((t) => [t.text, t.habit])).toEqual([
      ['Up at 6:00 [[Morning routine]]', true],
      ['Call mum [[Promise]]', false],
    ]);
    expect(day[0].owner.workstream).toBe('Morning routine');
  });
});

describe('day plans', () => {
  it('the day template has a Habits section before Ad-hoc', () => {
    expect(TEMPLATES.day.indexOf('## Habits')).toBeGreaterThan(
      TEMPLATES.day.indexOf('## Today'),
    );
    expect(TEMPLATES.day.indexOf('## Habits')).toBeLessThan(
      TEMPLATES.day.indexOf('## Ad-hoc'),
    );
  });

  it('plan_period adds the habits due that day to a new day plan', async () => {
    seed();
    const r = planPeriod(...(await snapshot(dir)), { period: '2026-11-02' });
    expect(r.errors).toEqual([]);
    expect(r.habits).toEqual([
      '- [ ] Gym [[Gym]]',
      '- [ ] Up at 6:00 [[Morning routine]]',
      '- [ ] Water before coffee [[Morning routine]]',
    ]);
    expect(r.content).toContain(
      '## Habits\n\n- [ ] Gym [[Gym]]\n- [ ] Up at 6:00 [[Morning routine]]\n- [ ] Water before coffee [[Morning routine]]\n\n## Ad-hoc',
    );
  });

  it('adds only what is missing, inserts a missing section before Ad-hoc, and skips habits not due', async () => {
    seed();
    put(
      'Plans/Daily/2026/11-November/2026-11-07.md',
      '# 2026-11-07\n\n## Today\n\n## Ad-hoc\n\n## Log\n',
    );
    const sat = planPeriod(...(await snapshot(dir)), { period: '2026-11-07' });
    expect(sat.habits).toEqual(['- [ ] Up at 6:00 [[Morning routine]]']);
    expect(sat.writes['Plans/Daily/2026/11-November/2026-11-07.md']).toBe(
      '# 2026-11-07\n\n## Today\n\n## Habits\n\n- [ ] Up at 6:00 [[Morning routine]]\n\n## Ad-hoc\n\n## Log\n',
    );

    put(
      'Plans/Daily/2026/11-November/2026-11-04.md',
      '## Habits\n\n- [x] Up at 6:00 [[Morning routine]] ✅ 2026-11-04\n\n## Ad-hoc\n',
    );
    const wed = planPeriod(...(await snapshot(dir)), { period: '2026-11-04' });
    expect(wed.habits).toEqual([
      '- [ ] Gym [[Gym]]',
      '- [ ] Water before coffee [[Morning routine]]',
    ]);

    put('Plans/Daily/2026/11-November/2026-11-04.md', wed.content);
    const again = planPeriod(...(await snapshot(dir)), {
      period: '2026-11-04',
    });
    expect(again.habits).toEqual([]);
    expect(again.writes).toEqual({});
  });

  it('plan_days fills each day it plans', async () => {
    seed();
    const r = planDays(...(await snapshot(dir)), {
      '2026-11-07': {},
      '2026-11-09': {},
    });
    expect(r.errors).toEqual([]);
    expect(r.days.map((d) => d.habits.length)).toEqual([1, 3]);
  });
});

describe('open habit checks', () => {
  it('are neither rolled over nor reported as unscheduled leftovers', async () => {
    seed();
    put(
      'Plans/Daily/2026/11-November/2026-11-02.md',
      '## Habits\n\n- [ ] Up at 6:00 [[Morning routine]]\n',
    );
    put('Plans/Weekly/2026-W45.md', '## Goals\n\n## Ad-hoc\n');
    const r = rollOver(...(await snapshot(dir)), '2026-W45');
    expect(r.tasks.map((t) => t.note)).toEqual([MORNING]);
    expect(r.warnings.join('\n')).not.toContain('Up at 6:00');
  });

  it('carry no scheduled date, so no day query lists them as overdue', async () => {
    seed();
    put(
      'Plans/Daily/2026/11-November/2026-11-02.md',
      '## Habits\n\n- [ ] Up at 6:00 [[Morning routine]]\n',
    );
    put(
      'Plans/Daily/2026/11-November/2026-11-03.md',
      '## Habits\n\n- [x] Up at 6:00 [[Morning routine]] ✅ 2026-11-03\n',
    );
    const p = planning(await loadTree(dir), await scanVault(dir));
    expect(
      p.tasks.filter((t) => t.habit).every((t) => t.scheduled === null),
    ).toBe(true);
  });
});

describe('review_period', () => {
  it("counts each habit's due, ticked and missed days and its streak, and leaves habit checks out of effort", async () => {
    seed();
    put(
      'Plans/Daily/2026/11-November/2026-11-02.md',
      '## Habits\n\n- [x] Up at 6:00 [[Morning routine]] ✅ 2026-11-02\n- [x] Gym [[Gym]] ✅ 2026-11-02\n',
    );
    put(
      'Plans/Daily/2026/11-November/2026-11-03.md',
      '## Habits\n\n- [ ] Up at 6:00 [[Morning routine]]\n',
    );
    put(
      'Plans/Daily/2026/11-November/2026-11-04.md',
      '## Habits\n\n- [x] Up at 6:00 [[Morning routine]] ✅ 2026-11-04\n- [x] Gym [[Gym]] ✅ 2026-11-04\n',
    );
    put(
      'Plans/Daily/2026/11-November/2026-11-05.md',
      '## Habits\n\n- [x] Up at 6:00 [[Morning routine]] ✅ 2026-11-05\n',
    );
    const r = reviewPeriod(
      ...(await snapshot(dir)),
      '2026-W45',
      '2026-11-06',
    ) as PeriodReview;
    const by = Object.fromEntries(r.habits.map((h) => [h.text, h]));
    expect(by['Up at 6:00']).toMatchObject({
      due: 5,
      done: 3,
      missed: 1,
      streak: 2,
    });
    expect(by['Gym']).toMatchObject({ due: 3, done: 2, missed: 0, streak: 2 });
    expect(by['Water before coffee']).toMatchObject({
      due: 5,
      done: 0,
      missed: 4,
      streak: 0,
    });
    expect(r.effort.total.tasks).toBe(0);
  });
});

describe('add_habits', () => {
  it('writes plain list items under Habits, previews, and executes with versions', async () => {
    seed();
    put('2.Areas/Reading.md', '---\nstatus: in-progress\n---\n# Reading\n');
    const r = addHabits(...(await snapshot(dir)), {
      note: '2.Areas/Reading.md',
      habits: [
        { text: 'Read 10 pages', rule: 'every day' },
        { text: 'Library', rule: 'every week on Saturday' },
      ],
    });
    expect(r.errors).toEqual([]);
    expect(r.writes['2.Areas/Reading.md']).toBe(
      '---\nstatus: in-progress\n---\n# Reading\n\n## Habits\n\n- Read 10 pages 🔁 every day\n- Library 🔁 every week on Saturday\n',
    );

    const vault = createVault(dir);
    const preview = await vault.addHabits(
      { note: MORNING, habits: [{ text: 'Make the bed', rule: 'every day' }] },
      false,
    );
    const done = await vault.addHabits(
      { note: MORNING, habits: [{ text: 'Make the bed', rule: 'every day' }] },
      true,
      preview.versions,
    );
    expect(done.errors).toEqual([]);
    expect(read(MORNING)).toContain(
      '- Stretch 🔁 every fortnight\n- Make the bed 🔁 every day\n\n## Tasks',
    );
  });

  it('refuses a plan, an unreadable rule, a duplicate, and text with signifiers or links', async () => {
    seed();
    put('Plans/Daily/2026/11-November/2026-11-02.md', '## Ad-hoc\n');
    const [tree, notes] = await snapshot(dir);
    expect(
      addHabits(tree, notes, {
        note: 'Plans/Daily/2026/11-November/2026-11-02.md',
        habits: [{ text: 'X', rule: 'every day' }],
      }).errors[0],
    ).toContain('is a plan');
    const r = addHabits(tree, notes, {
      note: MORNING,
      habits: [
        { text: 'Up at 6:00', rule: 'every day' },
        { text: 'Run', rule: 'every 2 days' },
        { text: 'Walk ⏳ 2026-11-02', rule: 'every day' },
        { text: 'Walk [[Sport]]', rule: 'every day' },
      ],
    });
    expect(r.errors).toHaveLength(4);
    expect(r.errors[0]).toContain('already defines');
    expect(r.errors[1]).toContain('every 2 days');
  });
});
