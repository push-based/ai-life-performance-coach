/**
 * The vault's link graph, built in memory from a scan. Phase 1 returns it to the
 * caller and writes nothing; `Coach/graph.json` and mastery rings arrive with the view
 * server (ADR-KI-0058 Decision 11).
 */

import { LinkResolver } from "./links.js";
import type { ParaBucket } from "./para.js";
import type { VaultNote } from "./scan.js";

export interface VaultGraphNode {
  id: string;
  title: string;
  bucket: ParaBucket | null;
  container: string | null;
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
  /** Links whose target matches no note, by linking note. */
  unresolved: { source: string; target: string }[];
}

export function buildVaultGraph(notes: VaultNote[]): VaultGraph {
  const resolver = new LinkResolver(notes.map(n => n.path));
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
    nodes: notes.map(n => ({ id: n.path, title: n.title, bucket: n.bucket, container: n.container, coachId: n.coachId })),
    edges,
    unresolved,
  };
}
