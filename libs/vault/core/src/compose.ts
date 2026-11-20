import { createVault, type Vault, type VaultOptions } from './vault.js';
import { createFsNoteStore } from './fs-store.js';
import { parseMatter } from './markdown.js';
import { readPdf } from './pdf-reader.js';
import { rankWithFlexSearch } from './flexsearch-ranker.js';
import { randomHex, sha256Hex } from './node-crypto.js';

export const composeVault = (root: string, opts: VaultOptions = {}): Vault =>
  createVault(
    {
      store: createFsNoteStore(root),
      frontmatter: parseMatter,
      readPdf,
      rank: rankWithFlexSearch,
      digest: sha256Hex,
      randomHex,
    },
    opts,
  );
