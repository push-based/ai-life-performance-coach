import type { z, ZodRawShape } from 'zod';

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

export interface ToolDef {
  name: string;
  description: string;
  annotations?: ToolAnnotations;
  schema: ZodRawShape;
  handler: (args: Record<string, any>) => Promise<ToolResult>;
}

type InferShape<S extends ZodRawShape> = { [K in keyof S]: z.infer<S[K]> };

export function defineTool<S extends ZodRawShape>(def: {
  name: string;
  description: string;
  annotations?: ToolAnnotations;
  schema: S;
  handler: (args: InferShape<S>) => Promise<ToolResult>;
}): ToolDef {
  return def as ToolDef;
}
