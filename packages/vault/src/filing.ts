/**
 * Filing (ADR-KI-0058 Decisions 4, 8 and 9): bring a vault onto the five PARA folders,
 * capture into the inbox, file a note, archive a project. Every operation is a plan
 * first; `execute` applies a plan that has no errors and no collisions, and nothing is
 * ever moved onto an existing path. Note content is never edited here.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { link, mkdir, readdir, rename, rmdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, posix } from "node:path";
import { classify, COACH_ROOT, PARA_BUCKETS, PARA_FOLDERS, type ParaBucket } from "./para.js";
import { noteResolver } from "./graph.js";
import { listNotePaths, type VaultNote } from "./scan.js";

export const OLD_NOTES = posix.join(PARA_FOLDERS.archive, "old notes");

export type FilingAction =
  | { op: "rename"; from: string; to: string }
  | { op: "create"; to: string }
  | { op: "move"; from: string; to: string }
  | { op: "write"; to: string }
  | { op: "remove_empty"; from: string };

export interface FilingPlan {
  actions: FilingAction[];
  /** Targets that already exist; any collision blocks execution. */
  collisions: string[];
  errors: string[];
  /** Things the plan leaves alone or cannot fix, worth showing the user. */
  warnings: string[];
  /** Content for `write` actions, by target path. */
  contents?: Record<string, string>;
}

const empty = (): FilingPlan => ({ actions: [], collisions: [], errors: [], warnings: [] });
const CANONICAL = new Set<string>(Object.values(PARA_FOLDERS));
const ALIAS: Record<ParaBucket, RegExp> = {
  inbox: /^\d*[\s._-]*inbox$/i,
  projects: /^\d*[\s._-]*projects?$/i,
  areas: /^\d*[\s._-]*areas?$/i,
  resources: /^\d*[\s._-]*resources?$/i,
  archive: /^\d*[\s._-]*archives?$/i,
};
const isHidden = (name: string) => name.startsWith(".");
const dirsIn = (abs: string) => {
  try { return readdirSync(abs, { withFileTypes: true }).filter(e => e.isDirectory() && !isHidden(e.name)).map(e => e.name).sort(); } catch { return []; }
};
const bucketOfAlias = (name: string) => PARA_BUCKETS.find(b => ALIAS[b].test(name)) ?? null;

/** Where a pre-rename path lands after the plan's renames. */
function mapThrough(renames: { from: string; to: string }[], p: string): string {
  const r = renames.find(r => p === r.from || p.startsWith(`${r.from}/`));
  return r ? r.to + p.slice(r.from.length) : p;
}

/** Where a post-rename path is on disk today. */
function unmap(renames: { from: string; to: string }[], p: string): string {
  const r = renames.find(r => p === r.to || p.startsWith(`${r.to}/`));
  return r ? r.from + p.slice(r.to.length) : p;
}

/**
 * `init_vault`: rename folders that are PARA folders under another name (including the
 * five nested in a `PARA/` folder), create the missing ones, then move every note
 * outside them into `4.Archive/old notes/`, keeping its relative path.
 */
