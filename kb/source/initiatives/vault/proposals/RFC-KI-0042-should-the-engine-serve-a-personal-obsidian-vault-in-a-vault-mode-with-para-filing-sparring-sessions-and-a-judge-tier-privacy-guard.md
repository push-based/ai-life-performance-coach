---
doc_type: rfc
id: RFC-KI-0042
title: "Should the engine serve a personal Obsidian vault in a vault mode with PARA filing, sparring sessions, and a judge-tier privacy guard?"
summary: "A first external consumer, a TypeScript sparring app with an offline local tier and a judge tier that never sees notes, needs the engine to serve a hand-written Obsidian vault organised by PARA. The engine reads only its governed corpus of seven typed document kinds, which the vault does not fit. Proposes a vault mode beside that corpus: configurable vault root, schema-free scanner, folder-derived PARA buckets, a lazily inserted coach_id for stable identity, a session store, a vault MCP server, a tested judge-tier payload guard, and a PARA and mastery graph view. Weighs it against an eighth document type with instance hooks and against leaving the vault to the consumer. Option A is chosen; the package lives in this template repository, each session is its own file covering one or more notes, archive_project moves a project folder into the archive, and every vault is brought onto fixed PARA folder names before it is served. Holds open only the ADR-KI-0007 server boundary."
status: resolved
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-10-24
links: []
tags: ["topic/mcp-engine","topic/knowledge-graph","kind/decision"]
succeeded_by: ["ADR-KI-0058"]
---

# RFC-KI-0042: Should the engine serve a personal Obsidian vault in a vault mode with PARA filing, sparring sessions, and a judge-tier privacy guard?

> ✅ **Resolved by ADR-KI-0058** on 2026-10-24. Option A was adopted, with sparring limited to notes in PARA Resources; Open Questions 1 to 6 are settled there.

## Summary

A first external consumer, ai-coach, is a TypeScript sparring app with two tiers: a local model that questions the user on their own notes offline, and a frontier model that judges the user's answers without ever seeing the notes. It needs the engine to serve a personal Obsidian vault: list and read notes, file them into PARA buckets, record sparring sessions, report what is due for review, and draw a graph coloured by PARA bucket and mastery. The engine today serves only its own governed corpus of seven typed document kinds (ADR-KI-0002), which a hand-written vault does not fit. This RFC proposes a vault mode: a configurable vault root, a plain-markdown scanner that imposes no schema on existing notes, a folder-derived PARA classifier, a lazily written stable note identity, a session store, a vault MCP server, a privacy guard on what leaves for the judge tier, and a PARA/mastery graph view. It weighs that against modelling notes as an eighth document type and against leaving the vault entirely to the consumer.

## Problem Statement

The engine reads one corpus shape. `SCAN_SUBDIRS` is fixed to `decisions`, `proposals` and `evidence`, the scaffold and transition code map document types to those folders, and every document carries the six-field frontmatter core (observed: `packages/core/src/kernel/config/layout.ts`, `features/documents/scaffold.ts`, `features/documents/transition.ts` @ 2026-10-24). _Source: ADR-KI-0002 §Decision_

The consumer's vault has none of that shape (observed: the consumer's vault @ 2026-10-24):

- 169 markdown notes, of which 1 carries frontmatter and 3 use `[[wikilinks]]`.
- A `PARA/1.Projects | 2.Areas | 3.Resources | 4.Archive` folder tree. All pre-existing notes outside it were moved on 2026-10-24 into `PARA/4.Archive/old notes/`, so the vault now holds one active project folder and an archive.
- Notes in two languages, Polish and English.
- Hand-authored in Obsidian, outside git.

Three concrete scenarios fail today:

1. The coach cannot ask the engine which notes in an active project have never been sparred, because the engine has no note, no PARA bucket, and no session concept.
2. Filing a note from one PARA folder to another changes its path. Any history keyed by path is orphaned.
3. The graph view cannot show the vault. It reads `graph.json` for the governed corpus, and its server answers only for files git would commit. _Source: ADR-KI-0051 §Decision_

Leaving the vault to the consumer duplicates scanning, linking, search and graph code the engine already holds, and moves the privacy guard into application code where no test in this repository covers it.

## Goals

1. The vault root is configurable per invocation and per machine. Nothing from the vault, including its graph, is written into this repository.
2. A vault on the fixed PARA folders is served without editing any note: zero note contents changed by the first scan. Onboarding moves files and never edits their content.
3. A note's sparring history survives a move between PARA folders: 100% of sessions still resolve to their note after `file_note`.
4. The judge-tier payload provably excludes note bodies: a test fails if any note body line appears in `tier2_payload` output.
5. A consumer TypeScript app reaches every capability above over MCP stdio with no network access.

