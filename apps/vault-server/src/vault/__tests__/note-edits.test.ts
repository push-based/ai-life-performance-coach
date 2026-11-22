import { createVault } from './fixtures.js';
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
import type { Vault } from '@ai-coach/vault-application';
import { parseTasks, TaskLine } from '@ai-coach/vault-domain';

let dir: string;
let vault: Vault;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
const read = (rel: string) => readFileSync(join(dir, rel), 'utf-8');

const TALKS = '1.Projects/DevFest2026/Workstreams/Talks.md';
const WEEK = 'Plans/Weekly/2026-W45.md';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'note-edits-'));
  put(
    '1.Projects/DevFest2026/DevFest2026.md',
    '---\nstatus: in-progress\ndeadline: 2026-11-20\ndone_when: talks delivered\n---\n# DevFest2026\n\n## Workstreams\n\n- [[Talks]]\n',
  );
  put(
    TALKS,
    [
      '---',
      'status: in-progress',
      '---',
      '# Talks',
      '',
      '| Speaker | Slot |',
      '| --- | --- |',
      '| Nowak | 10:00 |',
      '',
      '## Speakers',
      '',
      '- [ ] **Przemysław Nowak** #M',
      '\t- [ ] Abstract received 🆔 nowak-abstract',
      '- [ ] **Anna Kowalska**',
      '',
      '## Habits',
      '',
      '- [ ] Gym #M 🔁 every week on Monday ⏳ 2026-11-02',
      '- [ ] Gym #M 🔁 every week on Wednesday ⏳ 2026-11-04',
      '- [ ] Post recap #S #slipped/2026-W44 ⏫ ⏳ 2026-11-03 ^recap',
      '',
    ].join('\n'),
  );
  put(
    '1.Projects/DevFest2026/Intermediate Packets/Checklist.md',
    '- [ ] Book room\n',
  );
  put('2.Areas/Sport.md', '# Sport\n');
  put('3.Resources/0.Raw/Books/A/B/text.md', 'raw\n');
  put(
    'Plans/Monthly/2026-11.md',
    '## Goals\n\n- [ ] Move every day [[Sport]] ^move-every-day\n',
  );
  put(
    WEEK,
    '# 2026-W45\n\n## Goals\n\n- [ ] Gym 4 times [[Sport]] #M ^gym-4-times\n\n## Ad-hoc\n',
  );
  vault = createVault(dir, { now: () => new Date('2026-11-02T10:00:00') });
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('reading 🆔, ⛔ and 🔁', () => {
  it('keeps them out of the text and reads a rule followed by an id', () => {
    const [t] = parseTasks(
      'x.md',
      '- [ ] Write post #S 🆔 post ⛔ abstract,photo 🔁 every week on Monday ⏳ 2026-11-03',
    );
    expect(t).toMatchObject({
      text: 'Write post',
      id: 'post',
      blockedBy: ['abstract', 'photo'],
      recurrence: 'every week on Monday',
      scheduled: '2026-11-03',
      size: 'S',
    });
    const [u] = parseTasks('x.md', '- [ ] Stretch 🔁 every day 🆔 stretch');
    expect(u).toMatchObject({
      text: 'Stretch',
      recurrence: 'every day',
      id: 'stretch',
    });
  });
});

describe('TaskLine', () => {
  it('changes only the fields named, inserting new ones in Tasks order', () => {
    const raw = '  - [ ] Call venue [[Expo]] #S ⏫  ⏳ 2026-11-03 ^call';
    const line = TaskLine.parse(raw)!;
    expect(line.toString()).toBe(raw);
    line.set('id', 'venue');
    line.set('scheduled', '2026-11-05');
    expect(line.toString()).toBe(
      '  - [ ] Call venue [[Expo]] #S 🆔 venue ⏫ ⏳ 2026-11-05 ^call',
    );
    line.set('priority', null);
    line.set('done', '2026-11-05');
    line.setStatus('x');
    expect(line.toString()).toBe(
      '  - [x] Call venue [[Expo]] #S 🆔 venue ⏳ 2026-11-05 ✅ 2026-11-05 ^call',
    );
  });
});

