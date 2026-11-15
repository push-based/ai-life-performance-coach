---
doc_type: adr
id: ADR-KI-0064
title: "Edit planned tasks, goals and project notes in place with vault tools, checked against the preview across calls"
summary: "The vault server gains write tools so planning no longer leaves hand edits behind: add_tasks puts tasks in their owner's note, update_task changes tasks and goals where they stand, plan_days plans several days in one preview, set_frontmatter and edit_note change a note's keys or body, and create_workstream starts a workstream. Every planning write returns the versions of the notes it changes, and an execute that passes them back refuses a note changed since. planning_overview gains a period-only scope and reports each task's address, recurrence and dependencies. This refines ADR-KI-0062."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-11-02
links: ["ADR-KI-0062","ADR-KI-0058"]
tags: ["topic/mcp-engine","kind/decision"]
refined_by: ["ADR-KI-0065","ADR-KI-0066"]
---

# ADR-KI-0064: Edit planned tasks, goals and project notes in place with vault tools, checked against the preview across calls

## Context

ADR-KI-0062 gives the vault four planning writes: `plan_period`, `roll_over`, `harvest_workstream` and the `init_vault` layout. A task stays in its project, workstream or area note, and a plan holds only goals and ad-hoc tasks. _Source: ADR-KI-0062 §Decision_ Planning skills in a consumer project that uses only the vault tools listed what they still had to leave to hand edits in Obsidian (reported: consumer handoff note, 2026-11-02). The skills could not:

- add a task to an existing workstream, area or project note, a habit (`🔁`), a subtask, or a dependency;
- change an existing task or goal (resize, reschedule, tick, cancel, reparent);
- give an ad-hoc task a priority, recurrence, id or second link;
- edit a note's frontmatter or body;
- plan several days in one call;
- read one period without the whole vault's open tasks. One `planning_overview` call for a day returned about 81,000 characters.

Reading the vault code on 2026-11-02 found three more things (observed: `packages/vault/src` @ 2026-11-02):

1. ADR-KI-0062 Decision 9 says an edit is refused if its note changed after the preview. An `execute: true` call plans again from the notes as they are, so the check covered only changes made while that one call ran, not changes made between the preview call and the execute call.
2. The task reader did not read `🆔` or `⛔`, and its recurrence pattern ran on through a following `🆔`.
3. A goal rolled over by `roll_over` had `⏫` written before its `↑` parent link. Tasks reads signifiers from the end of a line and stops at a link, so it did not read that priority.

On 2026-11-02 the maintainer asked for all of these to be built.

## Decision

1. **The task reader reads every Tasks signifier the writes use.** `🆔` (id), `⛔` (the ids a task waits on) and `🏁` are read and kept out of a task's text, and a `🔁` rule ends at any signifier. `planning_overview` reports, for every task and goal, its note and line (0-based in the note body), block id, `🆔`, `⛔` and `🔁` rule. With a period it also reports the open tasks overdue before the period. With `scope: "period"` it returns only that period's goals, scheduled and overdue tasks and parent goals. `project` and `area` narrow the open, scheduled and overdue tasks alike.

2. **Every planning write returns the versions of the notes it changes, and execution checks them.** A version is a hash of the note's text. Passed back with `execute: true`, a note whose text changed since its preview, or that the preview did not show, is refused. Without versions the write still runs, with a warning, so existing callers keep working. An update that addresses a task by line runs only with versions. This holds for `plan_period`, `plan_days`, `roll_over`, `add_tasks`, `update_task`, `set_frontmatter`, `edit_note` and `create_workstream`, and it is the check ADR-KI-0062 Decision 9 describes.

3. **`update_task` changes existing tasks and goals where they stand.** A task is addressed by its note and one of: line, block id (or `🆔`), or a part of its text that matches exactly one open task. One call can update several tasks.
   - It can set the description, size, priority, scheduled date, state, a goal's parent one level up, `🆔`, `⛔` and `🔁`.
   - Done writes `✅` with today's date, cancelled writes `[-]` and `❌` with today's date, and open clears both.
   - It changes only the fields it is given. Slip tags and the rest of the line stay byte-for-byte. _Source: ADR-KI-0006 §Decision_
   - It refuses to tick or cancel a repeating task unless the same update ends its recurrence. Tasks writes a habit's next occurrence when the habit is ticked in Obsidian, and a tool that only writes `✅` would end the habit without saying so.

4. **`add_tasks` adds tasks to an existing project, workstream, area or plan note.** They go at the end of a section named by heading (created when missing), under an existing task as subtasks, or at the end of the note. A task in a plan links its project, workstream or area first, as ADR-KI-0062 Decision 8 requires. Intermediate Packets and archived projects are refused.

