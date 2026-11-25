export type DistillMarkOp = 'bold' | 'highlight' | 'clear';

export interface PageSpan {
  text: string;
  src: number;
  bold: boolean;
  highlight: boolean;
}

export type PageBlock =
  | { kind: 'empty' }
  | { kind: 'head'; spans: PageSpan[] }
  | { kind: 'para'; spans: PageSpan[] };

export function splitPageSummary(text: string): string | null {
  const m = /^>[ \t]*\[!summary\][^\n]*(?:\n>[^\n]*)*/im.exec(text);
  if (!m) return null;
  const lines = m[0].split('\n');
  const body = [
    lines[0].replace(/^>[ \t]*\[!summary\][-+]?/i, ''),
    ...lines.slice(1).map((l) => l.replace(/^>[ \t]?/, '')),
  ]
    .join('\n')
    .trim();
  return body || null;
}

function isHeadingLine(line: string): boolean {
  const words = line.split(/\s+/).filter((w) => /\p{L}/u.test(w));
  return (
    words.length > 0 &&
    !/[.,;:!?]["”’)]?$/.test(line) &&
    words.filter((w) => /^\p{Lu}/u.test(w) || w.length <= 3).length /
      words.length >=
      0.8
  );
}

export function parsePageBlocks(text: string): PageBlock[] {
  const lines: { text: string; src: number }[] = [];
  let at = 0;
  for (const line of text.split('\n')) {
    lines.push({ text: line, src: at });
    at += line.length + 1;
  }

  const blocks: { text: string; src: number }[][] = [];
  let cur: { text: string; src: number }[] = [];
  for (const l of lines) {
    if (!l.text.trim() || /^>/.test(l.text)) {
      if (cur.length) blocks.push(cur);
      cur = [];
      continue;
    }
    cur.push(l);
  }
  if (cur.length) blocks.push(cur);

  const out: PageBlock[] = [];
  for (const block of blocks) {
    if (
      block.length === 1 &&
      block[0].text.trim() === '_(no text on this page)_'
    ) {
      out.push({ kind: 'empty' });
      continue;
    }

    let bold = false;
    let highlight = false;
    const segs = block.map((l) => {
      const list: PageSpan[] = [];
      let i = l.text.startsWith('\\') ? 1 : 0;
      let start = i;
      let buf = '';
      const flush = () => {
        if (buf) {
          list.push({ text: buf, src: l.src + start, bold, highlight });
        }
        buf = '';
      };
      while (i < l.text.length) {
        const two = l.text.slice(i, i + 2);
        if (two === '**' || two === '__' || two === '==') {
          flush();
          if (two === '==') highlight = !highlight;
          else bold = !bold;
          i += 2;
          start = i;
          continue;
        }
        buf += l.text[i];
        i++;
      }
      flush();
      return {
        raw: l.text.replace(/^\\/, '').replace(/\*\*|__|==/g, ''),
        list,
      };
    });

    const full = Math.max(...segs.map((s) => s.raw.length));
    let para: PageSpan[] = [];
    const flushPara = () => {
      if (para.length) out.push({ kind: 'para', spans: para });
      para = [];
    };

    for (const s of segs) {
      const short = s.raw.length < full * 0.7;
      if (short && isHeadingLine(s.raw)) {
        flushPara();
        out.push({ kind: 'head', spans: s.list });
        continue;
      }
      if (para.length && s.list.length) {
        para.push({
          text: ' ',
          src: s.list[0].src,
          bold: false,
          highlight: false,
        });
      }
      para.push(...s.list);
      if (short && /[.!?:]["”’)]?$/.test(s.raw)) flushPara();
    }
    flushPara();
  }

  return out.length ? out : [{ kind: 'empty' }];
}

export function distillMarkLabel(mark: string, empty: boolean): string {
  if (empty) return 'No text';
  if (mark === 'bold') return 'Bolded';
  if (mark === 'highlight') return 'Highlighted';
  return 'Not marked';
}
