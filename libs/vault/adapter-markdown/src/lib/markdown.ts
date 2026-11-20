import matter from 'gray-matter';
import type { FrontmatterParser } from '@ai-coach/vault-domain';

export const parseMatter: FrontmatterParser = (content) => {
  const { data, content: body } = matter(content);
  return { data, content: body };
};
