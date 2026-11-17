---
doc_type: adr
id: ADR-AIC-0050
title: "Keep the planning skills in .agents/skills for every agent"
summary: "The planning skills move from .claude/skills/ to .agents/skills/, the folder most coding agents share, with a symlink per skill in .claude/skills/ for Claude Code, and the skills and docs stop assuming Claude Code."
status: draft
initiative: "ai-coach"
owners: []
reviewers: []
date: 2026-11-17
links: ["ADR-AIC-0001","ADR-AIC-0030","ADR-AIC-0034"]
tags: []
---

# ADR-AIC-0050: Keep the planning skills in .agents/skills for every agent

## Context

ADR-AIC-0029 made planning a set of Claude Code skills in `.claude/skills/`, and ADR-AIC-0030 kept them there. Only Claude Code reads that folder. The repository is also set up for Codex, Cursor, GitHub Copilot, Gemini CLI and OpenCode (`.codex/`, `.cursor/`, `.github/`, `.gemini/`, `opencode.json`), and the Nx skills already live in `.agents/skills/`, which those agents share (observed: repository @ 2026-11-17). The user asked on 2026-11-17 for the planning skills to work in every agent.

The skills were close to agent-neutral already: they use the open Agent Skills format (`SKILL.md` with `name` and `description`) and name the vault tools by their bare names. What tied them to Claude Code was where they lived, the `.claude/skills/vault-planning/SKILL.md` path each skill reads first, one paragraph of `vault-planning/tools.md` (the `mcp__life-vault__` prefix and `/mcp`), and docs that set up only Claude Code. Which folders each agent reads comes from third-party lists of agents, not from each vendor (reported: vercel-labs `skills` CLI docs and community lists, 2026-11-17).

## Decision

1. **The planning skills live in `.agents/skills/`**, beside the Nx skills. That is the one copy every agent reads.
2. **`.claude/skills/<skill>` is a relative symlink** to `../../.agents/skills/<skill>` for each planning skill, because Claude Code reads only `.claude/skills/`. A new skill is added to `.agents/skills/` and linked the same way.
3. **The skills say nothing agent-specific.** A skill reads `vault-planning` by a relative path. The tools are named by their bare names, and a missing server is fixed by reconnecting it in the agent. `argument-hint` and `allowed-tools` stay in the frontmatter: Claude Code uses them, and other agents ignore them.
4. **The server keeps the name `life-vault` in every agent.** The setup guide shows how to register it in each agent, in a git-ignored file or in the user's own settings, so personal paths stay out of git.
5. **Docs say "your AI agent"**, not Claude Code, except where a step differs per agent.

This ADR amends point 1 of ADR-AIC-0030, which carries forward where ADR-AIC-0029 put the skills and the rules file; the rest of ADR-AIC-0030 stands.

## Consequences

- The planning skills work in any agent that reads `.agents/skills/` and can reach the `life-vault` server. Only Claude Code was tried after the move; whether every other agent finds them is to be checked per agent.
- Each new planning skill needs its symlink in `.claude/skills/`, or Claude Code won't see it.
- Symlinks need a checkout that keeps them. On Windows without symlink support, Claude Code users get plain files containing the link target.
- `nx configure-ai-agents` writes its own skills into `.agents/skills/`. If a later Nx version clears the folder before writing, the planning skills would be removed; that change would show in `git status`.
- The rules file moves to `.agents/skills/vault-planning/rules.md`. A user who kept their own rules out of git with `.git/info/exclude` must update that path.
- The docs site reads the skills README and the planning model from their new paths.

## Alternatives Considered

- **Copy the skills into each agent's folder** (`.claude/skills/`, `.cursor/skills/`, `.github/skills/`, `.opencode/skills/`), as `nx configure-ai-agents` does for the Nx skills. Rejected: the copies would drift, and a change to one skill would be a change to six files.
- **Keep the skills in `.claude/skills/` and link `.agents/skills/` to it.** Rejected: `.agents/skills/` already holds the Nx skills, and the vendor-neutral folder is the better home for the one real copy.
- **Link the whole `.claude/skills/` folder to `.agents/skills/`.** Rejected: Claude Code would then load the Nx skills twice, once from its plugin and once from the link.
