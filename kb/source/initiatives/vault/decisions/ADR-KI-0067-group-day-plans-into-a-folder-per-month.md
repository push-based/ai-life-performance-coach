---
doc_type: adr
id: ADR-KI-0067
title: "Group day plans into a folder per month"
summary: "A day plan moves from Plans/Daily/YYYY-MM-DD.md into a folder per year and a folder per month named by its number and name, such as Plans/Daily/2026/11-November/2026-11-09.md. Every planning tool writes a new day plan there. A day plan still at the old path is read and written where it is, with a warning, until init_vault moves it into its month's folder after a preview. Year, quarter, month and week plans stay where they are. This refines ADR-KI-0062 Decision 6."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-11-09
links: ["ADR-KI-0062","ADR-KI-0065"]
tags: ["topic/mcp-engine","kind/decision"]
---

# ADR-KI-0067: Group day plans into a folder per month

## Context

ADR-KI-0062 Decision 6 puts every day plan straight in `Plans/Daily/`, named `YYYY-MM-DD.md`. _Source: ADR-KI-0062 §Decision_ A day plan is written for every planned day, and since ADR-KI-0065 every day gets one for its habit checks. _Source: ADR-KI-0065 §Decision_ After ten days of use the folder held ten files (observed: maintainer's vault @ 2026-11-08). A year adds about 365, all in one flat list in Obsidian's file explorer.

On 2026-11-08 the maintainer asked for day plans to be grouped by month (reported: maintainer, 2026-11-08). On 2026-11-09 they chose a folder per month named by its number and name, like `11-November`, with the day plans' own names unchanged and existing day plans moved by `init_vault`.

## Decision

1. **A day plan lives in its month's folder, inside its year's folder.** Its path is `Plans/Daily/<year>/<month number>-<month name>/YYYY-MM-DD.md`, for example `Plans/Daily/2026/11-November/2026-11-09.md` or `Plans/Daily/2027/1-January/2027-01-04.md`. The month number is not padded and the month name is in English, so Obsidian's file explorer lists the months in calendar order with their names. The file name stays the day, so `{{title}}` in the day template and wikilinks such as `[[2026-11-09]]` are unchanged. Year, quarter, month and week plans keep the paths ADR-KI-0062 Decision 6 gives them.

2. **The old path keeps working until the vault migrates.** A day plan at `Plans/Daily/YYYY-MM-DD.md` is still read as that day's plan, and `planning_overview` warns that `init_vault` moves it. `plan_period` and `plan_days` write into it while the month's folder holds no plan of that day, so a day never gets two plans from the tools. A new day plan is always created in the month's folder. A day file anywhere else, such as one in the wrong month's folder, is reported as not a plan name.

3. **`init_vault` moves existing day plans.** For each `Plans/Daily/YYYY-MM-DD.md`, the preview lists a move to its month's folder. A target that already exists is a collision, which blocks the whole run as every `init_vault` collision does. Other files in `Plans/Daily/` stay where they are.

## Consequences

**Positive**

1. Obsidian's file explorer shows one folder per year under `Plans/Daily/`, each holding up to twelve month folders in calendar order, and each of those at most 31 day plans.
2. A month's days can be opened, searched or archived as one folder.

**Negative**

1. Obsidian's Periodic Notes plugin must be set to the daily format `YYYY/M-MMMM/YYYY-MM-DD` with folder `Plans/Daily`. Otherwise a day note opened from Obsidian is created at the old path. The vault server does not write plugin settings.
2. Until `init_vault` runs, a vault can hold day plans in both layouts: old days stay flat and new days go into month folders.
3. A markdown link with a relative path to a day plan breaks when `init_vault` moves it. Wikilinks resolve by name and keep working.

## Alternatives Considered

1. **Accept only the new path.** Rejected: an unmigrated vault would lose its day plans from planning until `init_vault` ran, and `plan_period` would write a second plan for a day that already has one.
2. **A month folder named `YYYY-MM`, without a year folder.** Tried first and replaced the same day: the maintainer wanted the month's name, with its number in front for the order (reported: maintainer, 2026-11-09). A folder named only `11-November` would hold the Novembers of every year, so the year gets its own folder.
3. **Group the day plans only in tool output.** Rejected: the files would stay one flat list in Obsidian, where the maintainer works with them.

## Open Questions

1. Should `init_vault` also write the Periodic Notes daily format, as it writes the plan templates?

## Links

- ADR-KI-0062: refined; Decision 6's day plan path gains a year and a month folder.
- ADR-KI-0065: day plans hold the habit checks, which is why there is one per day.

## Challenge

**Challenge (2026-11-09):**
- Position: move day plans into a folder per month, and keep reading an unmigrated day plan where it is.
- Searched: the vault package for every place that builds or parses a plan path (`planPathOf`, `planOf`, `periodOf`); ADR-KI-0062 Decisions 6 and 9; ADR-KI-0065 Decision 2.
- Counter-evidence: Periodic Notes creates day notes from its own format setting, so Obsidian and the server disagree until the setting is changed (Negative 1).
- Applicability: the path is built in one function and parsed in one other, and the old-path fallback lives in one more; all three are covered by tests, and the migration is covered by `init_vault` tests for moves and collisions.
- Verdict: proceed.
