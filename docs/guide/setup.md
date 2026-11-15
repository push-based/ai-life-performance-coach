# Setup

This page gets ai-coach running against your vault. When you're done, `coach due` shows what to study today.

## What you need

| You need                                                                                                    | Why                                                             |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **[Node.js](https://nodejs.org) 24 or newer**                                                               | ai-coach is a Node command-line tool.                           |
| **An [Obsidian](https://obsidian.md) vault**, organised in [PARA](https://fortelabs.com/blog/para/) folders | Your notes. `coach init` can create the folders for you.        |
| **[Ollama](https://ollama.com)** with a Gemma model                                                         | Runs the sparring partner on your machine.                      |
| **A Gemini API key** (optional)                                                                             | Only for `coach judge`. Everything else works without it.       |
| **[Claude Code](https://claude.com/claude-code)** (optional)                                                | Only for the [planning skills](../../.claude/skills/README.md). |

### Obsidian

[Download Obsidian](https://obsidian.md/download) and open a folder as a vault, or use the vault you have. A vault is a folder of plain Markdown files: ai-coach reads and writes those files, and Obsidian is where you read and mark them.

If you plan with Claude Code, also install the [Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) community plugin (Settings → Community plugins → Browse → "Tasks"). Tasks and habits are written in its syntax, and it ticks off repeating tasks for you.

### Ollama

[Install Ollama](https://ollama.com/download) for your system. It's open source ([github.com/ollama/ollama](https://github.com/ollama/ollama)) and serves models on `http://127.0.0.1:11434`. ai-coach refuses any Ollama host that isn't on your own machine.

## 1. Install and build ai-coach

```sh
npm install
npx nx run-many -t build
```

This also builds the [vault server](glossary.md#vault-server), `packages/vault-server/dist/main.js`, the only program that reads or changes your vault.

## 2. Pull a Gemma model

```sh
ollama pull gemma3
```

Optionally pull a larger one too, such as `gemma3:12b`, and set it as [`ollama.checkModel`](configuration.md#settings). It makes the end-of-round verdict fairer, at the cost of speed.

## 3. Create `coach.config.json`

Create it in the repository root. Git ignores it, so your paths stay private. [`coach.config.example.json`](../../coach.config.example.json) is a starting point; the minimum is:

```json
{
  "vault": "~/Documents/my-vault",
  "ollama": { "model": "gemma3:latest" }
}
```

- `vault` is your Obsidian vault. Always set it: without it the server has no vault to open.
- `ollama.model` is a name from `ollama list`.

Every other setting is in [Configuration](configuration.md).

## 4. Add your Gemini key (optional)

For the judge only. The judge runs on Gemini, `gemini-4-argon` by default. The example config adds `gemini-3.8-flash` as a fallback for when it's busy. You can change both in [Configuration](configuration.md#settings).

1. Sign in to [Google AI Studio](https://aistudio.google.com/apikey) and create an API key.
2. Put it in a `.env` file in the repository root; git ignores it too.

```sh
GEMINI_API_KEY=your-key-here
```

Without a key, sparring still works. Each session waits for the judge, and `coach judge` picks them all up once you've added the key.

## 5. Connect Claude Code (optional)

For the planning skills only. Claude Code reaches the same vault server through `.mcp.json`, which is git-ignored like your config:

```sh
cp .mcp.example.json .mcp.json
```

Replace the two placeholders with absolute paths (`~` is not expanded here): the vault server, `packages/vault-server/dist/main.js` in this checkout, and your vault. Keep the server name `life-vault`. The [planning skills guide](../../.claude/skills/README.md#set-it-up) has the details.

## 6. Check that everything is connected

```sh
npm run coach -- init   # preview the PARA folders, confirm to create the missing ones
npm run coach -- due
```

You should see what's due for review and which notes have never been sparred. If you see an error instead, look it up in [Troubleshooting](troubleshooting.md).

> [!TIP]
> Try ai-coach on a **copy** of your vault first. Every change is previewed and needs your confirmation, but a copy lets you experiment freely.

## How your vault is laid out

ai-coach expects five top-level folders, plus two the vault server manages:

```text
0.Inbox/        new notes land here (captures, study notes, reading notes)
1.Projects/     things with a deadline, each with its workstreams
2.Areas/        ongoing responsibilities
3.Resources/    what you're learning: this is where sparring happens
   0.Raw/         converted books and other source material (read and quote it, never spar it)
   Concepts/      the concept notes you synthesize
4.Archive/      finished projects
Plans/          year, quarter, month, week and day plans (planning skills)
Coach/          sparring sessions and the graph, written by the server
```

ai-coach never opens these files itself. The vault server reads and writes them, and the coach asks it over the [Model Context Protocol](https://modelcontextprotocol.io). The [architecture](../../ARCHITECTURE.md#the-system-around-it) shows how the pieces connect.

## Next

[Your first session](first-session.md) takes one book through the whole loop.
