# Setup

This page gets ai-coach running against your vault. When you're done, `coach due` shows what to study today.

## What you need

| You need                                                                             | Why                                                             |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| **Node.js 24 or newer**                                                              | ai-coach is a Node command-line tool.                           |
| **An Obsidian vault**, organised in [PARA](https://fortelabs.com/blog/para/) folders | Your notes. `coach init` can create the folders for you.        |
| **[Ollama](https://ollama.com)** with a Gemma model                                  | Runs the sparring partner on your machine.                      |
| **A Gemini API key** (optional)                                                      | Only for `coach judge`. Everything else works without it.       |
| **[Claude Code](https://claude.com/claude-code)** (optional)                         | Only for the [planning skills](../../.claude/skills/README.md). |

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

For the judge only. Put it in a `.env` file in the repository root; git ignores it too.

```sh
GEMINI_API_KEY=your-key-here
```

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
