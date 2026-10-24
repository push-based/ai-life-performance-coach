import type { ToolResult } from "../../tool-types.js";

/** Vault tools answer an application, not a reader: every result is JSON text. */
export function json(value: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

export function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
