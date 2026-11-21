---
doc_type: adr
id: ADR-AIC-0053
title: "Separate workstreams into their own category in the vault graph"
summary: "Notes under 1.Projects/<Project>/Workstreams/ were previously rendered in the vault graph as Projects because graph categorization read only the top-level PARA bucket. VaultViewGraph nodes now carry a workstream boolean computed by isWorkstreamPath in libs/vault/domain, and the vault graph view displays active workstreams in their own Workstreams category with its own colour, filter chip, layout anchor and overview count while keeping ParaBucket unchanged and archived workstreams under Archive."
status: accepted
initiative: "ai-coach"
owners: []
reviewers: []
date: 2026-11-21
links: ["ADR-AIC-0048","ADR-AIC-0052","ADR-KI-0062"]
tags: []
---

# ADR-AIC-0053: Separate workstreams into their own category in the vault graph

## Context

ADR-KI-0062 splits each project into workstreams under `1.Projects/<Project>/Workstreams/`, either as a single note (`Workstreams/<Name>.md`) or a folder of notes (`Workstreams/<Name>/...`).

In the vault graph view (`libs/vault/adapter-view/assets/vault-view.js`), every node's colour, filter chip, layout anchor and overview bar segment was derived solely from its top-level `ParaBucket` (`inbox`, `projects`, `areas`, `resources`, `archive`, `none`). Because workstreams live inside `1.Projects/`, all workstream notes were displayed, coloured and counted as `Projects` (observed: live vault graph at `http://127.0.0.1:4747/graph.json` @ 2026-11-21 showed 32 nodes under `Projects`, of which 26 were under `Workstreams/` and 6 were project notes).

## Decision

1. **Detect workstream paths in the vault domain.** `isWorkstreamPath(relPath)` in `libs/vault/domain` returns `true` for any note under `1.Projects/<Project>/Workstreams/` or `4.Archive/<Project>/Workstreams/`. `ParaBucket` and `classify()` remain the five top-level PARA folders unchanged.
2. **Expose `workstream: boolean` on every `VaultViewGraph` node.** `writeViewGraph` in `libs/vault/application` sets `workstream: isWorkstreamPath(n.id)` while keeping `bucket` as the node's `ParaBucket | null`.
3. **Display active workstreams in their own `Workstreams` category in the vault graph view.**
   - `BUCKETS` in `vault-view.js` adds `['workstreams', 'Workstreams']` directly after `Projects`, with dedicated `--workstreams` CSS colour tokens for dark and light themes in `vault-view.html`.
   - `bucketOf(n)` maps nodes where `n.workstream && n.bucket === 'projects'` to `'workstreams'`. Archived workstreams (`n.bucket === 'archive'`) remain in `'archive'` so toggling Archive continues to hide or show all archived notes together.
   - The note detail panel shows the eyebrow `Workstream` for non-concept, non-raw workstream notes.

## Consequences

- Project notes and active workstream notes are visually distinct, clustered separately, counted separately in the overview bar, and independently filterable in the vault graph.
- `ParaBucket` semantics in `libs/vault/domain` and `graph.json` stay backwards-compatible for all filing, archiving and planning use cases.
- Archived workstreams do not leak into the active graph when the `Archive` filter is off.
- `docs/guide/vault-view.md` documents the `Workstreams` graph category.

## Alternatives Considered

- **Add `workstreams` to `ParaBucket` in `libs/vault/domain`.** Rejected: `ParaBucket` models the five top-level PARA folders (`0.Inbox` through `4.Archive`) used by filing, archiving and `init_vault`; a workstream is a subfolder inside a project, not a sixth PARA root.
- **Classify workstreams in the browser by parsing node path strings.** Rejected: path conventions (`WORKSTREAMS_FOLDER`) belong in `libs/vault/domain`, not duplicated in view assets (ADR-AIC-0052).
- **Show workstreams under the `Kinds` filter instead of the `PARA` category list.** Rejected: workstreams were being misattributed to `Projects` in the category list, colour scheme and overview bar; giving them a category beside `Projects` directly separates them from project notes.