export async function planInit(root: string): Promise<FilingPlan> {
  const plan = empty();
  const top = dirsIn(root).filter(n => n !== COACH_ROOT);
  const candidates = new Map<ParaBucket, string[]>();
  const consider = (rel: string, name: string) => {
    const b = bucketOfAlias(name);
    if (b && !existsSync(join(root, PARA_FOLDERS[b]))) candidates.set(b, [...(candidates.get(b) ?? []), rel]);
  };
  for (const name of top) {
    if (CANONICAL.has(name)) continue;
    if (name.toLowerCase() === "para") for (const child of dirsIn(join(root, name))) consider(posix.join(name, child), child);
    else consider(name, name);
  }
  const renames: { from: string; to: string }[] = [];
  for (const b of PARA_BUCKETS) {
    const found = candidates.get(b) ?? [];
    if (found.length > 1) plan.errors.push(`more than one folder could be ${PARA_FOLDERS[b]}: ${found.join(", ")}; rename one by hand`);
    else if (found.length === 1) renames.push({ from: found[0], to: PARA_FOLDERS[b] });
  }
  for (const r of renames) plan.actions.push({ op: "rename", ...r });
  for (const b of PARA_BUCKETS) {
    const folder = PARA_FOLDERS[b];
    if (!existsSync(join(root, folder)) && !renames.some(r => r.to === folder)) plan.actions.push({ op: "create", to: folder });
  }

  const notes = (await listNotePaths(root)).map(p => ({ from: p, after: mapThrough(renames, p) }));
  const afterSet = new Set(notes.map(n => n.after));
  const moving = notes.filter(n => classify(n.after).bucket === null);
  for (const n of moving) {
    const to = posix.join(OLD_NOTES, n.after);
    if (afterSet.has(to) || existsSync(join(root, unmap(renames, to)))) plan.collisions.push(to);
    else plan.actions.push({ op: "move", from: n.after, to });
  }

  // Top-level folders that hold nothing but the notes being moved are removed once empty;
  // anything else stays where it is and is named.
  const movingSet = new Set(moving.map(n => n.after));
  const stays: string[] = [];
  const walk = (rel: string): boolean => {
    let onlyNotes = true;
    for (const e of readdirSync(join(root, unmap(renames, rel)), { withFileTypes: true })) {
      const child = posix.join(rel, e.name);
      if (e.name === ".DS_Store" || renames.some(r => r.from === child)) continue;
      if (e.isDirectory() && !isHidden(e.name)) onlyNotes = walk(child) && onlyNotes;
      else if (!movingSet.has(child)) { stays.push(child); onlyNotes = false; }
    }
    return onlyNotes;
  };
  for (const name of dirsIn(root).filter(n => n !== COACH_ROOT && !CANONICAL.has(n))) {
    if (renames.some(r => r.from === name)) continue;
    if (walk(name)) plan.actions.push({ op: "remove_empty", from: name });
  }
  for (const e of readdirSync(root, { withFileTypes: true })) {
    if (e.isFile() && !isHidden(e.name) && !e.name.endsWith(".md")) stays.push(e.name);
  }
  if (stays.length) plan.warnings.push(`left in place (not notes): ${stays.join(", ")}`);
  return plan;
}

