import { Component, effect, inject, signal, viewChild } from '@angular/core';
import {
  ClimbStore,
  type AssertionMarkValue,
  type GenerateResultDto,
  type RevealResultDto,
  type StructurePreviewDto,
} from '@ai-coach/vault-view-data-access';
import { ClimbBoardComponent } from './climb-board.component.js';

interface MarkRowState {
  assertion: string;
  why: string;
  mark: AssertionMarkValue;
  correction: string;
}

@Component({
  selector: 'vault-climb-draw-tab',
  imports: [ClimbBoardComponent],
  template: `
    <div class="vault-draw-tab">
      <div>
        <div class="group-btns">
          <button
            type="button"
            class="btn"
            [attr.aria-pressed]="store.mode() === 'memory'"
            title="Draw it without looking, then compare"
            (click)="store.setMode('memory')"
          >
            From memory
          </button>
          <button
            type="button"
            class="btn"
            [attr.aria-pressed]="store.mode() === 'structure'"
            title="Draw and save the book's structure note"
            (click)="store.setMode('structure')"
          >
            Structure
          </button>
        </div>

        <form
          class="topic-form"
          title="A subject you read several books on, such as ADHD"
          (submit)="onAddTopic($event, topicInput)"
        >
          <input #topicInput type="text" placeholder="New topic, e.g. ADHD" />
          <button class="btn" type="submit">Start</button>
        </form>

        <p class="hint">
          A topic gathers concepts from any book into one structure. The
          concepts wait on the left. Add a group, name it, and drag concepts
          into it. Drag from a group's bottom handle to another group's top
          handle: the first builds on the second. Select an arrow or a group and
          press Delete to remove it.
        </p>
      </div>

      <div>
        <div class="bar">
          <button type="button" class="btn" (click)="addGroup()">
            + Group
          </button>
          <button type="button" class="btn" (click)="resetBoard()">
            Start over
          </button>
          <span class="spacer"></span>
          @if (store.mode() === 'memory') {
            <button
              type="button"
              class="btn"
              title="Record that you could not draw it"
              (click)="onGo(true)"
            >
              I don't know
            </button>
          }
          <button type="button" class="btn primary" (click)="onGo(false)">
            {{ store.mode() === 'memory' ? 'Reveal' : 'Preview save' }}
          </button>
        </div>

        <div class="board">
          <vault-climb-board />
        </div>

        @if (message(); as msg) {
          <div class="result">
            <p [class.err]="msg.isError">{{ msg.text }}</p>
          </div>
        }

        @if (structurePreview(); as preview) {
          <div class="result">
            @if (preview.errors?.length) {
              <b>Refused</b>
              <ul>
                @for (err of preview.errors; track err) {
                  <li class="err">{{ err }}</li>
                }
              </ul>
            } @else {
              <b>Preview: {{ preview.path }}</b>
              @if (preview.climbs?.length) {
                <ul>
                  @for (c of preview.climbs; track c.path) {
                    <li>{{ c.path }}: climb.group {{ c.climb.group }}</li>
                  }
                </ul>
              }
              @if (preview.warnings?.length) {
                <ul>
                  @for (w of preview.warnings; track w) {
                    <li class="muted">{{ w }}</li>
                  }
                </ul>
              }
              <button
                type="button"
                class="btn primary"
                (click)="confirmStructure(preview)"
              >
                Write it
              </button>
            }
          </div>
        }

        @if (revealResult(); as rev) {
          <div class="result">
            <p class="muted">
              Your drawing was saved at {{ rev.attempted_at }}, before the
              reveal at {{ rev.revealed_at }}.
            </p>
            <div class="compare">
              <div class="real">
                <h2>The structure note</h2>
                @for (g of reversedGroups(rev); track g.name) {
                  <div class="layer-box">
                    <b>{{ g.name }}</b>
                    <span class="muted">{{ conceptTitles(g.concepts) }}</span>
                  </div>
                }
                @if (rev.structure.buildsOn.length) {
                  <p class="muted">{{ buildsOnText(rev) }}</p>
                }
              </div>

              <div>
                <h2>Check each one</h2>
                <ul class="marks">
                  @for (
                    row of markRows();
                    track row.assertion;
                    let idx = $index
                  ) {
                    <li>
                      <b>{{ row.assertion }}</b>
                      <select
                        [value]="row.mark"
                        (change)="setMark(idx, $any($event.target).value)"
                      >
                        <option value="got it">got it</option>
                        <option value="wrong">wrong</option>
                        <option value="missed">missed</option>
                      </select>
                      <span class="why">suggested: {{ row.why }}</span>
                      @if (row.mark === 'wrong') {
                        <input
                          type="text"
                          placeholder="Your correction, in your own words"
                          [value]="row.correction"
                          (input)="
                            setCorrection(idx, $any($event.target).value)
                          "
                        />
                      }
                    </li>
                  }
                </ul>

                <button
                  type="button"
                  class="btn primary"
                  (click)="previewGenerate(rev.id)"
                >
                  Preview record
                </button>

                @if (generatePreview(); as gen) {
                  <div class="gen-status">
                    @if (gen.errors?.length) {
                      <ul>
                        @for (err of gen.errors; track err) {
                          <li class="err">{{ err }}</li>
                        }
                      </ul>
                    } @else if (gen.executed) {
                      <p>
                        Recorded as a Generate attempt: {{ gen.session_id }}
                      </p>
                    } @else {
                      <p>
                        Will write {{ gen.sessionFile }} and set climb.generate
                        on {{ gen.climbs?.length ?? 0 }} concept notes.
                      </p>
                      @if (gen.warnings?.length) {
                        <ul>
                          @for (w of gen.warnings; track w) {
                            <li class="muted">{{ w }}</li>
                          }
                        </ul>
                      }
                      <button
                        type="button"
                        class="btn primary"
                        (click)="confirmGenerate(rev.id)"
                      >
                        Record it
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .vault-draw-tab {
      display: grid;
      grid-template-columns: 220px 1fr;
      gap: 16px;
      padding: 12px 18px 24px;
    }
    .group-btns {
      display: inline-flex;
      gap: 4px;
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
    .topic-form {
      display: flex;
      gap: 6px;
      margin-top: 12px;
    }
    .topic-form input,
    select,
    .marks input {
      background: var(--raised);
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      padding: 5px 8px;
      color: inherit;
      font: inherit;
    }
    .topic-form input {
      flex: 1;
      min-width: 0;
    }
    .hint {
      color: var(--muted);
      font-size: 12.5px;
      margin: 6px 0 0;
    }
    .board {
      position: relative;
      height: calc(100vh - 230px);
      min-height: 420px;
      border: 1px solid var(--line-strong);
      border-radius: 12px;
      overflow: hidden;
    }
    .result {
      margin-top: 14px;
      padding: 12px 14px;
      border: 1px solid var(--line-strong);
      border-radius: 10px;
      background: var(--panel);
    }
    .result ul {
      margin: 6px 0;
      padding-left: 18px;
    }
    .err {
      color: var(--wrong);
    }
    .muted {
      color: var(--muted);
    }
    .compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .compare h2 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin: 12px 0 8px;
    }
    .marks {
      list-style: none;
      padding: 0;
      margin: 0 0 12px;
    }
    .marks li {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 10px;
      padding: 8px 0;
      border-bottom: 1px solid var(--line);
    }
    .marks .why {
      grid-column: 1 / -1;
      color: var(--muted);
      font-size: 12.5px;
    }
    .marks input {
      grid-column: 1 / -1;
    }
    .real .layer-box {
      border: 1.5px solid var(--done);
      border-radius: 10px;
      padding: 8px 10px;
      margin-bottom: 8px;
    }
    .real .layer-box b {
      display: block;
      margin-bottom: 4px;
    }
    .gen-status {
      margin-top: 10px;
    }
  `,
})
export class ClimbDrawTabComponent {
  public readonly store = inject(ClimbStore);
  private readonly board = viewChild(ClimbBoardComponent);

