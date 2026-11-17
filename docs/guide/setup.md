# Setup

This page gets ai-coach running against your vault. When you're done, `coach due` shows what to study today.

## What you need

| You need                                                                                                      | Why                                                             |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **[Node.js](https://nodejs.org) 24 or newer**                                                                 | ai-coach is a Node command-line tool.                           |
| **An [Obsidian](https://obsidian.md) vault**, organised in [PARA](https://fortelabs.com/blog/para/) folders   | Your notes. `coach init` can create the folders for you.        |
| **[Ollama](https://ollama.com)** with a Gemma model                                                           | Runs the sparring partner on your machine.                      |
| **A Gemini API key** (optional)                                                                               | Only for `coach judge`. Everything else works without it.       |
| **An AI coding agent** (optional), such as Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI or OpenCode | Only for the [planning skills](../../.agents/skills/README.md). |

### Obsidian

[Download Obsidian](https://obsidian.md/download) and open a folder as a vault, or use the vault you have. A vault is a folder of plain Markdown files: ai-coach reads and writes those files, and Obsidian is where you read and mark them.

If you plan with an AI agent, also install the [Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) community plugin (Settings → Community plugins → Browse → "Tasks"). Tasks and habits are written in its syntax, and it ticks off repeating tasks for you.

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

## 5. Connect your AI agent (optional)

For the planning skills only. You plan by talking to an AI coding agent. The skills live in `.agents/skills/`, and the agent finds them when you start it in this folder. Claude Code reads them through the links in `.claude/skills/`.

The agent reaches your vault through the same vault server, registered as an MCP server named `life-vault`. Every agent needs the same two absolute paths (`~` is not expanded): the vault server, `packages/vault-server/dist/main.js` in this checkout, and your vault. Keep the server name `life-vault`. Register it in a git-ignored file or in your user settings, so your paths stay out of git.

| Agent                     | Register `life-vault` in                                   |
| ------------------------- | ---------------------------------------------------------- |
| Claude Code               | `.mcp.json` (git-ignored), copied from `.mcp.example.json` |
| Cursor                    | `~/.cursor/mcp.json`, in the same `mcpServers` shape       |
| Gemini CLI                | `~/.gemini/settings.json`, in the same `mcpServers` shape  |
| GitHub Copilot in VS Code | `.vscode/mcp.json` (git-ignored)                           |
| Codex                     | your user settings, with `codex mcp add`                   |
| OpenCode                  | `~/.config/opencode/opencode.json`                         |

**Claude Code, Cursor and Gemini CLI** share one shape. For Claude Code, copy the example and replace the two placeholders:

```sh
cp .mcp.example.json .mcp.json
```

```json
{
  "mcpServers": {
    "life-vault": {
      "command": "node",
      "args": [
        "/absolute/path/to/ai-coach/packages/vault-server/dist/main.js",
        "serve",
        "--vault",
        "/absolute/path/to/your-vault"
      ]
    }
  }
}
```

**GitHub Copilot in VS Code** calls the list `servers`:

```json
{
  "servers": {
    "life-vault": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/absolute/path/to/ai-coach/packages/vault-server/dist/main.js",
        "serve",
        "--vault",
        "/absolute/path/to/your-vault"
      ]
    }
  }
}
```

**Codex** registers it from the command line:

```sh
codex mcp add life-vault -- node /absolute/path/to/ai-coach/packages/vault-server/dist/main.js serve --vault /absolute/path/to/your-vault
```

**OpenCode** takes the command as one list:

```json
{
  "mcp": {
    "life-vault": {
      "type": "local",
      "command": [
        "node",
        "/absolute/path/to/ai-coach/packages/vault-server/dist/main.js",
        "serve",
        "--vault",
        "/absolute/path/to/your-vault"
      ],
      "enabled": true
    }
  }
}
```

The [planning skills guide](../../.agents/skills/README.md#set-it-up) has the rest of the set-up.

`.mcp.example.json` also has a second server, `ai-coach-kb`, which serves the project's [decision records](glossary.md#decision-record) to agents. It's for contributors and needs the docs-mcp engine (see [Contributing](../../CONTRIBUTING.md#decision-records)). If you only plan, delete that entry, or Claude Code reports a server that fails to start.

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
