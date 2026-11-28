---
name: package-readme
description: Author, refactor, or review package READMEs (apps/*/README.md and libs/*/*/README.md) in the ai-performance-coach monorepo following the eight-section architectural blueprint (ADR-AIC-0060). Use when creating a new app or library, refactoring an existing package, updating a package README, or checking README quality and Docusaurus compatibility. Do NOT use for the root README.md, which is the user-facing product front door.
---

# Package README Standard

Write and review package READMEs (`apps/*/README.md` and `libs/*/*/README.md`) so every app and library tells a clear, consistent architectural story instead of a stale file listing.

Governed by [ADR-AIC-0060](../../../kb/source/initiatives/ai-coach/decisions/ADR-AIC-0060-standardize-documentation-roles-and-package-readmes-with-an-eight-section-blueprint-and-agent-skill.md) (superseding ADR-AIC-0034).

## Root `README.md` vs. Package READMEs

Keep the two strictly separate:

| Document                                                       | Audience                                           | Role                                                                                                                                                          |
| -------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Root `README.md`**                                           | New users deciding whether to try `ai-coach`       | Product front door and user-facing story: what `ai-coach` is, how it works, how to start, where to read on. Fits on one screen; holds no reference tables.    |
| **Package READMEs** (`apps/*/README.md`, `libs/*/*/README.md`) | Contributors and AI agents working on the codebase | Architectural story of one package: purpose, boundaries, placement, internal rules, public contract, extension recipe, verified commands, and governing ADRs. |
| **`docs/guide/*.md`**                                          | Users operating `ai-coach`                         | Full command, flag, configuration, privacy, and troubleshooting references, plus the [glossary](../../../docs/guide/glossary.md).                             |

Never duplicate full CLI command lists, configuration tables, or glossary definitions inside a package README—link to `docs/guide/*` instead.

## 1. Gather Facts Before Writing

Never guess tags, dependencies, exports, or Nx targets. Inspect the package first:

1. **Read metadata and boundaries**: check `<pkg>/package.json` (or `project.json`) for the Nx project name and tags (`scope:*`, `architecture:*`, `type:*`, `adapter:*`/`app:*`), plus `eslint.config.mjs` for boundary rules.
2. **Verify actual Nx targets**: run `npm exec nx show project <project-name>` and list only targets that actually exist on that project.
3. **Inspect the public surface**: read `src/index.ts` (for libraries) or entry points / routes / MCP tool registrations / CLI commands (for apps).
4. **Find governing ADRs**: check `kb/source/initiatives/ai-coach/decisions/` for the 2–5 ADRs that directly govern this package's architecture, boundaries, or behavior.

## 2. The Eight-Section Blueprint

Every package README must include all eight sections in this exact order, ending with **Key ADRs**:

### 1. What it is doing

- Start with `# @ai-coach/<name>` (single H1 matching `package.json` `name`).
- Follow with a clear, human-readable explanation of the package's purpose and core responsibilities.
- Open with plain words so a newcomer immediately understands why this package exists and when they would touch it.

### 2. What it deliberately does NOT do (Non-goals & Boundaries)

- State explicit constraints that prevent architectural drift.
- Examples: forbidden imports (`scope:coach` cannot import `scope:vault`), no direct disk/network I/O or Node built-ins in `domain`/`application`/`util`, no `data-access` imports in `ui`, no business rules in adapters or presentation components, no shared backend types in frontend-owned DTOs.

### 3. How it connects to the main architecture

