export type Frontmatter = Record<string, unknown>;

export interface ParsedMatter {
  data: Record<string, unknown>;
  content: string;
}

export type FrontmatterParser = (content: string) => ParsedMatter;

function normalizeValue(val: unknown): unknown {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return val;
}

function normalizeLinkEntry(val: unknown): unknown {
  const norm = normalizeValue(val);
  if (typeof norm === 'string') return norm;
  if (typeof norm === 'number' || typeof norm === 'boolean')
    return String(norm);
  return norm;
}

function normalizeFrontmatter(data: Record<string, unknown>): Frontmatter {
  const fm: Frontmatter = {};
  for (const [key, raw] of Object.entries(data)) {
    const val = normalizeValue(raw);
    if (key === 'links' && Array.isArray(val)) {
      fm[key] = val.map(normalizeLinkEntry);
    } else if (
      key === 'provenance' &&
      typeof val === 'object' &&
      val !== null &&
      !Array.isArray(val)
    ) {
      fm[key] = Object.fromEntries(
        Object.entries(val as Record<string, unknown>).map(([k, v]) => [
          k,
          normalizeValue(v),
        ]),
      );
    } else if (Array.isArray(val)) {
      fm[key] = val.map(normalizeValue);
    } else {
      fm[key] = val;
    }
  }
  return fm;
}

export function parseFrontmatter(
  content: string,
  parse: FrontmatterParser,
): Frontmatter | null {
  if (!content.startsWith('---')) return null;
  try {
    const result = parse(content);
    if (!result.data || Object.keys(result.data).length === 0) return null;
    return normalizeFrontmatter(result.data);
  } catch {
    return null;
  }
}

export function extractBody(content: string, parse: FrontmatterParser): string {
  try {
    return parse(content).content;
  } catch {
    return content;
  }
}

export function yamlString(value: string): string {
  return JSON.stringify(value);
}
