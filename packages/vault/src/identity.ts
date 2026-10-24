/**
 * Note identity (ADR-KI-0058 Decision 5): a `coach_id` frontmatter key, the only key the
 * engine ever adds to a note. Inserted by a line-anchored edit (ADR-KI-0006): every other
 * byte of the note, its existing frontmatter included, is left exactly as it was.
 */

import { yamlString } from "@docs-mcp/core/kernel/md/yaml.js";

/** The note's frontmatter block as raw lines, or null when the note has none. */
function frontmatterBlock(content: string, eol: string): { end: number } | null {
  if (!content.startsWith(`---${eol}`)) return null;
  const close = content.indexOf(`${eol}---`, 3);
  if (close < 0) return null;
  const after = content.slice(close + eol.length + 3);
  if (after !== "" && !after.startsWith(eol)) return null;
  return { end: close };
}

/** True when the raw frontmatter already declares a `coach_id` key, whatever its value. */
export function declaresCoachId(content: string): boolean {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const block = frontmatterBlock(content, eol);
  return !!block && /^coach_id\s*:/m.test(content.slice(0, block.end));
}

/**
 * The note's content with `coach_id` added: as the first key of an existing frontmatter
 * block, or in a new block holding only that key. Throws if the note already declares one.
 */
export function insertCoachId(content: string, coachId: string): string {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  if (declaresCoachId(content)) throw new Error("note already declares coach_id");
  const line = `coach_id: ${yamlString(coachId)}`;
  if (frontmatterBlock(content, eol)) return `---${eol}${line}${eol}${content.slice(3 + eol.length)}`;
  return `---${eol}${line}${eol}---${eol}${content}`;
}
