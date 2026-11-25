# @ai-coach/vault-view

**The Angular layered frontend for the vault view**, built as an Nx task dependency of [`@ai-coach/vault-adapter-view`](../../libs/vault/adapter-view/README.md) (`ADR-AIC-0059`).

It hosts the `/plans` and `/climb` pages (including the `ng-diagram` structure drawing board) under `scope:vault-view` (`architecture:layered`), with the graph page migrating in subsequent PRs.

## Build

```sh
npx nx build @ai-coach/vault-view
```
