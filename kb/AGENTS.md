# Working in this knowledge base

A docs-mcp workspace. Decisions (ADR), questions (RFC), and evidence (EVID) live under
`source/`, grouped into initiatives. A generated wiki summarizes them, and `output/` holds
deliverables written on top. People supply the raw material, and you write the documents.

This file holds this workspace's own rules. The general rules for reading and changing the
corpus come from the docs-mcp server: load the `corpus-navigation` skill with `get_skill`
before you read, and `corpus-maintenance` before you change anything.

## Precedence

When two sources disagree, the higher one wins:

1. A human decision made for the change in hand.
2. The rules in the initiative's own `AGENTS.md`, in `source/initiatives/<slug>/`.
3. The rules in this file.
4. The defaults of the procedures that run the knowledge base.
5. The code and config — schemas, validators, `docs-mcp.config.json`.
6. Patterns in documents already in the corpus.

The closer rule wins, not the stricter one: an initiative's rule overrides this file's for that
initiative, whichever of the two asks for more.

Rank 6 is last because the corpus contains its own history: superseded decisions, drafts, and documents
written before a standard existed. Matching what is already there reproduces it.

## When you write

**Paraphrase, and attribute by role.** Source documents carry no verbatim speech, and raw material that
does gets paraphrased on the way in. Name a role only where it bears on a decision's authority, and only
where enough people hold that role for it to be a category; where one person holds it, naming the role
names the person, so widen it or drop it. `owners` and `reviewers` carry team names for the same reason.

**Record the observation, not the judgement.** What a person or team did is recordable; what it revealed
about them is an inference the document cannot support. Characterizations also age badly — they outlast
the situation that produced them, and the next reader inherits the verdict without the context. This
holds in both directions: praise dates as poorly as criticism. Where a characterization is the natural
phrasing, give what was observed and when instead.

**Date what will go stale.** A count, a metric, a file path, the state of a moving system: attach how it
was known and when — `(observed: <where> @ <date>)`, `(reported: <who>, <date>)`,
`(inferred: <from what>)`, or `(assumed)`. A future reader needs to know what to re-check.

**Cite what you build on.** Anything written into `output/` traces each non-obvious claim to the section
it came from, as `_Source: <ID> §<Section>_`. Where the source is not an accepted ADR, add its
`(<doc_type>, <status>)` so a reviewer sees the trust level without opening it. Accepted ADRs and
evidence ground claims; an RFC establishes only that a question is open, never what is true; the wiki
routes to sources and never grounds a claim by itself. Where evidence and an accepted ADR conflict, the
ADR wins.

## Local rules

Add this workspace's own rules here. An initiative's own rules go in its `AGENTS.md`, in
`source/initiatives/<slug>/`. Where a rule and the situation conflict, say so and ask rather
than picking silently.
