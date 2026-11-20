import { posix } from '@ai-coach/util-path';
import { parseFrontmatter, extractBody, type FrontmatterParser } from './md.js';
import { classify, type ParaLocation } from './para.js';
import { extractLinks, type RawLink } from './links.js';

export interface VaultNote extends ParaLocation {
  path: string;
  title: string;

  frontmatter: Record<string, unknown>;
  body: string;

  coachId: string | null;

  convertedFrom: string | null;

  rawRole: 'index' | 'chapter' | null;

  concept: boolean;

  pageRange: [number, number] | null;
  links: RawLink[];
}

function titleOf(
  path: string,
  fm: Record<string, unknown>,
  body: string,
): string {
  if (typeof fm.title === 'string' && fm.title.trim()) return fm.title.trim();
  const h1 = body.match(/^#\s+(.+?)\s*#*\s*$/m);
  if (h1) return h1[1];
  return posix.basename(path, '.md');
}

export function noteFromContent(
  path: string,
  content: string,
  parse: FrontmatterParser,
): VaultNote {
  const frontmatter = (parseFrontmatter(content, parse) ?? {}) as Record<
    string,
    unknown
  >;
  const body = Object.keys(frontmatter).length
    ? extractBody(content, parse)
    : content;
  const coachId =
    typeof frontmatter.coach_id === 'string' ? frontmatter.coach_id : null;
  const convertedFrom =
    typeof frontmatter.converted_from === 'string'
      ? frontmatter.converted_from
      : null;
  const rawRole =
    frontmatter.raw_role === 'index' || frontmatter.raw_role === 'chapter'
      ? frontmatter.raw_role
      : null;
  const range =
    rawRole === 'chapter' && typeof frontmatter.pages === 'string'
      ? frontmatter.pages.match(/^(\d+)-(\d+)$/)
      : null;
  const pageRange: [number, number] | null = range
    ? [Number(range[1]), Number(range[2])]
    : null;
  const concept = frontmatter.type === 'concept';
  return {
    path,
    title: titleOf(path, frontmatter, body),
    frontmatter,
    body,
    coachId,
    convertedFrom,
    rawRole,
    concept,
    pageRange,
    links: extractLinks(body),
    ...classify(path),
  };
}
