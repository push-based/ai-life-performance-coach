import { createFsNoteStore } from '../fs-store.js';
import { parseMatter } from '../markdown.js';
import * as scan from '../scan.js';
import * as sessions from '../sessions.js';

export const storeAt = (dir: string) => createFsNoteStore(dir);
export const snapshot = (dir: string) =>
  scan.snapshot(storeAt(dir), parseMatter);
export const loadTree = (dir: string) =>
  scan.loadTree(storeAt(dir), parseMatter);
export const scanVault = (dir: string) =>
  scan.scanVault(storeAt(dir), parseMatter);
export const loadSessions = (dir: string) =>
  sessions.loadSessions(storeAt(dir));
