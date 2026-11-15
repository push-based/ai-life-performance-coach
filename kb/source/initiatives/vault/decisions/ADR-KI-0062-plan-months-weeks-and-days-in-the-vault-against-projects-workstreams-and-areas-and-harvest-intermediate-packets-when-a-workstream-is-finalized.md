---
doc_type: adr
id: ADR-KI-0062
title: "Plan months, weeks and days in the vault against projects, workstreams and areas, and harvest Intermediate Packets when a workstream is finalized"
summary: "Each project gets a project note and splits into workstreams under Workstreams/; year, quarter, month, week and day plans live in Plans/ beside Coach/, and every goal links a project, workstream or area and the goal one level up. A task stays in its project, workstream or area note, or in a plan when it is ad hoc, in Obsidian Tasks syntax with a size tag; open tasks and goals of a closed week, month or quarter roll into the next plan at high priority with a slipped tag. A finalized workstream is harvested into Intermediate Packets that move to 3.Resources when the project is archived; this refines ADR-KI-0058."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-10-31
links: ["ADR-KI-0058","ADR-KI-0061"]
tags: ["topic/mcp-engine","topic/knowledge-graph","kind/decision"]
refined_by: ["ADR-KI-0063","ADR-KI-0064","ADR-KI-0065","ADR-KI-0067"]
---

# ADR-KI-0062: Plan months, weeks and days in the vault against projects, workstreams and areas, and harvest Intermediate Packets when a workstream is finalized

## Context

ADR-KI-0058 serves a personal vault filed by PARA, and ADR-KI-0061 tracks reading through to concepts. Neither covers getting a project finished: nothing records what a project is, what it is split into, or how much of a week or month goes into it. _Source: ADR-KI-0058 §Decision_

The vault holds two projects, each splitting its work into an `IP/` folder of parts such as a conference's marketing, workshops and panels (observed: the maintainer's vault @ 2026-10-31). A part is a single note or a folder of notes and images. Tasks are nested checkboxes inside the parts, status is a hand-written `Status:` line on a part or on a section, no project has a note of its own, and `2.Areas` is empty (observed: same @ 2026-10-31).

The maintainer asked on 2026-10-31 for yearly, quarterly, monthly, weekly and daily planning that lives outside the projects, links every task to a project or area, shows where the time went, and can be written with the coach or by hand. `IP` was renamed because the parts are workstreams, while an Intermediate Packet is a reusable output; the maintainer chose to create Intermediate Packets when a workstream is finalized. The maintainer installed the Obsidian plugins Tasks, Dataview and Periodic Notes for this (reported: the maintainer, 2026-10-31).

## Decision

1. **Each project has a project note at `1.Projects/<Project>/<Project>.md`.** Its frontmatter carries `status`, `deadline` and `done_when`, the project's definition of done. A project folder without the note still counts as a project, and `list_notes` reports the note as missing.

2. **Projects, workstreams and areas share one status vocabulary: `todo`, `in-progress`, `blocked`, `done`.** The status is a `status` frontmatter key on the project, workstream or area note, replacing the hand-written `Status:` line. Sections inside a note carry no status.

3. **A project splits into workstreams under `1.Projects/<Project>/Workstreams/`.** A workstream is one note, `Workstreams/<Name>.md`, or a folder whose main note has the folder's name, `Workstreams/<Name>/<Name>.md`; a folder without that note still counts as the workstream. Subfolders and other files in a workstream folder are its contents; a workstream contains no workstreams.

4. **Areas live in `2.Areas/` under the same note-or-folder rule.** The first areas are Health, Work, Public Speaking, Finances, Sport and Reading, created as area notes on the maintainer's approval.

5. **Tasks are checkboxes in Obsidian Tasks syntax, and stay in the note they belong to.** `⏳ <date>` schedules a task, `✅ <date>` marks the day it was done, `⏫` is high priority, and a size tag `#S`, `#M` or `#L` weighs 1, 3 or 8; a task without a size tag weighs 1. A task in a project, workstream or area note belongs to it by path. A task in a plan belongs to the project, workstream or area its line links.

