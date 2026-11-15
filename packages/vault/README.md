# @ai-coach/vault

**The code that reads and writes your Obsidian vault.** It knows the [PARA](../../docs/guide/glossary.md#para) layout, your plans and your sparring history. It is the only code in ai-coach that touches vault files.

It has no MCP and no terminal. [`vault-server`](../vault-server/README.md) offers it as tools over MCP, and that server is how the coach and Claude Code reach it (ADR-0048). Nothing else in the workspace may import this package. The Nx tag `type:vault` enforces that.

## What it does

| Area                  | Files                                                                           |
| --------------------- | ------------------------------------------------------------------------------- |
| Open and scan a vault | `vault.ts`, `root.ts`, `scan.ts`, `para.ts`, `links.ts`, `md.ts`, `identity.ts` |
| Find and connect      | `search.ts`, `graph.ts`                                                         |
| Sparring history      | `sessions.ts`, `record.ts`, `mastery.ts`, `review.ts`, `payload.ts`             |
| Books and concepts    | `convert.ts`, `distill.ts`, `marks.ts`, `concept.ts`                            |
| The climb             | `climb.ts`, `climb-writes.ts`                                                   |
| Filing and editing    | `filing.ts`, `note-edits.ts`, `task-line.ts`                                    |
| Planning              | `planning.ts`, `plans.ts`, `rollover.ts`, `habits.ts`, `harvest.ts`             |
| The graph view        | `view.ts` and `plansview.ts`, with the pages in [`assets/`](assets)             |

Every write is a **preview first**. It changes files only when called with `execute: true`.

## The graph view

`view.ts` serves the vault in a browser, on `127.0.0.1` only:

- `/`: the graph of your notes. Click a note to read it, and mark, highlight and summarise in place.
- `/plans`: your goals beside your effort over time.
- `/climb`: the climb page with its drawing board.

The pages are plain HTML and JavaScript in `assets/`. The board on `/climb` is built from [`apps/climb-board`](../../apps/climb-board/README.md), and its output is committed in `assets/climb-board/`. Writes from a page need the token the server put into that page.

Start it with `npm run coach -- view`.

## Good to know

- **Why it behaves the way it does:** this code was first built in kb-template. The reasons for its behaviour are kb-template's ADR-KI-0058 to ADR-KI-0071. New decisions go in [`docs/adr/`](../../docs/adr/README.md).
- **The names on the vault itself are unchanged:** `DOCS_MCP_VAULT` and `~/.config/docs-mcp/config.json` still pick the vault, and a vault inside a folder with a `docs-mcp.config.json` is refused.
- **Known gap:** search folds `ż`, `ó`, `ę` and `ś`, but not `ł`.

## Tests

`npx nx test @ai-coach/vault`. Each test builds a temporary vault, and the graph view is tested over real HTTP on loopback. No test touches your vault.
