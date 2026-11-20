import type { OutlineEntry, PdfReader } from '@ai-coach/vault-application';

export const readPdf: PdfReader = async (bytes) => {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({
    data: bytes,
    disableFontFace: true,
    verbosity: 0,
  });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const content = await (await doc.getPage(p)).getTextContent();
      pages.push(
        content.items
          .map((i) => ('str' in i ? i.str + (i.hasEOL ? '\n' : '') : ''))
          .join(''),
      );
    }
    const info = ((await doc.getMetadata().catch(() => null))?.info ?? {}) as {
      Title?: unknown;
      Author?: unknown;
    };
    const text = (v: unknown) =>
      typeof v === 'string' && v.trim() ? v.trim() : null;

    type Item = { title: string; dest: unknown; items?: Item[] };
    const pageOf = async (dest: unknown): Promise<number | null> => {
      try {
        const d =
          typeof dest === 'string' ? await doc.getDestination(dest) : dest;
        if (!Array.isArray(d) || !d[0] || typeof d[0] !== 'object') return null;
        return (
          (await doc.getPageIndex(d[0] as { num: number; gen: number })) + 1
        );
      } catch {
        return null;
      }
    };
    const outline: OutlineEntry[] = [];
    for (const top of ((await doc.getOutline().catch(() => null)) ??
      []) as Item[]) {
      const children = top.items ?? [];
      const page = await pageOf(top.dest);
      if (page)
        outline.push({
          title: top.title.trim(),
          page,
          part: null,
          isPart: children.length > 0,
        });
      for (const child of children) {
        const p = await pageOf(child.dest);
        if (p)
          outline.push({
            title: child.title.trim(),
            page: p,
            part: top.title.trim(),
            isPart: false,
          });
      }
    }
    outline.sort((a, b) => a.page - b.page);
    return {
      title: text(info.Title),
      author: text(info.Author),
      pages,
      outline,
    };
  } finally {
    await task.destroy();
  }
};
