# @ai-coach/vault-adapter-fs

**The vault's files on your disk.** `createFsNoteStore(root)` is the `NoteStore` the vault reads and writes through. It is the only code that opens vault files.

It also holds:

- `resolveVaultRoot`: which folder is your vault. It comes from `--vault`, else `DOCS_MCP_VAULT`, else `vault.root` in `~/.config/docs-mcp/config.json`. A vault inside a folder with a `docs-mcp.config.json` is refused.
- `sha256Hex` and `randomHex`: note versions and new ids, from `node:crypto`.

## Good to know

- **It never overwrites by accident.** A new note is created only if nothing is there, and a move links the file to its new place before removing the old one.
- **It doesn't follow symlinks.** A symlinked folder is listed as neither file nor folder, so a scan never leaves the vault.

## Tests

```sh
npx nx test @ai-coach/vault-adapter-fs
```

Each test uses a temporary directory.
