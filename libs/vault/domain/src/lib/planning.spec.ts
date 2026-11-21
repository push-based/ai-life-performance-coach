import { classify } from './para.js';
import { noteFromContent, type VaultNote } from './note.js';
import type { FrontmatterParser } from './md.js';
import type { VaultListing } from './listing.js';
import { isPlanPath, isWorkstreamPath, planning } from './planning.js';

const parse: FrontmatterParser = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, content };
  const data = Object.fromEntries(
    match[1]
      .split('\n')
      .map((line) => line.split(/:\s*/))
      .map(([key, value]) => [key, value]),
  );
  return { data, content: match[2] };
};

const note = (path: string, content: string): VaultNote =>
  noteFromContent(path, content, parse);

function listingOf(paths: string[]): VaultListing {
  const children = (dir: string) =>
    paths
      .filter((p) => p.startsWith(`${dir}/`))
      .map((p) => p.slice(dir.length + 1).split('/'));
  return {
    dirsIn: (dir) =>
      [
        ...new Set(
          children(dir)
            .filter((parts) => parts.length > 1)
            .map(([name]) => name),
        ),
      ].sort(),
    mdIn: (dir) =>
      children(dir)
        .filter((parts) => parts.length === 1 && parts[0].endsWith('.md'))
        .map(([name]) => name.slice(0, -3))
        .sort(),
  };
}

describe('classify', () => {
  it('places a note in its PARA bucket and container', () => {
    expect(classify('1.Projects/Expo/Expo.md')).toMatchObject({
      bucket: 'projects',
      container: 'Expo',
      raw: false,
    });
    expect(classify('Loose.md').bucket).toBeNull();
  });
});

describe('isWorkstreamPath', () => {
  it('matches notes inside a project or archived project Workstreams folder', () => {
    expect(isWorkstreamPath('1.Projects/Expo/Workstreams/Talks.md')).toBe(true);
    expect(
      isWorkstreamPath('1.Projects/Expo/Workstreams/Marketing/Marketing.md'),
    ).toBe(true);
    expect(
      isWorkstreamPath('1.Projects/Expo/Workstreams/Marketing/Merch/Badges.md'),
    ).toBe(true);
    expect(isWorkstreamPath('4.Archive/Old/Workstreams/Task.md')).toBe(true);
    expect(isWorkstreamPath('1.Projects/Expo/Expo.md')).toBe(false);
    expect(
      isWorkstreamPath('1.Projects/Expo/Intermediate Packets/Packet.md'),
    ).toBe(false);
    expect(isWorkstreamPath('3.Resources/Workstreams/Other.md')).toBe(false);
  });
});

describe('isPlanPath', () => {
  it('matches notes under Plans/ and excludes loose root notes', () => {
    expect(isPlanPath('Plans/Weekly/2026-W46.md')).toBe(true);
    expect(isPlanPath('Plans/Daily/2026/11-November/2026-11-01.md')).toBe(true);
    expect(isPlanPath('Plans/Templates/Daily.md')).toBe(true);
    expect(isPlanPath('Loose.md')).toBe(false);
    expect(isPlanPath('1.Projects/Expo/Expo.md')).toBe(false);
  });
});

describe('noteFromContent', () => {
  it('reads the title, frontmatter and links through the given parser', () => {
    const n = note(
      '3.Resources/Book/Idea.md',
      '---\ncoach_id: abc\ntype: concept\n---\n# The idea\nSee [[Other]].\n',
    );
    expect(n).toMatchObject({
      title: 'The idea',
      coachId: 'abc',
      concept: true,
      bucket: 'resources',
      container: 'Book',
    });
    expect(n.links.map((l) => l.target)).toEqual(['Other']);
  });

  it('falls back to the file name when there is no heading', () => {
    expect(note('0.Inbox/Plain.md', 'just text').title).toBe('Plain');
  });
});

describe('planning', () => {
  it('reads projects, workstreams and areas from the listing, not only from notes', () => {
    const notes = [
      note(
        '1.Projects/Expo/Expo.md',
        '---\nstatus: in-progress\ndeadline: 2026-11-22\n---\n- [ ] Book the venue\n',
      ),
      note('1.Projects/Expo/Workstreams/Talks.md', '---\nstatus: todo\n---\n'),
      note('2.Areas/Health/Health.md', '- [ ] Walk\n'),
    ];
    const listing = listingOf([
      ...notes.map((n) => n.path),
      '1.Projects/Empty/.keep',
    ]);
    const p = planning(listing, notes);
    expect(p.projects.map((x) => [x.name, x.note, x.status])).toEqual([
      ['Empty', null, null],
      ['Expo', '1.Projects/Expo/Expo.md', 'in-progress'],
    ]);
    expect(p.projects[1].workstreams.map((w) => [w.name, w.status])).toEqual([
      ['Talks', 'todo'],
    ]);
    expect(p.areas.map((a) => a.name)).toEqual(['Health']);
    expect(p.tasks.map((t) => t.text)).toEqual(['Book the venue', 'Walk']);
    expect(p.warnings).toContain(
      '1.Projects/Empty: no project note 1.Projects/Empty/Empty.md',
    );
  });
});
