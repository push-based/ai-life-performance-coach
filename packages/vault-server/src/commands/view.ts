import { parseArgs } from "node:util";
import type { CliIo } from "../main.js";

/**
 * `view --vault [<path>] [--port=<n>]` — the vault graph in a browser (ADR-KI-0058
 * Decision 11). A loopback server rooted at the vault, separate from this repository's
 * `pnpm run viz`; it runs until interrupted.
 */
export async function run(args: string[], io: CliIo): Promise<number> {
  if (!args.some(a => a === "--vault" || a.startsWith("--vault="))) {
    console.error("docs-mcp view: --vault is required; the corpus graph is `pnpm run viz`");
    return 2;
  }
  const { values } = parseArgs({ args, options: { port: { type: "string" } }, strict: false, allowPositionals: true });
  const port = typeof values.port === "string" ? Number(values.port) : 4747;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error(`docs-mcp view: --port must be a port number, got ${String(values.port)}`);
    return 2;
  }
  const { resolveVaultForProcess } = await import("@docs-mcp/mcp/serve-vault.js");
  const { createVault } = await import("@docs-mcp/vault/vault.js");
  const { createVaultViewServer, listenOnLoopback, GRAPH_FILE } = await import("@docs-mcp/vault/view.js");
  const { root } = resolveVaultForProcess({ cwd: io.cwd, argv: args, env: process.env });
  const url = await listenOnLoopback(createVaultViewServer(createVault(root)), port);
  console.error(`[docs-mcp-vault-view] Vault: ${root}`);
  console.error(`[docs-mcp-vault-view] Graph: ${GRAPH_FILE}, regenerated on every load`);
  console.log(url);
  await new Promise<never>(() => {});
  return 0;
}
