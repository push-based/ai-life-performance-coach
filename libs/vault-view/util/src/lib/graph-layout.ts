import { bucketOfNode, GRAPH_BUCKETS, type GraphNodeLike } from './graph.js';

export interface GraphPoint {
  x: number;
  y: number;
}

export interface GraphPositionedPoint extends GraphPoint {
  angle?: number;
}

export interface GraphBox {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface GraphViewport {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  w: number;
  h: number;
}

export interface GraphCameraView {
  x: number;
  y: number;
  k: number;
}

export interface LayoutNodeInput extends GraphNodeLike {
  id: string;
  book: string | null;
}

export interface LayoutEdgeInput {
  source: string;
  target: string;
}

export interface PageRingInput {
  page: number;
  mark: string;
  summary: boolean;
  empty: boolean;
}

export interface PositionedPage extends PageRingInput {
  x: number;
  y: number;
}

export interface PageRingLayout {
  cx: number;
  cy: number;
  r: number;
  pages: PositionedPage[];
}

interface SimNode {
  id: string;
  bucket: string;
  isBook: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function createSeededRng(seed = 1337): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function computeForceLayout(
  nodes: readonly LayoutNodeInput[],
  edges: readonly LayoutEdgeInput[],
  width: number,
  height: number,
  previous?: ReadonlyMap<string, GraphPoint>,
  rng: () => number = createSeededRng(),
): Map<string, GraphPoint> {
  const w = Math.max(320, width);
  const h = Math.max(240, height);
  const anchors = new Map<string, GraphPoint>();
  GRAPH_BUCKETS.forEach(([bucket], i) => {
    const a = (i / GRAPH_BUCKETS.length) * Math.PI * 2 - Math.PI / 2;
    anchors.set(bucket, {
      x: w / 2 + Math.cos(a) * w * 0.28,
      y: h / 2 + Math.sin(a) * h * 0.28,
    });
  });

  const bookOfId = new Map<string, string>();
  const simNodes: SimNode[] = [];
  const simById = new Map<string, SimNode>();

  for (const n of nodes) {
    if (n.book) {
      bookOfId.set(n.id, n.book);
      continue;
    }
    const bucket = bucketOfNode(n);
    const anchor = anchors.get(bucket) ?? { x: w / 2, y: h / 2 };
    const sim: SimNode = {
      id: n.id,
      bucket,
      isBook: n.rawRole === 'index',
      x: anchor.x + (rng() - 0.5) * 80,
      y: anchor.y + (rng() - 0.5) * 80,
      vx: 0,
      vy: 0,
    };
    simNodes.push(sim);
    simById.set(n.id, sim);
  }

  const topOf = (id: string): SimNode | undefined =>
    simById.get(bookOfId.get(id) ?? id);

  const springs: [SimNode, SimNode][] = [];
  for (const e of edges) {
    const a = topOf(e.source);
    const b = topOf(e.target);
    if (a && b && a !== b) springs.push([a, b]);
  }

  for (let tick = 0, alpha = 1; tick < 300; tick++, alpha *= 0.985) {
    for (let i = 0; i < simNodes.length; i++) {
      const a = simNodes[i];
      for (let j = i + 1; j < simNodes.length; j++) {
        const b = simNodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = rng() || 0.5;
          dy = rng() || 0.5;
          d2 = 1;
        }
        if (d2 > 40000) continue;
        const repulse = a.isBook || b.isBook ? 1400 : 600;
        const f = (repulse / d2) * alpha;
        a.vx += dx * f;
        a.vy += dy * f;
        b.vx -= dx * f;
        b.vy -= dy * f;
      }
    }

    for (const [a, b] of springs) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = ((d - 60) / d) * 0.05 * alpha;
      a.vx += dx * f;
      a.vy += dy * f;
      b.vx -= dx * f;
      b.vy -= dy * f;
    }

    for (const n of simNodes) {
      const anchor = anchors.get(n.bucket) ?? { x: w / 2, y: h / 2 };
      n.vx += (anchor.x - n.x) * 0.012 * alpha;
      n.vy += (anchor.y - n.y) * 0.012 * alpha;
      n.x += n.vx;
      n.y += n.vy;
      n.vx *= 0.6;
      n.vy *= 0.6;
    }
  }

  const out = new Map<string, GraphPoint>();
  for (const n of simNodes) {
    const prev = previous?.get(n.id);
    out.set(n.id, prev ? { x: prev.x, y: prev.y } : { x: n.x, y: n.y });
  }
  return out;
}

export function chapterRingOf(count: number): { rx: number; ry: number } {
  const ry = 50 + count * 6;
  return { rx: ry * 1.25, ry };
}

export function pageRingRadius(count: number): number {
  return 18 + count * 3.1;
}

