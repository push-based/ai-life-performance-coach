/**
 * Serve a vault over stdio (ADR-KI-0058). The one place that reads the process for the
 * vault mode: argv, DOCS_MCP_VAULT, the home directory, and the docs-mcp workspace the
 * vault must stay out of.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createRequire } from "node:module";
import { createVault } from "@docs-mcp/vault/vault.js";
import { defaultVaultConfigFile, resolveVaultRoot } from "@docs-mcp/vault/root.js";
import { createVaultServer } from "./server/vault.js";

export interface ServeVaultOptions {
  cwd: string;
  argv: string[];
  env: Record<string, string | undefined>;
}

/** `--vault <path>` or `--vault=<path>`; a bare `--vault` defers to the environment and config. */
export function parseVaultFlags(argv: string[]): { vault?: string; vaultConfig?: string } {
  const { values } = parseArgs({
    args: argv,
    options: { vault: { type: "string" }, "vault-config": { type: "string" } },
    strict: false,
    allowPositionals: true,
  });
  return {
    vault: typeof values.vault === "string" ? values.vault : undefined,
    vaultConfig: typeof values["vault-config"] === "string" ? values["vault-config"] : undefined,
  };
}

/** Every directory from `cwd` upward that holds a docs-mcp.config.json. */
export function workspaceRootsAbove(cwd: string): string[] {
  const roots: string[] = [];
  for (let dir = resolve(cwd); ; dir = dirname(dir)) {
    if (existsSync(join(dir, "docs-mcp.config.json"))) roots.push(dir);
    if (dirname(dir) === dir) return roots;
  }
}

export async function serveVault({ cwd, argv, env }: ServeVaultOptions): Promise<void> {
  const flags = parseVaultFlags(argv);
  const home = env.HOME ?? homedir();
  const { root, source } = resolveVaultRoot({
    flag: flags.vault,
    env: env.DOCS_MCP_VAULT,
    configFile: flags.vaultConfig ? resolve(cwd, flags.vaultConfig) : defaultVaultConfigFile(home, env.XDG_CONFIG_HOME),
    home,
    cwd,
    protectedRoots: workspaceRootsAbove(cwd),
  });
  // The server names itself, not the directory it was launched from: a consumer app
  // starts it from its own repository.
  const { version } = createRequire(import.meta.url)("@docs-mcp/vault/package.json") as { version: string };
  const pkg = { name: "docs-mcp", version };

  console.error(`[docs-mcp-vault] Vault: ${root} (from ${source})`);
  const server = createVaultServer({ vault: createVault(root), pkg });
  await server.connect(new StdioServerTransport());
  console.error(`docs-mcp-vault server started (${pkg.name} v${pkg.version})`);
}