- State where the package sits in the workspace: its `scope:*`, `architecture:hexagonal` vs `architecture:layered`, `type:*` tag, and its upstream callers and downstream dependencies.
- Include a small **ASCII (` ```text `) or Mermaid (` ```mermaid `) diagram** showing data and control flow.
  - Prefer compact ASCII (` ```text `) diagrams so they render cleanly in both GitHub and the Docusaurus site (`apps/docs` does not enable `@docusaurus/theme-mermaid`).

### 4. Internal architecture & rules

- Explain how the package is structured internally (modules, layers, state model, error handling, invariants).
- List the concrete rules contributors and AI agents must follow when changing it (for example: pure functions only, dates passed as `YYYY-MM-DD`, adapters translate external errors into domain errors, preview-before-write with version hashes, no comments in source code per ADR-AIC-0011).

### 5. Public surface / Contract

- Document what other packages actually import or call: key exports, ports, HTTP routes, MCP tools, signal stores, UI primitives, or grouped CLI capabilities.
- Do **not** write a brittle file-by-file inventory (`foo.ts`, `bar.ts`).
- For apps with large command or config surfaces, summarize capabilities by group and link to `docs/guide/*` for full references.

### 6. How to extend it

- Give a short **3–4 step recipe** for the most common change in this package (for example: adding a domain rule, implementing a port adapter, adding an MCP tool, adding a CLI command, adding a signal store or UI primitive).
- Mention which tests or boundary checks to run for that change.

### 7. Running & testing

Adapt this section by project type:

- **Libraries (`libs/*/*`)**:
  - List **only** the actual `npm exec nx ...` targets that exist on the project, verified via `npm exec nx show project <name>` (for example `test`, `lint`, `typecheck`, `build`).
  - Add one sentence on how tests are isolated (fakes, temp directories, Vitest, etc.).
- **Apps (`apps/*`)**:
  - Show how to invoke or serve the app: the invocation pattern plus 2–3 representative examples, linking to `docs/guide/*` instead of duplicating full command/flag lists.
  - List the app's verified `npm exec nx ...` targets (`lint`, `typecheck`, `test`, `build`, `serve`, etc.).

### 8. Key ADRs

- Always place this section **last**.
- Short bulleted list of the **2–5 most important ADRs** governing this package.
- Each bullet must include a valid relative link into `kb/source/initiatives/ai-coach/decisions/<file>.md` and a one-line explanation of why it applies here.

## 3. Writing & Docusaurus Rules

`apps/docs/src/sources.mjs` ingests `apps/*/README.md` and `libs/*/*/README.md` directly into the documentation site, and `apps/docs/docusaurus.config.mjs` fails the build on any broken link or anchor (`onBrokenLinks: 'throw'`, `onBrokenAnchors: 'throw'`, `onBrokenMarkdownLinks: 'throw'`).

Follow these rules:

- **Plain words, newcomer-friendly**: use "you", short sentences, and active voice.
- **Scannable length**: aim for **1–2 screens max** (~60–140 lines). Cut fluff and move exhaustive reference material to `docs/guide/`.
- **Link, don't duplicate**: link domain terms to `docs/guide/glossary.md`, user workflows to `docs/guide/*.md`, and architectural rationale to `kb/source/initiatives/ai-coach/decisions/*.md`.
- **Single H1 and clean H2s**: use one `# @ai-coach/<name>` heading at the top and standard `##` headings for the eight sections. Do not skip heading levels.
- **Relative links from the README's own folder**:
  - From `apps/<app>/README.md`, repo root is `../../` (e.g. `../../docs/guide/glossary.md`, `../../kb/source/initiatives/ai-coach/decisions/ADR-AIC-0051-...md`).
  - From `libs/<scope>/<lib>/README.md`, repo root is `../../../` (e.g. `../../../docs/guide/glossary.md`, `../../../kb/source/initiatives/ai-coach/decisions/ADR-AIC-0051-...md`).
  - `apps/docs/src/remark/repo-links.mjs` rewrites relative links to non-site files (like `src/...`) into GitHub URLs automatically, and resolves site files (like `docs/guide/*.md`, `ARCHITECTURE.md`, `kb/source/initiatives/ai-coach/decisions/*.md`, other package READMEs) internally.
- **Verify with Docusaurus**: run `npx nx build docs` after writing or updating any package README and confirm zero broken links or anchors.

## 4. Template

Use this skeleton and adapt Section 7 for **Library** or **App**:

````markdown
# @ai-coach/<name>

**<One-sentence summary of what this package owns>.** <1–2 short sentences explaining its purpose in plain words and when you would change it.>

## What it does not do

- **No <forbidden concern>.** <Where that lives instead.>
- **No <forbidden dependency>.** <Boundary rule enforced by Nx/ESLint.>

## Architecture fit

- **Scope:** `scope:<domain>`
- **Style:** `architecture:<hexagonal|layered>` (`type:<layer>`)
- **Depends on:** <upstream/downstream packages or "nothing">
- **Used by:** <callers>

```text
[Upstream caller] ──▶ [@ai-coach/<name>] ──▶ [Downstream dependency / Port]
```

## Internal architecture & rules

- **<Pattern or module grouping>:** <how the internals are organized.>
- **<Key invariant>:** <rule contributors and agents must preserve.>
- **<Error / I/O rule>:** <e.g., pure TypeScript only, or translates external errors into domain errors.>

## Public surface

- `<ExportOrPort>` — <what callers use it for.>
- `<RouteOrToolOrGroup>` — <what it exposes; link to `docs/guide/*.md` for full reference.>

## How to extend it

1. <First step — e.g., define the rule, port, or DTO.>
2. <Second step — e.g., implement the behavior and wire it into the public export / composition root.>
3. <Third step — e.g., add unit tests covering the new behavior and edge cases.>
4. <Fourth step — e.g., run `npm exec nx test <project>` and `npm exec nx lint <project>`.>

## Running & testing

<!-- For a LIBRARY (libs/*/*): list only verified targets from `npm exec nx show project <name>` -->

```sh
npm exec nx test <project>
npm exec nx lint <project>
npm exec nx typecheck <project>
npm exec nx build <project>
```

<!-- For an APP (apps/*): include invocation pattern + 2–3 examples + link to docs/guide/*, then verified Nx targets -->

```sh
<invocation pattern>
```

See the [<relevant guide>](../../docs/guide/<page>.md) for the full command and option reference.

```sh
npm exec nx lint <project>
npm exec nx typecheck <project>
npm exec nx test <project>
npm exec nx build <project>
```

## Key ADRs

- [ADR-AIC-XXXX](../../../kb/source/initiatives/ai-coach/decisions/ADR-AIC-XXXX-....md) — <one-line reason this ADR governs this package.>
- [ADR-AIC-YYYY](../../../kb/source/initiatives/ai-coach/decisions/ADR-AIC-YYYY-....md) — <one-line reason this ADR governs this package.>
````

## 5. Review Checklist

Before finishing a package README, verify every box:

- [ ] This is a package README (`apps/*/README.md` or `libs/*/*/README.md`), not the root `README.md`.
- [ ] All 8 sections are present in order, ending with **Key ADRs**.
- [ ] Non-goals and forbidden dependencies are explicit and match `eslint.config.mjs` / `package.json` tags.
- [ ] Architecture fit states `scope:*`, `architecture:*`, `type:*`, callers/dependencies, and includes a small ASCII or Mermaid diagram.
- [ ] Public surface describes real exports/ports/routes/tools/capabilities rather than a line-by-line file list.
- [ ] Extension recipe is 3–4 concrete steps for the most common change.
- [ ] Running & testing matches the project type (Lib vs App) and every `npm exec nx ...` target was verified with `npm exec nx show project <name>`.
- [ ] Key ADRs lists 2–5 governing ADRs with working relative links into `kb/` and one-line explanations.
- [ ] Scannable (1–2 screens max), written in plain words for a newcomer, linking terms to `docs/guide/glossary.md` instead of duplicating them.
- [ ] `npx nx build docs` passes with zero broken links or anchors.
