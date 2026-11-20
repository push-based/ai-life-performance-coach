# @ai-coach/util-path

**Paths without Node.** Pure `posix` path helpers (`join`, `dirname`, `basename`, `extname`, `normalize`, `relative`, `resolve`, `isAbsolute`) for code that may not import `node:path`, such as a domain or application library.

They behave exactly like `node:path`'s `posix` functions, edge cases included, and work on `/`-separated paths such as vault-relative note paths.

```ts
import { posix } from '@ai-coach/util-path';

posix.join('3.Resources', 'Book', 'Idea.md');
// → '3.Resources/Book/Idea.md'
posix.basename('3.Resources/Book/Idea.md', '.md');
// → 'Idea'
```

It is a `scope:shared` `type:util` library: any scope may import it, and it imports nothing ([ADR-AIC-0052](../../../kb/source/initiatives/ai-coach/decisions/ADR-AIC-0052-split-the-vault-into-hexagonal-domain-application-and-adapter-libraries.md)).

## Tests

```sh
npx nx test @ai-coach/util-path
```
