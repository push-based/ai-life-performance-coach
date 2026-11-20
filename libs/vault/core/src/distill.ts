import { readFile, writeFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { RAW_TEXT } from './convert.js';
import {
  noteResolver,
  insertKey,
  declaresKey,
  type VaultNote,
} from '@ai-coach/vault-domain';

export const READ_KEY = 'read_on';
export const READING_STAGES = [
  'unread',
  'read',
  'notes',
  'distilling',
  'distilled',
  'concepts',
] as const;
export type ReadingStage = (typeof READING_STAGES)[number];

const BOLD = /(\*\*|__)(?=\S)(?:(?!\n[ \t]*\n)[\s\S])*?\S\1/;
const HIGHLIGHT = /==(?=\S)(?:(?!\n[ \t]*\n)[\s\S])*?\S==/;
const SUMMARY = /^>[ \t]*\[!summary\][^\n]*(?:\n>[^\n]*)*/gim;
const EMPTY_PAGE = '_(no text on this page)_';

export function withoutSummaries(text: string): string {
  return text.replace(SUMMARY, '');
}

export function summaryOf(text: string): string | null {
  for (const m of text.matchAll(SUMMARY)) {
    const lines = m[0].split('\n');
    const body = [
      lines[0].replace(/^>[ \t]*\[!summary\][-+]?/i, ''),
      ...lines.slice(1).map((l) => l.replace(/^>[ \t]?/, '')),
    ]
      .join('\n')
      .trim();
    if (body) return body;
  }
  return null;
}

export type PageMark = 'none' | 'bold' | 'highlight';

export interface PageProgress {
  page: number;

  mark: PageMark;
  summary: boolean;

  empty: boolean;
}

export type ChapterState = 'untouched' | 'in_progress' | 'complete';

export interface ChapterProgress {
  path: string;
  title: string;

  summary: boolean;
  state: ChapterState;
  pages: PageProgress[];
}

function sections(body: string): {
  preamble: string;
  pages: { page: number; text: string }[];
} {
  const parts = body.split(/^(?=## Page \d+[ \t]*$)/m);
  const pages = parts
    .filter((s) => /^## Page \d+/.test(s))
    .map((s) => ({
      page: Number(s.match(/^## Page (\d+)/)![1]),
      text: s.replace(/^## Page \d+[ \t]*\n?/, ''),
    }));
  return {
    preamble: parts.filter((s) => !/^## Page \d+/.test(s)).join(''),
    pages,
  };
}

export function chapterProgress(
  note: Pick<VaultNote, 'path' | 'title' | 'body'>,
): ChapterProgress {
  const { preamble, pages } = sections(note.body);
  const progress: PageProgress[] = pages.map(({ page, text }) => {
    const author = withoutSummaries(text);
    return {
      page,
      mark: HIGHLIGHT.test(author)
        ? 'highlight'
        : BOLD.test(author)
          ? 'bold'
          : 'none',
      summary: summaryOf(text) !== null,
      empty: author.trim() === EMPTY_PAGE,
    };
  });
  const summary = summaryOf(preamble) !== null;
  const touched = progress.some((p) => p.mark !== 'none' || p.summary);
  return {
    path: note.path,
    title: note.title,
    summary,
    state: summary ? 'complete' : touched ? 'in_progress' : 'untouched',
    pages: progress,
  };
}

export interface BookProgress {
  index: string;
  title: string;
  author: string | null;
  stage: ReadingStage;

  steps: {
    readOn: string | null;

    notes: string[];
    chaptersComplete: number;
    chaptersInProgress: number;
    chapters: number;

    concepts: string[];
  };
  chapters: ChapterProgress[];
}

export function sourceOf(
  note: Pick<VaultNote, 'path' | 'raw' | 'rawRole'>,
): string | null {
  if (!note.raw) return null;
  return note.rawRole === 'chapter'
    ? posix.join(posix.dirname(posix.dirname(note.path)), RAW_TEXT)
    : note.path;
}

export interface Citations {
  notes: string[];

  concepts: string[];
}

export function citations(notes: VaultNote[]): Map<string, Citations> {
  const resolver = noteResolver(notes);
  const byPath = new Map(notes.map((n) => [n.path, n]));
  const found = new Map<
    string,
    { notes: Set<string>; concepts: Set<string> }
  >();
  for (const n of notes) {
    if (n.raw) continue;
    for (const l of n.links) {
      const target = resolver.resolve(n.path, l);
      const source = target ? sourceOf(byPath.get(target)!) : null;
      if (!source) continue;
      const entry = found.get(source) ?? {
        notes: new Set<string>(),
        concepts: new Set<string>(),
      };
      (n.concept ? entry.concepts : entry.notes).add(n.path);
      found.set(source, entry);
    }
  }
  return new Map(
    [...found].map(([k, v]) => [
      k,
      { notes: [...v.notes].sort(), concepts: [...v.concepts].sort() },
    ]),
  );
}

export function bookProgress(notes: VaultNote[]): BookProgress[] {
  const indexes = notes.filter((n) => n.rawRole === 'index');
  const bookOf = new Map<string, string>();
  for (const n of notes)
    if (n.rawRole === 'chapter') bookOf.set(n.path, sourceOf(n)!);
  const cited = citations(notes);
  return indexes.map((index) => {
    const chapters = notes
      .filter(
        (n) => n.rawRole === 'chapter' && bookOf.get(n.path) === index.path,
      )
      .map(chapterProgress);
    const readOn =
      typeof index.frontmatter[READ_KEY] === 'string'
        ? (index.frontmatter[READ_KEY] as string)
        : null;
    const { notes: own, concepts } = cited.get(index.path) ?? {
      notes: [],
      concepts: [],
    };
    const complete = chapters.filter((c) => c.state === 'complete').length;
    const inProgress = chapters.filter((c) => c.state === 'in_progress').length;
    const stage: ReadingStage = concepts.length
      ? 'concepts'
      : chapters.length && complete === chapters.length
        ? 'distilled'
        : complete + inProgress
          ? 'distilling'
          : own.length
            ? 'notes'
            : readOn
              ? 'read'
              : 'unread';
    return {
      index: index.path,
      title: index.title,
      author:
        typeof index.frontmatter.author === 'string'
          ? index.frontmatter.author
          : null,
      stage,
      steps: {
        readOn,
        notes: own,
        chaptersComplete: complete,
        chaptersInProgress: inProgress,
        chapters: chapters.length,
        concepts,
      },
      chapters,
    };
  });
}

export interface WritePlan {
  path: string | null;
  errors: string[];

  change: string | null;
  content: string | null;

  before: string | null;
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function planMarkRead(
  root: string,
  notes: VaultNote[],
  book: string,
  date: string,
): Promise<WritePlan> {
  const fail = (e: string): WritePlan => ({
    path: null,
    errors: [e],
    change: null,
    content: null,
    before: null,
  });
  const index = notes.find(
    (n) =>
      n.rawRole === 'index' &&
      (n.path === book || posix.dirname(n.path) === book.replace(/\/+$/, '')),
  );
  if (!index)
    return fail(
      `no converted book at ${book}; give its text.md or its work folder`,
    );
  if (!isDate(date)) return fail(`date ${date} is not YYYY-MM-DD`);
  const content = await readFile(join(root, index.path), 'utf-8');
  if (declaresKey(content, READ_KEY))
    return fail(
      `${index.path} is already marked read on ${String(index.frontmatter[READ_KEY])}`,
    );
  return {
    path: index.path,
    errors: [],
    change: `add ${READ_KEY}: "${date}" to ${index.path}`,
    content: insertKey(content, READ_KEY, date),
    before: content,
  };
}

function callout(text: string): string {
  return [
    '> [!summary]',
    ...text
      .trim()
      .split(/\r?\n/)
      .map((l) => (l.trim() ? `> ${l}` : '>')),
  ].join('\n');
}

export async function planSummary(
  root: string,
  notes: VaultNote[],
  path: string,
  text: string,
  page?: number,
): Promise<WritePlan> {
  const fail = (e: string): WritePlan => ({
    path: null,
    errors: [e],
    change: null,
    content: null,
    before: null,
  });
  const note = notes.find((n) => n.path === path);
  if (!note || note.rawRole !== 'chapter')
    return fail(`${path} is not a chapter of a converted book`);
  if (!text.trim()) return fail('the summary is empty');
  const content = await readFile(join(root, path), 'utf-8');
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const block = callout(text).split('\n').join(eol);
  const progress = chapterProgress(note);
  if (page === undefined) {
    if (progress.summary)
      return fail(`${path} already has a chapter summary; edit it in Obsidian`);
    const first = content.search(/^## Page \d+[ \t]*\r?$/m);
    if (first < 0) return fail(`${path} has no page headings`);
    return {
      path,
      errors: [],
      change: `add the chapter summary to ${path}`,
      content: `${content.slice(0, first)}${block}${eol}${eol}${content.slice(first)}`,
      before: content,
    };
  }
  const at = progress.pages.find((p) => p.page === page);
  if (!at) return fail(`${path} has no page ${page}`);
  if (at.summary)
    return fail(
      `page ${page} of ${path} already has a summary; edit it in Obsidian`,
    );
  const heading = new RegExp(`^## Page ${page}[ \\t]*\\r?$`, 'm').exec(
    content,
  )!;
  const end = heading.index + heading[0].length;
  return {
    path,
    errors: [],
    change: `add a summary to page ${page} of ${path}`,
    content: `${content.slice(0, end)}${eol}${eol}${block}${content.slice(end)}`,
    before: content,
  };
}

export async function executeWrite(
  root: string,
  plan: WritePlan,
): Promise<void> {
  if (plan.errors.length || !plan.path || plan.content === null)
    throw new Error('refusing to write a plan with errors');
  const abs = join(root, plan.path);
  if ((await readFile(abs, 'utf-8')) !== plan.before)
    throw new Error(`${plan.path} changed since the preview; run it again`);
  await writeFile(abs, plan.content);
}

export interface Section {
  text: string;
  start: number;
  end: number;
}

export function pageSection(content: string, page: number): Section | null {
  const heading = new RegExp(`^## Page ${page}[ \\t]*\\r?$`, 'm').exec(content);
  if (!heading) return null;
  const from = heading.index + heading[0].length;
  const next = content.slice(from).search(/^## Page \d+[ \t]*\r?$/m);
  const stop = next < 0 ? content.length : from + next;
  const raw = content.slice(from, stop);
  const lead = (raw.match(/^(?:\r?\n)*/) as RegExpMatchArray)[0].length;
  const text = raw.slice(lead).replace(/\s+$/, '');
  return { text, start: from + lead, end: from + lead + text.length };
}

export type MarkOp = 'bold' | 'highlight' | 'clear';

export interface MarkChar {
  ch: string;
  src: number;
  b: boolean;
  h: boolean;
}
export type MarkLine =
  { verbatim: string } | { prefix: string; chars: MarkChar[] };

const MARKER = /^(\*\*|__|==)/;

export function parseMarks(text: string): MarkLine[] {
  const out: MarkLine[] = [];
  let b = false,
    h = false,
    at = 0;
  for (const line of text.split('\n')) {
    const start = at;
    at += line.length + 1;
    if (/^>/.test(line) || !line.trim()) {
      out.push({ verbatim: line });
      b = h = false;
      continue;
    }
    const prefix = line.startsWith('\\') ? '\\' : '';
    const chars: MarkChar[] = [];
    for (let i = prefix.length; i < line.length;) {
      const m = MARKER.exec(line.slice(i));
      if (m) {
        if (m[1] === '==') h = !h;
        else b = !b;
        i += 2;
        continue;
      }
      chars.push({ ch: line[i], src: start + i, b, h });
      i++;
    }
    out.push({ prefix, chars });
  }
  return out;
}

function runs(
  chars: MarkChar[],
  on: (c: MarkChar) => boolean,
  cut: (i: number) => boolean = () => false,
): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  while (i < chars.length) {
    if (!on(chars[i])) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < chars.length && on(chars[j]) && !cut(j)) j++;
    let a = i,
      z = j;
    while (a < z && /\s/.test(chars[a].ch)) a++;
    while (z > a && /\s/.test(chars[z - 1].ch)) z--;
    if (z > a) out.push([a, z]);
    i = j;
  }
  return out;
}

function emitParagraph(lines: { prefix: string; chars: MarkChar[] }[]): string {
  const chars: (MarkChar & { prefix?: string })[] = [];
  lines.forEach((l, k) => {
    if (k > 0)
      chars.push({ ch: '\n', src: -1, b: false, h: false, prefix: l.prefix });
    chars.push(...l.chars);
  });
  for (let i = 0; i < chars.length; i++) {
    if (chars[i].prefix === undefined) continue;
    const prev = chars[i - 1],
      next = chars[i + 1];
    chars[i].b = !!prev?.b && !!next?.b;
    chars[i].h = !!prev?.h && !!next?.h;
  }
  const bold = runs(chars, (c) => c.b);
  const boldStart = new Set(bold.map((r) => r[0])),
    boldEnd = new Set(bold.map((r) => r[1]));
  const high = runs(
    chars,
    (c) => c.h,
    (i) => boldStart.has(i) || boldEnd.has(i),
  );
  const open = new Map<number, string>(),
    close = new Map<number, string>();
  for (const [a, z] of bold) {
    open.set(a, '**');
    close.set(z, '**');
  }
  for (const [a, z] of high) {
    open.set(a, (open.get(a) ?? '') + '==');
    close.set(z, '==' + (close.get(z) ?? ''));
  }
  let s = lines[0]?.prefix ?? '';
  for (let i = 0; i <= chars.length; i++) {
    s += close.get(i) ?? '';
    if (i === chars.length) break;
    const c = chars[i];
    s += c.prefix !== undefined ? `\n${c.prefix}` : (open.get(i) ?? '') + c.ch;
  }
  return s;
}

export function applyMark(
  text: string,
  start: number,
  end: number,
  op: MarkOp,
): string {
  const lines = parseMarks(text);
  for (const l of lines) {
    if ('verbatim' in l) continue;
    for (const c of l.chars) {
      if (c.src < start || c.src >= end) continue;
      if (op === 'bold') c.b = true;
      else if (op === 'highlight') c.h = true;
      else c.b = c.h = false;
    }
  }
  const out: string[] = [];
  let para: { prefix: string; chars: MarkChar[] }[] = [];
  const flush = () => {
    if (para.length) out.push(emitParagraph(para));
    para = [];
  };
  for (const l of lines) {
    if ('verbatim' in l) {
      flush();
      out.push(l.verbatim);
    } else para.push(l);
  }
  flush();
  return out.join('\n');
}

const SUMMARY_ONE = /^>[ \t]*\[!summary\][^\n]*(?:\n>[^\n]*)*/im;

function withSummary(region: string, summary: string): string {
  const text = summary.trim();
  const m = SUMMARY_ONE.exec(region);
  if (m) {
    if (!text)
      return (
        region.slice(0, m.index) +
        region.slice(m.index + m[0].length).replace(/^\n+/, '')
      ).replace(/\n{3,}/g, '\n\n');
    return (
      region.slice(0, m.index) +
      callout(text) +
      region.slice(m.index + m[0].length)
    );
  }
  return text ? `${callout(text)}\n\n${region}` : region;
}

export type EditResult =
  | { ok: true; text: string; content: string }
  | { ok: false; status: 400 | 404 | 409; error: string; text?: string };

export function editPageContent(
  content: string,
  page: number,
  base: string | undefined,
  edit: (text: string) => string,
): EditResult {
  const section = pageSection(content, page);
  if (!section) return { ok: false, status: 404, error: `no page ${page}` };
  if (base !== undefined && base !== section.text)
    return {
      ok: false,
      status: 409,
      error: 'the page changed since it was shown; showing it again',
      text: section.text,
    };
  const text = edit(section.text);
  return {
    ok: true,
    text,
    content:
      content.slice(0, section.start) + text + content.slice(section.end),
  };
}

export function chapterSummaryOf(content: string): string | null {
  const first = content.search(/^## Page \d+[ \t]*\r?$/m);
  return summaryOf(first < 0 ? content : content.slice(0, first));
}

export function setChapterSummary(
  content: string,
  summary: string,
): EditResult {
  const first = content.search(/^## Page \d+[ \t]*\r?$/m);
  if (first < 0)
    return { ok: false, status: 404, error: 'the note has no page headings' };
  const fm = /^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/.exec(content);
  const bodyStart = fm ? fm[0].length : 0;
  const head = content.slice(bodyStart, first);
  const m = SUMMARY_ONE.exec(head);
  const text = summary.trim();
  let next: string;
  if (m) next = withSummary(head, text);
  else if (text) next = `${head.replace(/\n*$/, '\n\n')}${callout(text)}\n\n`;
  else
    return {
      ok: false,
      status: 400,
      error: 'there is no chapter summary to remove',
    };
  return {
    ok: true,
    text: text,
    content: content.slice(0, bodyStart) + next + content.slice(first),
  };
}

export function setPageSummary(
  content: string,
  page: number,
  summary: string,
  base?: string,
): EditResult {
  return editPageContent(content, page, base, (text) =>
    withSummary(text, summary),
  );
}
