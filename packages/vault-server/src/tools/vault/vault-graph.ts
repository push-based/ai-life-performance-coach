import { z } from 'zod';
import { defineTool, type ToolDef } from '../../tool-types.js';
import type { Vault } from '@ai-coach/vault/vault.js';
import { PARA_BUCKETS } from '@ai-coach/vault/para.js';
import { buildVaultGraph } from '@ai-coach/vault/graph.js';
import { json } from './json.js';

export function vaultGraphTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'vault_graph',
    description:
      "The vault's link graph: one node per note with its PARA bucket, container and mastery, one edge per resolved wikilink or relative markdown link, and the links that resolve to no note. Optionally keep only nodes in one PARA bucket and the edges between them. Built in memory; nothing is written.",
    annotations: { readOnlyHint: true, idempotentHint: true },
    schema: {
      bucket: z
        .enum(PARA_BUCKETS)
        .optional()
        .describe('Only nodes in this PARA bucket'),
    },
    handler: async (args) => {
      const { notes } = await vault.notesWithHistory();
      const mastery = new Map(notes.map((n) => [n.path, n.history.mastery]));
      const built = buildVaultGraph(notes);
      const graph = {
        ...built,
        nodes: built.nodes.map((n) => ({ ...n, mastery: mastery.get(n.id)! })),
      };
      if (!args.bucket) return json(graph);
      const keep = new Set(
        graph.nodes.filter((n) => n.bucket === args.bucket).map((n) => n.id),
      );
      return json({
        nodes: graph.nodes.filter((n) => keep.has(n.id)),
        edges: graph.edges.filter(
          (e) => keep.has(e.source) && keep.has(e.target),
        ),
        unresolved: graph.unresolved.filter((u) => keep.has(u.source)),
      });
    },
  });
}
