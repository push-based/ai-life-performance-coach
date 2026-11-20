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
import { harvestWorkstream, resetChecklist } from '../harvest.js';
import { scanVault, fsListing } from '../scan.js';
import { createVault } from '../vault.js';
import { buildVaultGraph, planning } from '@ai-coach/vault-domain';

let dir: string;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}
const read = (rel: string) => readFileSync(join(dir, rel), 'utf-8');
const WS = '1.Projects/Expo2026/Workstreams';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'harvest-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function seed(): void {
  put(
    '1.Projects/Expo2026/Expo2026.md',
    '---\nstatus: in-progress\n---\n# Expo2026\n',
  );
  put(
    `${WS}/Workshops.md`,
    [
      '---',
      'status: done',
      '---',
      '## Slots',
      '',
      '- [x] All slots taken #M ✅ 2026-10-20 ^slots',
      '',
      '## Onboarding',
      '',
      '- [x] Found ⏫ ✅ 2026-10-01',
      '- [x] Announced on social media #S ✅ 2026-10-02',
      '- [ ] Moved to Discord #slipped/2026-W44 ⏳ 2026-11-02',
      '  - [x] Sent the invite',
      '',
    ].join('\n'),
  );
  put(
    `${WS}/Marketing/Marketing.md`,
    '---\nstatus: in-progress\n---\n# Marketing\n',
  );
  put(
    `${WS}/Marketing/Items.md`,
    '## Posters\n\n- [x] Workshops people\n- [x] Schedule\n- [x] Panels\n',
  );
  put(`${WS}/Marketing/Poster.jpeg`, 'jpeg');
  put(`${WS}/Marketing/Badge/Facilitator.jpeg`, 'badge');
}

describe('resetChecklist', () => {
  it('unticks and strips dates, priority, slips and block ids, keeping size and nesting', () => {
    expect(
      resetChecklist(
        '- [x] Found ⏫ ✅ 2026-10-01\n- [ ] Moved #M #slipped/2026-W44 ⏳ 2026-11-02 ^m\n  - [x] Sent\nPlain line',
      ),
    ).toBe('- [ ] Found\n- [ ] Moved #M\n  - [ ] Sent\nPlain line');
  });
});

