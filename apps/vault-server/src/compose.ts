import {
  createVault,
  type Vault,
  type VaultOptions,
} from '@ai-coach/vault-application';
import {
  createFsNoteStore,
  randomHex,
  sha256Hex,
} from '@ai-coach/vault-adapter-fs';
import { parseMatter } from '@ai-coach/vault-adapter-markdown';
import { readPdf } from '@ai-coach/vault-adapter-pdf';
import { rankWithFlexSearch } from '@ai-coach/vault-adapter-search';

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