## Non-Goals

- Implementing either sparring tier, the question generation, the judging prompt, or the spaced-repetition algorithm. Those belong to the consumer. The consumer supplies each session's next review date; the engine stores it and compares it with today's date.
- Turning notes into ADR/RFC/EVID documents or validating them against the governed schema.
- Semantic or vector retrieval over the vault. Lexical search stays the only retrieval path. _Source: context/charter.md §Non-Goals_
- Syncing the vault across devices, or any hosted delivery. RFC-KI-0040 holds hosted delivery open separately.
- Rewriting Obsidian's own configuration under `.obsidian/`.

## Proposal

### Option A: a vault mode beside the governed corpus 💡 **Invented.**

A new package (working name `@docs-mcp/vault`) that reuses the kernel's markdown, search and graph primitives and owns everything vault-specific.

| Part | Behaviour |
| --- | --- |
| Vault root | Resolved from `--vault <path>`, then `DOCS_MCP_VAULT`, then `vault.root` in a config file outside this repository. |
| Scanner | Reads every `*.md` outside dot-folders. Frontmatter is optional. `[[wikilinks]]` and relative markdown links both become graph edges. |
| PARA classifier | Bucket and project or area name come from the path under fixed folder names: `PARA/0.Inbox`, `PARA/1.Projects`, `PARA/2.Areas`, `PARA/3.Resources`, `PARA/4.Archive`. There is no folder map. A note anywhere else is reported as out of place, never classified. |
| Vault onboarding | `init_vault` checks for the fixed folders. Where a vault's PARA folders carry other names it proposes renames for the user to approve; where none exist it creates them. It then moves every note outside `PARA/` into `PARA/4.Archive/old notes/`, from which the user files notes back one at a time. After onboarding nothing outside `PARA/` holds a note. |
| Note identity | On first sparring the engine inserts one frontmatter key, `coach_id`, by line-anchored edit and never by re-serializing the YAML. _Source: ADR-KI-0006 §Decision_ |
| Session store | One markdown file per sparring session under `Coach/sessions/` in the vault, a visible folder outside `PARA/` because sessions are system records, not notes. A session covers one or more notes, so a single run can verify several notes at once. Each records the `coach_id` of every note covered, tier, date, challenge, answer, verdict, gaps and the consumer-supplied next review date. The engine derives a note's mastery (unsparred, Tier 1, Tier 2 passed) and next review from its latest sessions by lookup, never storing either on the note. |
| Vault server | `docs-mcp serve --vault <path>`. Read: `list_notes`, `read_note`, `search`, `vault_graph`, `due_for_review`. Write, dry-run by default: `init_vault`, `capture` (into `PARA/0.Inbox`), `file_note`, `record_session`, `archive_project` (moves a project folder whole into `PARA/4.Archive/`). Guard: `tier2_payload`. |
| Privacy guard | `tier2_payload(session)` returns only the challenge and the answer. A test asserts no note body line appears in it. |
| Graph view | The force graph gains a vault data source, coloured by PARA bucket and ringed by mastery. A separate loopback view server, started with `--vault`, is rooted at the vault and serves the vault-local generated graph file. This repository's view server and its served-root rule are unchanged. |

Pros: no edit to the 169 existing notes on adoption, and afterwards one inserted key per note when first sparred; the governed corpus, its schema and its two MCP servers stay unchanged; vault and corpus content never share a served root. Cons: a third MCP server surface and a second view server to maintain; a second graph producer beside `graph.json`.

### Option B: notes as an eighth document type with instance hooks

The vault becomes an initiative. A `note` type joins the closed set, and ADR-KI-0052 hooks validate and parse the note-specific fields.

Pros: one server, one graph, one validator path. Cons: reopens the closed seven-type set (ADR-KI-0002); requires the six-field frontmatter core on every note, which edits all 169 notes on adoption; ties PARA moves to status folders; puts personal content inside the governed workspace.

### Option C: status quo, the consumer reads the vault directly

Pros: no engine change. Cons: the consumer rebuilds scanning, link resolution, search and graph; the privacy guard has no test in this repository; the graph view cannot show the vault.

## Tradeoffs

| Dimension | A: vault mode | B: eighth type | C: status quo |
| --- | --- | --- | --- |
| Notes edited on adoption | 0 | 169 | 0 |
| Change to ADR-KI-0002 type set | none | reopened | none |
| MCP server surfaces | 3 | 2 | 2 |
| View server roots | 2 | 1 | 1 |
| History survives a PARA move | yes, via `coach_id` | yes, via ID | consumer's problem |
| Privacy guard tested here | yes | yes | no |
| Personal content inside the governed workspace | no | yes | no |
| Engine code added | new package | type mapping plus hooks | none |

