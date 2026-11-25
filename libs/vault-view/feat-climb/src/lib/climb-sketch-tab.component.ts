import {
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  ClimbStore,
  ShellStore,
  type SketchResultDto,
} from '@ai-coach/vault-view-data-access';
import { sketchImageHref } from '@ai-coach/vault-view-util';

interface Stroke {
  erase: boolean;
  points: [number, number, number][];
}

@Component({
  selector: 'vault-climb-sketch-tab',
  host: {
    '(window:resize)': 'onResize()',
  },
  template: `
    <div class="vault-sketch-tab">
      <div class="bar">
        <label class="muted">
          Sketch of
          <select
            [value]="activeTarget()"
            (change)="selectedTarget.set($any($event.target).value)"
          >
            @for (t of store.sketchTargets(); track t.value) {
              <option [value]="t.value">{{ t.label }}</option>
            }
          </select>
        </label>
        <button
          type="button"
          class="btn"
          [attr.aria-pressed]="!eraser()"
          (click)="eraser.set(false)"
        >
          Pen
        </button>
        <button
          type="button"
          class="btn"
          [attr.aria-pressed]="eraser()"
          (click)="eraser.set(true)"
        >
          Eraser
        </button>
        <button type="button" class="btn" (click)="undo()">Undo</button>
        <button type="button" class="btn" (click)="clear()">Clear</button>
        <span class="spacer"></span>
        <button type="button" class="btn primary" (click)="saveSketch()">
          Save sketch
        </button>
      </div>

      <canvas
        #pad
        class="pad"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerEnd()"
        (pointercancel)="onPointerEnd()"
      ></canvas>

      @if (notice(); as msg) {
        <div class="result">
          <p [class.err]="msg.isError">{{ msg.text }}</p>
        </div>
      }

      @if (preview(); as p) {
        <div class="result">
          @if (p.errors?.length) {
            <ul>
              @for (err of p.errors; track err) {
                <li class="err">{{ err }}</li>
              }
            </ul>
          } @else {
            <p>Will write {{ p.path }} ({{ kbOf(p.bytes) }} KB).</p>
            <button type="button" class="btn primary" (click)="confirmSave()">
              Save it
            </button>
          }
        </div>
      }

      <h2>Saved sketches</h2>
      <div class="thumbs">
        @for (s of reversedSketches(); track s.path) {
          <figure>
            <img [src]="sketchSrc(s.path)" [alt]="s.name" />
            <figcaption>{{ s.name }}</figcaption>
          </figure>
        } @empty {
          <p class="faint">None yet.</p>
        }
      </div>
    </div>
  `,
  styles: `
    .vault-sketch-tab {
      padding: 12px 18px 24px;
    }
    .bar {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .spacer {
      flex: 1;
    }
    .muted {
      color: var(--muted);
    }
    .faint {
      color: var(--faint);
    }
    select {
      background: var(--raised);
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      padding: 5px 8px;
      color: inherit;
      font: inherit;
      margin-left: 6px;
    }
    .btn {
      border: 1px solid var(--line-strong);
      background: var(--raised);
      border-radius: 8px;
      padding: 5px 10px;
      cursor: pointer;
      color: inherit;
      font: inherit;
    }
    .btn:hover {
      background: var(--raised-2);
    }
    .btn[aria-pressed='true'] {
      background: var(--accent-soft);
      border-color: var(--accent);
    }
    .btn.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #0b1020;
      font-weight: 600;
    }
    .pad {
      width: 100%;
      height: 560px;
      border: 1px solid var(--line-strong);
      border-radius: 12px;
      background: var(--canvas);
      touch-action: none;
      cursor: crosshair;
      display: block;
    }
    .result {
      margin-top: 14px;
      padding: 12px 14px;
      border: 1px solid var(--line-strong);
      border-radius: 10px;
      background: var(--panel);
    }
    .err {
      color: var(--wrong);
    }
    h2 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin: 16px 0 8px;
    }
    .thumbs {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 12px;
    }
    .thumbs figure {
      margin: 0;
      width: 180px;
    }
    .thumbs img {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--canvas);
    }
    .thumbs figcaption {
      font-size: 12px;
      color: var(--muted);
    }
  `,
})
export class ClimbSketchTabComponent {
  public readonly store = inject(ClimbStore);
  private readonly shell = inject(ShellStore);
  private readonly padRef = viewChild<ElementRef<HTMLCanvasElement>>('pad');

