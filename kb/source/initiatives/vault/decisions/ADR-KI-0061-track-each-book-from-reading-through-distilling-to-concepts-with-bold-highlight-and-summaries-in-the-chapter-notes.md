---
doc_type: adr
id: ADR-KI-0061
title: "Track each book from reading through distilling to concepts, with bold, highlight and summaries in the chapter notes"
summary: "A converted book moves through unread, read, notes, distilling, distilled and concepts. Only read is recorded (read_on on its index); the rest are read off the vault. The user distils chapters in Obsidian with **bold**, ==highlight== and > [!summary] callouts; a chapter summary completes a chapter and page summaries are optional. Quote matching ignores the marks and summaries. New tools reading_progress, mark_read and write_summary; the graph colours books, chapters and pages by progress. marked_passages returns the user's marks as whole sentences to quote, create_concept warns about a concept note that would spar badly, and the graph view writes one mark across the lines of a paragraph; the view also shows any note in the graph read-only; this refines ADR-KI-0058, ADR-KI-0059 and ADR-KI-0060."
status: accepted
initiative: "vault"
owners: ["Engineering"]
reviewers: ["Engineering"]
date: 2026-10-24
links: ["ADR-KI-0060","ADR-KI-0059","ADR-KI-0058"]
tags: ["topic/mcp-engine","topic/knowledge-graph","kind/decision"]
---

# ADR-KI-0061: Track each book from reading through distilling to concepts, with bold, highlight and summaries in the chapter notes

## Context

ADR-KI-0059 converts a book under `3.Resources/0.Raw` into one note per chapter, and ADR-KI-0060 makes those chapters reference material that concept notes quote, with concept notes written from the user's reading notes. Neither records how the user gets from a finished book to its concept notes, or shows how far that work has got.

On 2026-10-24 the maintainer described the path they follow with every book (reported: the maintainer, 2026-10-24). They read it first, on paper, a Kindle or elsewhere. They then write notes holding only what resonated, and bring them into the vault. Next they distil the book page by page in the progressive-summarization layers: bold what matters, highlight the best of the bold, and summarise. A summary of every page is too much work, so a chapter summary finishes a chapter, and a page summary stays optional. Concept notes come last, and the sparring app uses them. The maintainer asked for that progress to be visible in the graph, down to each page's marks.

The converted chapter notes carry one `## Page N` heading per page and escape a `>` at the start of the author's lines (ADR-KI-0059 Decision 5), so marks and callouts the user adds can be told from the author's text.

## Decision

1. **A converted book moves through six stages: `unread`, `read`, `notes`, `distilling`, `distilled`, `concepts`.** Only `read` is recorded: `mark_read` adds `read_on: "YYYY-MM-DD"` to the book's `text.md`, a line-anchored insert like `coach_id` (ADR-KI-0058 Decision 5), refused when the key exists. The other stages are read off the vault on every call. `notes` holds when a note of the user's own, neither raw nor a concept note, links to the book or one of its chapters. `distilling` holds when any chapter is in progress or complete, `distilled` when every chapter is complete, and `concepts` when a concept note quotes or links the book. A book's stage is the furthest one reached, and `reading_progress` also reports each step on its own, so a skipped step is visible. No stage gates a tool.

2. **Distilling happens in the chapter notes, in Obsidian, by the user.** `**…**` (or `__…__`) bolds a passage and `==…==` highlights one; a mark may wrap across a line but not across a blank line. A page's mark is its deepest: `highlight` if it holds a highlight, else `bold` if it holds a bold, else `none`. A page whose text is `_(no text on this page)_` is empty and needs no distilling.

3. **A summary is a `> [!summary]` callout.** Placed before a chapter's first `## Page` heading, it is the chapter summary; placed under `## Page N`, it is that page's summary. A callout with no text counts as no summary. `write_summary` adds either kind, previewing by default, and never replaces an existing summary or changes anything else; the user edits an existing summary in Obsidian.

4. **A chapter is `untouched`, `in_progress` (any mark or page summary) or `complete` (a chapter summary).** Only the chapter summary completes a chapter; page summaries are optional.

