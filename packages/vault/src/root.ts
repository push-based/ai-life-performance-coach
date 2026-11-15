import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

export interface VaultRootSources {

  flag?: string;

  env?: string;

  configFile?: string;

  home: string;

  cwd: string;

  protectedRoots: string[];
}

export interface ResolvedVaultRoot {
  root: string;
  source: "flag" | "env" | "config";
}

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
