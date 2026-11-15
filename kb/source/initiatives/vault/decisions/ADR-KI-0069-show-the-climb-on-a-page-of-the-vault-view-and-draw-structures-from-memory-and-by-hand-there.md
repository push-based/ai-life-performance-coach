---
doc_type: adr
id: ADR-KI-0069
title: "Show the climb on a page of the vault view, and draw structures from memory and by hand there"
summary: "The vault view server gains a /climb page: a table of every concept note's seven steps by book and group, a stair for one concept that can be animated and shown in presentation mode, a board, built with the open-source ng-diagram library, to draw a book's groups and builds-on arrows, and a freehand pen. The board saves a structure through write_structure, or takes a drawing from memory, keeps it with the server's clock before it returns the structure note, suggests a mark for each group and arrow, and records the learner's confirmed marks as a Generate attempt on the structure note. The pen saves a PNG under 3.Resources/Concepts/Sketches. Every write previews first and carries the page's token. This refines ADR-KI-0068 and ADR-KI-0063."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-11-09
links: ["ADR-KI-0068","ADR-KI-0063","ADR-KI-0061","ADR-KI-0058"]
tags: ["topic/mcp-engine","kind/decision"]
---

# ADR-KI-0069: Show the climb on a page of the vault view, and draw structures from memory and by hand there

## Context

ADR-KI-0068 records seven learning steps per concept note and reports them through the `climb` tool, as JSON. _Source: ADR-KI-0068 §Decision_ The vault view server already shows the vault as a graph and plans on a read-only `/plans` page. _Source: ADR-KI-0063 §Decision_ Nothing showed the climb. The talk this work serves ends with the speaker drawing a design system's four layers from memory (reported: maintainer handoff for the consumer, 2026-11-09).

On 2026-11-09 the maintainer asked for a visual climb and for drawing, and chose all four drawing options offered: drawing a book's structure from memory and comparing it with the structure note, drawing the structure to save it, animating the stairs, and a freehand sketch. For the page they chose a stair for one concept with a table of every concept.

## Decision

