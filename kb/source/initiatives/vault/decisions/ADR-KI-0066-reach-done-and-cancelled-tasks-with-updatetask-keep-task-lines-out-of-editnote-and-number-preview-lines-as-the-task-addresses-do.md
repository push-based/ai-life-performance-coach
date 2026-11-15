---
doc_type: adr
id: ADR-KI-0066
title: "Reach done and cancelled tasks with update_task, keep task lines out of edit_note, and number preview lines as the task addresses do"
summary: "update_task reaches a done or cancelled task by its text with include_closed: true, keeping its status, dates and signifiers, and edit_note refuses any edit that adds, removes or changes a task line. Every write preview reports line in the numbering the task addresses use, 0-based in the note body, beside a 1-based fileLine for display. add_tasks takes a heading path and a level for a heading it creates, refuses a heading that names several sections, and puts tasks after a section's own lines and before its subsections, refining ADR-KI-0064."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-11-08
links: ["ADR-KI-0064","ADR-KI-0065","ADR-KI-0062"]
tags: ["topic/mcp-engine","kind/decision"]
---

# ADR-KI-0066: Reach done and cancelled tasks with update_task, keep task lines out of edit_note, and number preview lines as the task addresses do

## Context

ADR-KI-0064 addresses a task by its note and one of: line, block id, or a part of its text that matches exactly one open task. `planning_overview` reports the line, 0-based in the note body. `add_tasks` adds tasks to a section named by heading, and `edit_note` is for prose and tables, with tasks left to the task tools. _Source: ADR-KI-0064 §Decision_

A clean-up session in the maintainer's vault on 2026-11-07 hit three gaps (reported: maintainer handoff, 2026-11-07):

1. Seven ticked tasks had a misspelled speaker name. None of the three addresses reached them: the text match covers open tasks only, `planning_overview` gives no line for a ticked task that is not scheduled in the queried period, and the tasks had no block id. The renames became hand edits in Obsidian. The same rename through `edit_note` passed its preview, so nothing kept Tasks signifiers safe from a body edit.
2. Write previews numbered lines from the top of the file, the addresses from the start of the body. In two notes with a three-line frontmatter block, a preview's line passed back to `update_task` was refused.
3. `add_tasks` created a missing heading at level 2 at the end of the note when it belonged as a level 3 heading under another section. It could not pick one of several sections with the same name, and its preview did not show whether tasks went above or below a section's subsections.

On 2026-11-08 the maintainer approved the changes below, built on branch `ar/ai-coach` and tested in the vault package and the vault tools.

## Decision

1. **`update_task` reaches done and cancelled tasks on request.** With `include_closed: true`, the text address also matches done and cancelled tasks, and must still match exactly one. Without it the address matches open tasks only, as before, and a refusal names how many closed tasks would have matched. A changed description on a closed task keeps its `[x]` or `[-]`, its `✅` or `❌` date, its size, slip tags and every other signifier. A line or block id address already reaches a task in any state.

2. **`edit_note` refuses an edit that adds, removes or changes a task line.** A task line is a checkbox outside a code block. The refusal holds for exact replacements, each checked on its own, and for section edits, and it names `update_task` and `add_tasks`. A habit definition is a plain list item, not a checkbox, so it stays `edit_note`'s as ADR-KI-0065 Decision 6 says.

3. **A preview's `line` is the number the task addresses accept.** Every previewed edit of `plan_period`, `plan_days`, `roll_over`, `add_tasks`, `add_habits`, `update_task`, `set_frontmatter`, `edit_note` and `create_workstream` gives `fileLine`, 1-based in the file, for showing the user only. An edit in the note body also gives `line`, 0-based in the body as `planning_overview` reports it; a change in the frontmatter, which is all `set_frontmatter` makes, and a note being created have no `line`.

4. **Block previews carry context.** A previewed block of lines from `add_tasks`, `add_habits`, `edit_note` or `create_workstream` also gives `under`, the nearest heading above the change, and `above`, the unchanged line directly above it. Each is absent where there is no such line in the body.

5. **`add_tasks` names a section by heading or heading path, and refuses an ambiguous one.** A heading such as `Robotics: Machinekind/Marketing` picks a section within a section; a heading whose own text holds `/` is matched whole first. A heading that names several sections is refused with each one's path, where before the first one was taken. Of several same-named sections whose name holds `/`, none can be named by a path; one of the headings is renamed with `edit_note` first.

6. **`add_tasks` creates only the last part of a heading path.** The missing heading goes at the end of its parent section, subsections included, or at the end of the note, at `level` (2 to 6) or one level below its parent, or 2. A missing earlier part, a parent at level 6, a level not below the parent, and a level that differs from an existing heading's are refused.

7. **Tasks go after a section's own lines and before its first subheading.** Under a level 3 heading with level 4 children, new tasks land above the children. This keeps the placement `add_tasks` already had and states it in the tool description.

## Consequences

**Positive**

1. A name or typo in a ticked task is fixed through a previewed tool call instead of a hand edit.
2. A line from any preview can be passed back as an address, which saves the round trip a refused line cost.
3. `edit_note` can no longer reorder or drop Tasks signifiers.
4. A task meant for one of several same-named sections cannot land in the wrong one.

**Negative**

1. A caller that read a preview's `line` as a file line now gets a body line; the ai-coach skill text, kept in the ai-coach repository outside this corpus, changes with this release.
2. A typo that spans a task line and prose takes two calls, `update_task` and `edit_note`.
3. A heading that was ambiguous and silently resolved before is now refused, and the caller has to give a path, or rename a heading where its name holds `/`.
4. A section whose name holds `/` and is also ambiguous is reached only after renaming a heading.

## Alternatives Considered

1. **Report every task with its line, closed ones included, and address them by line only.** Rejected: it needs a second read before each rename, and the text address with a flag closes the gap in one call.
2. **Only document that `edit_note` may change task text.** Rejected: the signifier order and dates that `update_task` keeps would then rest on the caller.
3. **Keep the file-based preview number and rename it.** Rejected as the only change: a preview would still give no number a caller can pass back, so the body line is added under the address's name and the file line kept beside it.
4. **Put tasks at the end of a section, after its subsections.** Not chosen: it would change where existing calls write, and a subsection is reached by its path instead.

## Open Questions

1. Should `planning_overview` offer the closed tasks of a note with their lines, for a caller that prefers line addresses?

## Links

- ADR-KI-0064: refined; Decision 3's text address gains `include_closed`, Decision 4's heading gains paths, `level` and a stated placement, and Decision 8's rule that tasks are not edited with `edit_note` is now enforced.
- ADR-KI-0065: habit definitions stay editable with `edit_note`.
- ADR-KI-0062: the planning writes whose previews change shape.

## Challenge

**Challenge (2026-11-08):**
- Position: let `update_task` reach closed tasks, enforce `edit_note`'s exclusion of task lines, number preview lines as the addresses do, and give `add_tasks` heading paths and levels.
- Searched: the corpus under `source/` for `include_closed`, `fileLine` and `heading path` (no hits); ADR-KI-0064 Decisions 1, 3, 4 and 8; ADR-KI-0065 Decision 6; ADR-KI-0062 Decision 9.
- Counter-evidence: ADR-KI-0064 Consequence 2 places `edit_note`'s safety in the preview, the exactly-once match and the version check rather than a narrow scope. This narrows its scope by one kind of line, which Decision 8 of that ADR already assigned to the task tools.
- Applicability: each point names the tool, the input and the refusal; all of them are covered by tests in the vault package and the vault tools.
- Verdict: proceed.