describe('update_task', () => {
  it('resizes and reschedules several tasks in one preview, keeping slip tags and 🔁', async () => {
    const r = await vault.updateTasks(
      [
        {
          note: TALKS,
          blockId: 'recap',
          set: { size: 'M', scheduled: '2026-11-05', priority: null },
        },
        { note: TALKS, line: 14, set: { scheduled: '2026-11-09' } },
      ],
      false,
    );
    expect(r.errors).toEqual([]);
    expect(r.edits.map((e) => e.after)).toEqual([
      '- [ ] Post recap #slipped/2026-W44 #M ⏳ 2026-11-05 ^recap',
      '- [ ] Gym #M 🔁 every week on Monday ⏳ 2026-11-09',
    ]);
    expect(Object.keys(r.versions)).toEqual([TALKS]);
  });

  it("ticks with today's date and refuses to tick a habit unless it ends", async () => {
    expect(
      (
        await vault.updateTasks(
          [{ note: TALKS, task: 'Post recap', set: { state: 'done' } }],
          false,
        )
      ).edits[0].after,
    ).toBe(
      '- [x] Post recap #S #slipped/2026-W44 ⏫ ⏳ 2026-11-03 ✅ 2026-11-02 ^recap',
    );
    const habit = await vault.updateTasks(
      [{ note: TALKS, line: 14, set: { state: 'done' } }],
      false,
    );
    expect(habit.errors[0]).toMatch(/repeats \(🔁\); tick it in Obsidian/);
    const ended = await vault.updateTasks(
      [
        {
          note: TALKS,
          line: 14,
          set: { state: 'cancelled', recurrence: null },
        },
      ],
      false,
    );
    expect(ended.edits[0].after).toBe(
      '- [-] Gym #M ⏳ 2026-11-02 ❌ 2026-11-02',
    );
  });

  it('refuses a task matched twice, an id in use and an unknown blockedBy', async () => {
    const r = await vault.updateTasks(
      [
        { note: TALKS, task: 'Gym', set: { size: 'L' } },
        { note: TALKS, task: 'Anna', set: { id: 'nowak-abstract' } },
        { note: TALKS, task: 'Anna', set: { blockedBy: ['nope'] } },
      ],
      false,
    );
    expect(r.errors).toEqual([
      expect.stringMatching(
        /update 1: 2 tasks in .* match "Gym": line 14: Gym; line 15: Gym/,
      ),
      expect.stringMatching(/update 2: id "nowak-abstract" is already used/),
      'update 3: blocked by "nope", which no task has as its 🆔',
    ]);
  });

  it('gives a goal a parent one level up and rewrites its text keeping the size tag', async () => {
    const r = await vault.updateTasks(
      [
        {
          note: WEEK,
          blockId: 'gym-4-times',
          set: {
            parent: '2026-11#^move-every-day',
            text: 'Gym 4 times [[Sport]] [[Talks]]',
          },
        },
      ],
      false,
    );
    expect(r.errors).toEqual([]);
    expect(r.edits[0].after).toBe(
      '- [ ] Gym 4 times [[Sport]] [[Talks]] #M ↑ [[2026-11#^move-every-day]] ^gym-4-times',
    );
    const wrong = await vault.updateTasks(
      [{ note: WEEK, blockId: 'gym-4-times', set: { parent: '2026-Q4#^x' } }],
      false,
    );
    expect(wrong.errors[0]).toMatch(
      /a week goal's parent is a month goal, not a quarter goal/,
    );
  });

  it('refuses a line address on execute without versions, and a note changed since the preview', async () => {
    const noVersions = await vault.updateTasks(
      [{ note: TALKS, line: 14, set: { size: 'L' } }],
      true,
    );
    expect(noVersions.executed).toBe(false);
    expect(noVersions.errors[0]).toMatch(/addressed by line/);

    const preview = await vault.updateTasks(
      [{ note: TALKS, line: 14, set: { size: 'L' } }],
      false,
    );
    put(
      TALKS,
      read(TALKS).replace('## Habits\n', '## Habits\n\n- [ ] New first line\n'),
    );
    const stale = await vault.updateTasks(
      [{ note: TALKS, line: 14, set: { size: 'L' } }],
      true,
      preview.versions,
    );
    expect(stale).toMatchObject({
      executed: false,
      errors: [`${TALKS} changed since the preview; preview again`],
    });

    const again = await vault.updateTasks(
      [{ note: TALKS, blockId: 'recap', set: { size: 'L' } }],
      false,
    );
    const done = await vault.updateTasks(
      [{ note: TALKS, blockId: 'recap', set: { size: 'L' } }],
      true,
      again.versions,
    );
    expect(done.executed).toBe(true);
    expect(read(TALKS)).toContain(
      '- [ ] Post recap #slipped/2026-W44 #L ⏫ ⏳ 2026-11-03 ^recap\n',
    );
  });

  it('marks tasks missed with an indented reason, updates and clears the reason, and surfaces them in review_period', async () => {
    const preview = await vault.updateTasks(
      [
        {
          note: TALKS,
          task: 'Anna Kowalska',
          set: {
            state: 'missed',
            reason: 'ran out of time before the deadline',
          },
        },
        {
          note: TALKS,
          task: 'Post recap',
          set: {
            state: 'missed',
            reason: 'speaker photos arrived late',
          },
        },
      ],
      false,
    );
    expect(preview.errors).toEqual([]);
    const applied = await vault.updateTasks(
      [
        {
          note: TALKS,
          task: 'Anna Kowalska',
          set: {
            state: 'missed',
            reason: 'ran out of time before the deadline',
          },
        },
        {
          note: TALKS,
          task: 'Post recap',
          set: {
            state: 'missed',
            reason: 'speaker photos arrived late',
          },
        },
      ],
      true,
      preview.versions,
    );
    expect(applied.executed).toBe(true);
    const content = read(TALKS);
    expect(content).toContain(
      '- [-] **Anna Kowalska** #missed ❌ 2026-11-02\n\t- missed: ran out of time before the deadline\n',
    );
    expect(content).toContain(
      '- [-] Post recap #S #slipped/2026-W44 #missed ⏫ ⏳ 2026-11-03 ❌ 2026-11-02 ^recap\n\t- missed: speaker photos arrived late\n',
    );

    const rev = await vault.reviewPeriod('2026-W45', '2026-11-08');
    expect('error' in rev).toBe(false);
    if (!('error' in rev)) {
      expect(rev.missed).toEqual([
        expect.objectContaining({
          text: '**Anna Kowalska**',
          missedOn: '2026-11-02',
          reason: 'ran out of time before the deadline',
        }),
        expect.objectContaining({
          text: 'Post recap',
          missedOn: '2026-11-02',
          reason: 'speaker photos arrived late',
        }),
      ]);
    }

    const editReason = await vault.updateTasks(
      [
        {
          note: TALKS,
          task: 'Anna Kowalska',
          includeClosed: true,
          set: { reason: 'underestimated prep time' },
        },
      ],
      true,
    );
    expect(editReason.errors).toEqual([]);
    expect(read(TALKS)).toContain('\t- missed: underestimated prep time\n');
    expect(read(TALKS)).not.toContain('ran out of time before the deadline');

    const reopen = await vault.updateTasks(
      [
        {
          note: TALKS,
          task: 'Anna Kowalska',
          includeClosed: true,
          set: { state: 'open' },
        },
      ],
      true,
    );
    expect(reopen.errors).toEqual([]);
    expect(read(TALKS)).toContain('- [ ] **Anna Kowalska**\n');
    expect(read(TALKS)).not.toContain('underestimated prep time');
  });

  it('refuses a reason on a non-missed task', async () => {
    const r = await vault.updateTasks(
      [
        {
          note: TALKS,
          task: 'Anna Kowalska',
          set: { state: 'cancelled', reason: 'not needed' },
        },
      ],
      false,
    );
    expect(r.errors[0]).toMatch(/reason is only for missed tasks/);
  });
});