1. **The vault view server serves a `/climb` page,** linked from the graph and from `/plans`, with `/climb-view.js`, `/climb.json` (every concept note's climb with its book and group, the books with their concepts and structure note, and the saved sketches) and `/structure.json?book=<book>`. Like the other pages it loads nothing from off the machine and sets every text as text.

2. **The page shows a table and a stair.** The table lists each concept by group within the chosen book, with one cell per step: green when done, yellow for a done Teach, dashed when skipped. Selecting a concept draws its stair of seven steps rising from fluency to mastery, in the same colours, each step's date and evidence on hover, with the next step, the Teach gate and whether the `climb:` summary matches the evidence. Animate draws the stair one step at a time, and presentation mode shows only the stair.

3. **A board draws a book's structure: groups, their concepts, and builds-on arrows, built with ng-diagram.** ng-diagram is an open-source Angular diagramming library (Apache-2.0, version 1.4.0, by Synergy Codes) (observed: npm registry @ 2026-11-09). The board is a small Angular application in the private workspace package `packages/climb-board`, compiled ahead of time with Angular 21.2, the line that supports this repository's TypeScript 5.9. Its bundle is committed under `packages/vault/assets/climb-board/` with its third-party licences and served at `/climb-board/main.js` and `/climb-board/styles.css`, so the published vault package needs no Angular and the page still loads nothing from off the machine. `pnpm run build:climb-board` rebuilds it. The book's concepts start in a tray, a group is a container node the learner names, a concept joins a group when dragged into it, and an arrow is drawn from a group's bottom handle to another group's top handle: the first builds on the second. The page reads the drawing through a `window.climbBoard` bridge. In Structure mode it previews and writes through `write_structure`, whose rules decide. _Source: ADR-KI-0068 §Decision_

4. **In From memory mode the board takes the drawing before it shows the structure note.** The server refuses a drawing with fewer than two named groups that each hold a concept, unless the learner pressed I don't know, before it reveals anything. It then keeps the drawing as text with the attempt time from its own clock, reads the structure note, and returns it with the reveal time. For each group and each builds-on edge of the structure note it suggests a mark: a group is got it when a drawn group holds the same concepts, wrong when the closest drawn group holds only some, missed when none is drawn; an edge is got it when its matched groups are joined the same way, wrong when reversed, missed otherwise. The learner confirms or overrules every mark and corrects every `wrong`. The page then previews and records a `generate` session on the structure note, which counts for every concept the structure note lists. The kept drawing is dropped once recorded.

5. **A Generate attempt may name a structure note,** as it may a raw chapter: it carries no `coach_id`, the structure note is not edited, its marks are the structure's groups and edges, and the attempt is the drawing. This refines ADR-KI-0068 Decision 5.

6. **A freehand pen saves a PNG sketch of a concept or a book** to `3.Resources/Concepts/Sketches/<title> <date>.png`, numbered when the name is taken and never written over another file, after a preview. Only PNG data up to 4 MB is accepted, and `/sketch.png` serves only files in that folder. Nothing checks a sketch, and it is evidence for no step.

7. **Every write from the page carries the page's token, previews unless `execute: true`, and is checked by the vault as the tools are.** The writes are `POST /api/structure`, `/api/reveal`, `/api/generate` and `/api/sketch`, beside the existing mark and summary writes. _Source: ADR-KI-0061 §Decision_

## Consequences

**Positive**

1. The climb can be seen and shown on a projector without the consumer's terminal.
2. Drawing the layers from memory, the talk's closing moment, now leaves evidence the climb counts. The attempt time comes from the server's clock, not from the page.

**Negative**

1. A drawing waiting for its marks lives in the server's memory only. A restart before it is recorded loses it, and the learner draws again.
2. The table shows each concept's group, so a learner who looks at the Stairs tab before drawing from memory has seen the groups. The page does not hide them.
3. Suggested marks follow concept membership only. A group named differently but holding the same concepts is got it, and the learner decides on anything else.
4. The repository gains an Angular toolchain for one package and a committed bundle of about 470 KB. A change to the board's source is not live until `pnpm run build:climb-board` is run and its output committed; nothing checks that the bundle matches the source.

## Alternatives Considered

1. **A hand-written board of plain DOM and SVG.** Built first, the same day, and replaced at the maintainer's request by ng-diagram, which brings dragging into groups, ports, edge routing, panning, zoom and keyboard deletion that the hand-written board lacked (reported: maintainer, 2026-11-09).
2. **Draw in the consumer's terminal as text lines.** Kept as the consumer's option. It does not give the visual the maintainer asked for.
3. **Take the attempt time from the page.** Rejected: the server can prove the drawing was kept before it sent the structure only with its own clock.
4. **Save sketches inside the concept note's body.** Rejected: a sketch is not checked, and the note's body is the learner's summary and elaborations.

## Open Questions

1. Should a drawing waiting for its marks be kept in `Coach/` so it survives a restart?
2. Should the Stairs tab hide groups while a drawing from memory is open?

## Links

- ADR-KI-0068: refined; the climb is shown here, and a Generate attempt may name a structure note.
- ADR-KI-0063: the plans page this page sits beside.
- ADR-KI-0061: the token and origin rules for writes from a page.
- ADR-KI-0058: the vault view server this extends.

## Challenge

**Challenge (2026-11-09):**
- Position: show the climb on a page of the vault view, and let the page write structures, Generate attempts from a drawing, and sketches, each through the vault's own checks.
- Searched: ADR-KI-0058 Decision 11, ADR-KI-0061 Decision 10, ADR-KI-0063, ADR-KI-0068 Decisions 4 and 5; the view server's write guards.
- Counter-evidence: ADR-KI-0063 kept the plans page read-only, and this page writes. The writes use the same guards ADR-KI-0061 set for the chapter page.
- Applicability: each write previews and goes through a vault function with tests; the attempt order is proven by the server's clock; tests cover the token, the origin, the reveal, the marks and the sketch path.
- Verdict: proceed.
