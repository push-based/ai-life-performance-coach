/**
 * Serve a vault over stdio (ADR-KI-0058). The one place that reads the process for the
 * vault mode: argv, DOCS_MCP_VAULT, the home directory, and the docs-mcp workspace the
 * vault must stay out of.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { createVault } from "@docs-mcp/vault/vault.js";
import { defaultVaultConfigFile, resolveVaultRoot, type ResolvedVaultRoot } from "@docs-mcp/vault/root.js";
import { createVaultServer } from "./server/vault.js";

export interface ServeVaultOptions {
  cwd: string;
  argv: string[];
  env: Record<string, string | undefined>;
}

/** `--vault <path>` or `--vault=<path>`; a bare `--vault` defers to the environment and config. */
export function parseVaultFlags(argv: string[]): { vault?: string; vaultConfig?: string } {
  // By hand rather than parseArgs: a flag whose value is optional must not take the next
  // option as its value, as in `--vault --port=5000`.
  const value = (name: string): string | undefined => {
    for (let i = 0; i < argv.length; i++) {
      if (argv[i].startsWith(`--${name}=`)) return argv[i].slice(name.length + 3) || undefined;
      if (argv[i] === `--${name}`) return argv[i + 1] !== undefined && !argv[i + 1].startsWith("-") ? argv[i + 1] : undefined;
    }
    return undefined;
  };
  return { vault: value("vault"), vaultConfig: value("vault-config") };
}

/** Every directory from `cwd` upward that holds a docs-mcp.config.json. */
export function workspaceRootsAbove(cwd: string): string[] {
  const roots: string[] = [];
  for (let dir = resolve(cwd); ; dir = dirname(dir)) {
    if (existsSync(join(dir, "docs-mcp.config.json"))) roots.push(dir);
    if (dirname(dir) === dir) return roots;
  }
}

/** Resolve the vault root from a process's flags, environment and config file. */
export function resolveVaultForProcess({ cwd, argv, env }: ServeVaultOptions): ResolvedVaultRoot {
  const flags = parseVaultFlags(argv);
  const home = env.HOME ?? homedir();
  return resolveVaultRoot({
    flag: flags.vault,
    env: env.DOCS_MCP_VAULT,
    configFile: flags.vaultConfig ? resolve(cwd, flags.vaultConfig) : defaultVaultConfigFile(home, env.XDG_CONFIG_HOME),
    home,
    cwd,
    protectedRoots: workspaceRootsAbove(cwd),
  });
}

export async function serveVault(opts: ServeVaultOptions): Promise<void> {
  const { root, source } = resolveVaultForProcess(opts);
  // The server names itself, not the directory it was launched from: a consumer app
  // starts it from its own repository.
  const { version } = createRequire(import.meta.url)("@docs-mcp/vault/package.json") as { version: string };
  const pkg = { name: "docs-mcp", version };

  console.error(`[docs-mcp-vault] Vault: ${root} (from ${source})`);
  const server = createVaultServer({ vault: createVault(root), pkg });
  await server.connect(new StdioServerTransport());
  console.error(`docs-mcp-vault server started (${pkg.name} v${pkg.version})`);
}
