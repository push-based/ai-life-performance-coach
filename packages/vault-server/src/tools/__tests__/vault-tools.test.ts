import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createVault, type Vault } from "@docs-mcp/vault/vault.js";
import { createVaultTools } from "../vault.js";
import { createVaultServer } from "../../server/vault.js";
import { parseVaultFlags, workspaceRootsAbove } from "../../serve-vault.js";

let dir: string;
let vault: Vault;

function put(rel: string, content: string): void {
  const abs = join(dir, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
}

const tool = (name: string) => createVaultTools(vault).find(t => t.name === name)!;
const call = async (name: string, args: Record<string, unknown> = {}) => {
  const res = await tool(name).handler(args);
  return { res, data: res.isError ? null : JSON.parse(res.content[0].text) };
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "vault-tools-"));
  put("1.Projects/DevFest2026/Talk.md", "# Talk\n\nBuilds on [[Event loop]].\n");
  put("3.Resources/TypeScript/Event loop.md", "---\ncoach_id: c-1\n---\nMicrotasks first. [[Gone]]\n");
  put("3.Resources/TypeScript/Promises.md", "Promises resolve as microtasks, see [[Event loop]].\n");
  put("Stray.md", "Outside PARA.\n");
  vault = createVault(dir);
});
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe("vault tool registry", () => {
  it("is read-only in Phase 1", () => {
    const tools = createVaultTools(vault);
    expect(tools.map(t => t.name)).toEqual(["list_notes", "read_note", "search", "vault_graph"]);
    for (const t of tools) expect(t.annotations?.readOnlyHint, t.name).toBe(true);
  });
});

describe("list_notes", () => {
  it("counts every bucket and lists notes", async () => {
    const { data } = await call("list_notes");
    expect(data.total).toBe(4);
    expect(data.counts).toEqual({ inbox: 0, projects: 1, areas: 0, resources: 2, archive: 0, out_of_place: 1 });
    expect(data.notes.find((n: { path: string }) => n.path.endsWith("Event loop.md"))).toMatchObject({ bucket: "resources", container: "TypeScript", coachId: "c-1" });
  });

  it("filters by bucket, out_of_place, and container", async () => {
    expect((await call("list_notes", { bucket: "resources" })).data.notes).toHaveLength(2);
    expect((await call("list_notes", { bucket: "out_of_place" })).data.notes.map((n: { path: string }) => n.path)).toEqual(["Stray.md"]);
    expect((await call("list_notes", { container: "DevFest2026" })).data.notes).toHaveLength(1);
  });
});

describe("read_note", () => {
  it("returns body, frontmatter, location and resolved links", async () => {
    const { data } = await call("read_note", { path: "3.Resources/TypeScript/Event loop.md" });
    expect(data).toMatchObject({ title: "Event loop", bucket: "resources", coachId: "c-1", frontmatter: { coach_id: "c-1" } });
    expect(data.body).toContain("Microtasks first.");
    expect(data.links).toEqual([{ kind: "wikilink", target: "Gone", resolved: null }]);
  });

  it("errors on a missing note and on a path outside the vault", async () => {
    expect((await call("read_note", { path: "0.Inbox/None.md" })).res.isError).toBe(true);
    expect((await call("read_note", { path: "../../etc/hosts.md" })).res.isError).toBe(true);
  });
});

describe("search", () => {
  it("finds notes and filters by bucket", async () => {
    const all = (await call("search", { query: "event loop" })).data;
    expect(all[0].path).toBe("3.Resources/TypeScript/Event loop.md");
    const projects = (await call("search", { query: "event loop", bucket: "projects" })).data;
    expect(projects.map((h: { path: string }) => h.path)).toEqual(["1.Projects/DevFest2026/Talk.md"]);
  });
});

describe("vault_graph", () => {
  it("returns the whole graph, or one bucket's nodes and the edges between them", async () => {
    const whole = (await call("vault_graph")).data;
    expect(whole.nodes).toHaveLength(4);
    expect(whole.edges).toHaveLength(2);
    expect(whole.unresolved).toEqual([{ source: "3.Resources/TypeScript/Event loop.md", target: "Gone" }]);
    const resources = (await call("vault_graph", { bucket: "resources" })).data;
    expect(resources.nodes).toHaveLength(2);
    expect(resources.edges).toEqual([{ source: "3.Resources/TypeScript/Promises.md", target: "3.Resources/TypeScript/Event loop.md", kind: "wikilink" }]);
  });
});

describe("vault server over MCP", () => {
  it("lists the vault's notes by bucket to a connected client", async () => {
    const server = createVaultServer({ vault, pkg: { name: "docs-mcp", version: "0.0.0" } });
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    await server.connect(serverSide);
    const client = new Client({ name: "ai-coach-test", version: "0.0.0" });
    await client.connect(clientSide);
    try {
      const { tools } = await client.listTools();
      expect(tools.map(t => t.name).sort()).toEqual(["list_notes", "read_note", "search", "vault_graph"]);
      const res = await client.callTool({ name: "list_notes", arguments: { bucket: "resources" } });
      const data = JSON.parse((res.content as { text: string }[])[0].text);
      expect(data.notes.map((n: { path: string }) => n.path)).toEqual([
        "3.Resources/TypeScript/Event loop.md",
        "3.Resources/TypeScript/Promises.md",
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });
});

describe("serve-vault helpers", () => {
  it("reads --vault in both spellings and --vault-config", () => {
    expect(parseVaultFlags(["--vault", "/v"])).toEqual({ vault: "/v", vaultConfig: undefined });
    expect(parseVaultFlags(["--vault=/v", "--vault-config=/c.json"])).toEqual({ vault: "/v", vaultConfig: "/c.json" });
    expect(parseVaultFlags(["--vault"]).vault).toBeUndefined();
  });

  it("finds every docs-mcp workspace from cwd upward", () => {
    writeFileSync(join(dir, "docs-mcp.config.json"), "{}");
    mkdirSync(join(dir, "a", "b"), { recursive: true });
    expect(workspaceRootsAbove(join(dir, "a", "b"))).toContain(dir);
  });
});