  public readonly message = signal<{ text: string; isError: boolean } | null>(
    null,
  );
  public readonly structurePreview = signal<StructurePreviewDto | null>(null);
  public readonly revealResult = signal<RevealResultDto | null>(null);
  public readonly markRows = signal<MarkRowState[]>([]);
  public readonly generatePreview = signal<GenerateResultDto | null>(null);
  private readonly resetTick = signal(0);

  constructor() {
    effect(() => {
      const b = this.store.bookData();
      const mode = this.store.mode();
      const boardCmp = this.board();
      this.resetTick();
      if (!boardCmp) return;
      void this.loadBoard(boardCmp, b, mode);
    });
  }

  public addGroup(): void {
    this.board()?.addGroup();
  }

  public resetBoard(): void {
    this.resetTick.update((n) => n + 1);
  }

  public onAddTopic(ev: Event, inputEl: HTMLInputElement): void {
    ev.preventDefault();
    this.store.addTopic(inputEl.value);
    inputEl.value = '';
  }

  public async onGo(idk: boolean): Promise<void> {
    this.clearResults();
    const drawing = this.board()?.drawing() ?? { groups: [], builds_on: [] };
    if (this.store.mode() === 'structure') {
      const preview = await this.store.postStructure(drawing);
      this.structurePreview.set(preview);
      return;
    }
    if (!drawing.groups.length && !idk) {
      this.message.set({
        text: "Draw the groups first, or press I don't know.",
        isError: false,
      });
      return;
    }
    const res = await this.store.postReveal(drawing, idk);
    if (!res.ok) {
      this.message.set({
        text: res.data.error || 'could not reveal',
        isError: true,
      });
      return;
    }
    this.revealResult.set(res.data);
    this.markRows.set(
      res.data.marks.map((m) => ({
        assertion: m.assertion,
        why: m.why,
        mark: m.mark,
        correction: '',
      })),
    );
  }

