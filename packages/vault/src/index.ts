/**
 * The public surface of the vault mode — what `@docs-mcp/vault` exports (ADR-KI-0058).
 *
 * A sanctioned barrel like the other packages'; no file inside this repository imports
 * from here (asserted by scripts/__tests__/boundary.test.ts).
 */

export { createVault, notePathOf, type Vault } from "./vault.js";
export { resolveVaultRoot, defaultVaultConfigFile, type VaultRootSources, type ResolvedVaultRoot } from "./root.js";
export { classify, PARA_ROOT, PARA_FOLDERS, PARA_BUCKETS, COACH_ROOT, type ParaBucket, type ParaLocation } from "./para.js";
export { scanVault, readNote, listNotePaths, type VaultNote } from "./scan.js";
export { extractLinks, LinkResolver, type RawLink } from "./links.js";
export { buildVaultGraph, type VaultGraph, type VaultGraphNode, type VaultGraphEdge } from "./graph.js";
export { searchNotes, type NoteHit, type NoteSearchOptions } from "./search.js";
