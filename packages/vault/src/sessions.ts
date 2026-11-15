import { readdir, readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { yamlString } from './md.js';
import { COACH_ROOT } from './para.js';

export const SESSIONS_DIR = posix.join(COACH_ROOT, 'sessions');

export type Tier = 1 | 2;
export type Verdict = 'pass' | 'fail';

export type ItemVerdict = Verdict | 'ungraded';

export const SESSION_KINDS = [
  'spar',
  'generate',
  'elaborate',
  'teach',
] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export type AssertionMark = 'got it' | 'wrong' | 'missed';

export interface GenerateDetail {
  attempted_at: string;
  revealed_at: string;

  idk: boolean;

  marks: { assertion: string; mark: AssertionMark; correction?: string }[];
}

export const ELABORATION_KINDS = ['why', 'connect', 'apply'] as const;
export type ElaborationKind = (typeof ELABORATION_KINDS)[number];

export interface Elaboration {
  kind: ElaborationKind;
  question: string;
  answer: string;

  links: string[];

  named?: string;
}

export interface TeachTurn {
  role: 'learner' | 'student';
  text: string;
}

export interface TeachDetail {
  turns: TeachTurn[];

  misconception: { assertion: number; text: string };
  misconception_corrected: boolean;

  unresolved_terms: string[];
}

export interface SessionItem {
  coach_id: string | null;

  note_path: string;
  title: string;
  challenge: string;
  answer: string;
  verdict: ItemVerdict;
  gaps: string[];

  next_review: string | null;
  generate?: GenerateDetail;
  elaborate?: { answers: Elaboration[] };
  teach?: TeachDetail;
}

export interface SessionRecord {
  version: 1 | 2;

  kind: SessionKind;
  session_id: string;
  tier: Tier;

  date: string;

  recorded_at: string;
  items: SessionItem[];
}

export interface InvalidSession {
  file: string;
  error: string;
}

const FENCE = /^```json coach-session\n([\s\S]*?)\n```$/gm;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isDate = (s: unknown): s is string =>
  typeof s === 'string' &&
  DATE.test(s) &&
  !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export function sessionPath(id: string): string {
  return posix.join(SESSIONS_DIR, `${id}.md`);
}

function quote(text: string): string {
  return text
    .split('\n')
    .map((l) => (l ? `> ${l}` : '>'))
    .join('\n');
}

export function renderSession(r: SessionRecord): string {
  const lines = [
    '---',
    `session_id: ${yamlString(r.session_id)}`,
    ...(r.version === 2 ? [`kind: ${yamlString(r.kind)}`] : []),
    `tier: ${r.tier}`,
    `date: ${yamlString(r.date)}`,
    `recorded_at: ${yamlString(r.recorded_at)}`,
    `notes: [${r.items
      .filter((i) => i.coach_id)
      .map((i) => yamlString(i.coach_id!))
      .join(', ')}]`,
    '---',
    '',
    `# ${HEADINGS[r.kind]}, Tier ${r.tier}, ${r.date}`,
    '',
    'Written by the coach. Edits to this file are not read back; the record is the block at the end.',
  ];
  for (const i of r.items) {
    lines.push(
      '',
      `## ${i.title}`,
      '',
      `**Verdict:** ${i.verdict} · **Next review:** ${i.next_review ?? 'none'} · **Note:** ${i.note_path}`,
      '',
      '**Challenge**',
      '',
      quote(i.challenge),
      '',
      '**Answer**',
      '',
      quote(i.answer),
    );
    if (i.gaps.length)
      lines.push('', '**Gaps**', '', ...i.gaps.map((g) => `- ${g}`));
  }
  lines.push(
    '',
    '```json coach-session',
    JSON.stringify(r, null, 2),
    '```',
    '',
  );
  return lines.join('\n');
}

const HEADINGS: Record<SessionKind, string> = {
  spar: 'Sparring session',
  generate: 'Generate attempt',
  elaborate: 'Elaboration',
  teach: 'Teach session',
};

function checkRecord(v: unknown): SessionRecord {
  const r = v as SessionRecord;
  if (!r || typeof r !== 'object') throw new Error('record is not an object');
  if (r.version !== 1 && r.version !== 2)
    throw new Error(`unsupported version ${String(r.version)}`);
  if (r.version === 1) {
    if ('kind' in r && r.kind !== 'spar')
      throw new Error('a version 1 record is a sparring session');
    r.kind = 'spar';
  } else if (!(SESSION_KINDS as readonly string[]).includes(r.kind))
    throw new Error(`kind must be one of ${SESSION_KINDS.join(', ')}`);
  if (typeof r.session_id !== 'string' || !r.session_id)
    throw new Error('session_id missing');
  if (r.tier !== 1 && r.tier !== 2) throw new Error('tier must be 1 or 2');
  if (!isDate(r.date)) throw new Error('date must be YYYY-MM-DD');
  if (
    typeof r.recorded_at !== 'string' ||
    Number.isNaN(Date.parse(r.recorded_at))
  )
    throw new Error('recorded_at must be an ISO timestamp');
  if (!Array.isArray(r.items) || r.items.length === 0)
    throw new Error('items must be a non-empty array');
  r.items.forEach((i, n) => {
    const at = `items[${n}]`;
    for (const k of ['note_path', 'title', 'challenge', 'answer'] as const) {
      if (typeof i?.[k] !== 'string')
        throw new Error(`${at}.${k} must be a string`);
    }
    const graded = r.kind === 'spar' || r.kind === 'teach';
    if (
      typeof i.coach_id !== 'string' &&
      !(r.kind === 'generate' && i.coach_id === null)
    )
      throw new Error(`${at}.coach_id must be a string`);
    if (
      graded
        ? i.verdict !== 'pass' && i.verdict !== 'fail'
        : i.verdict !== 'ungraded'
    )
      throw new Error(
        `${at}.verdict must be ${graded ? 'pass or fail' : 'ungraded'}`,
      );
    if (!Array.isArray(i.gaps) || i.gaps.some((g) => typeof g !== 'string'))
      throw new Error(`${at}.gaps must be a string array`);
    if (
      graded
        ? !isDate(i.next_review)
        : i.next_review !== null && !isDate(i.next_review)
    )
      throw new Error(
        `${at}.next_review must be YYYY-MM-DD${graded ? '' : ' or null'}`,
      );
    if (r.kind !== 'spar' && !i[r.kind])
      throw new Error(`${at}.${r.kind} is missing`);
  });
  return r;
}

export function parseSession(content: string): SessionRecord {
  const fences = [...content.replace(/\r\n/g, '\n').matchAll(FENCE)];
  if (!fences.length) throw new Error('no json coach-session block');
  let parsed: unknown;
  try {
    parsed = JSON.parse(fences[fences.length - 1][1]);
  } catch (err) {
    throw new Error(
      `coach-session block is not JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return checkRecord(parsed);
}

export function bySessionDate(a: SessionRecord, b: SessionRecord): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.recorded_at !== b.recorded_at)
    return a.recorded_at < b.recorded_at ? -1 : 1;
  return a.session_id < b.session_id ? -1 : a.session_id > b.session_id ? 1 : 0;
}

export async function loadSessions(
  root: string,
): Promise<{ sessions: SessionRecord[]; invalid: InvalidSession[] }> {
  let names: string[];
  try {
    names = (await readdir(join(root, SESSIONS_DIR), { withFileTypes: true }))
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name)
      .sort();
  } catch {
    return { sessions: [], invalid: [] };
  }
  const sessions: SessionRecord[] = [];
  const invalid: InvalidSession[] = [];
  for (const name of names) {
    const file = posix.join(SESSIONS_DIR, name);
    try {
      sessions.push(parseSession(await readFile(join(root, file), 'utf-8')));
    } catch (err) {
      invalid.push({
        file,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  sessions.sort(bySessionDate);
  return { sessions, invalid };
}
