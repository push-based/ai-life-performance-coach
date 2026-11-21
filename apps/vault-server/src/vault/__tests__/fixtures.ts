import { createFsNoteStore } from '@ai-coach/vault-adapter-fs';
import { parseMatter } from '@ai-coach/vault-adapter-markdown';
import * as scan from '@ai-coach/vault-application';
import * as sessions from '@ai-coach/vault-application';
import * as search from '@ai-coach/vault-application';
import { rankWithFlexSearch } from '@ai-coach/vault-adapter-search';

export const storeAt = (dir: string) => createFsNoteStore(dir);
export const snapshot = (dir: string) =>
  scan.snapshot(storeAt(dir), parseMatter);
export const loadTree = (dir: string) =>
  scan.loadTree(storeAt(dir), parseMatter);
export const scanVault = (dir: string) =>
  scan.scanVault(storeAt(dir), parseMatter);
export const loadSessions = (dir: string) =>
  sessions.loadSessions(storeAt(dir));
export { composeVault as createVault } from '../../compose.js';
export const searchNotes = (
  notes: Parameters<typeof search.searchNotes>[1],
  query: string,
  opts?: Parameters<typeof search.searchNotes>[3],
) => search.searchNotes(rankWithFlexSearch, notes, query, opts);
