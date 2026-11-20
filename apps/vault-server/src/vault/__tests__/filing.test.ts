import { createVault } from './fixtures.js';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import type { Vault } from '@ai-coach/vault-application';

let dir: string;
let vault: Vault;
let ids: number;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
const read = (rel: string) => readFileSync(join(dir, rel), 'utf-8');
const has = (rel: string) => existsSync(join(dir, rel));

function fingerprint(): string[] {
  const out: string[] = [];
  const walk = (abs: string) => {
    for (const e of readdirSync(abs, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : 1,
    )) {
      const p = join(abs, e.name);
      if (e.isDirectory()) {
        out.push(`${relative(dir, p)}/`);
        walk(p);
      } else
        out.push(
          `${relative(dir, p)} ${createHash('sha1').update(readFileSync(p)).digest('hex')} ${statSync(p).mtimeMs}`,
        );
    }
  };
  walk(dir);
  return out;
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'vault-filing-'));
  ids = 0;
  vault = createVault(dir, {
    newSessionId: () => `s-${++ids}`,
    newCoachId: () => `c-${++ids}`,
  });
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('init_vault', () => {
  it('previews renames of non-standard folder names and changes nothing until executed', async () => {
    put('Projects/Talk/Plan.md', 'plan');
    put('01 Areas/Health.md', 'health');
    put('Resources/Coffee.md', 'coffee');
    put('Inbox/Idea.md', 'idea');
    put('Journal/2026/Day.md', 'day');
    put('Loose.md', 'loose');
    const before = fingerprint();

    const preview = await vault.initVault(false);
    expect(preview.executed).toBe(false);
    expect(preview.errors).toEqual([]);
    expect(preview.collisions).toEqual([]);
    expect(preview.actions).toEqual([
      { op: 'rename', from: 'Inbox', to: '0.Inbox' },
      { op: 'rename', from: 'Projects', to: '1.Projects' },
      { op: 'rename', from: '01 Areas', to: '2.Areas' },
      { op: 'rename', from: 'Resources', to: '3.Resources' },
      { op: 'create', to: '4.Archive' },
      {
        op: 'move',
        from: 'Journal/2026/Day.md',
        to: '4.Archive/old notes/Journal/2026/Day.md',
      },
      { op: 'move', from: 'Loose.md', to: '4.Archive/old notes/Loose.md' },
      { op: 'remove_empty', from: 'Journal' },
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
    ]);
    expect(preview.warnings).toEqual([
      '1.Projects is created or renamed by this run; run init_vault again to write its missing project notes',
    ]);
    expect(fingerprint()).toEqual(before);

    const done = await vault.initVault(true);
    expect(done.executed).toBe(true);
    expect(readdirSync(dir).sort()).toEqual([
      '0.Inbox',
      '1.Projects',
      '2.Areas',
      '3.Resources',
      '4.Archive',
      'Plans',
    ]);
    expect(read('1.Projects/Talk/Plan.md')).toBe('plan');
    expect(read('4.Archive/old notes/Journal/2026/Day.md')).toBe('day');
    expect(
      (await vault.notes()).every(
        (n) => n.bucket !== null || n.path.startsWith('Plans/'),
      ),
    ).toBe(true);

    expect((await vault.initVault(false)).actions).toEqual([
      { op: 'write', to: '1.Projects/Talk/Talk.md' },
    ]);
  });

  it('lifts the five folders out of a PARA/ wrapper and archives the rest of it', async () => {
    put('PARA/1.Projects/A/x.md', 'x');
    put('PARA/4.Archive/y.md', 'y');
    put('PARA/Misc/z.md', 'z');
    put('PARA/.DS_Store', '');
    put('.obsidian/app.json', '{}');
    const { actions, warnings } = await vault.initVault(true);
    expect(actions).toContainEqual({
      op: 'rename',
      from: 'PARA/1.Projects',
      to: '1.Projects',
    });
    expect(actions).toContainEqual({
      op: 'move',
      from: 'PARA/Misc/z.md',
      to: '4.Archive/old notes/PARA/Misc/z.md',
    });
    expect(warnings).toEqual([
      '1.Projects is created or renamed by this run; run init_vault again to write its missing project notes',
    ]);
    expect(has('PARA')).toBe(false);
    expect(read('1.Projects/A/x.md')).toBe('x');
    expect(read('4.Archive/y.md')).toBe('y');
    expect(read('4.Archive/old notes/PARA/Misc/z.md')).toBe('z');
    expect(read('.obsidian/app.json')).toBe('{}');
  });

  it('moves nothing when any target collides, and names every collision', async () => {
    put('Loose.md', 'new');
    put('Other.md', 'other');
    put('4.Archive/old notes/Loose.md', 'already archived');
    const before = fingerprint();
    const r = await vault.initVault(true);
    expect(r.executed).toBe(false);
    expect(r.collisions).toEqual(['4.Archive/old notes/Loose.md']);
    expect(fingerprint()).toEqual(before);
  });

  it('refuses to guess between two candidates for one folder', async () => {
    put('Projects/a.md', 'a');
    put('1 Project/b.md', 'b');
    const r = await vault.initVault(true);
    expect(r.errors.join()).toMatch(
      /more than one folder could be 1\.Projects/,
    );
    expect(r.executed).toBe(false);
  });

  it('leaves non-note files where they are and says so', async () => {
    put('Attachments/pic.png', 'png');
    put('Attachments/Caption.md', 'caption');
    put('todo.txt', 't');
    const r = await vault.initVault(true);
    expect(r.warnings.join()).toMatch(
      /left in place \(not notes\): Attachments\/pic\.png, todo\.txt/,
    );
    expect(r.actions).not.toContainEqual({
      op: 'remove_empty',
      from: 'Attachments',
    });
    expect(read('Attachments/pic.png')).toBe('png');
    expect(read('4.Archive/old notes/Attachments/Caption.md')).toBe('caption');
  });

  it("moves day plans into their month's folder and leaves other files in Plans/Daily alone", async () => {
    put('Plans/Daily/2026-10-31.md', '# 2026-10-31\n');
    put('Plans/Daily/2026-11-01.md', '# 2026-11-01\n');
    put('Plans/Daily/2026/11-November/2026-11-02.md', '# 2026-11-02\n');
    put('Plans/Daily/scratch.md', 'not a day');
    const preview = await vault.initVault(false);
    expect(preview.actions.filter((a) => a.op === 'move')).toEqual([
      {
        op: 'move',
        from: 'Plans/Daily/2026-10-31.md',
        to: 'Plans/Daily/2026/10-October/2026-10-31.md',
      },
      {
        op: 'move',
        from: 'Plans/Daily/2026-11-01.md',
        to: 'Plans/Daily/2026/11-November/2026-11-01.md',
      },
    ]);
    expect(has('Plans/Daily/2026-10-31.md')).toBe(true);
    await vault.initVault(true);
    expect(read('Plans/Daily/2026/10-October/2026-10-31.md')).toBe(
      '# 2026-10-31\n',
    );
    expect(read('Plans/Daily/2026/11-November/2026-11-01.md')).toBe(
      '# 2026-11-01\n',
    );
    expect(has('Plans/Daily/2026-11-01.md')).toBe(false);
    expect(read('Plans/Daily/scratch.md')).toBe('not a day');
  });

  it("moves no day plan when its month's folder already holds that day", async () => {
    put('Plans/Daily/2026-11-01.md', 'flat');
    put('Plans/Daily/2026/11-November/2026-11-01.md', 'grouped');
    const preview = await vault.initVault(false);
    expect(preview.collisions).toContain(
      'Plans/Daily/2026/11-November/2026-11-01.md',
    );
  });

  it('never touches Coach/', async () => {
    put('Coach/sessions/s.md', 'session');
    await vault.initVault(true);
    expect(read('Coach/sessions/s.md')).toBe('session');
  });
});

