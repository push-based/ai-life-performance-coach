import { posix } from "node:path";
import { LinkResolver } from "./links.js";
import type { ParaBucket } from "./para.js";
import type { VaultNote } from "./scan.js";

export interface VaultGraphNode {
  id: string;
  title: string;
  bucket: ParaBucket | null;
  container: string | null;
  raw: boolean;
  coachId: string | null;
}

export interface VaultGraphEdge {
  source: string;
  target: string;
  kind: "wikilink" | "markdown";
}

export interface VaultGraph {
  nodes: VaultGraphNode[];
  edges: VaultGraphEdge[];

  unresolved: { source: string; target: string }[];
}

function aliasesOf(n: VaultNote): string[] {
  const a = n.frontmatter.aliases;
  return (Array.isArray(a) ? a : [a]).filter((x): x is string => typeof x === "string" && x.trim() !== "");
}

export function noteResolver(notes: VaultNote[], rename?: { from: string; to: string }): LinkResolver {
  const at = (p: string) => (rename && p === rename.from ? rename.to : p);
  return new LinkResolver(
    notes.map(n => at(n.path)),
    notes.filter(n => n.convertedFrom).map(n => [at(n.path), posix.join(posix.dirname(at(n.path)), n.convertedFrom!), n.pageRange ?? undefined]),
    notes.flatMap(n => aliasesOf(n).map(a => [at(n.path), a] as [string, string])),
  );
}

export function buildVaultGraph(notes: VaultNote[]): VaultGraph {
  const resolver = noteResolver(notes);
  const edges: VaultGraphEdge[] = [];
  const unresolved: VaultGraph["unresolved"] = [];
  const seen = new Set<string>();

  for (const n of notes) {
    for (const link of n.links) {
      const target = resolver.resolve(n.path, link);
      if (!target) {
        unresolved.push({ source: n.path, target: link.target });
        continue;
      }
      const key = `${n.path}\u0000${target}`;
      if (target === n.path || seen.has(key)) continue;
      seen.add(key);
      edges.push({ source: n.path, target, kind: link.kind });
    }
  }

  return {
    nodes: notes.map(n => ({ id: n.path, title: n.title, bucket: n.bucket, container: n.container, raw: n.raw, coachId: n.coachId })),
    edges,
    unresolved,
  };
}
