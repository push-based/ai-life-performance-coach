import {
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  GraphStore,
  type GraphNodeDto,
} from '@ai-coach/vault-view-data-access';
import {
  boxAround,
  chapterFillOf,
  chapterRingOf,
  computeForceLayout,
  computePageRing,
  computeViewport,
  diamondPath,
  edgePathD,
  fillOfNode,
  GRAPH_MARK_FILL,
  GRAPH_MASTERY_RING,
  hexagonPath,
  interpolateView,
  placeBookChaptersAndReaders,
  viewForBox,
  zoomAroundPoint,
  type GraphCameraView,
  type GraphPoint,
  type GraphPositionedPoint,
} from '@ai-coach/vault-view-util';

interface RenderedEdge {
  key: string;
  aId: string;
  bId: string;
  d: string;
  spoke: boolean;
  read: boolean;
  reading: boolean;
  dim: boolean;
  stroke: string | null;
}

interface RenderedNode {
  node: GraphNodeDto;
  x: number;
  y: number;
  r: number;
  isBook: boolean;
  selected: boolean;
  hit: boolean;
  dim: boolean;
  fill: string;
  stroke: string;
  strokeWidth: number;
  masteryRingColor: string | null;
  masteryDashed: boolean;
  bookTotal: number;
  bookComplete: number;
  bookProgress: number;
  bookRingR: number;
  bookCircumference: number;
  bookDoneArc: number;
  bookMidArc: number;
  labelText: string;
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'middle' | 'end';
  labelQuiet: boolean;
  labelFontSize: string;
  titleTooltip: string;
}

interface RenderedPageDot {
  chapterId: string;
  page: number;
  x: number;
  y: number;
  mark: string;
  summary: boolean;
  empty: boolean;
  selected: boolean;
  fill: string;
  stroke: string;
  showLabel: boolean;
  labelX: number;
  labelY: number;
  labelAnchor: 'start' | 'middle' | 'end';
  labelFontSize: string;
  tooltip: string;
}

interface RenderedPageRing {
  chapterId: string;
  cx: number;
  cy: number;
  r: number;
  spokeD: string;
  pages: RenderedPageDot[];
}

interface DragState {
  startX: number;
  startY: number;
  viewX: number;
  viewY: number;
  moved: boolean;
}

