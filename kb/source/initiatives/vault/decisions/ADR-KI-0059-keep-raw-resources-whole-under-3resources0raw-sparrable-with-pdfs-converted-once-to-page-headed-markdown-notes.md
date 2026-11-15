---
doc_type: adr
id: ADR-KI-0059
title: "Keep raw resources whole under 3.Resources/0.Raw, sparrable, with PDFs converted once to page-headed markdown notes"
summary: "Whole sources such as ebooks and articles live under 3.Resources/0.Raw/<kind>/<author>/<work>/ and can be sparred like any Resources note. A PDF there becomes e-book.pdf and is converted once, offline with pdf.js, into one note per chapter, a long chapter in parts under a size limit, with text.md as the book's index; page links resolve to the chapter holding the page. Refines ADR-KI-0058."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-10-24
links: ["ADR-KI-0058"]
tags: ["topic/mcp-engine","topic/knowledge-graph","kind/decision"]
succeeded_by: ["ADR-KI-0060"]
refined_by: ["ADR-KI-0061"]
---

# ADR-KI-0059: Keep raw resources whole under 3.Resources/0.Raw, sparrable, with PDFs converted once to page-headed markdown notes

> ⚠️ **Partially superseded by [ADR-KI-0060](./ADR-KI-0060-spar-concept-notes-distilled-from-the-users-reading-notes-and-grounded-by-verified-quotes-raw-resources-become-reference-only.md)** on 2026-10-24. ADR-KI-0060 now owns what is sparred: raw resources, a book's chapters included, are never sparred, so Decision 2 and the last sentence of Decision 5 no longer hold, and Alternative 3 is the adopted design. This ADR still governs the `0.Raw` folder layout, conversion, chapter splitting, the index, link resolution, `list_raw`, `read_note { pages }`, and the graph view's squares.

## Context

ADR-KI-0058 serves a personal Obsidian vault on fixed PARA folders and spars notes under `3.Resources`. It reads only markdown, so a whole source kept for later, such as an ebook, is invisible to the engine and to the sparring app that uses it.

