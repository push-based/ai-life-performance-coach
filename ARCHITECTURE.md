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

- **The vault server** (`packages/vault-server`, run as `coach-vault`) owns the vault. It is the only program that reads or writes vault files (ADR-AIC-0048). It was written for ai-coach in a branch of kb-template and moved here with its history; only three small files come from kb-template itself (see [Code from kb-template](README.md#code-from-kb-template)). The reasons for its behaviour are the ADR-KI-0058 to ADR-KI-0071 written there, which moved here too (ADR-AIC-0049). It keeps the PARA layout, converts PDFs into chapter notes, checks quotes against books, keeps the sparring history in `Coach/sessions/`, runs the planning model in `Plans/`, and serves the graph view on port 4747. Every write it offers is a preview until called with `execute`.
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

The ports are the interfaces in `packages/application/src/lib/ports/`: the vault ports in `vault.ts` and `library.ts`, the model ports in `models.ts` and `library.ts`, and the local state in `state.ts`. Each group has one adapter. `McpVault` implements all four vault ports, each local model port has its own `Ollama…` class, `GeminiJudge` is the judge, and `FilePendingJudgements` and `SystemClock` keep the local state. Only `cli` knows the adapters: `composeCoach` plugs them into the use cases.

| Project               | Tag                                   | Contains                                                                                                                                                                                                                                                  | May import                                                    |
| --------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `domain`              | `type:domain`                         | The sparring round aggregate, sparring rules, coaching styles, buzzword and verbatim checks, the review ladder, the judge's verdict rule, the Tier 2 payload invariant, study rounds, synthesis checks, the climb's steps, domain errors                  | `domain` only; no npm package, no Node built-in               |
| `application`         | `type:application`                    | Use cases (`Review`, `Filing`, `Sparring`, `SparringConversation`, `Judging`, `Studying`, `Synthesizing`, `Climbing`, `Generating`, `Elaborating`, `Grouping`, `Reading`, `Teaching`), the ports they need, application errors, in-memory fakes for tests | `domain`; no npm package, no Node built-in                    |
| `adapter-vault-mcp`   | `type:adapter`, `adapter:vault-mcp`   | `McpVault` and `VaultClient`: the vault and library ports over the vault server's MCP tools                                                                                                                                                               | core; `@modelcontextprotocol/sdk`, `zod`, Node                |
| `adapter-ollama`      | `type:adapter`, `adapter:ollama`      | The seven Gemma partners (sparring, study, style, synthesis, elaboration, structure, teach) and `OllamaClient`: prompts, fencing, structured replies, the loopback-only guard                                                                             | core; `zod`, Node                                             |
| `adapter-gemini`      | `type:adapter`, `adapter:gemini`      | `GeminiJudge`: the blind claim-extraction protocol, fallback model, boundary re-check of the payload                                                                                                                                                      | core; `@google/genai`, `zod`, Node                            |
| `adapter-local-state` | `type:adapter`, `adapter:local-state` | `FilePendingJudgements`, `SystemClock`                                                                                                                                                                                                                    | core; `zod`, Node                                             |
| `cli`                 | `type:app`                            | Terminal I/O, config, commands, and `composeCoach`, the only place a port meets its adapter                                                                                                                                                               | everything                                                    |
| `vault`               | `type:vault`                          | The vault engine: PARA scan, search, link graph, sessions and mastery, book conversion, concepts, the climb, filing, planning, and the graph view's HTTP server and pages                                                                                 | `vault` only; `gray-matter`, `flexsearch`, `pdfjs-dist`, Node |
| `vault-server`        | `type:vault-server`                   | The MCP vault server and the `coach-vault` binary (`serve`, `view`): one tool per vault ability                                                                                                                                                           | `vault`; `@modelcontextprotocol/sdk`, `zod`, Node             |
| `climb-board`         | `type:vault-asset`                    | The Angular drawing board of the climb page, built into `vault`'s assets                                                                                                                                                                                  | Angular, `ng-diagram`                                         |

Adapters never import each other, and nothing imports the `cli`. Nothing in the coach imports `vault` or `vault-server` either: the coach reaches the vault only over MCP, through `adapter-vault-mcp` (ADR-AIC-0048). Each package's README says what it does in plain words:

| Package                                                         | In one line                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`domain`](packages/domain/README.md)                           | The rules of learning: rounds, verdicts, the review schedule. No I/O at all.    |
| [`application`](packages/application/README.md)                 | The things you can do (spar, judge, study, synthesize) and the ports they need. |
| [`adapter-ollama`](packages/adapter-ollama/README.md)           | The local sparring partner, powered by Gemma.                                   |
| [`adapter-gemini`](packages/adapter-gemini/README.md)           | The online judge, powered by Gemini.                                            |
| [`adapter-vault-mcp`](packages/adapter-vault-mcp/README.md)     | Talks to your vault through the vault server.                                   |
| [`adapter-local-state`](packages/adapter-local-state/README.md) | Remembers which sessions are waiting for the judge, and what day it is.         |
| [`cli`](packages/cli/README.md)                                 | The `coach` command you type.                                                   |
| [`vault`](packages/vault/README.md)                             | Reads and writes your vault, and serves the graph view.                         |
| [`vault-server`](packages/vault-server/README.md)               | Offers the vault as MCP tools to the coach and to AI agents.                    |
| [`climb-board`](apps/climb-board/README.md)                     | The drawing board on the climb page.                                            |

## Ports and who provides them

| Port                                                          | File                             | Adapter                                      |
| ------------------------------------------------------------- | -------------------------------- | -------------------------------------------- |
| `NotesRepository`, `SessionLog`, `VaultFiling`                | `application/…/ports/vault.ts`   | `adapter-vault-mcp`                          |
| `Library`                                                     | `application/…/ports/library.ts` | `adapter-vault-mcp`                          |
| `SparringPartner`, `StudyPartner`, `StyleClassifier`, `Judge` | `application/…/ports/models.ts`  | `adapter-ollama`, `adapter-gemini` (`Judge`) |
| `SynthesisPartner`                                            | `application/…/ports/library.ts` | `adapter-ollama`                             |
| `PendingJudgements`, `Clock`                                  | `application/…/ports/state.ts`   | `adapter-local-state`                        |

## Rules

- Dependencies point inward. Ports are shaped by what the use cases need, not by a tool's API.
- Business rules live in the domain, in objects that guard their own invariants: a `SparringRound` will not accept a challenge that quotes the note, and `tier2Payload()` rejects any field other than `challenge`, `answer` and the coaching `style` (plus core assertions when allowed, ADR-AIC-0025).
- Use cases orchestrate: they load through ports, let the domain decide, and save through ports.
- Every write to the vault is a preview first and an execute only after the user confirms (ADR-AIC-0009).
- Adapters translate technology failures into application errors (`UnavailableError`, `UnusableReplyError`, `VaultRefusedError`); the CLI turns those into messages and exit codes.
- The only data that may leave the machine is a `Tier2Payload`. The Gemini adapter accepts nothing else and re-checks it.
- Source code carries no comments (ADR-AIC-0011). Names and tests carry the meaning.

## Enforcement

`npm exec nx run-many -- -t lint` runs `@nx/enforce-module-boundaries` with the tags above:

- `onlyDependOnLibsWithTags` keeps dependencies inward and stops adapters importing each other.
- `type:vault` may depend only on `type:vault`, and `type:vault-server` only on `type:vault`. No other tag lists either, so nothing in the coach can import the vault.
- `allowedExternalImports` is a whitelist per tag: empty for `domain` and `application`, and only its own SDK for each adapter.
- `no-restricted-imports` bans Node built-ins in `domain` and `application`, which the whitelist does not cover.
- Circular project dependencies are errors.

## Tests

| Level     | Where                                                     | Against                                                                                                    |
| --------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Domain    | `domain`                                                  | Plain functions and objects                                                                                |
| Use cases | `application`                                             | In-memory adapters in `src/testing`, including a check that a planted private line never reaches the judge |
| Adapters  | `adapter-ollama`, `adapter-gemini`, `adapter-local-state` | A loopback HTTP server for Ollama, the real Gemini SDK with a fake client, a temporary directory           |
| CLI       | `cli`                                                     | A scripted terminal and stubbed use cases                                                                  |

Tests that start the vault server (the MCP adapter and end-to-end CLI tests) are dropped for now (ADR-AIC-0010), so `adapter-vault-mcp` has no tests and passes with none. The vault server's own packages are tested against temporary vaults: `vault` through its functions and the graph view's HTTP server, `vault-server` through its tool handlers and one in-memory MCP client.
