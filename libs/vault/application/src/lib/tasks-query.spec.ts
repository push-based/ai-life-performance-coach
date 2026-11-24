import type { VaultNote } from '@ai-coach/vault-domain';
import { expandTasksQueries } from './tasks-query.js';

const note = (path: string, body: string): VaultNote => ({
  path,
  title: path.split('/').pop()!.replace(/\.md$/, ''),
  bucket: null,
  container: null,
  frontmatter: {},
  body,
  links: [],
  coachId: null,
  raw: false,
  rawKind: null,
  rawAuthor: null,
  rawWork: null,
  convertedFrom: null,
  rawRole: null,
  concept: false,
  pageRange: null,
});

describe('expandTasksQueries', () => {
  it('expands daily plan Projects, Areas, Earlier days and Done tasks blocks', () => {
    const dayPath = 'Plans/Daily/2026/11-November/2026-11-26.md';
    const dayBody = [
      '# 2026-11-26',
      '',
      '## Projects',
      '',
      '```tasks',
      'not done',
      'scheduled on or before 2026-11-26',
      'path regex matches /^1\\.Projects\\//',
      'group by folder',
      'group by filename',
      '```',
      '',
      '## Areas',
      '',
      '```tasks',
      'not done',
      'scheduled on or before 2026-11-26',
      'path regex matches /^2\\.Areas\\//',
      'group by filename',
      '```',
      '',
      '## Ad-hoc',
      '',
      '- [ ] WAWTech conference (Day 1) [[Work]] #L ⏳ 2026-11-26',
      '',
      '### Earlier days',
      '',
      '```tasks',
      'not done',
      'scheduled on or before 2026-11-26',
      'path regex matches /^Plans\\//',
      'path does not include {{query.file.path}}',
      '```',
      '',
      '## Done',
      '',
      '```tasks',
      'done on 2026-11-26',
      'group by folder',
      'group by filename',
      '```',
    ].join('\n');

    const notes = [
      note(dayPath, dayBody),
      note(
        '1.Projects/DevFest2026/Workstreams/Talks.md',
        [
          '- [ ] Publish speaker recap #S ⏳ 2026-11-26',
          '- [ ] Future task #S ⏳ 2026-11-29',
          '- [x] Sent slides #S ⏳ 2026-11-26 ✅ 2026-11-26',
        ].join('\n'),
      ),
      note(
        '2.Areas/Google Developer Experts.md',
        '- [ ] Log recent GDE activities #M ⏳ 2026-11-24\n',
      ),
      note(
        'Plans/Daily/2026/11-November/2026-11-23.md',
        '- [ ] Attend meetup [[GDG Wrocław]] #M ⏳ 2026-11-23\n',
      ),
      note(
        'Plans/Templates/Daily.md',
        '- [ ] Template placeholder ⏳ 2026-11-01\n',
      ),
    ];

    const expanded = expandTasksQueries(dayPath, dayBody, notes);
    expect(expanded).not.toContain('```tasks');
    expect(expanded).toContain('### 1.Projects/DevFest2026/Workstreams');
    expect(expanded).toContain(
      '#### [[1.Projects/DevFest2026/Workstreams/Talks|Talks]]',
    );
    expect(expanded).toContain('- [ ] Publish speaker recap #S ⏳ 2026-11-26');
    expect(expanded).not.toContain('Future task');
    expect(expanded).toContain(
      '### [[2.Areas/Google Developer Experts|Google Developer Experts]]',
    );
    expect(expanded).toContain(
      '- [ ] Log recent GDE activities #M ⏳ 2026-11-24',
    );
    expect(expanded).toContain(
      '- [ ] Attend meetup [[GDG Wrocław]] #M ⏳ 2026-11-23 [[Plans/Daily/2026/11-November/2026-11-23|2026-11-23]]',
    );
    expect(expanded).not.toContain('Template placeholder');
    expect(expanded).toContain(
      '- [x] Sent slides #S ⏳ 2026-11-26 ✅ 2026-11-26',
    );
  });

  it('expands weekly scheduled in queries and shows No tasks when empty', () => {
    const weekPath = 'Plans/Weekly/2026-W48.md';
    const weekBody = [
      '## This week',
      '',
      '```tasks',
      'not done',
      'scheduled in 2026-W48',
      'group by folder',
      '```',
      '',
      '## Done',
      '',
      '```tasks',
      'done in 2026-W48',
      'group by folder',
      '```',
    ].join('\n');

    const notes = [
      note(weekPath, weekBody),
      note(
        '2.Areas/Work.md',
        '- [ ] Laptop repair #S ⏳ 2026-11-25\n- [ ] Next week #S ⏳ 2026-12-01\n',
      ),
    ];

    const expanded = expandTasksQueries(weekPath, weekBody, notes);
    expect(expanded).toContain('### 2.Areas');
    expect(expanded).toContain(
      '- [ ] Laptop repair #S ⏳ 2026-11-25 [[2.Areas/Work|Work]]',
    );
    expect(expanded).not.toContain('Next week');
    expect(expanded).toContain('No tasks.');
  });

  it('leaves blocks with unknown directives untouched', () => {
    const body = '```tasks\nnot done\nsort by priority\n```';
    expect(expandTasksQueries('Plans/Daily/2026-11-26.md', body, [])).toBe(
      body,
    );
  });
});