@Component({
  selector: 'vault-graph-canvas',
  host: {
    '(window:pointermove)': 'onPointerMove($event)',
    '(window:pointerup)': 'onPointerUp()',
    '(window:resize)': 'onResize()',
  },
  template: `
    <div class="canvas-wrap">
      <svg
        #svgEl
        class="vault-graph-svg"
        [class.dragging]="isDragging()"
        role="img"
        aria-label="Link graph of the vault's notes"
        (pointerdown)="onPointerDown($event)"
        (wheel)="onWheel($event)"
        (click)="onBackgroundClick()"
      >
        <defs>
          <filter
            id="vault-glow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g
          [attr.transform]="cameraTransform()"
          [class.focusing]="hoveredId() !== null"
        >
          <g>
            @for (e of renderedEdges(); track e.key) {
              <path
                class="edge"
                [class.spoke]="e.spoke"
                [class.read]="e.read"
                [class.reading]="e.reading"
                [class.dim]="e.dim"
                [class.lit]="isEdgeLit(e)"
                [attr.d]="e.d"
                [style.stroke]="e.stroke"
              />
            }
          </g>

          <g>
            @for (ring of renderedPageRings(); track ring.chapterId) {
              <circle
                class="page-ring"
                [attr.cx]="ring.cx"
                [attr.cy]="ring.cy"
                [attr.r]="ring.r"
              />
              <path class="edge spoke" [attr.d]="ring.spokeD" />
              @for (p of ring.pages; track p.page) {
                <g
                  class="node"
                  [attr.transform]="'translate(' + p.x + ',' + p.y + ')'"
                  tabindex="0"
                  role="button"
                  [attr.aria-label]="'Page ' + p.page"
                  (click)="onPageClick($event, p.chapterId, p.page)"
                  (keydown.enter)="onPageClick($event, p.chapterId, p.page)"
                >
                  <title>{{ p.tooltip }}</title>
                  <circle r="9" fill="transparent" />
                  @if (p.selected) {
                    <circle
                      r="13"
                      fill="none"
                      stroke="var(--accent)"
                      stroke-width="2"
                      class="pulse"
                    />
                  }
                  @if (p.summary) {
                    <circle
                      r="9"
                      fill="none"
                      stroke="var(--text)"
                      stroke-width="1.6"
                    />
                  }
                  <circle
                    class="shape"
                    [attr.r]="p.selected ? 6.5 : 5.5"
                    [attr.fill]="p.fill"
                    [attr.stroke]="p.stroke"
                    [attr.stroke-width]="p.selected ? 2 : 1.2"
                    [attr.stroke-dasharray]="p.empty ? '2 2' : null"
                    [attr.filter]="p.selected ? 'url(#vault-glow)' : null"
                  />
                  @if (p.showLabel) {
                    <text
                      class="label page"
                      [attr.x]="p.labelX"
                      [attr.y]="p.labelY"
                      [attr.text-anchor]="p.labelAnchor"
                      [style.font-size]="p.labelFontSize"
                    >
                      {{ p.page }}
                    </text>
                  }
                </g>
              }
            }
          </g>

          <g>
            @for (item of renderedNodes(); track item.node.id) {
              <g
                class="node"
                [class.dim]="item.dim"
                [class.lit]="isNodeLit(item.node.id)"
                [attr.transform]="'translate(' + item.x + ',' + item.y + ')'"
                tabindex="0"
                role="button"
                [attr.aria-label]="item.node.title"
                (click)="onNodeClick($event, item.node)"
                (keydown.enter)="onNodeKeydown($event, item.node)"
                (keydown.space)="onNodeKeydown($event, item.node)"
                (mouseenter)="onNodeHover(item.node.id)"
                (mouseleave)="onNodeHover(null)"
              >
                <title>{{ item.titleTooltip }}</title>
                <circle [attr.r]="item.r + 10" fill="transparent" />

                @if (item.selected) {
                  <circle
                    [attr.r]="item.r + (item.isBook ? 16 : 11)"
                    fill="none"
                    stroke="var(--accent)"
                    stroke-width="2"
                    class="pulse"
                  />
                }

                @if (item.isBook) {
                  <circle
                    [attr.r]="item.bookRingR + 9"
                    [attr.fill]="item.fill"
                    opacity="0.1"
                  />
                  <circle
                    [attr.r]="item.bookRingR"
                    fill="none"
                    stroke="var(--line-strong)"
                    stroke-width="4"
                  />
                  @if (item.bookMidArc > 0) {
                    <circle
                      [attr.r]="item.bookRingR"
                      fill="none"
                      stroke="var(--bold)"
                      stroke-width="4"
                      [attr.stroke-dasharray]="
                        item.bookDoneArc +
                        item.bookMidArc +
                        ' ' +
                        item.bookCircumference
                      "
                      transform="rotate(-90)"
                      stroke-linecap="round"
                    />
                  }
                  @if (item.bookDoneArc > 0) {
                    <circle
                      [attr.r]="item.bookRingR"
                      fill="none"
                      stroke="var(--complete)"
                      stroke-width="4"
                      [attr.stroke-dasharray]="
                        item.bookDoneArc + ' ' + item.bookCircumference
                      "
                      transform="rotate(-90)"
                      stroke-linecap="round"
                    />
                  }
                  <rect
                    class="shape"
                    [attr.x]="-item.r + 3"
                    [attr.y]="-item.r + 3"
                    [attr.width]="2 * item.r - 6"
                    [attr.height]="2 * item.r - 6"
                    rx="6"
                    [attr.fill]="item.fill"
                    [attr.stroke]="item.stroke"
                    [attr.stroke-width]="item.strokeWidth"
                    [attr.filter]="item.selected ? 'url(#vault-glow)' : null"
                  />
                  <path
                    d="M0,-5.5V6.5M-6,-5Q-3,-6.5 0,-5.5Q3,-6.5 6,-5V6Q3,5 0,6.5Q-3,5 -6,6Z"
                    fill="none"
                    stroke="var(--halo)"
                    stroke-width="1.4"
                    stroke-linejoin="round"
                    opacity="0.85"
                  />
                } @else if (item.node.raw) {
                  <rect
                    class="shape"
                    [attr.x]="-item.r"
                    [attr.y]="-item.r"
                    [attr.width]="2 * item.r"
                    [attr.height]="2 * item.r"
                    [attr.rx]="item.node.book ? 3 : 2.5"
                    [attr.fill]="item.fill"
                    [attr.stroke]="item.stroke"
                    [attr.stroke-width]="item.strokeWidth"
                    [attr.filter]="item.selected ? 'url(#vault-glow)' : null"
                  />
                } @else if (item.node.concept) {
                  @if (item.masteryRingColor) {
                    <path
                      [attr.d]="diamond(item.r + 9)"
                      fill="none"
                      [attr.stroke]="item.masteryRingColor"
                      stroke-width="2.5"
                      [attr.stroke-dasharray]="
                        item.masteryDashed ? '3 2.5' : null
                      "
                    />
                  }
                  <path
                    class="shape"
                    [attr.d]="diamond(item.r + 3)"
                    [attr.fill]="item.fill"
                    [attr.stroke]="item.stroke"
                    [attr.stroke-width]="item.strokeWidth"
                    stroke-linejoin="round"
                    [attr.filter]="item.selected ? 'url(#vault-glow)' : null"
                  />
                } @else if (item.node.plan) {
                  @if (item.masteryRingColor) {
                    <path
                      [attr.d]="hexagon(item.r + 7)"
                      fill="none"
                      [attr.stroke]="item.masteryRingColor"
                      stroke-width="2.5"
                      [attr.stroke-dasharray]="
                        item.masteryDashed ? '3 2.5' : null
                      "
                    />
                  }
                  <path
                    class="shape"
                    [attr.d]="hexagon(item.r + 2)"
                    [attr.fill]="item.fill"
                    [attr.stroke]="item.stroke"
                    [attr.stroke-width]="item.strokeWidth"
                    stroke-linejoin="round"
                    [attr.filter]="item.selected ? 'url(#vault-glow)' : null"
                  />
                } @else if (
                  item.node.workstream &&
                  item.node.bucket === 'projects' &&
                  item.node.workstreamStatus
                ) {
                  @if (item.masteryRingColor) {
                    <circle
                      [attr.r]="item.r + 4.5"
                      fill="none"
                      [attr.stroke]="item.masteryRingColor"
                      stroke-width="2.5"
                      [attr.stroke-dasharray]="
                        item.masteryDashed ? '3 2.5' : null
                      "
                    />
                  }
                  @if (item.node.workstreamStatus === 'draft') {
                    <circle
                      class="shape"
                      [attr.r]="item.r"
                      [attr.fill]="item.fill"
                      fill-opacity="0.16"
                      [attr.stroke]="
                        item.selected
                          ? 'var(--text)'
                          : item.hit
                            ? 'var(--accent)'
                            : item.fill
                      "
                      [attr.stroke-width]="item.strokeWidth"
                      stroke-dasharray="3 2.5"
                      [attr.filter]="item.selected ? 'url(#vault-glow)' : null"
                    />
                  } @else if (item.node.workstreamStatus === 'ready') {
                    <circle
                      class="shape"
                      [attr.r]="item.r"
                      fill="var(--bg)"
                      [attr.stroke]="
                        item.selected
                          ? 'var(--text)'
                          : item.hit
                            ? 'var(--accent)'
                            : item.fill
                      "
                      stroke-width="2.5"
                      [attr.filter]="item.selected ? 'url(#vault-glow)' : null"
                    />
                  } @else if (item.node.workstreamStatus === 'finished') {
                    <circle
                      class="shape"
                      [attr.r]="item.r"
                      [attr.fill]="item.fill"
                      [attr.stroke]="item.stroke"
                      [attr.stroke-width]="item.strokeWidth"
                      [attr.filter]="item.selected ? 'url(#vault-glow)' : null"
                    />
                    <path
                      [attr.d]="finishedCheckPath(item.r)"
                      fill="none"
                      stroke="var(--halo)"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  } @else if (item.node.workstreamStatus === 'migrated') {
                    <circle
                      [attr.r]="item.r + 3.5"
                      fill="none"
                      [attr.stroke]="item.fill"
                      stroke-width="1.6"
                      opacity="0.85"
                    />
                    <circle
                      class="shape"
                      [attr.r]="item.r - 0.5 > 3 ? item.r - 0.5 : 3"
                      [attr.fill]="item.fill"
                      fill-opacity="0.78"
                      [attr.stroke]="item.stroke"
                      [attr.stroke-width]="item.strokeWidth"
                      [attr.filter]="item.selected ? 'url(#vault-glow)' : null"
                    />
                  } @else {
                    <circle
                      class="shape"
                      [attr.r]="item.r"
                      [attr.fill]="item.fill"
                      [attr.stroke]="item.stroke"
                      [attr.stroke-width]="item.strokeWidth"
                      [attr.filter]="item.selected ? 'url(#vault-glow)' : null"
                    />
                  }
                } @else {
                  @if (item.masteryRingColor) {
                    <circle
                      [attr.r]="item.r + 4.5"
                      fill="none"
                      [attr.stroke]="item.masteryRingColor"
                      stroke-width="2.5"
                      [attr.stroke-dasharray]="
                        item.masteryDashed ? '3 2.5' : null
                      "
                    />
                  }
                  <circle
                    class="shape"
                    [attr.r]="item.r"
                    [attr.fill]="item.fill"
                    [attr.stroke]="item.stroke"
                    [attr.stroke-width]="item.strokeWidth"
                    [attr.filter]="item.selected ? 'url(#vault-glow)' : null"
                  />
                }

                <text
                  class="label"
                  [class.strong]="item.isBook"
                  [class.quiet]="item.labelQuiet"
                  [attr.x]="item.labelX"
                  [attr.y]="item.labelY"
                  [attr.text-anchor]="item.labelAnchor"
                  [style.font-size]="item.labelFontSize"
                >
                  {{ item.labelText }}
                </text>
              </g>
            }
          </g>
        </g>
      </svg>

      <div class="controls glass" aria-label="Canvas controls">
        <button
          type="button"
          class="icon-btn"
          title="Zoom in (+)"
          aria-label="Zoom in"
          (click)="zoomIn()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          class="icon-btn"
          title="Zoom out (-)"
          aria-label="Zoom out"
          (click)="zoomOut()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>
        <button
          type="button"
          class="icon-btn"
          title="Fit all (F)"
          aria-label="Fit all"
          (click)="fitAll()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      </div>

      <div class="hint glass hide-present">
        <span>{{ statusText() }}</span>
        <span><kbd>/</kbd> search</span>
        <span><kbd>F</kbd> fit</span>
        <span><kbd>+</kbd><kbd>-</kbd> zoom</span>
      </div>
    </div>
  `,
  styles: `
    .canvas-wrap {
      position: fixed;
      inset: 0;
      z-index: 1;
    }
    .vault-graph-svg {
      width: 100%;
      height: 100%;
      display: block;
      cursor: grab;
      touch-action: none;
      user-select: none;
    }
    .vault-graph-svg.dragging {
      cursor: grabbing;
    }
    .edge {
      fill: none;
      stroke: var(--edge);
      stroke-width: 1.3;
      transition:
        opacity 0.2s,
        stroke 0.2s;
    }
    .edge.spoke {
      stroke: var(--edge-spoke);
      stroke-dasharray: 2 4;
    }
    .edge.reading {
      stroke: var(--edge-reading);
      stroke-width: 2;
      opacity: 0.85;
    }
    .edge.spoke.read {
      stroke: var(--edge-reading);
      stroke-width: 1.6;
      stroke-dasharray: none;
      opacity: 0.9;
    }
    .node {
      cursor: pointer;
      outline: none;
      transition: opacity 0.2s;
    }
    .node .shape {
      transition: stroke 0.15s;
    }
    .label {
      font: 500 12px var(--font);
      fill: var(--text);
      pointer-events: none;
      paint-order: stroke;
      stroke: var(--halo);
      stroke-width: 4px;
      stroke-linejoin: round;
      transition: opacity 0.2s;
    }
    .label.strong {
      font-weight: 680;
      letter-spacing: -0.01em;
    }
    .label.page {
      font: 600 10.5px var(--mono);
      fill: var(--muted);
    }
    .label.quiet {
      opacity: 0;
    }
    .dim {
      opacity: 0.14;
    }
    .focusing .node:not(.lit) {
      opacity: 0.16;
    }
    .focusing .edge:not(.lit) {
      opacity: 0.06;
    }
    .focusing .edge.lit {
      stroke: var(--accent);
      stroke-width: 2;
      opacity: 0.95;
    }
    .focusing .lit .label.quiet {
      opacity: 1;
    }
    .page-ring {
      fill: none;
      stroke: var(--line-strong);
      stroke-dasharray: 2 4;
    }
    .pulse {
      animation: vault-pulse 2.4s ease-in-out infinite;
      transform-box: fill-box;
      transform-origin: center;
    }
    @keyframes vault-pulse {
      0%,
      100% {
        opacity: 0.55;
      }
      50% {
        opacity: 0.15;
      }
    }
    .controls {
      position: fixed;
      right: 424px;
      bottom: 16px;
      z-index: 4;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 6px;
      border-radius: 14px;
    }
    .hint {
      position: fixed;
      left: 50%;
      bottom: 16px;
      transform: translateX(-50%);
      z-index: 3;
      padding: 8px 14px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 12px;
      color: var(--muted);
      white-space: nowrap;
    }
    .hint span {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .hint kbd {
      font: 600 11px/1 var(--mono);
      padding: 3px 6px;
      border-radius: 5px;
      border: 1px solid var(--line-strong);
      border-bottom-width: 2px;
      background: var(--raised);
      color: var(--muted);
    }
    @media (max-width: 960px) {
      .controls {
        right: 8px;
        bottom: auto;
        top: 76px;
      }
      .hint {
        display: none;
      }
    }
  `,
})
export class GraphCanvasComponent {
  public readonly store = inject(GraphStore);
  private readonly svgRef = viewChild<ElementRef<SVGSVGElement>>('svgEl');

