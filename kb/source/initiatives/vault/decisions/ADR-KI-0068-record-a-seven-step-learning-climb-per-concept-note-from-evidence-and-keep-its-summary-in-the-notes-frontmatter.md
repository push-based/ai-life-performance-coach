---
doc_type: adr
id: ADR-KI-0068
title: "Record a seven-step learning climb per concept note from evidence, and keep its summary in the note's frontmatter"
summary: "The vault server records seven learning steps per concept note, read, group, generate, retrieve, elaborate, space and teach, each proven by evidence the vault holds: reading notes and a chapter summary, a structure note, or a session file. record_session gains generate, elaborate and teach sessions beside spar, each checked against its rules on the server; new tools write reading notes, a book's structure note and a guideline from a passed Teach session, and report or rebuild the climb. The climb is kept as a climb: summary in the concept note's frontmatter, written only from the evidence, which narrows ADR-KI-0058 Decision 7 for this one key. due_for_review gives a new concept its first review the next day and interleaves the queue by group or book."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-11-09
links: ["ADR-KI-0058","ADR-KI-0060","ADR-KI-0061","ADR-KI-0064"]
tags: ["topic/mcp-engine","kind/decision"]
refined_by: ["ADR-KI-0069","ADR-KI-0070","ADR-KI-0071"]
---

# ADR-KI-0068: Record a seven-step learning climb per concept note from evidence, and keep its summary in the note's frontmatter

## Context

The coach that consumes the vault server is being extended with seven learning steps per concept, which it calls the climb: read the material and note what matters, group the concepts and say what builds on what, guess before looking, recall with the material closed, explain why in one's own words, review again after a gap, and teach someone who does not know the topic (reported: maintainer handoff for the consumer, 2026-11-09). The steps come from *Building a Second Brain*, *Make It Stick* and, for teaching, a source the handoff marks as not yet checked against the book. The handoff's one rule is that the learner produces every piece of content and the models only ask, check, schedule and play roles.

The consumer reaches the vault only through this server, so every step needs somewhere to keep its evidence and a rule that says when it counts. Before this decision the server held only sparring sessions: every session item needed a pass or fail verdict and a next review date (observed: `packages/vault/src/sessions.ts` @ 2026-11-09). A guess before the reveal, an elaboration and a teach session fit none of that. Concept notes record the raw chapters they quote and the reading notes they came from, but nothing grouped them or said which step a concept had reached. _Source: ADR-KI-0060 §Decision_

The handoff stores the climb as a `climb:` block in the concept note's frontmatter. ADR-KI-0058 Decision 7 says mastery and due dates are derived from sessions and never stored on the note. _Source: ADR-KI-0058 §Decision_ On 2026-11-09 the maintainer chose the frontmatter block, chose to cover every step's server support in one change, and chose `3.Resources/Concepts/Structures/<book>.md` for a book's structure note, beside the flat folder of concept notes.

## Decision

1. **A concept note's climb has seven steps, each proven by evidence.** The steps are `read`, `group`, `generate`, `retrieve`, `elaborate`, `space` and `teach`, in that order. The order is a recommendation with one exception: a step can be done before an earlier one, and `climb` lists the earlier open steps as skipped, but Teach waits for a passed spaced review (Decision 9). A step is done only when the vault holds its evidence:

   | Step | Evidence | Done when |
   | --- | --- | --- |
   | read | a reading-notes file of a chapter the concept quotes, and that chapter's summary | the file holds one note in the learner's own words and the chapter summary is in their own words |
   | group | the book's structure note | the note lists the concept in a group |
   | generate | a generate session on the concept, or on a chapter it quotes | the attempt was saved before the reveal and every `wrong` mark carries a correction |
   | retrieve | a Tier 1 spar session | any spar, pass or fail |
   | elaborate | an elaborate session | the session passed its checks when recorded |
   | space | a Tier 1 spar session | it falls at least one day after the Tier 1 session before it on the same note, pass or fail; only a passed one, a *passed spaced review*, opens Teach |
   | teach | a teach session | its verdict is pass |

   Attempts count in the order of their sessions' dates, then of when they were recorded: a session dated another day than the clock's, as the consumer's `--today` sets it, takes its place by its date, and mastery's latest verdict and next review are the latest by date too (reported: consumer handoff, 2026-11-09).

   Only Tier 1 sessions count for retrieve and space. A Tier 2 session is the judge grading an answer already given, recorded on the day the learner is back online, so it is no new recall and does not space one (reported: maintainer, 2026-11-09).

   Own words means sharing no run of six or more words, folded as quotes are folded, with the text compared against. The step's date is the first evidence's date.

