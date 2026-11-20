import { posix } from '@ai-coach/util-path';
import {
  SESSIONS_DIR,
  bySessionDate,
  parseSession,
  type InvalidSession,
  type SessionRecord,
} from '@ai-coach/vault-domain';
import type { NoteStore } from './note-store.js';

export async function loadSessions(
  store: NoteStore,
): Promise<{ sessions: SessionRecord[]; invalid: InvalidSession[] }> {
  const names = (await store.list(SESSIONS_DIR))
    .filter((e) => e.kind === 'file' && e.name.endsWith('.md'))
    .map((e) => e.name)
    .sort();
  const sessions: SessionRecord[] = [];
  const invalid: InvalidSession[] = [];
  for (const name of names) {
    const file = posix.join(SESSIONS_DIR, name);
    try {
      sessions.push(parseSession(await store.readText(file)));
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
