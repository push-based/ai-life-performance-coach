import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createVault, type Vault } from '@ai-coach/vault/vault.js';
import { createVaultTools } from '../vault.js';
import { createVaultServer } from '../../server/vault.js';
import { parseVaultFlags, workspaceRootsAbove } from '../../serve-vault.js';

let dir: string;
let vault: Vault;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

const tool = (name: string) =>
  createVaultTools(vault).find((t) => t.name === name)!;
const call = async (name: string, args: Record<string, unknown> = {}) => {
  const res = await tool(name).handler(args);
  return { res, data: res.isError ? null : JSON.parse(res.content[0].text) };
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'vault-tools-'));
  put('1.Projects/Expo2026/Talk.md', '# Talk\n\nBuilds on [[Event loop]].\n');
  put(
    '3.Resources/TypeScript/Event loop.md',
    '---\ncoach_id: c-1\n---\nMicrotasks first. [[Gone]]\n',
  );
  put(
    '3.Resources/TypeScript/Promises.md',
    'Promises resolve as microtasks, see [[Event loop]].\n',
  );
  put('Stray.md', 'Outside PARA.\n');
  vault = createVault(dir);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('vault tool registry', () => {
  it('lists every tool, with the writers marked as such', () => {
    const tools = createVaultTools(vault);
    expect(tools.map((t) => t.name)).toEqual([
      'list_notes',
      'read_note',
      'search',
      'vault_graph',
      'due_for_review',
      'tier2_payload',
      'record_session',
      'init_vault',
      'capture',
      'file_note',
      'archive_project',
      'list_raw',
      'convert_raw',
      'find_passages',
      'marked_passages',
      'create_concept',
      'extend_concept',
      'reading_progress',
      'mark_read',
      'write_summary',
      'add_reading_notes',
      'write_structure',
      'list_topics',
      'climb',
      'rebuild_climb',
      'save_guideline',
      'planning_overview',
      'plan_period',
      'plan_days',
      'add_tasks',
      'add_habits',
      'update_task',
      'set_frontmatter',
      'edit_note',
      'create_workstream',
      'roll_over',
      'review_period',
      'harvest_workstream',
    ]);
    expect(
      tools.filter((t) => !t.annotations?.readOnlyHint).map((t) => t.name),
    ).toEqual([
      'record_session',
      'init_vault',
      'capture',
      'file_note',
      'archive_project',
      'convert_raw',
      'create_concept',
      'extend_concept',
      'mark_read',
      'write_summary',
      'add_reading_notes',
      'write_structure',
      'rebuild_climb',
      'save_guideline',
      'plan_period',
      'plan_days',
      'add_tasks',
      'add_habits',
      'update_task',
      'set_frontmatter',
      'edit_note',
      'create_workstream',
      'roll_over',
      'harvest_workstream',
    ]);
  });
});

describe('list_notes', () => {
  it('counts every bucket and lists notes', async () => {
    put('Plans/Weekly/2026-W45.md', '## Goals\n');
    const { data } = await call('list_notes');
    expect(data.total).toBe(5);
    expect(data.counts).toEqual({
      inbox: 0,
      projects: 1,
      areas: 0,
      resources: 2,
      archive: 0,
      plans: 1,
      out_of_place: 1,
    });
    expect(
      (await call('list_notes', { bucket: 'plans' })).data.notes.map(
        (n: { path: string }) => n.path,
      ),
    ).toEqual(['Plans/Weekly/2026-W45.md']);
    expect(
      data.notes.find((n: { path: string }) =>
        n.path.endsWith('Event loop.md'),
      ),
    ).toMatchObject({
      bucket: 'resources',
      container: 'TypeScript',
      coachId: 'c-1',
    });
  });

  it('filters by bucket, out_of_place, and container', async () => {
    expect(
      (await call('list_notes', { bucket: 'resources' })).data.notes,
    ).toHaveLength(2);
    expect(
      (await call('list_notes', { bucket: 'out_of_place' })).data.notes.map(
        (n: { path: string }) => n.path,
      ),
    ).toEqual(['Stray.md']);
    expect(
      (await call('list_notes', { container: 'Expo2026' })).data.notes,
    ).toHaveLength(1);
  });
});

