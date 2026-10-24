/**
 * Sparring sessions (ADR-KI-0058 Decision 6): one markdown file per session under
 * `Coach/sessions/`. The file is readable in Obsidian, but the record of truth is the
 * single `json coach-session` fence at its end; the prose above it is rendered from
 * that record and never read back.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { yamlString } from "@docs-mcp/core/kernel/md/yaml.js";
import { COACH_ROOT } from "./para.js";

export const SESSIONS_DIR = posix.join(COACH_ROOT, "sessions");

export type Tier = 1 | 2;
export type Verdict = "pass" | "fail";

export interface SessionItem {
  coach_id: string;
  /** Where the note was when the session was recorded; informational, never used to resolve. */
  note_path: string;
  title: string;
  challenge: string;
  answer: string;
  verdict: Verdict;
  gaps: string[];
  /** Consumer-supplied, YYYY-MM-DD. */
  next_review: string;
}

export interface SessionRecord {
  version: 1;
  session_id: string;
  tier: Tier;
  /** YYYY-MM-DD. */
  date: string;
  /** ISO timestamp; orders sessions recorded on the same date. */
  recorded_at: string;
  items: SessionItem[];
}

export interface InvalidSession {
  file: string;
  error: string;
}

const FENCE = /^```json coach-session\n([\s\S]*?)\n```$/gm;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isDate = (s: unknown): s is string =>
  typeof s === "string" && DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export function sessionPath(id: string): string {
  return posix.join(SESSIONS_DIR, `${id}.md`);
}

function quote(text: string): string {
  return text.split("\n").map(l => (l ? `> ${l}` : ">")).join("\n");
}

export function renderSession(r: SessionRecord): string {
  const lines = [
    "---",
    `session_id: ${yamlString(r.session_id)}`,
    `tier: ${r.tier}`,
    `date: ${yamlString(r.date)}`,
    `recorded_at: ${yamlString(r.recorded_at)}`,
    `notes: [${r.items.map(i => yamlString(i.coach_id)).join(", ")}]`,
    "---",
    "",
    `# Sparring session, Tier ${r.tier}, ${r.date}`,
    "",
    "Written by the coach. Edits to this file are not read back; the record is the block at the end.",
  ];
  for (const i of r.items) {
    lines.push(
      "",
      `## ${i.title}`,
      "",
      `**Verdict:** ${i.verdict} · **Next review:** ${i.next_review} · **Note:** ${i.note_path}`,
      "",
      "**Challenge**",
      "",
      quote(i.challenge),
      "",
      "**Answer**",
      "",
      quote(i.answer),
    );
    if (i.gaps.length) lines.push("", "**Gaps**", "", ...i.gaps.map(g => `- ${g}`));
  }
  lines.push("", "```json coach-session", JSON.stringify(r, null, 2), "```", "");
  return lines.join("\n");
}

function checkRecord(v: unknown): SessionRecord {
  const r = v as SessionRecord;
  if (!r || typeof r !== "object") throw new Error("record is not an object");
  if (r.version !== 1) throw new Error(`unsupported version ${String(r.version)}`);
  if (typeof r.session_id !== "string" || !r.session_id) throw new Error("session_id missing");
  if (r.tier !== 1 && r.tier !== 2) throw new Error("tier must be 1 or 2");
  if (!isDate(r.date)) throw new Error("date must be YYYY-MM-DD");
  if (typeof r.recorded_at !== "string" || Number.isNaN(Date.parse(r.recorded_at))) throw new Error("recorded_at must be an ISO timestamp");
  if (!Array.isArray(r.items) || r.items.length === 0) throw new Error("items must be a non-empty array");
  r.items.forEach((i, n) => {
    const at = `items[${n}]`;
    for (const k of ["coach_id", "note_path", "title", "challenge", "answer"] as const) {
      if (typeof i?.[k] !== "string") throw new Error(`${at}.${k} must be a string`);
    }
    if (i.verdict !== "pass" && i.verdict !== "fail") throw new Error(`${at}.verdict must be pass or fail`);
    if (!Array.isArray(i.gaps) || i.gaps.some(g => typeof g !== "string")) throw new Error(`${at}.gaps must be a string array`);
    if (!isDate(i.next_review)) throw new Error(`${at}.next_review must be YYYY-MM-DD`);
  });
  return r;
}

/** The record in a session file: the last `json coach-session` fence. */
export function parseSession(content: string): SessionRecord {
  const fences = [...content.replace(/\r\n/g, "\n").matchAll(FENCE)];
  if (!fences.length) throw new Error("no json coach-session block");
  let parsed: unknown;
  try {
    parsed = JSON.parse(fences[fences.length - 1][1]);
  } catch (err) {
    throw new Error(`coach-session block is not JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  return checkRecord(parsed);
}

/** Every session in the vault, oldest first, plus the files that could not be read as one. */
export async function loadSessions(root: string): Promise<{ sessions: SessionRecord[]; invalid: InvalidSession[] }> {
  let names: string[];
  try {
    names = (await readdir(join(root, SESSIONS_DIR), { withFileTypes: true }))
      .filter(e => e.isFile() && e.name.endsWith(".md"))
      .map(e => e.name)
      .sort();
  } catch {
    return { sessions: [], invalid: [] };
  }
  const sessions: SessionRecord[] = [];
  const invalid: InvalidSession[] = [];
  for (const name of names) {
    const file = posix.join(SESSIONS_DIR, name);
    try {
      sessions.push(parseSession(await readFile(join(root, file), "utf-8")));
    } catch (err) {
      invalid.push({ file, error: err instanceof Error ? err.message : String(err) });
    }
  }
  sessions.sort((a, b) => (a.recorded_at < b.recorded_at ? -1 : a.recorded_at > b.recorded_at ? 1 : 0));
  return { sessions, invalid };
}