  public readonly view = signal<GraphCameraView>({ x: 0, y: 0, k: 1 });
  public readonly hoveredId = signal<string | null>(null);
  public readonly isDragging = signal(false);

  private readonly homePositions = signal<ReadonlyMap<string, GraphPoint>>(
    new Map(),
  );
  private readonly viewportSize = signal({
    w: globalThis.innerWidth || 1280,
    h: globalThis.innerHeight || 800,
  });

  private drag: DragState | null = null;
  private flightId = 0;
  private hasInitialFit = false;

  public readonly cameraTransform = computed(() => {
    const v = this.view();
    return `translate(${v.x},${v.y}) scale(${v.k})`;
  });

  public readonly positions = computed<
    ReadonlyMap<string, GraphPositionedPoint>
  >(() =>
    placeBookChaptersAndReaders(
      this.store.nodes(),
      this.homePositions(),
      this.store.chaptersByBook(),
      this.store.readersByBook(),
      this.store.expandedBooks(),
    ),
  );

  private readonly edgeGraph = computed(() => {
    const graph = this.store.graph();
    const byId = this.store.byId();
    const shown = this.store.canvasVisibleIds();
    const expanded = this.store.expandedBooks();
    const pos = this.positions();
    const readChapters = this.store.readChapters();
    const q = this.store.query().trim();

    const adj = new Map<string, Set<string>>();
    const touch = (a: string, b: string) => {
      let set = adj.get(a);
      if (!set) {
        set = new Set();
        adj.set(a, set);
      }
      set.add(b);
    };

    const anchor = (n: GraphNodeDto | undefined): GraphNodeDto | undefined =>
      n?.book && !expanded.has(n.book) ? byId.get(n.book) : n;

    const drawn = new Set<string>();
    const edges: RenderedEdge[] = [];

    for (const e of graph?.edges ?? []) {
      let a = anchor(byId.get(e.source));
      let b = anchor(byId.get(e.target));
      if (a && b && this.store.isReadingEdge(a, b)) {
        if (b.book) b = byId.get(b.book);
        if (a.book) a = byId.get(a.book);
      }
      if (!a || !b || a === b || !shown.has(a.id) || !shown.has(b.id)) continue;

      const pa = pos.get(a.id);
      const pb = pos.get(b.id);
      if (!pa || !pb) continue;

      const key = a.id < b.id ? `${a.id}\0${b.id}` : `${b.id}\0${a.id}`;
      if (drawn.has(key)) continue;
      drawn.add(key);
      touch(a.id, b.id);
      touch(b.id, a.id);

      const spoke = a.book === b.id || b.book === a.id;
      const reading = !spoke && this.store.isReadingEdge(a, b);
      const dim =
        Boolean(q) &&
        !(this.store.matchesQuery(a) || this.store.matchesQuery(b));
      const chapter = spoke ? (a.book ? a : b) : null;
      const read = Boolean(chapter && readChapters.has(chapter.id));
      const progressColor =
        read && chapter?.distill && chapter.distill.state !== 'untouched'
          ? chapterFillOf(chapter)
          : null;

      if (progressColor) {
        const len = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1;
        const nx = ((pa.y - pb.y) / len) * 1.6;
        const ny = ((pb.x - pa.x) / len) * 1.6;
        edges.push(
          {
            key: `${key}:1`,
            aId: a.id,
            bId: b.id,
            d: `M${pa.x + nx},${pa.y + ny}L${pb.x + nx},${pb.y + ny}`,
            spoke: true,
            read: true,
            reading: false,
            dim,
            stroke: null,
          },
          {
            key: `${key}:2`,
            aId: a.id,
            bId: b.id,
            d: `M${pa.x - nx},${pa.y - ny}L${pb.x - nx},${pb.y - ny}`,
            spoke: true,
            read: true,
            reading: false,
            dim,
            stroke: progressColor,
          },
        );
        continue;
      }

      edges.push({
        key,
        aId: a.id,
        bId: b.id,
        d: edgePathD(pa, pb, !spoke && !reading, a.id, b.id),
        spoke,
        read,
        reading,
        dim,
        stroke: null,
      });
    }

    return { edges, adj };
  });

