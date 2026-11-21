# Architecture

ai-coach is a ports-and-adapters (hexagonal) application. The core knows nothing about MCP, Ollama, Gemini, the file system or the terminal. Those sit behind ports the core defines, and one composition root wires them together.

Why each part is the way it is lives in the ADRs in [`kb/`](kb/README.md), a knowledge base that kb-kit serves to agents. This page is the map; the ADRs are the reasons.

## The system around it

```
                         ┌───────────────────────── your machine ─────────────────────────┐
                         │                                                                │
  you ── terminal ──►  coach CLI (this repo) ──stdio/MCP──►  coach-vault serve (this repo) ──► Obsidian vault
                         │        │                                   ▲                    │   (Markdown files)
                         │        └──HTTP, loopback only──► Ollama (Gemma)                  │
                         │                                            │                    │
  you ── AI agent ─────► .agents/skills (this repo) ──stdio/MCP───────┘                    │
                         │                                                                │
                         └────────────────────────────────────────────────────────────────┘
                                  │
                                  └──HTTPS, Tier 2 payload only──► Gemini (the judge)
```

- **The vault server** (`apps/vault-server`, run as `coach-vault`) owns the vault. It is the only program that reads or writes vault files (ADR-AIC-0048). It was written for ai-coach in a branch of kb-template and moved here with its history; only three small files come from kb-template itself (see [Code from kb-template](README.md#code-from-kb-template)). The reasons for its behaviour are the ADR-KI-0058 to ADR-KI-0071 written there, which moved here too (ADR-AIC-0049). It keeps the PARA layout, converts PDFs into chapter notes, checks quotes against books, keeps the sparring history in `Coach/sessions/`, runs the planning model in `Plans/`, and serves the graph view on port 4747. Every write it offers is a preview until called with `execute`.
- **The `coach` CLI** holds the learning rules, the conversations with Gemma and Gemini, and the confirm-before-write terminal flow. It starts `node <docsMcpBin> serve --vault <vault>` as a child process for each command, talks to it over MCP on stdio, and stops it when the command ends.
- **Ollama** runs Gemma locally. The CLI refuses any Ollama host that is not on loopback.
- **The planning skills** in `.agents/skills/` are instructions for any AI coding agent that reads [Agent Skills](https://agentskills.io), not code; `.claude/skills/` links to them for Claude Code. They reach the same server through the agent's MCP registration (the agent starts its own copy), and never touch vault files directly (ADR-AIC-0029, ADR-AIC-0030, ADR-AIC-0050).

## Projects

```
  driving side            ports, defined in application         driven side

                        ┌────────────────────────────────────┐
  terminal              │ vault       NotesRepository        │  ◄── adapter-vault-mcp    MCP ─► vault-server ─► vault
     │                  │             SessionLog             │
     ▼                  │             VaultFiling            │
    cli                 │             Library                │
  (composition root,    ├────────────────────────────────────┤
   plugs adapters in)   │ local model SparringPartner        │  ◄── adapter-ollama       Gemma, loopback only
     │                  │             StudyPartner           │
     ▼                  │             StyleClassifier        │
  application           │             SynthesisPartner       │
  (use cases) ── uses ─►│             StructurePartner       │
     │                  │             ElaborationPartner     │
     ▼                  │             TeachPartner           │
   domain               ├────────────────────────────────────┤
  (rules, no I/O)       │ judge       Judge                  │  ◄── adapter-gemini       Gemini, Tier 2 payload only
                        ├────────────────────────────────────┤
                        │ local state PendingJudgements      │  ◄── adapter-local-state  queue file, clock
                        │             Clock                  │
                        └────────────────────────────────────┘
```

The ports are the interfaces in `libs/coach/application/src/lib/ports/`: the vault ports in `vault.ts` and `library.ts`, the model ports in `models.ts` and `library.ts`, and the local state in `state.ts`. Each group has one adapter. `McpVault` implements all four vault ports, each local model port has its own `Ollama…` class, `GeminiJudge` is the judge, and `FilePendingJudgements` and `SystemClock` keep the local state. Only `cli` knows the adapters: `composeCoach` plugs them into the use cases.

All executable code lives in `apps/` and `libs/<domain>/<lib>` (ADR-AIC-0051). Non-code repository content stays at the root (`kb/`, `docs/`, `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`). Two architectural styles coexist under `@nx/enforce-module-boundaries`:

- **`architecture:hexagonal`** for backend domains (`scope:coach`, `scope:vault`): `type:domain`, `type:application`, `type:adapter`, and `type:app`.
- **`architecture:layered`** for frontend applications (`scope:climb-board`, `scope:docs`, and future UIs): `type:app`, `type:feat`, `type:ui`, `type:data-access`, `type:util`.
- **`scope:shared`** (`type:util`): pure TypeScript utilities (no external npm deps, no Node built-ins) importable by any scope, including hexagonal `domain` and `application`.

| Project                          | Tags                                                                              | Contains                                                                                                                                                                                                                                                  | May import                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `libs/coach/domain`              | `scope:coach`, `architecture:hexagonal`, `type:domain`                            | The sparring round aggregate, sparring rules, coaching styles, buzzword and verbatim checks, the review ladder, the judge's verdict rule, the Tier 2 payload invariant, study rounds, synthesis checks, the climb's steps, domain errors                  | `domain`, `scope:shared` `type:util`; no npm package, no Node                            |
| `libs/coach/application`         | `scope:coach`, `architecture:hexagonal`, `type:application`                       | Use cases (`Review`, `Filing`, `Sparring`, `SparringConversation`, `Judging`, `Studying`, `Synthesizing`, `Climbing`, `Generating`, `Elaborating`, `Grouping`, `Reading`, `Teaching`), the ports they need, application errors, in-memory fakes for tests | `domain`, `scope:shared` `type:util`; no npm package, no Node                            |
| `libs/coach/adapter-vault-mcp`   | `scope:coach`, `architecture:hexagonal`, `type:adapter`, `adapter:vault-mcp`      | `McpVault` and `VaultClient`: the vault and library ports over the vault server's MCP tools                                                                                                                                                               | core, `scope:shared` `type:util`; `@modelcontextprotocol/sdk`, `zod`, Node               |
| `libs/coach/adapter-ollama`      | `scope:coach`, `architecture:hexagonal`, `type:adapter`, `adapter:ollama`         | The seven Gemma partners (sparring, study, style, synthesis, elaboration, structure, teach) and `OllamaClient`: prompts, fencing, structured replies, the loopback-only guard                                                                             | core, `scope:shared` `type:util`; `zod`, Node                                            |
| `libs/coach/adapter-gemini`      | `scope:coach`, `architecture:hexagonal`, `type:adapter`, `adapter:gemini`         | `GeminiJudge`: the blind claim-extraction protocol, fallback model, boundary re-check of the payload                                                                                                                                                      | core, `scope:shared` `type:util`; `@google/genai`, `zod`, Node                           |
| `libs/coach/adapter-local-state` | `scope:coach`, `architecture:hexagonal`, `type:adapter`, `adapter:local-state`    | `FilePendingJudgements`, `SystemClock`                                                                                                                                                                                                                    | core, `scope:shared` `type:util`; `zod`, Node                                            |
| `apps/cli`                       | `scope:coach`, `architecture:hexagonal`, `type:app`, `app:cli`                    | Terminal I/O, config, commands, and `composeCoach`, the only place a port meets its adapter                                                                                                                                                               | `scope:coach` libs, `scope:shared` `type:util`; `zod`, Node                              |
| `libs/shared/util-path`          | `scope:shared`, `type:util`                                                       | Pure `posix` path helpers that behave like `node:path`'s                                                                                                                                                                                                  | nothing                                                                                  |
| `libs/vault/domain`              | `scope:vault`, `architecture:hexagonal`, `type:domain`                            | PARA, notes and links, the link graph, sessions and mastery, the Tier 2 payload, task lines, habits, planning, and `VaultTree`, the snapshot planners read                                                                                                | `domain`, `scope:shared` `type:util`; no npm package, no Node                            |
| `libs/vault/application`         | `scope:vault`, `architecture:hexagonal`, `type:application`                       | The `Vault` facade and its use cases (filing, conversion, concepts, distilling, records, the climb, planning writes, roll-over, review, harvest, the view graph), the `NoteStore` port and the other ports, an in-memory `NoteStore` for tests            | `domain`, `application`, `scope:shared` `type:util`; no npm package, no Node             |
| `libs/vault/adapter-fs`          | `scope:vault`, `architecture:hexagonal`, `type:adapter`, `adapter:vault-fs`       | `createFsNoteStore`, vault root resolution, SHA-256 and random ids                                                                                                                                                                                        | core, `scope:shared` `type:util`; Node                                                   |
| `libs/vault/adapter-markdown`    | `scope:vault`, `architecture:hexagonal`, `type:adapter`, `adapter:vault-markdown` | `parseMatter`: YAML frontmatter with `gray-matter`                                                                                                                                                                                                        | core; `gray-matter`                                                                      |
| `libs/vault/adapter-search`      | `scope:vault`, `architecture:hexagonal`, `type:adapter`, `adapter:vault-search`   | `rankWithFlexSearch`: full-text ranking                                                                                                                                                                                                                   | core; `flexsearch`                                                                       |
| `libs/vault/adapter-pdf`         | `scope:vault`, `architecture:hexagonal`, `type:adapter`, `adapter:vault-pdf`      | `readPdf`: a PDF's pages, metadata and outline                                                                                                                                                                                                            | core; `pdfjs-dist`                                                                       |
| `libs/vault/adapter-view`        | `scope:vault`, `architecture:hexagonal`, `type:adapter`, `adapter:vault-view`     | The graph view's loopback HTTP server and its pages in `assets/`                                                                                                                                                                                          | core; Node                                                                               |
| `apps/vault-server`              | `scope:vault`, `architecture:hexagonal`, `type:app`, `app:vault-server`           | The MCP vault server and the `coach-vault` binary (`serve`, `view`): one tool per vault ability, and `composeVault`, where the vault's ports meet their adapters                                                                                          | `scope:vault` libs, `scope:shared` `type:util`; `@modelcontextprotocol/sdk`, `zod`, Node |
| `apps/climb-board`               | `scope:climb-board`, `architecture:layered`, `type:app`, `app:climb-board`        | The Angular drawing board of the climb page, built into `libs/vault/adapter-view`'s assets                                                                                                                                                                | `scope:climb-board` layered libs, `scope:shared` `type:util`; Angular, `ng-diagram`      |
| `apps/docs`                      | `scope:docs`, `architecture:layered`, `type:app`, `app:docs`                      | The Docusaurus documentation site                                                                                                                                                                                                                         | `scope:docs` layered libs, `scope:shared` `type:util`; Docusaurus                        |

Adapters never import each other, and nothing imports `apps/*`. Nothing in `scope:coach` imports `scope:vault`: the coach reaches the vault only over MCP, through `adapter-vault-mcp` (ADR-AIC-0048). Each project's README says what it does in plain words:

| Project                                                                      | In one line                                                                     |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`libs/coach/domain`](libs/coach/domain/README.md)                           | The rules of learning: rounds, verdicts, the review schedule. No I/O at all.    |
| [`libs/coach/application`](libs/coach/application/README.md)                 | The things you can do (spar, judge, study, synthesize) and the ports they need. |
| [`libs/coach/adapter-ollama`](libs/coach/adapter-ollama/README.md)           | The local sparring partner, powered by Gemma.                                   |
| [`libs/coach/adapter-gemini`](libs/coach/adapter-gemini/README.md)           | The online judge, powered by Gemini.                                            |
| [`libs/coach/adapter-vault-mcp`](libs/coach/adapter-vault-mcp/README.md)     | Talks to your vault through the vault server.                                   |
| [`libs/coach/adapter-local-state`](libs/coach/adapter-local-state/README.md) | Remembers which sessions are waiting for the judge, and what day it is.         |
| [`apps/cli`](apps/cli/README.md)                                             | The `coach` command you type.                                                   |
| [`libs/shared/util-path`](libs/shared/util-path/README.md)                   | Path helpers any library may use.                                               |
| [`libs/vault/domain`](libs/vault/domain/README.md)                           | The rules of the vault: folders, notes, links, sessions, planning. No I/O.      |
| [`libs/vault/application`](libs/vault/application/README.md)                 | What you can do with your vault, and the ports it needs.                        |
| [`libs/vault/adapter-fs`](libs/vault/adapter-fs/README.md)                   | Reads and writes the vault's files.                                             |
| [`libs/vault/adapter-markdown`](libs/vault/adapter-markdown/README.md)       | Reads a note's YAML frontmatter.                                                |
| [`libs/vault/adapter-search`](libs/vault/adapter-search/README.md)           | Ranks full-text search hits.                                                    |
| [`libs/vault/adapter-pdf`](libs/vault/adapter-pdf/README.md)                 | Reads the text of a PDF book.                                                   |
| [`libs/vault/adapter-view`](libs/vault/adapter-view/README.md)               | Serves the graph view in your browser.                                          |
| [`apps/vault-server`](apps/vault-server/README.md)                           | Offers the vault as MCP tools to the coach and to AI agents.                    |
| [`apps/climb-board`](apps/climb-board/README.md)                             | The drawing board on the climb page.                                            |

## Ports and who provides them

| Port                                                          | File                             | Adapter                                      |
| ------------------------------------------------------------- | -------------------------------- | -------------------------------------------- |
| `NotesRepository`, `SessionLog`, `VaultFiling`                | `application/…/ports/vault.ts`   | `adapter-vault-mcp`                          |
| `Library`                                                     | `application/…/ports/library.ts` | `adapter-vault-mcp`                          |
| `SparringPartner`, `StudyPartner`, `StyleClassifier`, `Judge` | `application/…/ports/models.ts`  | `adapter-ollama`, `adapter-gemini` (`Judge`) |
| `SynthesisPartner`                                            | `application/…/ports/library.ts` | `adapter-ollama`                             |
| `PendingJudgements`, `Clock`                                  | `application/…/ports/state.ts`   | `adapter-local-state`                        |

### The vault's ports

| Port                  | File                                       | Adapter                                 |
| --------------------- | ------------------------------------------ | --------------------------------------- |
| `NoteStore`           | `vault/application/…/ports/note-store.ts`  | `adapter-fs` (`createFsNoteStore`)      |
| `FrontmatterParser`   | `vault/domain/…/md.ts`                     | `adapter-markdown` (`parseMatter`)      |
| `SearchRanker`        | `vault/application/…/search.ts`            | `adapter-search` (`rankWithFlexSearch`) |
| `PdfReader`           | `vault/application/…/convert.ts`           | `adapter-pdf` (`readPdf`)               |
| `Digest`, `randomHex` | `vault/application/…/plans.ts`, `vault.ts` | `adapter-fs` (`sha256Hex`, `randomHex`) |

`createVault` takes these as `VaultDeps`, and `composeVault` in `apps/vault-server` supplies them (ADR-AIC-0052). Planners never touch the disk: they read a `VaultTree` snapshot loaded through the `NoteStore`, and only the execute step writes.

## Rules

- Dependencies point inward. Ports are shaped by what the use cases need, not by a tool's API.
- Business rules live in the domain, in objects that guard their own invariants: a `SparringRound` will not accept a challenge that quotes the note, and `tier2Payload()` rejects any field other than `challenge`, `answer` and the coaching `style` (plus core assertions when allowed, ADR-AIC-0025).
- Use cases orchestrate: they load through ports, let the domain decide, and save through ports.
- Every write to the vault is a preview first and an execute only after the user confirms (ADR-AIC-0009).
- Adapters translate technology failures into application errors (`UnavailableError`, `UnusableReplyError`, `VaultRefusedError`); the CLI turns those into messages and exit codes.
- The only data that may leave the machine is a `Tier2Payload`. The Gemini adapter accepts nothing else and re-checks it.
- Source code carries no comments (ADR-AIC-0011). Names and tests carry the meaning.

## Enforcement

`npm exec nx run-many -- -t lint` runs `@nx/enforce-module-boundaries` with the tags above (ADR-AIC-0051):

- `scope:*` isolates domains (`scope:coach`, `scope:vault`, `scope:climb-board`, `scope:docs`), allowing each to depend only on itself and `scope:shared`.
- `architecture:hexagonal` and `architecture:layered` isolate architectural styles, allowing each to depend only on its own style and `scope:shared`.
- `onlyDependOnLibsWithTags` keeps hexagonal dependencies inward (`domain` ← `application` ← `adapter` ← `app`) and enforces layered frontend rules (`app` → `feat`/`ui`/`data-access`/`util`; `feat` → `ui`/`data-access`/`util` with no `feat` → `feat`; `ui` → `ui`/`util`; `data-access` → `data-access`/`util`; `util` → `util`).
- `allowedExternalImports` is a whitelist per tag: empty for `domain`, `application`, and `scope:shared`, and only its own SDK for each adapter and hexagonal app.
- `no-restricted-imports` bans Node built-ins in `libs/*/domain`, `libs/*/application`, and `libs/shared/*`, which the whitelist does not cover.
- Circular project dependencies are errors.

## Tests

| Level     | Where                                                     | Against                                                                                                    |
| --------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Domain    | `domain`                                                  | Plain functions and objects                                                                                |
| Use cases | `application`                                             | In-memory adapters in `src/testing`, including a check that a planted private line never reaches the judge |
| Adapters  | `adapter-ollama`, `adapter-gemini`, `adapter-local-state` | A loopback HTTP server for Ollama, the real Gemini SDK with a fake client, a temporary directory           |
| CLI       | `cli`                                                     | A scripted terminal and stubbed use cases                                                                  |

Tests that start the vault server (the MCP adapter and end-to-end CLI tests) are dropped for now (ADR-AIC-0010), so `adapter-vault-mcp` has no tests and passes with none. The vault's `domain` and `application` are tested in memory, with an in-memory `NoteStore` in `application/src/testing`. Each vault adapter has its own tests, and the tests of the composed vault run in `vault-server` against temporary vaults: the use cases through `composeVault`, the graph view's HTTP server over loopback, and the MCP tools through their handlers and one in-memory MCP client.