describe('update_task on done and cancelled tasks', () => {
  const PANELS =
    '1.Projects/DevFest2026/Workstreams/Discussion Panels & Keynotes.md';
  beforeEach(() =>
    put(
      PANELS,
      [
        '---',
        'status: in-progress',
        '---',
        '# Panels',
        '',
        '- [x] **Julia Raczynska** ',
        '- [x] **Pawel Ostromecki** ✅ 2026-11-01',
        '\t- [x] Picture of Pawel Ostromecki #S ⏳ 2026-10-30 ✅ 2026-10-31 ^pic',
        '- [-] Pawel Ostromecki dinner ❌ 2026-11-02',
        '- [ ] Thank Pawel Ostromecki',
        '',
      ].join('\n'),
    ),
  );

  it('renames a ticked task with include_closed, keeping [x], its ✅ date and every signifier', async () => {
    const r = await vault.updateTasks(
      [
        {
          note: PANELS,
          task: '**Julia Raczynska**',
          includeClosed: true,
          set: { text: '**Julia Rapczyńska**' },
        },
        {
          note: PANELS,
          task: '**Pawel Ostromecki**',
          includeClosed: true,
          set: { text: '**Paweł Ostromecki**' },
        },
        {
          note: PANELS,
          task: 'Picture of Pawel',
          includeClosed: true,
          set: { text: 'Picture of Paweł Ostromecki' },
        },
      ],
      false,
    );
    expect(r.errors).toEqual([]);
    expect(r.edits.map((e) => [e.before, e.after])).toEqual([
      ['- [x] **Julia Raczynska** ', '- [x] **Julia Rapczyńska**'],
      [
        '- [x] **Pawel Ostromecki** ✅ 2026-11-01',
        '- [x] **Paweł Ostromecki** ✅ 2026-11-01',
      ],
      [
        '\t- [x] Picture of Pawel Ostromecki #S ⏳ 2026-10-30 ✅ 2026-10-31 ^pic',
        '\t- [x] Picture of Paweł Ostromecki #S ⏳ 2026-10-30 ✅ 2026-10-31 ^pic',
      ],
    ]);
    const done = await vault.updateTasks(
      [
        {
          note: PANELS,
          task: 'dinner',
          includeClosed: true,
          set: { text: 'Paweł Ostromecki dinner' },
        },
      ],
      true,
      (
        await vault.updateTasks(
          [
            {
              note: PANELS,
              task: 'dinner',
              includeClosed: true,
              set: { text: 'x' },
            },
          ],
          false,
        )
      ).versions,
    );
    expect(done.executed).toBe(true);
    expect(read(PANELS)).toContain(
      '\n- [-] Paweł Ostromecki dinner ❌ 2026-11-02\n',
    );
  });

  it('matches open tasks only without include_closed, and says when a closed one would match', async () => {
    const r = await vault.updateTasks(
      [{ note: PANELS, task: 'Julia Raczynska', set: { text: 'x' } }],
      false,
    );
    expect(r.errors).toEqual([
      `update 1: no open task in ${PANELS} match "Julia Raczynska" (1 done or cancelled task matches; pass include_closed: true to reach it)`,
    ]);
    const many = await vault.updateTasks(
      [
        {
          note: PANELS,
          task: 'Pawel Ostromecki',
          includeClosed: true,
          set: { text: 'x' },
        },
      ],
      false,
    );
    expect(many.errors[0]).toMatch(
      /update 1: 4 tasks in .* match "Pawel Ostromecki"/,
    );
  });

  it('previews the same body line that planning_overview reports and update_task takes back', async () => {
    const open = (await vault.planning()).tasks.find(
      (t) => t.note === PANELS && t.text === 'Thank Pawel Ostromecki',
    )!;
    const preview = await vault.updateTasks(
      [{ note: PANELS, line: open.line, set: { size: 'S' } }],
      false,
    );
    expect(preview.edits[0]).toMatchObject({
      line: open.line,
      fileLine: open.line + 4,
    });
    const again = await vault.updateTasks(
      [{ note: PANELS, line: preview.edits[0].line, set: { size: 'M' } }],
      false,
    );
    expect(again.errors).toEqual([]);
    const closed = await vault.updateTasks(
      [{ note: PANELS, line: 2, set: { text: '**Julia Rapczyńska**' } }],
      false,
    );
    expect(closed.edits[0].after).toBe('- [x] **Julia Rapczyńska**');
  });
});

