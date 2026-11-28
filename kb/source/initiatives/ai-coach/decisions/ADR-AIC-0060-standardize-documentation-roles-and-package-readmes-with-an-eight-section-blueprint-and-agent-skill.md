---
doc_type: adr
id: ADR-AIC-0060
title: "Standardize documentation roles and package READMEs with an eight-section blueprint and agent skill"
summary: "Supersedes ADR-AIC-0034 by preserving the single-home split across root README.md, docs/guide/, CONTRIBUTING.md, ARCHITECTURE.md, and kb/, while defining an eight-section architectural blueprint for every package README (apps/*/README.md and libs/*/*/README.md) and shipping a reusable package-readme Agent Skill across all supported agent directories."
status: accepted
initiative: "ai-coach"
owners: ["<team/org>"]
reviewers: []
date: 2026-11-28
links: ["ADR-AIC-0001","ADR-AIC-0032","ADR-AIC-0034","ADR-AIC-0049","ADR-AIC-0050","ADR-AIC-0051"]
tags: ["documentation","architecture","skills"]
---

# ADR-AIC-0060: Standardize documentation roles and package READMEs with an eight-section blueprint and agent skill

## Context

ADR-AIC-0034 established a single home for each kind of documentation: a one-screen root `README.md`, a user guide in `docs/guide/`, `CONTRIBUTING.md`, `ARCHITECTURE.md` alongside package READMEs, and ADRs in `kb/` (moved from `docs/adr/` by ADR-AIC-0049).

Since ADR-AIC-0034, the workspace moved from a flat `packages/` layout into `apps/*` and domain-grouped `libs/*/*` with enforced `scope:*`, `architecture:hexagonal` vs `architecture:layered`, and `type:*` module boundaries (ADR-AIC-0051, observed: repository @ 2026-11-28). `apps/docs/src/sources.mjs` ingests `apps/*/README.md` and `libs/*/*/README.md` directly into the Docusaurus site (observed: `apps/docs/src/sources.mjs` @ 2026-11-28).

ADR-AIC-0034 did not specify what a package README should contain. Existing package READMEs drifted into inconsistent formats, often listing file-by-file inventories that go stale when code moves while omitting boundaries, architectural placement, extension recipes, verified Nx targets, and governing ADRs.

## Decision

1. **Keep the single-home documentation split from ADR-AIC-0034 intact:**
   - **Root `README.md`** stays distinct as the product front door and user-facing story: what ai-coach is, how it works, how to start, and where to read on. It fits on one screen and holds no reference tables.
   - **`docs/guide/`** holds the user guide (setup, first-session, the-climb, vault-view, planning, commands, coaching-styles, configuration, privacy, troubleshooting, glossary). Changes to commands or settings update a guide page, not `README.md` or a package README.
   - **`CONTRIBUTING.md`** holds contributor commands, house rules, and the documentation map.
   - **`ARCHITECTURE.md`** holds the system-wide map; **package READMEs** (`apps/*/README.md`, `libs/*/*/README.md`) explain how each individual app or library is built and how it fits into that architecture.
   - **`kb/`** holds architectural decision records (ADR-AIC-0049).
   - Every fact lives in one place; other pages link to it rather than duplicating it.

2. **Every package README (`apps/*/README.md` and `libs/*/*/README.md`) follows an eight-section blueprint:**
   1. **What it is doing** — clear, human-readable explanation of the package's purpose and responsibilities.
   2. **What it deliberately does NOT do (Non-goals & Boundaries)** — explicit constraints that prevent drift (forbidden dependencies, no direct disk I/O, no `data-access` imports, no business logic in adapters or UI).
   3. **How it connects to the main architecture** — where the package sits in the workspace (`scope:*`, `architecture:hexagonal` vs `architecture:layered`, `type:*`, upstream/downstream dependencies) plus a small ASCII or Mermaid diagram showing data and control flow.
   4. **Internal architecture & rules** — internal structure, patterns, invariants, and rules contributors and agents must follow when modifying the package.
   5. **Public surface / Contract** — what other packages actually import or call (key exports, ports, routes, MCP tools, UI primitives, or grouped CLI capabilities linking to `docs/guide/` for full references) rather than a brittle line-by-line file inventory.
   6. **How to extend it** — a short 3–4 step recipe for the most common change in the package (for example, adding a CLI command, MCP tool, signal store, or UI primitive).
   7. **Running & testing** — adapts by project type:
      - **Libraries (`libs/*/*`)**: only the actual `npm exec nx ...` targets that exist on the project, verified via `npm exec nx show project <name>`.
      - **Apps (`apps/*`)**: how to invoke or serve the app (invocation pattern plus 2–3 representative examples, linking to `docs/guide/*` instead of duplicating full command/flag lists) plus its verified `npm exec nx ...` targets (`lint`, `typecheck`, `test`, `build`).
   8. **Key ADRs** (always last) — a short bulleted list of the 2–5 most important ADRs governing the package, each with a relative link into `kb/source/initiatives/ai-coach/decisions/` and a one-line explanation of why it applies.

3. **Apply newcomer-friendly writing and Docusaurus ingestion rules to all docs and package READMEs:**
   - Write in plain words for a newcomer, using "you", short sentences, and active voice. Keep each package README scannable (1–2 screens max) and link terms to `docs/guide/glossary.md` instead of re-explaining them.
   - Account for `apps/docs/src/sources.mjs` and `apps/docs/src/remark/repo-links.mjs`: use a single H1 (`# @ai-coach/<name>`), standard H2 (`##`) section headings, and valid relative Markdown links so `npx nx build docs` passes with zero broken links or anchors.

4. **Ship the standard as a reusable multi-agent skill:**
   - The canonical skill lives at `.agents/skills/package-readme/SKILL.md` with a concrete template and review checklist.
   - Symlink it into every supported agent skill directory in this repository (`.claude/skills/`, `.cursor/skills/`, `.opencode/skills/`, `.gemini/skills/`, `.codex/skills/`) using relative symlinks (`../../.agents/skills/package-readme`) and list it in `.agents/skills/README.md`.

This ADR supersedes ADR-AIC-0034. All single-home documentation rules and Docusaurus site structure from ADR-AIC-0034 carry forward unchanged except where extended here for package READMEs and `kb/` (ADR-AIC-0049).

## Consequences

- Every refactored and new app or library tells a consistent, human-readable architectural story instead of a stale file listing.
- Root `README.md` stays focused on the user-facing product pitch and quick start, clearly separated from package-level architectural docs.
- Contributors and AI agents across Claude Code, Cursor, OpenCode, Gemini CLI, and Codex share one canonical `package-readme` skill without copy drift.
- Docusaurus builds (`npx nx build docs`) automatically validate every relative link and anchor in package READMEs, including links to `docs/guide/` and `kb/`.
- Existing package READMEs written before this standard will be brought into alignment incrementally as packages are touched or refactored.

## Alternatives Considered

- **Leave package README structure informal as in ADR-AIC-0034.** Rejected: informal READMEs drifted toward brittle file tables and omitted architectural boundaries, extension recipes, and governing ADRs.
- **Document the blueprint only in `CONTRIBUTING.md` without an Agent Skill.** Rejected: AI agents editing or scaffolding packages reliably follow a dedicated skill with a template and checklist, whereas prose in `CONTRIBUTING.md` is easy to miss.
- **Copy `package-readme/SKILL.md` into each agent directory.** Rejected: copies drift across agents; relative symlinks to `.agents/skills/package-readme` keep a single source of truth (consistent with ADR-AIC-0050).
