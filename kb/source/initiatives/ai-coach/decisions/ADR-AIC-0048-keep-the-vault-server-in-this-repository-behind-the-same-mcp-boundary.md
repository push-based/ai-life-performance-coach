---
doc_type: adr
id: ADR-AIC-0048
title: 'Keep the vault server in this repository, behind the same MCP boundary'
status: accepted
initiative: ai-coach
date: 2026-11-15
aliases: ['ADR-0048']
tags: []
links: ['ADR-AIC-0007', 'ADR-AIC-0008', 'ADR-AIC-0009', 'ADR-AIC-0010', 'ADR-AIC-0011', 'ADR-AIC-0033']
---

# ADR-AIC-0048: Keep the vault server in this repository, behind the same MCP boundary

## Context

ADR-AIC-0003 put every read and write of the vault behind the vault server of kb-template, a separate repository, and said ai-coach never changes kb-template. In practice the vault server was built for ai-coach alone: kb-template's vault-mode decisions (its RFC-KI-0042 and ADR-KI-0058 to ADR-KI-0071) were all made to serve the coach, and that code sat unmerged on a branch, `ar/ai-coach`, of a repository that is otherwise a template for documentation workspaces.

This had costs:

- ai-coach ran only next to a built checkout of kb-template, found by an absolute path in `coach.config.json` and `.mcp.json`, and kb-template is not public.
- Most new coach features needed a change in both repositories, made, reviewed and released separately.
- CI could not run anything that needed the server (ADR-AIC-0010).

The vault code had few ties to the rest of kb-template. Its only imports from kb-template's own core were two frontmatter helpers, and the vault server was already a separate MCP server from kb-template's documentation server (observed: kb-template `ar/ai-coach` @ f184c18, 2026-11-15).

## Decision

1. **The vault lives in this repository.** Three projects hold it:
   - `packages/vault` (`@ai-coach/vault`): the engine that reads and writes the vault.
   - `packages/vault-server` (`@ai-coach/vault-server`): the MCP vault server and the graph view, run as the `coach-vault` binary (`serve` and `view`).
   - `apps/climb-board`: the Angular drawing board of the climb page. Its build is committed under `packages/vault/assets/climb-board/`.

   They were imported from kb-template `ar/ai-coach` @ f184c18 with their git history.

2. **The boundary of ADR-AIC-0003 stays.** ai-coach reads and writes the vault only through the vault server's tools, over MCP on stdio. It never opens vault files and never writes `Coach/` directly. `domain`, `application`, the adapters and `cli` never import `@ai-coach/vault` or `@ai-coach/vault-server`. The Nx tags `type:vault` and `type:vault-server` enforce this (ADR-AIC-0008): a vault project may depend only on `type:vault`, and nothing else may depend on either.
3. **The server is started as before:** `node <docsMcpBin> serve --vault <path>` for each command, and `node <docsMcpBin> view --vault <path>` for `coach view`. `docsMcpBin` now defaults to `packages/vault-server/dist/main.js` in this checkout; `DOCS_MCP_BIN` and the config still override it. The names `docsMcpBin`, `DOCS_MCP_BIN`, `DOCS_MCP_VAULT` and `~/.config/docs-mcp/config.json` are kept, so existing configurations keep working.
4. **New vault abilities are made here,** in `packages/vault` and `packages/vault-server`, and reach the coach as a server tool that `adapter-vault-mcp` wraps. This replaces ADR-AIC-0003 Decision 2.
5. **The rest of ADR-AIC-0003 carries over unchanged:**
   - The vault path is configurable and never hard-coded.
   - A sparred note is identified by its `coach_id`.
   - Only notes under `3.Resources` are sparred, and the server derives mastery from sessions.
   - Every write previews first and executes only with `execute: true` after the user confirms (ADR-AIC-0009).
   - The session history for scheduling comes from `read_note` (ADR-AIC-0007).
6. **The imported code follows this repository's rules.**
   - Comments are removed (ADR-AIC-0011); a `catch` that held only a comment now says what it does.
   - It is formatted with this repository's Prettier.
   - Six imported commit subjects were reworded to pass commitlint (ADR-AIC-0033).
7. **The reasons behind the vault's existing behaviour stay where they were made,** in kb-template's ADR-KI-0058 to ADR-KI-0071, which this repository cites by ID. New decisions about the vault are recorded here.

## Consequences

- ai-coach runs from one checkout, and kb-template is no longer needed.
- One `nx run-many -t lint test build typecheck` covers the coach and the vault, including the vault's own tests.
- The reason ADR-AIC-0010 gave for dropping the server-dependent tests (CI lacks a kb-template checkout) no longer holds. Whether to bring those tests back is a separate decision.
- The import was checked against kb-template on a copy of a real vault (2026-11-15):
  - The view's graph, note, plans and climb data were identical.
  - The server offers the same 38 tools.
  - `list_notes`, `due_for_review`, `vault_graph`, `search` and `planning_overview` replied identically.
  - Only the JSON Schema spelling of nullable fields changed, from zod 4.3 to 4.6.
- The workspace now installs Angular for `apps/climb-board`. CI does not build the board. After changing it, run `npm run build:board -w @ai-coach/climb-board` and commit the output.
- The known server gap from ADR-AIC-0003 is now this repository's to fix: search folds `ż`, `ó`, `ę`, `ś` but not `ł`.
- What happens to the vault code and ADR-KI-0058 to ADR-KI-0071 in kb-template is decided there (TBD).
