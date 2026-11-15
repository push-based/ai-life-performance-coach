---
doc_type: adr
id: ADR-KI-0058
title: "Serve a personal Obsidian vault through a separate vault mode with fixed PARA folders, per-session files, and a third, user-owned MCP server"
summary: "The engine serves a personal Obsidian vault through a vault mode beside the governed corpus, with sparring limited to notes in PARA Resources: a sixth workspace package, fixed PARA folder names with an onboarding tool, a lazily inserted coach_id, one file per sparring session under Coach/sessions/, a tested judge-tier payload allowlist, and a vault-rooted view server. The vault server is a third kind of MCP server owned by the vault's user, separate from the two ADR-KI-0007 servers. Resolves RFC-KI-0042 and refines ADR-KI-0007 and ADR-KI-0056."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-10-24
links: ["RFC-KI-0042"]
tags: ["topic/mcp-engine","topic/knowledge-graph","kind/decision"]
resolves: ["RFC-KI-0042"]
refined_by: ["ADR-KI-0059","ADR-KI-0060","ADR-KI-0061","ADR-KI-0062","ADR-KI-0068"]
---

# ADR-KI-0058: Serve a personal Obsidian vault through a separate vault mode with fixed PARA folders, per-session files, and a third, user-owned MCP server

## Context

RFC-KI-0042 framed a first external consumer, ai-coach: a TypeScript sparring app whose local tier (Tier 1) questions the user on their notes offline and whose judge tier (Tier 2) scores answers without seeing the notes. It needs the engine to serve a personal Obsidian vault organised by PARA, record sparring sessions, and show which notes have been sparred.

The engine reads one corpus shape: seven typed document kinds with a six-field frontmatter core, scanned from `decisions`, `proposals` and `evidence` folders. _Source: ADR-KI-0002 §Decision_ The consumer's vault held 169 hand-written notes, 1 with frontmatter and 3 with wikilinks, outside git (observed: the consumer's vault @ 2026-10-24). Fitting it to the governed schema would edit every note.

ADR-KI-0007 ships two MCP servers, a write-capable maintainer server and a read-only consumer server, each composed from its own tool factory. A vault server writes into the vault, so it is neither. ADR-KI-0051 restricts this repository's view server to files git would commit, so it cannot show the vault.

The maintainer chose RFC-KI-0042 Option A on 2026-10-24 and settled its open questions on package placement, session storage, archiving, folder naming, and the server boundary.

## Decision

1. **The vault is served in a vault mode beside the governed corpus, not as part of it.** Vault notes are not documents under ADR-KI-0002, and the seven-type set is unchanged. The vault mode is a sixth workspace package, `@docs-mcp/vault`, in this template repository at the version and license of ADR-KI-0056; it depends on `@docs-mcp/core` only, and `@docs-mcp/mcp` and `@docs-mcp/cli` may depend on it. If ADR-KI-0039's repository split is accepted, the package moves with the engine half.

2. **The vault root resolves from `--vault <path>`, then `DOCS_MCP_VAULT`, then `vault.root` in a config file outside this repository.** The engine refuses a vault root inside this repository, and nothing from the vault, including its graph, is written under it. Vault content reaches the governed corpus only through governed intake, and the corpus never requires a vault. _Source: ADR-KI-0033 §Decision_

3. **PARA folder names are fixed, at the vault root: `0.Inbox`, `1.Projects`, `2.Areas`, `3.Resources`, `4.Archive`.** A note's bucket and its project or area come from its path under these folders; there is no configurable folder map. A note anywhere else is reported as out of place by `list_notes` and is never classified.

4. **`init_vault` brings a vault onto the fixed folders before it is served.** Its dry-run preview lists the folder renames, the folders to create, and every note to move; the user approves by re-running it with `execute: true`. It moves every note outside the five PARA folders, `Coach/` and dot-folders into `4.Archive/old notes/`, keeping each note's relative path and content, and the user then refiles notes with `file_note`. If any target path already exists, the preview lists the collisions and execution moves nothing.

5. **A note's identity is a `coach_id` frontmatter key, inserted by `record_session` for each covered note that lacks one.** The insertion is part of the same preview and the same `execute: true` as the session write. It is a line-anchored edit, never a YAML re-serialization; a note without frontmatter gains a block holding only `coach_id`. _Source: ADR-KI-0006 §Decision_

6. **Each sparring session is one markdown file under `Coach/sessions/` in the vault, a visible folder beside the PARA folders.** Sparring covers notes under `3.Resources` only; `record_session` refuses any other note, and a sparred note later moved out of Resources keeps its history but leaves `due_for_review`. A session covers one or more notes and records, per note, its `coach_id`, the tier, date, challenge, answer, a pass or fail verdict, gaps, and the next review date the consumer supplies.

7. **Mastery and due dates are derived from sessions by lookup and never stored on the note.**

   | State | Rule |
   | --- | --- |
   | Unsparred | no session covers the note |
   | Attempted | sessions exist, and the latest verdict at every tier is fail |
   | Tier 1 passed | the latest Tier 1 verdict is pass, and the latest Tier 2 verdict is fail or absent |
   | Tier 2 passed | the latest Tier 2 verdict is pass |

   `due_for_review` returns the notes under `3.Resources` whose latest session's next review date is on or before the call date, and separately lists unsparred notes under `3.Resources`.

