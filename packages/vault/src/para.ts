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

/**
 * Raw resources: full books, articles and other source material kept whole, under
 * `3.Resources/0.Raw/<kind>/` (ADR-KI-0059). They are Resources, so they can be sparred.
 */
export const RAW_FOLDER = "0.Raw";

/** The vault-level folder that holds coach state; never a note location. */
export const COACH_ROOT = "Coach";

export interface ParaLocation {
  /** Null when the note is out of place. */
  bucket: ParaBucket | null;
  /** The project, area, resource or archive folder directly under the bucket, when the note sits in one. */
  container: string | null;
  /** True under `3.Resources/0.Raw/`. */
  raw: boolean;
  /** The kind folder under `0.Raw` (Books, Articles …), when the item sits in one. */
  rawKind: string | null;
}

const BY_FOLDER = new Map<string, ParaBucket>(PARA_BUCKETS.map(b => [PARA_FOLDERS[b], b]));

/** Classify a vault-relative, forward-slash path. */
export function classify(relPath: string): ParaLocation {
  const parts = relPath.split("/");
  const bucket = parts.length > 1 ? BY_FOLDER.get(parts[0]) ?? null : null;
  if (!bucket) return { bucket: null, container: null, raw: false, rawKind: null };
  const container = parts.length > 2 ? parts[1] : null;
  const raw = bucket === "resources" && container === RAW_FOLDER;
  return { bucket, container, raw, rawKind: raw && parts.length > 3 ? parts[2] : null };
}
