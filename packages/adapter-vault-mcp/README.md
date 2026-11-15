# @ai-coach/adapter-vault-mcp

**The bridge to your Obsidian vault.** ai-coach never opens the files in your vault itself. Every read and every change goes through the [vault server](../vault-server/README.md), which this package starts and talks to over [MCP](https://modelcontextprotocol.io).

That keeps one program in charge of your vault: it knows the folder layout, keeps sparring history, checks quotes against books and refuses unsafe moves. ai-coach just asks.

## What it lets the coach do

| The coach wants to…                       | Vault server tool                                       |
| ----------------------------------------- | ------------------------------------------------------- |
| list notes and read one, with its history | `list_notes`, `read_note`                               |
| see what's due for review                 | `due_for_review`                                        |
| record a sparring or judging session      | `record_session`                                        |
| get exactly what may be sent to the judge | `tier2_payload`                                         |
| file, capture, archive, set up PARA       | `file_note`, `capture`, `archive_project`, `init_vault` |
| see where each book stands                | `reading_progress`                                      |
| find a passage in a book                  | `find_passages`                                         |
| write a concept note                      | `create_concept`                                        |

`VaultClient` also wraps `search` and `vault_graph`, which the coach doesn't use yet. The server's planning tools are used by the [planning skills](../../.claude/skills/README.md), not by this package.

Every tool that writes **previews first**. ai-coach only executes after you confirm in the terminal.

## Setting it up

Build the workspace, then point ai-coach at your vault:

```json
{
  "vault": "~/Documents/my-vault"
}
```

or with the environment variable `DOCS_MCP_VAULT`.

The server is `packages/vault-server/dist/main.js` in this checkout, and ai-coach finds it there by itself. Set `docsMcpBin` (or `DOCS_MCP_BIN`) only to use a server somewhere else.

`VaultClient.connect` starts the server as a child process, `node <docsMcpBin> serve --vault <vault>`, and talks to it over MCP on stdio. It identifies itself as `ai-coach` and keeps the server's stderr, so a failed start can show the end of the log. `McpVault.close()` stops the server.

Always set the vault. Without it the server looks for one in `DOCS_MCP_VAULT` and `~/.config/docs-mcp/config.json`, and stops if it finds none.

## Good to know

- **Everything that comes back is checked.** Replies are validated against a schema. If the server changes a reply's shape, you get a clear "unexpected response from the vault server" error rather than odd behaviour.
- **Refusals come through as they are.** When the server refuses something (a quote not found in the book, a name collision), you see its own explanation as a `VaultRefusedError`.
- **If something is missing, add it to the server, not this package.** New vault abilities belong in [`vault`](../vault/README.md) and [`vault-server`](../vault-server/README.md) (ADR-AIC-0048). This package only wraps what the server offers.
- **Server problems are easy to see.** If the server won't start, the error includes the end of its log.

## Classes

| Class         | What it is                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| `McpVault`    | What the coach uses: implements the application's vault and library ports. |
| `VaultClient` | A thin, typed wrapper around each vault server tool.                       |

## Tests

There are no automated tests here for now. They would need a running vault server (see ADR-AIC-0010). Try changes by hand against a **copy** of a vault, never your real one.