export function placeBookChaptersAndReaders(
  nodes: readonly LayoutNodeInput[],
  homePositions: ReadonlyMap<string, GraphPoint>,
  chaptersByBook: ReadonlyMap<string, readonly { id: string }[]>,
  readersByBook: ReadonlyMap<string, readonly { id: string }[]>,
  expandedBooks: ReadonlySet<string>,
): Map<string, GraphPositionedPoint> {
  const pos = new Map<string, GraphPositionedPoint>();
  for (const n of nodes) {
    if (n.book) continue;
    const h = homePositions.get(n.id);
    if (h) pos.set(n.id, { x: h.x, y: h.y });
  }

  for (const [bookId, chapters] of chaptersByBook) {
    const b = pos.get(bookId);
    if (!b) continue;
    const { rx, ry } = chapterRingOf(chapters.length);
    chapters.forEach((c, i) => {
      const a = ((i + 0.5) / chapters.length) * Math.PI * 2 - Math.PI / 2;
      pos.set(c.id, {
        x: b.x + Math.cos(a) * rx,
        y: b.y + Math.sin(a) * ry,
        angle: a,
      });
    });

    if (!expandedBooks.has(bookId)) continue;
    const ox = rx + 240;
    const oy = ry + 60;
    const readerIds = new Set(
      (readersByBook.get(bookId) ?? []).map((r) => r.id),
    );
    for (const n of nodes) {
      if (n.book || n.id === bookId || readerIds.has(n.id)) continue;
      const p = pos.get(n.id);
      if (!p) continue;
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const e = Math.hypot(dx / ox, dy / oy);
      if (e >= 1) continue;
      const a = e < 1e-6 ? -Math.PI / 2 : Math.atan2(dy / oy, dx / ox);
      p.x = b.x + Math.cos(a) * ox;
      p.y = b.y + Math.sin(a) * oy;
    }
  }

  for (const [bookId, readers] of readersByBook) {
    const b = pos.get(bookId);
    if (!b) continue;
    const dx = expandedBooks.has(bookId)
      ? chapterRingOf((chaptersByBook.get(bookId) ?? []).length).rx + 320
      : 110;
    readers.forEach((r, i) => {
      const p = pos.get(r.id);
      if (!p) return;
      p.x = b.x - dx;
      p.y = b.y + (i - (readers.length - 1) / 2) * 48;
    });
  }

  return pos;
}

export function computePageRing(
  chapterPos: GraphPositionedPoint,
  pages: readonly PageRingInput[],
): PageRingLayout {
  const r = pageRingRadius(pages.length);
  const a = chapterPos.angle ?? 0;
  const cx = chapterPos.x - Math.cos(a) * (r + 22);
  const cy = chapterPos.y - Math.sin(a) * (r + 22);
  const positioned = pages.map((p, i) => {
    const t = a + ((i + 0.5) / Math.max(1, pages.length)) * Math.PI * 2;
    return {
      ...p,
      x: cx + Math.cos(t) * r,
      y: cy + Math.sin(t) * r,
    };
  });
  return { cx, cy, r, pages: positioned };
}

export function boxAround(points: readonly GraphPoint[], pad = 0): GraphBox {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (!Number.isFinite(minX)) {
    return { x0: -pad, x1: pad, y0: -pad, y1: pad };
  }
  return {
    x0: minX - pad,
    x1: maxX + pad,
    y0: minY - pad,
    y1: maxY + pad,
  };
}

export function computeViewport(
  w: number,
  h: number,
  filtersOpen: boolean,
): GraphViewport {
  if (w <= 960) {
    return { x0: 8, x1: Math.max(16, w - 8), y0: 76, y1: h * 0.45, w, h };
  }
  return {
    x0: filtersOpen ? 304 : 24,
    x1: Math.max(filtersOpen ? 320 : 40, w - 424),
    y0: 92,
    y1: Math.max(120, h - 64),
    w,
    h,
  };
}

export function clampZoom(k: number, minK = 0.12, maxK = 5): number {
  return Math.max(minK, Math.min(maxK, k));
}

export function viewForBox(
  box: GraphBox,
  vp: GraphViewport,
  maxK = 1.6,
): GraphCameraView {
  const bw = Math.max(1, box.x1 - box.x0);
  const bh = Math.max(1, box.y1 - box.y0);
  const k = clampZoom(
    Math.min(maxK, (vp.x1 - vp.x0) / bw, (vp.y1 - vp.y0) / bh),
    0.12,
    maxK,
  );
  return {
    k,
    x: (vp.x0 + vp.x1) / 2 - ((box.x0 + box.x1) / 2) * k,
    y: (vp.y0 + vp.y1) / 2 - ((box.y0 + box.y1) / 2) * k,
  };
}

export function zoomAroundPoint(
  view: GraphCameraView,
  mx: number,
  my: number,
  factor: number,
  minK = 0.12,
  maxK = 5,
): GraphCameraView {
  const k = clampZoom(view.k * factor, minK, maxK);
  return {
    k,
    x: mx - ((mx - view.x) * k) / view.k,
    y: my - ((my - view.y) * k) / view.k,
  };
}

export function cubicEaseInOut(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

export function interpolateView(
  from: GraphCameraView,
  to: GraphCameraView,
  t: number,
): GraphCameraView {
  const e = cubicEaseInOut(t);
  return {
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e,
    k: from.k + (to.k - from.k) * e,
  };
}

export function edgePathD(
  a: GraphPoint,
  b: GraphPoint,
  curved: boolean,
  aId: string,
  bId: string,
): string {
  if (!curved) return `M${a.x},${a.y}L${b.x},${b.y}`;
  const [p, q] = aId < bId ? [a, b] : [b, a];
  const mx = (p.x + q.x) / 2;
  const my = (p.y + q.y) / 2;
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  return `M${p.x},${p.y}Q${mx - dy * 0.14},${my + dx * 0.14} ${q.x},${q.y}`;
}

export function diamondPath(k: number): string {
  return `M0,${-k}L${k},0L0,${k}L${-k},0Z`;
}

export function hexagonPath(k: number): string {
  const dx = (k * 0.866).toFixed(2);
  const dy = (k * 0.5).toFixed(2);
  return `M0,${-k}L${dx},-${dy}L${dx},${dy}L0,${k}L-${dx},${dy}L-${dx},-${dy}Z`;
}
