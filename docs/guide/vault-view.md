# The vault view

This page is for you if you want to see your vault instead of listing it: how your notes connect, how far you've distilled each source, what your plans look like, and where each idea stands on the [climb](glossary.md#climb). When you're done, you'll know the three pages of the view and what you can change from each.

## Open it

```sh
npm run coach -- view
```

Then open http://127.0.0.1:4747 in your browser. The view runs on your machine only: it listens on loopback, loads nothing from the internet, and your notes never leave the computer.

The view has three pages, linked from the top of each:

| Page                         | Address  | Shows                                                        |
| ---------------------------- | -------- | ------------------------------------------------------------ |
| [The graph](#the-graph)      | `/`      | every note and link, and a reader for any note               |
| [Plans](#plans)              | `/plans` | your goals and the effort behind them, period by period      |
| [The climb](#the-climb-page) | `/climb` | each idea's seven steps, and boards to draw a source's shape |

Every page has a light and a dark theme, and **Present** (`P`) hides the controls when you show it on a big screen.

## The graph

Each dot is a note, and each line a link between two notes. The colour says where the note lives in [PARA](glossary.md#para), with active workstreams under `1.Projects/<Project>/Workstreams/` shown in their own **Workstreams** category apart from project notes and planning notes under `Plans/` shown in their own **Plans** category apart from **Out of place** notes. Plans appear as hexagons with a distinct colour per level (yearly, quarterly, monthly, weekly and daily). Daily plans stay hidden in the overview graph and appear when you click a project, area, workstream or weekly plan to focus it. A concept note also shows how well you know it: never sparred, attempted, [Tier 1](glossary.md#tier-1-tier-2) passed or Tier 2 passed.

- **Find a note:** press `/` and type. Open **Filters** to show or hide PARA folders, kinds of notes and mastery levels.
- **Follow the links:** click a note. The notes not linked to it fade, and a panel shows its details: its folder, its mastery and next review, the notes it's linked with, and for a source, how far you've distilled it.
- **Sources fold:** a converted source is one dot until you click it. Then its chapters appear, each labelled by number and first words, coloured by how far you've distilled it.
- **Move around:** scroll to zoom, drag to pan, `F` to fit everything on screen.
- **Refresh** reloads the vault after you've changed notes in Obsidian.

### Read and distill a chapter

Open a chapter and press `E` to read it in the middle of the screen, page by page (`←` and `→`).

1. **Select a passage** and choose bold or highlight. Bold what matters on the first pass; on the next pass, highlight the best of the bold. That's [distilling](glossary.md#distill).
2. **Summarise a page** in your own words, if you like. It's optional.
3. **Write the chapter summary**, the whole chapter in 1 to 3 sentences of your own. That completes the chapter.

Every mark is saved straight into the chapter note, so Obsidian shows it at once. If you changed the same page in Obsidian in the meantime, the view refuses to save and shows you the latest text instead. Your edit is never overwritten.

Any other note opens read-only. **Open in Obsidian** takes you to it there. `Esc` goes back.

## Plans

`/plans` shows a period of your [planning](planning.md): a year by month, a quarter by week, a month by week or a week by day. It opens on this quarter, by week.

- **Goals**, on the left, are nested under the goal they serve one level up. Each shows whether it's met, open, missed or dropped, and how often it slipped.
- **Effort**, on the right, is a timeline with a row per project, workstream and area. Each cell shows the work done (weighted by size) and the work planned and still open. `↻` marks work that slipped.
- **Move through time** with `←` and `→`, back to today with `T`, or pick **Year**, **Quarter**, **Month** or **Week**. Click a column to zoom into it.
- **Click a goal** to light up the rows that serve it. Click a row to see its goals, its done and planned work and its Intermediate Packets, with links to **Open in Obsidian** and **Show in graph**.
- `A` shows archived projects too.

The page only shows plans. You make and change them with the [planning skills](planning.md) in your AI agent.

## The climb page

`/climb` has three tabs.

### Stairs

A table of your concept notes with a column for each of the seven steps (Read, Group, Generate, Retrieve, Elaborate, Space, Teach) and the next step to take. Pick a concept, or move with `↑` and `↓`, to see its climb drawn as stairs. **Animate** (`A`) draws them one step at a time.

### Draw

A board where you draw how a source's ideas build on each other. Pick the source at the top, then one of two modes:

- **From memory** is the [Generate](glossary.md#generate) step for a source's structure. Without looking, add groups, name them, drag concepts into them, and draw arrows: drag from a group's bottom handle to another group's top handle to say the first builds on the second. Then press **Reveal**. The board compares your drawing with your structure note and suggests a mark for each group and arrow: got it, wrong or missed. Check each one, write a correction in your own words for each wrong one, and record it. If you can't draw anything, **I don't know** records that too. The drawing is saved before the reveal, so it counts as a real guess.
- **Structure** draws and saves the source's [structure note](glossary.md#structure-note): the [Group](glossary.md#group) step, the same as `coach group`.

**Topics** gather concepts from several sources into one structure, such as everything you read on one subject. Type a name under **New topic** and press **Start**. A concept belongs to one topic at most. When ideas are due for review, the coach mixes them by topic as well as by source.

Every save shows a preview of the file it will write first.

### Sketch

A drawing pad for a free-hand sketch of a concept. Pick the concept, draw with the pen, then **Save sketch**. Sketches are PNG files in `3.Resources/Concepts/Sketches/`, and never replace one another. Your saved sketches are listed below the pad.

## Where to go next

- [The climb](the-climb.md) explains each of the seven steps.
- [Planning and habits](planning.md) explains the plans behind `/plans`.
- [Commands](commands.md) lists every `coach` command.