  public readonly renderedEdges = computed(() => this.edgeGraph().edges);

  public readonly renderedNodes = computed<RenderedNode[]>(() => {
    const shown = this.store.canvasVisibleIds();
    const pos = this.positions();
    const adj = this.edgeGraph().adj;
    const selectedId = this.store.selectedId();
    const q = this.store.query().trim();
    const k = this.view().k;
    const expanded = this.store.expandedBooks();
    const readersSet = new Set<string>();
    for (const list of this.store.readersByBook().values()) {
      for (const r of list) readersSet.add(r.id);
    }
    const crowded = shown.size > 60;
    const result: RenderedNode[] = [];

    for (const n of this.store.nodes()) {
      if (!shown.has(n.id)) continue;
      const p = pos.get(n.id);
      if (!p) continue;
      const degree = adj.get(n.id)?.size ?? 0;
      const isBook = n.rawRole === 'index';
      const r = isBook ? 15 : n.book ? 6.5 : 5 + Math.min(7, degree) * 0.85;
      const selected = selectedId === n.id && !this.store.selectedPage();
      const matched = this.store.matchesQuery(n);
      const hit = Boolean(q) && matched;
      const fill = fillOfNode(n);
      const stroke = selected
        ? 'var(--text)'
        : hit
          ? 'var(--accent)'
          : 'var(--halo)';
      const strokeWidth = selected || hit ? 2.5 : 2;
      const masteryRingColor =
        !n.raw && GRAPH_MASTERY_RING[n.mastery]
          ? (GRAPH_MASTERY_RING[n.mastery] ?? null)
          : null;

      let bookTotal = 0;
      let bookComplete = 0;
      let bookProgress = 0;
      let bookRingR = 0;
      let bookCircumference = 0;
      let bookDoneArc = 0;
      let bookMidArc = 0;
      if (isBook) {
        const counts = this.store.bookCounts(n.id);
        bookTotal = counts.total;
        bookComplete = counts.complete;
        bookProgress = counts.progress;
        bookRingR = r + 8;
        bookCircumference = 2 * Math.PI * bookRingR;
        if (bookTotal > 0) {
          bookDoneArc = (bookComplete / bookTotal) * bookCircumference;
          bookMidArc = (bookProgress / bookTotal) * bookCircumference;
        }
      }

      const labelled =
        isBook ||
        selected ||
        hit ||
        k > 1.3 ||
        (!crowded && (!n.book || expanded.has(n.book)));

      const reader = !n.book && readersSet.has(n.id);
      const cos = n.book ? Math.cos(p.angle ?? 0) : reader ? -1 : 1;
      const sin = n.book ? Math.sin(p.angle ?? 0) : 0;
      const steep = Boolean(n.book) && Math.abs(cos) < 0.35;
      const off = isBook ? r + 16 : r + 7;
      const centred = isBook || (steep && Math.abs(cos) < 0.06);

      const labelX = centred ? 0 : cos < 0 ? -off : off;
      const labelY = isBook
        ? r + 32
        : steep
          ? sin < 0
            ? -(r + 7)
            : r + 16
          : 4;
      const labelAnchor: 'start' | 'middle' | 'end' = centred
        ? 'middle'
        : cos < 0
          ? 'end'
          : 'start';
      const baseFont = isBook ? 13.5 : 12;
      const labelFontSize = `${((baseFont * Math.min(1.25, Math.max(1, k))) / k).toFixed(2)}px`;
      const labelText =
        isBook && n.chapterCount
          ? `${n.label}  ·  ${n.chaptersComplete ?? 0}/${n.chapterCount}`
          : n.label;
      const hint = isBook
        ? 'Click to open or close the book'
        : n.distill
          ? 'Click to show or hide its pages'
          : '';
      const titleTooltip = hint ? `${n.title}\n${hint}` : n.title;

      result.push({
        node: n,
        x: p.x,
        y: p.y,
        r,
        isBook,
        selected,
        hit,
        dim: !matched,
        fill,
        stroke,
        strokeWidth,
        masteryRingColor,
        masteryDashed: n.mastery === 'attempted',
        bookTotal,
        bookComplete,
        bookProgress,
        bookRingR,
        bookCircumference,
        bookDoneArc,
        bookMidArc,
        labelText,
        labelX,
        labelY,
        labelAnchor,
        labelQuiet: !labelled,
        labelFontSize,
        titleTooltip,
      });
    }

    return result;
  });

