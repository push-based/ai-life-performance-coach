---
doc_type: adr
id: ADR-AIC-0052
title: "Add a generic interview preparation module with vault-and-practice-monorepo separation"
summary: "Adds an interview module alongside climb for structured technical interview practice (DSA, system design, behavioral). Passive knowledge, problem metadata, attempt logs, and spaced-repetition schedules stay in the Obsidian vault under Coach/interview/, while executable TypeScript solutions, tests, and future code experiments live in a separate Git-backed practice monorepo configured in coach.config.json."
status: accepted
initiative: "ai-coach"
owners: []
reviewers: []
date: 2026-11-20
links: ["ADR-AIC-0001","ADR-AIC-0009","ADR-AIC-0011","ADR-AIC-0048","ADR-AIC-0051"]
tags: []
---

# ADR-AIC-0052: Add a generic interview preparation module with vault-and-practice-monorepo separation

## Context

`ai-coach` already guides conceptual learning from books and notes through `climb` and schedules reviews through a spaced-repetition ladder (observed: `libs/coach/domain` @ 2026-11-20). Preparing for technical interviews requires a different practice loop: solving algorithmic coding problems without autocomplete, tracking whether a solution was achieved independently or with assistance, running local tests (including edge cases and performance budgets), and later practicing system design and behavioral stories.

Storing executable `.ts` solution and test files directly inside the Obsidian vault introduces four drawbacks:
1. It turns a passive Markdown vault into an execution directory.
2. Frequent edits and heavy visualization trace files create churn in Obsidian Sync.
3. Without `tsconfig.json` and type definitions, IDE TypeScript support degrades.
4. Direct editor writes to `.ts` files blur the single-gatekeeper boundary of `vault-server` (ADR-AIC-0048).

## Decision

1. **Generic `interview` module in `scope:coach` and `scope:vault`.**
   - Domain rules live in `libs/coach/domain/src/lib/interview.ts` (independence levels, interview spaced-repetition ladder, URL slug parsing, due-queue ranking).
   - Use cases and ports (`InterviewStore`, `ProblemFetcher`, `CodeWorkspace`) live in `libs/coach/application/src/lib/interview/` and `ports/interview.ts`.
   - Vault persistence lives in `libs/vault/core/src/interview.ts` and is exposed over MCP in `apps/vault-server/src/tools/vault/interview-tools.ts` with preview-before-write (ADR-AIC-0009).
   - CLI commands live under `coach interview <init|add|start|test|log|due|list>`.
   - Agent coaching guidance lives in `.agents/skills/interview-coach/SKILL.md`.
   - Future interactive UI (browser editor, algorithm trace player, system design `ng-diagram` board) will live in a layered frontend app (`apps/interview-board`, following ADR-AIC-0051).

2. **Clean separation between Vault (knowledge) and Practice Monorepo (executable code).**
   - **Vault (`Coach/interview/`)** stores only passive Markdown and JSONL:
     - `Coach/interview/problems/<slug>/problem.md` (frontmatter + description, constraints, notes, solution path)
     - `Coach/interview/problems/<slug>/attempts.jsonl` (append-only attempt history including code snapshots)
     - Future: `Coach/interview/designs/` and `Coach/interview/stories/`.
   - **Practice Monorepo** (configured via `practiceRepo` in `coach.config.json` or `COACH_PRACTICE_REPO`, initialized via `coach interview init <dir>`) is a separate Git repository holding executable code:
     - `packages/dsa/<pattern>/<slug>/solution.ts` and `solution.test.ts` (examples, edge cases, and a performance test)
     - Reserved directories `packages/system-design/` and `packages/papers/` for future architecture prototypes and paper implementations.
   - Tests run in a child process via Node 24's built-in `node:test` with a hard timeout and `--permission` read-only sandboxing scoped to the practice repository.

3. **Independence-driven spaced repetition.**
   - Attempts record an explicit `IndependenceLevel`: `failed`, `editorial`, `assisted`, `nudge`, or `solo`.
   - Only `solo` attempts advance the review ladder (`7 -> 14 -> 30 -> 60 -> 120` days). `assisted` and `nudge` schedule short reviews without advancing the rung; `failed` and `editorial` reset the rung and schedule next-day review.

4. **URL import with graceful fallback.**
   - `ProblemFetcher` supports public LeetCode and NeetCode URLs to extract metadata, examples, and starter signatures. If a fetch is blocked or unavailable (rate limits, anti-bot gates, premium problems, offline), the flow falls back to manual input without blocking practice.

## Consequences

- The Obsidian vault remains 100% passive Markdown/JSONL and fully readable without Node tooling, while preserving complete attempt history and code snapshots.
- All executable practice code is backed up in Git, has proper TypeScript configuration, and naturally scales beyond DSA to system design prototypes and paper implementations.
- `coach.config.json` gains an optional `practiceRepo` field.
- All module boundaries in `eslint.config.mjs` (ADR-AIC-0051) remain intact: `domain` and `application` stay pure TypeScript with zero external or Node imports.

## Alternatives Considered

- **Store `.ts` files inside `Coach/interview/` in the vault.** Rejected: mixes executable code into passive notes, causes sync churn, and degrades IDE TypeScript tooling.
- **Create a separate `libs/interview/*` domain scope immediately.** Deferred: extending `libs/coach/*` reuses `VaultClient`, `Clock`, and `apps/cli` cleanly while keeping `interview` isolated in its own submodules; a dedicated `apps/interview-board` handles the layered UI.
- **Auto-submit solutions back to third-party coding platforms.** Rejected: requires session credentials and breaks against anti-bot gates; local testing plus a copy-solution workflow is offline-first and reliable.
