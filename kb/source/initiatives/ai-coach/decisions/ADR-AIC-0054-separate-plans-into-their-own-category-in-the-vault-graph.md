---
doc_type: adr
id: ADR-AIC-0054
title: "Separate plans into their own category in the vault graph"
summary: "Notes under Plans/ were previously displayed in the vault graph as Out of place because Plans/ sits beside the five PARA folders and has no ParaBucket. VaultViewGraph nodes now carry a plan boolean computed by isPlanPath in libs/vault/domain, and the vault graph view displays them in their own Plans category while leaving only truly unfiled notes under Out of place."
status: accepted
initiative: "ai-coach"
owners: []
reviewers: []
date: 2026-11-21
links: ["ADR-AIC-0052","ADR-AIC-0053","ADR-KI-0062"]
tags: []
---

# ADR-AIC-0054: Separate plans into their own category in the vault graph

## Context

ADR-KI-0062 places yearly, quarterly, monthly, weekly and daily plans and their templates under `Plans/` at the vault root, outside the five PARA folders. Because `classify()` returns `bucket: null` for any note outside the five PARA folders, the vault graph view (`libs/vault/adapter-view/assets/vault-view.js`) lumped every note under `Plans/` into the `Out of place` (`none`) category (observed: live vault graph at `http://127.0.0.1:4747/graph.json` @ 2026-11-21 showed 27 nodes under `Out of place`, of which 24 were under `Plans/` and only 3 were unfiled root notes).

## Decision

1. **Detect planning paths in the vault domain.** `isPlanPath(relPath)` in `libs/vault/domain` returns `true` for any note under `Plans/`. `ParaBucket` and `classify()` remain the five top-level PARA folders unchanged.
2. **Expose `plan: boolean` on every `VaultViewGraph` node.** `writeViewGraph` in `libs/vault/application` sets `plan: isPlanPath(n.id)` while keeping `bucket: null`.
3. **Display planning notes in their own `Plans` category in the vault graph view.**
   - `BUCKETS` in `vault-view.js` adds `['plans', 'Plans']` with dedicated `--plans` CSS colour tokens for dark and light themes in `vault-view.html`.
   - `bucketOf(n)` maps nodes where `n.plan` is `true` to `'plans'`, leaving only genuinely unfiled notes outside PARA and `Plans/` in `'none'` (`Out of place`).
   - The note detail panel shows the eyebrow `Plan` for planning notes.

## Consequences

- Planning notes under `Plans/` are visually distinct, clustered together, counted separately in the overview bar, and independently filterable in the vault graph.
- `Out of place` reflects only notes that genuinely sit outside PARA and `Plans/`.
- `ParaBucket` semantics in `libs/vault/domain` and `graph.json` stay backwards-compatible.
- `docs/guide/vault-view.md` documents the `Plans` graph category.

## Alternatives Considered

- **Add `plans` to `ParaBucket` in `libs/vault/domain`.** Rejected: `Plans/` is explicitly outside PARA (ADR-KI-0062 Decision 6), and filing and `init_vault` treat `ParaBucket` as the five PARA folders.
- **Exclude `Plans/` from `Out of place` by matching the path prefix in `vault-view.js`.** Rejected: `PLANS_ROOT` is a domain constant in `libs/vault/domain` and should not be duplicated in view assets (ADR-AIC-0052).