describe('capture', () => {
  it('writes a new inbox note named from its title, creating 0.Inbox', async () => {
    const preview = await vault.capture(
      'Perfectionism: procrastination in a tuxedo?',
      'Ship the ugly prototype.',
      false,
    );
    expect(preview.actions).toEqual([
      { op: 'create', to: '0.Inbox' },
      {
        op: 'write',
        to: '0.Inbox/Perfectionism- procrastination in a tuxedo-.md',
      },
    ]);
    expect(has('0.Inbox')).toBe(false);
    await vault.capture(
      'Perfectionism: procrastination in a tuxedo?',
      'Ship the ugly prototype.',
      true,
    );
    expect(read('0.Inbox/Perfectionism- procrastination in a tuxedo-.md')).toBe(
      'Ship the ugly prototype.\n',
    );
  });

  it('refuses to replace an existing note and an unusable title', async () => {
    put('0.Inbox/Idea.md', 'mine');
    expect((await vault.capture('Idea', 'new', true)).collisions).toEqual([
      '0.Inbox/Idea.md',
    ]);
    expect(read('0.Inbox/Idea.md')).toBe('mine');
    expect((await vault.capture('///', 'x', true)).errors.join()).toMatch(
      /title is empty/,
    );
  });
});

describe('file_note', () => {
  beforeEach(() => {
    put(
      '0.Inbox/Event loop.md',
      'Microtasks first. See [setup](../2.Areas/Setup.md).\n',
    );
    put(
      '2.Areas/Setup.md',
      'Links to [loop](../0.Inbox/Event%20loop.md) and [[Event loop]].\n',
    );
  });

  it('moves one note into a PARA folder, creating it, and warns about relative links it breaks', async () => {
    const preview = await vault.fileNote(
      '0.Inbox/Event loop.md',
      '3.Resources/TypeScript',
      false,
    );
    expect(preview.actions).toEqual([
      { op: 'create', to: '3.Resources/TypeScript' },
      {
        op: 'move',
        from: '0.Inbox/Event loop.md',
        to: '3.Resources/TypeScript/Event loop.md',
      },
    ]);
    expect(preview.warnings.join()).toMatch(
      /0\.Inbox\/Event loop\.md → \.\.\/2\.Areas\/Setup\.md.*2\.Areas\/Setup\.md → \.\.\/0\.Inbox\/Event loop\.md/,
    );
    expect(has('3.Resources')).toBe(false);
    await vault.fileNote(
      '0.Inbox/Event loop.md',
      '3.Resources/TypeScript',
      true,
    );
    expect(has('0.Inbox/Event loop.md')).toBe(false);
    expect(read('3.Resources/TypeScript/Event loop.md')).toContain(
      'Microtasks first.',
    );
  });

  it('refuses a target that exists, leaving both notes as they were (Phase 3 exit)', async () => {
    put('3.Resources/Event loop.md', 'a different note');
    const before = fingerprint();
    const r = await vault.fileNote(
      '0.Inbox/Event loop.md',
      '3.Resources',
      true,
    );
    expect(r).toMatchObject({
      executed: false,
      collisions: ['3.Resources/Event loop.md'],
    });
    expect(fingerprint()).toEqual(before);
  });

  it('refuses destinations outside the five folders and unknown notes', async () => {
    for (const to of [
      'Coach',
      'Elsewhere',
      '3.Resources/../..',
      '.obsidian',
      '3.Resources/.hidden',
    ]) {
      expect(
        (await vault.fileNote('0.Inbox/Event loop.md', to, true)).errors.join(),
        to,
      ).toMatch(/not a folder under/);
    }
    expect(
      (
        await vault.fileNote('0.Inbox/Nope.md', '3.Resources', true)
      ).errors.join(),
    ).toMatch(/no note/);
    expect(
      (
        await vault.fileNote('0.Inbox/Event loop.md', '0.Inbox', true)
      ).errors.join(),
    ).toMatch(/already in/);
  });

  it('keeps every session resolving to its note after a file_note move (Phase 3 exit)', async () => {
    await vault.fileNote('0.Inbox/Event loop.md', '3.Resources', true);
    const s = await vault.recordSession(
      {
        tier: 1,
        items: [
          {
            note: '3.Resources/Event loop.md',
            challenge: 'c',
            answer: 'a',
            verdict: 'pass',
            next_review: '2000-01-01',
          },
        ],
      },
      true,
    );
    expect(s.errors).toEqual([]);
    await vault.fileNote(
      '3.Resources/Event loop.md',
      '3.Resources/JavaScript',
      true,
    );
    const due = await vault.dueForReview('2026-10-24');
    expect(due.due.map((d) => [d.path, d.mastery])).toEqual([
      ['3.Resources/JavaScript/Event loop.md', 'tier1_passed'],
    ]);
    expect(due.orphaned).toEqual([]);
  });
});

