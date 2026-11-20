---
doc_type: adr
id: ADR-AIC-0052
title: "Split the vault into hexagonal domain, application and adapter libraries"
summary: "Stage 2 of ADR-AIC-0051: libs/vault/core is split into libs/vault/domain, libs/vault/application and one adapter library per outside dependency (file system, frontmatter, full-text search, PDF, view server), with apps/vault-server as the composition root. Planners read a VaultTree snapshot loaded through an async-only NoteStore port, frontmatter parsing sits behind a port, and posix path helpers move to a pure libs/shared/util-path."
status: draft
initiative: "ai-coach"
owners: []
reviewers: []
date: 2026-11-20
links: ["ADR-AIC-0051","ADR-AIC-0008","ADR-AIC-0048","ADR-AIC-0011"]
---

# ADR-AIC-0052: Split the vault into hexagonal domain, application and adapter libraries

## Context

ADR-AIC-0051 moved the vault into `libs/vault/core` in stage 1 and tagged it `type:vault`, a transitional tag that lets it import Node built-ins, `gray-matter`, `flexsearch` and `pdfjs-dist` anywhere. The library is about 12,000 lines in 29 modules with no layers (observed: `libs/vault/core/src` @ 2026-11-20):

- 16 modules call `node:fs` directly, some with synchronous calls (`readFileSync`, `readdirSync`) inside otherwise pure planning code.
- Many modules mix pure rules with I/O in one file: `concept.ts` holds both quote location and the write of a concept note.
- `md.ts` parses frontmatter with `gray-matter`; `links`, `graph`, `marks` and `climb` need only `node:path` `posix` helpers.
- `vault.ts` is a 990-line facade whose `createVault(root)` wires everything internally, so `apps/vault-server` cannot substitute any dependency.
- `view.ts` runs an HTTP server from inside the library.

## Decision

1. **`libs/vault/core` is replaced by hexagonal libraries under `libs/vault/`**, and the `type:vault` tag is removed:
   - `domain` (`type:domain`): pure rules and parsing of notes, PARA buckets, links, identity, habits, task lines, the link graph, sessions and mastery, the tier-2 payload, planning, and `VaultTree`, a snapshot of the vault's folders and note texts. No npm and no Node imports.
   - `application` (`type:application`): the `Vault` facade and the use cases (filing, conversion, concepts, distilling, records, planning writes, roll-over, review, harvest, note edits, the climb, the view graph), plus the ports they need: `NoteStore` (vault file system), `SearchRanker`, `PdfReader`, `Digest` and a random id source. No npm and no Node imports.
   - `adapter-fs`: the `node:fs` implementation of `NoteStore`, vault root resolution, and SHA-256 and random ids from `node:crypto`.
   - `adapter-markdown`: the `FrontmatterParser` with `gray-matter`.
   - `adapter-search`: the `SearchRanker` with `flexsearch`.
   - `adapter-pdf`: the `PdfReader` with `pdfjs-dist`.
   - `adapter-view`: the loopback HTTP server for graph, plans and climb pages, driving the `Vault` facade, with its pages in `assets/`.
   Each adapter carries an `adapter:vault-*` tag whose external-import whitelist names only its own package or Node.
2. **Frontmatter parsing goes behind a `FrontmatterParser`** that the domain takes as a parameter, rather than a hand-written YAML parser in the domain, so the domain stays pure without changing how notes are read.
3. **Posix path helpers move to `libs/shared/util-path`** (`scope:shared`, `type:util`): pure `join`, `dirname`, `basename`, `extname`, `normalize`, `relative`, `resolve` and `isAbsolute` that behave exactly like `node:path`'s `posix` functions. Vault paths are always posix, so the domain and application use it instead of `node:path`.
4. **`NoteStore` is async only, and planners read a snapshot.** Each operation loads a `VaultTree` through the `NoteStore` once; planners stay synchronous and read folders and note texts from it. Only the execute step goes back to the `NoteStore`, and it still refuses a note that changed or appeared since the preview.
5. **`apps/vault-server` is the composition root.** `composeVault` builds the adapters and passes them to `createVault(deps, opts)`; the MCP tools stay in the app as its driving adapter, and its `view` command composes `adapter-view` the same way. The tests of the composed vault, which need real files and real YAML parsing, move to `apps/vault-server/src/vault/__tests__`; `domain` and `application` are tested in memory.

All invariants of ADR-AIC-0008 and ADR-AIC-0051 hold: dependencies point inward, adapters translate errors, composition is manual, and there are no circular dependencies.

## Consequences

- The vault follows the same architecture as the coach, and `@nx/enforce-module-boundaries` checks it: domain and application code cannot touch the file system or an npm package.
- Use cases can be tested with `createMemoryNoteStore` from `application/src/testing` instead of a temporary directory; the existing tests that use a real directory keep running through `composeVault` in `vault-server`.
- The package `@ai-coach/vault` and its `@ai-coach/vault/*.js` subpath exports disappear. `apps/vault-server` imports from `@ai-coach/vault-domain`, `@ai-coach/vault-application` and the adapter packages, reads its version from its own `package.json`, and reaches note paths and search through the facade (`vault.pathOf`, `vault.searchNotes`).
- A planner sees the vault as it was when the snapshot was loaded, and each operation reads every note once, as `scanVault` already did. Reading one note (`vault.note`) lists paths without reading every note.
- `libs/shared/util-path` is the first `scope:shared` library.

## Alternatives Considered

- **Write a minimal YAML frontmatter parser in the domain.** Rejected: notes are written by the user in Obsidian, and a hand-written parser risks reading valid YAML differently from today.
- **Keep the posix helpers inside `libs/vault/domain`.** Rejected: path handling is not vault-specific, and the coach may need it; a pure shared util serves both scopes.
- **Make every planner async and query the `NoteStore` directly.** Rejected: about 50 existence and listing checks inside planners would each become an await, and planning would stop being pure; a snapshot keeps planners synchronous and testable without a store.
- **Keep `NoteStore` both sync and async.** Rejected: two variants of every port method doubles the adapter surface.
- **Leave the view server in `apps/vault-server`.** Rejected: it is a separate driving adapter with its own HTTP concerns and assets.
