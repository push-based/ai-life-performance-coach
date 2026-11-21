import { yamlString } from './md.js';

function frontmatterBlock(
  content: string,
  eol: string,
): { end: number } | null {
  if (!content.startsWith(`---${eol}`)) return null;
  const close = content.indexOf(`${eol}---`, 3);
  if (close < 0) return null;
  const after = content.slice(close + eol.length + 3);
  if (after !== '' && !after.startsWith(eol)) return null;
  return { end: close };
}

export function declaresKey(content: string, key: string): boolean {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const block = frontmatterBlock(content, eol);
  return (
    !!block && new RegExp(`^${key}\\s*:`, 'm').test(content.slice(0, block.end))
  );
}

export function insertKey(content: string, key: string, value: string): string {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  if (declaresKey(content, key))
    throw new Error(`note already declares ${key}`);
  const line = `${key}: ${yamlString(value)}`;
  if (frontmatterBlock(content, eol))
    return `---${eol}${line}${eol}${content.slice(3 + eol.length)}`;
  return `---${eol}${line}${eol}---${eol}${content}`;
}

export const declaresCoachId = (content: string): boolean =>
  declaresKey(content, 'coach_id');

export const insertCoachId = (content: string, coachId: string): string =>
  insertKey(content, 'coach_id', coachId);