5. **The user's marks and summaries are not the author's text.** Quote matching for concept notes (ADR-KI-0060 Decision 3) removes `**`, `__` and `==` before comparing and ignores summary callouts, so a quote still matches through the user's marks and never matches the user's own words. `find_passages` searches without summary callouts.

6. **The vault server gains `reading_progress`, `mark_read` and `write_summary`,** and `read_note` returns a chapter's `distillation`: its chapter summary, state, and each page's mark, summary and emptiness.

7. **The graph view shows distilling.** A book is coloured by its stage and labelled with its completed chapters, such as `2/27`. A chapter is green when complete, yellow once a page is highlighted, blue once a page is bolded, and grey when untouched. Clicking a chapter of an open book shows its pages on a small ring inside the book's ring, each coloured by its mark and ringed when it has a summary; selecting a page shows its full text in the side panel, with the user's bold, highlights and summary rendered, and links to that page in Obsidian. `#open=<chapter path>&page=N` opens one chapter's pages directly and selects a page.

8. **The view server serves one page of a converted chapter.** `/page.json?note=<chapter path>&page=N` returns that page's text as the chapter note holds it, including the user's marks and summary; anything that is not a page of a book's chapter is 404. This refines ADR-KI-0058 Decision 11, under which the view served titles and paths only: a book's page is published text, the server still listens on loopback only under the same Content-Security-Policy, and the page renders it from text nodes, never as HTML. Decision 14 widens this to every note in the graph, read-only. The maintainer asked for the full page in the view on 2026-10-24.

9. **Every raw source reports what was made from it.** For a book (its index and chapters) or a raw note of its own, `list_raw` returns `notes`, the user's own notes that link it or any part of it, and `concepts`, the concept notes that quote or link it; `reading_progress` already carries the same lists in its steps. The graph view shows both counts and lists in a book's or raw note's panel and in the overview, and a book's stage stepper marks each step by its own state, so a skipped step stays visible. The maintainer asked for these statistics on 2026-10-25.

10. **The user can distil from the graph view, which writes the chapter note.** Selecting text in a page offers bold, highlight and clear; page and chapter summaries can be added, edited and removed there, in the side panel or in an edit mode that shows the page in the middle of the screen. Each edit is written at once to the chapter note as the same Obsidian markdown the user would type: marks stay balanced and never start or end on a space, a highlight inside bold nests as `**…==…==…**`, and summaries are `> [!summary]` callouts. The user's click is the approval, so these writes do not preview, which narrows ADR-KI-0058 Decision 9 for this one surface; they still never touch anything but the chapter note, and a page edited against text that changed since it was shown (in Obsidian, say) is refused with the current text. Only chapter notes of converted books can be written this way. The view server checks every request's Host header against its own loopback address, so another site cannot reach it by rebinding a domain name, and a write must carry a per-run token embedded in the page the server served, in a custom header, with a JSON body. This refines ADR-KI-0058 Decision 11, under which the view served and wrote nothing beyond the graph. The maintainer asked for editing in the view on 2026-10-25.

11. **The user's marks become whole-sentence passages through `marked_passages`.** Given a chapter, or a book's `text.md` or work folder, it returns each passage the user marked: the whole sentence or sentences around a bold or highlight as the author wrote them, its chapter note and page, its deepest mark, and the text marked inside it. Sentences joined by one unbroken mark make one passage. A line well short of the page's longest ends a sentence, as it ends a paragraph in the graph view, so a heading never joins the sentence below it. A passage over 600 characters is cut to the marked run. Every passage is checked with `create_concept`'s matcher before it is returned. In a run on the test vault on 2026-10-25, a consuming app quoted the user's marks one by one and wrote a concept note with nine passages, most of them line fragments such as "second layer of"; every study hint built from them showed the same fragment (observed: the test vault's concept note and session files @ 2026-10-25). The same chapter gives ten whole-sentence passages through `marked_passages`, page 100 as one (observed: test vault @ 2026-10-25).

