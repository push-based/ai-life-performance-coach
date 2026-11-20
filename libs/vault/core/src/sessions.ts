import { readdir, readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';
import {
  SESSIONS_DIR,
  bySessionDate,
  parseSession,
  type InvalidSession,
  type SessionRecord,
} from '@ai-coach/vault-domain';

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
