import type { FetchedProblem, ProblemFetcher } from '@ai-coach/application';
import {
  isInterviewDifficulty,
  parseProblemUrl,
  type InterviewDifficulty,
} from '@ai-coach/domain';
import { z } from 'zod';

const LeetCodeResponse = z.object({
  data: z.object({
    question: z
      .object({
        title: z.string(),
        titleSlug: z.string(),
        difficulty: z.string(),
        content: z.string().nullable(),
        topicTags: z
          .array(z.object({ name: z.string(), slug: z.string() }))
          .default([]),
        codeSnippets: z
          .array(z.object({ langSlug: z.string(), code: z.string() }))
          .nullable()
          .default([]),
        exampleTestcaseList: z.array(z.string()).nullable().default([]),
      })
      .nullable(),
  }),
});

const LEETCODE_QUERY = `
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    title
    titleSlug
    difficulty
    content
    topicTags { name slug }
    codeSnippets { langSlug code }
    exampleTestcaseList
  }
}
`;

function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|li|pre|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractConstraints(text: string): string[] {
  const match = text.match(/Constraints:\s*([\s\S]*)$/i);
  if (!match) return [];
  return match[1]!
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
}

export class HttpProblemFetcher implements ProblemFetcher {
  async fetchProblem(url: string): Promise<FetchedProblem | null> {
    const parsed = parseProblemUrl(url);
    if (!parsed) return null;
    if (parsed.provider !== 'leetcode') return null;

    try {
      const response = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          referer: parsed.canonicalUrl,
        },
        body: JSON.stringify({
          query: LEETCODE_QUERY,
          variables: { titleSlug: parsed.slug },
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return null;
      const body = await response.json();
      const valid = LeetCodeResponse.safeParse(body);
      if (!valid.success || !valid.data.data.question) return null;
      const q = valid.data.data.question;
      if (!q.content) return null;

      const lowered = q.difficulty.toLowerCase();
      const difficulty: InterviewDifficulty = isInterviewDifficulty(lowered)
        ? lowered
        : 'medium';
      const plain = stripHtml(q.content);
      const tsSnippet =
        q.codeSnippets?.find((s) => s.langSlug === 'typescript')?.code ?? null;

      return {
        slug: q.titleSlug,
        title: q.title,
        source: parsed.canonicalUrl,
        difficulty,
        tags: q.topicTags.map((t) => t.slug),
        description: plain,
        constraints: extractConstraints(plain),
        examples: q.exampleTestcaseList ?? [],
        starterCode: tsSnippet,
      };
    } catch {
      return null;
    }
  }
}
