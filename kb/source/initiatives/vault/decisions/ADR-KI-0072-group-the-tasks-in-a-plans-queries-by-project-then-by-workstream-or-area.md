---
doc_type: adr
id: ADR-KI-0072
title: "Show a day plan's tasks in sections by kind, and group plan queries by folder, then by note"
summary: "A day plan shows its work in one section per kind: Habits, then Projects, then Areas, then Ad-hoc, the tasks written in the day plan itself together with open ad-hoc tasks left on earlier days. Each section's Tasks query selects tasks by the folder they are written in and groups them with Tasks' built-in folder and filename grouping, so every task shows once, under its project's folder and its workstream's note, and keeps its backlink into that note. The queries use no JavaScript, which Tasks disables by default. Week and month plans group the same way. init_vault replaces a template's or plan's layout only where its queries still read exactly as an earlier built-in one, after a preview. This refines ADR-KI-0062 Decision 6 and Decision 14."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-11-23
links: ["ADR-KI-0062","ADR-KI-0065","ADR-KI-0067"]
tags: ["topic/mcp-engine","kind/decision"]
---

# ADR-KI-0072: Show a day plan's tasks in sections by kind, and group plan queries by folder, then by note

## Context

ADR-KI-0062 Decision 6 gives every plan Tasks queries that list the tasks scheduled in its period from wherever they live, and Decision 5 keeps each task in its project, workstream or area note, or in a plan when it is ad hoc. _Source: ADR-KI-0062 §Decision_ ADR-KI-0065 adds a `Habits` section of checks to each day plan. _Source: ADR-KI-0065 §Decision_ The built-in day template lists every open task in one `Today` query grouped with `group by folder` (observed: `libs/vault/application/src/lib/plans.ts` `TEMPLATES` @ 2026-11-23).

A folder is not an owner. Every workstream written as a single note sits in the same `Workstreams` folder, so the day plan lists the tasks of all of a project's single-note workstreams under one heading, `1.Projects/DevFest2026/Workstreams`. Area tasks, overdue tasks and the day's own ad-hoc tasks fall into the same list under their folders, and an ad-hoc task shows twice: once in the query, under `Plans/Daily/2026/11-November`, and once in the `Ad-hoc` section where it is written (observed: maintainer's vault, `Plans/Daily/2026/11-November/2026-11-23.md` @ 2026-11-23). DevFest post subtasks named only `AI panel 12:00` showed with nothing saying which workstream they belong to (observed: same vault, `2026-11-24.md` and `Discussion Panels & Keynotes.md` @ 2026-11-23).

On 2026-11-23 the maintainer asked that opening a day plan make clear, for each task, whether it is a habit, a task of a project's workstream, a task of an area with no project, or a task written for that day only (reported: maintainer, 2026-11-23). Shown two layouts, they chose to keep an ad-hoc task that links an area, such as a meetup linked to `GDG Wrocław`, with the day's ad-hoc tasks rather than under its area. Copying tasks into the day plan was set aside, because a copied task exists twice, which ADR-KI-0062 Alternative 1 rejects. _Source: ADR-KI-0062 §Alternatives Considered_

A plan is rendered from the vault's own template in `Plans/Templates/` when it exists, and from the built-in one only when it does not; `init_vault` writes only missing templates (observed: `templateFor` in `plans.ts` and the template loop in `filing.ts` @ 2026-11-23). Changing the built-in text alone therefore changes nothing in a vault that already has its templates.

## Decision

1. **A day plan shows its work in four sections, one per kind, in this order: `Habits`, `Projects`, `Areas`, `Ad-hoc`.** Below them stay `Done` and `Log`. `Habits` holds the day's habit checks as ADR-KI-0065 writes them. The other three each select the open tasks scheduled on or before the day by the folder the task is written in, with a Tasks `path regex matches` filter anchored at the vault root, so every task shows in exactly one section:
   - `Projects` lists tasks written under `1.Projects/`, grouped by folder, then by file name. A single-note workstream shows as `1.Projects/<Project>/Workstreams/` with the workstream's name below it; a task in the project note shows as `1.Projects/<Project>/` with the project's name below it.
   - `Areas` lists tasks written under `2.Areas/`, grouped by file name, which is the area's name for an area written as one note.
   - `Ad-hoc` holds the tasks written in the day plan as lines, followed under `### Earlier days` by a query of the open tasks written in other plans under `Plans/` and scheduled on or before the day, so an ad-hoc task left on an earlier day stays in view until its week rolls over. The query leaves out the day plan's own file with `path does not include {{query.file.path}}`, so the day's ad-hoc tasks are not listed twice. An ad-hoc task stays here whatever it links.

2. **The queries use only Tasks' built-in instructions: `group by folder`, `group by filename`, path filters and placeholders.** Tasks disables JavaScript in queries by default, and a `group by function` line then fails the whole query (observed: maintainer's Obsidian with the Tasks plugin, `2026-11-23.md` @ 2026-11-23). The plans therefore render in a vault with Tasks' default settings, the vault server needs no plugin to read or write them, and the plans stay plain markdown. _Source: ADR-KI-0062 §Decision_

3. **Week and month plans keep one open-task query and one done-task query, grouped by folder, then by file name.** That covers the week plan's `This week` and `Done`, and the month plan's `Scheduled`. The day plan's `Done` groups the same way. Year and quarter plans hold no queries and are unchanged.

