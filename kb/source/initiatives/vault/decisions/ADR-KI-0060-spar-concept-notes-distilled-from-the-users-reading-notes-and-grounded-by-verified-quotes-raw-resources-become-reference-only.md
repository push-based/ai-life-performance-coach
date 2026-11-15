---
doc_type: adr
id: ADR-KI-0060
title: "Spar concept notes distilled from the user's reading notes and grounded by verified quotes; raw resources become reference only"
summary: "Nothing under 3.Resources/0.Raw is sparred any more. The sparred unit is a concept note: one idea the user kept, written from their reading notes with core assertions, forbidden buzzwords and verbatim passages, each passage checked against the raw text it cites when written and on every read. New tools find_passages and create_concept; scheduling stays in sessions, and the judge payload carries a concept note's core assertions only when the consumer asks. Partially supersedes ADR-KI-0059 and refines ADR-KI-0058."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-10-24
links: ["ADR-KI-0059","ADR-KI-0058"]
tags: ["topic/mcp-engine","topic/knowledge-graph","kind/decision"]
refined_by: ["ADR-KI-0061","ADR-KI-0068","ADR-KI-0071"]
---

# ADR-KI-0060: Spar concept notes distilled from the user's reading notes and grounded by verified quotes; raw resources become reference only

## Context

ADR-KI-0059 made every raw resource under `3.Resources/0.Raw` sparrable, and split each converted book into chapter notes that were sparred and scheduled one by one. Its Alternative 3, sparring only notes distilled from a raw resource, was rejected then because the maintainer wanted to spar a book directly; its Negative 4 recorded the cost, that sparring raw text tests recall of the author's words.

The first sparring sessions against a converted chapter showed that cost in practice (reported: the maintainer, 2026-10-24). A chapter is mostly narrative around a few ideas, so a challenge generated from it targets anecdotes and transitions. One idea, such as a book's method for compressing notes, is spread over several chapters, so an answer that draws on the whole book is graded as out of the chapter's scope. With no fixed reference, the grading tier builds its own reference answer on each run, and verdicts on the same answer vary between runs.

The maintainer reads a source before it is filed under `0.Raw`, and while reading writes rough notes, favourite quotes and takeaways. Those notes already record which ideas the maintainer chose to keep. On 2026-10-24 the maintainer decided that sparring starts from them: a concept note per idea, written with the consuming app from the reading notes and checked against the raw text, and raw resources become the reference that check uses.

## Decision

1. **Raw resources are reference material and are never sparred.** `record_session` refuses every note under `3.Resources/0.Raw`, a converted book's chapters and index included, and `due_for_review` lists none of them. This partially supersedes ADR-KI-0059 Decision 2 and the sentence of its Decision 5 that sparred each chapter; the rest of ADR-KI-0059, including the folders, conversion and chapter splitting, stands. Chapters remain the unit an agent reads, because a whole book does not fit a local model's context.