const UNSAFE = /[\\/:*?"<>|#^[\]]/g;

/** A file or folder name Obsidian accepts, or null when nothing usable is left. */
export function safeName(name: string): string | null {
  const s = name.replace(UNSAFE, "-").replace(/\s+/g, " ").trim().replace(/^\.+/, "");
  return /[^\s-]/.test(s) ? s : null;
}

/** `capture`: a new note in `0.Inbox`, named from its title. */
export function planCapture(root: string, title: string, body: string): FilingPlan {
  const plan = empty();
  const name = safeName(title);
  if (!name) { plan.errors.push("title is empty once characters Obsidian forbids in file names are removed"); return plan; }
  const to = posix.join(PARA_FOLDERS.inbox, `${name}.md`);
  if (!existsSync(join(root, PARA_FOLDERS.inbox))) plan.actions.push({ op: "create", to: PARA_FOLDERS.inbox });
  if (existsSync(join(root, to))) plan.collisions.push(to);
  else plan.actions.push({ op: "write", to });
  plan.contents = { [to]: body.endsWith("\n") ? body : `${body}\n` };
  return plan;
}

/** Relative markdown links that a move would break, in the note and pointing at it. */
function brokenByMove(notes: VaultNote[], from: string, to: string): string[] {
  const before = noteResolver(notes);
  const after = noteResolver(notes, { from, to });
  const out: string[] = [];
  for (const n of notes) {
    for (const l of n.links.filter(l => l.kind === "markdown")) {
      const was = before.resolve(n.path, l);
      if (!was || (n.path !== from && was !== from)) continue;
      const now = after.resolve(n.path === from ? to : n.path, l);
      if (now !== (was === from ? to : was)) out.push(`${n.path} → ${l.target}`);
    }
  }
  return out;
}

/** `file_note`: move one note into a folder under one of the five PARA folders. */
export function planFileNote(root: string, notes: VaultNote[], path: string, toFolder: string): FilingPlan {
  const plan = empty();
  const note = notes.find(n => n.path === path);
  if (!note) { plan.errors.push(`no note ${path}`); return plan; }
  const folder = posix.normalize(toFolder.replace(/\\/g, "/")).replace(/^\/+|\/+$/g, "");
  const parts = folder.split("/");
  if (!CANONICAL.has(parts[0]) || parts.some(p => p === ".." || isHidden(p))) {
    plan.errors.push(`${toFolder} is not a folder under ${Object.values(PARA_FOLDERS).join(", ")}`);
    return plan;
  }
  const to = posix.join(folder, posix.basename(path));
  if (to === path) { plan.errors.push(`${path} is already in ${folder}`); return plan; }
  if (!existsSync(join(root, folder))) plan.actions.push({ op: "create", to: folder });
  if (existsSync(join(root, to))) plan.collisions.push(to);
  else plan.actions.push({ op: "move", from: path, to });
  const broken = brokenByMove(notes, path, to);
  if (broken.length) plan.warnings.push(`relative markdown links that will no longer resolve: ${broken.join("; ")}`);
  return plan;
}

/** `archive_project`: move one project folder whole into `4.Archive/`. */
export function planArchiveProject(root: string, project: string): FilingPlan {
  const plan = empty();
  if (!project || project.includes("/") || project.includes("\\") || isHidden(project) || project === "..") {
    plan.errors.push(`${project} is not a project folder name`);
    return plan;
  }
  const from = posix.join(PARA_FOLDERS.projects, project);
  const abs = join(root, from);
  if (!existsSync(abs) || !statSync(abs).isDirectory()) { plan.errors.push(`no project folder ${from}`); return plan; }
  const to = posix.join(PARA_FOLDERS.archive, project);
  if (!existsSync(join(root, PARA_FOLDERS.archive))) plan.actions.push({ op: "create", to: PARA_FOLDERS.archive });
  if (existsSync(join(root, to))) plan.collisions.push(to);
  else plan.actions.push({ op: "move", from, to });
  return plan;
}

/** Move a file without ever replacing one: link fails if the target exists. */
async function moveFileNoClobber(src: string, dst: string): Promise<void> {
  await mkdir(dirname(dst), { recursive: true });
  await link(src, dst);
  await unlink(src);
}

async function moveDirNoClobber(src: string, dst: string): Promise<void> {
  if (existsSync(dst)) throw new Error(`${dst} appeared since the preview`);
  await mkdir(dirname(dst), { recursive: true });
  await rename(src, dst);
}

async function removeIfEmpty(abs: string): Promise<void> {
  for (const e of await readdir(abs, { withFileTypes: true })) {
    if (e.isDirectory()) await removeIfEmpty(join(abs, e.name));
    else if (e.name === ".DS_Store") await unlink(join(abs, e.name));
  }
  try { await rmdir(abs); } catch { /* not empty: something was added since the preview; leave it */ }
}

export async function executeFiling(root: string, plan: FilingPlan): Promise<void> {
  if (plan.errors.length || plan.collisions.length) throw new Error("refusing to apply a plan with errors or collisions");
  for (const a of plan.actions) {
    switch (a.op) {
      case "rename": await moveDirNoClobber(join(root, a.from), join(root, a.to)); break;
      case "create": await mkdir(join(root, a.to), { recursive: true }); break;
      case "move": {
        const src = join(root, a.from);
        if (statSync(src).isDirectory()) await moveDirNoClobber(src, join(root, a.to));
        else await moveFileNoClobber(src, join(root, a.to));
        break;
      }
      case "write": await writeFile(join(root, a.to), plan.contents![a.to], { flag: "wx" }); break;
      case "remove_empty": await removeIfEmpty(join(root, a.from)); break;
    }
  }
}
