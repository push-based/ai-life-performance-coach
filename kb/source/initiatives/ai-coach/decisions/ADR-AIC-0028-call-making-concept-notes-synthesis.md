---
doc_type: adr
id: ADR-AIC-0028
title: 'Call making concept notes synthesis, and keep distillation for marking'
status: draft
initiative: ai-coach
date: 2026-10-27
aliases: ['ADR-0028']
tags: []
links: ['ADR-AIC-0023']
---

# ADR-AIC-0028: Call making concept notes synthesis, and keep distillation for marking

## Context

ADR-AIC-0023 named the command that turns a book's marks and reading notes into concept notes `coach distill`. In the method the owner follows, distillation is the marking itself: bolding, highlighting and summarising a chapter. Turning that material into a concept note of one idea is synthesis. The command name taught the wrong word for each step.

## Decision

1. The loop is read, distill, synthesize, spar, judge, study. **Distill** is the learner marking a chapter in Obsidian; **synthesize** is making concept notes from those marks.
2. `coach distill [book]` becomes `coach synthesize [book]`, with the same behaviour as ADR-AIC-0023 and ADR-AIC-0026 describe. `distill` is no longer a command.
3. The code follows the words: the use case is `Synthesizing`, the port `SynthesisPartner`, the adapter `OllamaSynthesisPartner`, the CLI conversation `synthesize.ts` and the domain module `synthesis.ts`.
4. Everything else in ADR-AIC-0023 stands.

## Consequences

- The command names the step it performs, and the README's loop matches the method.
- Anyone used to `coach distill` gets "unknown command" and must type `coach synthesize`.
- Accepted ADRs keep saying "distill" for the command; this ADR is where the rename is recorded.
