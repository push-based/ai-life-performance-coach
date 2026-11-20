import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { request, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { plansView, type PlansView } from '../plansview.js';
import { snapshot } from '../scan.js';
import { createVault } from '../vault.js';
import { createVaultViewServer, listenOnLoopback } from '../view.js';

let dir: string;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'plansview-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function seed(): void {
  put(
    '1.Projects/Expo2026/Expo2026.md',
    '---\nstatus: in-progress\ndeadline: 2026-11-22\n---\n- [x] Book the venue #L ✅ 2026-10-20\n',
  );
  put(
    '1.Projects/Expo2026/Workstreams/Marketing.md',
    [
      '---',
      'status: in-progress',
      '---',
      '- [x] Workshop posters #S ✅ 2026-11-03',
      '- [x] Panel posters #M ✅ 2026-11-04',
      '- [ ] Social posts #M #slipped/2026-W45 ⏳ 2026-11-09',
      '- [ ] Later #S ⏳ 2027-01-04',
      '- [-] Dropped #L ⏳ 2026-11-10',
    ].join('\n'),
  );
  put(
    '1.Projects/Expo2026/Intermediate Packets/Onboarding checklist.md',
    '---\ntype: intermediate-packet\n---\n# Onboarding checklist\n',
  );
  put('4.Archive/OldTalk/OldTalk.md', '- [x] Send slides #M ✅ 2026-11-05\n');
  put('2.Areas/Health.md', '- [x] Run #S ✅ 2026-11-04\n');
  put(
    'Plans/Yearly/2026.md',
    '## Goals\n\n- [ ] Grow as a speaker [[Health]] ^speaker\n',
  );
  put(
    'Plans/Quarterly/2026-Q4.md',
    '## Goals\n\n- [ ] Expo delivered [[Expo2026]] ↑ [[2026#^speaker]] ^expo\n',
  );
  put(
    'Plans/Monthly/2026-11.md',
    '## Goals\n\n- [ ] Posters printed [[Marketing]] ↑ [[2026-Q4#^expo]] ^posters\n',
  );
  put(
    'Plans/Weekly/2026-W45.md',
    '## Goals\n- [x] All posters out [[Marketing]] ↑ [[2026-11#^posters]] ^all ✅ 2026-11-04\n- [ ] Rooms [[Expo2026]] #slipped/2026-W44 ↑ [[2026-11#^posters]] ^rooms\n## Ad-hoc\n- [x] Call the venue #S ✅ 2026-11-03\n',
  );
  put(
    'Plans/Monthly/2027-01.md',
    '## Goals\n\n- [ ] Next year [[Health]] ^next\n',
  );
}

const view = async (span: string, by: string, today = '2026-11-06') =>
  plansView(...(await snapshot(dir)), span, by, today) as PlansView;

describe('plansView', () => {
  it('cuts the span into columns, marking the current one', async () => {
    seed();
    const v = await view('2026-Q4', 'week');
    expect(v.columns.map((c) => c.period)).toEqual([
      '2026-W40',
      '2026-W41',
      '2026-W42',
      '2026-W43',
      '2026-W44',
      '2026-W45',
      '2026-W46',
      '2026-W47',
      '2026-W48',
      '2026-W49',
      '2026-W50',
      '2026-W51',
      '2026-W52',
      '2026-W53',
    ]);
    expect(v.columns.filter((c) => c.current).map((c) => c.period)).toEqual([
      '2026-W45',
    ]);
    expect([v.previous, v.next]).toEqual(['2026-Q3', '2027-Q1']);
    expect((await view('2026-11', 'day')).columns).toHaveLength(30);
    expect(
      (await view('2026', 'month')).columns.map((c) => c.period).slice(-2),
    ).toEqual(['2026-11', '2026-12']);
  });

  it("puts done and planned weight in each row's cells, workstream work also on its project", async () => {
    seed();
    const v = await view('2026-Q4', 'week');
    const row = (id: string) => v.rows.find((r) => r.id === id)!;
    const w45 = v.columns.findIndex((c) => c.period === '2026-W45');
    const w46 = w45 + 1;
    expect(v.rows.map((r) => r.id)).toEqual([
      'p:Expo2026',
      'w:Expo2026/Marketing',
      'p:OldTalk',
      'a:Health',
      'unlinked',
    ]);
    expect(row('w:Expo2026/Marketing').cells[w45]).toEqual({
      done: 4,
      planned: 0,
    });
    expect(row('w:Expo2026/Marketing').cells[w46]).toEqual({
      done: 0,
      planned: 3,
    });
    expect(row('p:Expo2026').cells[w45]).toEqual({ done: 4, planned: 0 });
    expect(
      row('p:Expo2026').cells[
        v.columns.findIndex((c) => c.period === '2026-W43')
      ],
    ).toEqual({ done: 8, planned: 0 });
    expect(row('p:OldTalk')).toMatchObject({ archived: true, kind: 'project' });
    expect(row('a:Health').cells[w45]).toEqual({ done: 1, planned: 0 });
    expect(row('unlinked').cells[w45]).toEqual({ done: 1, planned: 0 });
    expect(row('p:Expo2026')).toMatchObject({
      deadline: '2026-11-22',
      status: 'in-progress',
      note: '1.Projects/Expo2026/Expo2026.md',
      packets: [
        {
          path: '1.Projects/Expo2026/Intermediate Packets/Onboarding checklist.md',
          title: 'Onboarding checklist',
        },
      ],
    });

    expect(row('w:Expo2026/Marketing').tasks.map((t) => t.text)).toEqual([
      'Workshop posters',
      'Panel posters',
      'Social posts',
    ]);
  });

  it('nests the goals of every overlapping plan under the goal they serve', async () => {
    seed();
    const v = await view('2026-Q4', 'week');
    const shape = (gs: PlansView['goals']): unknown[] =>
      gs.map((g) => [
        g.period,
        g.status,
        g.row,
        g.slipped.length,
        shape(g.children),
      ]);
    expect(shape(v.goals)).toEqual([
      [
        '2026',
        'open',
        'a:Health',
        0,
        [
          [
            '2026-Q4',
            'open',
            'p:Expo2026',
            0,
            [
              [
                '2026-11',
                'open',
                'w:Expo2026/Marketing',
                0,
                [
                  ['2026-W45', 'met', 'w:Expo2026/Marketing', 0, []],
                  ['2026-W45', 'open', 'p:Expo2026', 1, []],
                ],
              ],
            ],
          ],
        ],
      ],
    ]);
    const after = await view('2026-Q4', 'week', '2026-11-09');
    expect(after.goals[0].children[0].children[0].children[1].status).toBe(
      'missed',
    );
  });

  it('refuses a span that is not a period and a level not below it', async () => {
    seed();
    const [tree, notes] = await snapshot(dir);
    expect(plansView(tree, notes, 'soon', 'week', '2026-11-06')).toEqual({
      error: '"soon" is not a period',
    });
    expect(plansView(tree, notes, '2026-W45', 'month', '2026-11-06')).toEqual({
      error: '"month" is not a level below week: use one of day',
    });
    expect(plansView(tree, notes, '2026-11-03', 'day', '2026-11-06')).toEqual({
      error: '"day" is not a level below day: use one of none',
    });
  });
});

