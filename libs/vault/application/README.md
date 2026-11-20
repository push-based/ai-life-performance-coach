# @ai-coach/vault-application

**What you can do with your vault.** This package holds the vault's use cases: scanning notes, recording sessions, filing, converting books, concepts, the climb, planning, roll-over, review and the graph view's data. It reaches the vault only through ports, so it never opens a file itself.

It has no MCP and no terminal. [`vault-server`](../../../apps/vault-server/README.md) composes it with its adapters and offers it as tools over MCP, and that server is how the coach and Claude Code reach it (ADR-AIC-0048). Nothing outside `scope:vault` may import it.

## What's inside

| Area                  | Files                                                                      |
| --------------------- | -------------------------------------------------------------------------- |
| The facade            | `vault.ts`: `createVault(deps, opts)` returns the `Vault` every tool calls |
| Reading the vault     | `scan.ts` (snapshot and notes), `sessions.ts`, `search.ts`                 |
| Sparring history      | `record.ts`, `review.ts`                                                   |
| Books and concepts    | `convert.ts`, `distill.ts`, `marks.ts`, `concept.ts`                       |
| The climb             | `climb.ts`, `climb-writes.ts`                                              |
| Filing and editing    | `filing.ts`, `note-edits.ts`                                               |
| Planning              | `plans.ts`, `plansview.ts`, `rollover.ts`, `harvest.ts`                    |
| The graph view's data | `view-graph.ts`                                                            |

## Ports

`createVault` takes everything from outside as `VaultDeps`:

| Port                  | What it does                              | Adapter                                             |
| --------------------- | ----------------------------------------- | --------------------------------------------------- |
| `NoteStore`           | Lists, reads and writes the vault's files | [`adapter-fs`](../adapter-fs/README.md)             |
| `FrontmatterParser`   | Reads a note's YAML frontmatter           | [`adapter-markdown`](../adapter-markdown/README.md) |
| `SearchRanker`        | Ranks full-text hits                      | [`adapter-search`](../adapter-search/README.md)     |
| `PdfReader`           | Reads a PDF's pages and outline           | [`adapter-pdf`](../adapter-pdf/README.md)           |
| `digest`, `randomHex` | Note versions and new ids                 | [`adapter-fs`](../adapter-fs/README.md)             |

## Good to know

- **Every write is a preview first.** It changes files only when called with `execute: true`, and refuses a note that changed since the preview.
- **Planners never touch the disk.** They read a `VaultTree`, a snapshot of the vault's folders and notes loaded through the `NoteStore`. Only the execute step writes ([ADR-AIC-0052](../../../kb/source/initiatives/ai-coach/decisions/ADR-AIC-0052-split-the-vault-into-hexagonal-domain-application-and-adapter-libraries.md)).
- **Why it behaves the way it does:** this code was written for ai-coach in a branch of kb-template (see [Code from kb-template](../../../README.md#code-from-kb-template)). The reasons are the ADR-KI-0058 to ADR-KI-0071 written there, kept in the `vault` initiative of the [knowledge base](../../../kb/README.md). New decisions go in its `ai-coach` initiative.

## Tests

```sh
npx nx test @ai-coach/vault-application
```

These run in memory, with `createMemoryNoteStore` from `src/testing`. The tests of the composed vault, against real temporary folders, live in [`vault-server`](../../../apps/vault-server/README.md#tests).