describe('archive_project', () => {
  it('moves a project folder whole into 4.Archive', async () => {
    put('1.Projects/Expo2026/Workstreams/Workshops.md', 'w');
    put('1.Projects/Expo2026/Plan.md', 'p');
    const preview = await vault.archiveProject('Expo2026', false);
    expect(preview.actions).toEqual([
      { op: 'create', to: '4.Archive' },
      { op: 'move', from: '1.Projects/Expo2026', to: '4.Archive/Expo2026' },
    ]);
    await vault.archiveProject('Expo2026', true);
    expect(has('1.Projects/Expo2026')).toBe(false);
    expect(read('4.Archive/Expo2026/Workstreams/Workshops.md')).toBe('w');
  });

  it('refuses an existing archive folder, a missing project and a path', async () => {
    put('1.Projects/Talk/a.md', 'a');
    put('4.Archive/Talk/b.md', 'b');
    expect((await vault.archiveProject('Talk', true)).collisions).toEqual([
      '4.Archive/Talk',
    ]);
    expect(read('1.Projects/Talk/a.md')).toBe('a');
    expect((await vault.archiveProject('Nope', true)).errors.join()).toMatch(
      /no project folder/,
    );
    expect(
      (await vault.archiveProject('../2.Areas', true)).errors.join(),
    ).toMatch(/not a project folder name/);
  });

  describe('keeping knowledge notes in Resources', () => {
    beforeEach(() => {
      put('3.Resources/0.Raw/Articles/Clipped.md', '# Clipped\n');
      put('1.Projects/Talk/Plan.md', 'Slides, rehearsal, travel.\n');
      put(
        '1.Projects/Talk/Idea.md',
        '---\ntype: "concept"\ncore_assertions: ["x"]\n---\nAn idea.\n',
      );
      put('1.Projects/Talk/Quoting.md', 'From [[Clipped]].\n');
      put('1.Projects/Talk/Sparred.md', '---\ncoach_id: c-9\n---\nKnown.\n');
      put('1.Projects/Talk/Shared.md', 'Used elsewhere.\n');
      put(
        '2.Areas/Health/Log.md',
        'See [[Shared]] and [[Plan]] and [[Shared]].\n',
      );
    });

    it('suggests concept notes, sparred notes, notes citing raw material and notes linked from outside, with reasons', async () => {
      const preview = await vault.archiveProject('Talk', false);
      expect(preview.executed).toBe(false);
      expect(preview.suggestions).toEqual([
        {
          path: '1.Projects/Talk/Idea.md',
          to: '3.Resources/Concepts',
          reasons: ['a concept note'],
        },
        {
          path: '1.Projects/Talk/Plan.md',
          to: '3.Resources/Talk',
          reasons: ['linked from 1 note outside the project'],
        },
        {
          path: '1.Projects/Talk/Quoting.md',
          to: '3.Resources/Talk',
          reasons: ['cites raw material'],
        },
        {
          path: '1.Projects/Talk/Shared.md',
          to: '3.Resources/Talk',
          reasons: ['linked from 1 note outside the project'],
        },
        {
          path: '1.Projects/Talk/Sparred.md',
          to: '3.Resources/Talk',
          reasons: ['has sparring history'],
        },
      ]);

      expect(preview.actions.at(-1)).toEqual({
        op: 'move',
        from: '1.Projects/Talk',
        to: '4.Archive/Talk',
      });
    });

    it('moves kept notes into Resources first, then archives the rest of the folder', async () => {
      const done = await vault.archiveProject('Talk', true, {
        keep: [
          { note: '1.Projects/Talk/Idea.md' },
          { note: '1.Projects/Talk/Shared.md', to: '3.Resources/Health' },
        ],
      });
      expect(done.executed).toBe(true);
      expect(done.actions).toEqual([
        { op: 'create', to: '3.Resources/Concepts' },
        {
          op: 'move',
          from: '1.Projects/Talk/Idea.md',
          to: '3.Resources/Concepts/Idea.md',
        },
        { op: 'create', to: '3.Resources/Health' },
        {
          op: 'move',
          from: '1.Projects/Talk/Shared.md',
          to: '3.Resources/Health/Shared.md',
        },
        { op: 'create', to: '4.Archive' },
        { op: 'move', from: '1.Projects/Talk', to: '4.Archive/Talk' },
      ]);
      expect(read('3.Resources/Concepts/Idea.md')).toContain('An idea.');
      expect(has('3.Resources/Health/Shared.md')).toBe(true);
      expect(read('4.Archive/Talk/Plan.md')).toBe(
        'Slides, rehearsal, travel.\n',
      );
      expect(has('4.Archive/Talk/Idea.md')).toBe(false);
    });

    it('keeps every suggestion with keep_suggested, and removes a project folder left empty', async () => {
      const r = await vault.archiveProject('Talk', true, {
        keepSuggested: true,
      });
      expect(r.actions.at(-1)).toEqual({
        op: 'remove_empty',
        from: '1.Projects/Talk',
      });
      for (const p of [
        '3.Resources/Concepts/Idea.md',
        '3.Resources/Talk/Plan.md',
        '3.Resources/Talk/Quoting.md',
        '3.Resources/Talk/Shared.md',
        '3.Resources/Talk/Sparred.md',
      ])
        expect(has(p), p).toBe(true);
      expect(has('4.Archive/Talk')).toBe(false);
      expect(has('1.Projects/Talk')).toBe(false);
    });

    it('still archives what is left when only some notes are kept', async () => {
      const r = await vault.archiveProject('Talk', false, {
        keep: [{ note: '1.Projects/Talk/Idea.md' }],
      });
      expect(r.actions.at(-1)).toEqual({
        op: 'move',
        from: '1.Projects/Talk',
        to: '4.Archive/Talk',
      });
    });

    it('refuses a kept note outside the project, a target outside Resources or in raw, and an existing target', async () => {
      put('3.Resources/Concepts/Idea.md', 'mine');
      const r = await vault.archiveProject('Talk', true, {
        keep: [
          { note: '2.Areas/Health/Log.md' },
          { note: '1.Projects/Talk/Plan.md', to: '2.Areas/Health' },
          {
            note: '1.Projects/Talk/Shared.md',
            to: '3.Resources/0.Raw/Articles',
          },
          { note: '1.Projects/Talk/Idea.md' },
        ],
      });
      expect(r.executed).toBe(false);
      expect(r.errors).toEqual([
        'keep: 2.Areas/Health/Log.md is not a note in 1.Projects/Talk',
        'keep: 2.Areas/Health is not a folder under 3.Resources outside 0.Raw',
        'keep: 3.Resources/0.Raw/Articles is not a folder under 3.Resources outside 0.Raw',
      ]);
      expect(r.collisions).toEqual(['3.Resources/Concepts/Idea.md']);
      expect(read('3.Resources/Concepts/Idea.md')).toBe('mine');
      expect(has('1.Projects/Talk/Plan.md')).toBe(true);
    });
  });
});
