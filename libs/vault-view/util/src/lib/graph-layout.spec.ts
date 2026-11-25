import { describe, expect, it } from 'vitest';
import {
  boxAround,
  chapterRingOf,
  computeForceLayout,
  computePageRing,
  computeViewport,
  cubicEaseInOut,
  diamondPath,
  edgePathD,
  hexagonPath,
  interpolateView,
  pageRingRadius,
  placeBookChaptersAndReaders,
  viewForBox,
  zoomAroundPoint,
  type LayoutNodeInput,
} from './graph-layout.js';

function makeNode(
  id: string,
  overrides: Partial<LayoutNodeInput> = {},
): LayoutNodeInput {
  return {
    id,
    book: null,
    bucket: 'resources',
    project: false,
    workstream: false,
    workstreamStatus: null,
    plan: false,
    planLevel: null,
    raw: false,
    rawRole: null,
    concept: false,
    stage: null,
    distill: null,
    ...overrides,
  };
}

describe('graph-layout', () => {
  it('computes deterministic force positions for top-level nodes and preserves previous positions', () => {
    const nodes = [
      makeNode('book.md', { raw: true, rawRole: 'index' }),
      makeNode('ch1.md', { book: 'book.md', raw: true, rawRole: 'chapter' }),
      makeNode('note.md', { bucket: 'projects', project: true }),
    ];
    const edges = [{ source: 'note.md', target: 'ch1.md' }];
    const first = computeForceLayout(nodes, edges, 1200, 800);
    const second = computeForceLayout(nodes, edges, 1200, 800);

    expect(first.has('book.md')).toBe(true);
    expect(first.has('note.md')).toBe(true);
    expect(first.has('ch1.md')).toBe(false);
    expect(first.get('book.md')).toEqual(second.get('book.md'));

    const fixed = new Map([['note.md', { x: 42, y: 99 }]]);
    const kept = computeForceLayout(nodes, edges, 1200, 800, fixed);
    expect(kept.get('note.md')).toEqual({ x: 42, y: 99 });
  });

  it('places chapters on an elliptical ring and pushes nearby nodes out when expanded', () => {
    const book = makeNode('book.md', { raw: true, rawRole: 'index' });
    const ch1 = makeNode('ch1.md', {
      book: 'book.md',
      raw: true,
      rawRole: 'chapter',
    });
    const ch2 = makeNode('ch2.md', {
      book: 'book.md',
      raw: true,
      rawRole: 'chapter',
    });
    const bystander = makeNode('other.md');
    const reader = makeNode('reader.md');
    const home = new Map([
      ['book.md', { x: 500, y: 500 }],
      ['other.md', { x: 510, y: 505 }],
      ['reader.md', { x: 450, y: 500 }],
    ]);
    const chaptersByBook = new Map([['book.md', [ch1, ch2]]]);
    const readersByBook = new Map([['book.md', [reader]]]);

    const collapsed = placeBookChaptersAndReaders(
      [book, ch1, ch2, bystander, reader],
      home,
      chaptersByBook,
      readersByBook,
      new Set(),
    );
    expect(collapsed.get('other.md')).toEqual({ x: 510, y: 505 });
    expect(collapsed.get('reader.md')?.x).toBe(390);

    const expanded = placeBookChaptersAndReaders(
      [book, ch1, ch2, bystander, reader],
      home,
      chaptersByBook,
      readersByBook,
      new Set(['book.md']),
    );
    const { rx, ry } = chapterRingOf(2);
    expect(expanded.get('reader.md')?.x).toBeCloseTo(500 - (rx + 320), 5);
    const pushed = expanded.get('other.md');
    expect(pushed).toBeDefined();
    if (pushed) {
      const dist = Math.hypot(
        (pushed.x - 500) / (rx + 240),
        (pushed.y - 500) / (ry + 60),
      );
      expect(dist).toBeCloseTo(1, 5);
    }
  });

  it('computes page ring coordinates around chapter anchor', () => {
    const ring = computePageRing({ x: 200, y: 100, angle: 0 }, [
      { page: 1, mark: 'none', summary: false, empty: false },
      { page: 2, mark: 'bold', summary: true, empty: false },
    ]);
    expect(ring.r).toBeCloseTo(pageRingRadius(2), 5);
    expect(ring.cx).toBeCloseTo(200 - (ring.r + 22), 5);
    expect(ring.cy).toBeCloseTo(100, 5);
    expect(ring.pages).toHaveLength(2);
  });

  it('computes viewport, box framing, zoom around point, and view interpolation', () => {
    const vp = computeViewport(1400, 900, true);
    expect(vp.x0).toBe(304);
    expect(vp.x1).toBe(976);

    const box = boxAround(
      [
        { x: 0, y: 0 },
        { x: 200, y: 100 },
      ],
      50,
    );
    expect(box).toEqual({ x0: -50, x1: 250, y0: -50, y1: 150 });

    const framed = viewForBox(box, vp, 1.6);
    expect(framed.k).toBe(1.6);

    const zoomed = zoomAroundPoint({ x: 100, y: 50, k: 1 }, 300, 200, 2);
    expect(zoomed.k).toBe(2);
    expect(zoomed.x).toBe(-100);
    expect(zoomed.y).toBe(-100);

    expect(cubicEaseInOut(0)).toBe(0);
    expect(cubicEaseInOut(0.5)).toBe(0.5);
    expect(cubicEaseInOut(1)).toBe(1);
    expect(
      interpolateView({ x: 0, y: 0, k: 1 }, { x: 100, y: 200, k: 2 }, 0.5),
    ).toEqual({ x: 50, y: 100, k: 1.5 });
  });

  it('builds straight, curved, diamond, and hexagon SVG paths', () => {
    expect(edgePathD({ x: 0, y: 0 }, { x: 10, y: 20 }, false, 'a', 'b')).toBe(
      'M0,0L10,20',
    );
    expect(
      edgePathD({ x: 0, y: 0 }, { x: 100, y: 0 }, true, 'a', 'b'),
    ).toContain('Q50,14');
    expect(diamondPath(10)).toBe('M0,-10L10,0L0,10L-10,0Z');
    expect(hexagonPath(10)).toContain('M0,-10L8.66,-5.00');
  });
});
