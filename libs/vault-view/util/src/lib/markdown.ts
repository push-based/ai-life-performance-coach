export type InlineToken =
  | { kind: 'text'; text: string; bold: boolean; highlight: boolean }
  | { kind: 'wikilink'; target: string; label: string };

export type NoteBlock =
  | { kind: 'paragraph'; tokens: InlineToken[] }
  | { kind: 'heading'; level: number; tokens: InlineToken[] }
  | { kind: 'code'; code: string }
  | { kind: 'quote'; callout: string | null; blocks: NoteBlock[] }
  | { kind: 'list-item'; depth: number; mark: string; tokens: InlineToken[] };

export function tokenizeInline(text: string): InlineToken[] {
  const out: InlineToken[] = [];
  let bold = false;
  let highlight = false;
  let buf = '';
  const flush = () => {
    if (buf) out.push({ kind: 'text', text: buf, bold, highlight });
    buf = '';
  };
  for (let i = 0; i < text.length;) {
    const two = text.slice(i, i + 2);
    if (two === '**' || two === '__' || two === '==') {
      flush();
      if (two === '==') highlight = !highlight;
      else bold = !bold;
      i += 2;
      continue;
    }
    const wiki = /^!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(text.slice(i));
    if (wiki) {
      flush();
      const target = wiki[1];
      const label = wiki[2] || target.split('/').pop() || target;
      out.push({ kind: 'wikilink', target, label });
      i += wiki[0].length;
      continue;
    }
    const md = /^\[([^\]]+)\]\(([^)]+)\)/.exec(text.slice(i));
    if (md) {
      buf += md[1];
      i += md[0].length;
      continue;
    }
    buf += text[i];
    i++;
  }
  flush();
  return out;
}

export function parseNoteBlocks(text: string): NoteBlock[] {
  const out: NoteBlock[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      out.push({
        kind: 'paragraph',
        tokens: tokenizeInline(para.join(' ')),
      });
    }
    para = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line)) {
      flushPara();
      const code: string[] = [];
      for (i++; i < lines.length && !/^```/.test(lines[i]); i++) {
        code.push(lines[i]);
      }
      out.push({ kind: 'code', code: code.join('\n') });
      continue;
    }
    if (/^>/.test(line)) {
      flushPara();
      const quote: string[] = [];
      for (; i < lines.length && /^>/.test(lines[i]); i++) {
        quote.push(lines[i].replace(/^>[ \t]?/, ''));
      }
      i--;
      const calloutMatch = /^\[!(\w+)\][-+]?\s*(.*)$/.exec(quote[0] ?? '');
      const rest = calloutMatch ? quote.slice(1) : quote;
      out.push({
        kind: 'quote',
        callout: calloutMatch ? calloutMatch[2] || calloutMatch[1] : null,
        blocks: parseNoteBlocks(rest.join('\n')),
      });
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flushPara();
      out.push({
        kind: 'heading',
        level: Math.min(6, heading[1].length + 2),
        tokens: tokenizeInline(heading[2]),
      });
      continue;
    }
    const item = /^(\s*)([-*+]|\d+[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/.exec(line);
    if (item) {
      flushPara();
      const depth = Math.floor(item[1].replace(/\t/g, '  ').length / 2);
      const mark =
        item[3] !== undefined
          ? item[3].trim()
            ? '☑ '
            : '☐ '
          : /\d/.test(item[2])
            ? `${item[2]} `
            : '• ';
      out.push({
        kind: 'list-item',
        depth,
        mark,
        tokens: tokenizeInline(item[4]),
      });
      continue;
    }
    if (!line.trim()) {
      flushPara();
      continue;
    }
    para.push(line.trim());
  }
  flushPara();
  return out;
}
