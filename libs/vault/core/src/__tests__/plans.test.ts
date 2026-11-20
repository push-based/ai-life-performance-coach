import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  periodOf,
  isoWeekOf,
  planPeriod,
  executePlanPeriod,
  TEMPLATES,
} from '../plans.js';
import { scanVault, fsListing } from '../scan.js';
import { createVault } from '../vault.js';
import { planning } from '@ai-coach/vault-domain';

let dir: string;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
const read = (rel: string) => readFileSync(join(dir, rel), 'utf-8');

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'plans-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('periodOf', () => {
  it('gives each level its first and last day', () => {
    expect(periodOf('2026')).toEqual({
      level: 'year',
      period: '2026',
      start: '2026-01-01',
      end: '2026-12-31',
    });
    expect(periodOf('2026-Q4')).toEqual({
      level: 'quarter',
      period: '2026-Q4',
      start: '2026-10-01',
      end: '2026-12-31',
    });
    expect(periodOf('2026-02')).toEqual({
      level: 'month',
      period: '2026-02',
      start: '2026-02-01',
      end: '2026-02-28',
    });
    expect(periodOf('2026-W45')).toEqual({
      level: 'week',
      period: '2026-W45',
      start: '2026-11-02',
      end: '2026-11-08',
    });
    expect(periodOf('2026-W01')).toMatchObject({
      start: '2025-12-29',
      end: '2026-01-04',
    });
    expect(periodOf('2026-W53')).toMatchObject({
      start: '2026-12-28',
      end: '2027-01-03',
    });
    expect(periodOf('2026-11-03')).toEqual({
      level: 'day',
      period: '2026-11-03',
      start: '2026-11-03',
      end: '2026-11-03',
    });
  });

  it('rejects what is not a period, including a week 53 the year lacks and an impossible day', () => {
    expect(periodOf('2025-W53')).toBeNull();
    expect(periodOf('2026-W54')).toBeNull();
    expect(periodOf('2026-02-30')).toBeNull();
    expect(periodOf('next week')).toBeNull();
    expect(periodOf('2020-W53')).toMatchObject({
      start: '2020-12-28',
      end: '2021-01-03',
    });
  });

  it('finds the ISO week of a day across a year boundary', () => {
    expect(isoWeekOf('2026-11-03')).toBe('2026-W45');
    expect(isoWeekOf('2027-01-01')).toBe('2026-W53');
    expect(isoWeekOf('2025-12-29')).toBe('2026-W01');
    expect(isoWeekOf('2021-01-03')).toBe('2020-W53');
  });
});

