import {
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { GraphStore } from '@ai-coach/vault-view-data-access';
import {
  parsePageBlocks,
  splitPageSummary,
  type DistillMarkOp,
} from '@ai-coach/vault-view-util';
import { SummaryEditorComponent } from './summary-editor.component.js';

interface SelectionBox {
  start: number;
  end: number;
  left: number;
  top: number;
}

@Component({
  selector: 'vault-passage-editor',
  imports: [SummaryEditorComponent],
  host: {
    '(document:selectionchange)': 'onSelectionChange()',
    '(window:scroll)': 'onSelectionChange()',
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    <div class="editor" [class.large]="large()">
      @if (loading()) {
        <div class="reader">
          @for (w of skeletonWidths; track $index) {
            <div class="skeleton" [style.width.%]="w"></div>
          }
        </div>
      } @else if (pageData(); as data) {
        <vault-summary-editor
          title="My page summary"
          hint="This page in your own words (optional)"
          emptyLabel="Add a page summary (optional)"
          [value]="pageSummary()"
          [saveFn]="saveSummaryFn"
        />

        <div #readerEl class="reader">
          @for (block of blocks(); track $index) {
            @if (block.kind === 'empty') {
              <p class="muted">No text on this page.</p>
            } @else if (block.kind === 'head') {
              <div class="head">
                @for (s of block.spans; track $index) {
                  <span
                    [attr.data-s]="s.src"
                    [class.mk-b]="s.bold"
                    [class.mk-h]="s.highlight"
                    >{{ s.text }}</span
                  >
                }
              </div>
            } @else {
              <p>
                @for (s of block.spans; track $index) {
                  <span
                    [attr.data-s]="s.src"
                    [class.mk-b]="s.bold"
                    [class.mk-h]="s.highlight"
                    >{{ s.text }}</span
                  >
                }
              </p>
            }
          }
        </div>
      } @else {
        <p class="muted">Could not load the page.</p>
      }
    </div>

    @if (selection(); as sel) {
      <div
        class="marker glass"
        role="toolbar"
        aria-label="Mark the selection"
        [style.left.px]="sel.left"
        [style.top.px]="sel.top"
      >
        <button
          type="button"
          class="mk-btn bold"
          title="Bold (B)"
          (mousedown)="$event.preventDefault()"
          (click)="applyMark('bold')"
        >
          <i></i>
          <span>Bold</span>
          <kbd>B</kbd>
        </button>
        <button
          type="button"
          class="mk-btn highlight"
          title="Highlight (H)"
          (mousedown)="$event.preventDefault()"
          (click)="applyMark('highlight')"
        >
          <i></i>
          <span>Highlight</span>
          <kbd>H</kbd>
        </button>
        <button
          type="button"
          class="mk-btn clear"
          title="Clear (X)"
          (mousedown)="$event.preventDefault()"
          (click)="applyMark('clear')"
        >
          <i></i>
          <span>Clear</span>
          <kbd>X</kbd>
        </button>
      </div>
    }
  `,
  styles: `
    .reader {
      font: 15px/1.68 var(--serif);
      color: var(--text);
    }
    .editor.large .reader {
      font-size: 19.5px;
      line-height: 1.75;
    }
    .reader p {
      margin: 0 0 12px;
    }
    .editor.large .reader p {
      margin-bottom: 18px;
    }
    .reader .head {
      margin: 14px 0 6px;
      font: 680 14px/1.35 var(--font);
      letter-spacing: -0.01em;
    }
    .editor.large .reader .head {
      font-size: 17px;
    }
    .mk-b {
      font-weight: 700;
      color: var(--bold-ink);
    }
    .mk-h {
      background: var(--highlight);
      color: var(--highlight-ink);
      border-radius: 3px;
      padding: 0 2px;
    }
    .muted {
      color: var(--muted);
    }
    .skeleton {
      height: 12px;
      border-radius: 6px;
      background: var(--raised-2);
      margin-bottom: 10px;
    }
    .marker {
      position: fixed;
      z-index: 30;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 5px;
      border-radius: 12px;
    }
    .mk-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 10px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--text);
      font: 600 12.5px var(--font);
      cursor: pointer;
    }
    .mk-btn:hover {
      background: var(--raised-2);
    }
    .mk-btn i {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      display: inline-block;
    }
    .mk-btn.bold i {
      background: var(--bold);
    }
    .mk-btn.highlight i {
      background: var(--highlight);
    }
    .mk-btn.clear i {
      background: var(--muted);
    }
    .mk-btn kbd {
      font: 600 10.5px/1 var(--mono);
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid var(--line-strong);
      background: var(--raised);
      color: var(--muted);
    }
  `,
})
export class PassageEditorComponent {
  public readonly store = inject(GraphStore);
  public readonly chapterId = input.required<string>();
  public readonly page = input.required<number>();
  public readonly large = input(false);

  public readonly loading = signal(false);
  public readonly selection = signal<SelectionBox | null>(null);
  public readonly skeletonWidths = [100, 92, 96, 70, 98, 88, 60];

  private readonly readerRef = viewChild<ElementRef<HTMLElement>>('readerEl');

  public readonly pageData = computed(() =>
    this.store.cachedPage(this.chapterId(), this.page()),
  );

  public readonly pageSummary = computed(() => {
    const data = this.pageData();
    return data ? splitPageSummary(data.text) : null;
  });

  public readonly blocks = computed(() => {
    const data = this.pageData();
    return data ? parsePageBlocks(data.text) : [];
  });

  public readonly saveSummaryFn = (text: string): Promise<boolean> =>
    this.store.savePageSummary(this.chapterId(), this.page(), text);

  constructor() {
    effect(() => {
      const id = this.chapterId();
      const p = this.page();
      this.selection.set(null);
      if (this.store.cachedPage(id, p)) {
        this.loading.set(false);
        return;
      }
      this.loading.set(true);
      void this.store.loadPage(id, p).finally(() => {
        if (this.chapterId() === id && this.page() === p) {
          this.loading.set(false);
        }
      });
    });
  }

  public onSelectionChange(): void {
    const root = this.readerRef()?.nativeElement;
    if (!root) {
      this.selection.set(null);
      return;
    }
    const sel = globalThis.getSelection?.();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      this.selection.set(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) {
      this.selection.set(null);
      return;
    }
    const spans = Array.from(
      root.querySelectorAll<HTMLElement>('span[data-s]'),
    ).filter((s) => range.intersectsNode(s));
    if (!spans.length) {
      this.selection.set(null);
      return;
    }
    const first = spans[0];
    const last = spans[spans.length - 1];
    const start =
      Number(first.dataset['s']) +
      (first.contains(range.startContainer) ? range.startOffset : 0);
    const end =
      Number(last.dataset['s']) +
      (last.contains(range.endContainer)
        ? range.endOffset
        : (last.textContent?.length ?? 0));
    if (end <= start) {
      this.selection.set(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const toolbarWidth = 260;
    const winW = globalThis.innerWidth || 1280;
    this.selection.set({
      start,
      end,
      left: Math.max(
        8,
        Math.min(
          winW - toolbarWidth - 8,
          rect.left + rect.width / 2 - toolbarWidth / 2,
        ),
      ),
      top: Math.max(8, rect.top - 52),
    });
  }

  public onKeydown(ev: KeyboardEvent): void {
    if (!this.selection()) return;
    if (
      ev.target instanceof HTMLInputElement ||
      ev.target instanceof HTMLTextAreaElement ||
      ev.metaKey ||
      ev.ctrlKey ||
      ev.altKey
    ) {
      return;
    }
    const key = ev.key.toLowerCase();
    if (key === 'b' || key === 'h' || key === 'x') {
      ev.preventDefault();
      void this.applyMark(
        key === 'b' ? 'bold' : key === 'h' ? 'highlight' : 'clear',
      );
    }
  }

  public async applyMark(op: DistillMarkOp): Promise<void> {
    const sel = this.selection();
    if (!sel) return;
    globalThis.getSelection?.()?.removeAllRanges();
    this.selection.set(null);
    await this.store.markPassage(
      this.chapterId(),
      this.page(),
      sel.start,
      sel.end,
      op,
    );
  }
}