2. **A concept note holds one idea the user chose to keep, and is the unit that is sparred and scheduled.** It is a note under `3.Resources` outside `0.Raw` whose frontmatter has `type: "concept"`, and it goes to `3.Resources/Concepts/<title>.md` unless another such folder is given. Its frontmatter carries `core_assertions` (1 to 6 claims that define the idea, which a judge checks an explanation against), `forbidden_buzzwords` (up to 5 terms a Feynman drill bans), `source_passages` (1 to 12 verbatim quotes, each with the raw `note` and the `pages` it is on), `from_notes` (the user's reading notes it was distilled from) and `created`. Its body is the idea in the user's own words, then each passage as a quote with a link to its page, then links to the reading notes, so the graph links each concept to the chapters that ground it. Other notes under `3.Resources` outside `0.Raw` stay sparrable as ADR-KI-0058 Decision 6 provides.

3. **Every passage is checked against the raw text it cites, when the note is written and on every read.** A quote matches when its text, with case, whitespace, typographic quotes and dashes, conversion escapes and words broken at a line end folded, appears on the cited pages; `…` marks an elision whose pieces must appear in order, and a quote may cross into the next page. A quote given without pages is looked up page by page and the pages found are stored. A quote must be at least 12 characters once folded, and may cite only a raw note that holds text: not a book's index, not a note outside `0.Raw`. `create_concept` refuses the whole note when any passage is not found, and `read_note` reports each passage of a concept note with `found`, so a quote lost when its raw note changes is visible.

4. **The vault server gains two tools.** `find_passages` searches the text of raw resources one page at a time, optionally within one folder, and returns the raw note, its book, the page and a snippet per hit, so a reading note can be matched to the pages it came from. `create_concept` validates and writes a concept note, previewing by default with every passage's check and writing only with `execute: true`, and refuses to replace an existing note. `read_note` returns a concept note's fields and checked passages; `list_notes` filters concept notes; `due_for_review` marks each entry as a concept note or not.

5. **Grouping reading notes into ideas, choosing the assertions and buzzwords, and questioning the user about gaps belong to the consuming app.** The engine supplies the search, the verification and the write, and decides nothing about which ideas matter.

6. **Scheduling state stays in session files.** A concept note carries no review dates or scheduler parameters, as ADR-KI-0058 Decision 7 requires; the consumer derives them from `read_note` history entries.

7. **The judge-tier payload carries core assertions only on request.** By default `tier2_payload` still carries each item's challenge and answer and nothing else. With `include_assertions: true`, set per call by the consumer, each item also carries `core_assertions`: the covered concept note's assertions, or `[]` for a note that is not a concept note. Nothing else is added: no body, buzzword, passage, path, title or id. This refines ADR-KI-0058 Decision 10, whose allowlist gains this one opt-in key; its test asserts both key sets and that the planted body line, buzzwords and passages stay absent. The maintainer chose the option on 2026-10-24 because the assertions are the user's distillation of a published source, not private notes.

8. **The vault graph view draws concept notes as diamonds,** and a book's panel lists the concept notes that quote it in place of a count of sparred chapters.

## Consequences

**Positive**

1. Sparring targets only ideas the user chose to keep, so no challenge is drawn from a book's narrative filler.
2. An idea spread over several chapters becomes one note that cites all of them, so an answer drawing on the whole book is in scope.
3. Grading has a fixed reference in each concept note's assertions and quotes, in place of a reference answer rebuilt on each run.
4. A quote in a concept note cannot be wrong without the engine reporting it, at write time and on every later read.
5. Writing a concept note from one's own reading notes is itself an act of recall and distillation, before any sparring.

**Negative**

1. Nothing is sparred until a concept note exists, so a newly converted book adds no review work by itself.
2. Sessions already recorded against raw chapters keep their history but leave `due_for_review`; their ideas must be distilled into concept notes to be scheduled again. None existed in the maintainer's vault (observed: `Coach/sessions/` absent @ 2026-10-24).
3. Verbatim matching is lexical. A quote retyped with a different word, or taken from a PDF whose extraction garbled the text, is refused even when it is faithful in meaning.
4. A concept note's quotes duplicate raw text, in the frontmatter and in the body.

## Alternatives Considered

1. **Keep sparring raw chapters, with better challenge generation (status quo, ADR-KI-0059 Decision 2).** Rejected by the maintainer: the failures came from the unit being sparred, not from the prompt.
2. **Let an agent distil a whole book into concept notes without the user's reading notes.** Rejected because the agent cannot know which ideas the user found important, and it would skip the distillation the user does while writing notes.
3. **Store review dates and scheduler state in the concept note's frontmatter.** Rejected because ADR-KI-0058 Decision 7 derives scheduling from sessions, which keeps history attached by `coach_id` when a note moves and keeps notes free of generated state.
4. **Store passages only as body text, as the session store uses a fenced block.** Rejected in favour of frontmatter that `read_note` returns parsed; the body renders the same passages for reading in Obsidian.
5. **Match quotes by similarity rather than verbatim.** Rejected for now: verbatim matching is deterministic and explains every refusal, which is what a fixed reference needs.

## Open Questions

1. Should `create_concept` also file the reading notes it names, for example out of `0.Inbox`, once their ideas are captured?
2. Should a concept note whose passage is no longer found leave `due_for_review` until it is repaired?

## Links

- ADR-KI-0059: partially superseded; raw resources are no longer sparred.
- ADR-KI-0058: refined; Decision 6's sparring scope excludes `0.Raw`, Decision 8's tool list gains `find_passages` and `create_concept`, and Decision 10's allowlist gains the opt-in `core_assertions` key.
- ADR-KI-0006: dry-run-first, never-overwrite writes.

## Challenge

**Challenge (2026-10-24):**
- Position: raw resources stop being sparred; concept notes distilled from the user's reading notes, with verbatim quotes verified against the raw text, become the sparred unit.
- Searched: grep over `source/initiatives` for concept note, core assertion, forbidden buzzword, reading notes, verbatim quote and distil (hits are evidence on LLM-wiki and second-brain designs, EVID-KI-0015, EVID-KI-0020 to EVID-KI-0025, and corpus decisions ADR-KI-0011, ADR-KI-0015 and ADR-KI-0050; none governs vault sparring); accepted siblings ADR-KI-0058 (Decisions 6, 7, 8 and 10) and ADR-KI-0059 (Decisions 2 and 5, Alternative 3).
- Counter-evidence: ADR-KI-0059 rejected this as its Alternative 3 on the maintainer's preference, which the maintainer reversed on 2026-10-24 after the first sessions. The judge's need for assertions conflicts with ADR-KI-0058 Decision 10's allowlist; the maintainer settled it on 2026-10-24 as an opt-in key, Decision 7.
- Applicability: shipped with tests for refusals, matching, re-checking on read and the tool surface.
- Verdict: proceed.
