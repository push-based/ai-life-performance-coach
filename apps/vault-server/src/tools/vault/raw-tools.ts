import { z } from 'zod';
import { defineTool, type ToolDef } from '../../tool-types.js';
import type { Vault } from '@ai-coach/vault-application';
import { json, fail } from './json.js';

export function listRawTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'list_raw',
    description:
      "List the raw resources under 3.Resources/0.Raw (full books, articles and other source material kept whole), each with its kind folder, the note that carries its text (null when a PDF is not converted yet), whether it can be converted, and what was made from it: notes (the user's own notes linking it or any of its chapters) and concepts (concept notes quoting or linking it).",
    annotations: { readOnlyHint: true, idempotentHint: true },
    schema: {},
    handler: async () => json(await vault.listRaw()),
  });
}

export function convertRawTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'convert_raw',
    description:
      "Convert one PDF under 3.Resources/0.Raw into notes in its work folder, once and offline. A PDF not yet in its own folder first moves to <kind>/<author>/<title>/e-book.pdf (author and title from the PDF's metadata unless given). The text goes into chapters/NN <title>.md, one note per chapter from the PDF's outline (a book without one is cut into blocks of pages); a chapter over max_chars splits into parts at page boundaries; front and back matter stays in the PDF. text.md becomes the book's index, linking each chapter. None of these notes is sparred: they are the reference that concept notes quote (see find_passages and create_concept). Links to the PDF resolve to the index, or with #page=N to the chapter holding that page. The PDF is never changed and no existing file is replaced. Previews by default with the real chapter list; pass execute: true to write.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    schema: {
      path: z
        .string()
        .describe(
          'Vault-relative path of the PDF, e.g. 3.Resources/0.Raw/Books/Book.pdf',
        ),
      author: z
        .string()
        .optional()
        .describe(
          "Author folder; defaults to the folder the PDF is in, else the PDF's metadata author",
        ),
      title: z
        .string()
        .optional()
        .describe(
          "Work folder; defaults to the PDF's metadata title, else its file name",
        ),
      max_chars: z
        .number()
        .int()
        .min(1000)
        .optional()
        .describe(
          'Largest sparring unit in characters before a chapter splits into parts (default 20000, about 5,000 tokens)',
        ),
      execute: z
        .boolean()
        .optional()
        .describe('Write the note (default: preview only)'),
    },
    handler: async (args) => {
      const r = await vault.convertRaw(args.path, args.execute === true, {
        author: args.author,
        title: args.title,
        maxChars: args.max_chars,
      });
      return r.errors.length
        ? fail(`convert_raw refused:\n- ${r.errors.join('\n- ')}`)
        : json(r);
    },
  });
}