The maintainer keeps such sources whole in the vault, to return to at any time, to distil into smaller notes, and to give the local sparring tier context. The first is a 7.3 MB PDF of a 237-page book. Text extraction with pdf.js, run offline, returned 407,347 characters across 237 pages, 2 of them empty, in under half a second (observed: the consumer's vault @ 2026-10-24).

A whole book is far larger than a local model's context, and one note per book gives the whole book one mastery and one review date. The book's outline lists an introduction, ten chapters in three parts and a bonus chapter; its chapters run from 7 to 28 pages, up to about 48,000 characters each (observed: the same PDF @ 2026-10-24). The maintainer settled the folder, sparring, conversion, linking and splitting questions on 2026-10-24.

## Decision

1. **Raw resources live under `3.Resources/0.Raw/<kind>/<author>/<work>/`.** A raw resource is any file there: a PDF, a clipped article in markdown, a converted book. The folders below `0.Raw` name, in order, its kind (`Books`, `Articles` …), its author, and the work; a file placed higher up has none of the missing levels. A markdown file there is a raw note; every other note under `3.Resources` is a distilled note.

2. **A raw note can be sparred like any other Resources note, except a converted book's index.** This makes explicit that ADR-KI-0058 Decision 6 covers notes under `0.Raw`. `record_session` refuses an index, and `due_for_review` leaves it out of the unsparred list. The judge tier still receives only `tier2_payload`, so raw text never leaves through it.

3. **The user, or the consuming app on the user's request, converts a PDF under `0.Raw` by calling `convert_raw`; nothing converts on its own.** Inside a work folder the PDF is always `e-book.pdf`. A PDF not yet there moves first, its bytes unchanged, to `<kind>/<author>/<title>/e-book.pdf`: the author is the given one, else the author folder it is in, else the PDF's metadata author; the title is the given one, else the metadata title, else the file name; without an author the conversion is refused. The preview runs the extraction and returns the move and the full chapter list; `execute: true` writes them. A move or write onto an existing file is a collision, and nothing is written while any exists. _Source: EVID-KI-0011 §Result_ A PDF whose every page is empty after extraction, as a scanned PDF without a text layer is, is refused.

4. **Every book is split by chapter, and a chapter over a size limit into parts.** Chapters are the PDF's outline entries, two levels deep; an entry with entries under it is a part heading, and each chapter runs to the page before the next entry. Outline entries for front and back matter (title page, dedication, contents, copyright, acknowledgments, about the author, notes, index, bibliography) stay in the PDF. A book without a usable outline is cut into blocks of pages. A chapter over the limit, 20,000 characters by default and settable per conversion, is cut into the fewest roughly equal parts that each stay under it, at page boundaries; only a single page larger than the limit may exceed it.

5. **Each chapter or part is one note, `chapters/NN <title>.md`, holding its pages' text.** Its frontmatter carries `title`, `raw_role: "chapter"`, `book`, `author`, `part`, `chapter` (its position), `section` (`k of n` for a part), `pages` (`from-to`) and `converted_from` (the path to `e-book.pdf`). Its body has one `## Page N` heading per page, and page text that would read as markdown structure is escaped. Each chapter is sparred and scheduled on its own.

6. **`text.md` becomes the book's index.** Its frontmatter carries `title`, `aliases` holding that title, `raw_role: "index"`, `author`, `converted_from` (`e-book.pdf`), `pages`, `chapters` and `converted_at`. Its body links every chapter, grouped by part, with its pages, and lists the front and back matter left in the PDF. It holds no book text.

7. **Text extraction uses pdf.js (`pdfjs-dist` 6.4.299) inside `@docs-mcp/vault`, offline.** It is the package's third permitted outside import, after `@docs-mcp/core` and `flexsearch`, and is loaded only when a conversion runs.

8. **A link to a PDF resolves through its converted notes.** A wikilink names the PDF by path, `[[Jane Doe/Notes That Work/e-book.pdf#page=42]]`. With a `#page=N` anchor inside a chapter's pages it resolves to that chapter; otherwise, like a relative markdown link to the PDF, it resolves to the index. `[[Notes That Work]]` reaches the index through its `aliases`; a note's own name wins over an alias. A link to a PDF with no converted notes stays unresolved and is listed by `vault_graph`.

9. **`list_raw` lists raw files, and `read_note` takes an optional page range.** `list_raw` lists every file under `0.Raw` except the notes a conversion wrote, each with its kind, author, work and the note that carries its text: the file itself for markdown, the index for a converted PDF, and null otherwise. `read_note { pages }` takes `N` or `N-M` and returns only those `## Page` sections of a chapter; a range with no matching page, or a note without page headings, is an error.

10. **The vault graph view draws raw notes as squares and offers a toggle that hides them.**

## Consequences

**Positive**

1. A whole book becomes searchable, linkable and readable in Obsidian and through every vault tool.
2. A chapter, and a page range within it, keeps a local model's context small, and each chapter has its own mastery and review date.
3. Distilled notes link to their source with ordinary wikilinks, which gives the sparring tier context.
4. Conversion needs no network and no tool outside the engine.

**Negative**

1. Each converted book is stored twice, as the PDF and as its chapter notes.
2. The vault package gains a large dependency.
3. Scanned PDFs, which carry no text layer, are refused until OCR is supported.
4. Sparring a raw resource directly tests recall of the author's words rather than an explanation in the user's own.
5. The converted notes do not change when their PDF is replaced; they must be removed and converted again, which loses each chapter's `coach_id` and so its sparring history.

## Alternatives Considered

1. **Extract inside the engine on read, cached under `Coach/`.** Rejected by the maintainer in favour of one visible markdown note that Obsidian can also search and link.
2. **Let the consuming app extract PDFs.** Rejected because every consumer would reimplement extraction, and links to a PDF would stay unresolved in the engine.
3. **Spar only notes distilled from a raw resource.** Rejected by the maintainer, who wants to spar a book directly as well; Negative 4 records the tension.
4. **A `source:` frontmatter field instead of links.** Rejected in favour of ordinary wikilinks, which Obsidian already supports with page anchors.

## Open Questions

1. Should EPUB files be converted the same way?
2. Should scanned PDFs be run through local OCR before conversion?
3. Should each `## Page N` heading link back to its page in the PDF?
4. Should very short chapters, such as a one-page bonus chapter, be merged into a neighbour?

## Links

- ADR-KI-0058: refined by this decision's raw resources.
- ADR-KI-0006: dry-run-first, never-overwrite writes.
- ADR-KI-0056: the package's dependencies.
- EVID-KI-0011

## Challenge

**Challenge (2026-10-24):**
- Position: whole sources live under `3.Resources/0.Raw/<kind>/`, are sparrable, and a PDF is converted once, offline, into a page-headed markdown note that links to the PDF resolve to.
- Searched: grep over `source/initiatives` for raw resource, 0.Raw, pdf.js, pdfjs, PDF conversion and ebook (hits EVID-KI-0020 and EVID-KI-0021 on LLM-wiki raw folders, and RFC-KI-0029 on intake; none governs vault raw resources); superseded, rejected and archived documents on the same terms (none); accepted siblings ADR-KI-0058 (Decision 6 sparring scope, refined here), ADR-KI-0056 (lists packages, not their outside dependencies), and ADR-KI-0006 (dry-run-first, no overwrite, kept).
- Counter-evidence: none found. ADR-KI-0058 Decision 6 is refined, with `refined_by` set.
- Applicability: the read found unstated refusal conditions, link outcomes for unconverted PDFs, an undefined linkage key, and no trigger for conversion. All were closed from the shipped behaviour in one pass. The sparring tension is held in Negative 4 and Alternative 3.
- Verdict: proceed with edits.
