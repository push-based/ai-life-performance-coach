import { createFsNoteStore } from '../fs-store.js';
import { parseMatter } from '../markdown.js';
import * as scan from '../scan.js';
import * as sessions from '../sessions.js';
import * as search from '../search.js';
import { rankWithFlexSearch } from '../flexsearch-ranker.js';

export const storeAt = (dir: string) => createFsNoteStore(dir);
export const snapshot = (dir: string) =>
  scan.snapshot(storeAt(dir), parseMatter);
export const loadTree = (dir: string) =>
  scan.loadTree(storeAt(dir), parseMatter);
export const scanVault = (dir: string) =>
  scan.scanVault(storeAt(dir), parseMatter);
export const loadSessions = (dir: string) =>
  sessions.loadSessions(storeAt(dir));
export { composeVault as createVault } from '../compose.js';
export const searchNotes = (
  notes: Parameters<typeof search.searchNotes>[1],
  query: string,
  opts?: Parameters<typeof search.searchNotes>[3],
) => search.searchNotes(rankWithFlexSearch, notes, query, opts);
