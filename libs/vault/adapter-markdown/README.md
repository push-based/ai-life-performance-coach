# @ai-coach/vault-adapter-markdown

**Reads a note's YAML frontmatter.** `parseMatter` is the `FrontmatterParser` the vault uses, built on [gray-matter](https://www.npmjs.com/package/gray-matter). It splits a note into its frontmatter and its body. [`vault-domain`](../domain/README.md) then normalises the values, for example dates to `YYYY-MM-DD`.

## Tests

```sh
npx nx test @ai-coach/vault-adapter-markdown
```