describe('the plans page on the view server', () => {
  let server: Server;
  let base: string;
  const get = (path: string) =>
    new Promise<{
      status: number;
      body: string;
      headers: Record<string, unknown>;
    }>((resolve, reject) => {
      const req = request(new URL(path, base), (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () =>
          resolve({ status: res.statusCode!, body, headers: res.headers }),
        );
      });
      req.on('error', reject);
      req.end();
    });

  beforeEach(async () => {
    seed();
    server = createVaultViewServer(
      createVault(dir, { now: () => new Date(2026, 10, 6, 12) }),
      { token: 't' },
    );
    base = await listenOnLoopback(server, 0);
  });
  afterEach(async () => {
    await new Promise((r) => server.close(r));
  });

  it('serves the page and its script under the same CSP, and the graph links to it', async () => {
    const page = await get('/plans');
    expect(page.status).toBe(200);
    expect(page.body).toContain('<script src="plans-view.js"></script>');
    expect(String(page.headers['content-security-policy'])).toContain(
      "default-src 'none'",
    );
    expect((await get('/plans-view.js')).status).toBe(200);
    expect((await get('/')).body).toContain('href="/plans"');
  });

  it('answers /plans.json, defaulting to this quarter by week, and 400 for a bad span', async () => {
    const def = JSON.parse((await get('/plans.json')).body);
    expect(def).toMatchObject({
      span: { period: '2026-Q4' },
      by: 'week',
      today: '2026-11-06',
      vaultName: expect.any(String),
    });
    const week = JSON.parse(
      (await get('/plans.json?span=2026-W45&by=day')).body,
    );
    expect(week.columns).toHaveLength(7);
    const bad = await get('/plans.json?span=2026-W45&by=year');
    expect(bad.status).toBe(400);
    expect(JSON.parse(bad.body).error).toMatch(/not a level below week/);
  });
});

describe('plans view periods', () => {
  it('gives each goal its first and last day, and the periods for Today and for zooming', async () => {
    put('2.Areas/Health.md', '# Health\n');
    put(
      'Plans/Weekly/2026-W45.md',
      '## Goals\n\n- [ ] Run twice [[Health]] ^run\n',
    );
    const v = plansView(
      ...(await snapshot(dir)),
      '2026-Q4',
      'week',
      '2026-11-04',
    ) as PlansView;
    expect(v.goals.map((g) => [g.period, g.start, g.end])).toEqual([
      ['2026-W45', '2026-11-02', '2026-11-08'],
    ]);
    expect(v.todayAt).toEqual({
      year: '2026',
      quarter: '2026-Q4',
      month: '2026-11',
      week: '2026-W45',
      day: '2026-11-04',
    });
    const past = plansView(
      ...(await snapshot(dir)),
      '2026-Q3',
      'week',
      '2026-11-04',
    ) as PlansView;
    expect(past.focusAt).toEqual({
      year: '2026',
      quarter: '2026-Q3',
      month: '2026-07',
      week: '2026-W27',
      day: '2026-07-01',
    });
  });
});
