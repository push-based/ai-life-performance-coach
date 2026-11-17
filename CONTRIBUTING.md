# Contributing

How to build, test and change ai-coach. For how it's put together, read [ARCHITECTURE.md](ARCHITECTURE.md) first; for why, the [decision records](kb/README.md).

## Build and test

The workspace is an [Nx](https://nx.dev) monorepo. After `npm install`:

```sh
npx nx run-many -t build          # build everything
npx nx run-many -t test           # run every test
npx nx run-many -t lint typecheck # check style, types and package boundaries
npx nx format:check               # check formatting
npx nx test @ai-coach/domain      # test one package
npx nx graph                      # see how the packages depend on each other
npm run build:board -w @ai-coach/climb-board   # rebuild the climb page's drawing board, then commit its output
```

Tests don't need Ollama, Gemini or a real vault: each layer is tested with fakes, a local stub server or a temporary vault. The vault adapter has no automated tests yet ([ADR-AIC-0010](kb/source/initiatives/ai-coach/decisions/ADR-AIC-0010-test-each-layer-and-drop-server-dependent-tests-for-now.md)), so try changes to it against a copy of a vault.

CI runs format, lint, test, build and typecheck on every push to `main` and every pull request.

## Documentation

The [documentation site](https://push-based.github.io/ai-performance-coach/) is built from the Markdown in this repository and deploys from `main` ([ADR-AIC-0032](kb/source/initiatives/ai-coach/decisions/ADR-AIC-0032-publish-the-docs-with-docusaurus-from-the-markdown-where-it-lives.md)). Edit the files where they are; `apps/docs` only arranges them.

```sh
npx nx serve docs                 # preview the site while you edit
npx nx build docs                 # build it and check every link
```

| What you're writing            | Where it goes                                                  |
| ------------------------------ | -------------------------------------------------------------- |
| What ai-coach is, how to start | [`README.md`](README.md): keep it to one screen                |
| How to use it                  | [`docs/guide/`](docs/guide/setup.md)                           |
| How to work on it              | this file                                                      |
| How it's built                 | [`ARCHITECTURE.md`](ARCHITECTURE.md) and each package's README |
| Why it's built that way        | [`kb/`](kb/README.md)                                          |
| Planning with an AI agent      | [`.agents/skills/README.md`](.agents/skills/README.md)         |

Write for someone new: say who a page is for and what they'll be able to do, use short sentences and "you", and link a term to the [glossary](docs/guide/glossary.md) instead of explaining it twice ([ADR-AIC-0034](kb/source/initiatives/ai-coach/decisions/ADR-AIC-0034-split-the-docs-into-a-short-readme-a-guide-and-contributing.md)).

## Decision records

Every important change ships with a decision record, an ADR, in the same commit. [ADR-AIC-0001](kb/source/initiatives/ai-coach/decisions/ADR-AIC-0001-record-important-changes-in-adrs.md) lists what counts. The records live in [`kb/`](kb/README.md), a knowledge base for [Kirill](https://github.com/Karnaukhov-kh)'s docs-mcp engine and kb-kit skills ([ADR-AIC-0049](kb/source/initiatives/ai-coach/decisions/ADR-AIC-0049-keep-the-decision-records-in-a-kb-kit-knowledge-base.md)):

| Folder                            | Holds                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `kb/source/initiatives/ai-coach/` | the coach's decisions, `ADR-AIC-0001` onwards. New records go here.                     |
| `kb/source/initiatives/vault/`    | the vault server's earlier decisions, `ADR-KI-0058` to `ADR-KI-0071`, and `RFC-KI-0042` |

**Reading** needs nothing: open the file, or the Decisions pages on the documentation site.

**Writing** needs the docs-mcp engine, version 3, on your `PATH` as `docs-mcp`. It isn't on npm yet. Then:

1. Connect the `ai-coach-kb` server from [`.mcp.example.json`](.mcp.example.json) in your `.mcp.json`. It runs `docs-mcp serve` in `kb/`.
2. Have your agent write the record with the `upsert_document` tool, or run `docs-mcp upsert --spec=<file> --execute` in `kb/`. The engine gives the record its ID and file name. Don't copy an existing file.
3. Run `docs-mcp check` in `kb/`. It checks every record's fields, IDs and links.
4. A new record is a `draft`. When the change is committed, accept it with the `transition_status` tool.

Never rewrite an accepted record: write a new one that supersedes it. `kb/` isn't formatted by Prettier, because the engine writes it.

## House rules

- **Important changes come with a decision record** in the [knowledge base](kb/README.md), in the same commit. ADR-AIC-0001 says what counts, and ADR-AIC-0049 says how a record is written. Accepted records are never rewritten, only superseded.
- **No comments in source code.** Names and tests carry the meaning (ADR-AIC-0011).
- **Commit messages follow [Conventional Commits](https://www.conventionalcommits.org)**: `feat(cli): add the review command`, `fix(domain): …`, `docs: …`, `build: …`. CI checks every commit in a pull request (ADR-AIC-0033); `npx commitlint --from origin/main` checks yours before you push.
- **Rules go in the domain, not in prompts.** If a model could talk its way past it, it belongs in code.
- **New vault abilities belong in the vault server**: `packages/vault` and `packages/vault-server`. `adapter-vault-mcp` only wraps the tools the server offers, and nothing else in the coach may import the vault ([ADR-AIC-0048](kb/source/initiatives/ai-coach/decisions/ADR-AIC-0048-keep-the-vault-server-in-this-repository-behind-the-same-mcp-boundary.md)).
- **Never point tests or experiments at your real vault.** Use a copy.