8. **The vault server is a third kind of MCP server, owned by the vault's user, separate from both ADR-KI-0007 servers.** It starts with `docs-mcp serve --vault <path>` over stdio and is composed from its own tool factory, so the maintainer and consumer servers gain no vault tools. Read tools are `list_notes`, `read_note`, `search`, `vault_graph`, `due_for_review` and `tier2_payload`. Write tools are `init_vault`, `capture` (a new note in `0.Inbox`), `file_note` (moves one note into a named PARA folder), `record_session` and `archive_project` (moves a project folder into `4.Archive/`). Its preview suggests notes in the project that read as knowledge rather than project work: a concept note, a note with sparring history, one that cites raw material, or one linked from notes outside the project, each with a suggested folder under `3.Resources` and its reasons. Notes the user keeps, by `keep` or `keep_suggested`, move into `3.Resources` first and stay sparrable; the rest of the folder then moves to the archive, or the folder is removed when nothing is left in it. The maintainer settled this on 2026-10-25, closing the former Open Question 3.

9. **Every vault write previews by default and writes only with `execute: true`; every move refuses an existing target.** _Source: EVID-KI-0011 §Result_

10. **`tier2_payload(session)` is built from an allowlist: each covered note's challenge and the user's answer, and no other field.** A CI test asserts the payload's keys equal that allowlist and that a sentinel line planted in a covered note's body is absent from the payload.

11. **The vault graph is shown by a separate loopback view server rooted at the vault, started with `--vault`.** It colours nodes by PARA bucket and rings them by mastery from a graph file generated at `Coach/graph.json`. This repository's view server and its served-root rule are unchanged. _Source: ADR-KI-0051 §Decision_

## Consequences

**Positive**

1. An existing vault is served and filed with no edit to note content; a note gains one frontmatter key only when first sparred.
2. Sparring history survives any move of a sparred note between PARA folders, by tool or by hand.
3. One session can verify several notes at once.
4. The judge-tier payload allowlist is tested in this repository rather than asserted in application code.
5. The governed corpus, its schema, its two MCP servers and its view server are unchanged.

**Negative**

1. The engine now maintains a third MCP server, a second view server, and a sixth package.
2. A second graph producer exists beside `graph.json`, with no shared validation.
3. Onboarding moves every note outside the PARA folders into the archive, so a vault's existing structure is set aside until the user refiles it.
4. Lexical search recall on Polish inflection is unmeasured.
5. The judge tier can still receive paraphrased note content through challenge text, which no test can exclude.

## Alternatives Considered

1. **Notes as an eighth document type with ADR-KI-0052 hooks (RFC-KI-0042 Option B).** Rejected because it reopens the closed type set and requires the six-field frontmatter core on every note, editing all 169 notes on adoption.
2. **Status quo, the consumer reads the vault directly (Option C).** Rejected because the consumer would rebuild scanning, link resolution, search and graph, and the judge-tier allowlist would have no test here.
3. **Add vault tools to the ADR-KI-0007 maintainer server.** Rejected because it would put personal vault writes on the same surface as governed-corpus writes; a separate third server keeps the two compartments apart.
4. **A configurable PARA folder map.** Rejected in favour of fixed names so that every vault is classified the same way and no note lives outside the five PARA folders.

## Open Questions

1. Does `Coach/graph.json` need its own schema validation, or is it trusted as engine output?
2. What lexical recall does the vault reach on Polish notes? Measure it before the vault server ships and record it as an EVID.

## Links

- RFC-KI-0042: the proposal this resolves.
- ADR-KI-0002
- ADR-KI-0006
- ADR-KI-0007: refined by the third server kind; its two servers and their factories are unchanged.
- ADR-KI-0019: notes are untrusted data on the read path.
- ADR-KI-0033: vault mode stays within its write boundary.
- ADR-KI-0039: proposed split that would move the package to the engine repository.
- ADR-KI-0051
- ADR-KI-0052
- ADR-KI-0056: refined by the sixth package.
- EVID-KI-0011

## Challenge

**Challenge (2026-10-24):**
- Position: serve a personal Obsidian vault through a separate vault mode, sixth package, and third user-owned MCP server, sparring Resources only.
- Searched: grep over superseded, rejected and archived documents for obsidian, vault, third server and PARA (no hits); grep over accepted ADRs for obsidian, vault, personal memory, two servers, third server and server binaries (ADR-KI-0007, -0017, -0019, -0020, -0029, -0033, -0053, -0056); the EVID-KI-0011 date (2026-07-09); open and draft RFCs and open reports on server, vault, obsidian and consumer surfaces.
- Counter-evidence: ADR-KI-0007 ships two servers and ADR-KI-0056 five packages; both are refined by this decision, with `refined_by` set. ADR-KI-0033 B-1 to B-3 hold, because vault mode writes nothing into the corpus. ADR-KI-0039 is proposed, and its split is acknowledged in Decision 1. No open RFC or report covers this surface beyond RFC-KI-0042.
- Applicability: the read found 4 decision points with no actor or pass condition (`coach_id` insertion, the `init_vault` approval, sweep collisions, mastery for failed verdicts) and a tautological leak test. All were closed: the actor and preview were named, and the allowlist test was restated. The maintainer confirmed the four new rules and the Resources-only scope on 2026-10-24.
- Verdict: proceed with edits.
