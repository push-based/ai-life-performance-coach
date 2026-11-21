# @ai-coach/vault-server

**The vault server**: the one program that opens your vault. ai-coach and your AI agent both ask it, over the [Model Context Protocol](https://modelcontextprotocol.io).

It composes the vault from [`vault-application`](../../libs/vault/application/README.md) and its adapters, and wraps it in MCP tools: reading and searching notes, recording sessions, filing, converting books, the climb, and planning. Every tool that writes previews first, and writes only when called again with `execute: true`.

## Running it

The workspace build produces `dist/main.js`, the `coach-vault` command:

```sh
node apps/vault-server/dist/main.js serve --vault ~/Documents/my-vault   # MCP on stdio
node apps/vault-server/dist/main.js view --vault ~/Documents/my-vault    # graph view on http://127.0.0.1:4747
```

You rarely start it yourself:

- **The `coach` CLI** starts `serve` for each command and stops it after. It finds the server in this checkout, unless `docsMcpBin` says otherwise. `coach view` starts `view`.
- **Your AI agent** starts its own copy from its MCP settings (`.mcp.json` for Claude Code), registered as `life-vault`. See the [planning skills](../../.agents/skills/README.md#set-it-up).

The vault comes from `--vault`, else `DOCS_MCP_VAULT`, else `vault.root` in `~/.config/docs-mcp/config.json`. `view` also takes `--port`.

## Adding a tool

New vault abilities go here and in the vault libraries, not in the coach (ADR-AIC-0048):

1. Add the behaviour to [`vault-domain`](../../libs/vault/domain/README.md) or [`vault-application`](../../libs/vault/application/README.md), with tests. If it needs something new from outside (a file, a library), add a port to `vault-application` and an adapter for it.
2. Add a tool in `src/tools/vault/` and register it in `src/tools/vault.ts`.
3. Wrap it in [`adapter-vault-mcp`](../../libs/coach/adapter-vault-mcp/README.md) if the coach needs it. Update [`.agents/skills/vault-planning/tools.md`](../../.agents/skills/vault-planning/tools.md) if a planning skill uses it.

This package may import only the `scope:vault` libraries, the MCP SDK, `zod` and Node. The Nx tags (`scope:vault`, `architecture:hexagonal`, `type:app`, `app:vault-server`) enforce that, and nothing may import this app.

## Tests

`npx nx test @ai-coach/vault-server` runs two groups of tests against temporary vaults:

- `src/vault/__tests__/` tests the composed vault: `composeVault` with the real adapters, and the graph view over real HTTP on loopback. No test touches your vault.
- `src/tools/__tests__/` calls the tools, mostly through their handlers. One test connects a real MCP client over an in-memory transport.

`src/compose.ts` is where the vault's ports meet their adapters ([ADR-AIC-0052](../../kb/source/initiatives/ai-coach/decisions/ADR-AIC-0052-split-the-vault-into-hexagonal-domain-application-and-adapter-libraries.md)).
