# @ai-coach/vault-adapter-search

**Ranks full-text search hits.** `rankWithFlexSearch` is the `SearchRanker` behind the `search` and `find_passages` tools, built on [FlexSearch](https://www.npmjs.com/package/flexsearch). A title match counts more than a body match, and diacritics are folded, so Polish and English match alike.

**Known gap:** it folds `ż`, `ó`, `ę` and `ś`, but not `ł`.

## Tests

```sh
npx nx test @ai-coach/vault-adapter-search
```