describe('read_note', () => {
  it('returns body, frontmatter, location and resolved links', async () => {
    const { data } = await call('read_note', {
      path: '3.Resources/TypeScript/Event loop.md',
    });
    expect(data).toMatchObject({
      title: 'Event loop',
      bucket: 'resources',
      coachId: 'c-1',
      frontmatter: { coach_id: 'c-1' },
    });
    expect(data.body).toContain('Microtasks first.');
    expect(data.links).toEqual([
      { kind: 'wikilink', target: 'Gone', resolved: null },
    ]);
  });

  it('errors on a missing note and on a path outside the vault', async () => {
    expect(
      (await call('read_note', { path: '0.Inbox/None.md' })).res.isError,
    ).toBe(true);
    expect(
      (await call('read_note', { path: '../../etc/hosts.md' })).res.isError,
    ).toBe(true);
  });
});

describe('search', () => {
  it('finds notes and filters by bucket', async () => {
    const all = (await call('search', { query: 'event loop' })).data;
    expect(all[0].path).toBe('3.Resources/TypeScript/Event loop.md');
    const projects = (
      await call('search', { query: 'event loop', bucket: 'projects' })
    ).data;
    expect(projects.map((h: { path: string }) => h.path)).toEqual([
      '1.Projects/Expo2026/Talk.md',
    ]);
  });
});

describe('vault_graph', () => {
  it("returns the whole graph, or one bucket's nodes and the edges between them", async () => {
    const whole = (await call('vault_graph')).data;
    expect(whole.nodes).toHaveLength(4);
    expect(whole.edges).toHaveLength(2);
    expect(whole.unresolved).toEqual([
      { source: '3.Resources/TypeScript/Event loop.md', target: 'Gone' },
    ]);
    const resources = (await call('vault_graph', { bucket: 'resources' })).data;
    expect(resources.nodes).toHaveLength(2);
    expect(resources.edges).toEqual([
      {
        source: '3.Resources/TypeScript/Promises.md',
        target: '3.Resources/TypeScript/Event loop.md',
        kind: 'wikilink',
      },
    ]);
  });
});