2. **The climb is kept as a `climb:` summary in the concept note's frontmatter, written only from the evidence.** The block holds each step's date or `null`. Every tool that adds evidence sets the summary of each concept note that evidence reaches, in the same preview and the same write. `climb` reports each concept's steps with their evidence, the stored block, and whether the two agree; `rebuild_climb` sets every disagreeing block to what the evidence gives. `climb`, `groups` and the older `group` join the keys `set_frontmatter` refuses, so neither is written by hand. ADR-KI-0058 Decision 7 still holds for mastery and due dates. These are the summaries stored on a note: `climb:`, and `groups:`, which repeats the structure notes (Decision 4). The evidence stays the record of truth.

3. **Read: `add_reading_notes` writes the learner's notes on a chapter.** Each note is added dated under `## Page N`, or under `## Notes` for the chapter as a whole, of `3.Resources/Reading notes/<book>/<chapter>.md`, and links back to the page. A note sharing six or more words in a row with the page is kept as a quote, marked as one, and does not count for Read. The preview warns when a page's notes hold more than a fifth of its words. The chapter summary stays the one `write_summary` writes. _Source: ADR-KI-0061 §Decision_ A concept created with `create_concept` gets the steps the vault already proves for it, so a concept made from a read chapter starts with `read` set.

4. **Group: `write_structure` writes a book's structure note from the learner's own groups.** The note is `3.Resources/Concepts/Structures/<book>.md`; its frontmatter holds the groups, their concept notes and the `builds_on` edges, and its body is rendered from them and never read back. The tool refuses fewer than two or more than seven groups, an empty group, a concept of the book in no group or in two, a concept of another book, an edge naming a group that does not exist, a group building on itself, and a cycle, which it names. It warns once for each group named word for word after a heading of the book. It sets the book's entry in each concept note's `groups:`, a map from book to group. Rewriting the note regroups the book. A concept note belongs to every book it quotes, so each of those books' structure notes must place it, and in each it may sit in a different group (reported: maintainer, 2026-11-09). Group is done once any of its books places it; `climb` lists the books whose structure note does not place it yet. The page, the climb and the due queue show and interleave a concept by its group in the first of its books that places it. A single `group:` written before this is read as the group in the concept's first book, and `write_structure` replaces it with `groups:`.

5. **Generate: a `generate` session records a guess made before the answer was shown, and its correction.** The challenge is the prompt shown, the answer the attempt, of at least ten words unless the learner answered `/idk`. The session holds when the attempt was saved and when the answer was revealed. A reveal before the attempt is recorded with a warning and does not count. Every core assertion is marked `got it`, `wrong` or `missed` exactly once, and a `wrong` without a correction is refused. The item is `ungraded`: no verdict, and a next review date only when the consumer gives one. An attempt may name a raw chapter before it is read; it then carries no `coach_id`, the chapter is not edited, and it counts for the concepts quoting that chapter.

6. **Retrieve: sparring is unchanged.** A free-recall opening is the consumer's: its question and answer are recorded as the item's challenge and answer, as any spar's are.

7. **Elaborate: an `elaborate` session records one `why`, one `connect` and one `apply` answer.** A `why` answer gives a reason with a causal connective. A `connect` answer links another note of the vault or names a thing from the learner's own work, and a link to the concept note itself does not count. An `apply` answer names a concrete place or links a `1.Projects` note. An answer sharing a six-word run with the note's body, core assertions or quotes is refused, and so is a question that does, since it would give the answer away. On execute the answers are appended, dated, under `## My elaborations` in the concept note. The item is `ungraded`.

8. **Space: the due queue starts a new concept the next day, never retires one, and interleaves.** A concept note that no session has given a next review date, and that has no spar, is due the day after its `created` date and is listed with `firstReview: true`. A Generate attempt without a next review date leaves it so (Open Question 1). The next review date is the latest any session gave, of any kind; mastery is still worked out from spar sessions only. Due notes are ordered by date and path, then each place takes the earliest remaining note whose group differs from the one before. Without a group, a concept's key is its book, and without a book its folder. The same vault on the same day gives the same order. No note is ever dropped from the queue, however many passes it has.