  public readonly renderedPageRings = computed<RenderedPageRing[]>(() => {
    const open = this.store.openChapters();
    const shown = this.store.canvasVisibleIds();
    const byId = this.store.byId();
    const pos = this.positions();
    const selPage = this.store.selectedPage();
    const k = this.view().k;
    const rings: RenderedPageRing[] = [];

    for (const id of open) {
      if (!shown.has(id)) continue;
      const chapter = byId.get(id);
      const chapterPos = pos.get(id);
      if (!chapter?.distill || !chapterPos) continue;
      const layout = computePageRing(chapterPos, chapter.distill.pages);
      const d =
        Math.hypot(chapterPos.x - layout.cx, chapterPos.y - layout.cy) || 1;
      const spokeEndX = layout.cx + ((chapterPos.x - layout.cx) * layout.r) / d;
      const spokeEndY = layout.cy + ((chapterPos.y - layout.cy) * layout.r) / d;
      const pages: RenderedPageDot[] = layout.pages.map((p) => {
        const selected = selPage?.chapterId === id && selPage.page === p.page;
        const out = Math.atan2(p.y - layout.cy, p.x - layout.cx);
        const cosOut = Math.cos(out);
        const markLabel = p.empty
          ? 'no text'
          : p.mark === 'bold'
            ? 'Bolded'
            : p.mark === 'highlight'
              ? 'Highlighted'
              : 'Not marked';
        return {
          chapterId: id,
          page: p.page,
          x: p.x,
          y: p.y,
          mark: p.mark,
          summary: p.summary,
          empty: p.empty,
          selected,
          fill: p.empty
            ? 'none'
            : (GRAPH_MARK_FILL[p.mark] ?? 'var(--untouched)'),
          stroke: selected
            ? 'var(--text)'
            : p.empty
              ? 'var(--faint)'
              : 'var(--halo)',
          showLabel: k > 1.6 || layout.pages.length <= 14 || selected,
          labelX: cosOut * 12,
          labelY: Math.sin(out) * 12 + 3.5,
          labelAnchor:
            cosOut < -0.3 ? 'end' : cosOut > 0.3 ? 'start' : 'middle',
          labelFontSize: `${(10.5 / k).toFixed(2)}px`,
          tooltip: `Page ${p.page} · ${markLabel}${p.summary ? ' · summary' : ''}`,
        };
      });

      rings.push({
        chapterId: id,
        cx: layout.cx,
        cy: layout.cy,
        r: layout.r,
        spokeD: `M${chapterPos.x},${chapterPos.y}L${spokeEndX},${spokeEndY}`,
        pages,
      });
    }

    return rings;
  });