  public async confirmStructure(preview: StructurePreviewDto): Promise<void> {
    const drawing = this.board()?.drawing() ?? { groups: [], builds_on: [] };
    const res = await this.store.postStructure(drawing, true, preview.versions);
    if (res.executed) {
      this.structurePreview.set(null);
      this.message.set({
        text: `Written: ${preview.path}`,
        isError: false,
      });
      await this.store.load();
    } else {
      this.structurePreview.set(res);
    }
  }

  public setMark(index: number, value: string): void {
    const mark = value as AssertionMarkValue;
    this.markRows.update((rows) =>
      rows.map((r, i) => (i === index ? { ...r, mark } : r)),
    );
  }

  public setCorrection(index: number, correction: string): void {
    this.markRows.update((rows) =>
      rows.map((r, i) => (i === index ? { ...r, correction } : r)),
    );
  }

  public async previewGenerate(id: string): Promise<void> {
    const res = await this.store.postGenerate(id, this.buildMarkInputs());
    this.generatePreview.set(res);
  }

  public async confirmGenerate(id: string): Promise<void> {
    const res = await this.store.postGenerate(id, this.buildMarkInputs(), true);
    this.generatePreview.set(res);
    if (res.executed) await this.store.load();
  }

  public reversedGroups(rev: RevealResultDto) {
    return rev.structure.groups.slice().reverse();
  }

  public conceptTitles(concepts: { title: string }[]): string {
    return concepts.map((c) => c.title).join(', ');
  }

  public buildsOnText(rev: RevealResultDto): string {
    return rev.structure.buildsOn.map((e) => `${e.from} → ${e.to}`).join(' · ');
  }

  private buildMarkInputs() {
    return this.markRows().map((r) => ({
      assertion: r.assertion,
      mark: r.mark,
      ...(r.correction.trim() ? { correction: r.correction.trim() } : {}),
    }));
  }

  private clearResults(): void {
    this.message.set(null);
    this.structurePreview.set(null);
    this.revealResult.set(null);
    this.generatePreview.set(null);
  }

  private async loadBoard(
    boardCmp: ClimbBoardComponent,
    bookData: ReturnType<ClimbStore['bookData']>,
    mode: ReturnType<ClimbStore['mode']>,
  ): Promise<void> {
    this.clearResults();
    let prefill = null;
    if (mode === 'structure' && bookData?.structure) {
      prefill = await this.store.fetchStructure(bookData.book);
    }
    const concepts = bookData
      ? mode === 'structure'
        ? (bookData.candidates ?? bookData.concepts)
        : bookData.concepts
      : [];
    boardCmp.load({ concepts, prefill });
  }
}
