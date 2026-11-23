---
doc_type: adr
id: ADR-AIC-0056
title: "Expand Obsidian Tasks query blocks when the vault view serves a note"
summary: "Day and week plans list their tasks through Obsidian Tasks query blocks, which the vault view showed as raw code. The view now expands a supported subset of the Tasks query language (state, scheduled and done dates and periods, path filters, grouping by folder and filename) into the matching task lines when it serves a note, and leaves any block with an unsupported directive untouched."
status: accepted
initiative: "ai-coach"
owners: []
reviewers: []
date: 2026-11-23
links: ["ADR-KI-0062","ADR-KI-0063","ADR-AIC-0052","ADR-AIC-0054","ADR-AIC-0055"]
tags: ["planning","tasks","view"]
---

# ADR-AIC-0056: Expand Obsidian Tasks query blocks when the vault view serves a note

## Context

Day plans gather their tasks with Obsidian Tasks query blocks rather than copies of the task lines: `Projects`, `Areas`, `Earlier days` and `Done` are each a ` ```tasks ` block that filters by state, scheduled or done date, and path (ADR-KI-0062, ADR-AIC-0054). Week plans do the same with `scheduled in` and `done in` a week. Obsidian renders these blocks with the Tasks plugin, but the vault view served the note body as written, so opening a day plan in the view showed the query text instead of the day's tasks (observed: a day plan served by `/note.json` @ 2026-11-23).

## Decision

1. **`expandTasksQueries` in `libs/vault/application` expands query blocks.** It takes the note's path, its body and every vault note, and replaces each ` ```tasks ` block with the task lines that match, rendered as Markdown.
2. **A supported subset of the query language.** The supported directives are `not done`, `done`, `scheduled on or before <date>`, `scheduled on <date>`, `scheduled in <period>`, `done on <date>`, `done in <period>`, `path regex matches /…/`, `path includes …`, `path does not include …` (with `{{query.file.path}}` replaced by the note's own path), `group by folder` and `group by filename`. Periods are parsed by `periodOf`, as plans already are.
3. **Unsupported blocks stay as they are.** A block with any directive outside the subset, or a malformed date, period or regex, is returned unchanged rather than half-applied, so the view never shows a filtered list that disagrees with Obsidian.
4. **Task lines are shown as written.** Each match is the original task line, so signifiers, dates and tags look as they do in Obsidian. Grouped output uses folder headings and note links; ungrouped output appends a link to the task's note. A block with no matches renders `No tasks.`
5. **Plan templates are never matched.** Notes under the plan templates folder are skipped, as in the vault graph (ADR-AIC-0054).
6. **The view adapter expands on read.** `noteBody` in `libs/vault/adapter-view` expands a note only when its body contains a query block, so other notes are served unchanged and the note file on disk is never modified.

## Consequences

- Day and week plans in the vault view show the day's or week's tasks, grouped as in Obsidian.
- Expanding a plan reads every note in the vault; this is acceptable for a personal vault, and notes without a query block pay nothing.
- Query features beyond the subset (sorting, priorities, `filter by function` and others) keep showing as raw code until they are added here.
- The expansion lives in the application layer and depends only on the domain's task parser, so other adapters can reuse it (ADR-AIC-0052).

## Alternatives Considered

- **Write the matching tasks into the plan note itself.** Rejected: the note would hold copies that go stale as tasks change, and Obsidian already renders the queries.
- **Show the raw query in the view.** Rejected: it is the current behaviour and hides the day's work.
- **Implement the full Tasks query language.** Rejected for now: plans use only this subset, and an unsupported block falls back to raw text.
