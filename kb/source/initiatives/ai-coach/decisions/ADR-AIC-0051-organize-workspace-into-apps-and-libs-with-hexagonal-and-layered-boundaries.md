---
doc_type: adr
id: ADR-AIC-0051
title: "Organize workspace into apps and libs with hexagonal and layered module boundaries"
summary: "All executable code and libraries move out of packages/ into apps/ and domain-grouped libs/, while non-code content stays at root (kb/, docs/). Two architectural styles coexist under @nx/enforce-module-boundaries: architecture:hexagonal for backend domains (coach and vault) and architecture:layered (feat, ui, data-access, util) for frontend apps, isolated by scope:* with an optional pure scope:shared utility layer."
status: accepted
initiative: "ai-coach"
owners: []
reviewers: []
date: 2026-11-20
links: ["ADR-AIC-0001","ADR-AIC-0008","ADR-AIC-0032","ADR-AIC-0048","ADR-AIC-0049"]
tags: []
---

# ADR-AIC-0051: Organize workspace into apps and libs with hexagonal and layered module boundaries

## Context

ADR-AIC-0008 structured the coach as ports and adapters inside a flat `packages/` directory alongside `apps/climb-board` and `apps/docs` (observed: repository @ 2026-11-20). As the workspace grew to include the vault server (`vault`, `vault-server`, ADR-AIC-0048) and frontend applications (`climb-board`, `docs`), three limitations emerged:

1. Runnable applications (`cli`, `vault-server`) lived in `packages/` alongside libraries, while frontend apps lived in `apps/`.
2. The flat `packages/` layout mixed unrelated domains (`coach` and `vault`) and gave no clear home for future frontend libraries.
3. The `@nx/enforce-module-boundaries` rules only modeled hexagonal backend layers and lacked support for a layered frontend architecture (`feat`, `ui`, `data-access`, `util`) or cross-domain `scope:*` isolation.

## Decision

1. **All executable code and libraries live in `apps/` and `libs/`.** The `packages/` directory is removed. npm workspaces are `["apps/*", "libs/*/*"]`. Non-code repository content stays at the root (`kb/`, `docs/`, `README.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, per ADR-AIC-0032 and ADR-AIC-0049).
2. **Applications live in `apps/`:**
   - `apps/cli` (`@ai-coach/cli`) — composition root and terminal entry point for `coach`.
   - `apps/vault-server` (`@ai-coach/vault-server`) — MCP server and `coach-vault` binary for `vault`.
   - `apps/climb-board` (`@ai-coach/climb-board`) — Angular drawing board for `/climb`.
   - `apps/docs` (`@ai-coach/docs`) — Docusaurus documentation site.
3. **Libraries live in `libs/<domain>/<lib>/`, grouped by domain:**
   - `libs/coach/`: `domain`, `application`, `adapter-vault-mcp`, `adapter-ollama`, `adapter-gemini`, `adapter-local-state`.
   - `libs/vault/`: `core` in stage 1 (migrated from `packages/vault`), to be refactored in stage 2 into hexagonal libraries (`domain`, `application`, `adapter-*`) with `apps/vault-server` as its composition root.
   - `libs/shared/`: pure TypeScript `type:util` libraries shared across scopes when needed (no npm dependencies, no Node built-ins).
   - Frontend domains (such as `libs/climb-board/` or future UI domains): `feat-*`, `ui-*`, `data-access-*`, `util-*`.
4. **Every project carries three tag dimensions enforced by `@nx/enforce-module-boundaries`:**
   - **Domain scope (`scope:*`)**: `scope:coach`, `scope:vault`, `scope:climb-board`, `scope:docs`, `scope:shared`. Every domain scope may depend only on itself and `scope:shared`. `scope:coach` and `scope:vault` cannot import each other (preserving ADR-AIC-0048). `scope:shared` may depend only on `scope:shared` and allows no external npm imports.
   - **Architecture style (`architecture:*`)**: `architecture:hexagonal` (may depend on `architecture:hexagonal` and `scope:shared`) and `architecture:layered` (may depend on `architecture:layered` and `scope:shared`).
   - **Layer type (`type:*`)**:
     - Hexagonal: `type:domain` -> `type:domain`, `type:util` (no external imports); `type:application` -> `type:domain`, `type:application`, `type:util` (no external imports); `type:adapter` -> `type:domain`, `type:application`, `type:util`. `type:vault` is a transitional tag for `libs/vault/core` until the stage 2 hexagonal refactor removes it.
     - Layered (frontend): `type:feat` -> `type:ui`, `type:data-access`, `type:util` (no `feat` -> `feat`); `type:ui` -> `type:ui`, `type:util`; `type:data-access` -> `type:data-access`, `type:util`; `type:util` -> `type:util`.
     - Applications: `type:app` -> any library type permitted by the app's `scope:*` and `architecture:*` tags.
   - **External import whitelists**: per-adapter (`adapter:vault-mcp`, `adapter:ollama`, `adapter:gemini`, `adapter:local-state`) and per-app (`app:cli`, `app:vault-server`) tags restrict third-party and Node imports.
5. **`no-restricted-imports` bans Node built-ins** in `libs/*/domain/src/**/*.ts`, `libs/*/application/src/**/*.ts`, and `libs/shared/*/src/**/*.ts`, keeping hexagonal cores and shared utilities pure TypeScript.
6. **Staged rollout:** Stage 1 (this change) moves `packages/` into `apps/` and `libs/`, updates ESLint boundaries, project configs, and documentation. Stage 2 refactors `libs/vault/core` into hexagonal libraries under `libs/vault/` and removes the transitional `type:vault` tag.

This ADR supersedes ADR-AIC-0008. All hexagonal invariants from ADR-AIC-0008 (inward-only dependencies, manual composition root, error translation in adapters, no circular dependencies) remain in force.

## Consequences

- Every runnable entry point is in `apps/`, and every library is grouped by domain in `libs/<domain>/<lib>`.
- Backend domains (`coach`, `vault`) and frontend apps (`climb-board`, `docs`, future UIs) follow explicit, lint-enforced boundaries without leaking across architectures or domains.
- Pure `scope:shared` `type:util` libraries can be imported by any scope, including hexagonal `domain` and `application`, without compromising purity.
- Paths in `package.json`, `tsconfig.json`, `apps/docs`, `.mcp.example.json`, and setup guides change from `packages/` to `apps/` and `libs/`. Existing local MCP configurations pointing at `packages/vault-server/dist/main.js` must be updated to `apps/vault-server/dist/main.js`.

## Alternatives Considered

- **Keep `packages/` flat and add frontend libs alongside backend packages.** Rejected: mixes apps with libs and obscures domain ownership as more domains and frontend libraries are added.
- **Move `kb/` and `docs/` into `apps/`.** Rejected: `kb/` and `docs/guide/` are non-code Markdown content, not runnable applications; keeping them at root preserves GitHub browsability and ADR-AIC-0032 / ADR-AIC-0049.
- **Keep `libs/vault/core` permanently outside hexagonal architecture.** Rejected: applying the same hexagonal pattern to `vault` in stage 2 makes backend architecture uniform across the repository.
