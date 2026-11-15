---
doc_type: adr
id: ADR-KI-0063
title: "Show plans on a separate read-only plans page beside the vault graph, with a goal cascade and an effort timeline"
summary: "The vault view server gains a read-only /plans page, linked to and from the coach graph, that shows the goal cascade from year to week beside an effort timeline of projects, workstreams and areas. Timeline cells show weighted work done and planned open work per period, opening on the current quarter by week; archived projects sit behind a toggle and a project's panel lists its Intermediate Packets. This refines ADR-KI-0062, whose review panel and packet links move from the coach graph to this page."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-10-31
links: ["ADR-KI-0062","ADR-KI-0061","ADR-KI-0058"]
tags: ["topic/mcp-engine","topic/knowledge-graph","kind/decision"]
refined_by: ["ADR-KI-0069"]
---

# ADR-KI-0063: Show plans on a separate read-only plans page beside the vault graph, with a goal cascade and an effort timeline

## Context

ADR-KI-0062 records plans, goals, tasks, slips and Intermediate Packets in the vault, and its Decisions 11 and 12 put a review panel and a packet-to-project link in the vault graph view. _Source: ADR-KI-0062 §Decision_ That view draws notes as a link graph coloured by PARA bucket and mastery, with books, chapters and pages. _Source: ADR-KI-0061 §Decision_

Planning data is ordered by time and by level, year to day, and the questions asked of it are where a period's effort went and whether a goal is on track; a note graph answers neither. On 2026-10-31 the maintainer chose a separate plans view over extending the coach graph, and settled its layout, interaction, default span, entry point, cell content, archive handling and click behaviour in a planning session.

## Decision

1. **The vault view server serves a separate plans page at `/plans`.** It runs on the same `docs-mcp view --vault` server, under the same loopback Host check and Content-Security-Policy, loads no library, and requests only `/plans.json`. The coach graph links to it and it links back. ADR-KI-0062's review panel and packet links live on this page instead of in the coach graph.

2. **The plans page is read-only.** It writes no note; planning stays in Obsidian and in the vault tools of ADR-KI-0062.

3. **`/plans.json?span=<period>&by=<level>` returns the page's data.** It holds the span's columns; one row per project with its workstreams, per area and for unlinked work, each with its status, note path, each cell's weighted work done (by done date) and weighted open work planned (by scheduled date), and the tasks behind those cells with status, size, schedule, slips and note path; the goals of every plan overlapping the span, nested under the goal they serve, each with its status, slips, note path and the row it counts for; each project's Intermediate Packets; and whether a project is archived. A span or level that is not a period, or a level not below the span's, is 400.

4. **The page shows the goal cascade beside the effort timeline.** The cascade runs from year to week goals, since a day plan holds none (ADR-KI-0062 Decision 6), each coloured met, open, missed or dropped, marked with its slip count, and ending at the project, workstream or area it links. Selecting a goal highlights its rows in the timeline.

5. **The timeline opens on the current quarter by week.** It zooms out to the year by month and in to a week by day, and steps to the previous or next span. A cell is shaded by work done and outlined by work planned, so a week's planned load shows before it starts.

6. **Archived projects are hidden until a toggle shows them, and a project's side panel lists its Intermediate Packets.**

7. **Selecting a goal, a row or a cell opens a side panel** with its tasks (status, size, schedule, slips) or the goal's review (its status, slips and the goals serving it), each linking to the note in Obsidian and in the coach graph by `#open=<path>`.

## Consequences

**Positive**

1. The coach graph stays a note graph; planning gets a view shaped by time and level.
2. One server, port and theme serve both views, under one security model.
3. Planned load shows per week before the week starts.
4. The page needs no write path, so it adds no new way to change a note.

**Negative**

1. The view server gains a second page of its own script to maintain beside the coach graph.
2. Each load recomputes planning over the whole vault, as the coach graph does.
3. Effort is weighted by size tags, so the timeline inherits ADR-KI-0062's estimate error.

## Alternatives Considered

1. **Extend the coach graph with plan nodes and a review panel, as ADR-KI-0062 first placed it.** Rejected because goals and periods have no place in a link layout, and the coach graph's filters and legend are about notes.
2. **A separate command and server for plans.** Rejected because two servers would need two ports and two tokens for one vault.
3. **Writes from the page (ticking, dragging to reschedule).** Deferred: the page starts read-only, and writes can follow under the token ADR-KI-0061 Decision 10 uses.

## Open Questions

1. Should the page later tick tasks and reschedule them by dragging, under the existing write token?

## Links

- ADR-KI-0062: refined; its review panel and packet links move from the coach graph to this page.
- ADR-KI-0061: the coach graph and its `#open` link.
- ADR-KI-0058: the vault view server.

## Challenge

**Challenge (2026-10-31):**
- Position: show planning on a separate read-only `/plans` page on the vault view server, with a goal cascade beside an effort timeline.
- Searched: ADR-KI-0062 Decisions 11 and 12 (review panel and packet links in the graph view); ADR-KI-0061 Decisions 7, 8, 10 and 14 (what the view server serves and writes); ADR-KI-0058 Decision 11 (the vault view server).
- Counter-evidence: ADR-KI-0062 placed the review panel in the coach graph; this decision moves it, and ADR-KI-0062 gains `refined_by`. The server's security model is unchanged, and the page serves only planning data already read by the vault tools.
- Applicability: the maintainer settled each decision point on 2026-10-31; nothing is built yet.
- Verdict: proceed.