describe('plan_period', () => {
  function seed(): void {
    put(
      '1.Projects/Expo2026/Expo2026.md',
      '---\nstatus: in-progress\n---\n# Expo2026\n',
    );
    put(
      '1.Projects/Expo2026/Workstreams/Marketing/Marketing.md',
      '# Marketing\n',
    );
    put(
      '1.Projects/Expo2026/Workstreams/Marketing/Items.md',
      '---\nstatus: in-progress\n---\n## Posters\n\n- [ ] Workshop posters #S\n- [ ] Panel posters #M ⏳ 2026-10-20 ^pp\n- [x] Badge design ✅ 2026-10-01\n',
    );
    put(
      '1.Projects/Expo2026/Workstreams/Workshops.md',
      '- [ ] Confirm rooms\n- [ ] Confirm catering\n',
    );
    put('2.Areas/Health.md', '# Health\n');
    put(
      'Plans/Quarterly/2026-Q4.md',
      '# 2026-Q4\n\n## Goals\n\n- [ ] Expo delivered [[Expo2026]] ^expo-delivered\n\n## Review\n',
    );
  }

  it('creates a week plan from the built-in template with linked goals, parents and block ids', async () => {
    seed();
    put(
      'Plans/Monthly/2026-11.md',
      '## Goals\n\n- [ ] Posters printed [[Marketing]] ↑ [[2026-Q4#^expo-delivered]] ^posters-printed\n',
    );
    const plan = planPeriod(dir, await scanVault(dir), {
      period: '2026-W45',
      goals: [
        {
          text: 'All workshop posters out',
          link: 'Marketing',
          size: 'M',
          parent: '2026-11#^posters-printed',
        },
        { text: 'Sleep eight hours', link: 'Health' },
      ],
      adHoc: [
        {
          text: 'Call the venue',
          link: 'Expo2026',
          size: 'S',
          date: '2026-11-04',
        },
      ],
    });
    expect(plan.errors).toEqual([]);
    expect(plan.warnings).toEqual([
      'goal "Sleep eight hours" has no parent goal',
    ]);
    expect(plan).toMatchObject({
      plan: 'Plans/Weekly/2026-W45.md',
      creates: true,
    });
    expect(plan.goalIds).toEqual([
      { text: 'All workshop posters out', id: 'all-workshop-posters-out' },
      { text: 'Sleep eight hours', id: 'sleep-eight-hours' },
    ]);
    const lines = plan.content.split('\n');
    expect(lines.slice(0, 7)).toEqual([
      '# 2026-W45',
      '',
      '## Goals',
      '',
      '- [ ] All workshop posters out [[Marketing]] #M ↑ [[2026-11#^posters-printed]] ^all-workshop-posters-out',
      '- [ ] Sleep eight hours [[Health]] ^sleep-eight-hours',
      '',
    ]);
    expect(plan.content).toContain(
      '```tasks\nnot done\nscheduled in 2026-W45\ngroup by folder\n```',
    );
    expect(plan.content).toContain(
      '## Ad-hoc\n\n- [ ] Call the venue [[Expo2026]] #S ⏳ 2026-11-04\n\n## Done',
    );

    await executePlanPeriod(dir, plan);
    const p = planning(fsListing(dir), await scanVault(dir));
    const goals = p.tasks.filter(
      (t) => t.plan?.period === '2026-W45' && t.goal,
    );
    expect(goals.map((g) => [g.text, g.owner, g.parent])).toEqual([
      [
        'All workshop posters out [[Marketing]]',
        { project: 'Expo2026', workstream: 'Marketing', area: null },
        { target: '2026-11', block: 'posters-printed' },
      ],
      [
        'Sleep eight hours [[Health]]',
        { project: null, workstream: null, area: 'Health' },
        null,
      ],
    ]);
    expect(p.warnings.filter((w) => w.includes('2026-W45'))).toEqual([
      'Plans/Weekly/2026-W45.md:6: goal "Sleep eight hours [[Health]]" links no parent goal',
    ]);
  });

  it("uses the vault's own template when it has one", async () => {
    seed();
    put(
      'Plans/Templates/Monthly.md',
      '# My month {{title}}\n\n## Goals\n\n## Notes\n',
    );
    const plan = planPeriod(dir, await scanVault(dir), {
      period: '2026-11',
      goals: [
        {
          text: 'Posters printed',
          link: 'Marketing',
          parent: '2026-Q4#^expo-delivered',
        },
      ],
    });
    expect(plan.content).toBe(
      '# My month 2026-11\n\n## Goals\n\n- [ ] Posters printed [[Marketing]] ↑ [[2026-Q4#^expo-delivered]] ^posters-printed\n\n## Notes\n',
    );
  });

  it('adds to an existing plan without touching what is there, keeping block ids unique', async () => {
    seed();
    const plan = planPeriod(dir, await scanVault(dir), {
      period: '2026-Q4',
      goals: [{ text: 'Expo delivered', link: 'Expo2026', parent: '2026#^x' }],
    });
    expect(plan.errors).toEqual([
      'goal "Expo delivered": no goal ^x in Plans/Yearly/2026.md',
    ]);
    const ok = planPeriod(dir, await scanVault(dir), {
      period: '2026-Q4',
      goals: [{ text: 'Expo delivered', link: 'Expo2026' }],
      adHoc: [{ text: 'Book flights', link: 'Health' }],
    });
    expect(ok.errors).toEqual([]);
    expect(ok.creates).toBe(false);
    expect(ok.content).toBe(
      '# 2026-Q4\n\n## Goals\n\n- [ ] Expo delivered [[Expo2026]] ^expo-delivered\n- [ ] Expo delivered [[Expo2026]] ^expo-delivered-2\n\n## Review\n\n## Ad-hoc\n\n- [ ] Book flights [[Health]]\n',
    );
  });

  it('schedules existing open tasks where they stand, after any frontmatter and before a block id', async () => {
    seed();
    const plan = planPeriod(dir, await scanVault(dir), {
      period: '2026-W45',
      schedule: [
        {
          note: '1.Projects/Expo2026/Workstreams/Marketing/Items.md',
          task: 'workshop posters',
          date: '2026-11-03',
        },
        {
          note: '1.Projects/Expo2026/Workstreams/Marketing/Items.md',
          task: 'Panel posters',
        },
      ],
    });
    expect(plan.errors).toEqual([]);
    expect(plan.edits).toEqual([
      {
        note: '1.Projects/Expo2026/Workstreams/Marketing/Items.md',
        line: 2,
        fileLine: 6,
        before: '- [ ] Workshop posters #S',
        after: '- [ ] Workshop posters #S ⏳ 2026-11-03',
      },
      {
        note: '1.Projects/Expo2026/Workstreams/Marketing/Items.md',
        line: 3,
        fileLine: 7,
        before: '- [ ] Panel posters #M ⏳ 2026-10-20 ^pp',
        after: '- [ ] Panel posters #M ⏳ 2026-11-02 ^pp',
      },
    ]);
    await executePlanPeriod(dir, plan);
    expect(read('1.Projects/Expo2026/Workstreams/Marketing/Items.md')).toBe(
      '---\nstatus: in-progress\n---\n## Posters\n\n- [ ] Workshop posters #S ⏳ 2026-11-03\n- [ ] Panel posters #M ⏳ 2026-11-02 ^pp\n- [x] Badge design ✅ 2026-10-01\n',
    );
    expect(existsSync(join(dir, 'Plans/Weekly/2026-W45.md'))).toBe(true);
  });

  it('refuses what it cannot place, and names it', async () => {
    seed();
    const r = planPeriod(dir, await scanVault(dir), {
      period: '2026-W45',
      goals: [
        { text: 'A', link: 'Nowhere' },
        { text: 'B', link: 'Marketing', parent: '2026-Q4#^expo-delivered' },
      ],
      adHoc: [{ text: 'C', link: 'Health', date: '2026-11-20' }],
      schedule: [
        {
          note: '1.Projects/Expo2026/Workstreams/Workshops.md',
          task: 'Confirm',
        },
        {
          note: '1.Projects/Expo2026/Workstreams/Marketing/Items.md',
          task: 'Badge',
        },
        { note: '3.Resources/Elsewhere.md', task: 'x' },
      ],
    });
    expect(r.errors).toEqual([
      'goal "A": "Nowhere" is not a project note, workstream note or area note',
      'goal "B": a week goal\'s parent is a month goal, not a quarter goal',
      'task "C": 2026-11-20 is not a day in 2026-W45 (2026-11-02 to 2026-11-08)',
      'schedule: 2 open tasks in 1.Projects/Expo2026/Workstreams/Workshops.md match "Confirm": Confirm rooms; Confirm catering',
      'schedule: no open task in 1.Projects/Expo2026/Workstreams/Marketing/Items.md match "Badge"',
      'schedule: no note 3.Resources/Elsewhere.md',
    ]);
    expect(
      planPeriod(dir, await scanVault(dir), {
        period: '2026-11-03',
        goals: [{ text: 'x', link: 'Health' }],
      }).errors,
    ).toEqual([
      'a day plan holds no goals; add the work as ad-hoc tasks or schedule tasks into it',
    ]);
    expect(
      planPeriod(dir, await scanVault(dir), { period: 'soon' }).errors[0],
    ).toMatch(/is not a period/);
  });

  it('previews by default, and refuses to write over a note changed after the preview', async () => {
    seed();
    const vault = createVault(dir);
    const input = {
      period: '2026-W45',
      schedule: [
        { note: '1.Projects/Expo2026/Workstreams/Workshops.md', task: 'rooms' },
      ],
    };
    const preview = await vault.planPeriod(input, false);
    expect(preview.executed).toBe(false);
    expect(existsSync(join(dir, 'Plans/Weekly/2026-W45.md'))).toBe(false);
    const plan = planPeriod(dir, await scanVault(dir), input);
    put(
      '1.Projects/Expo2026/Workstreams/Workshops.md',
      '- [ ] Confirm rooms\n',
    );
    await expect(executePlanPeriod(dir, plan)).rejects.toThrow(
      /Workshops\.md changed since the preview/,
    );
    expect(existsSync(join(dir, 'Plans/Weekly/2026-W45.md'))).toBe(false);
    expect((await vault.planPeriod(input, true)).executed).toBe(true);
  });

  it('ships a template for each level with no empty checkbox', () => {
    for (const t of Object.values(TEMPLATES)) {
      expect(t.startsWith('# {{title}}\n')).toBe(true);
      expect(t).not.toMatch(/- \[ \]/);
    }
    expect(TEMPLATES.day).not.toContain('## Goals');
  });
});