  public readonly statusText = computed(() => {
    const shown = this.store.canvasVisibleIds().size;
    const total = this.store.nodes().length;
    const focal = this.store.selectedNode();
    return focal
      ? `${shown} of ${total} notes · linked to ${focal.title} · Esc shows all`
      : `${shown} of ${total} notes`;
  });

  constructor() {
    effect(() => {
      const graph = this.store.graph();
      if (!graph) return;
      const { w, h } = this.viewportSize();
      const prev = untracked(() => this.homePositions());
      const next = computeForceLayout(
        graph.nodes,
        graph.edges,
        w,
        h,
        prev.size > 0 ? prev : undefined,
      );
      this.homePositions.set(next);
      if (!this.hasInitialFit) {
        this.hasInitialFit = true;
        queueMicrotask(() => this.fitAll(0));
      }
    });
  }

  public diamond(k: number): string {
    return diamondPath(k);
  }

  public hexagon(k: number): string {
    return hexagonPath(k);
  }

  public finishedCheckPath(r: number): string {
    return `M${(-r * 0.42).toFixed(2)},${(r * 0.04).toFixed(2)}L${(-r * 0.1).toFixed(2)},${(r * 0.36).toFixed(2)}L${(r * 0.45).toFixed(2)},${(-r * 0.32).toFixed(2)}`;
  }

