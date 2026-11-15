---
doc_type: adr
id: ADR-KI-0065
title: "Define habits apart from tasks and check them off in each day plan, so a missed day never carries over"
summary: "A habit is no longer a repeating Tasks line. It is defined once, as a plain list item with a 🔁 rule under ## Habits in its workstream, area or project note, and each day plan gets a ## Habits section with that day's checks, written by plan_period and plan_days. A check left open is a missed day: it carries no scheduled date, so it is never overdue, never in another day's query and never rolled over. review_period counts each habit's due, ticked and missed days and its streak, outside effort, and a new tool, add_habits, writes definitions. Repeating 🔁 tasks stay for work that must still get done after a missed day. This refines ADR-KI-0062 and ADR-KI-0064."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-11-02
links: ["ADR-KI-0062","ADR-KI-0064","ADR-KI-0058"]
tags: ["topic/mcp-engine","kind/decision"]
---

# ADR-KI-0065: Define habits apart from tasks and check them off in each day plan, so a missed day never carries over

## Context

ADR-KI-0062 and ADR-KI-0064 write a habit as a repeating Obsidian Tasks line, such as `- [ ] Up at 6:00 🔁 every day ⏳ 2026-11-02`. Tasks writes the next occurrence only when that line is ticked. `roll_over` leaves a `🔁` line where it stands, because a missed habit day is not a slip. _Source: ADR-KI-0062 §Decision_ `update_task` refuses to tick one, so that Tasks can write the next occurrence. _Source: ADR-KI-0064 §Decision_

In the first week of use, the maintainer reported that daily routines were carried from one day to the next (reported: maintainer, 2026-11-02). Reading the vault showed why (observed: maintainer's vault @ 2026-11-02):

1. A habit line that is not ticked on its day stays open with its old `⏳` date. The day plan's query, `not done` and `scheduled on or before <day>`, lists it again every following day as if it were overdue work.
2. No occurrence exists for the following days until the old one is ticked, so the habit can only be caught up, never simply missed.
3. Two open occurrences of the same evening habit, a day apart, were in one workstream note at once.

A habit, such as getting up at 6:00, cannot be done late. A missed day is a fact to count, not work to carry. On 2026-11-02 the maintainer chose to define a habit once and check it off per day, over two other options: closing each day with a tool that cancels the open occurrence, or only hiding overdue habits in the day query.

## Decision

1. **A habit is defined once, apart from tasks.** A habit is a plain list item, not a checkbox, under a `## Habits` heading in a project, workstream or area note: `- Up at 6:00 🔁 every day`. The rule is one of `every day`, `every weekday`, `every weekend`, or `every week on <days>`, for example `every week on Monday, Wednesday and Friday`. A definition with a rule outside these is reported as a planning warning and is not checked off. Habits of an archived project, or of a workstream or area whose status is `done`, are not active.

2. **Each day plan checks off the habits due that day.** The day template gains a `## Habits` section between `## Today` and `## Ad-hoc`. `plan_period` for a day, and `plan_days` for each of its days, add a check such as `- [ ] Up at 6:00 [[Morning routine]]` for every active habit due that day that the section does not hold yet. A plan that lacks the section gets it before `## Ad-hoc`. A check links the note the habit is defined in, so it belongs to that workstream, area or project as ADR-KI-0062 Decision 8 requires. A check is matched to its habit by its words without links and by that link. Running the tools again adds nothing twice.

3. **A check left open is a missed day, and nothing else.** A check carries no `⏳` date. No day query lists it, `planning_overview` does not count it among open or overdue tasks, and `roll_over` neither moves it nor warns about it. It stays in its own day plan as the record of that day.

4. **Reviews count habits, not effort.** `review_period` reports, for each active habit, the days in the period up to today that its rule falls on, how many of those days were ticked, how many earlier days were missed (today is not missed yet), and its current streak: ticked due days in a row back from today, where an unticked today does not break it. Habit checks are left out of the size-weighted effort and of the plans page's timeline.

5. **`planning_overview` shows the habits.** The full overview lists every active habit with its rule, note, line and owner. For a day, the period part gives the habits due that day and the day plan's checks.

6. **`add_habits` writes definitions.** It adds habits under `## Habits` in a project, workstream or area note, creating the section when missing. It previews first and returns versions as every planning write does. _Source: ADR-KI-0064 §Decision_ It refuses a plan note, a rule outside Decision 1, a habit the note already defines, and text that holds links, a size tag or Tasks signifiers. A definition is changed or ended with `edit_note`.

7. **Repeating tasks stay for repeating work.** `🔁` on a task line keeps its Tasks meaning: work that comes back on a rule and stays open until done, such as a cleaning cycle. ADR-KI-0062 Decision 10 and ADR-KI-0064 Decision 3 still hold for those lines.

## Consequences

**Positive**

1. A missed habit no longer reappears on the following days, and the next day still has its own check.
2. A week or month review states how often each habit was kept, which a habit goal such as "Gym 4 times" can be judged against.
3. A habit is defined in one line instead of one open occurrence per day, so duplicate occurrences cannot build up.

**Negative**

1. A day plan that Obsidian's Periodic Notes creates from the template has an empty `## Habits` section until `plan_period` or `plan_days` runs for that day. The coach's day planning must run for the checks to appear.
2. A habit added or ended after its days were planned is not reflected in those day plans: new checks are added only when a day is planned again, and checks of an ended habit stay where they were written.
3. Rules are fewer than Tasks offers: no `every 2 days`, no monthly rules and no `when done`.
4. Existing `🔁` habit lines in a vault are not converted automatically. Each one is redefined with `add_habits` and the old line removed or cancelled.
5. The vault server lists one more tool: 31 in all (observed: `createVaultTools` @ 2026-11-02).

## Alternatives Considered

1. **Keep `🔁` lines and close each day with a tool.** The tool would cancel each open occurrence and write the next one. Rejected by the maintainer: a forgotten day close still carries the habit, and a second implementation of the Tasks recurrence rules would drift from the plugin's.
2. **Only hide overdue habits in the day query.** Rejected: an unticked habit would vanish for good, because Tasks writes no next occurrence for it.
3. **Generate the checks in Obsidian with a template plugin.** Rejected for now: it would tie the vault to a plugin the server does not use, and the rule reader would exist twice.

## Open Questions

1. Should a habit be able to count a number of days per week without naming them, such as "3 times a week"?
2. Should `plan_period` remove the open checks of a habit that was ended after its days were planned?

## Links

- ADR-KI-0062: refined; habits leave the task lines that Decision 10 kept from rolling over, and the day template of Decision 9 gains a section.
- ADR-KI-0064: refined; habits are no longer written by `add_tasks` with a recurrence, and Decision 3's refusal to tick a repeating task now concerns repeating work only.
- ADR-KI-0058: the vault server the new tool is added to.

## Challenge

**Challenge (2026-11-02):**
- Position: define habits apart from tasks, check them off per day plan, and count them in reviews.
- Searched: ADR-KI-0062 Decisions 8, 9 and 10; ADR-KI-0064 Decisions 3, 4 and 5 and Alternative 3; the vault's routine notes and day plans of 2026-11-01 and 2026-11-02.
- Counter-evidence: ADR-KI-0064 Alternative 3 rejected computing a habit's next occurrence in the tool, so that recurrence would not be implemented twice. This decision reads a small set of weekly rules, not Tasks' recurrence. It writes no next occurrence and leaves `🔁` task lines to the plugin.
- Applicability: the maintainer chose this design on 2026-11-02. It is built and tested in the vault package and the vault tools.
- Verdict: proceed.
