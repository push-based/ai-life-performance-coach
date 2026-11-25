---
doc_type: adr
id: ADR-AIC-0058
title: "Give workstreams their own five-state lifecycle and distinct visuals in the vault graph"
summary: "Workstreams previously shared the four-value status vocabulary (todo, in-progress, blocked, done) with projects and areas and rendered identically in the vault graph regardless of state. Workstreams now use a dedicated five-state lifecycle (draft, ready, in-progress, finished, migrated) with legacy todo/done mapping, harvest_workstream automatically transitions finished workstreams to migrated on execution, and the vault graph renders each state with its own colour, ring or mark style, filter chip, and detail badge."
status: draft
initiative: "ai-coach"
owners: ["<team/org>"]
reviewers: []
date: 2026-11-25
links: ["ADR-AIC-0053","ADR-AIC-0057","ADR-KI-0062"]
tags: ["view","planning"]
---

# ADR-AIC-0058: Give workstreams their own five-state lifecycle and distinct visuals in the vault graph

## Context

ADR-KI-0062 defined one status vocabulary (`todo | in-progress | blocked | done`) shared by projects, workstreams and areas, and ADR-AIC-0053 separated active workstreams into their own **Workstreams** category in the vault graph. In practice, a workstream moves through a distinct lifecycle: drafting its scope, becoming ready to start, running in progress, finishing its tasks, and finally harvesting its reusable outputs into Intermediate Packets.

Because every active workstream rendered with the same solid teal dot in the vault graph, and `harvest_workstream` left a harvested workstream in `done`, the graph could not show at a glance which workstreams were still drafts, ready to start, actively running, waiting to be harvested, or already migrated to Intermediate Packets.

## Decision

1. **Dedicated five-state vocabulary for workstreams in `libs/vault/domain`.**
   - `WORKSTREAM_STATUSES` defines `draft | ready | in-progress | finished | migrated` and `WorkstreamStatus` types `Workstream.status`.
   - `STATUSES` (`todo | in-progress | blocked | done`) remains unchanged for projects and areas.
   - `parseWorkstreamStatus` maps legacy `todo` to `ready` and legacy `done` to `finished` when reading existing notes, while `set_frontmatter` and `create_workstream` validate workstream notes against `WORKSTREAM_STATUSES` (defaulting new workstreams to `draft`).
   - `planning` stops generating daily habit checks once a workstream is `finished` or `migrated`.
2. **Automatic transition to `migrated` when harvesting.**
   - `harvestWorkstream` accepts workstreams whose resolved status is `finished` (including legacy `done`).
   - When packets are written with no errors or collisions, `harvestWorkstream` plans a frontmatter update setting the workstream note's `status` to `migrated`, which `executeHarvest` applies alongside the new Intermediate Packet files.
3. **Expose `workstreamStatus` on `VaultViewGraph` nodes.**
   - `writeViewGraph` in `libs/vault/application` sets `workstreamStatus: WorkstreamStatus | null` for every workstream node, reading the note's own `status` frontmatter and falling back to the folder workstream's main note (`workstreamMainNotePath`) for nested notes.
4. **Render each workstream state distinctly in the vault graph view.**
   - `vault-view.html` defines `--ws-draft`, `--ws-ready`, `--ws-in-progress`, `--ws-finished`, and `--ws-migrated` tokens for both dark and light themes.
   - `vault-view.js` renders active workstream nodes by state: dashed outline with tinted fill (`draft`), hollow ring (`ready`), solid fill (`in-progress`), solid fill with checkmark (`finished`), and double ring (`migrated`).
   - The sidebar adds a **Workstream states** filter section with matching marks and counts, and the note detail panel shows the workstream's status badge.

## Consequences

- Active workstreams show their lifecycle stage directly in the vault graph and can be filtered by state.
- Harvesting a finished workstream automatically marks it `migrated`, keeping the graph and planning overview aligned with Intermediate Packet creation.
- Existing vault notes using `status: todo` or `status: done` on workstreams continue to parse cleanly without warnings.
- `docs/guide/vault-view.md`, `apps/vault-server` tool schemas/descriptions, and `.agents/skills` (`vault-planning`, `organize-projects`) are updated to document the five workstream states.

## Alternatives Considered

- **Reuse `STATUSES` for workstreams and add `draft`/`migrated` to projects and areas too.** Rejected: projects and areas do not get harvested into Intermediate Packets, and keeping their vocabulary focused avoids invalid combinations.
- **Keep `harvest_workstream` read-only on the workstream note and require a separate `set_frontmatter` call.** Rejected: leaving the transition manual causes finished and already-harvested workstreams to drift out of sync in the graph.
- **Distinguish workstream states by colour alone.** Rejected: combining distinct colours with distinct stroke and mark styles (dashed, hollow ring, solid, checkmark, double ring) keeps all five states legible in both themes and without relying on hue alone.