describe('harvest_workstream', () => {
  it('lists candidates: notes, sections with three or more checkboxes, and files', async () => {
    seed();
    put(
      `${WS}/Marketing/Marketing.md`,
      '---\nstatus: done\n---\n# Marketing\n',
    );
    const plan = harvestWorkstream(
      dir,
      await scanVault(dir),
      'Expo2026',
      'Marketing',
      undefined,
      '2026-11-30',
    );
    expect(plan.errors).toEqual([]);
    expect(plan.candidates).toEqual([
      {
        kind: 'note',
        path: `${WS}/Marketing/Items.md`,
        title: 'Items',
        tasks: 3,
      },
      {
        kind: 'checklist',
        path: `${WS}/Marketing/Items.md`,
        section: 'Posters',
        items: 3,
      },
      {
        kind: 'note',
        path: `${WS}/Marketing/Marketing.md`,
        title: 'Marketing',
        tasks: 0,
      },
      { kind: 'file', path: `${WS}/Marketing/Badge/Facilitator.jpeg` },
      { kind: 'file', path: `${WS}/Marketing/Poster.jpeg` },
    ]);
  });

  it('refuses a workstream that is not done, or not there', async () => {
    seed();
    const notes = await scanVault(dir);
    expect(
      harvestWorkstream(
        dir,
        notes,
        'Expo2026',
        'Marketing',
        undefined,
        '2026-11-30',
      ).errors,
    ).toEqual([
      'Marketing is in-progress: set its status to done first, then harvest it',
    ]);
    expect(
      harvestWorkstream(
        dir,
        notes,
        'Expo2026',
        'Catering',
        undefined,
        '2026-11-30',
      ).errors[0],
    ).toMatch(/no workstream Catering .* it has Marketing, Workshops/);
    expect(
      harvestWorkstream(dir, notes, 'Nope', 'x', undefined, '2026-11-30')
        .errors,
    ).toEqual(['no project Nope in 1.Projects']);
  });

  it('writes a packet from a section, reset for reuse, linking its project and workstream', async () => {
    seed();
    const vault = createVault(dir, { now: () => new Date(2026, 10, 30, 12) });
    const r = await vault.harvestWorkstream(
      'Expo2026',
      'Workshops',
      [
        {
          title: 'Workshop speaker onboarding checklist',
          text: 'Run it for every speaker once their slot is confirmed.',
          from: [`${WS}/Workshops.md#Onboarding`],
        },
      ],
      true,
    );
    expect(r.errors).toEqual([]);
    expect(r.executed).toBe(true);
    const path =
      '1.Projects/Expo2026/Intermediate Packets/Workshop speaker onboarding checklist.md';
    expect(read(path)).toBe(
      [
        '---',
        'type: intermediate-packet',
        'project: "[[Expo2026]]"',
        'workstream: "[[Workshops]]"',
        'harvested: 2026-11-30',
        '---',
        '# Workshop speaker onboarding checklist',
        '',
        'From [[Expo2026]] → [[Workshops]].',
        '',
        'Run it for every speaker once their slot is confirmed.',
        '',
        '## Onboarding',
        '',
        '- [ ] Found',
        '- [ ] Announced on social media #S',
        '- [ ] Moved to Discord',
        '  - [ ] Sent the invite',
        '',
      ].join('\n'),
    );

    expect(read(`${WS}/Workshops.md`)).toContain(
      '- [x] Found ⏫ ✅ 2026-10-01',
    );
    const edges = buildVaultGraph(await scanVault(dir))
      .edges.filter((e) => e.source === path)
      .map((e) => e.target);
    expect(edges).toEqual([
      '1.Projects/Expo2026/Expo2026.md',
      `${WS}/Workshops.md`,
    ]);
  });

  it('copies a reused file beside the packet and embeds it, refusing to overwrite', async () => {
    seed();
    put(
      `${WS}/Marketing/Marketing.md`,
      '---\nstatus: done\n---\n# Marketing\n',
    );
    const vault = createVault(dir);
    const input = [
      {
        title: 'Poster design',
        from: [
          `${WS}/Marketing/Poster.jpeg`,
          `${WS}/Marketing/Items.md#Posters`,
        ],
      },
    ];
    const preview = await vault.harvestWorkstream(
      'Expo2026',
      'Marketing',
      input,
      false,
    );
    expect(preview.copies).toEqual([
      {
        from: `${WS}/Marketing/Poster.jpeg`,
        to: '1.Projects/Expo2026/Intermediate Packets/Poster.jpeg',
      },
    ]);
    expect(
      preview.contents[
        '1.Projects/Expo2026/Intermediate Packets/Poster design.md'
      ],
    ).toContain('![[Poster.jpeg]]\n\n## Posters\n\n- [ ] Workshops people');
    expect(
      existsSync(join(dir, '1.Projects/Expo2026/Intermediate Packets')),
    ).toBe(false);
    expect(
      (await vault.harvestWorkstream('Expo2026', 'Marketing', input, true))
        .executed,
    ).toBe(true);
    expect(read('1.Projects/Expo2026/Intermediate Packets/Poster.jpeg')).toBe(
      'jpeg',
    );
    expect(read(`${WS}/Marketing/Poster.jpeg`)).toBe('jpeg');
    const again = await vault.harvestWorkstream(
      'Expo2026',
      'Marketing',
      input,
      true,
    );
    expect(again.executed).toBe(false);
    expect(again.collisions).toEqual([
      '1.Projects/Expo2026/Intermediate Packets/Poster.jpeg',
      '1.Projects/Expo2026/Intermediate Packets/Poster design.md',
    ]);
  });

  it('refuses sources outside the workstream and packets with nothing in them', async () => {
    seed();
    const r = harvestWorkstream(
      dir,
      await scanVault(dir),
      'Expo2026',
      'Workshops',
      [
        { title: 'A', from: [`${WS}/Marketing/Items.md`] },
        { title: 'B' },
        { title: 'C', from: [`${WS}/Workshops.md#Catering`] },
      ],
      '2026-11-30',
    );
    expect(r.errors).toEqual([
      `packet "A": ${WS}/Marketing/Items.md is not in the workstream Workshops`,
      'packet "B": give it text, or what it is built from',
      `packet "C": no section "Catering" in ${WS}/Workshops.md`,
    ]);
  });
});

