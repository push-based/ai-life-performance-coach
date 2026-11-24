import { posix } from '@ai-coach/util-path';
import {
  isPlanTemplatePath,
  lines,
  parseTasks,
  type Task,
  type VaultNote,
} from '@ai-coach/vault-domain';
import { periodOf, type Period } from './plans.js';

type GroupKey = 'folder' | 'filename';

interface TasksQuery {
  state: 'open' | 'done' | null;
  scheduledBefore: string | null;
  scheduledOn: string | null;
  scheduledIn: Period | null;
  doneOn: string | null;
  doneIn: Period | null;
  pathRegex: RegExp | null;
  pathIncludes: string[];
  pathExcludes: string[];
  groupBy: GroupKey[];
}

interface IndexedTask {
  task: Task;
  rawLine: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PATH_REGEX = /^path regex matches \/(.+)\/([gimsuy]*)$/;

function parseQuery(block: string, notePath: string): TasksQuery | null {
  const q: TasksQuery = {
    state: null,
    scheduledBefore: null,
    scheduledOn: null,
    scheduledIn: null,
    doneOn: null,
    doneIn: null,
    pathRegex: null,
    pathIncludes: [],
    pathExcludes: [],
    groupBy: [],
  };
  const rawLines = lines(block)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!rawLines.length) return null;
  for (const line of rawLines) {
    if (line === 'not done') {
      q.state = 'open';
    } else if (line === 'done') {
      q.state = 'done';
    } else if (line.startsWith('scheduled on or before ')) {
      const date = line.slice('scheduled on or before '.length).trim();
      if (!ISO_DATE.test(date)) return null;
      q.scheduledBefore = date;
    } else if (line.startsWith('scheduled on ')) {
      const date = line.slice('scheduled on '.length).trim();
      if (!ISO_DATE.test(date)) return null;
      q.scheduledOn = date;
    } else if (line.startsWith('scheduled in ')) {
      const p = periodOf(line.slice('scheduled in '.length).trim());
      if (!p) return null;
      q.scheduledIn = p;
    } else if (line.startsWith('done on ')) {
      const date = line.slice('done on '.length).trim();
      if (!ISO_DATE.test(date)) return null;
      q.doneOn = date;
      q.state = 'done';
    } else if (line.startsWith('done in ')) {
      const p = periodOf(line.slice('done in '.length).trim());
      if (!p) return null;
      q.doneIn = p;
      q.state = 'done';
    } else if (line.startsWith('path regex matches ')) {
      const m = PATH_REGEX.exec(line);
      if (!m) return null;
      try {
        q.pathRegex = new RegExp(m[1], m[2]);
      } catch {
        return null;
      }
    } else if (line.startsWith('path does not include ')) {
      const target = line
        .slice('path does not include '.length)
        .trim()
        .replaceAll('{{query.file.path}}', notePath);
      if (!target) return null;
      q.pathExcludes.push(target);
    } else if (line.startsWith('path includes ')) {
      const target = line
        .slice('path includes '.length)
        .trim()
        .replaceAll('{{query.file.path}}', notePath);
      if (!target) return null;
      q.pathIncludes.push(target);
    } else if (line === 'group by folder') {
      if (!q.groupBy.includes('folder')) q.groupBy.push('folder');
    } else if (line === 'group by filename') {
      if (!q.groupBy.includes('filename')) q.groupBy.push('filename');
    } else {
      return null;
    }
  }
  return q;
}