describe('vault server over MCP', () => {
  it("lists the vault's notes by bucket to a connected client", async () => {
    const server = createVaultServer({
      vault,
      pkg: { name: 'docs-mcp', version: '0.0.0' },
    });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await server.connect(serverSide);
    const client = new Client({ name: 'ai-coach-test', version: '0.0.0' });
    await client.connect(clientSide);
    try {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual([
        'add_habits',
        'add_reading_notes',
        'add_tasks',
        'archive_project',
        'capture',
        'climb',
        'convert_raw',
        'create_concept',
        'create_workstream',
        'due_for_review',
        'edit_note',
        'extend_concept',
        'file_note',
        'find_passages',
        'harvest_workstream',
        'init_vault',
        'list_notes',
        'list_raw',
        'list_topics',
        'mark_read',
        'marked_passages',
        'plan_days',
        'plan_period',
        'planning_overview',
        'read_note',
        'reading_progress',
        'rebuild_climb',
        'record_session',
        'review_period',
        'roll_over',
        'save_guideline',
        'search',
        'set_frontmatter',
        'tier2_payload',
        'update_task',
        'vault_graph',
        'write_structure',
        'write_summary',
      ]);
      const res = await client.callTool({
        name: 'list_notes',
        arguments: { bucket: 'resources' },
      });
      const data = JSON.parse((res.content as { text: string }[])[0].text);
      expect(data.notes.map((n: { path: string }) => n.path)).toEqual([
        '3.Resources/TypeScript/Event loop.md',
        '3.Resources/TypeScript/Promises.md',
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });
});

describe('sparring tools', () => {
  const session = (execute: boolean) =>
    call('record_session', {
      tier: 1,
      items: [
        {
          note: '3.Resources/TypeScript/Promises.md',
          challenge: 'Why microtasks?',
          answer: 'They drain first.',
          verdict: 'pass',
          next_review: '2000-01-01',
        },
      ],
      execute,
    });

  it('record_session previews, then writes; read tools then show the history', async () => {
    const preview = await session(false);
    expect(preview.data).toMatchObject({
      executed: false,
      new_coach_ids: [{ path: '3.Resources/TypeScript/Promises.md' }],
    });
    expect(
      (await call('read_note', { path: '3.Resources/TypeScript/Promises.md' }))
        .data.coachId,
    ).toBeNull();

    const written = (await session(true)).data;
    expect(written.executed).toBe(true);
    const note = (
      await call('read_note', { path: '3.Resources/TypeScript/Promises.md' })
    ).data;
    expect(note.coachId).toBe(written.items[0].coach_id);
    expect(note.history).toMatchObject({
      mastery: 'tier1_passed',
      sessions: 1,
      nextReview: '2000-01-01',
    });
    expect(note.history.entries).toEqual([
      {
        session_id: written.session_id,
        tier: 1,
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        verdict: 'pass',
        gaps: [],
        next_review: '2000-01-01',
      },
    ]);
    const listed = (await call('list_notes', { bucket: 'resources' })).data
      .notes;
    expect(
      listed.find((n: { path: string }) => n.path.endsWith('Promises.md'))
        .mastery,
    ).toBe('tier1_passed');
    const graph = (await call('vault_graph', { bucket: 'resources' })).data;
    expect(
      graph.nodes.map((n: { mastery: string }) => n.mastery).sort(),
    ).toEqual(['tier1_passed', 'unsparred']);
  });

  it('record_session reports refusals as an error', async () => {
    const { res } = await call('record_session', {
      tier: 1,
      items: [
        {
          note: '1.Projects/Expo2026/Talk.md',
          challenge: 'c',
          answer: 'a',
          verdict: 'fail',
          next_review: '2026-11-01',
        },
      ],
      execute: true,
    });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/not under 3\.Resources/);
  });

  it('read_note history lists every session oldest first, so a scheduler can read the run at one tier', async () => {
    const t1 = (await session(true)).data;
    const coach_id = t1.items[0].coach_id;
    const t2 = (verdict: string, next_review: string) =>
      call('record_session', {
        tier: 2,
        items: [
          {
            coach_id,
            challenge: 'Why microtasks?',
            answer: 'They drain first.',
            verdict,
            gaps: verdict === 'fail' ? ['ordering'] : [],
            next_review,
          },
        ],
        execute: true,
      });
    await t2('pass', '2026-11-07');
    await t2('fail', '2026-11-02');
    const { history } = (
      await call('read_note', { path: '3.Resources/TypeScript/Promises.md' })
    ).data;
    expect(
      history.entries.map(
        (e: { tier: number; verdict: string; next_review: string }) => [
          e.tier,
          e.verdict,
          e.next_review,
        ],
      ),
    ).toEqual([
      [1, 'pass', '2000-01-01'],
      [2, 'pass', '2026-11-07'],
      [2, 'fail', '2026-11-02'],
    ]);
    expect(history.entries[2].gaps).toEqual(['ordering']);
    expect(history.entries[0].session_id).toBe(t1.session_id);
    const unsparred = (
      await call('read_note', { path: '3.Resources/TypeScript/Event loop.md' })
    ).data.history;
    expect(unsparred).toMatchObject({ mastery: 'unsparred', entries: [] });
  });

  it('due_for_review and tier2_payload work off recorded sessions', async () => {
    const { session_id } = (await session(true)).data;
    const due = (await call('due_for_review', { today: '2026-10-24' })).data;
    expect(due.due.map((n: { path: string }) => n.path)).toEqual([
      '3.Resources/TypeScript/Promises.md',
    ]);
    expect(due.unsparred.map((n: { path: string }) => n.path)).toEqual([
      '3.Resources/TypeScript/Event loop.md',
    ]);
    expect((await call('tier2_payload', { session_id })).data).toEqual({
      items: [{ challenge: 'Why microtasks?', answer: 'They drain first.' }],
    });
    expect(
      (await call('tier2_payload', { session_id, include_assertions: true }))
        .data,
    ).toEqual({
      items: [
        {
          challenge: 'Why microtasks?',
          answer: 'They drain first.',
          core_assertions: [],
        },
      ],
    });
    expect(
      (await call('tier2_payload', { session_id: 'nope' })).res.isError,
    ).toBe(true);
  });
});

describe('filing tools', () => {
  it('preview by default, write on execute, and report refusals as errors', async () => {
    const preview = (
      await call('file_note', { path: 'Stray.md', to: '3.Resources' })
    ).data;
    expect(preview).toMatchObject({
      executed: false,
      actions: [{ op: 'move', from: 'Stray.md', to: '3.Resources/Stray.md' }],
    });
    expect(
      (
        await call('file_note', {
          path: 'Stray.md',
          to: '3.Resources',
          execute: true,
        })
      ).data.executed,
    ).toBe(true);
    expect(
      (await call('list_notes', { bucket: 'out_of_place' })).data.notes,
    ).toEqual([]);
    expect(
      (await call('capture', { title: 'Idea', body: 'x', execute: true })).data
        .executed,
    ).toBe(true);
    expect(
      (await call('archive_project', { project: 'Expo2026', execute: true }))
        .data.executed,
    ).toBe(true);
    expect((await call('init_vault', {})).data.actions).toEqual([
      { op: 'create', to: '2.Areas' },
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
    const areas = (
      await call('init_vault', {
        areas: ['Health', 'Public Speaking'],
        execute: true,
      })
    ).data;
    expect(areas.actions).toContainEqual({
      op: 'write',
      to: '2.Areas/Public Speaking.md',
    });
    expect(
      (await call('list_notes', { bucket: 'areas' })).data.notes.map(
        (n: { path: string }) => n.path,
      ),
    ).toEqual(['2.Areas/Health.md', '2.Areas/Public Speaking.md']);
    const refused = await call('file_note', {
      path: '3.Resources/Stray.md',
      to: 'Elsewhere',
      execute: true,
    });
    expect(refused.res.isError).toBe(true);
  });
});

describe('concept tools', () => {
  const CH = '3.Resources/0.Raw/Books/A/Book/chapters/01 One.md';
  beforeEach(() => {
    put(
      CH,
      '---\ntitle: "Chapter 1: One"\nraw_role: "chapter"\nbook: "Book"\npages: "4-5"\n---\n## Page 4\n\nMicrotasks run before the next macrotask.\n\n## Page 5\n\nRendering waits.\n',
    );
  });

  it('find_passages, then create_concept; read_note returns the concept with its passages re-checked; list_notes filters concepts', async () => {
    const hits = (
      await call('find_passages', { query: 'microtasks macrotask' })
    ).data;
    expect(hits[0]).toMatchObject({ note: CH, page: 4, source: 'Book' });

    const args = {
      title: 'Microtask queue',
      summary: 'Microtasks drain first.',
      core_assertions: ['Microtasks run before the next macrotask.'],
      passages: [
        { note: CH, quote: 'Microtasks run before the next macrotask' },
      ],
    };
    const preview = (await call('create_concept', args)).data;
    expect(preview).toMatchObject({
      executed: false,
      path: '3.Resources/Concepts/Microtask queue.md',
      passages: [{ pages: '4', found: true }],
    });
    expect(
      (await call('create_concept', { ...args, execute: true })).data.executed,
    ).toBe(true);

    const note = (
      await call('read_note', {
        path: '3.Resources/Concepts/Microtask queue.md',
      })
    ).data;
    expect(note.concept).toEqual({
      coreAssertions: ['Microtasks run before the next macrotask.'],
      forbiddenBuzzwords: [],
      fromNotes: [],
      passages: [
        {
          note: CH,
          quote: 'Microtasks run before the next macrotask',
          pages: '4',
          found: true,
        },
      ],
      problems: [],
    });
    expect(
      (await call('read_note', { path: '3.Resources/TypeScript/Promises.md' }))
        .data.concept,
    ).toBeUndefined();
    expect(
      (await call('list_notes', { concept: true })).data.notes.map(
        (n: { path: string }) => n.path,
      ),
    ).toEqual(['3.Resources/Concepts/Microtask queue.md']);
  });

  it('create_concept reports a misquote as an error', async () => {
    const { res } = await call('create_concept', {
      title: 'X',
      summary: 'x',
      core_assertions: ['x'],
      passages: [{ note: CH, quote: 'Macrotasks run before everything' }],
    });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain(`passages[0]: not found in ${CH}`);
  });
});

describe('reading tools', () => {
  const WORK = '3.Resources/0.Raw/Books/A/Book';
  const CH = `${WORK}/chapters/01 One.md`;
  beforeEach(() => {
    put(
      `${WORK}/text.md`,
      '---\ntitle: "Book"\nraw_role: "index"\n---\n# Book\n',
    );
    put(
      CH,
      '---\ntitle: "Chapter 1: One"\nraw_role: "chapter"\npages: "4-5"\n---\n# One\n\n## Page 4\n\nSome **bold** text.\n\n## Page 5\n\nMore.\n',
    );
  });

  it('mark_read and write_summary preview then write; reading_progress and read_note show the result', async () => {
    expect((await call('mark_read', { book: WORK })).data).toMatchObject({
      executed: false,
      path: `${WORK}/text.md`,
    });
    expect(
      (
        await call('mark_read', {
          book: WORK,
          date: '2026-10-20',
          execute: true,
        })
      ).data.executed,
    ).toBe(true);
    expect(
      (await call('write_summary', { path: CH, text: 'Mine.', execute: true }))
        .data.executed,
    ).toBe(true);

    const [book] = (
      await call('reading_progress', { book: WORK, chapters: false })
    ).data;
    expect(book).toMatchObject({
      index: `${WORK}/text.md`,
      stage: 'distilled',
      steps: { readOn: '2026-10-20', chaptersComplete: 1, chapters: 1 },
    });
    expect(book.chapters).toBeUndefined();
    expect((await call('read_note', { path: CH })).data.distillation).toEqual({
      summary: true,
      state: 'complete',
      pages: [
        { page: 4, mark: 'bold', summary: false, empty: false },
        { page: 5, mark: 'none', summary: false, empty: false },
      ],
    });
  });

  it("marked_passages gives the user's marks as whole sentences, and refuses a path that is not a chapter or book", async () => {
    const passages = (await call('marked_passages', { note: WORK })).data;
    expect(passages).toEqual([
      {
        note: CH,
        chapter: 'Chapter 1: One',
        page: 4,
        quote: 'Some bold text.',
        depth: 'bold',
        marked: [{ mark: 'bold', text: 'bold' }],
      },
    ]);
    expect(
      (await call('marked_passages', { note: CH, depth: 'highlight' })).data,
    ).toEqual([]);
    expect(
      (await call('marked_passages', { note: '0.Inbox/x.md' })).res.isError,
    ).toBe(true);
  });

  it('reports refusals as errors', async () => {
    const { res } = await call('write_summary', {
      path: `${WORK}/text.md`,
      text: 'x',
    });
    expect(res.isError).toBe(true);
    expect((await call('reading_progress', { book: 'nope' })).res.isError).toBe(
      true,
    );
  });
});

describe('serve-vault helpers', () => {
  it('reads --vault in both spellings and --vault-config', () => {
    expect(parseVaultFlags(['--vault', '/v'])).toEqual({
      vault: '/v',
      vaultConfig: undefined,
    });
    expect(parseVaultFlags(['--vault=/v', '--vault-config=/c.json'])).toEqual({
      vault: '/v',
      vaultConfig: '/c.json',
    });
    expect(parseVaultFlags(['--vault']).vault).toBeUndefined();
    expect(parseVaultFlags(['--vault', '--port=5000'])).toEqual({
      vault: undefined,
      vaultConfig: undefined,
    });
    expect(parseVaultFlags(['--vault', '--vault-config=/c.json'])).toEqual({
      vault: undefined,
      vaultConfig: '/c.json',
    });
  });

  it('finds every docs-mcp workspace from cwd upward', () => {
    writeFileSync(join(dir, 'docs-mcp.config.json'), '{}');
    mkdirSync(join(dir, 'a', 'b'), { recursive: true });
    expect(workspaceRootsAbove(join(dir, 'a', 'b'))).toContain(dir);
  });
});

describe('planning_overview', () => {
  it("returns only the period with scope 'period', with each task's address, 🔁, 🆔 and ⛔", async () => {
    put(
      '1.Projects/Expo2026/Expo2026.md',
      '---\nstatus: in-progress\n---\n# Expo2026\n',
    );
    put(
      '1.Projects/Expo2026/Workstreams/Talks.md',
      '- [ ] Gym 🔁 every week on Monday ⏳ 2026-11-02\n- [ ] Post 🆔 post ⛔ abstract ⏳ 2026-11-03 ^p\n- [ ] Late ⏳ 2026-10-20\n- [ ] Unscheduled\n',
    );
    const { data } = await call('planning_overview', {
      period: '2026-W45',
      scope: 'period',
    });
    expect(Object.keys(data).sort()).toEqual([
      'goals',
      'overdue',
      'parentGoals',
      'period',
      'scheduled',
      'warnings',
    ]);
    expect(data.scheduled).toEqual([
      expect.objectContaining({
        line: 0,
        text: 'Gym',
        recurrence: 'every week on Monday',
        id: null,
        blockedBy: [],
      }),
      expect.objectContaining({
        line: 1,
        text: 'Post',
        id: 'post',
        blockedBy: ['abstract'],
        blockId: 'p',
      }),
    ]);
    expect(data.overdue.map((t: { text: string }) => t.text)).toEqual(['Late']);
    expect(
      (await call('planning_overview', { scope: 'period' })).res.isError,
    ).toBe(true);
  });

  it("returns only matching project/workstream and compact openTasks with scope 'tasks'", async () => {
    put(
      '1.Projects/Expo2026/Expo2026.md',
      '---\nstatus: in-progress\n---\n# Expo2026\n',
    );
    put(
      '1.Projects/Other2026/Other2026.md',
      '---\nstatus: in-progress\n---\n# Other2026\n',
    );
    put(
      '1.Projects/Expo2026/Workstreams/Talks.md',
      '- [ ] Talk task #S\n- [x] Done task\n',
    );
    put(
      '1.Projects/Expo2026/Workstreams/Marketing.md',
      '- [ ] Marketing task\n',
    );
    put('1.Projects/Other2026/Workstreams/Ops.md', '- [ ] Other task\n');
    const { data } = await call('planning_overview', {
      project: 'Expo2026',
      scope: 'tasks',
    });
    expect(data.projects.map((p: { name: string }) => p.name)).toEqual([
      'Expo2026',
    ]);
    expect(data.plans).toBeUndefined();
    expect(data.openTasks).toEqual([
      {
        note: '1.Projects/Expo2026/Workstreams/Marketing.md',
        line: 0,
        text: 'Marketing task',
        state: 'open',
        owner: { project: 'Expo2026', workstream: 'Marketing', area: null },
      },
      {
        note: '1.Projects/Expo2026/Workstreams/Talks.md',
        line: 0,
        text: 'Talk task',
        state: 'open',
        owner: { project: 'Expo2026', workstream: 'Talks', area: null },
        size: 'S',
      },
    ]);
    const ws = await call('planning_overview', {
      project: 'Expo2026',
      workstream: 'Talks',
      scope: 'tasks',
    });
    expect(ws.data.openTasks.map((t: { text: string }) => t.text)).toEqual([
      'Talk task',
    ]);
    expect(
      (await call('planning_overview', { scope: 'tasks' })).res.isError,
    ).toBe(true);
  });
});

describe('habits', () => {
  it("add_habits defines a habit; planning_overview gives a day's due habits and checks, never as overdue", async () => {
    put(
      '1.Projects/Expo2026/Expo2026.md',
      '---\nstatus: in-progress\n---\n# Expo2026\n',
    );
    put(
      '1.Projects/Expo2026/Workstreams/Morning.md',
      '---\nstatus: in-progress\n---\n# Morning\n',
    );
    const preview = await call('add_habits', {
      note: '1.Projects/Expo2026/Workstreams/Morning.md',
      habits: [{ text: 'Up at 6:00', rule: 'every day' }],
    });
    await call('add_habits', {
      note: '1.Projects/Expo2026/Workstreams/Morning.md',
      habits: [{ text: 'Up at 6:00', rule: 'every day' }],
      execute: true,
      versions: preview.data.versions,
    });
    put(
      'Plans/Daily/2026/11-November/2026-11-02.md',
      '## Habits\n\n- [ ] Up at 6:00 [[Morning]]\n',
    );
    const { data } = await call('planning_overview', {
      period: '2026-11-03',
      scope: 'period',
    });
    expect(data.habitsDue).toEqual([
      expect.objectContaining({
        text: 'Up at 6:00',
        rule: 'every day',
        note: '1.Projects/Expo2026/Workstreams/Morning.md',
      }),
    ]);
    expect(data.habitChecks).toEqual([]);
    expect(data.overdue).toEqual([]);
    const all = await call('planning_overview');
    expect(all.data.habits.map((h: { text: string }) => h.text)).toEqual([
      'Up at 6:00',
    ]);
    expect(all.data.openTasks).toEqual([]);
    expect(
      (
        await call('add_habits', {
          note: '1.Projects/Expo2026/Workstreams/Morning.md',
          habits: [{ text: 'Run', rule: 'every 2 days' }],
        })
      ).res.isError,
    ).toBe(true);
  });
});

describe('update_task', () => {
  it('reaches a ticked task with include_closed, and its preview line is the one it takes back', async () => {
    put(
      '1.Projects/Expo2026/Expo2026.md',
      '---\nstatus: in-progress\n---\n# Expo2026\n',
    );
    put(
      '1.Projects/Expo2026/Workstreams/Talks.md',
      '---\nstatus: in-progress\n---\n# Talks\n\n- [x] **Pawel Ostromecki** ✅ 2026-11-01\n',
    );
    expect(
      (
        await call('update_task', {
          updates: [
            {
              note: '1.Projects/Expo2026/Workstreams/Talks.md',
              task: 'Pawel',
              set: { text: '**Paweł Ostromecki**' },
            },
          ],
        })
      ).res.isError,
    ).toBe(true);
    const { data } = await call('update_task', {
      updates: [
        {
          note: '1.Projects/Expo2026/Workstreams/Talks.md',
          task: 'Pawel',
          include_closed: true,
          set: { text: '**Paweł Ostromecki**' },
        },
      ],
    });
    expect(data.edits).toEqual([
      {
        note: '1.Projects/Expo2026/Workstreams/Talks.md',
        line: 2,
        fileLine: 6,
        before: '- [x] **Pawel Ostromecki** ✅ 2026-11-01',
        after: '- [x] **Paweł Ostromecki** ✅ 2026-11-01',
      },
    ]);
    const byLine = await call('update_task', {
      updates: [
        {
          note: '1.Projects/Expo2026/Workstreams/Talks.md',
          line: data.edits[0].line,
          set: { text: '**Paweł Ostromecki**' },
        },
      ],
    });
    expect(byLine.data.edits[0].after).toBe(
      '- [x] **Paweł Ostromecki** ✅ 2026-11-01',
    );
  });
});
