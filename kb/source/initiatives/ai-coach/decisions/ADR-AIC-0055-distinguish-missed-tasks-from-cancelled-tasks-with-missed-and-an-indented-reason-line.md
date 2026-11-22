---
doc_type: adr
id: ADR-AIC-0055
title: "Distinguish missed tasks from cancelled tasks with #missed and an indented reason line"
summary: "Tasks that were not completed in time and can no longer be done are distinct from tasks deliberately cancelled. A fourth task state, missed, is stored in Markdown as [-] with #missed and ❌ YYYY-MM-DD so Obsidian Tasks treats it as closed with zero plugin configuration, and an optional indented '- missed: <reason>' bullet records why it was missed so review_period can surface missed tasks and their causes for analysis. A custom Obsidian checkbox status (such as [!] or [m]) is noted as a future option."
status: accepted
initiative: "ai-coach"
owners: []
reviewers: []
date: 2026-11-22
links: ["ADR-KI-0062","ADR-KI-0064","ADR-KI-0066","ADR-AIC-0052"]
tags: ["planning","tasks"]
---

# ADR-AIC-0055: Distinguish missed tasks from cancelled tasks with #missed and an indented reason line

## Context

Previously, tasks in `libs/vault/domain` carried three states: `open`, `done`, and `cancelled` (ADR-KI-0064). Closing a task that was not completed before an event or deadline forced marking it `cancelled` (`[-] ❌ YYYY-MM-DD`), conflating work deliberately dropped as unnecessary with work that was missed because time ran out or a blocker was not resolved. Without separating the two — and without recording why a task was missed — period reviews (`review_period`) could not analyze recurring failure modes to fix them.

## Decision

1. **Add a fourth task state `missed` represented with `[-]` and `#missed`.**
   - A missed task is written as `- [-] <text> #missed ❌ YYYY-MM-DD`.
   - Using `[-]` ensures the Obsidian Tasks plugin treats it as closed in `not done` queries out of the box without any custom status configuration.
   - `parseTasks` and `TaskLine` in `libs/vault/domain` classify `[-]` lines carrying `#missed` as `state: 'missed'` (stripping `#missed` from `text`) and all other `[-]` lines as `state: 'cancelled'`.
2. **Store the elaboration as an indented `- missed: <reason>` child bullet.**
   - Directly under a missed task line, an indented bullet `- missed: <reason>` records why the task was not completed, keeping the task line itself short and readable in Obsidian Tasks queries.
   - `parseTasks` exposes this on `Task` as `missedReason: string | null` alongside `cancelledOn: string | null`.
3. **Support `missed` and `reason` in `update_task` and `review_period`.**
   - `update_task` accepts `state: 'missed'` and `reason: string | null`. Setting `state: 'missed'` writes `[-]`, `#missed`, and `❌ <today>`, and inserts or updates the indented `- missed: <reason>` line when `reason` is given. Setting `reason` on a non-missed task is refused. Transitioning a task back to `open`, `done`, or `cancelled` strips `#missed` and removes any `- missed:` line.
   - `review_period` returns a `missed` list of tasks marked `missed` in the period (matched by `scheduled`, falling back to `cancelledOn`), including each task's `reason`, so reviews can analyze patterns and address root causes.
   - `plansview` excludes `missed` tasks from planned and completed effort cells, matching `cancelled`.

## Consequences

- Obsidian Tasks queries work immediately with no user-side plugin configuration.
- `review_period` separates deliberately cancelled work from missed work and surfaces the elaboration reasons for retrospective analysis.
- `update_task` with `include_closed: true` reaches `done`, `cancelled`, and `missed` tasks alike.
- Existing `[-]` lines without `#missed` remain `cancelled` with no migration needed.

## Alternatives Considered

- **Custom Obsidian checkbox status (e.g. `[!]` or `[m]`).** Deferred as a future evolution rather than rejected outright: a dedicated checkbox icon in Obsidian is visually appealing, but requires every user to register a custom status of type `CANCELLED` in the Obsidian Tasks plugin settings so missed tasks do not remain in `not done` queries. We can revisit migrating to a custom checkbox in the future once the `missed` workflow and reason analysis prove themselves in practice.
- **Inline reason text on the task line itself.** Rejected: long explanations clutter Obsidian Tasks query views and complicate `TaskLine` signifier parsing, whereas an indented child bullet matches how notes already live under tasks in the vault.
