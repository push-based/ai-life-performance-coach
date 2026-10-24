/**
 * Where the vault is (ADR-KI-0058 Decision 2). The caller reads argv, the environment
 * and the config file; this module only decides, so it reads no process state.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

export interface VaultRootSources {
  /** The `--vault <path>` value, highest precedence. */
  flag?: string;
  /** The `DOCS_MCP_VAULT` value. */
  env?: string;
  /** Path of a JSON config file whose `vault.root` names the vault. Missing file is not an error. */
  configFile?: string;
  /** Home directory, for a leading `~`. */
  home: string;
  /** Directory relative paths resolve against. */
  cwd: string;
  /** Directories the vault must not sit inside: the docs-mcp workspace the server runs from. */
  protectedRoots: string[];
}

export interface ResolvedVaultRoot {
  root: string;
  source: "flag" | "env" | "config";
}

/** `$XDG_CONFIG_HOME/docs-mcp/config.json`, else `~/.config/docs-mcp/config.json`. */
export function defaultVaultConfigFile(home: string, xdgConfigHome?: string): string {
  return join(xdgConfigHome || join(home, ".config"), "docs-mcp", "config.json");
}

function expand(path: string, home: string, cwd: string): string {
  const tilde = path === "~" || path.startsWith("~/") ? join(home, path.slice(1)) : path;
  return resolve(cwd, tilde);
}

function readConfigRoot(file: string): string | undefined {
  if (!existsSync(file)) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf-8"));
  } catch (err) {
    throw new Error(`vault config ${file} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  const root = (parsed as { vault?: { root?: unknown } } | null)?.vault?.root;
  return typeof root === "string" && root.trim() ? root : undefined;
}

export function isInside(child: string, parent: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

/**
 * Resolve the vault root: flag, then environment, then config file. Throws when none
 * names a vault, when the named directory does not exist, or when it lies inside a
 * protected root, so a vault can never be served from inside the docs-mcp workspace.
 */
export function resolveVaultRoot(s: VaultRootSources): ResolvedVaultRoot {
  const configured = s.configFile ? readConfigRoot(s.configFile) : undefined;
  const pick: [string | undefined, ResolvedVaultRoot["source"]][] = [[s.flag, "flag"], [s.env, "env"], [configured, "config"]];
  const hit = pick.find(([v]) => typeof v === "string" && v.trim() !== "");
  if (!hit) {
    throw new Error(
      `no vault configured: pass --vault <path>, set DOCS_MCP_VAULT, or set vault.root in ${s.configFile ?? "a config file"}`,
    );
  }
  const root = expand(hit[0]!.trim(), s.home, s.cwd);
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`vault root ${root} is not a directory`);
  for (const p of s.protectedRoots) {
    if (isInside(root, resolve(p))) throw new Error(`vault root ${root} lies inside the docs-mcp workspace ${p}; a vault must live outside it`);
  }
  return { root, source: hit[1] };
}
