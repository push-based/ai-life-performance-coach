# Decisions

Why ai-coach is built the way it is. Every important change ships with a decision record (ADR), and the records live in this folder, a kb-kit knowledge base (ADR-AIC-0049). It has two initiatives:

- [`ai-coach`](source/initiatives/ai-coach/decisions): the coach's own decisions, `ADR-AIC-NNNN`. On the documentation site, they're listed in the sidebar under **Decisions**.
- [`vault`](source/initiatives/vault/decisions): the decisions made for the vault server while it was built in kb-template, `ADR-KI-0058` to `ADR-KI-0071`, and the question that started them, `RFC-KI-0042`.

## Read a decision

Open the file, or ask your agent. With the `ai-coach-kb` server from [`.mcp.example.json`](../.mcp.example.json) connected, an agent finds decisions with `search`, reads one with `read_document`, and follows what cites it with `find_references`.

Graph questions, such as what a decision affects, need `graph.json`. The file is generated and git-ignored: run `docs-mcp graph build` in this folder, or have the agent call `rebuild_graph`.

## Record a decision

ADR-AIC-0001 says which changes need a record. Don't copy a file: have your agent write the record with the `upsert_document` tool, or run `docs-mcp upsert --spec=<file> --execute` in this folder. The engine gives the record its ID and file name and validates it before the write. A new record is a `draft`; `transition_status` accepts it. An accepted record is never rewritten, only superseded.

## The workspace

This folder is a docs-mcp workspace: a knowledge base of decisions, open questions, and evidence,
grouped into initiatives. The docs-mcp engine validates it, indexes it, and serves it to agents
over MCP. `docs-mcp.config.json` holds the workspace's contract: document types, statuses, ID
rules, templates, and search settings.

## Layers

The workspace has three layers:

- `source/`: the documents people decide on. Each folder in `source/initiatives/` that holds an
  `initiative.json` is an initiative. Inside it, each document type has its own folder:
  `decisions/` for ADRs, `proposals/` for RFCs, `evidence/` for evidence, and `context/` and
  `plan/` for the charter and other background. A document's status lives in its frontmatter.
  `source/reports/` holds reports about defects in the corpus.
- `wiki/`: pages synthesized from the source documents, in Open Knowledge Format. Each page names
  the documents it rests on.
- `output/`: documents produced from the knowledge base for a specific audience.

`templates/initiative/` is the skeleton the engine copies for a new initiative.

## Rules for agents

`AGENTS.md` holds the rules for agents that work in this workspace. An initiative can add its
own rules in its own `AGENTS.md`.

## Connect a consumer repository

To let an agent in another repository consult this knowledge base, add the external server to that
repository's MCP configuration. The server runs `docs-mcp serve --external` in this folder. Through
it, the agent can search and read the knowledge base, and the only change it can make is to file a
report. Then have that agent call `get_activation` with the initiatives the repository consumes,
and save the stanza it returns in the repository's `AGENTS.md` file.

## Checks

To check the workspace, run `docs-mcp check`. To keep a failing document out of a commit, run
`docs-mcp check --strict` from a pre-commit hook: `--strict` fails on warnings too. To upgrade a
workspace written for an older version of the engine, run `docs-mcp migrate`.