4. **Each listed task keeps its backlink.** No query hides the backlink that Tasks shows after each task, so one click opens the workstream or area note at the heading the task sits under.

5. **The planning tools keep writing ad-hoc tasks into the `Ad-hoc` section.** `plan_period` and `plan_days` find it by heading as they do now; a new ad-hoc task lands above `### Earlier days`.

6. **`init_vault` brings an existing vault onto the new layout without touching an edited one.** For each template in `Plans/Templates/` and each plan in `Plans/`, the preview lists a replacement of every query block, or grouping line, that reads exactly as an earlier built-in one: the `group by folder` queries before this decision, and the `group by function` lines written for one day on 2026-11-23 before the JavaScript default was found. In a day plan, the old `Today` section and its query become the `Projects` and `Areas` sections, placed after `Habits`, and the `Earlier days` query is added under the day's ad-hoc lines, which stay as they are. A plan whose queries were changed by hand is left alone and named in a warning. This refines ADR-KI-0062 Decision 14, under which `init_vault` edited no existing note. As with every `init_vault` change, it writes only with `execute: true`.

## Consequences

**Positive**

1. Opening a day plan shows habits, project work, area work and the day's own tasks apart, and within Projects each task sits under its project's folder and its workstream's note, so the DevFest posts appear under `1.Projects/DevFest2026/Workstreams/` › `Discussion Panels & Keynotes`.
2. Tasks stay in the one note that owns them, and each shows once in the day plan.
3. The plans render with Tasks' default settings; nobody has to enable JavaScript in queries.

**Negative**

1. Project headings are folder paths such as `1.Projects/DevFest2026/Workstreams/`, not the project's bare name, and a project's single-note workstreams share one folder heading, with each workstream as a heading below it.
2. A task in a folder workstream's inner note, such as `Marketing/Panels/Web panel questions.md`, shows under that note's folder and file name, not under the workstream's name.
3. The section follows where a task is written, not what it links. An ad-hoc task linking an area stays in `Ad-hoc`, and a task in a project archived under `4.Archive/` shows in none of the three sections.
4. A subtask scheduled on its own, such as `AI panel 12:00`, shows its workstream but still not its parent task. It reads clearly only if its own text says what it is.
5. Without the Tasks plugin a plan shows the query text, as it already did. _Source: ADR-KI-0062 §Consequences_

## Alternatives Considered

1. **Copy each scheduled task into the day plan.** Rejected: the task would exist twice and the copies would drift, as ADR-KI-0062 Alternative 1 sets out.
2. **Keep one `Today` query and only change its grouping.** Rejected: habits, area tasks and ad-hoc tasks would still share one list, and the day's ad-hoc tasks would still show twice.
3. **Group with `group by function` over the task's path, to show the bare project and workstream names.** Built and applied to the maintainer's vault on 2026-11-23, then replaced the same day: Tasks disables JavaScript in queries by default, so every grouped query showed an error until the maintainer enabled it, and enabling it lets any query in the vault run code. Offered both, the maintainer chose the built-in grouping (reported: maintainer, 2026-11-23).
4. **List an ad-hoc task under the area or project its line links.** Rejected by the maintainer on 2026-11-23: a task written for the day reads as the day's task, and selecting by link needs the Tasks plugin to read a task's links, which is unchecked.
5. **`group by filename` then `group by heading`.** Rejected: nothing would name the project, and a heading such as `After the event` means little without its note.
6. **Change only the built-in templates.** Rejected: a vault that already holds its templates would never see the change, and the plans already written for coming days would keep the old layout.

## Open Questions

1. Should a workstream note get a way back to the days its tasks are planned on, for example a query or a link to the day plan on each scheduled task?
2. Should the planning skills check that a scheduled subtask's text names what it is, for example `LinkedIn post: AI panel pictures 12:00`?

## Links

- ADR-KI-0062: refined; Decision 6's day plan gains sections by kind and its queries group by project and workstream, and Decision 14's `init_vault` may now replace unedited query blocks.
- ADR-KI-0065: the `Habits` section, which now comes first.
- ADR-KI-0067: the day plan paths that `init_vault` walks.

## Challenge

**Challenge (2026-11-23):**
- Position: give the day plan one section per kind of task, selected by the task's folder and grouped with Tasks' built-in folder and filename grouping, group week and month queries the same way, and migrate unedited query blocks with `init_vault`.
- Searched: the vault ADRs for plan queries, templates, ad-hoc tasks and `init_vault` (ADR-KI-0062, ADR-KI-0065, ADR-KI-0067); `TEMPLATES`, `templateFor`, the ad-hoc heading lookup and the `init_vault` template loop in the vault application library; the rendered day plan in the maintainer's Obsidian.
- Counter-evidence: the first version grouped with `group by function` and failed in Obsidian because Tasks disables JavaScript by default (Alternative 3). ADR-KI-0062 Decision 14 has `init_vault` edit no existing note, which Decision 6 refines on purpose.
- Applicability: the templates are defined in one constant, the tools find the ad-hoc section by heading, `init_vault` already writes the templates and previews every change, and the `Earlier days` query, which uses only built-in instructions, rendered in the maintainer's Obsidian.
- Verdict: proceed.