  public isNodeLit(id: string): boolean {
    const hovered = this.hoveredId();
    if (!hovered) return false;
    return (
      hovered === id || (this.edgeGraph().adj.get(hovered)?.has(id) ?? false)
    );
  }

  public isEdgeLit(edge: RenderedEdge): boolean {
    const hovered = this.hoveredId();
    if (!hovered) return false;
    return edge.aId === hovered || edge.bId === hovered;
  }

  public fitAll(ms = 700): void {
    const shown = this.store.canvasVisibleIds();
    const pos = this.positions();
    const pts: GraphPoint[] = [];
    for (const id of shown) {
      const p = pos.get(id);
      if (p) pts.push(p);
    }
    if (!pts.length) return;
    this.flyTo(viewForBox(boxAround(pts, 60), this.currentViewport(), 1.4), ms);
  }

  public zoomIn(): void {
    this.zoomBy(1.35);
  }

  public zoomOut(): void {
    this.zoomBy(1 / 1.35);
  }

  public frameNode(nodeId: string, ms = 700): void {
    const node = this.store.byId().get(nodeId);
    if (!node) return;
    this.store.expandBookForNode(node);
    const p = this.positions().get(nodeId);
    if (!p) return;
    if (node.rawRole === 'index') {
      this.frameBook(nodeId, ms);
      return;
    }
    this.flyTo(
      viewForBox(
        { x0: p.x - 180, x1: p.x + 180, y0: p.y - 140, y1: p.y + 140 },
        this.currentViewport(),
        1.6,
      ),
      ms,
    );
  }

  public onNodeClick(ev: Event, node: GraphNodeDto): void {
    ev.stopPropagation();
    if (this.drag?.moved) return;
    this.activateNode(node);
  }

  public onNodeKeydown(ev: Event, node: GraphNodeDto): void {
    ev.preventDefault();
    ev.stopPropagation();
    this.activateNode(node);
  }

  public onPageClick(ev: Event, chapterId: string, page: number): void {
    ev.stopPropagation();
    if (this.drag?.moved) return;
    this.store.selectPage(chapterId, page);
  }

