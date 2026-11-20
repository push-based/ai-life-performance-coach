# @ai-coach/vault-domain

**The rules of the vault.** This package knows how a vault is laid out and what its notes mean: the PARA folders, links between notes, sessions and mastery, habits, task lines, and how projects, workstreams, areas and plans fit together. Files, YAML parsing and search live in other packages.

## What's inside

| Area           | What it decides                                                                                             | File           |
| -------------- | ----------------------------------------------------------------------------------------------------------- | -------------- |
| **PARA**       | The five folders, `Coach/` and `Plans/`, and which bucket and container a path belongs to.                  | `para.ts`      |
| **Notes**      | A note's title, frontmatter, body, coach id, raw role and links. The frontmatter parser is passed in.       | `note.ts`      |
| **Links**      | Reading `[[links]]` and resolving them to notes.                                                            | `links.ts`     |
| **The graph**  | The link graph between notes.                                                                               | `graph.ts`     |
| **Sessions**   | The shape of a recorded sparring session, how it is written and read back.                                  | `sessions.ts`  |
| **Mastery**    | A note's history and mastery from its sessions.                                                             | `mastery.ts`   |
| **Planning**   | Projects, workstreams, areas, plans, tasks and habits. The folder listing is passed in as a `VaultListing`. | `planning.ts`  |
| **Task lines** | Reading and rewriting one Obsidian Tasks line.                                                              | `task-line.ts` |
| **Snapshot**   | `VaultTree`: the vault's folders and note texts at one moment, which planners read instead of the disk.     | `tree.ts`      |
| **Habits**     | Habit rules and which days they fall on.                                                                    | `habits.ts`    |

## Good to know

- **No I/O.** No files, no npm packages, no Node built-ins; lint enforces it. Paths use `@ai-coach/util-path`.
- Where a rule needs something from outside, the caller passes it in: a `FrontmatterParser` to read a note, a `VaultListing` or a `VaultTree` to see folders and read notes.

## Tests

```sh
npx nx test @ai-coach/vault-domain
```
