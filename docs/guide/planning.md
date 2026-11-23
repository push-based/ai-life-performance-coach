# Planning and habits

This page is for you if you want to plan your work and your days in the same vault as your notes. It explains the planning model (projects, areas, goals, tasks and habits) and what a planning session with an AI agent looks like. When you're done, you can plan a week, keep daily habits and review how a period went.

You plan by talking to an AI coding agent, such as Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI or OpenCode. The [planning skills](../../.agents/skills/README.md) teach it how, and the [vault server](glossary.md#vault-server) does the bookkeeping. There is no `coach` command for planning.

## Set it up

1. Connect your agent to the vault server: see [Setup](setup.md#5-connect-your-ai-agent-optional).
2. Install the [Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) community plugin in Obsidian and enable it. Tasks and habits are written in its syntax, and the lists in your plans are its queries. Without it, the lists show as raw text.
3. Optionally, install [Periodic Notes](https://github.com/liamcain/obsidian-periodic-notes), so you can open a plan from Obsidian. Turn on daily, weekly and monthly notes, and set each to match where ai-coach keeps plans:

   | Notes   | Format                   | Template                  | Folder          |
   | ------- | ------------------------ | ------------------------- | --------------- |
   | Daily   | `YYYY/M-MMMM/YYYY-MM-DD` | `Plans/Templates/Daily`   | `Plans/Daily`   |
   | Weekly  | `gggg-[W]ww`             | `Plans/Templates/Weekly`  | `Plans/Weekly`  |
   | Monthly | `YYYY-MM`                | `Plans/Templates/Monthly` | `Plans/Monthly` |

4. Run `npm run coach -- init` once. It creates `Plans/` with a template for each kind of plan.
5. Read [your planning rules](../../.agents/skills/vault-planning/rules.md) and change them to suit you, for example which work goes early in the week.

## The pieces

| Piece          | Where it lives                                     | What it is                                                                    |
| -------------- | -------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Project**    | `1.Projects/<Project>/<Project>.md`                | work with an end: a status, a deadline and one sentence saying when it's done |
| **Workstream** | `1.Projects/<Project>/Workstreams/<Workstream>.md` | a part of a project that's finished on its own                                |
| **Area**       | `2.Areas/<Area>.md`                                | a standard you keep up with no end date, such as health or home               |
| **Plan**       | `Plans/`                                           | one note per year, quarter, month, week and day                               |
| **Goal**       | the `## Goals` section of a plan                   | an outcome you can check at the end of the period                             |
| **Task**       | a line in its project, workstream or area          | one concrete action, with a size and the day you'll do it                     |
| **Habit**      | under `## Habits` in its owner's note              | a routine you keep or miss each day                                           |

The skill `organize-projects` creates projects, workstreams and areas for you: say "new project" or "start a workstream for the talks".

## Goals chain upward

A goal is an outcome, not an activity: "Talks announced", not "work on talks". Every goal links two things:

- **its owner**, the project, workstream or area it counts for, and
- **the goal it serves one level up**, after `↑`.

```markdown
- [ ] Talks announced [[Talks]] ↑ [[2026-11#^conference-delivered]] ^talks-announced
```

So a week goal serves a month goal, which serves a quarter goal, which serves a year goal. Tasks never link goals. A task serves a goal through their shared owner: the week goal above is served by the tasks in `Talks.md` scheduled that week.

## Tasks

Tasks are [Obsidian Tasks](https://publish.obsidian.md/tasks/) lines, written in the note of the project, workstream or area they belong to:

```markdown
- [ ] Order stickers and t-shirts #S ⏳ 2026-11-03
- [ ] Chase John Smith for his abstract #S ⏳ 2026-11-02 🆔 abstract
- [ ] Print the programme #M ⏳ 2026-11-05 ⛔ abstract
```

| Mark             | Means                                                                              |
| ---------------- | ---------------------------------------------------------------------------------- |
| `⏳ 2026-11-03`  | the day you mean to do it                                                          |
| `#S` `#M` `#L`   | its size: under an hour, a few hours, a day or more. Reviews weigh them 1, 3 and 8 |
| `⏫`             | high priority                                                                      |
| `🆔 a` / `⛔ a`  | the second task waits until the first is done                                      |
| `🔁 every week…` | repeating work, such as cleaning: ticking it creates the next one                  |

Say "remind me to…", or paste a list, and the `add-task` skill shapes each task and writes it into the right note.

## Habits

A habit is a routine you either keep or miss on a day: getting up at 6:00, a walk, reading. You define it once, under `## Habits` in its owner's note:

```markdown
## Habits

- Up at 6:00 🔁 every day
- Glass of water before coffee 🔁 every weekday
- Long walk 🔁 every week on Saturday and Sunday
```

The rules are `every day`, `every weekday`, `every weekend` and `every week on <days>`. Each day plan then gets that day's checks:

```markdown
## Habits

- [ ] Up at 6:00 [[Morning routine]]
- [x] Glass of water before coffee [[Morning routine]] ✅ 2026-11-03
```

Tick them in Obsidian. An unticked check is a **missed day**. It's never carried over, never overdue and never moved: tomorrow starts fresh. Reviews count, for each habit, how many of its days you kept and your current streak.

Work that still has to happen after you miss a day, such as a cleaning cycle, is a repeating task, not a habit. To aim higher, turn a habit into a goal: "Gym 4 times" this week.

## Your day plan

Open a day plan and you see your day sorted by kind of work. Each task shows once, under the note it lives in:

| Section    | What it shows                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Habits`   | the day's habit checks                                                                                                        |
| `Projects` | project tasks due today or overdue, under their project's folder, then their note: the workstream, or the project note itself |
| `Areas`    | area tasks due today or overdue, under the area's name                                                                        |
| `Ad-hoc`   | tasks you wrote into this day plan, then under `Earlier days` the ad-hoc tasks still open from earlier plans                  |
| `Done`     | what you ticked today, under its folder, then its note                                                                        |
| `Log`      | your notes on the day                                                                                                         |

To work on a task in its project, click the link after it. That opens the workstream or area note at the task's heading. An ad-hoc task stays under `Ad-hoc` even when it links an area. Week and month plans group their tasks the same way: folder first, then note. The lists use only what Tasks offers out of the box, so you don't need to turn on JavaScript in its settings.

The layout comes from `Plans/Templates/`. If your plans were made with the older layout, which had one `Today` list grouped by folder, run `npm run coach -- init`. Its preview lists every template and plan it would update. It skips any list you edited by hand and names those plans, so you can change them yourself.

## A planning session

Ask in plain words, or type the skill as a slash command:

| Say                             | Skill           | It                                                                           |
| ------------------------------- | --------------- | ---------------------------------------------------------------------------- |
| "plan 2027"                     | `plan-year`     | keeps, drops or rewrites last year's goals, and sets 3 to 7 new ones         |
| "plan Q1"                       | `plan-quarter`  | picks which projects get the next 13 weeks, and sets 3 to 5 goals            |
| "plan the month"                | `plan-month`    | sets 3 to 6 goals, places deadlines, sketches which week carries what        |
| "plan my week"                  | `plan-week`     | sets 3 to 7 goals, lays the work out day by day, and creates the day plans   |
| "plan my day", "close the day"  | `plan-day`      | shows today's tasks, overdue work and habits; in the evening, closes the day |
| "how did my week go"            | `review-period` | reads any period back                                                        |
| "set a goal", "make gym a goal" | `set-goal`      | writes goals and links them into the chain                                   |

A week plan goes like this:

1. **Close last week.** The agent shows what you did and what slipped, then moves the open tasks into this week. Each is marked `⏫ #slipped/2026-W45`. A task with two slip tags has slipped twice and needs a decision.
2. **Set this week's goals**, each under one of the month's goals.
3. **Lay out the days.** The agent spreads the tasks over the week by your rules: orders and anything waiting on someone else go early, and dependent work comes after what it waits on.
4. **Check the preview.** You see every line that will change in every note. Nothing is written until you say yes.

A day never slips: its open tasks stay on your list until the week is closed. A year never rolls over: you decide on each open year goal by hand.

## Reviews

Ask "how did October go" or "where did my time go this week". A review reads a period back without changing anything:

- **goals:** met, still open, missed or dropped, followed down the chain to the goals that served them;
- **effort:** done work per project, workstream and area, weighted by size;
- **slips:** what slipped out of the period, and what keeps slipping;
- **habits:** days kept and streaks.

To see a period at a glance, open [`/plans` in the vault view](vault-view.md#plans).

## When a workstream is done

Say "this workstream is done". The agent lists what in it could be reused: notes, checklists with three or more items, and files. You pick, and each becomes an **Intermediate Packet** in the project's `Intermediate Packets/` folder, with its checklists unticked and ready for next time. When you archive the project with `coach archive`, its Intermediate Packets move to Resources first, so they outlive it.

## Safety

- **Preview first.** Every change is previewed, and written only after your yes.
- **Your edits win.** If you change a note in Obsidian after the preview, the write is refused and the agent previews again.
- **The agent sees what it reads.** Planning runs on the model your agent uses, so the notes it reads go to that model. The coach's offline promise covers sparring, not planning. See [Privacy](privacy.md).

## Where to go next

- [Planning skills](../../.agents/skills/README.md): set-up details, every skill, your rules and troubleshooting.
- [The planning model](../../.agents/skills/vault-planning/conventions.md): every task mark and plan section, in full.
- [The vault view](vault-view.md): your plans in the browser.