describe('add_tasks', () => {
  it('adds subtasks under a task with ids, dependencies and a habit in Tasks order', async () => {
    const r = await vault.addTasks(
      {
        note: TALKS,
        parent: { task: 'Przemysław Nowak' },
        tasks: [
          {
            text: 'Nowak announced on social media 16:00',
            size: 'S',
            scheduled: '2026-11-07',
            priority: 'high',
            recurrence: 'every week on Monday',
            id: 'nowak-post',
            blockedBy: ['nowak-abstract'],
            links: ['Sport'],
          },
        ],
      },
      true,
      (
        await vault.addTasks(
          {
            note: TALKS,
            parent: { task: 'Przemysław Nowak' },
            tasks: [{ text: 'x' }],
          },
          false,
        )
      ).versions,
    );
    expect(r.errors).toEqual([]);
    expect(read(TALKS)).toContain(
      '\t- [ ] Abstract received 🆔 nowak-abstract\n\t- [ ] Nowak announced on social media 16:00 [[Sport]] #S 🆔 nowak-post ⛔ nowak-abstract ⏫ 🔁 every week on Monday ⏳ 2026-11-07\n- [ ] **Anna Kowalska**',
    );
  });

  it('adds at the end of a section, creating it when missing', async () => {
    const r = await vault.addTasks(
      { note: TALKS, heading: 'Logistics', tasks: [{ text: 'Book hotel' }] },
      false,
    );
    expect(r.edits[0].after).toBe('## Logistics\n\n- [ ] Book hotel\n');
    const into = await vault.addTasks(
      { note: TALKS, heading: 'Speakers', tasks: [{ text: 'Invite Lis' }] },
      false,
    );
    expect(into.edits[0]).toEqual({
      note: TALKS,
      line: 11,
      fileLine: 15,
      before: '',
      after: '- [ ] Invite Lis',
      under: '## Speakers',
      above: '- [ ] **Anna Kowalska**',
    });
  });

  it('picks a section by heading path, inserts above its subsections, and creates a missing part one level down', async () => {
    const note = '1.Projects/DevFest2026/Workstreams/Panels.md';
    put(
      note,
      [
        '# Panels',
        '',
        '## Panels',
        '',
        '### Robotics: Machinekind',
        '',
        '- [ ] Panel prep',
        '',
        '#### Marketing',
        '',
        '- [ ] Group Graphic Machinekind',
        '',
        '### Web',
        '',
        '#### Marketing',
        '',
        '- [ ] Web graphic',
        '',
        '## Keynotes',
        '',
        '### Cloud keynote',
        '',
        '- [ ] Book stage',
        '',
        '## Notes',
        '',
        'Venue is hall B.',
        '',
      ].join('\n'),
    );
    const twice = await vault.addTasks(
      { note, heading: 'Marketing', tasks: [{ text: 'Poster' }] },
      false,
    );
    expect(twice.errors).toEqual([
      '2 sections are headed "Marketing": "Panels/Panels/Robotics: Machinekind/Marketing", "Panels/Panels/Web/Marketing"; give the heading as a path to one of them, e.g. "Panels/Panels/Robotics: Machinekind/Marketing"',
    ]);

    const path = await vault.addTasks(
      {
        note,
        heading: 'Robotics: Machinekind/Marketing',
        tasks: [{ text: 'Poster' }],
      },
      false,
    );
    expect(path.edits).toEqual([
      {
        note,
        line: 11,
        fileLine: 12,
        before: '',
        after: '- [ ] Poster',
        under: '#### Marketing',
        above: '- [ ] Group Graphic Machinekind',
      },
    ]);

    const above = await vault.addTasks(
      {
        note,
        heading: 'Robotics: Machinekind',
        tasks: [{ text: 'Moderator' }],
      },
      false,
    );
    expect(above.edits[0]).toMatchObject({
      after: '- [ ] Moderator',
      under: '### Robotics: Machinekind',
      above: '- [ ] Panel prep',
    });

    const created = await vault.addTasks(
      {
        note,
        heading: 'Keynotes/AI keynote: Łukasz Jaźwa',
        tasks: [{ text: 'Bio received' }],
      },
      true,
      (
        await vault.addTasks(
          {
            note,
            heading: 'Keynotes/AI keynote: Łukasz Jaźwa',
            tasks: [{ text: 'x' }],
          },
          false,
        )
      ).versions,
    );
    expect(created.errors).toEqual([]);
    expect(read(note)).toContain(
      '### Cloud keynote\n\n- [ ] Book stage\n\n### AI keynote: Łukasz Jaźwa\n\n- [ ] Bio received\n\n## Notes\n',
    );

    expect(
      (
        await vault.addTasks(
          { note, heading: 'Logistics', level: 3, tasks: [{ text: 'Hotel' }] },
          false,
        )
      ).edits[0].after,
    ).toBe('### Logistics\n\n- [ ] Hotel\n');
    expect(
      (
        await vault.addTasks(
          { note, heading: 'Nope/Marketing', tasks: [{ text: 'x' }] },
          false,
        )
      ).errors,
    ).toEqual([
      'no section "Nope"; only the last part of a heading path is created',
    ]);
    expect(
      (
        await vault.addTasks(
          { note, heading: 'Keynotes/Other', level: 2, tasks: [{ text: 'x' }] },
          false,
        )
      ).errors[0],
    ).toMatch(/a level 2 heading cannot go under "Panels\/Keynotes"/);
  });

  it('refuses an id in use, an Intermediate Packet, and an unlinked task in a plan', async () => {
    expect(
      (
        await vault.addTasks(
          { note: TALKS, tasks: [{ text: 'Again', id: 'nowak-abstract' }] },
          false,
        )
      ).errors,
    ).toEqual(['task "Again": id "nowak-abstract" is already used']);
    expect(
      (
        await vault.addTasks(
          {
            note: '1.Projects/DevFest2026/Intermediate Packets/Checklist.md',
            tasks: [{ text: 'x' }],
          },
          false,
        )
      ).errors[0],
    ).toMatch(/Intermediate Packet/);
    expect(
      (
        await vault.addTasks(
          { note: WEEK, heading: 'Ad-hoc', tasks: [{ text: 'Call' }] },
          false,
        )
      ).errors[0],
    ).toMatch(/a task in a plan links/);
  });
});

