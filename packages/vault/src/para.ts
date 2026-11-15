export const PARA_FOLDERS = {
  inbox: "0.Inbox",
  projects: "1.Projects",
  areas: "2.Areas",
  resources: "3.Resources",
  archive: "4.Archive",
} as const;

export type ParaBucket = keyof typeof PARA_FOLDERS;

export const PARA_BUCKETS = Object.keys(PARA_FOLDERS) as ParaBucket[];

export const RAW_FOLDER = "0.Raw";

export const COACH_ROOT = "Coach";

export const PLANS_ROOT = "Plans";

export interface ParaLocation {

  bucket: ParaBucket | null;

  container: string | null;

  raw: boolean;

  rawKind: string | null;

  rawAuthor: string | null;

  rawWork: string | null;
}

const BY_FOLDER = new Map<string, ParaBucket>(PARA_BUCKETS.map(b => [PARA_FOLDERS[b], b]));

export function classify(relPath: string): ParaLocation {
  const parts = relPath.split("/");
  const bucket = parts.length > 1 ? BY_FOLDER.get(parts[0]) ?? null : null;
  if (!bucket) return { bucket: null, container: null, raw: false, rawKind: null, rawAuthor: null, rawWork: null };
  const container = parts.length > 2 ? parts[1] : null;
  const raw = bucket === "resources" && container === RAW_FOLDER;
  const level = (n: number) => (raw && parts.length > n + 1 ? parts[n] : null);
  return { bucket, container, raw, rawKind: level(2), rawAuthor: level(3), rawWork: level(4) };
}
