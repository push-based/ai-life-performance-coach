---
doc_type: adr
id: ADR-AIC-0052
title: "Split the vault into hexagonal domain, application and adapter libraries"
summary: "Stage 2 of ADR-AIC-0051: libs/vault/core is split into libs/vault/domain, libs/vault/application and one adapter library per outside dependency (file system, frontmatter, full-text search, PDF, view server), with apps/vault-server as the composition root. Frontmatter parsing sits behind a port, posix path helpers move to a pure libs/shared/util-path, and the file system port is async only."
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
   - `domain` (`type:domain`): pure rules and parsing of notes, PARA buckets, links, identity, habits, task lines, the link graph, mastery, the tier-2 payload, and the pure parts of concepts, distilling, climbs, planning and plans. No npm and no Node imports.
   - `application` (`type:application`): the use cases (filing, conversion, concepts, distilling, records, planning writes, roll-over, review, harvest, note edits, climbs) and the `Vault` facade, plus the ports they need: `NoteStore` (vault file system), `FrontmatterCodec`, `PassageIndex` (full-text search), `PdfReader` and a clock and id source where randomness or time is used. No npm and no Node imports.
   - `adapter-fs`: the `node:fs` implementation of `NoteStore`, and vault root resolution.
   - `adapter-markdown`: `FrontmatterCodec` with `gray-matter`.
   - `adapter-search`: `PassageIndex` with `flexsearch`.
   - `adapter-pdf`: `PdfReader` with `pdfjs-dist`.
   - `adapter-view`: the loopback HTTP server for graph, plans and climb pages, driving the application.
   Each adapter carries an `adapter:*` tag whose external-import whitelist names only its own package and Node built-ins.
2. **Frontmatter parsing goes behind the `FrontmatterCodec` port** rather than a hand-written YAML parser in the domain, so the domain stays pure without changing how notes are read.
3. **Posix path helpers move to `libs/shared/util-path`** (`scope:shared`, `type:util`): pure `join`, `dirname`, `basename`, `extname`, `relative` and `normalize` over `/`-separated vault-relative paths. Vault paths are always posix, so the domain and application use it instead of `node:path`.
4. **`NoteStore` is async only.** Functions that read synchronously today (in planning, roll-over, note edits and plans) become async.
5. **`apps/vault-server` is the composition root.** It builds the adapters, passes them to the application's `createVault`, and keeps the MCP tools as its driving adapter. Its `view` command composes `adapter-view` the same way.

All invariants of ADR-AIC-0008 and ADR-AIC-0051 hold: dependencies point inward, adapters translate errors, composition is manual, and there are no circular dependencies.

## Consequences

- The vault follows the same architecture as the coach, and `@nx/enforce-module-boundaries` checks it: domain and application code cannot touch the file system or an npm package.
- Use cases can be tested with an in-memory `NoteStore` instead of a temporary directory; the existing tests that use a real directory keep running through `adapter-fs`.
- The package `@ai-coach/vault` and its `@ai-coach/vault/*.js` subpath exports disappear. `apps/vault-server` imports from `@ai-coach/vault-domain`, `@ai-coach/vault-application` and the adapter packages, and reads its version from its own `package.json`.
- Functions that read synchronously become async, a breaking change for any caller outside this repository (none known, observed: repository @ 2026-11-20).
- `libs/shared/util-path` is the first `scope:shared` library.

## Alternatives Considered

- **Write a minimal YAML frontmatter parser in the domain.** Rejected: notes are written by the user in Obsidian, and a hand-written parser risks reading valid YAML differently from today.
- **Keep the posix helpers inside `libs/vault/domain`.** Rejected: path handling is not vault-specific, and the coach may need it; a pure shared util serves both scopes.
- **Keep `NoteStore` both sync and async.** Rejected: two variants of every port method doubles the adapter surface for a handful of call sites.
- **Leave the view server in `apps/vault-server`.** Rejected for now: it is a separate driving adapter with its own HTTP concerns, and keeping it in a library lets it be tested without starting the CLI.