describe('set_frontmatter', () => {
  it('changes only the named keys', async () => {
    const note = '1.Projects/DevFest2026/DevFest2026.md';
    const r = await vault.setFrontmatter(
      note,
      { status: 'done', deadline: null, done_when: '10 talks: delivered' },
      false,
    );
    expect(r.errors).toEqual([]);
    expect(r.edits).toEqual([
      {
        note,
        fileLine: 2,
        before:
          'status: in-progress\ndeadline: 2026-11-20\ndone_when: talks delivered',
        after: 'status: done\ndone_when: "10 talks: delivered"',
      },
    ]);
    expect(
      (await vault.setFrontmatter(note, { status: 'finished' }, false))
        .errors[0],
    ).toMatch(/not one of todo/);
    expect(
      (await vault.setFrontmatter(note, { coach_id: 'x' }, false)).errors[0],
    ).toMatch(/written by the vault tools/);
  });

  it('adds a frontmatter block to a note without one', async () => {
    const preview = await vault.setFrontmatter(
      '2.Areas/Sport.md',
      { status: 'in-progress' },
      false,
    );
    expect(
      (
        await vault.setFrontmatter(
          '2.Areas/Sport.md',
          { status: 'in-progress' },
          true,
          {},
        )
      ).errors,
    ).toEqual(['2.Areas/Sport.md was not in the preview; preview again']);
    const r = await vault.setFrontmatter(
      '2.Areas/Sport.md',
      { status: 'in-progress' },
      true,
      preview.versions,
    );
    expect(r.executed).toBe(true);
    expect(read('2.Areas/Sport.md')).toBe(
      '---\nstatus: in-progress\n---\n# Sport\n',
    );
  });
});

