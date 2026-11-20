import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const from = new URL('../dist/browser/', import.meta.url).pathname;
const to = new URL(
  '../../../libs/vault/core/assets/climb-board/',
  import.meta.url,
).pathname;
mkdirSync(to, { recursive: true });
for (const f of ['main.js', 'styles.css'])
  copyFileSync(join(from, f), join(to, f));
const licenses = readdirSync(
  new URL('../dist/', import.meta.url).pathname,
).find((f) => f === '3rdpartylicenses.txt');
if (licenses)
  copyFileSync(
    join(new URL('../dist/', import.meta.url).pathname, licenses),
    join(to, '3rdpartylicenses.txt'),
  );
console.log(`climb board copied to ${to}`);