6. **Plans live in `Plans/` at the vault root beside `Coach/`, outside the PARA buckets, one subfolder per level.** A year is `Plans/Yearly/YYYY.md`, a quarter `Plans/Quarterly/YYYY-Qn.md`, a month `Plans/Monthly/YYYY-MM.md`, an ISO week `Plans/Weekly/YYYY-Www.md`, a day `Plans/Daily/YYYY-MM-DD.md`. Year, quarter, month and week plans hold goals (checkbox outcomes, each linking a project, workstream or area). Every plan holds Tasks queries that list the tasks scheduled in its period from wherever they live, and ad-hoc tasks, which live only in that plan; a day plan also holds a free-text log and no goals.

7. **Each goal below the year links the goal it serves one level up.** The link is a block reference on the goal's line, such as `↑ [[2026-Q4#^expo]]`, to a block id on the parent goal. A goal without a parent is allowed, and the vault tools report it.

8. **Every goal and every task in `Plans/` links a project, workstream or area.** The vault tools report each one that does not as unlinked, and never refuse to read it.

9. **A plan is written by hand from its level's template, or by the coach with `plan_period`.** The five templates live in `Plans/Templates/`, which holds no plans; `init_vault` writes any that are missing, and Periodic Notes reads them. `plan_period` renders the vault's template, adds goals each with a block id and ad-hoc tasks, and schedules open tasks by adding or replacing `⏳` on their line where it stands; `planning_overview` lists the projects, workstreams, areas, open tasks and a period's goals to plan from. Every write previews and runs only with `execute: true`, and an edit is refused if its note changed after the preview. _Source: ADR-KI-0058 §Decision_

10. **Open tasks and goals of a closed week, month or quarter roll into the next period with `roll_over`.** Each open task scheduled in the closed period is rescheduled to the new period's first day with `⏫` and a `#slipped/<period>` tag, where it stands; each open goal is copied into the new plan with `⏫` and `#slipped/<period>`, and the original stays open in its plan. Slip tags accumulate, so a task slipped twice carries two. A repeating task (`🔁`) does not roll over: Tasks creates its next occurrence when it is ticked, so a missed habit day is not a slip. A day carries no slip; an open task scheduled on a past day stays listed until its week rolls over. A year does not roll over: at its end each open year goal is reviewed, and the maintainer keeps it in the new year's plan, drops it, or rewrites it.

11. **`review_period(period)` reports a year, quarter, month, week or day.** It returns the size-weighted sum of tasks done in the period per project, workstream and area, the goals met and missed, the slips, the unlinked items, the number of done tasks without a size tag, and for each goal the child goals met and missed down the chain; the graph view shows the same in a panel. A project archived under `4.Archive/` keeps its tasks' owner, so a review of a past period still counts its work. 💡 **Invented.** Effort is measured by size-weighted completed tasks, not by time spent.

12. **A workstream set to `done` is harvested into Intermediate Packets with `harvest_workstream`.** Its preview proposes candidates from the workstream's notes and files: checklists, templates, designs, messages and lists that another project could reuse. Each candidate the maintainer keeps is written as a note in `1.Projects/<Project>/Intermediate Packets/`, with `project` and `workstream` frontmatter links and a body line linking both by name, so the links resolve after the project is archived, embedding a copy of any file it reuses, placed beside it; the workstream itself is not changed.

13. **Archiving a project moves its Intermediate Packets to `3.Resources/Intermediate Packets/<Project>/`.** The packets keep their `project` and `workstream` links, and the graph view draws the link from a packet to its archived project. This adds to ADR-KI-0058 Decision 8, whose knowledge-note suggestion is unchanged; the file copies a packet embeds move with it.