  public onNodeHover(id: string | null): void {
    if (this.drag?.moved) return;
    this.hoveredId.set(id);
  }

  public onBackgroundClick(): void {
    if (this.drag?.moved) return;
    this.store.select(null);
  }

  public onPointerDown(ev: PointerEvent): void {
    this.flightId++;
    const v = this.view();
    this.drag = {
      startX: ev.clientX,
      startY: ev.clientY,
      viewX: v.x,
      viewY: v.y,
      moved: false,
    };
  }

  public onPointerMove(ev: PointerEvent): void {
    if (!this.drag) return;
    if (
      !this.drag.moved &&
      Math.abs(ev.clientX - this.drag.startX) +
        Math.abs(ev.clientY - this.drag.startY) >
        4
    ) {
      this.drag.moved = true;
      this.isDragging.set(true);
      this.hoveredId.set(null);
    }
    if (!this.drag.moved) return;
    this.view.update((v) => ({
      ...v,
      x: (this.drag?.viewX ?? v.x) + ev.clientX - (this.drag?.startX ?? 0),
      y: (this.drag?.viewY ?? v.y) + ev.clientY - (this.drag?.startY ?? 0),
    }));
  }

  public onPointerUp(): void {
    if (!this.drag) return;
    this.isDragging.set(false);
    setTimeout(() => {
      this.drag = null;
    }, 0);
  }

  public onWheel(ev: WheelEvent): void {
    ev.preventDefault();
    this.flightId++;
    const rect = this.svgRef()?.nativeElement.getBoundingClientRect();
    const mx = rect ? ev.clientX - rect.left : ev.clientX;
    const my = rect ? ev.clientY - rect.top : ev.clientY;
    const factor = Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.01 : 0.0018));
    this.view.update((v) => zoomAroundPoint(v, mx, my, factor));
  }

  public onResize(): void {
    this.viewportSize.set({
      w: globalThis.innerWidth || 1280,
      h: globalThis.innerHeight || 800,
    });
  }

  private activateNode(node: GraphNodeDto): void {
    if (node.rawRole === 'index') {
      const expanded = this.store.toggleBook(node.id);
      this.store.select(node.id);
      if (expanded) {
        this.frameBook(node.id);
      } else {
        const b = this.positions().get(node.id);
        if (b) {
          this.flyTo(
            viewForBox(
              { x0: b.x - 260, x1: b.x + 260, y0: b.y - 200, y1: b.y + 200 },
              this.currentViewport(),
              1.2,
            ),
          );
        }
      }
      return;
    }

    if (node.distill) {
      const opened = this.store.toggleChapterPages(node.id);
      this.store.select(node.id);
      if (opened) this.frameChapter(node);
      return;
    }

    this.store.select(node.id);
  }

  private frameBook(bookId: string, ms = 700): void {
    const b = this.positions().get(bookId);
    if (!b) return;
    const chapters = this.store.chaptersByBook().get(bookId) ?? [];
    const { rx, ry } = chapterRingOf(chapters.length);
    this.flyTo(
      viewForBox(
        {
          x0: b.x - rx - 170,
          x1: b.x + rx + 170,
          y0: b.y - ry - 30,
          y1: b.y + ry + 30,
        },
        this.currentViewport(),
        1.2,
      ),
      ms,
    );
  }

  private frameChapter(chapter: GraphNodeDto, ms = 700): void {
    const p = this.positions().get(chapter.id);
    if (!p || !chapter.distill) return;
    const { cx, cy, r } = computePageRing(p, chapter.distill.pages);
    this.flyTo(
      viewForBox(
        boxAround(
          [
            { x: p.x, y: p.y },
            { x: cx - r, y: cy - r },
            { x: cx + r, y: cy + r },
          ],
          70,
        ),
        this.currentViewport(),
        2.2,
      ),
      ms,
    );
  }

  private zoomBy(factor: number): void {
    const vp = this.currentViewport();
    const mx = (vp.x0 + vp.x1) / 2;
    const my = (vp.y0 + vp.y1) / 2;
    this.flyTo(zoomAroundPoint(this.view(), mx, my, factor), 280);
  }

  private currentViewport() {
    const { w, h } = this.viewportSize();
    return computeViewport(w, h, this.store.filtersOpen());
  }

  private flyTo(to: GraphCameraView, ms = 700): void {
    const id = ++this.flightId;
    const reducedMotion =
      typeof globalThis.matchMedia === 'function' &&
      globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ms <= 0 || reducedMotion) {
      this.view.set({ ...to });
      return;
    }
    const from = { ...this.view() };
    const start = performance.now();
    const step = (now: number) => {
      if (id !== this.flightId) return;
      const t = Math.min(1, (now - start) / ms);
      this.view.set(interpolateView(from, to, t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
