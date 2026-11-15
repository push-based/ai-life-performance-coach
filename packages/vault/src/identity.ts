/**
 * Note identity (ADR-KI-0058 Decision 5): a `coach_id` frontmatter key, which with a book
 * index's `read_on` (ADR-KI-0061) and a concept note's `climb` and `group` (ADR-KI-0068) are the only keys the engine ever adds to a note. Inserted by a line-anchored edit (ADR-KI-0006): every other
 * byte of the note, its existing frontmatter included, is left exactly as it was.
 */

import { yamlString } from "./md.js";

/** The note's frontmatter block as raw lines, or null when the note has none. */
function frontmatterBlock(content: string, eol: string): { end: number } | null {
  if (!content.startsWith(`---${eol}`)) return null;
  const close = content.indexOf(`${eol}---`, 3);
  if (close < 0) return null;
  const after = content.slice(close + eol.length + 3);
  if (after !== "" && !after.startsWith(eol)) return null;
  return { end: close };
}

/** True when the raw frontmatter already declares `key`, whatever its value. */
export function declaresKey(content: string, key: string): boolean {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const block = frontmatterBlock(content, eol);
  return !!block && new RegExp(`^${key}\\s*:`, "m").test(content.slice(0, block.end));
}

/**
 * The note's content with `key: "value"` added: as the first key of an existing
 * frontmatter block, or in a new block holding only that key. Throws if the note
 * already declares it.
 */
export function insertKey(content: string, key: string, value: string): string {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  if (declaresKey(content, key)) throw new Error(`note already declares ${key}`);
  const line = `${key}: ${yamlString(value)}`;
  if (frontmatterBlock(content, eol)) return `---${eol}${line}${eol}${content.slice(3 + eol.length)}`;
  return `---${eol}${line}${eol}---${eol}${content}`;
}

/** True when the raw frontmatter already declares a `coach_id` key, whatever its value. */
export const declaresCoachId = (content: string): boolean => declaresKey(content, "coach_id");

/**
 * The note's content with `coach_id` added: as the first key of an existing frontmatter
 * block, or in a new block holding only that key. Throws if the note already declares one.
 */
export const insertCoachId = (content: string, coachId: string): string => insertKey(content, "coach_id", coachId);