14. **`init_vault` lays out planning in a vault.** Its preview adds `Plans/` with its level folders and templates beside `Coach/` and leaves it out of the old-notes sweep, writes a project note for each project that has none, listing its workstreams, and creates the areas asked for. It edits no existing note: workstreams are expected under `Workstreams/` and a status as the `status` key. It writes only with `execute: true`, and every move refuses an existing target. _Source: ADR-KI-0058 §Decision_ (Amended 2026-11-01: the one-time migration of the first vault, renaming a project's `IP/` folder and turning a top `Status:` line into the key, was removed once that vault was migrated.)

15. **The vault tools parse the Tasks syntax themselves and never depend on a plugin running.** Notes stay plain markdown that Obsidian renders without the plugins; the plugins only make the plan queries live while the maintainer works in Obsidian.

## Consequences

**Positive**

1. A workstream task exists once, in its workstream, and plans list it without a copy.
2. Ticking a task in Obsidian dates it, so a review reads only what the notes already carry.
3. A slip stays visible on the task in every later plan, and the review can count repeated slips.
4. What a finished workstream produced remains findable in Resources after its project is archived.
5. Plans and project structure can be written by hand in Obsidian or with the coach, in the same format.

**Negative**

1. The plan queries are live only with the Tasks plugin; without it a plan shows the query text instead of its tasks.
2. A size tag is a guess, so the review weighs work by estimate, not by time spent.
3. `roll_over` and `plan_period` edit task lines inside project notes, so a diff of a workstream shows planning changes.
4. The vault gains a seventh top-level folder beside the five PARA folders and `Coach/`.
5. A vault that keeps workstreams in another folder, or status as a body line, is moved onto `Workstreams/` and the `status` key by hand before plans can link its workstreams.

## Alternatives Considered

1. **Plans hold their own tasks, each linked to a workstream.** Rejected because a task also listed in its workstream would exist twice and the two copies drift.
2. **Plans hold only goals, and all tasks live in workstreams.** Rejected because an ad-hoc task, such as one phone call, would have to be written into a project, workstream or area note instead of the plan.
3. **Measure effort by logged time.** Rejected for now because it asks for input every day; the size tag is the cheaper estimate, and time stays an open question.
4. **Keep the name IP for workstreams.** Rejected because it collides with Intermediate Packet, which names the reusable outputs of a finished workstream.

## Open Questions

1. Should the review add an optional logged time beside size after a month of use?
2. Should these features later move into an Obsidian plugin of our own?
3. What shape should a workstream take when exported as a Miro task board?

## Links

- ADR-KI-0058: refined; adds project notes, workstreams, areas, `Plans/`, the planning tools, Intermediate Packets in `archive_project`, and the `init_vault` planning layout.
- ADR-KI-0061: the graph view this extends with the review panel and packet links.
- ADR-KI-0006: dry-run-first, never-overwrite writes.

## Challenge

**Challenge (2026-10-31):**
- Position: plan months, weeks and days in `Plans/` against projects, workstreams and areas, with tasks in Tasks syntax in the notes they belong to, slips rolled over, and Intermediate Packets harvested from finished workstreams.
- Searched: grep over `source/` for weekly, workstream, intermediate packet, daily, periodic, goals, the Tasks plugin, `2.Areas` and `archive_project`; the hits for workstream, weekly and goals are about the corpus's own process, and only ADR-KI-0058 and RFC-KI-0042 concern the vault.
- Counter-evidence: ADR-KI-0058 Decision 3 fixes the PARA folders at the vault root, and `Plans/` sits beside them as `Coach/` does, so plan notes take no PARA bucket. ADR-KI-0058 Decision 8 moves the knowledge notes the user keeps into Resources on archive; packets were kept at harvest, so they move without a second choice.
- Applicability: the maintainer settled the hybrid task placement, the names, the status vocabulary, the weights, the five plan levels and their folders, the goal chain, the slip rule, copying harvested files, flat workstreams and the first areas on 2026-10-31; nothing is built yet.
- Verdict: proceed.
