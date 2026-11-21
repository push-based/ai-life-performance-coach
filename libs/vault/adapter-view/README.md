# @ai-coach/vault-adapter-view

**Serves the graph view in your browser**, on `127.0.0.1` only. `createVaultViewServer(vault)` turns a `Vault` into these pages:

- `/`: the graph of your notes. Click a note to read it, and mark, highlight and summarise in place.
- `/plans`: your goals beside your effort over time.
- `/climb`: the climb page with its drawing board.

The pages are plain HTML and JavaScript in [`assets/`](assets). The board on `/climb` is built from [`apps/climb-board`](../../../apps/climb-board/README.md), and its output is committed in `assets/climb-board/`. Writes from a page need the token the server put into that page.

Start it with `npm run coach -- view`.

## Tests

```sh
npx nx test @ai-coach/vault-adapter-view
```

This checks that the pages load nothing from off the machine. The server itself is tested over real HTTP in [`vault-server`](../../../apps/vault-server/README.md#tests).
