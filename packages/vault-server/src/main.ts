#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface CliIo {
  cwd: string;
}

export const USAGE = [
  'usage: coach-vault <command> [options]',
  '',
  '  serve --vault [<path>] [--vault-config=<path>]   serve the vault over MCP on stdio',
  '  view --vault [<path>] [--port=<n>]               the vault graph, plans and climb pages on 127.0.0.1 (default port 4747)',
].join('\n');

export async function main(argv: string[], io: CliIo = { cwd: process.cwd() }): Promise<number> {
  const [command, ...rest] = argv;
  switch (command) {
    case 'serve': {
      const { serveVault } = await import('./serve-vault.js');
      await serveVault({ cwd: io.cwd, argv: rest, env: process.env });
      return 0;
    }
    case 'view':
      return (await import('./commands/view.js')).run(rest, io);
    default:
      console.error(USAGE);
      return command === undefined || command === '--help' ? 0 : 2;
  }
}

const invoked = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (invoked) {
  const code = await main(process.argv.slice(2));
  if (code !== 0) process.exitCode = code;
}
