import type { Priority } from "./planning.js";

export const FIELD_ORDER = ["id", "blockedBy", "priority", "recurrence", "onCompletion", "created", "start", "scheduled", "due", "cancelled", "done"] as const;
export type Field = (typeof FIELD_ORDER)[number];

const EMOJI: Record<Exclude<Field, "priority">, string> = {
  id: "🆔", blockedBy: "⛔", recurrence: "🔁", onCompletion: "🏁", created: "➕", start: "🛫", scheduled: "⏳", due: "📅", cancelled: "❌", done: "✅",
};
export const PRIORITY_EMOJI: Record<Priority, string> = { highest: "🔺", high: "⏫", medium: "🔼", low: "🔽", lowest: "⏬" };
const PRIORITY_OF = new Map(Object.entries(PRIORITY_EMOJI).map(([k, v]) => [v, k as Priority]));
const FIELD_OF = new Map<string, Field>([
  ...Object.entries(EMOJI).map(([k, v]) => [v, k as Field] as [string, Field]),
  ...Object.values(PRIORITY_EMOJI).map(e => [e, "priority"] as [string, Field]),
]);

const SIGNIFIER = /\s*([🆔⛔🔺⏫🔼🔽⏬🔁🏁➕🛫⏳📅❌✅])️?/gu;
const CHECKBOX = /^(\s*[-*+]\s+\[)(.)(\]\s+)/;
const BLOCK_SUFFIX = /\s+\^[A-Za-z0-9-]+\s*$/;

const VALUE: Record<Field, RegExp> = {
  id: /^\s*[A-Za-z0-9_-]+/,
  blockedBy: /^\s*[A-Za-z0-9_-]+(?:\s*,\s*[A-Za-z0-9_-]+)*/,
  priority: /^/,
  recurrence: /^[^↑#^]*?(?=\s*(?:↑|#|\^|$))/,
  onCompletion: /^\s*[a-z]+/,
  created: /^\s*\d{4}-\d{2}-\d{2}/, start: /^\s*\d{4}-\d{2}-\d{2}/, scheduled: /^\s*\d{4}-\d{2}-\d{2}/,
  due: /^\s*\d{4}-\d{2}-\d{2}/, cancelled: /^\s*\d{4}-\d{2}-\d{2}/, done: /^\s*\d{4}-\d{2}-\d{2}/,
};

interface Segment {
  field: Field;

  emoji: string;
  value: string;

  tail: string;

  raw: string | null;
}

export class TaskLine {
  private constructor(
    private head: string,
    private status: string,
    private gap: string,

    public description: string,
    private readonly segments: Segment[],
    private readonly suffix: string,
  ) {}

  static parse(line: string): TaskLine | null {
    const m = line.match(CHECKBOX);
    if (!m) return null;
    let body = line.slice(m[0].length);
    const b = body.match(BLOCK_SUFFIX);
    const suffix = b ? body.slice(b.index!) : "";
    if (b) body = body.slice(0, b.index);
    const hits = [...body.matchAll(SIGNIFIER)];
    const description = hits.length ? body.slice(0, hits[0].index) : body;
    const segments = hits.map((h, i) => {
      const end = i + 1 < hits.length ? hits[i + 1].index! : body.length;
      const raw = body.slice(h.index, end);
      const field = FIELD_OF.get(h[1])!;
      const after = body.slice(h.index! + h[0].length, end);
      const v = after.match(VALUE[field])?.[0] ?? "";
      return { field, emoji: h[1], value: v.trim(), tail: after.slice(v.length), raw };
    });
    return new TaskLine(m[1], m[2], m[3], description, segments, suffix);
  }

  static create(indent: string, description: string): TaskLine {
    return new TaskLine(`${indent}- [`, " ", "] ", description.trim(), [], "");
  }

  get state(): "open" | "done" | "cancelled" {
    return this.status === "x" || this.status === "X" ? "done" : this.status === "-" ? "cancelled" : "open";
  }

  setStatus(char: " " | "x" | "-"): void { this.status = char; }

  get(field: Field): string | null {
    const s = this.segments.find(x => x.field === field);
    if (!s) return null;
    return field === "priority" ? PRIORITY_OF.get(s.emoji)! : s.value;
  }

  set(field: Field, value: string | null): void {
    const i = this.segments.findIndex(x => x.field === field);
    const emoji = field === "priority" ? (value ? PRIORITY_EMOJI[value as Priority] : "") : EMOJI[field];
    if (value === null) {
      if (i < 0) return;
      const [gone] = this.segments.splice(i, 1);
      if (gone.tail.trim()) {
        if (i > 0) { this.segments[i - 1].tail += gone.tail; this.segments[i - 1].raw = null; }
        else this.description += gone.tail;
      }
      return;
    }
    if (i >= 0) {
      const s = this.segments[i];
      if (s.emoji === emoji && s.value === value) return;
      Object.assign(s, { emoji, value, raw: null });
      return;
    }
    const rank = FIELD_ORDER.indexOf(field);
    const at = this.segments.findIndex(x => FIELD_ORDER.indexOf(x.field) > rank);
    const seg: Segment = { field, emoji, value, tail: "", raw: null };
    if (at < 0) this.segments.push(seg);
    else this.segments.splice(at, 0, seg);
  }

  stripTails(pattern: RegExp): void {
    for (const s of this.segments) {
      const t = s.tail.replace(pattern, "");
      if (t !== s.tail) { s.tail = t; s.raw = null; }
    }
  }

  get tails(): string { return this.segments.map(s => s.tail).join(" "); }

  toString(): string {
    const segs = this.segments.map(s => s.raw ?? (s.field === "priority" ? ` ${s.emoji}${s.tail}` : ` ${s.emoji} ${s.value}${s.tail}`)).join("");
    return `${this.head}${this.status}${this.gap}${this.description}${segs}${this.suffix}`;
  }
}

export const isRecurrence = (rule: string) => /^every\s+\S/i.test(rule.trim());
