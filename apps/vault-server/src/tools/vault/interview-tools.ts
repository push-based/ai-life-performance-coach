import { z } from 'zod';
import { defineTool, type ToolDef } from '../../tool-types.js';
import type { Vault } from '@ai-coach/vault/vault.js';
import { json, fail } from './json.js';

const EXECUTE = z
  .boolean()
  .optional()
  .describe('Write it (default: preview only)');

const DIFFICULTY = z.enum(['easy', 'medium', 'hard']);
const INDEPENDENCE = z.enum(['failed', 'editorial', 'assisted', 'nudge', 'solo']);
const MODE = z.enum(['cli', 'web']);

export function interviewListProblemsTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'interview_list_problems',
    description:
      'List every tracked interview problem under Coach/interview/problems/ with its metadata, review schedule, and attempt history.',
    annotations: { readOnlyHint: true, idempotentHint: true },
    schema: {},
    handler: async () => json({ problems: await vault.listInterviewProblems() }),
  });
}

export function interviewGetProblemTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'interview_get_problem',
    description:
      'Read one tracked interview problem by slug, including description, constraints, solution path, review schedule, and all attempts.',
    annotations: { readOnlyHint: true, idempotentHint: true },
    schema: {
      slug: z.string().min(1).describe('Normalized problem slug, e.g. two-sum'),
    },
    handler: async (args) => {
      const problem = await vault.getInterviewProblem(args.slug);
      return problem
        ? json(problem)
        : fail(`Interview problem not found: ${args.slug}`);
    },
  });
}

export function interviewSaveProblemTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'interview_save_problem',
    description:
      'Create or update an interview problem note under Coach/interview/problems/<slug>/problem.md. Preview first, then pass execute: true to write.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    },
    schema: {
      slug: z.string().min(1),
      title: z.string().min(1),
      source: z.string().default(''),
      difficulty: DIFFICULTY.default('medium'),
      patterns: z.array(z.string()).default([]),
      lists: z.array(z.string()).default([]),
      solutionPath: z.string().default(''),
      description: z.string().default(''),
      constraints: z.array(z.string()).default([]),
      examples: z.array(z.string()).default([]),
      execute: EXECUTE,
    },
    handler: async (args) => {
      const result = await vault.saveInterviewProblem(
        {
          slug: args.slug,
          title: args.title,
          source: args.source,
          difficulty: args.difficulty,
          patterns: args.patterns,
          lists: args.lists,
          solutionPath: args.solutionPath,
          description: args.description,
          constraints: args.constraints,
          examples: args.examples,
        },
        args.execute === true,
      );
      return result.errors.length
        ? fail(`interview_save_problem refused:\n- ${result.errors.join('\n- ')}`)
        : json(result);
    },
  });
}

export function interviewLogAttemptTool(vault: Vault): ToolDef {
  return defineTool({
    name: 'interview_log_attempt',
    description:
      'Append a practice attempt to Coach/interview/problems/<slug>/attempts.jsonl and update nextReview and rung in problem.md. Preview first, then pass execute: true to write.',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    schema: {
      slug: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      mode: MODE.default('cli'),
      durationSec: z.number().int().min(0),
      independence: INDEPENDENCE,
      hintsUsed: z.number().int().min(0).default(0),
      passedTests: z.number().int().min(0),
      totalTests: z.number().int().min(0),
      timeComplexity: z.string().default(''),
      spaceComplexity: z.string().default(''),
      mistakes: z.array(z.string()).default([]),
      codeSnapshot: z.string().default(''),
      nextReview: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      rung: z.number().int().min(-1),
      execute: EXECUTE,
    },
    handler: async (args) => {
      const result = await vault.logInterviewAttempt(
        {
          slug: args.slug,
          date: args.date,
          mode: args.mode,
          durationSec: args.durationSec,
          independence: args.independence,
          hintsUsed: args.hintsUsed,
          passedTests: args.passedTests,
          totalTests: args.totalTests,
          timeComplexity: args.timeComplexity,
          spaceComplexity: args.spaceComplexity,
          mistakes: args.mistakes,
          codeSnapshot: args.codeSnapshot,
          nextReview: args.nextReview,
          rung: args.rung,
        },
        args.execute === true,
      );
      return result.errors.length
        ? fail(`interview_log_attempt refused:\n- ${result.errors.join('\n- ')}`)
        : json(result);
    },
  });
}