function matchesQuery(item: IndexedTask, q: TasksQuery): boolean {
  const { task } = item;
  if (q.state === 'open' && task.state !== 'open') return false;
  if (q.state === 'done' && task.state !== 'done') return false;
  if (
    q.scheduledBefore &&
    (!task.scheduled || task.scheduled > q.scheduledBefore)
  )
    return false;
  if (q.scheduledOn && task.scheduled !== q.scheduledOn) return false;
  if (
    q.scheduledIn &&
    (!task.scheduled ||
      task.scheduled < q.scheduledIn.start ||
      task.scheduled > q.scheduledIn.end)
  )
    return false;
  if (q.doneOn && task.doneOn !== q.doneOn) return false;
  if (
    q.doneIn &&
    (!task.doneOn || task.doneOn < q.doneIn.start || task.doneOn > q.doneIn.end)
  )
    return false;
  if (q.pathRegex && !q.pathRegex.test(task.note)) return false;
  for (const ex of q.pathExcludes) {
    if (task.note.includes(ex)) return false;
  }
  for (const inc of q.pathIncludes) {
    if (!task.note.includes(inc)) return false;
  }
  return true;
}

const noteLink = (path: string) =>
  `[[${path.replace(/\.md$/, '')}|${posix.basename(path, '.md')}]]`;

const folderOf = (path: string) => {
  const dir = posix.dirname(path);
  return dir === '.' ? '' : dir;
};

function renderMatches(items: IndexedTask[], groupBy: GroupKey[]): string {
  if (!items.length) return 'No tasks.';
  const sorted = [...items].sort((a, b) =>
    a.task.note === b.task.note
      ? a.task.line - b.task.line
      : a.task.note < b.task.note
        ? -1
        : 1,
  );
  const byFolder = groupBy.includes('folder');
  const byFile = groupBy.includes('filename');
  const out: string[] = [];

  if (byFolder && byFile) {
    const folders = new Map<string, Map<string, IndexedTask[]>>();
    for (const item of sorted) {
      const f = folderOf(item.task.note);
      let files = folders.get(f);
      if (!files) {
        files = new Map();
        folders.set(f, files);
      }
      const list = files.get(item.task.note) ?? [];
      list.push(item);
      files.set(item.task.note, list);
    }
    for (const [folder, files] of folders) {
      if (folder) out.push(`### ${folder}`, '');
      for (const [path, list] of files) {
        out.push(`#### ${noteLink(path)}`, '');
        for (const item of list) out.push(item.rawLine);
        out.push('');
      }
    }
    return out.join('\n').trimEnd();
  }

  if (byFolder) {
    const folders = new Map<string, IndexedTask[]>();
    for (const item of sorted) {
      const f = folderOf(item.task.note);
      const list = folders.get(f) ?? [];
      list.push(item);
      folders.set(f, list);
    }
    for (const [folder, list] of folders) {
      if (folder) out.push(`### ${folder}`, '');
      for (const item of list)
        out.push(`${item.rawLine} ${noteLink(item.task.note)}`);
      out.push('');
    }
    return out.join('\n').trimEnd();
  }

  if (byFile) {
    const files = new Map<string, IndexedTask[]>();
    for (const item of sorted) {
      const list = files.get(item.task.note) ?? [];
      list.push(item);
      files.set(item.task.note, list);
    }
    for (const [path, list] of files) {
      out.push(`### ${noteLink(path)}`, '');
      for (const item of list) out.push(item.rawLine);
      out.push('');
    }
    return out.join('\n').trimEnd();
  }

  for (const item of sorted)
    out.push(`${item.rawLine} ${noteLink(item.task.note)}`);
  return out.join('\n');
}

export function expandTasksQueries(
  notePath: string,
  body: string,
  notes: VaultNote[],
): string {
  if (!body.includes('```tasks')) return body;
  const indexed: IndexedTask[] = [];
  for (const note of notes) {
    if (isPlanTemplatePath(note.path)) continue;
    const bodyLines = lines(note.body);
    for (const task of parseTasks(note.path, note.body, null)) {
      const rawLine = bodyLines[task.line]?.trim();
      if (rawLine) indexed.push({ task, rawLine });
    }
  }
  return body.replace(/```tasks\r?\n([\s\S]*?)```/g, (full, block: string) => {
    const q = parseQuery(block, notePath);
    if (!q) return full;
    const matched = indexed.filter((item) => matchesQuery(item, q));
    return renderMatches(matched, q.groupBy);
  });
}