describe('harvest_workstream links', () => {
  it("links by path, and says so, when the project's name is also another note's", async () => {
    seed();
    put('0.Inbox/Expo2026.md', 'An idea.\n');
    const r = harvestWorkstream(
      dir,
      await scanVault(dir),
      'Expo2026',
      'Workshops',
      [{ title: 'X', text: 'y' }],
      '2026-11-30',
    );
    expect(r.warnings).toEqual([
      'Expo2026 names more than one note, so the packet links 1.Projects/Expo2026/Expo2026.md by path; that link breaks when the project is archived',
    ]);
    expect(r.writes['1.Projects/Expo2026/Intermediate Packets/X.md']).toContain(
      'From [[1.Projects/Expo2026/Expo2026|Expo2026]] → [[Workshops]].',
    );
  });
});

describe('archive_project with Intermediate Packets (Decision 13)', () => {
  it('moves the packets to Resources before archiving, and their links follow the archived project', async () => {
    seed();
    const vault = createVault(dir);
    await vault.harvestWorkstream(
      'Expo2026',
      'Workshops',
      [
        {
          title: 'Onboarding checklist',
          from: [`${WS}/Workshops.md#Onboarding`],
        },
      ],
      true,
    );
    const r = await vault.archiveProject('Expo2026', true);
    expect(r.actions.slice(0, 2)).toEqual([
      { op: 'create', to: '3.Resources/Intermediate Packets' },
      {
        op: 'move',
        from: '1.Projects/Expo2026/Intermediate Packets',
        to: '3.Resources/Intermediate Packets/Expo2026',
      },
    ]);
    expect(
      r.suggestions?.some((s) => s.path.includes('Intermediate Packets')),
    ).toBe(false);
    expect(
      existsSync(
        join(
          dir,
          '3.Resources/Intermediate Packets/Expo2026/Onboarding checklist.md',
        ),
      ),
    ).toBe(true);
    expect(existsSync(join(dir, '4.Archive/Expo2026/Expo2026.md'))).toBe(true);

    const edges = buildVaultGraph(await scanVault(dir))
      .edges.filter((e) => e.source.endsWith('Onboarding checklist.md'))
      .map((e) => e.target);
    expect(edges).toEqual([
      '4.Archive/Expo2026/Expo2026.md',
      '4.Archive/Expo2026/Workstreams/Workshops.md',
    ]);
    const p = await vault.planning();
    expect(p.projects.find((x) => x.name === 'Expo2026')).toMatchObject({
      archived: true,
      folder: '4.Archive/Expo2026',
    });
  });
});

describe('harvest edge cases', () => {
  it('keeps emoji that are not Tasks signifiers when it resets a checklist', () => {
    expect(resetChecklist('- [x] 💡 idea 🔼 ✅ 2026-11-01')).toBe(
      '- [ ] 💡 idea',
    );
  });

  it('copies a file reused by two packets once', async () => {
    put(
      '1.Projects/Expo2026/Expo2026.md',
      '---\nstatus: in-progress\n---\n# Expo2026\n',
    );
    put(
      '1.Projects/Expo2026/Workstreams/Marketing/Marketing.md',
      '---\nstatus: done\n---\n# Marketing\n',
    );
    put('1.Projects/Expo2026/Workstreams/Marketing/poster.png', 'png');
    const from = ['1.Projects/Expo2026/Workstreams/Marketing/poster.png'];
    const r = harvestWorkstream(
      dir,
      await scanVault(dir),
      'Expo2026',
      'Marketing',
      [
        { title: 'Poster', from },
        { title: 'Kit', from },
      ],
      '2026-11-30',
    );
    expect(r.collisions).toEqual([]);
    expect(r.copies).toEqual([
      {
        from: from[0],
        to: '1.Projects/Expo2026/Intermediate Packets/poster.png',
      },
    ]);
  });

  it("does not count a packet's checklist as the project's open work", async () => {
    put(
      '1.Projects/Expo2026/Expo2026.md',
      '---\nstatus: in-progress\n---\n# Expo2026\n',
    );
    put(
      '1.Projects/Expo2026/Intermediate Packets/Checklist.md',
      '- [ ] Book the room\n',
    );
    expect(planning(fsListing(dir), await scanVault(dir)).tasks).toEqual([]);
  });
});