9. **Teach: a `teach` session records a lesson the learner gave a student.** The session holds the turns, the core assertion the student's one misconception inverts, whether the learner corrected it, and the terms left undefined. It is refused until the note has a passed spaced review, a Tier 1 spar passed at least a day after the Tier 1 session before it. A pass is refused unless the misconception was corrected and no term is left undefined. A student turn that shares a six-word run with the note's text which the learner never said is refused, since the student knows only the title and its misconception. The vault builds the item's challenge from the student's turns and its answer from the learner's, so the judge-tier payload carries the student's questions and the learner's lesson and still nothing else. _Source: ADR-KI-0058 §Decision_ `save_guideline` writes a passed lesson's learner turns, read from the session file, to a new note in a folder under `1.Projects` or `3.Resources` that the learner picks.

10. **Session files gain a kind.** A session record of version 2 carries `kind`: `spar`, `generate`, `elaborate` or `teach`. A spar session is still written as version 1, and every version 1 file is read as a spar session. A version 2 record of kind `spar` is read as well, but no tool writes one.

## Consequences

**Positive**

1. Each step has one place where it is proven, and the server refuses evidence that breaks a step's rule, so a model's opinion cannot mark a step done.
2. The climb is readable in Obsidian on the concept note itself, and in tool output with each step's evidence.
3. Old sessions, concept notes and vaults keep working: no file is migrated, and a concept note without a `climb:` block holds no dates until evidence arrives.

**Negative**

1. A note can now hold a stored summary that disagrees with its evidence, for example after a session file is deleted. `climb` reports it and `rebuild_climb` fixes it, but nothing fixes it unasked.
2. `record_session` now edits a concept note's frontmatter beyond `coach_id`, and an elaborate session edits its body. Both are in its preview.
3. The six-word rule is literal: a paraphrase that keeps a six-word phrase is treated as a quote, and a close paraphrase with no such run passes.
4. A book's structure note must name every concept of the book, including concepts drawn partly from other books, so a concept created after grouping leaves the structure incomplete until it is rewritten.

## Alternatives Considered

1. **Work the climb out from the evidence on every read and store nothing on the note.** This keeps ADR-KI-0058 Decision 7 whole, and `climb` already does the working out. Rejected by the maintainer on 2026-11-09 in favour of the handoff's frontmatter block, which shows each step in Obsidian.
2. **A structure note at `3.Resources/Concepts/<book>/_structure.md`, as the handoff suggests.** Rejected: concept notes are kept in one flat folder, and a per-book folder holding only the structure note would be the only one of its kind.
3. **A structure note beside the raw book under `3.Resources/0.Raw/`.** Rejected: raw resources are reference material that is not edited. _Source: ADR-KI-0059 §Decision_
4. **Leave every rule to the consumer and store whatever it sends.** Rejected: the consumer's rule is that rules live in code and a model's opinion never overrules one, and the vault is the last code that sees the evidence before it is kept.

## Open Questions

1. The handoff says a Generate attempt schedules no review, and also that a first Generate gets its first review the next day. This decision lets the consumer choose by passing a next review date or not.
2. Should `edit_note` refuse to change `## My elaborations`, as it refuses task lines?
3. Should a structure note record concepts created after it as ungrouped, rather than leave the book incomplete?

## Links

- ADR-KI-0058: refined; Decision 7 now has one stored summary beside the derived mastery and due dates, session files gain a kind, and the judge-tier payload's challenge and answer are built from a Teach session's turns.
- ADR-KI-0060: refined; concept notes gain `climb:`, `groups:` and `## My elaborations`, all written by vault tools.
- ADR-KI-0061: a chapter summary is half of the Read step's evidence.
- ADR-KI-0064: the new writers return versions and check them on execute as its writers do, and `set_frontmatter` refuses `climb` and `group`.

## Challenge

**Challenge (2026-11-09):**
- Position: keep each step's evidence in the vault, check each step's rules on the server, and keep a `climb:` summary on the concept note that is written only from that evidence.
- Searched: ADR-KI-0058 Decisions 5, 7 and 10; ADR-KI-0060; ADR-KI-0061; ADR-KI-0064 Decision 2; the vault package's session, mastery, payload, concept and note-edit modules.
- Counter-evidence: ADR-KI-0058 Decision 7 keeps mastery off the note so a moved or hand-edited note cannot drift from its history. A stored summary can drift (Negative 1).
- Applicability: the summary is written in the same step as its evidence and rebuilt from it, mastery and due dates stay derived, and the drift is reported by `climb`. Each step's rule, the interleave and the Teach gate have tests on the handoff's demo material.
- Verdict: proceed.