  public readonly eraser = signal(false);
  public readonly selectedTarget = signal<string | null>(null);
  public readonly preview = signal<SketchResultDto | null>(null);
  public readonly notice = signal<{ text: string; isError: boolean } | null>(
    null,
  );

  public readonly activeTarget = computed(
    () =>
      this.selectedTarget() ??
      this.store.selected() ??
      this.store.sketchTargets()[0]?.value ??
      '',
  );

  public readonly reversedSketches = computed(() =>
    (this.store.data()?.sketches ?? []).slice().reverse(),
  );

  private strokes: Stroke[] = [];
  private current: Stroke | null = null;
  private pendingPng = '';

  constructor() {
    effect(() => {
      this.shell.theme();
      if (this.padRef()) {
        this.resizeCanvas();
        this.paint(false);
      }
    });
  }

  public onResize(): void {
    this.resizeCanvas();
    this.paint(false);
  }

  public onPointerDown(ev: PointerEvent): void {
    const canvas = this.padRef()?.nativeElement;
    if (!canvas) return;
    canvas.setPointerCapture(ev.pointerId);
    this.current = { erase: this.eraser(), points: [this.pointOf(canvas, ev)] };
    this.strokes.push(this.current);
    this.paint(false);
  }

  public onPointerMove(ev: PointerEvent): void {
    const canvas = this.padRef()?.nativeElement;
    if (!canvas || !this.current) return;
    this.current.points.push(this.pointOf(canvas, ev));
    this.paint(false);
  }

  public onPointerEnd(): void {
    this.current = null;
  }

  public undo(): void {
    this.strokes.pop();
    this.paint(false);
  }

  public clear(): void {
    this.strokes = [];
    this.paint(false);
  }

  public async saveSketch(): Promise<void> {
    this.notice.set(null);
    this.preview.set(null);
    if (!this.strokes.length) {
      this.notice.set({ text: 'Draw something first.', isError: false });
      return;
    }
    const canvas = this.padRef()?.nativeElement;
    if (!canvas) return;
    this.paint(true);
    this.pendingPng = canvas.toDataURL('image/png');
    this.paint(false);
    const res = await this.store.postSketch(
      this.activeTarget(),
      this.pendingPng,
    );
    this.preview.set(res);
  }

  public async confirmSave(): Promise<void> {
    const res = await this.store.postSketch(
      this.activeTarget(),
      this.pendingPng,
      true,
    );
    if (res.executed) {
      this.strokes = [];
      this.paint(false);
      this.preview.set(null);
      this.notice.set({ text: `Saved ${res.path}`, isError: false });
      await this.store.load();
    } else {
      this.preview.set(res);
    }
  }

  public sketchSrc(path: string): string {
    return sketchImageHref(path);
  }

  public kbOf(bytes?: number): number {
    return Math.round((bytes ?? 0) / 1024);
  }

  private resizeCanvas(): void {
    const canvas = this.padRef()?.nativeElement;
    if (!canvas) return;
    const ratio = globalThis.devicePixelRatio || 1;
    const targetW = Math.round(canvas.clientWidth * ratio);
    const targetH = Math.round(canvas.clientHeight * ratio);
    if (targetW > 0 && targetH > 0 && canvas.width !== targetW) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }

  private pointOf(
    canvas: HTMLCanvasElement,
    ev: PointerEvent,
  ): [number, number, number] {
    const rect = canvas.getBoundingClientRect();
    return [ev.clientX - rect.left, ev.clientY - rect.top, ev.pressure || 0.5];
  }

  private paint(forExport: boolean): void {
    const canvas = this.padRef()?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ratio = canvas.width / Math.max(1, canvas.clientWidth);
    const css = getComputedStyle(document.documentElement);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = forExport
      ? '#ffffff'
      : css.getPropertyValue('--canvas').trim() || '#0b101b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of this.strokes) {
      ctx.strokeStyle = s.erase
        ? ctx.fillStyle
        : forExport
          ? '#0f172a'
          : css.getPropertyValue('--ink').trim();
      ctx.lineWidth = s.erase ? 22 : 3;
      ctx.beginPath();
      s.points.forEach(([x, y], i) =>
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
      );
      if (s.points.length === 1) {
        ctx.lineTo(s.points[0][0] + 0.1, s.points[0][1]);
      }
      ctx.stroke();
    }
  }
}
