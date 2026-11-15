# @ai-coach/vault-server

**The vault server**: the one program that opens your vault. ai-coach and Claude Code both ask it, over the [Model Context Protocol](https://modelcontextprotocol.io).

It wraps [`vault`](../vault/README.md) in MCP tools: reading and searching notes, recording sessions, filing, converting books, the climb, and planning. Every tool that writes previews first, and writes only when called again with `execute: true`.

## Running it

The workspace build produces `dist/main.js`, the `coach-vault` command:

```sh
node packages/vault-server/dist/main.js serve --vault ~/Documents/my-vault   # MCP on stdio
node packages/vault-server/dist/main.js view --vault ~/Documents/my-vault    # graph view on http://127.0.0.1:4747
```

You rarely start it yourself:

- **The `coach` CLI** starts `serve` for each command and stops it after. It finds the server in this checkout, unless `docsMcpBin` says otherwise. `coach view` starts `view`.
- **Claude Code** starts its own copy from `.mcp.json`, registered as `life-vault`. See the [planning skills](../../.claude/skills/README.md#set-it-up).

The vault comes from `--vault`, else `DOCS_MCP_VAULT`, else `vault.root` in `~/.config/docs-mcp/config.json`. `view` also takes `--port`.

## Adding a tool

New vault abilities go here and in `vault`, not in the coach (ADR-0048):

1. Add the behaviour to `vault`, with tests.
2. Add a tool in `src/tools/vault/` and register it in `src/tools/vault.ts`.
3. Wrap it in [`adapter-vault-mcp`](../adapter-vault-mcp/README.md) if the coach needs it. Update [`.claude/skills/vault-planning/tools.md`](../../.claude/skills/vault-planning/tools.md) if a planning skill uses it.

This package may import only `vault`, the MCP SDK, `zod` and Node. The Nx tag `type:vault-server` enforces that, and nothing may import this package.

## Tests

`npx nx test @ai-coach/vault-server` calls the tools against a temporary vault, mostly through their handlers. One test connects a real MCP client over an in-memory transport.
