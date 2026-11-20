import { parseArgs } from 'node:util';
import type { CliIo } from '../main.js';
import { composeVault } from '@ai-coach/vault/compose.js';
import {
  createVaultViewServer,
  listenOnLoopback,
} from '@ai-coach/vault/view.js';
import { GRAPH_FILE } from '@ai-coach/vault/view-graph.js';
import { resolveVaultForProcess } from '../serve-vault.js';

export async function run(args: string[], io: CliIo): Promise<number> {
  if (!args.some((a) => a === '--vault' || a.startsWith('--vault='))) {
    console.error('coach-vault view: --vault is required');
    return 2;
  }
  const { values } = parseArgs({
    args,
    options: { port: { type: 'string' } },
    strict: false,
    allowPositionals: true,
  });
  const port = typeof values.port === 'string' ? Number(values.port) : 4747;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(
      `coach-vault view: --port must be a port number, got ${String(values.port)}`,
    );
    return 2;
  }
  const { root } = resolveVaultForProcess({
    cwd: io.cwd,
    argv: args,
    env: process.env,
  });
  const url = await listenOnLoopback(
    createVaultViewServer(composeVault(root)),
    port,
  );
  console.error(`[coach-vault-view] Vault: ${root}`);
  console.error(
    `[coach-vault-view] Graph: ${GRAPH_FILE}, regenerated on every load`,
  );
  console.log(url);
  await new Promise<never>(() => undefined);
  return 0;
}
