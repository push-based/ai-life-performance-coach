import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PARA_FOLDERS } from "./para.js";
import { FIRST_SIGNIFIER, planning, parseTasks } from "./planning.js";
import { addToSection, nextPeriod, periodOf, planPathOf, scheduleLine, slug, templateFor, TaskLineEditor, type NoteEdit, type NoteWrites, type Period } from "./plans.js";
import type { VaultNote } from "./scan.js";

export interface RollOverPlan extends NoteWrites {
  from: Period | null;
  to: Period | null;

  plan: string;
  creates: boolean;

  tasks: NoteEdit[];

  goals: { text: string; id: string }[];
  warnings: string[];
}

const LOWER_PRIORITY = /\s?[⏫🔼🔽⏬]\uFE0F?/gu;

function beforeSignifiers(line: string, text: string): string {
  const m = line.match(FIRST_SIGNIFIER);
  return m ? `${line.slice(0, m.index)}${text}${line.slice(m.index)}` : `${line.replace(/\s+$/, "")}${text}`;
}

function raise(line: string): string {
  if (line.includes("🔺")) return line;
  const plain = line.replace(LOWER_PRIORITY, "");
  const m = plain.match(/\s\^[A-Za-z0-9-]+\s*$/);
  return m ? `${plain.slice(0, m.index)} ⏫${plain.slice(m.index)}` : `${plain.replace(/\s+$/, "")} ⏫`;
}

export function rollOver(root: string, notes: VaultNote[], periodName: string): RollOverPlan {
  const from = periodOf(periodName);
  const out: RollOverPlan = { from, to: null, plan: "", creates: false, tasks: [], goals: [], errors: [], warnings: [], originals: {}, writes: {}, created: [] };
  if (!from) { out.errors.push(`"${periodName}" is not a period: use YYYY-Qn, YYYY-MM or YYYY-Www`); return out; }
  if (from.level === "year") { out.errors.push("a year does not roll over: review its open goals and keep, drop or rewrite them in the new year's plan"); return out; }
  if (from.level === "day") { out.errors.push("a day carries no slip: its open tasks stay listed until their week rolls over"); return out; }
  const to = nextPeriod(from);
  out.to = to;
  out.plan = planPathOf(to);
  const tag = `#slipped/${from.period}`;
  const p = planning(root, notes);
  const byPath = new Map(notes.map(n => [n.path, n]));

  const editor = new TaskLineEditor(root, out.originals);
  for (const t of p.tasks) {
    if (t.goal || t.habit || t.recurrence || t.state !== "open" || !t.scheduled || t.scheduled < from.start || t.scheduled > from.end) continue;

    if (t.note.startsWith(`${PARA_FOLDERS.archive}/`)) continue;
    const err = editor.edit(byPath.get(t.note)!, t.line, line => {
      const tagged = t.slipped.includes(from.period) ? line : beforeSignifiers(line, ` ${tag}`);
      return raise(scheduleLine(tagged, to.start));
    });
    if (err) out.errors.push(err);
  }
  out.tasks = editor.edits;
  Object.assign(out.writes, editor.writes());

  const target = byPath.get(out.plan);
  const original = target ? readFileSync(join(root, out.plan), "utf-8") : null;
  if (original !== null) out.originals[out.plan] ??= original;
  const content = original ?? templateFor(root, to.level).replace(/\{\{title\}\}/g, to.period);
  const there = parseTasks(out.plan, target?.body ?? content, to);
  const taken = new Set(there.map(t => t.blockId).filter(Boolean));
  const lines: string[] = [];
  for (const g of p.tasks) {
    if (!g.goal || g.state !== "open" || g.plan?.period !== from.period) continue;
    if (there.some(t => t.goal && t.text === g.text && t.slipped.includes(from.period))) {
      out.warnings.push(`goal "${g.text}" was already rolled into ${to.period}`);
      continue;
    }

    const base = slug(g.text.replace(/\[\[[^\]]*\]\]/g, ""));
    let id = base;
    for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
    taken.add(id);
    const slips = [...g.slipped.filter(s => s !== from.period), from.period].map(s => ` #slipped/${s}`).join("");
    const parent = g.parent ? ` ↑ [[${g.parent.target}#^${g.parent.block}]]` : "";
    if (g.parent) {
      const pp = periodOf(g.parent.target);
      if (pp && (pp.end < to.start || pp.start > to.end)) out.warnings.push(`goal "${g.text}": its parent in ${pp.period} does not overlap ${to.period}; link a new parent if it moved on`);
    }

    lines.push(`- [ ] ${g.text}${g.size ? ` #${g.size}` : ""}${slips}${parent} ⏫ ^${id}`);
    out.goals.push({ text: g.text, id });
  }
  out.creates = !target && lines.length > 0;
  if (lines.length) {

    out.writes[out.plan] = addToSection(editor.contentOf(out.plan) ?? content, "Goals", lines);
    if (out.creates) out.created.push(out.plan);
  }

  for (const t of p.tasks) {
    if (!t.goal && !t.habit && !t.recurrence && t.state === "open" && !t.scheduled && t.plan?.period === from.period) {
      out.warnings.push(`"${t.text}" in ${t.note} is not scheduled, so it stays where it is`);
    }
  }
  if (!out.tasks.length && !lines.length) out.warnings.push(`nothing open in ${from.period} to roll over`);
  return out;
}
