# @ai-coach/vault-adapter-pdf

**Reads the text of a PDF book.** `readPdf` is the `PdfReader` behind `convert_raw`, built on [pdf.js](https://www.npmjs.com/package/pdfjs-dist). It returns each page's text, the title and author, and the outline with page numbers.

## Tests

It has no tests of its own. The conversion tests in [`vault-server`](../../../apps/vault-server/README.md#tests) convert real PDFs through it.
