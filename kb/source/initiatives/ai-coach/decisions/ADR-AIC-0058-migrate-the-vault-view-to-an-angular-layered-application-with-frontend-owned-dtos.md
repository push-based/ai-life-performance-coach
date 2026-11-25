---
doc_type: adr
id: ADR-AIC-0058
title: "Migrate the vault view to an Angular layered application with frontend-owned DTOs"
summary: "The vault view UI grew to over 7,400 lines of untyped vanilla HTML and JavaScript inside libs/vault/adapter-view/assets alongside a separate Angular climb-board app. We introduce a single Angular 21 layered application (scope:vault-view, architecture:layered) with strict frontend-owned HTTP DTOs, built as an Nx task dependency of vault-adapter-view and migrated incrementally across six pull requests while keeping scope:vault strictly hexagonal."
status: draft
initiative: "ai-coach"
owners: ["<team/org>"]
reviewers: []
date: 2026-11-25
links: ["ADR-AIC-0051","ADR-AIC-0052"]
tags: ["view","architecture","angular"]
---

# ADR-AIC-0058: Migrate the vault view to an Angular layered application with frontend-owned DTOs

## Context

The vault view UI under `libs/vault/adapter-view/assets/` grew to roughly 7,400 lines across three separate vanilla HTML/JS pages (`vault-view`, `plans-view`, `climb-view`), duplicating CSS tokens, header chrome, theme state, and keyboard shortcut handling, while `apps/climb-board` already uses Angular 21 inside the same workspace.

At the same time, ADR-AIC-0051 established two distinct architectural styles enforced by `@nx/enforce-module-boundaries`: `architecture:hexagonal` (`type:domain`, `type:application`, `type:adapter`) for the core and server libraries, and `architecture:layered` (`type:feat`, `type:ui`, `type:data-access`, `type:util`) for frontend apps. `libs/vault/adapter-view/src/view.ts` already exposes a clean JSON/HTTP boundary (`/graph.json`, `/plans.json`, `/climb.json`, `/page.json`, `/note.json`, `/api/*`) under a strict loopback CSP.

## Decision

1. **Introduce `scope:vault-view` under `architecture:layered`.**
   - `apps/vault-view` (`type:app`) is an Angular 21 zoneless standalone application hosting the shared shell, router (`/`, `/plans`, `/climb`), theme, Present mode (`P`), and `x-vault-token` HTTP interceptor.
   - Layered internal libraries live under `libs/vault-view/`: `util` (`type:util`, pure TypeScript tested with Vitest), `data-access` (`type:data-access`, signal stores, HTTP clients, and frontend-owned DTOs), `ui` (`type:ui`, presentational components), and feature libraries (`feat-plans`, `feat-climb`, `feat-graph`, `type:feat`) added in subsequent PRs.
   - `eslint.config.mjs` constrains `scope:vault-view` to `scope:vault-view` and `scope:shared`, keeping `architecture:layered` strictly separated from `architecture:hexagonal`.
2. **Keep HTTP DTOs strictly frontend-owned.**
   - `libs/vault-view/data-access` defines the JSON response and request types it consumes rather than importing backend domain or application types, preserving full decoupling across the HTTP boundary.
3. **Wire `@ai-coach/vault-view:build` as an Nx task dependency of `@ai-coach/vault-adapter-view:build`.**
   - Built browser assets are produced into `apps/vault-view/dist/browser/` and served by `libs/vault/adapter-view/src/view.ts` under the existing strict CSP, without committing compiled JS bundles to git.
4. **Migrate incrementally across six PRs.**
   - PR 1: Shell, routing, theme, shortcuts, API token interceptor, Nx build dependency, served at `/app` alongside legacy pages.
   - PR 2: Plans page (`/plans`).
   - PR 3: Climb page (`/climb`) absorbing `apps/climb-board`.
   - PR 4: Vault graph filters, overview, detail panels, and note reader.
   - PR 5: Interactive SVG force graph canvas.
   - PR 6: Distill editor (passage marking and focus reader) and removal of legacy vanilla assets.

## Consequences

- `libs/vault/adapter-view` becomes a pure hexagonal HTTP driving adapter once the legacy assets are retired, while the UI gains TypeScript safety, signals, component reuse, and Vitest unit testing.
- Building `vault-adapter-view`, `vault-server`, or `cli` automatically builds `vault-view` via Nx caching, with no generated bundles checked into git.
- Because DTOs are frontend-owned, backend JSON contract changes must be reflected in `libs/vault-view/data-access` and verified by integration tests.

## Alternatives Considered

- **Continue extending the vanilla HTML/JS assets.** Rejected: ~7,400 lines of untyped imperative DOM code with three duplicated page shells slows down new UI work and makes refactoring error-prone.
- **Share backend types via a `libs/shared/view-contract` library.** Rejected: the team prefers strict frontend-owned DTOs so the Angular app remains completely decoupled from backend library changes.
- **Commit built Angular bundles into `libs/vault/adapter-view/assets/` like `apps/climb-board`.** Rejected: committing compiled bundles creates noisy PR diffs on every UI change; an Nx build dependency gives clean diffs and cached builds.
