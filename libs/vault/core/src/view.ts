import { readFileSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { join, posix } from 'node:path';
import { COACH_ROOT, type ParaBucket } from './para.js';
import { buildVaultGraph } from './graph.js';
import type { Mastery } from './mastery.js';
import type { Vault } from './vault.js';
import type { VaultNote } from './scan.js';
import { RAW_TEXT } from './convert.js';
import {
  bookProgress,
  citations,
  type MarkOp,
  type ChapterState,
  type PageMark,
  type ReadingStage,
} from './distill.js';
import {
  compareStructure,
  drawingErrors,
  drawingText,
  type DrawnStructure,
} from './climb.js';
import { MAX_SKETCH_BYTES } from './climb-writes.js';
import type { AssertionMark } from './sessions.js';

export const GRAPH_FILE = posix.join(COACH_ROOT, 'graph.json');

export interface VaultViewGraph {
  generatedAt: string;
  vaultName: string;
  nodes: {
    id: string;
    title: string;

    label: string;
    bucket: ParaBucket | null;
    container: string | null;
    raw: boolean;
    rawRole: 'index' | 'chapter' | null;

    concept: boolean;

    book: string | null;

    chapterCount: number | null;

    stage: ReadingStage | null;

    readOn: string | null;
    chaptersComplete: number | null;

    notesFrom: string[] | null;
    conceptsFrom: string[] | null;

    distill: {
      state: ChapterState;
      summary: boolean;
      pages: {
        page: number;
        mark: PageMark;
        summary: boolean;
        empty: boolean;
      }[];
    } | null;
    mastery: Mastery;
    nextReview: string | null;
  }[];
  edges: { source: string; target: string; kind: 'wikilink' | 'markdown' }[];
  unresolved: number;
}

const LABEL_MAX = 28;
const clip = (s: string) =>
  s.length > LABEL_MAX ? `${s.slice(0, LABEL_MAX - 1).trimEnd()}…` : s;

export function shortLabel(
  note: Pick<VaultNote, 'title' | 'rawRole' | 'frontmatter'>,
): string {
  if (note.rawRole !== 'chapter') return clip(note.title);
  const title = note.title.replace(/\s*\(\d+ of \d+\)$/, '');
  const m = title.match(/^chapter\s+(\d+)\s*[:.\-–—]\s*(.*)$/i);
  const name = (m ? m[2] : title).split(/\s*[:—–]\s*/)[0];
  const section =
    typeof note.frontmatter.section === 'string'
      ? note.frontmatter.section.match(/^(\d+) of (\d+)$/)
      : null;
  const suffix = section ? ` (${section[1]}/${section[2]})` : '';
  return clip(`${m ? `${m[1]}. ` : ''}${name}`) + suffix;
}

export async function writeViewGraph(
  vault: Vault,
  now: Date = new Date(),
): Promise<VaultViewGraph> {
  const { notes } = await vault.notesWithHistory();
  const history = new Map(notes.map((n) => [n.path, n.history]));
  const byPath = new Map(notes.map((n) => [n.path, n]));
  const g = buildVaultGraph(notes);
  const books = new Map(bookProgress(notes).map((b) => [b.index, b]));
  const chapters = new Map(
    [...books.values()].flatMap((b) =>
      b.chapters.map((c) => [c.path, c] as const),
    ),
  );
  const cited = citations(notes);
  const graph: VaultViewGraph = {
    generatedAt: now.toISOString(),
    vaultName: posix.basename(vault.root.split('\\').join('/')),
    nodes: g.nodes.map((n) => {
      const note = byPath.get(n.id)!;
      const book =
        note.rawRole === 'chapter'
          ? posix.join(posix.dirname(posix.dirname(n.id)), RAW_TEXT)
          : null;
      return {
        id: n.id,
        title: n.title,
        label: shortLabel(note),
        bucket: n.bucket,
        container: n.container,
        raw: n.raw,
        rawRole: note.rawRole,
        concept: note.concept,
        book: book && byPath.has(book) ? book : null,
        chapterCount:
          note.rawRole === 'index'
            ? notes.filter(
                (c) =>
                  c.rawRole === 'chapter' &&
                  posix.dirname(posix.dirname(c.path)) === posix.dirname(n.id),
              ).length
            : null,
        stage: books.get(n.id)?.stage ?? null,
        readOn: books.get(n.id)?.steps.readOn ?? null,
        chaptersComplete: books.get(n.id)?.steps.chaptersComplete ?? null,
        notesFrom:
          n.raw && note.rawRole !== 'chapter'
            ? (cited.get(n.id)?.notes ?? [])
            : null,
        conceptsFrom:
          n.raw && note.rawRole !== 'chapter'
            ? (cited.get(n.id)?.concepts ?? [])
            : null,
        distill: ((c) =>
          c ? { state: c.state, summary: c.summary, pages: c.pages } : null)(
          chapters.get(n.id),
        ),
        mastery: history.get(n.id)!.mastery,
        nextReview: history.get(n.id)!.nextReview,
      };
    }),
    edges: g.edges,
    unresolved: g.unresolved.length,
  };
  const abs = join(vault.root, GRAPH_FILE);
  await mkdir(join(vault.root, COACH_ROOT), { recursive: true });

  const tmp = `${abs}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tmp, `${JSON.stringify(graph, null, 2)}\n`);
  await rename(tmp, abs);
  return graph;
}

const ASSETS = new URL('../assets/', import.meta.url);
const asset = (name: string) => readFileSync(new URL(name, ASSETS));

const HEADERS = {
  'Content-Security-Policy':
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};

export interface BookPage {
  note: string;
  title: string;
  page: number;

  text: string;

  chapterSummary: string | null;
}

export async function bookPage(
  vault: Vault,
  path: string,
  page: number,
): Promise<BookPage | null> {
  return vault.pageText(path, page);
}

export interface NoteBody {
  note: string;
  title: string;

  text: string;
}

export async function noteBody(
  vault: Vault,
  path: string,
): Promise<NoteBody | null> {
  const note = await vault.note(path);
  return note ? { note: note.path, title: note.title, text: note.body } : null;
}

const MAX_BODY = 64 * 1024;

const MAX_SKETCH_BODY = Math.ceil(MAX_SKETCH_BYTES * 1.4) + 4096;

function readJson(
  req: IncomingMessage,
  max = MAX_BODY,
): Promise<Record<string, unknown> | null> {
  return new Promise((resolveBody) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size <= max) chunks.push(c);
    });
    req.on('end', () => {
      if (size > max) return resolveBody(null);
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
        resolveBody(v && typeof v === 'object' && !Array.isArray(v) ? v : null);
      } catch {
        resolveBody(null);
      }
    });
    req.on('error', () => resolveBody(null));
  });
}

export interface ViewServerOptions {
  token?: string;

  now?: () => Date;
}

const WRITES = new Set([
  '/api/mark',
  '/api/summary',
  '/api/structure',
  '/api/reveal',
  '/api/generate',
  '/api/sketch',
]);

function drawingOf(body: Record<string, unknown>): DrawnStructure {
  const groups = (Array.isArray(body.groups) ? body.groups : []).map((g) => {
    const r = (g ?? {}) as Record<string, unknown>;
    return {
      name: String(r.name ?? '').trim(),
      concepts: Array.isArray(r.concepts) ? r.concepts.map(String) : [],
    };
  });
  const buildsOn = (Array.isArray(body.builds_on) ? body.builds_on : []).map(
    (e) => {
      const r = (e ?? {}) as Record<string, unknown>;
      return {
        from: String(r.from ?? '').trim(),
        to: String(r.to ?? '').trim(),
      };
    },
  );
  return { groups, buildsOn };
}

interface PendingAttempt {
  book: string;
  structure: string;
  drawing: string;
  idk: boolean;
  attemptedAt: string;
  revealedAt: string;
}

export function createVaultViewServer(
  vault: Vault,
  opts: ViewServerOptions = {},
): Server {
  const token = opts.token ?? randomBytes(24).toString('hex');
  const clock = opts.now ?? (() => new Date());

  const pending = new Map<string, PendingAttempt>();
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const path = url.pathname;
    const send = (status: number, type: string, body: string | Buffer) => {
      res.writeHead(status, { ...HEADERS, 'Content-Type': type });
      res.end(body);
    };
    const json = (status: number, value: unknown) =>
      send(status, 'application/json; charset=utf-8', JSON.stringify(value));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    if (!hosts.has(String(req.headers.host ?? '')))
      return send(403, 'text/plain; charset=utf-8', 'Forbidden');
    try {
      if (req.method === 'POST' && WRITES.has(path)) {
        const origin = req.headers.origin;
        if (
          origin !== undefined &&
          !hosts.has(origin.replace(/^http:\/\//, ''))
        )
          return send(403, 'text/plain; charset=utf-8', 'Forbidden');
        if (req.headers['x-vault-token'] !== token)
          return send(403, 'text/plain; charset=utf-8', 'Forbidden');
        if (
          !String(req.headers['content-type'] ?? '').startsWith(
            'application/json',
          )
        )
          return send(415, 'text/plain; charset=utf-8', 'JSON only');
        const body = await readJson(
          req,
          path === '/api/sketch' ? MAX_SKETCH_BODY : MAX_BODY,
        );
        if (!body) return json(400, { error: 'a JSON object is required' });
        const execute = body.execute === true;
        if (path === '/api/structure') {
          const d = drawingOf(body);
          const target =
            typeof body.topic === 'string' && body.topic.trim()
              ? { topic: body.topic }
              : { book: String(body.book ?? '') };
          const r = await vault.writeStructure(
            { ...target, groups: d.groups, builds_on: d.buildsOn },
            execute,
            (body.versions ?? undefined) as Record<string, string> | undefined,
          );
          return json(r.errors.length ? 400 : 200, r);
        }
        if (path === '/api/reveal') {
          const book = String(body.topic ?? body.book ?? '');
          const d = drawingOf(body);
          const thin = body.idk === true ? [] : drawingErrors(d);
          if (thin.length) return json(400, { error: thin[0] });
          const attemptedAt = clock().toISOString();
          const structure = await vault.revealStructure(book);
          if (!structure)
            return json(404, {
              error: `${book} has no structure note yet; draw the structure first`,
            });
          let revealedAt = clock().toISOString();
          if (!(Date.parse(attemptedAt) < Date.parse(revealedAt)))
            revealedAt = new Date(Date.parse(attemptedAt) + 1).toISOString();
          const id = randomUUID();
          pending.set(id, {
            book,
            structure: structure.path,
            drawing: drawingText(d, structure.title),
            idk: body.idk === true,
            attemptedAt,
            revealedAt,
          });
          const { title, kind: _k, ...shown } = structure;
          return json(200, {
            id,
            attempted_at: attemptedAt,
            revealed_at: revealedAt,
            structure: shown,
            marks: compareStructure(
              d,
              {
                groups: structure.groups.map((g) => ({
                  name: g.name,
                  concepts: g.concepts.map((c) => c.path),
                })),
                buildsOn: structure.buildsOn,
              },
              title,
            ),
          });
        }
        if (path === '/api/generate') {
          const p = pending.get(String(body.id ?? ''));
          if (!p)
            return json(404, {
              error:
                'no drawing waiting for its marks; draw it and reveal again',
            });
          const marks = (Array.isArray(body.marks) ? body.marks : []).map(
            (m) => {
              const r = (m ?? {}) as Record<string, unknown>;
              return {
                assertion: String(r.assertion ?? ''),
                mark: r.mark as AssertionMark,
                ...(typeof r.correction === 'string' && r.correction.trim()
                  ? { correction: r.correction }
                  : {}),
              };
            },
          );
          const r = await vault.recordSession(
            {
              kind: 'generate',
              tier: 1,
              items: [
                {
                  note: p.structure,
                  challenge: `Draw the structure of ${p.book} from memory: its groups and what builds on what.`,
                  answer: p.drawing,
                  generate: {
                    attempted_at: p.attemptedAt,
                    revealed_at: p.revealedAt,
                    idk: p.idk,
                    marks,
                  },
                },
              ],
            },
            execute,
          );
          if (r.executed) pending.delete(String(body.id));
          const { changes: _c, record, ...shown } = r;
          return json(r.errors.length ? 400 : 200, {
            ...shown,
            session_id: record?.session_id ?? null,
          });
        }
        if (path === '/api/sketch') {
          const png = Buffer.from(
            String(body.png ?? '').replace(/^data:image\/png;base64,/, ''),
            'base64',
          );
          const r = await vault.saveSketch(
            String(body.target ?? ''),
            png,
            execute,
          );
          return json(r.errors.length ? 400 : 200, r);
        }
        const note = String(body.note ?? '');
        const result =
          path === '/api/mark'
            ? await vault.markPage(
                note,
                Number(body.page),
                Number(body.start),
                Number(body.end),
                body.mark as MarkOp,
                String(body.base ?? ''),
              )
            : await vault.setSummary(
                note,
                body.page === null || body.page === undefined
                  ? null
                  : Number(body.page),
                body.text as string,
                typeof body.base === 'string' ? body.base : undefined,
              );
        return result.ok
          ? json(200, { text: result.text })
          : json(result.status, {
              error: result.error,
              ...(result.text !== undefined ? { text: result.text } : {}),
            });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD')
        return send(405, 'text/plain; charset=utf-8', 'Method not allowed');
      if (path === '/' || path === '/index.html') {
        const page = asset('vault-view.html')
          .toString('utf-8')
          .replace(
            '</head>',
            `  <meta name="vault-token" content="${token}">\n</head>`,
          );
        return send(200, 'text/html; charset=utf-8', page);
      }
      if (path === '/vault-view.js')
        return send(
          200,
          'text/javascript; charset=utf-8',
          asset('vault-view.js'),
        );
      if (path === '/plans')
        return send(200, 'text/html; charset=utf-8', asset('plans-view.html'));
      if (path === '/climb') {
        const page = asset('climb-view.html')
          .toString('utf-8')
          .replace(
            '</head>',
            `  <meta name="vault-token" content="${token}">\n</head>`,
          );
        return send(200, 'text/html; charset=utf-8', page);
      }
      if (path === '/climb-view.js')
        return send(
          200,
          'text/javascript; charset=utf-8',
          asset('climb-view.js'),
        );
      if (path === '/climb-board/main.js')
        return send(
          200,
          'text/javascript; charset=utf-8',
          asset('climb-board/main.js'),
        );
      if (path === '/climb-board/styles.css')
        return send(
          200,
          'text/css; charset=utf-8',
          asset('climb-board/styles.css'),
        );
      if (path === '/climb.json')
        return json(200, {
          ...(await vault.climbView()),
          vaultName: posix.basename(vault.root.split('\\').join('/')),
        });
      if (path === '/structure.json') {
        const s = await vault.revealStructure(
          url.searchParams.get('topic') ?? url.searchParams.get('book') ?? '',
        );
        if (!s) return send(404, 'text/plain; charset=utf-8', 'Not found');
        const { title: _t, ...shown } = s;
        return json(200, shown);
      }
      if (path === '/sketch.png') {
        const png = await vault.sketch(url.searchParams.get('path') ?? '');
        return png
          ? send(200, 'image/png', png)
          : send(404, 'text/plain; charset=utf-8', 'Not found');
      }
      if (path === '/plans-view.js')
        return send(
          200,
          'text/javascript; charset=utf-8',
          asset('plans-view.js'),
        );
      if (path === '/plans.json') {
        const view = await vault.plansView(
          url.searchParams.get('span') ?? undefined,
          url.searchParams.get('by') ?? undefined,
        );
        return 'error' in view
          ? json(400, view)
          : json(200, {
              ...view,
              vaultName: posix.basename(vault.root.split('\\').join('/')),
            });
      }
      if (path === '/graph.json') return json(200, await writeViewGraph(vault));
      if (path === '/note.json') {
        const note = await noteBody(vault, url.searchParams.get('note') ?? '');
        return note
          ? json(200, note)
          : send(404, 'text/plain; charset=utf-8', 'Not found');
      }
      if (path === '/page.json') {
        const page = await bookPage(
          vault,
          url.searchParams.get('note') ?? '',
          Number(url.searchParams.get('page')),
        );
        return page
          ? json(200, page)
          : send(404, 'text/plain; charset=utf-8', 'Not found');
      }
      return send(404, 'text/plain; charset=utf-8', 'Not found');
    } catch (err) {
      return send(
        500,
        'text/plain; charset=utf-8',
        err instanceof Error ? err.message : String(err),
      );
    }
  });
  return server;
}

export function listenOnLoopback(
  server: Server,
  port: number,
): Promise<string> {
  return new Promise((resolveUrl, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      resolveUrl(
        `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : port}/`,
      );
    });
  });
}
