import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { composeVault } from './compose.js';
import {
  defaultVaultConfigFile,
  resolveVaultRoot,
  type ResolvedVaultRoot,
} from '@ai-coach/vault-adapter-fs';
import { createVaultServer } from './server/vault.js';

export interface ServeVaultOptions {
  cwd: string;
  argv: string[];
  env: Record<string, string | undefined>;
}

export function parseVaultFlags(argv: string[]): {
  vault?: string;
  vaultConfig?: string;
} {
  const value = (name: string): string | undefined => {
    for (let i = 0; i < argv.length; i++) {
      if (argv[i].startsWith(`--${name}=`))
        return argv[i].slice(name.length + 3) || undefined;
      if (argv[i] === `--${name}`)
        return argv[i + 1] !== undefined && !argv[i + 1].startsWith('-')
          ? argv[i + 1]
          : undefined;
    }
    return undefined;
  };
  return { vault: value('vault'), vaultConfig: value('vault-config') };
}

export function workspaceRootsAbove(cwd: string): string[] {
  const roots: string[] = [];
  for (let dir = resolve(cwd); ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'docs-mcp.config.json'))) roots.push(dir);
    if (dirname(dir) === dir) return roots;
  }
}

export function resolveVaultForProcess({
  cwd,
  argv,
  env,
}: ServeVaultOptions): ResolvedVaultRoot {
  const flags = parseVaultFlags(argv);
  const home = env.HOME ?? homedir();
  return resolveVaultRoot({
    flag: flags.vault,
    env: env.DOCS_MCP_VAULT,
    configFile: flags.vaultConfig
      ? resolve(cwd, flags.vaultConfig)
      : defaultVaultConfigFile(home, env.XDG_CONFIG_HOME),
    home,
    cwd,
    protectedRoots: workspaceRootsAbove(cwd),
  });
}

export async function serveVault(opts: ServeVaultOptions): Promise<void> {
  const { root, source } = resolveVaultForProcess(opts);

  const { version } = createRequire(import.meta.url)('../package.json') as {
    version: string;
  };
  const pkg = { name: 'ai-coach', version };

  console.error(`[coach-vault] Vault: ${root} (from ${source})`);
  const server = createVaultServer({ vault: composeVault(root), pkg });
  await server.connect(new StdioServerTransport());
  console.error(`coach-vault server started (${pkg.name} v${pkg.version})`);
}
