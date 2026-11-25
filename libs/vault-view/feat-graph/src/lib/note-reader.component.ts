import {
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { GraphStore } from '@ai-coach/vault-view-data-access';
import {
  parseNoteBlocks,
  type InlineToken,
  type NoteBlock,
} from '@ai-coach/vault-view-util';

@Component({
  selector: 'vault-note-blocks',
  template: `
    @for (block of blocks(); track $index) {
      @switch (block.kind) {
        @case ('paragraph') {
          <p>
            @for (tok of block.tokens; track $index) {
              @if (tok.kind === 'wikilink') {
                @if (hasTarget(tok.target)) {
                  <button
                    type="button"
                    class="wl"
                    (click)="linkSelect.emit(tok.target)"
                  >
                    {{ tok.label }}
                  </button>
                } @else {
                  <span class="wl missing">{{ tok.label }}</span>
                }
              } @else if (tok.bold || tok.highlight) {
                <span [class.mk-b]="tok.bold" [class.mk-h]="tok.highlight">
                  {{ tok.text }}
                </span>
              } @else {
                {{ tok.text }}
              }
            }
          </p>
        }
        @case ('heading') {
          <h4 class="nh">
            @for (tok of block.tokens; track $index) {
              @if (tok.kind === 'wikilink') {
                <span class="wl">{{ tok.label }}</span>
              } @else {
                {{ tok.text }}
              }
            }
          </h4>
        }
        @case ('code') {
          <pre class="code">{{ block.code }}</pre>
        }
        @case ('quote') {
          <div [class]="block.callout ? 'summary-box' : 'quote'">
            @if (block.callout) {
              <b>{{ block.callout }}</b>
            }
            <vault-note-blocks
              [blocks]="block.blocks"
              [targetExists]="targetExists()"
              (linkSelect)="linkSelect.emit($event)"
            />
          </div>
        }
        @case ('list-item') {
          <div class="li" [style.padding-left.px]="block.depth * 18 + 18">
            <span class="bullet">{{ block.mark }}</span>
            @for (tok of block.tokens; track $index) {
              @if (tok.kind === 'wikilink') {
                @if (hasTarget(tok.target)) {
                  <button
                    type="button"
                    class="wl"
                    (click)="linkSelect.emit(tok.target)"
                  >
                    {{ tok.label }}
                  </button>
                } @else {
                  <span class="wl missing">{{ tok.label }}</span>
                }
              } @else if (tok.bold || tok.highlight) {
                <span [class.mk-b]="tok.bold" [class.mk-h]="tok.highlight">
                  {{ tok.text }}
                </span>
              } @else {
                {{ tok.text }}
              }
            }
          </div>
        }
      }
    }
  `,
  styles: `
    p {
      margin: 0 0 10px;
    }
    .nh {
      margin: 14px 0 6px;
      font: 650 13.5px/1.3 var(--font);
      color: var(--text);
    }
    .code {
      margin: 8px 0 12px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--raised);
      border: 1px solid var(--line);
      font: 12px/1.5 var(--mono);
      overflow-x: auto;
      white-space: pre-wrap;
    }
    .quote,
    .summary-box {
      margin: 8px 0 12px;
      padding: 10px 12px;
      border-radius: 10px;
      border-left: 3px solid var(--accent);
      background: var(--raised);
    }
    .summary-box b {
      display: block;
      margin-bottom: 4px;
      font: 650 11px/1.2 var(--font);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent);
    }
    .li {
      position: relative;
      margin: 3px 0;
    }
    .bullet {
      position: absolute;
      left: 0;
      color: var(--muted);
    }
    .wl {
      display: inline;
      padding: 0;
      border: 0;
      background: none;
      color: var(--accent);
      font: inherit;
      cursor: pointer;
    }
    .wl:hover {
      text-decoration: underline;
    }
    .wl.missing {
      color: var(--faint);
      cursor: default;
    }
    .mk-b {
      font-weight: 700;
      color: var(--text);
    }
    .mk-h {
      background: color-mix(in srgb, var(--highlight) 32%, transparent);
      border-radius: 3px;
      padding: 0 2px;
    }
  `,
})
export class NoteBlocksComponent {
  public readonly blocks = input.required<readonly NoteBlock[]>();
  public readonly targetExists = input.required<(target: string) => boolean>();
  public readonly linkSelect = output<string>();

  public hasTarget(target: string): boolean {
    return this.targetExists()(target);
  }
}

@Component({
  selector: 'vault-note-reader',
  imports: [NoteBlocksComponent],
  template: `
    <div class="vault-reader">
      @if (loading()) {
        <div class="skeleton" style="width: 100%"></div>
        <div class="skeleton" style="width: 92%"></div>
        <div class="skeleton" style="width: 96%"></div>
        <div class="skeleton" style="width: 70%"></div>
      } @else if (failed()) {
        <p class="muted">Could not load the note.</p>
      } @else if (!blocks().length) {
        <p class="muted">This note is empty.</p>
      } @else {
        <vault-note-blocks
          [blocks]="blocks()"
          [targetExists]="checkTarget"
          (linkSelect)="onLinkSelect($event)"
        />
      }
    </div>
  `,
  styles: `
    .vault-reader {
      font: 14.5px/1.62 var(--serif);
      color: color-mix(in srgb, var(--text) 85%, var(--bg));
      max-height: 360px;
      overflow: auto;
    }
    .muted {
      color: var(--muted);
      font-family: var(--font);
      font-size: 13px;
    }
    .skeleton {
      height: 12px;
      border-radius: 6px;
      background: var(--raised-2);
      margin-bottom: 10px;
    }
  `,
})
export class NoteReaderComponent {
  private readonly store = inject(GraphStore);
  public readonly noteId = input.required<string>();

  public readonly loading = signal(true);
  public readonly failed = signal(false);
  public readonly blocks = signal<NoteBlock[]>([]);

  public readonly checkTarget = (target: string) =>
    Boolean(this.store.resolveTarget(target));

  constructor() {
    effect(() => {
      const id = this.noteId();
      void this.load(id);
    });
  }

  public onLinkSelect(target: string): void {
    const resolved = this.store.resolveTarget(target);
    if (resolved) this.store.select(resolved.id);
  }

  private async load(noteId: string): Promise<void> {
    this.loading.set(true);
    this.failed.set(false);
    const body = await this.store.fetchNoteBody(noteId);
    if (this.noteId() !== noteId) return;
    this.loading.set(false);
    if (!body) {
      this.failed.set(true);
      this.blocks.set([]);
      return;
    }
    const stripped = body.text.replace(/^\s*#\s+.*\n/, '');
    this.blocks.set(stripped.trim() ? parseNoteBlocks(stripped) : []);
  }
}

export type { InlineToken };
