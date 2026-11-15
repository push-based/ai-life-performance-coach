import type { z, ZodRawShape } from "zod";

// ── Tool annotations (MCP spec) ─────────────────────────────────────────────

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

// ── Tool result ─────────────────────────────────────────────────────────────

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

// ── Tool definition (type-erased for registry) ──────────────────────────────

export interface ToolDef {
  name: string;
  description: string;
  annotations?: ToolAnnotations;
  schema: ZodRawShape;
  handler: (args: Record<string, any>) => Promise<ToolResult>;
}

// ── defineTool — preserves type inference at the call site ──────────────────

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
