---
doc_type: adr
id: ADR-KI-0070
title: "Group concepts from many books under a topic with its own structure note"
summary: "A topic is a name the learner gives a subject they read several books on, such as ADHD. write_structure takes a topic instead of a book and writes its structure note beside the books' ones: it lists any concept notes the learner puts in it, from any book, with no completeness rule, and a concept is in at most one topic. A concept's topic group is the one it is shown and interleaved by, and due_for_review gives each item its topic. list_topics lists every topic with its concepts and the books they quote. A vault without topics behaves as before. This refines ADR-KI-0068."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-11-09
links: ["ADR-KI-0068","ADR-KI-0069"]
tags: ["topic/mcp-engine","kind/decision"]
---

# ADR-KI-0070: Group concepts from many books under a topic with its own structure note

## Context

A learner rarely reads one book on a subject, and the same idea shows up in each of them (reported: consumer handoff, 2026-11-09). ADR-KI-0068 lets one concept note quote several books, and gives it a place in each book's structure note. _Source: ADR-KI-0068 §Decision_ It has no structure that spans books, so the frame a learner needs across everything they read on a subject cannot be built. On 2026-11-09 the maintainer passed on the consumer's handoff asking for topics, with a structure note of their own that drives grouping and the due queue's mixing.

## Decision

1. **A topic is a name the learner gives a subject, and `write_structure` takes it in place of a book.** Exactly one of `book` and `topic` is given. A topic's structure note is `3.Resources/Concepts/Structures/<topic>.md`, with `topic:` in place of `book:` and the same groups and edges.

2. **A topic lists the concept notes the learner puts in it,** from any book or quoting none. There is no completeness rule: a concept left out is simply not in the topic. Every other structure rule holds: 2 to 7 groups, no empty group, a concept in one group, edges only between existing groups, no self edge, no cycle. The heading warning checks the headings of every book the listed concepts quote.

3. **A concept is in at most one topic.** A second topic that lists it is refused, naming the topic it is in. A topic named like a book the vault's concepts quote is refused, and so is a path that is the other kind's structure note, so a name in a concept's `groups:` always means one thing.

4. **The topic group is the one a concept is shown and interleaved by.** `write_structure` sets the topic's entry in the concept's `groups:` and a `topic:` key, and a concept dropped from a rewritten topic loses both. The due queue's key is the topic group when the concept has one, else its book group as ADR-KI-0068 Decision 4 gives it, else its book, else its folder. `due_for_review` items gain `topic` beside `book` and `group`. Group is done when any structure note lists the concept.

5. **`list_topics` lists every topic** with its structure note, its concept notes and the books they quote, sorted by name.

6. **A vault without topics behaves as before.** Book structure notes, concept frontmatter and the due queue are unchanged by this decision.

## Consequences

**Positive**

1. A subject read across several books gets one frame, and its ideas come back mixed in the due queue by that frame.
2. The climb page offers topics beside books, and its board draws, saves and reveals a topic's structure as it does a book's. _Source: ADR-KI-0069 §Decision_

**Negative**

1. A concept in a topic and in its books' structures has several groups; only the topic group drives the queue, and the book groups are shown on the stair only.
2. A concept cannot be in two topics. A learner with overlapping subjects picks one.

## Alternatives Considered

1. **A single `group:` as the handoff proposed.** Replaced by the `groups:` map ADR-KI-0068 already keeps, with the topic as one more entry and a `topic:` key naming it; the consumer reads only the due queue and the tools' results, whose shapes are as the handoff asked.
2. **A concept in several topics.** Deferred: the interleave key would need a choice between topics.
3. **A topic as a PARA area.** Deferred: nothing needs it yet.

## Open Questions

1. Should a topic link a PARA area such as `2.Areas/<topic>.md`, so planning sees it?

## Links

- ADR-KI-0068: refined; structures may be a topic's, and the topic group drives the queue.
- ADR-KI-0069: the climb page offers topics and draws their structure.

## Challenge

**Challenge (2026-11-09):**
- Position: let a structure note belong to a topic across books, with a concept in at most one topic and its topic group driving the due queue.
- Searched: ADR-KI-0068 Decisions 4 and 8; the structure, grouping and queue code in the vault package.
- Counter-evidence: two kinds of structure note share one folder and one frontmatter shape, so a name could mean a book or a topic.
- Applicability: a topic named like a book and a path of the other kind are refused, and tests cover topics across two books, the one-topic rule, the fallback to the book group, the interleave and a vault without topics.
- Verdict: proceed.