Does a vault server with write tools sit within ADR-KI-0007, which splits a write-capable maintainer server from a read-only consumer server? Option A treats the vault server as a third compartment owned by the vault's own user, not as a consumer surface.

## Rollout Plan

1. **Phase 1, read only.** Vault root resolution, scanner, PARA classifier, `list_notes`, `read_note`, `search`, `vault_graph`. Exit: the consumer lists the vault's notes by bucket over stdio with networking disabled; zero notes modified; no file under this repository changed.
2. **Phase 2, identity and sessions.** `coach_id` insertion, session store, `record_session`, `due_for_review`, `tier2_payload` with its leak test. Exit: every recorded session still resolves to its note after the note is moved by hand in Obsidian; the leak test runs in CI and fails on a planted note body line.
3. **Phase 3, filing.** `init_vault`, `capture`, `file_note`, `archive_project`, all dry-run by default. Until then a vault is onboarded by hand, as the first consumer's vault was on 2026-10-24. Each move refuses an existing target instead of overwriting it. Exit: every session still resolves to its note after a `file_note` move; a move onto an existing note is refused; `init_vault` on a vault with non-standard folder names changes nothing until the user approves the renames.
4. **Phase 4, view.** PARA and mastery colouring in the force graph, served by the vault-rooted view server. Exit: the view renders the vault; this repository's view server still answers only for files git would commit.

No migration applies to the governed corpus. On the vault side, adoption needs the fixed `PARA/` folder names. The first consumer's vault already has `1.Projects` to `4.Archive`; `0.Inbox` is created on first `capture`.

## Risks

| Risk | Mitigation |
| --- | --- |
| A vault write corrupts frontmatter by YAML round-trip, a hazard measured in an Obsidian CLI | Insert `coach_id` by line-anchored edit only. _Source: EVID-KI-0011 §Result_; ADR-KI-0006 |
| A move silently overwrites an existing note | `file_note` and `archive_project` refuse when the target exists, and preview by default. _Source: EVID-KI-0011 §Result_ |
| A move breaks relative markdown links | Wikilinks resolve by name and survive. Relative links found in a moved note are reported in the preview. |
| Vault content leaks into this repository or its served root | The vault root must resolve outside the workspace; the vault graph is written inside the vault. |
| Note content reaches the judge tier through the challenge text | `tier2_payload` excludes note bodies by test. The challenge is derived from notes, so paraphrased content can still reach the judge; the consumer documents this limit. |
| Instructions inside notes steer the coach | Notes are treated as untrusted data on the read path, as for raw intake. _Source: ADR-KI-0019 §Decision_ |
| Lexical search underperforms on Polish inflection | Measure recall on the vault before Phase 1 exits; record the result as an EVID. |

## Open Questions

1. Does the vault server count as a third compartment under ADR-KI-0007, or does ADR-KI-0007 need amending before Phase 1 ships?
2. ~~Does the package belong in this template repository or in the engine repository that ADR-KI-0039 splits out?~~ This template repository (decided 2026-10-24).
3. ~~Session storage: one file per session, or one file per note that accumulates sessions?~~ One file per session, which may cover several notes (decided 2026-10-24).
4. ~~Does `due_for_review` compute the schedule itself, or only read a `next_review` date the consumer supplies?~~ It reads the consumer-supplied date. Scheduling stays with the consumer per Non-Goals.
5. ~~Should `archive_project` move a project folder whole into `4.Archive/`, or mark it archived in place?~~ Move it whole (decided 2026-10-24).
6. ~~Which folder map is the default for a vault whose PARA folders are named differently from `1.Projects` … `4.Archive`?~~ None. Folder names are fixed; `init_vault` proposes renames or creates the folders, then archives everything outside `PARA/` (decided 2026-10-24).

## Links

- ADR-KI-0002: closed seven-type set that Option B reopens.
- ADR-KI-0006: line-anchored, dry-run-first mutation reused for vault writes.
- ADR-KI-0007: two-server boundary that the vault server must sit within or amend.
- ADR-KI-0019: read-path trust boundary applied to vault notes.
- ADR-KI-0039: repository split that decides where the package lives.
- ADR-KI-0051: served-root restriction that keeps the vault out of this repository's view server.
- ADR-KI-0052: instance hooks that Option B would use.
- EVID-KI-0011: Obsidian vault write hazards.
- EVID-KI-0013: personal AI-memory landscape, including Markdown-plus-MCP tools.
- RFC-KI-0040: hosted delivery, out of scope here.
