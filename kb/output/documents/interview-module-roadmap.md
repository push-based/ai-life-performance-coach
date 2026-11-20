# Interview Module Roadmap

Implementation roadmap for the generic `interview` preparation module in `ai-coach`, grounded in `ADR-AIC-0052` and `ADR-AIC-0051`.

## Architectural boundaries

- **Vault (`Coach/interview/`)**: stores only passive Markdown and JSONL (`problem.md`, `attempts.jsonl`, and later `designs/` and `stories/`), accessed exclusively through `vault-server` with preview-before-write (_Source: ADR-AIC-0052 §Decision_).
- **Practice Monorepo (`practiceRepo`)**: separate Git repository configured in `coach.config.json` (`COACH_PRACTICE_REPO`) holding executable TypeScript code and tests (`packages/dsa/<pattern>/<slug>/solution.ts`, `solution.test.ts`, plus `packages/system-design/` and `packages/papers/`) (_Source: ADR-AIC-0052 §Decision_).
- **Execution sandbox**: local tests run via Node 24's `node:test` with `--permission --allow-fs-read=<practiceRepo> --test-isolation=none` and a hard timeout (_Source: ADR-AIC-0052 §Decision_).
- **Frontend UI**: layered Angular application (`apps/interview-board`, bundled into `@ai-coach/vault` assets following `apps/climb-board` and `architecture:layered`) (_Source: ADR-AIC-0051 §Decision_, _Source: ADR-AIC-0052 §Decision_).

## Phase 1A — CLI, Vault, Practice Monorepo, and Agent Skill (completed @ 2026-11-20)

- Domain rules in `libs/coach/domain/src/lib/interview.ts`: independence levels (`failed`, `editorial`, `assisted`, `nudge`, `solo`), independence-driven spaced repetition ladder (`7 -> 14 -> 30 -> 60 -> 120` days for `solo` only), URL parsing (LeetCode / NeetCode), due-queue ranking (_Source: ADR-AIC-0052 §Decision_).
- Application ports and use cases in `libs/coach/application/src/lib/interview/`.
- Vault storage (`libs/vault/core/src/interview.ts`) and MCP tools (`interview_list_problems`, `interview_get_problem`, `interview_save_problem`, `interview_log_attempt`).
- Practice Monorepo adapter (`PracticeWorkspace`) scaffolding `solution.ts` and `solution.test.ts` (examples, edge cases, large-input performance budget) and running sandboxed tests.
- URL fetcher (`HttpProblemFetcher`) with graceful fallback to manual input.
- CLI commands: `coach interview init`, `add`, `start`, `test`, `log`, `due`, `list`.
- Agent skill: `.agents/skills/interview-coach/SKILL.md`.

## Phase 1B — Browser View (`/interview`) and Raw Editor

- Add HTTP endpoints in `libs/vault/core/src/view.ts` (loopback-only on `127.0.0.1:4747`, protected with Origin check and session token) for listing problems, reading attempt snapshots, editing/running solutions, and logging attempts.
- Scaffold `apps/interview-board` (`scope:interview-board`, `architecture:layered`, `type:app`, Angular 21) following `apps/climb-board` (_Source: ADR-AIC-0051 §Decision_).
- Dashboard: filter by `due`, `solo`, `assisted`, pattern, difficulty, and optional user-defined lists stored in the vault (`Coach/interview/lists/`).
- Problem workspace view:
  - Distraction-free raw code editor (no autocomplete) to simulate real interview conditions.
  - Session timer, `Run tests` button (or browser Web Worker execution), and `Copy solution` button for optional manual submission to external platforms.
  - Attempt history timeline with code snapshot diff/preview.

## Phase 2 — Algorithm Trace Visualizer (Step-by-Step Player)

- Lightweight TypeScript `trace` helper available in the practice monorepo during trace runs (records structured snapshots: arrays with named pointers `l`/`r`/`mid`, trees, graphs, DP tables, stacks/queues/heaps, scalar variables, step notes).
- Output written to `.coach-traces/<slug>.json` inside the practice monorepo (gitignored, kept outside the Obsidian vault to avoid sync churn).
- Interactive Trace Player UI inside `apps/interview-board`: play/pause, step forward/back, timeline scrubber, visual diff highlighting mutated indices/nodes/cells.

## Phase 3 — System Design Board (`/interview/design`)

- Interactive architecture canvas inside `apps/interview-board` reusing `ng-diagram` (same stack as `apps/climb-board`).
- Component palette: Load Balancer, API Gateway, Service, Cache, Queue/Stream, Database/Shard, Object Storage, CDN, Worker.
- Annotated edges (protocol, sync/async, QPS, latency notes).
- Persistence in `Coach/interview/designs/<slug>.md` (Markdown notes + serialized diagram JSON) through `vault-server`.
- Free-recall mode: sketch an architecture from memory, then compare and debrief trade-offs and failure modes with the coach.

## Phase 4 — Behavioral Stories Bank (`/interview/stories`)

- Structured STAR story notes under `Coach/interview/stories/<slug>.md` tagged by competency (leadership, conflict, ambiguity, failure, impact, mentoring).
- Integration with `coach spar` to practice delivering concise, high-signal behavioral answers aloud.
- Optional sample problem pack for newcomers who want to try the interview module immediately without importing external URLs.
