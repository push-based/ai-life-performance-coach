---
doc_type: adr
id: ADR-KI-0071
title: "Extend a concept note with another book's passages instead of a duplicate"
summary: "A new vault tool, extend_concept, adds another book's passages, more reading notes or more core assertions to an existing concept note, so an idea read in several books stays one note with one climb. Each passage is verified as create_concept verifies it; nothing on the note is removed or rewritten; a passage it already quotes and going past 12 passages or 6 assertions are refused; added assertions come with a warning when past sessions were judged against fewer. It refreshes the note's climb. This refines ADR-KI-0060 and ADR-KI-0068."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-11-09
links: ["ADR-KI-0060","ADR-KI-0068","ADR-KI-0070"]
tags: ["topic/mcp-engine","kind/decision"]
---

# ADR-KI-0071: Extend a concept note with another book's passages instead of a duplicate

## Context

`create_concept` writes a concept note once and refuses to write over one. _Source: ADR-KI-0060 §Decision_ When the learner meets an idea they already hold in a second book, they could only make a second concept note for it, with its own climb, or leave the second book's quotes out (reported: consumer handoff, 2026-11-09). A concept note may quote several books and belongs to each. _Source: ADR-KI-0068 §Decision_ The consumer's multi-book synthesis needs a way to add to a note.

## Decision

1. **`extend_concept` adds passages, reading notes or core assertions to an existing concept note,** named by path or title. Each passage is checked against the raw text exactly as `create_concept` checks it, and the result lists each with `found` and `problem`.

2. **It never removes or rewrites what is there.** It appends to `source_passages`, `from_notes` and `core_assertions` in the frontmatter, adds the quotes to the body's `## Source passages`, and adds the reading notes to `## From my reading notes`, creating that section before `## My elaborations` when it is missing.

3. **It refuses a passage the note already quotes** (compared as quotes are folded), a note that is not a concept note, a reading note that is missing, raw or already named, an assertion already there, and going past `create_concept`'s limits of 12 passages and 6 assertions.

4. **New assertions change what the note is sparred against, so the preview warns** when sessions already cover the note, naming how many and how many assertions they were judged against.

5. **It refreshes the note's `climb:`.** Read may become done through the new chapter. It previews and returns versions like the climb's other writes.

## Consequences

**Positive**

1. One idea keeps one note and one climb, however many books it is read in.

**Negative**

1. A note's earlier sessions were judged against fewer assertions than its next review will be.

## Alternatives Considered

1. **Let `create_concept` overwrite.** Rejected: it would drop the learner's elaborations and the note's history fields.
2. **Edit the note with `edit_note`.** Rejected: quotes would not be verified, and the frontmatter lists are not reachable through it.

## Links

- ADR-KI-0060: refined; a concept note can gain passages after it is written.
- ADR-KI-0068: a concept quoting several books belongs to each, and its climb is refreshed.
- ADR-KI-0070: topics gather such concepts across books.

## Challenge

**Challenge (2026-11-09):**
- Position: add to a concept note through a checked tool rather than duplicate it per book.
- Searched: ADR-KI-0060 Decision on concept writes, `create_concept`'s checks and limits, ADR-KI-0068 Decision 4.
- Counter-evidence: added assertions change the bar for a note with history (Negative 1).
- Applicability: the change is warned in the preview, and tests cover the second book's quote, a quote not found, a duplicate, the limits and the climb refresh.
- Verdict: proceed.