describe('edit_note', () => {
  it('replaces exact text once, and only in the body', async () => {
    const r = await vault.editNote(
      {
        note: TALKS,
        edits: [
          {
            old: '| Speaker | Slot |\n| --- | --- |\n| Nowak | 10:00 |',
            new: '| Speaker | Slot | Talk |\n| --- | --- | --- |\n| Nowak | 10:00 | Signals |',
          },
        ],
      },
      false,
    );
    expect(r.errors).toEqual([]);
    expect(r.edits[0]).toMatchObject({
      line: 2,
      fileLine: 6,
      under: '# Talks',
      above: '',
      before: '| Speaker | Slot |\n| --- | --- |\n| Nowak | 10:00 |',
    });
    expect(
      (
        await vault.editNote(
          { note: TALKS, edits: [{ old: 'Gym #M', new: 'x' }] },
          false,
        )
      ).errors[0],
    ).toMatch(/occurs 2 times/);
    expect(
      (
        await vault.editNote(
          { note: TALKS, edits: [{ old: 'status: in-progress', new: 'x' }] },
          false,
        )
      ).errors[0],
    ).toMatch(/frontmatter is set_frontmatter's/);
  });

  it('replaces or appends to a section by heading', async () => {
    const day = 'Plans/Daily/2026/11-November/2026-11-02.md';
    put(day, '# 2026-11-02\n\n## Log\n\nMorning run.\n\n## Done\n\nx\n');
    expect(
      (
        await vault.editNote(
          { note: day, heading: 'Log', content: 'Talk prep.', mode: 'append' },
          false,
        )
      ).edits[0],
    ).toMatchObject({
      line: 5,
      fileLine: 6,
      under: '## Log',
      above: 'Morning run.',
      before: '',
      after: 'Talk prep.',
    });
    await vault.editNote(
      { note: day, heading: 'Done', content: 'All.', mode: 'replace' },
      true,
      (
        await vault.editNote(
          { note: day, heading: 'Done', content: 'All.', mode: 'replace' },
          false,
        )
      ).versions,
    );
    expect(read(day)).toBe(
      '# 2026-11-02\n\n## Log\n\nMorning run.\n\n## Done\n\nAll.\n',
    );
  });

  it('refuses an edit that adds, removes or changes a task line', async () => {
    const r = await vault.editNote(
      {
        note: TALKS,
        edits: [{ old: '**Anna Kowalska**', new: '**Anna Kowalski**' }],
      },
      false,
    );
    expect(r.errors[0]).toMatch(
      /^edit 1: it changes a task line; tasks are changed with update_task \(include_closed: true/,
    );
    expect(
      (
        await vault.editNote(
          {
            note: TALKS,
            edits: [
              {
                old: '| Nowak | 10:00 |',
                new: '| Nowak | 10:00 |\n- [ ] Sneaky',
              },
            ],
          },
          false,
        )
      ).errors[0],
    ).toMatch(/changes a task line/);
    expect(
      (
        await vault.editNote(
          { note: TALKS, heading: 'Habits', content: 'None.', mode: 'replace' },
          false,
        )
      ).errors[0],
    ).toMatch(/^the section edit changes task lines/);
    expect(
      (
        await vault.editNote(
          {
            note: TALKS,
            heading: 'Habits',
            content: 'Notes on the gym.',
            mode: 'append',
          },
          false,
        )
      ).errors,
    ).toEqual([]);
  });

  it("refuses raw text and notes outside the vault's folders", async () => {
    expect(
      (
        await vault.editNote(
          {
            note: '3.Resources/0.Raw/Books/A/B/text.md',
            edits: [{ old: 'raw', new: 'x' }],
          },
          false,
        )
      ).errors[0],
    ).toMatch(/raw text/);
  });
});

describe('create_workstream', () => {
  it('writes the workstream and lists it in its project note', async () => {
    const r = await vault.createWorkstream(
      {
        project: 'DevFest2026',
        name: 'Sponsors',
        folder: true,
        area: 'Sport',
        description: 'Who pays for what.',
      },
      false,
    );
    expect(r.errors).toEqual([]);
    const done = await vault.createWorkstream(
      {
        project: 'DevFest2026',
        name: 'Sponsors',
        folder: true,
        area: 'Sport',
        description: 'Who pays for what.',
      },
      true,
      r.versions,
    );
    expect(done.executed).toBe(true);
    expect(
      read('1.Projects/DevFest2026/Workstreams/Sponsors/Sponsors.md'),
    ).toBe(
      '---\nstatus: todo\narea: "[[Sport]]"\n---\n# Sponsors\n\nWho pays for what.\n',
    );
    expect(read('1.Projects/DevFest2026/DevFest2026.md')).toMatch(
      /## Workstreams\n\n- \[\[Talks\]\]\n- \[\[Sponsors\]\]\n$/,
    );
    expect(
      (
        await vault.createWorkstream(
          { project: 'DevFest2026', name: 'Talks' },
          false,
        )
      ).errors[0],
    ).toMatch(/already has a workstream/);
  });
});

describe('plan_days and plan_period', () => {
  it('plans two days scheduling tasks of one note in one preview', async () => {
    const preview = await vault.planDays(
      {
        '2026-11-03': {
          schedule: [{ note: TALKS, task: 'Anna', date: '2026-11-03' }],
        },
        '2026-11-04': {
          schedule: [{ note: TALKS, task: 'Post recap', date: '2026-11-04' }],
          adHoc: [
            {
              text: 'Call venue',
              links: ['DevFest2026', 'Sport'],
              priority: 'high',
            },
          ],
        },
      },
      false,
    );
    expect(preview.errors).toEqual([]);
    expect(preview.days.map((d) => d.plan)).toEqual([
      'Plans/Daily/2026/11-November/2026-11-03.md',
      'Plans/Daily/2026/11-November/2026-11-04.md',
    ]);
    await vault.planDays(
      {
        '2026-11-03': {
          schedule: [{ note: TALKS, task: 'Anna', date: '2026-11-03' }],
        },
        '2026-11-04': {
          schedule: [{ note: TALKS, task: 'Post recap', date: '2026-11-04' }],
          adHoc: [
            {
              text: 'Call venue',
              links: ['DevFest2026', 'Sport'],
              priority: 'high',
            },
          ],
        },
      },
      true,
      preview.versions,
    );
    expect(read(TALKS)).toContain('- [ ] **Anna Kowalska** ⏳ 2026-11-03\n');
    expect(read(TALKS)).toContain(
      '- [ ] Post recap #S #slipped/2026-W44 ⏫ ⏳ 2026-11-04 ^recap\n',
    );
    expect(read('Plans/Daily/2026/11-November/2026-11-04.md')).toContain(
      '- [ ] Call venue [[DevFest2026]] [[Sport]] ⏫\n',
    );
    expect(
      existsSync(join(dir, 'Plans/Daily/2026/11-November/2026-11-03.md')),
    ).toBe(true);
  });

  it('writes ad-hoc habits with their signifiers after the links', async () => {
    const r = await vault.planPeriod(
      {
        period: '2026-W45',
        adHoc: [
          {
            text: 'Stretch',
            link: 'Sport',
            size: 'S',
            recurrence: 'every day',
            date: '2026-11-03',
            id: 'stretch',
          },
        ],
      },
      false,
    );
    expect(r.errors).toEqual([]);
    expect(r.content).toContain(
      '## Ad-hoc\n\n- [ ] Stretch [[Sport]] #S 🆔 stretch 🔁 every day ⏳ 2026-11-03\n',
    );
  });
});