5. **New tasks carry their Tasks fields after their text, links and tags.** `add_tasks` tasks and `plan_period` ad-hoc tasks can carry a priority, a `🔁` rule, a `🆔`, `⛔` ids and further links after the owner. Goals can carry further links too. Signifiers are written in the order of the Tasks plugin's default layout: `🆔`, `⛔`, priority, `🔁`, then the dates. A new `🆔` must not already be used by a planned task, and each `⛔` must name an existing `🆔`. `roll_over` writes a rolled goal's `⏫` after its parent link.

6. **`set_frontmatter` sets or removes frontmatter keys, changing only those keys' lines.** `status` must be one of the four statuses of ADR-KI-0062 Decision 2, `deadline` must be a date, and null removes a key. It refuses the keys other vault tools write: `coach_id`, `converted_from`, `raw_role` and `pages`.

7. **`plan_days` plans several days in one preview.** Each day is planned as `plan_period` plans a day, on top of the notes as the earlier days left them, so two days can schedule tasks in the same note. One error refuses the whole call.

8. **`edit_note` edits a note's body: exact text that occurs once, or one section by heading, replaced or appended to.** It is for prose and tables, such as a column in an agenda table, a description, a plan's review or a day's log. It never touches frontmatter. Tasks go through `add_tasks` and `update_task`, and frontmatter through `set_frontmatter`. It works only on notes under the PARA folders and `Plans/`, and never on raw text under `3.Resources/0.Raw/`, which concept notes are checked against. _Source: ADR-KI-0060 §Decision_

9. **`create_workstream` starts a workstream in an active project.** It writes a workstream note, or a folder with its own note, with a status (default `todo`), an optional description and an optional area linked in its frontmatter. It also lists the new workstream under `## Workstreams` in the project note.

## Consequences

**Positive**

1. A task the coach adds lives in its owner's note, so it shows when the workstream is opened. This is what ADR-KI-0062 Consequence 1 intended.
2. Habits, subtasks and dependencies can be written by the coach, and Tasks reads every signifier it writes.
3. A note edited in Obsidian between a preview and its execution is no longer overwritten when the caller passes the versions back.
4. Planning a day needs one small read rather than the whole vault's open tasks.

**Negative**

1. The vault server lists six more tools: 30 in all (observed: `createVaultTools` @ 2026-11-02).
2. `edit_note` can change any prose in a project, area, resource or plan note. Its safety is the preview, the exactly-once match and the version check, not a narrow scope.
3. A caller that does not pass versions back gets no protection against concurrent edits, only a warning.
4. The signifier order follows the Tasks plugin's default layout as known on 2026-11-02 (assumed). It was not checked against the plugin version in the vault.

## Alternatives Considered

1. **Make versions mandatory on every execute.** Rejected for now, because existing callers would break until they are updated. A line address, the one case where a stale preview would hit a different task, already requires them.
2. **Rewrite a whole task line from its parsed fields.** Rejected because ADR-KI-0006 keeps untouched bytes as they are. A rewrite would reorder signifiers and tags the maintainer wrote by hand.
3. **Compute a habit's next occurrence when the tool ticks it.** Rejected because Tasks already does this when the habit is ticked in Obsidian, and a second implementation of its recurrence rules would drift from the plugin's.
4. **Only `edit_note`, without the task and frontmatter tools.** Rejected because it would skip the signifier order, id checks and status vocabulary that the narrower tools enforce.

## Open Questions

1. Should versions become mandatory once consumers pass them back?
2. Should `planning_overview` page its full listing as well as offering the period scope?

## Links

- ADR-KI-0062: refined; adds the task and note writes, makes Decision 9's stale-preview check hold across calls, and fixes the rolled goal's priority order of Decision 10.
- ADR-KI-0058: the vault server these tools are added to.
- ADR-KI-0006: surgical edits and dry-run first.
- ADR-KI-0060: the raw text `edit_note` leaves alone.

## Challenge

**Challenge (2026-11-02):**
- Position: add `add_tasks`, `update_task`, `plan_days`, `set_frontmatter`, `edit_note` and `create_workstream` to the vault server, check versions across calls, and extend `planning_overview` and `plan_period`.
- Searched: ADR-KI-0062 Decisions 2, 8, 9 and 10 and Alternatives 1 and 2; ADR-KI-0006 Decisions 1, 2 and 5; ADR-KI-0058 (the vault server); ADR-KI-0060 (raw text).
- Counter-evidence: ADR-KI-0006 Decision 5 keeps the corpus engine to additive and transitional operations. `edit_note` can remove text from a note's body, but it deletes no file, previews first and writes only with `execute: true`, and ADR-KI-0006 governs the corpus engine rather than the vault. ADR-KI-0062 Alternative 2 kept ad-hoc tasks in plans. `add_tasks` keeps that, and lets a task that has an owner go into the owner's note instead.
- Applicability: the maintainer asked on 2026-11-02 for all of this to be built; the tools are built and tested.
- Verdict: proceed.
