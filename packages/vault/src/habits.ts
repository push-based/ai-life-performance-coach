export const HABITS_HEADING = 'Habits';

const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export function habitDays(rule: string): Set<number> | null {
  const r = rule.trim().toLowerCase().replace(/\s+/g, ' ');
  if (r === 'every day') return new Set([0, 1, 2, 3, 4, 5, 6]);
  if (r === 'every weekday') return new Set([1, 2, 3, 4, 5]);
  if (r === 'every weekend') return new Set([0, 6]);
  const m = r.match(/^every week on (.+)$/);
  if (!m) return null;
  const names = m[1]
    .split(/\s*,\s*|\s+and\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const days = names.map((n) =>
    DAY_NAMES.indexOf(n as (typeof DAY_NAMES)[number]),
  );
  return days.length && !days.includes(-1) ? new Set(days) : null;
}

export const HABIT_RULES =
  'every day, every weekday, every weekend, or every week on <days>, e.g. every week on Monday, Wednesday and Friday';

export const weekdayOf = (day: string) =>
  new Date(`${day}T00:00:00Z`).getUTCDay();

export const isHabitDue = (rule: string, day: string) =>
  habitDays(rule)?.has(weekdayOf(day)) ?? false;

export const habitKey = (text: string) =>
  text
    .replace(/\[\[[^\]]*\]\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export interface HabitDefinition {
  line: number;
  text: string;
  rule: string;
}

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const FENCE_LINE = /^\s*(```|~~~)/;
const ITEM = /^\s*[-*+]\s+(?!\[.\])(.+?)\s*🔁️?\s*(.+?)\s*$/u;

export function parseHabits(body: string): {
  habits: HabitDefinition[];
  invalid: HabitDefinition[];
} {
  const habits: HabitDefinition[] = [];
  const invalid: HabitDefinition[] = [];
  let fenced = false;
  let inHabits = false;
  body.split(/\r?\n/).forEach((raw, line) => {
    if (FENCE_LINE.test(raw)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    const h = raw.match(HEADING);
    if (h) {
      inHabits = h[2].trim().toLowerCase() === HABITS_HEADING.toLowerCase();
      return;
    }
    if (!inHabits) return;
    const m = raw.match(ITEM);
    if (!m) return;
    const def = { line, text: m[1].trim(), rule: m[2].trim() };
    (habitDays(def.rule) ? habits : invalid).push(def);
  });
  return { habits, invalid };
}

export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export const dayBefore = (day: string) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};
