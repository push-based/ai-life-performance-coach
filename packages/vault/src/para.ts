/**
 * PARA classification by path (ADR-KI-0058 Decision 3). The five folders sit at the
 * vault root and their names are fixed; there is no map. A note anywhere else is out
 * of place and carries no bucket.
 */

export const PARA_FOLDERS = {
  inbox: "0.Inbox",
  projects: "1.Projects",
  areas: "2.Areas",
  resources: "3.Resources",
  archive: "4.Archive",
} as const;

export type ParaBucket = keyof typeof PARA_FOLDERS;

export const PARA_BUCKETS = Object.keys(PARA_FOLDERS) as ParaBucket[];

/** The vault-level folder that holds coach state; never a note location. */
export const COACH_ROOT = "Coach";

export interface ParaLocation {
  /** Null when the note is out of place. */
  bucket: ParaBucket | null;
  /** The project, area, resource or archive folder directly under the bucket, when the note sits in one. */
  container: string | null;
}

const BY_FOLDER = new Map<string, ParaBucket>(PARA_BUCKETS.map(b => [PARA_FOLDERS[b], b]));

/** Classify a vault-relative, forward-slash path. */
export function classify(relPath: string): ParaLocation {
  const parts = relPath.split("/");
  const bucket = parts.length > 1 ? BY_FOLDER.get(parts[0]) ?? null : null;
  if (!bucket) return { bucket: null, container: null };
  return { bucket, container: parts.length > 2 ? parts[1] : null };
}
