import {
  Component,
  effect,
  type ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'vault-summary-editor',
  template: `
    <div class="summary-edit">
      @if (editing()) {
        <div class="summary-box editing">
          <b>{{ title() }}</b>
          <textarea
            #areaEl
            rows="4"
            [placeholder]="hint()"
            [value]="draft()"
            [disabled]="saving()"
            (input)="draft.set($any($event.target).value)"
            (keydown)="onTextareaKeydown($event)"
          ></textarea>
          <div class="actions">
            <button
              type="button"
              class="btn primary"
              [disabled]="saving()"
              (click)="commit(draft())"
            >
              Save
            </button>
            <button
              type="button"
              class="btn"
              [disabled]="saving()"
              (click)="cancel()"
            >
              Cancel
            </button>
            @if (value()) {
              <button
                type="button"
                class="btn"
                [disabled]="saving()"
                (click)="commit('')"
              >
                Remove
              </button>
            }
          </div>
          <small class="muted">⌘↵ to save · Esc to cancel</small>
        </div>
      } @else if (value(); as current) {
        <div class="summary-box">
          <b>{{ title() }}</b>
          <div class="summary-text">{{ current }}</div>
          <button type="button" class="link-btn" (click)="startEdit()">
            Edit
          </button>
        </div>
      } @else {
        <button type="button" class="add-summary" (click)="startEdit()">
          <span>+</span>
          {{ emptyLabel() }}
        </button>
      }
    </div>
  `,
  styles: `
    .summary-edit {
      margin-bottom: 14px;
    }
    .summary-box {
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: var(--raised);
    }
    .summary-box b {
      display: block;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 650;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--faint);
    }
    .summary-text {
      white-space: pre-wrap;
      font-size: 13.5px;
      line-height: 1.55;
    }
    .link-btn {
      margin-top: 8px;
      padding: 0;
      border: 0;
      background: none;
      color: var(--accent);
      font: inherit;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    }
    .link-btn:hover {
      text-decoration: underline;
    }
    .add-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 10px 12px;
      border-radius: 11px;
      border: 1px dashed var(--line-strong);
      background: transparent;
      color: var(--muted);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      text-align: left;
    }
    .add-summary:hover {
      border-color: var(--accent);
      color: var(--text);
      background: var(--raised);
    }
    .add-summary span {
      font-weight: 700;
      color: var(--accent);
    }
    textarea {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--line-strong);
      background: var(--panel-solid);
      color: var(--text);
      font: inherit;
      font-size: 13.5px;
      line-height: 1.5;
      resize: vertical;
      outline: none;
    }
    textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 10px 0 6px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      border-radius: 9px;
      border: 1px solid var(--line-strong);
      background: var(--raised);
      color: var(--text);
      font: inherit;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn.primary {
      background: var(--accent);
      border-color: transparent;
      color: #0b1020;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .muted {
      color: var(--muted);
      font-size: 12px;
    }
  `,
})
export class SummaryEditorComponent {
  public readonly title = input.required<string>();
  public readonly hint = input.required<string>();
  public readonly value = input<string | null>(null);
  public readonly emptyLabel = input.required<string>();
  public readonly saveFn = input.required<(text: string) => Promise<boolean>>();

  public readonly editing = signal(false);
  public readonly saving = signal(false);
  public readonly draft = signal('');

  private readonly areaRef =
    viewChild<ElementRef<HTMLTextAreaElement>>('areaEl');

  constructor() {
    effect(() => {
      if (this.editing()) {
        setTimeout(() => this.areaRef()?.nativeElement.focus(), 0);
      }
    });
  }

  public startEdit(): void {
    this.draft.set(this.value() ?? '');
    this.editing.set(true);
  }

  public cancel(): void {
    this.editing.set(false);
  }

  public async commit(text: string): Promise<void> {
    this.saving.set(true);
    const ok = await this.saveFn()(text);
    this.saving.set(false);
    if (ok) this.editing.set(false);
  }

  public onTextareaKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      void this.commit(this.draft());
    } else if (ev.key === 'Escape') {
      ev.stopPropagation();
      this.cancel();
    }
  }
}
