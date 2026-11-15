---
doc_type: adr
id: ADR-AIC-0049
title: "Keep the decision records in a kb-kit knowledge base"
summary: "The decision records move from docs/adr/ into kb/, a kb-kit workspace that the docs-mcp engine checks and serves to agents over MCP, together with the vault decisions that were left in kb-template."
status: draft
initiative: "ai-coach"
owners: []
reviewers: []
date: 2026-11-15
links: ["ADR-AIC-0001","ADR-AIC-0032","ADR-AIC-0034","ADR-AIC-0048"]
tags: []
---

# ADR-AIC-0049: Keep the decision records in a kb-kit knowledge base

## Context

ADR-AIC-0001 put the decision records in `docs/adr/`, one file each, with `README.md` as an index kept by hand and `template.md` to copy. Nothing checked a record's fields, its links, or that a superseded record named its successor, and an agent that needed a decision had to read the index and open files.

ADR-AIC-0048 moved the vault server into this repository but left the reasons for its behaviour, ADR-KI-0058 to ADR-KI-0071 and RFC-KI-0042, in kb-template. kb-template is not public, so a reader of this repository could not open them, although this repository cites them by ID (observed: 66 mentions, 2026-11-15).

kb-kit is a set of agent skills on the docs-mcp engine. The engine validates a folder of decisions, questions and evidence, indexes it, and serves it to agents over MCP. Version 3 of the engine is not on npm (observed: 2026-11-15).

## Decision

1. **The decision records live in `kb/`,** a kb-kit workspace for docs-mcp 3. `kb/docs-mcp.config.json` is its contract: document types, statuses, ID rules and the ADR template. This replaces ADR-AIC-0001 Decision 1.
2. **The workspace has two initiatives.**
   - `ai-coach`, prefix `AIC`: the coach's own decisions. ADR-0001 to ADR-0048 became ADR-AIC-0001 to ADR-AIC-0048 and moved with their git history. Each keeps its old ID in `aliases`.
   - `vault`, prefix `KI`: ADR-KI-0058 to ADR-KI-0071 and RFC-KI-0042, copied from kb-template `ar/ai-coach` @ f184c18 with their IDs and text unchanged. Their frontmatter links to kb-template documents that did not come along were dropped. This replaces ADR-AIC-0048 Decision 7.

   New decisions about the vault go in `ai-coach`, as ADR-AIC-0048 says.
3. **A record's fields follow the engine's schema.** It has `doc_type` and `initiative`. A replaced record names its successor in `succeeded_by`; the successor names nothing, so `supersedes` and `superseded_by` are gone. A record that is replaced only in part keeps its status and still names the newer record in `succeeded_by`. This replaces the field named in ADR-AIC-0001 Decision 4.
4. **Status is one of `draft`, `accepted`, `rejected` or `superseded`.** `proposed` became `draft`. This replaces ADR-AIC-0001 Decision 5. The rest of ADR-AIC-0001 stands: what counts as an important change, that the record ships in the same commit, and that an accepted record is not rewritten.
5. **A record has `Context`, `Decision` and `Consequences`;** `Alternatives Considered` is optional. `docs-mcp check` enforces this, so `template.md` is gone. The hand-kept index is gone too: the docs site lists the records from their files.
6. **A new record is written through the engine,** with the `upsert_document` tool or `docs-mcp upsert`, which give it the next ID and its file name. A status changes with the `transition_status` tool. `docs-mcp check`, run in `kb/`, passes before the commit.
7. **Agents reach the records over MCP.** The server is `docs-mcp serve`, run in `kb/`; `.mcp.example.json` has the entry, named `ai-coach-kb`. `docs-mcp` is expected on the `PATH` until the engine is on npm, and CI does not run `docs-mcp check` until then.
8. **The docs site builds the decision pages from `kb/source/initiatives/ai-coach/decisions/`,** at the addresses they had before (ADR-AIC-0032). The `vault` initiative is not on the site.
9. **Prettier does not format `kb/`.** The engine writes those files.

## Consequences

- An agent can search the decisions, read one by ID and follow its links, instead of reading an index.
- The reasons behind the vault's behaviour are public and sit in the same graph as the coach's decisions.
- Every `ADR-NNNN` in this repository's docs became `ADR-AIC-NNNN`. Commit messages and text outside this repository keep the old IDs.
- `docs-mcp check` passes with 70 warnings (observed: 2026-11-15): 25 records that are not drafts name no owners and no reviewers, and 20 links point at a superseded record. The coach's records have no tags and no summaries.
- Adding a record needs the docs-mcp engine, which is not on npm yet.
- The workspace follows the engine's major version. When the engine changes the workspace's contract, `docs-mcp migrate` brings `kb/` up to date.
- Two decisions wait on a draft: ADR-AIC-0024 would replace ADR-AIC-0016, and ADR-AIC-0025 would replace ADR-AIC-0021. Until they are accepted, each draft only links the record it would replace.

## Alternatives Considered

- **Keep `docs/adr/` and copy the records into a knowledge base.** Every decision would have two homes that drift apart.
- **Make the repository root the workspace.** `docs-mcp init` keeps an existing `AGENTS.md`, `CLAUDE.md` and `README.md`, so the workspace's own rules would be missing, and its folders would sit among the Nx projects.