describe('plan_period edge cases', () => {
  it("writes a new day plan into its month's folder, and an unmigrated one where it is", async () => {
    put('2.Areas/Health.md', '# Health\n');
    put('Plans/Daily/2026-11-03.md', '# 2026-11-03\n\n## Ad-hoc\n');
    const flat = planPeriod(dir, await scanVault(dir), {
      period: '2026-11-03',
      adHoc: [{ text: 'Stretch', link: 'Health' }],
    });
    expect(flat.plan).toBe('Plans/Daily/2026-11-03.md');
    expect(flat.creates).toBe(false);
    const fresh = planPeriod(dir, await scanVault(dir), {
      period: '2026-11-04',
      adHoc: [{ text: 'Stretch', link: 'Health' }],
    });
    expect(fresh.plan).toBe('Plans/Daily/2026/11-November/2026-11-04.md');
    expect(fresh.creates).toBe(true);
  });

  it('keeps new goals when it also schedules a task in the same plan', async () => {
    put('2.Areas/Health.md', '# Health\n');
    put(
      'Plans/Weekly/2026-W45.md',
      '## Goals\n\n## Ad-hoc\n\n- [ ] Call the physio [[Health]]\n',
    );
    const r = planPeriod(dir, await scanVault(dir), {
      period: '2026-W45',
      goals: [{ text: 'Sleep eight hours', link: 'Health' }],
      schedule: [
        {
          note: 'Plans/Weekly/2026-W45.md',
          task: 'Call the physio',
          date: '2026-11-05',
        },
      ],
    });
    expect(r.errors).toEqual([]);
    const written = r.writes['Plans/Weekly/2026-W45.md'];
    expect(written).toBe(r.content);
    expect(written).toContain(
      '- [ ] Sleep eight hours [[Health]] ^sleep-eight-hours',
    );
    expect(written).toContain('- [ ] Call the physio [[Health]] ⏳ 2026-11-05');
  });
});
