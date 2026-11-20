# Glossary

The words ai-coach uses, in plain language.

## Buzzword

A word you may not hide behind when you explain an idea, such as "synergy" or "best practice". The coach asks you to rephrase when you use one. You set them per concept note, and globally with [`sparring.buzzwords`](configuration.md#settings).

## Climb

The seven steps from feeling you understand an idea to mastering it: **Read**, **Group**, **Generate**, **Retrieve**, **Elaborate**, **Space** and **Teach**. Each is harder than the last, and in each you do the work, not the model. `coach climb` shows which steps you've done on each [concept note](#concept-note). A step counts only when your vault holds the proof, such as your reading notes or a spar session. Retrieve is a [spar](#spar) session you pass; Space is a spar session at least a day after the one before. Teach opens only after you pass such spaced reviews in two different [coaching styles](coaching-styles.md), and closes while the judge's latest verdict on the idea is a fail. [The climb](the-climb.md) explains each step.

## Coaching style

How the coach pushes you: `feynman`, `socratic`, `cornell` or `devil`. See [Coaching styles](coaching-styles.md).

## Concept note

A note holding one idea, in your own words, with its core assertions, buzzwords and quotes from the book. Concept notes live in `3.Resources/Concepts/` and are what you spar. You make them with `coach synthesize`.

## Core assertion

One of the key points of a concept note: what your explanation must cover to pass. They are drafted from your own summary and answers, never from the book, and you approve each one.

## Decision record

A short document that records one decision about how ai-coach is built, and why: an ADR. The coach's records are numbered `ADR-AIC-0001` onwards; the vault server's earlier ones are `ADR-KI-0058` to `ADR-KI-0071`. They live in the [knowledge base](#knowledge-base) and on the documentation site under **Decisions**.

## Distill

Marking a chapter in Obsidian: bolding what matters, highlighting the best of it, and summarising the chapter in your own words.

## Elaborate

Explaining an idea in your own words and tying it to things outside it: why it works the way it does, what you already know that it's like, and where you'd use it. `coach elaborate` asks the three questions, in the note's [coaching style](#coaching-style), and adds your answers to the [concept note](#concept-note). It is the Elaborate step of the [climb](#climb).

## Free recall

Writing down everything you remember about an idea, with the note closed, before any question. `coach spar --free-recall` starts this way on a [concept note](#concept-note), then asks only about the [core assertions](#core-assertion) you left out. It is the Retrieve step of the [climb](#climb).

## Generate

Trying to answer before you see the answer: explaining a [concept note](#concept-note) from its title, or saying what a chapter will teach before you read it. You then mark each point as got it, wrong or missed, and correct each wrong guess in your own words. `coach generate` runs it. It is the Generate step of the [climb](#climb), and is never graded.

## Goal

An outcome you can check at the end of a period, such as "Talks announced", in the `## Goals` section of a year, quarter, month or week plan. It links the project, workstream or area it counts for, and the goal it serves one level up. See [Planning and habits](planning.md#goals-chain-upward).

## Group

Sorting a book's [concept notes](#concept-note) into groups you name, and saying which group builds on which. `coach group` runs it and writes the [structure note](#structure-note). It is the Group step of the [climb](#climb).

## Habit

A routine you keep or miss each day, such as "Up at 6:00 🔁 every day", defined under `## Habits` in its owner's note. Each day plan gets that day's checks. A missed day is never carried over; reviews count your streaks. See [Planning and habits](planning.md#habits).

## Intermediate Packet

A reusable piece of a finished [workstream](#workstream), such as a checklist or a note, kept in the project's `Intermediate Packets/` folder for your next project. Archiving the project moves its packets to Resources. See [Planning and habits](planning.md#when-a-workstream-is-done).

## Judge

The online model (Gemini) that gives a second, stricter verdict on your sparring answers. Also called **Tier 2**. It sees only the questions and your answers, never your notes.

## kb-template

A separate, private documentation project by [Kirill](https://github.com/Karnaukhov-kh). The [vault server](#vault-server) was written for ai-coach in a branch of it, then moved into ai-coach in November 2026 (ADR-AIC-0048). Only three small files come from kb-template itself: see [Code from kb-template](../../README.md#code-from-kb-template). Decision records numbered ADR-KI, such as ADR-KI-0058, were written there and moved here too (ADR-AIC-0049).

## Knowledge base

The `kb/` folder, where the [decision records](#decision-record) live. It's a workspace for kb-kit, a set of agent skills on the docs-mcp engine. Both are made by [Kirill](https://github.com/Karnaukhov-kh), who also wrote [kb-template](#kb-template). The engine checks the records and serves them to agents over MCP as the `ai-coach-kb` server. See [`kb/README.md`](../../kb/README.md).

## PARA

The folder layout of your vault: Projects, Areas, Resources, Archive, plus an Inbox. ai-coach numbers them `0.Inbox` to `4.Archive`. See [how your vault is laid out](setup.md#how-your-vault-is-laid-out).

## Raw material

Converted books and other sources under `3.Resources/0.Raw/`. You read, mark and quote them, but never spar them directly.

## Read

The first step of the [climb](#climb): reading [raw material](#raw-material) and writing down, in your own words, what resonated, then summing the chapter up. `coach read` takes you through a chapter page by page. A note that copies six words in a row from the page is a quote, and only your own words count.

## Retrieve

Explaining an idea from memory, with the note closed. Passing a [spar](#spar) session on a [concept note](#concept-note) is the Retrieve step of the [climb](#climb); the [judge](#judge) then checks it.

## Review

Coming back to an idea when it's due. A new idea comes back the next day. Each pass pushes the next review further out; a fail brings it back tomorrow. When several ideas are due, their topics are mixed.

## Session

One recorded sparring round on one note: the questions, your answers and the verdict. Sessions live in your vault under `Coach/sessions/`.

## Space

Coming back to an idea after a gap, at least a day after your previous attempt, and sparring it again. It is the Space step of the [climb](#climb). Spaced spars you pass in two different [coaching styles](coaching-styles.md) open [Teach](#teach).

## Spar

Explaining an idea to the local model, which asks follow-ups and gives a verdict. Also called **Tier 1**. It runs offline.

## Structure note

A note that holds a book's [concept notes](#concept-note) in groups you named, and which group builds on which, such as tokens → primitives → components → patterns. `coach group` writes it to `3.Resources/Concepts/Structures/`. It is the Group step of the [climb](#climb).

## Study

Working through the gaps of a failed round, with hints and the author's own words.

## Synthesize

Turning your marks on a book into concept notes, one idea each.

## Teach

The last step of the [climb](#climb): explaining an idea to someone who doesn't know it. In `coach teach` the coach plays a student who knows only the title and believes one wrong thing about it. You pass when you've corrected that, taught every [core assertion](#core-assertion), and explained every term you used. It's based on the [Protégé Effect](#protégé-effect). If the judge fails your latest round on an idea, Teach closes until you pass it again.

## Protégé Effect

The finding that you learn something better when you teach it, because explaining shows you where your understanding has gaps.

## Tier 1, Tier 2

The two models. **Tier 1** is the local sparring partner (Gemma on Ollama), which sees your notes and runs offline. **Tier 2** is the online judge (Gemini), which never sees your notes.

## Topic

A structure of concepts from several sources on one subject, such as everything you read on ADHD. You draw it on the [climb page](vault-view.md#draw). A concept belongs to one topic at most, and reviews mix due ideas by topic.

## Vault server

The only program that reads or writes your vault files: `apps/vault-server`, run as `coach-vault`. ai-coach starts it for each command and talks to it over the [Model Context Protocol](https://modelcontextprotocol.io); the planning skills reach it through your AI agent. `coach view` starts its graph view.

## Vault view

Your vault in the browser at http://127.0.0.1:4747, opened with `coach view`: the link graph and a reader for distilling, your plans, and the climb of each idea. See [The vault view](vault-view.md).

## Workstream

A part of a project that's finished on its own, such as the talks of a conference. Tasks written in it belong to it. See [Planning and habits](planning.md#the-pieces).
