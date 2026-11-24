---
doc_type: adr
id: ADR-AIC-0057
title: "Show notes in a project folder apart from the project in the vault graph"
summary: "The vault graph put every note in a project folder that was not a workstream or a plan into the Projects category, so a working note such as a talk outline looked and behaved like the project itself. Only a project's own note, named after its folder, now counts as the project; other notes in a project folder get their own Project notes category with its own colour and no project focus behaviour."
status: accepted
initiative: "ai-coach"
owners: []
reviewers: []
date: 2026-11-23
links: ["ADR-KI-0062","ADR-AIC-0053","ADR-AIC-0054"]
tags: ["view","planning"]
---

# ADR-AIC-0057: Show notes in a project folder apart from the project in the vault graph

## Context

ADR-AIC-0053 gave workstreams their own category in the vault graph, and ADR-AIC-0054 did the same for plans. Every other note under `1.Projects/` kept the Projects category, whether it was the project's own note or a working note that happens to sit in the project folder. A talk outline at `1.Projects/AI-Coach/Talk Flow.md` was therefore coloured, filtered and focused as a project: clicking it pulled in the project's workstreams and day plans as if it owned them (observed: vault graph @ 2026-11-23). The planning tools already know better: a project is a folder under `1.Projects/`, and its note is `<folder>/<folder>.md` (ADR-KI-0062).

## Decision

1. **`isProjectNotePath` in `libs/vault/domain` names a project's own note.** It matches `1.Projects/<Project>/<Project>.md` and `4.Archive/<Project>/<Project>.md`, the same note `planning` reads a project's status, deadline and definition of done from.
2. **The view graph marks it.** Each node in `VaultViewGraph` carries `project: boolean`, next to `workstream` and `plan`.
3. **Other notes in a project folder get a Project notes category.** In the vault view, a note in the Projects bucket that is neither the project note, a workstream nor a plan is shown under **Project notes**, with its own colour (`--project-notes`) and filter. Because it is no longer in the Projects category, focusing it no longer pulls in the project's workstreams and day plans.
4. **The side panel names the project note.** The project's own note is labelled `Project` instead of `Note`.

## Consequences

- Only real projects look and behave like projects in the graph; working notes in a project folder stay visible, grouped near their project, without borrowing its focus behaviour.
- The graph has one more category to filter on.
- Archived projects stay in the Archive category; the flag is set for them, but the view does not use it there.

## Alternatives Considered

- **Keep project folder notes in the Projects colour as ordinary notes.** Rejected: the colour would still suggest they are projects.
- **Require working notes to move out of project folders.** Rejected: PARA keeps a project's working notes in its folder, and the view should show the vault as it is.
