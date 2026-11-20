# @ai-coach/climb-board

**The drawing board on the graph view's climb page** (`/climb`), where you sketch how a book's concepts build on each other. It is a small Angular app built with [ng-diagram](https://www.npmjs.com/package/ng-diagram).

The vault server doesn't build it. It serves the built `main.js` and `styles.css` committed in [`libs/vault/core/assets/climb-board/`](../../libs/vault/core/assets/climb-board). You only need to build it after changing the board:

```sh
npm run build:board -w @ai-coach/climb-board
```

That runs `ng build` and copies the output into `libs/vault/core/assets/climb-board/`. Commit the copied files with your change. CI lints the board's source but doesn't build it, and Prettier skips the built output.
