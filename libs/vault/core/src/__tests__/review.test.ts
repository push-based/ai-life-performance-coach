import { snapshot } from './fixtures.js';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { reviewPeriod, type PeriodReview } from '../review.js';

import { createVault } from '../vault.js';

let dir: string;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'review-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function seed(): void {
  put(
    '1.Projects/Expo2026/Expo2026.md',
    '---\nstatus: in-progress\n---\n- [x] Book the venue #L ✅ 2026-11-02\n',
  );
  put(
    '1.Projects/Expo2026/Workstreams/Marketing.md',
    [
      '- [x] Workshop posters #S ✅ 2026-11-03',
      '- [x] Panel posters #M ✅ 2026-11-04',
      '- [x] Badge design #M ✅ 2026-10-30',
      '- [ ] Social posts #M #slipped/2026-W44 #slipped/2026-W45 ⏳ 2026-11-09',
    ].join('\n'),
  );
  put(
    '1.Projects/Expo2026/Workstreams/Workshops.md',
    '- [x] Confirm rooms ✅ 2026-11-05\n',
  );
  put('4.Archive/OldTalk/OldTalk.md', '- [x] Send slides #M ✅ 2026-11-06\n');
  put('4.Archive/old notes/Misc.md', '- [x] Not a project ✅ 2026-11-06\n');
  put('2.Areas/Health.md', '- [x] Run #S ✅ 2026-11-04\n');
  put(
    'Plans/Quarterly/2026-Q4.md',
    '## Goals\n\n- [ ] Expo delivered [[Expo2026]] ^expo\n',
  );
  put(
    'Plans/Monthly/2026-11.md',
    '## Goals\n\n- [ ] Posters printed [[Marketing]] ↑ [[2026-Q4#^expo]] ^posters\n- [-] Podcast [[Expo2026]] ↑ [[2026-Q4#^expo]] ^podcast\n',
  );
  put(
    'Plans/Weekly/2026-W45.md',
    [
      '## Goals',
      '- [x] All posters out [[Marketing]] ↑ [[2026-11#^posters]] ^all-posters ✅ 2026-11-04',
      '- [ ] Rooms confirmed [[Workshops]] ↑ [[2026-11#^posters]] ^rooms',
      '## Ad-hoc',
      '- [x] Call the venue #S ✅ 2026-11-03',
      '- [x] Water the plants [[Health]] ✅ 2026-11-07',
    ].join('\n'),
  );
}

const review = async (period: string, today: string) =>
  reviewPeriod(...(await snapshot(dir)), period, today) as PeriodReview;

describe('review_period', () => {
  it("weighs the week's done work per project, workstream, area and unlinked, archived projects included", async () => {
    seed();
    const r = await review('2026-W45', '2026-11-09');
    expect(r.closed).toBe(true);
    expect(r.plan).toBe('Plans/Weekly/2026-W45.md');
    expect(r.effort.total).toEqual({
      weight: 1 + 1 + 3 + 8 + 1 + 3 + 1 + 1,
      tasks: 8,
    });
    expect(r.effort.projects).toEqual([
      {
        name: 'Expo2026',
        archived: false,
        weight: 13,
        tasks: 4,
        direct: { weight: 8, tasks: 1 },
        workstreams: [
          { name: 'Marketing', weight: 4, tasks: 2 },
          { name: 'Workshops', weight: 1, tasks: 1 },
        ],
      },
      {
        name: 'OldTalk',
        archived: true,
        weight: 3,
        tasks: 1,
        direct: { weight: 3, tasks: 1 },
        workstreams: [],
      },
    ]);
    expect(r.effort.areas).toEqual([{ name: 'Health', weight: 2, tasks: 2 }]);
    expect(r.effort.unlinked).toEqual({ weight: 1, tasks: 1 });
    expect(r.untaggedDone).toBe(2);
    expect(r.warnings).toEqual([
      'Plans/Weekly/2026-W45.md:5: "Call the venue" links no project, workstream or area',
    ]);
  });

  it('judges goals against today: met, open, missed and dropped', async () => {
    seed();
    const during = await review('2026-W45', '2026-11-05');
    expect(during.goals.map((g) => [g.text, g.status])).toEqual([
      ['All posters out [[Marketing]]', 'met'],
      ['Rooms confirmed [[Workshops]]', 'open'],
    ]);
    const after = await review('2026-W45', '2026-11-09');
    expect(after.goalCounts).toEqual({
      met: 1,
      open: 0,
      missed: 1,
      dropped: 0,
    });
    expect(after.goals[1].effort).toEqual({ weight: 1, tasks: 1 });
  });

  it('walks each goal down the chain to the goals that serve it', async () => {
    seed();
    const q = await review('2026-Q4', '2026-11-09');
    expect(q.goals).toHaveLength(1);
    const [expo] = q.goals;
    expect(expo).toMatchObject({
      text: 'Expo delivered [[Expo2026]]',
      status: 'open',
      effort: { weight: 13 + 3, tasks: 5 },
    });
    expect(
      expo.children.map((c) => [
        c.text,
        c.status,
        c.children.map((cc) => [cc.text, cc.status]),
      ]),
    ).toEqual([
      [
        'Posters printed [[Marketing]]',
        'open',
        [
          ['All posters out [[Marketing]]', 'met'],
          ['Rooms confirmed [[Workshops]]', 'missed'],
        ],
      ],
      ['Podcast [[Expo2026]]', 'dropped', []],
    ]);
  });

  it('lists what slipped out of the period and what slipped repeatedly', async () => {
    seed();
    const r = await review('2026-W45', '2026-11-09');
    expect(r.slipped).toEqual([
      {
        text: 'Social posts',
        note: '1.Projects/Expo2026/Workstreams/Marketing.md',
        owner: { project: 'Expo2026', workstream: 'Marketing', area: null },
        goal: false,
        slips: 2,
      },
    ]);
    expect(r.slippedRepeatedly).toEqual([
      {
        text: 'Social posts',
        note: '1.Projects/Expo2026/Workstreams/Marketing.md',
        owner: { project: 'Expo2026', workstream: 'Marketing', area: null },
        slipped: ['2026-W44', '2026-W45'],
      },
    ]);
  });

  it('reviews a day and a month by their own dates', async () => {
    seed();
    expect((await review('2026-11-03', '2026-11-03')).effort.total).toEqual({
      weight: 2,
      tasks: 2,
    });
    expect((await review('2026-10', '2026-11-09')).effort.total).toEqual({
      weight: 3,
      tasks: 1,
    });
  });

  it('refuses what is not a period, and takes today from the clock', async () => {
    seed();
    expect(
      reviewPeriod(...(await snapshot(dir)), 'soon', '2026-11-09'),
    ).toEqual({ error: expect.stringMatching(/is not a period/) });
    const vault = createVault(dir, { now: () => new Date(2026, 10, 5, 12) });
    expect(await vault.reviewPeriod('2026-W45')).toMatchObject({
      today: '2026-11-05',
      closed: false,
    });
  });
});