12. **`create_concept` returns `warnings` for a note that is valid but would spar badly, and never refuses on them.** It warns about a quote that is a fragment (fewer than six words, or not starting and ending a sentence), a core assertion that describes the learner or the author instead of the idea, two assertions that share most of their content words, an empty `forbidden_buzzwords`, and a word of the title that is not in the quoted chapters while one within two letters of it is. Each of these occurred in the 2026-10-25 run, together with a Tier 1 pass that the judge tier then failed (observed: the test vault's session files @ 2026-10-25). They are warnings rather than refusals because each has legitimate exceptions, such as a short definition quoted on purpose, and because the user approves the note.

13. **The graph view writes one mark across the lines of a paragraph.** This refines Decision 10. A selection that covers several of the PDF's lines is written as one `**…**` or `==…==` running across them, as Decision 2 allows, instead of one per line; it still never crosses a blank line or a callout. The page's other marks are rewritten the same way, so marks written one per line before this change merge on the next edit of that page without changing what is marked. A line's leading escape stays at the start of its line. The graph view renders marks across lines within a paragraph already.

14. **The view server serves any note in the graph, read-only, and the view shows it.** `/note.json?note=<path>` returns a note's title and its markdown without frontmatter, for every note the vault scan lists: the user's own notes, concept notes, and raw notes. Session files and `Coach/graph.json` are not notes and stay 404, as does any path outside the vault. Selecting a note in the graph shows its text in the side panel, rendered from text nodes like a book page, with wikilinks that select the linked note. Nothing but chapter notes can be written from the view (Decision 10). A reading note, a note of the user's own in `3.Resources` that links a book or its chapters, sits in a column at its book's left with one line to the book in its own colour, instead of one line per chapter. In an open book, the spoke to each chapter a reading note links takes the same colour, and once that chapter is in progress or complete the spoke is drawn twice side by side, in the reading colour and the chapter's own. Other notes that link the book, such as a project, keep the ordinary link. This refines Decision 8 and ADR-KI-0058 Decision 11. The server still listens on loopback only, under the same Content-Security-Policy and Host check. On 2026-10-29 the maintainer asked to read every note in the view: on the test vault, Open in Obsidian does not reach the note (reported: the maintainer, 2026-10-29).

## Consequences

**Positive**

1. Progress through a book is visible at three levels, book, chapter and page, without the user recording anything beyond having read it.
2. Distilling uses Obsidian's own markup, so the user's marks read the same in Obsidian as the engine reads them.
3. Concept notes can draw on the user's bold, highlights and summaries, as well as their reading notes.
4. Quotes stay verifiable after the user has marked the text.
5. A consuming app can quote the user's marks without parsing markdown or rebuilding sentences, and the quotes it gets read on their own.
6. A concept note's weaknesses are named before it is written, by the server every client goes through.

**Negative**

1. Chapter notes are no longer only generated text: they hold the user's work. Converting a book again would lose it, which raises the cost ADR-KI-0059 Negative 5 records.
2. A `**`, `__` or `==` that the PDF's own text contains would read as a user's mark. None was found in the first book (inferred: no such page reported as marked before any marking @ 2026-10-24).
3. The `notes` stage depends on the reading notes linking the book; notes that do not link it are not counted.
4. `read_on` is a second key the engine adds to a note, beside `coach_id`.
5. Sentence boundaries are found by punctuation and line length, not by parsing the language: an abbreviation such as "e.g." ends a sentence early, and a footnote marker glued to a closing quote keeps the next sentence attached (observed: page 98 of the test book @ 2026-10-25).
6. The duplicate-assertion warning compares words, so two assertions that say the same thing in different words are not caught.
7. Editing one mark on a page rewrites the markup of the page's other marks; what is marked stays the same, but a diff of the chapter note shows more lines than the edit touched.
8. The view now shows the text of the user's own notes and concept notes to anyone who can open its loopback page on that machine, where before it showed only titles and book pages.

## Alternatives Considered

1. **Store each page's state in a sidecar file under `Coach/`.** Rejected: the marks would live apart from the text they mark, and Obsidian would not show them.
2. **Require a summary for every page to complete a chapter.** Rejected by the maintainer as too much work; page summaries stay optional.
3. **Enforce the stages in order, refusing a concept note for an undistilled book.** Rejected: the stages show progress and do not gate work, so a book can be distilled in any order.
4. **Record the `notes` stage by hand, like `read`.** Rejected in favour of reading it off links, which needs no extra step once the reading notes link the book.

## Open Questions

1. Should an MCP tool bold or highlight a passage for the consuming app, given its verbatim text? The graph view can since Decision 10; the agent cannot yet.
2. Should `create_concept` warn when the book it quotes is not yet `distilled`?
3. Should raw articles without chapters move through the same stages?

## Links

- ADR-KI-0059: refined; chapter notes now carry the user's marks and summaries.
- ADR-KI-0060: refined; quote matching ignores marks and summaries, and concept notes follow distilling.
- ADR-KI-0058: refined; the tool list gains `reading_progress`, `mark_read` and `write_summary`, `read_on` joins `coach_id` as a key the engine may add, and Decision 11's view serves one page of a book's chapter and, since Decision 14, any note in the graph read-only.
- ADR-KI-0006: dry-run-first, never-overwrite writes.

## Challenge

**Challenge (2026-10-29, Decision 14):**
- Position: the view server serves the text of every note in the graph, read-only, and the view renders it in the side panel.
- Searched: Decisions 8 and 10 of this record; ADR-KI-0058 Decision 11 (the view); `scripts/docs/mcp-servers.md` on what the view serves.
- Counter-evidence: Decision 8 kept the user's own notes, concept notes and sessions out of the view. The maintainer's decision for this change overrides that for notes; sessions stay out, and writes stay limited to chapter notes.
- Applicability: shipped with a test that serves an own note and a concept note without frontmatter and returns 404 for a session file, `Coach/graph.json`, a traversal path, a folder and a missing note; served on the test vault on 2026-10-29.
- Verdict: proceed.

**Challenge (2026-10-25, Decisions 11 to 13):**
- Position: the vault server returns the user's marks as whole-sentence passages, warns about a concept note that would spar badly without refusing it, and the graph view writes one mark across a paragraph's lines.
- Searched: Decisions 2, 5 and 10 of this record; ADR-KI-0060 Decision 3 (verbatim quotes) and its concept-note fields; ADR-KI-0006 (dry-run-first writes).
- Counter-evidence: Decision 10 shipped writing marks one per line, with a test for it; Decision 2 already allowed a mark to wrap across a line, and the graph view's renderer and the server's parser both read a mark across lines, so only the writer changes. ADR-KI-0060 refuses a note only for an unverifiable quote; the new checks stay warnings so that rule is unchanged.
- Applicability: shipped with tests for passages from marks cut at every line, sentences joined by one mark, headings kept apart, quotes accepted by `create_concept` as given, each warning, and marks merged across lines on edit; run against the marked chapter of the test vault on 2026-10-25.
- Verdict: proceed.

**Challenge (2026-10-24):**
- Position: a converted book moves through six stages, five of them read off the vault; the user distils chapters in Obsidian with bold, highlight and summary callouts; a chapter summary completes a chapter; the graph shows each page's marks.
- Searched: grep over `source/initiatives` for progressive summarization, highlight, reading progress, read_on and distill (no hits for progressive summarization, reading progress or read_on; highlight hits only ADR-KI-0005, on search-result highlighting; distil hits evidence EVID-KI-0014, -0015, -0018, -0025 and -0057 and decisions ADR-KI-0011, -0050 and -0059, none on reading stages); accepted siblings ADR-KI-0058 (Decisions 5 and 8), ADR-KI-0059 (Decision 5, Negative 5) and ADR-KI-0060 (Decision 3).
- Counter-evidence: ADR-KI-0058 Decision 5 names `coach_id` as the key the engine inserts; `read_on` is a second, with the same line-anchored insert, recorded in Negative 4 and the Links.
- Applicability: shipped with tests for marks, summaries, stages, quote matching through marks, the tools and the graph data; the graph view was checked with headless screenshots against a copy of the maintainer's vault.
- Verdict: proceed.
