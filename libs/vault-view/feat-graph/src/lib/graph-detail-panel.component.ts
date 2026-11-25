import { Component, computed, inject } from '@angular/core';
import {
  GraphStore,
  type GraphNodeDto,
} from '@ai-coach/vault-view-data-access';
import { StatusPillComponent } from '@ai-coach/vault-view-ui';
import {
  bucketOfNode,
  chapterFillOf,
  distillMarkLabel,
  fillOfNode,
  GRAPH_BUCKETS,
  GRAPH_CHAPTER_STATE_LABEL,
  GRAPH_MARK_FILL,
  GRAPH_MASTERY,
  GRAPH_MASTERY_RING,
  GRAPH_PLAN_LEVELS,
  GRAPH_STAGES,
  GRAPH_WORKSTREAM_STATES,
  labelOf,
  obsidianUri,
  pluralize,
  workstreamFillOf,
} from '@ai-coach/vault-view-util';
import { NoteReaderComponent } from './note-reader.component.js';
import { PassageEditorComponent } from './passage-editor.component.js';
import { SummaryEditorComponent } from './summary-editor.component.js';

@Component({
  selector: 'vault-graph-detail-panel',
  imports: [
    StatusPillComponent,
    NoteReaderComponent,
    PassageEditorComponent,
    SummaryEditorComponent,
  ],
  template: `
    <aside class="glass vault-detail" aria-live="polite">
      @if (selectedPageInfo(); as pi) {
        <section class="card">
          <span class="eyebrow">
            <i [style.background]="pi.markColor"></i>
            Page {{ pi.page.page }}
          </span>
          <h2>{{ pi.chapter.title }}</h2>
          <div class="pills">
            <vault-status-pill [label]="pi.markLabel" [color]="pi.markColor" />
            @if (pi.page.summary) {
              <vault-status-pill label="Page summary" color="var(--complete)" />
            }
          </div>
          <div class="actions">
            <button
              type="button"
              class="btn primary"
              title="Read and distil in the middle of the screen (E)"
              (click)="store.openFocus(pi.chapter.id, pi.page.page)"
            >
              Edit mode
            </button>
            <button
              type="button"
              class="btn"
              (click)="store.clearSelectedPage()"
            >
              ↑ Chapter
            </button>
            <a class="btn" [href]="pi.obsidianHref">Obsidian</a>
          </div>
        </section>

        <section class="card">
          <div class="pager">
            <button
              type="button"
              class="btn"
              [disabled]="!pi.hasPrev"
              title="Previous page (←)"
              (click)="store.stepSelectedPage(-1)"
            >
              ← Prev
            </button>
            <span class="muted">
              Page {{ pi.pageIndex + 1 }} of {{ pi.totalPages }} in this chapter
            </span>
            <button
              type="button"
              class="btn"
              [disabled]="!pi.hasNext"
              title="Next page (→)"
              (click)="store.stepSelectedPage(1)"
            >
              Next →
            </button>
          </div>
        </section>

        <section class="card">
          <vault-passage-editor
            [chapterId]="pi.chapter.id"
            [page]="pi.page.page"
          />
        </section>

        <section class="card">
          <p class="hint-text">
            Select text to bold or highlight it. Changes are saved to the
            chapter note, so Obsidian shows them at once.
          </p>
        </section>
      } @else if (store.selectedNode(); as n) {
        @if (n.rawRole === 'index') {
          <section class="card">
            <span class="eyebrow">
              <i [style.background]="fillOf(n)"></i>
              Book
            </span>
            <h2>{{ n.title }}</h2>
            <div class="path">{{ n.id }}</div>
            <div class="actions">
              <a class="btn" [href]="obsidianHref(n.id)">Open in Obsidian</a>
            </div>
          </section>

          <section class="card">
            <h3>Stage · {{ stageLabel(n.stage) }}</h3>
            <div class="stepper">
              @for (step of bookSteps(n); track step.name; let i = $index) {
                <div class="step" [class.done]="step.done">
                  <i>{{ step.done ? '✓' : i + 1 }}</i>
                  <span>{{ step.name }}</span>
                </div>
              }
            </div>
          </section>

          @let counts = store.bookCounts(n.id);
          <section class="card">
            <h3>Chapters distilled</h3>
            <div class="tiles">
              <div class="tile wide">
                <b>{{ counts.complete }} / {{ counts.total }}</b>
                <span>
                  chapters complete — a chapter is complete once its summary is
                  written
                </span>
              </div>
            </div>
            <div class="cells">
              @for (ch of counts.chapters; track ch.id; let i = $index) {
                <button
                  type="button"
                  class="cell"
                  [title]="ch.title"
                  [style.background]="chapterBg(ch)"
                  (click)="store.select(ch.id)"
                >
                  {{ i + 1 }}
                </button>
              }
            </div>
          </section>
        } @else if (n.distill) {
          <section class="card">
            <span class="eyebrow">
              <i [style.background]="chapterBg(n)"></i>
              Chapter
            </span>
            <h2>{{ n.title }}</h2>
            @if (bookOf(n); as parentBook) {
              <button
                type="button"
                class="btn small"
                (click)="store.select(parentBook.id)"
              >
                ↑ {{ parentBook.title }}
              </button>
            }
            <div class="actions">
              @if (n.distill.pages.length) {
                <button
                  type="button"
                  class="btn primary"
                  title="Read and distil in the middle of the screen (E)"
                  (click)="store.openFocus(n.id, n.distill.pages[0].page)"
                >
                  Edit mode
                </button>
              }
              <a class="btn" [href]="obsidianHref(n.id)">Open in Obsidian</a>
            </div>
          </section>

          <section class="card">
            <div class="row-head">
              <h3>Pages</h3>
              <vault-status-pill
                [label]="chapterStateLabel(n.distill.state)"
                [color]="chapterBg(n)"
              />
            </div>
            <div class="cells pages">
              @for (p of n.distill.pages; track p.page) {
                <button
                  type="button"
                  class="cell"
                  [class.empty]="p.empty"
                  [class.summ]="p.summary"
                  [style.background]="
                    p.empty ? 'transparent' : pageFill(p.mark)
                  "
                  (click)="store.selectPage(n.id, p.page)"
                >
                  {{ p.page }}
                </button>
              }
            </div>
          </section>

          <section class="card">
            <vault-summary-editor
              title="Chapter summary"
              hint="The whole chapter in your own words. Writing it completes the chapter."
              emptyLabel="Write the chapter summary to complete it"
              [value]="chapterSummaryOf(n)"
              [saveFn]="saveChapterSummaryFn(n.id)"
            />
          </section>
        } @else {
          <section class="card">
            <span class="eyebrow">
              <i [style.background]="fillOf(n)"></i>
              {{ kindLabel(n) }}
            </span>
            <h2>{{ n.title }}</h2>
            <div class="path">{{ n.id }}</div>
            <div class="actions">
              <a class="btn" [href]="obsidianHref(n.id)">Open in Obsidian</a>
            </div>
          </section>

          <section class="card">
            <vault-note-reader [noteId]="n.id" />
          </section>

          <section class="card">
            <dl class="rows">
              <dt>PARA</dt>
              <dd>{{ bucketLabel(n) }}</dd>
              @if (n.workstream && n.workstreamStatus) {
                <dt>Status</dt>
                <dd>
                  <vault-status-pill
                    [label]="workstreamStateLabel(n.workstreamStatus)"
                    [color]="workstreamColor(n.workstreamStatus)"
                  />
                </dd>
              }
              @if (!n.raw) {
                <dt>Mastery</dt>
                <dd>
                  <vault-status-pill
                    [label]="masteryLabel(n.mastery)"
                    [color]="masteryColor(n.mastery)"
                  />
                </dd>
                <dt>Next review</dt>
                <dd>{{ n.nextReview || '—' }}</dd>
              }
              <dt>Links</dt>
              <dd>{{ store.selectedNeighbors().length }}</dd>
            </dl>
          </section>

          @if (store.selectedNeighbors().length) {
            <section class="card">
              <h3>Linked</h3>
              <ul class="list">
                @for (m of store.selectedNeighbors().slice(0, 12); track m.id) {
                  <li>
                    <button type="button" (click)="store.select(m.id)">
                      <i
                        class="mark"
                        [class.dia]="m.concept"
                        [class.sq]="m.raw"
                        [class.hex]="m.plan"
                        [style.background]="fillOf(m)"
                      ></i>
                      <span class="grow">
                        <b>{{ m.title }}</b>
                        <small>{{ linkedSubtitle(m) }}</small>
                      </span>
                    </button>
                  </li>
                }
              </ul>
            </section>
          }
        }
      } @else if (store.graph(); as g) {
        <section class="card">
          <span class="eyebrow">
            <i style="background: var(--accent)"></i>
            Second brain
          </span>
          <h2>{{ g.vaultName }}</h2>
          <p class="lede">
            Notes filed by PARA, books distilled page by page, and the concept
            notes that get sparred. Pick a note to read it.
          </p>
          <div class="tiles">
            <div class="tile">
              <b>{{ g.nodes.length }}</b>
              <span>notes</span>
            </div>
            <div class="tile">
              <b>{{ g.edges.length }}</b>
              <span>links</span>
            </div>
            <div class="tile">
              <b>{{ store.books().length }}</b>
              <span>{{ store.books().length === 1 ? 'book' : 'books' }}</span>
            </div>
            <div class="tile">
              <b>{{ store.concepts().length }}</b>
              <span>concept notes</span>
            </div>
          </div>
        </section>

        <section class="card">
          <h3>Where notes live</h3>
          <div class="bar">
            @for (p of nonZeroBuckets(); track p.key) {
              <i
                [title]="p.name + ': ' + p.value"
                [style.width.%]="(p.value / totalNodes()) * 100"
                [style.background]="p.color"
              ></i>
            }
          </div>
          <div class="bar-legend">
            @for (p of nonZeroBuckets(); track p.key) {
              <span>
                <i class="mark" [style.background]="p.color"></i>
                <b>{{ p.value }}</b>
                {{ p.name }}
              </span>
            }
          </div>
        </section>

        @if (store.books().length) {
          <section class="card">
            <h3>Reading</h3>
            <ul class="list">
              @for (b of store.books(); track b.id) {
                @let c = store.bookCounts(b.id);
                <li>
                  <button type="button" (click)="store.select(b.id)">
                    <i
                      class="mark sq"
                      [style.background]="fillOf(b)"
                      style="width: 14px; height: 14px"
                    ></i>
                    <span class="grow">
                      <b>{{ b.title }}</b>
                      <small>{{
                        bookSummaryLine(b, c.complete, c.total)
                      }}</small>
                    </span>
                  </button>
                </li>
              }
            </ul>
          </section>
        }

        <section class="card">
          <h3>Sparring</h3>
          <div class="bar">
            @for (p of nonZeroMastery(); track p.key) {
              <i
                [title]="p.name + ': ' + p.value"
                [style.width.%]="(p.value / totalSparrable()) * 100"
                [style.background]="p.color"
              ></i>
            }
          </div>
          <div class="bar-legend">
            @for (p of store.masteryStats(); track p.key) {
              <span>
                <i class="mark" [style.background]="p.color"></i>
                <b>{{ p.value }}</b>
                {{ p.name }}
              </span>
            }
          </div>
        </section>
      }
    </aside>
  `,
  styles: `
    .vault-detail {
      width: 392px;
      height: 100%;
      overflow: auto;
    }
    .card {
      padding: 20px 20px 22px;
    }
    .card + .card {
      border-top: 1px solid var(--line);
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 9px 4px 7px;
      border-radius: 999px;
      background: var(--raised);
      border: 1px solid var(--line);
      font-size: 11px;
      font-weight: 650;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .eyebrow i {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    h2 {
      margin: 12px 0 4px;
      font-size: 21px;
      line-height: 1.22;
      font-weight: 680;
    }
    h3 {
      margin: 0 0 12px;
      font-size: 11px;
      font-weight: 650;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--faint);
    }
    .path {
      font: 12px/1.45 var(--mono);
      color: var(--faint);
      word-break: break-all;
    }
    .lede {
      color: var(--muted);
      margin: 8px 0 16px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid var(--line-strong);
      background: var(--raised);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      color: var(--text);
      text-decoration: none;
    }
    .btn.small {
      height: 28px;
      margin-top: 6px;
      font-size: 12px;
    }
    .btn:hover {
      background: var(--raised-2);
    }
    .btn.primary {
      background: var(--accent);
      border-color: transparent;
      color: #0b1020;
    }
    .btn:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }
    .pager {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .muted {
      color: var(--muted);
      font-size: 12px;
    }
    .hint-text {
      margin: 0;
      color: var(--muted);
      font-size: 12.5px;
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .tile {
      padding: 12px 14px;
      border-radius: 13px;
      background: var(--raised);
      border: 1px solid var(--line);
    }
    .tile.wide {
      grid-column: 1 / -1;
    }
    .tile b {
      display: block;
      font-size: 22px;
      line-height: 1.1;
      font-weight: 680;
    }
    .tile span {
      font-size: 12px;
      color: var(--muted);
    }
    .bar {
      display: flex;
      height: 10px;
      border-radius: 999px;
      overflow: hidden;
      background: var(--raised-2);
      gap: 2px;
    }
    .bar i {
      display: block;
      height: 100%;
    }
    .bar-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      margin-top: 10px;
    }
    .bar-legend span {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--muted);
    }
    .bar-legend b {
      color: var(--text);
    }
    .rows {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 9px 16px;
      margin: 0;
      font-size: 13px;
    }
    .rows dt {
      color: var(--muted);
    }
    .rows dd {
      margin: 0;
      text-align: right;
      font-weight: 550;
    }
    .row-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .row-head h3 {
      margin: 0;
    }
    .stepper {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
    }
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-align: center;
    }
    .step i {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--panel-solid);
      border: 2px solid var(--line-strong);
      font: 700 11px var(--font);
      font-style: normal;
      color: var(--faint);
    }
    .step.done i {
      background: var(--complete);
      border-color: var(--complete);
      color: #052e1f;
    }
    .step span {
      font-size: 11px;
      color: var(--muted);
    }
    .cells {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(24px, 1fr));
      gap: 5px;
    }
    .cell {
      display: grid;
      place-items: center;
      height: 26px;
      border-radius: 6px;
      border: 0;
      cursor: pointer;
      font: 600 10px var(--mono);
      color: rgba(0, 0, 0, 0.65);
    }
    .cell.empty {
      border: 1.5px dashed var(--line-strong);
      color: var(--faint);
    }
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .list button {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 9px 10px;
      border-radius: 10px;
      border: 1px solid transparent;
      background: var(--raised);
      color: inherit;
      font: inherit;
      cursor: pointer;
      text-align: left;
    }
    .list button:hover {
      border-color: var(--line-strong);
    }
    .list .grow {
      flex: 1;
      min-width: 0;
    }
    .list .grow b {
      display: block;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .list .grow small {
      color: var(--muted);
      font-size: 12px;
    }
    .mark {
      width: 12px;
      height: 12px;
      flex: none;
      border-radius: 50%;
      display: inline-block;
    }
    .mark.sq {
      border-radius: 3px;
    }
    .mark.dia {
      border-radius: 2px;
      transform: rotate(45deg) scale(0.82);
    }
    .mark.hex {
      border-radius: 0;
      clip-path: polygon(
        50% 0%,
        93.3% 25%,
        93.3% 75%,
        50% 100%,
        6.7% 75%,
        6.7% 25%
      );
    }
  `,
})
export class GraphDetailPanelComponent {
  public readonly store = inject(GraphStore);

  public readonly totalNodes = computed(() =>
    Math.max(1, this.store.nodes().length),
  );
  public readonly totalSparrable = computed(() =>
    Math.max(1, this.store.sparrable().length),
  );
  public readonly nonZeroBuckets = computed(() =>
    this.store.bucketStats().filter((b) => b.value > 0),
  );
  public readonly nonZeroMastery = computed(() =>
    this.store.masteryStats().filter((m) => m.value > 0),
  );

  public readonly selectedPageInfo = computed(() => {
    const sel = this.store.selectedPage();
    if (!sel) return null;
    const chapter = this.store.byId().get(sel.chapterId);
    const pages = chapter?.distill?.pages ?? [];
    const page = pages.find((p) => p.page === sel.page);
    if (!chapter || !page) return null;
    const pageIndex = pages.findIndex((p) => p.page === page.page);
    const vaultName = this.store.graph()?.vaultName ?? '';
    return {
      chapter,
      page,
      pageIndex,
      totalPages: pages.length,
      markLabel: distillMarkLabel(page.mark, page.empty),
      markColor: page.empty
        ? 'var(--muted)'
        : (GRAPH_MARK_FILL[page.mark] ?? 'var(--untouched)'),
      hasPrev: Boolean(this.store.adjacentPage(chapter.id, page.page, -1)),
      hasNext: Boolean(this.store.adjacentPage(chapter.id, page.page, 1)),
      obsidianHref: obsidianUri(
        vaultName,
        `${chapter.id.replace(/\.md$/, '')}#Page ${page.page}`,
      ),
    };
  });

  public chapterSummaryOf(n: GraphNodeDto): string | null {
    const firstPage = n.distill?.pages[0]?.page;
    if (firstPage === undefined) return null;
    const cached = this.store.cachedPage(n.id, firstPage);
    if (!cached) {
      void this.store.loadPage(n.id, firstPage);
      return null;
    }
    return cached.chapterSummary;
  }

  public saveChapterSummaryFn(
    chapterId: string,
  ): (text: string) => Promise<boolean> {
    return (text: string) => this.store.saveChapterSummary(chapterId, text);
  }

  public fillOf(n: GraphNodeDto): string {
    return fillOfNode(n);
  }

  public chapterBg(n: GraphNodeDto): string {
    return chapterFillOf(n) ?? 'var(--untouched)';
  }

  public pageFill(mark: string): string {
    return GRAPH_MARK_FILL[mark] ?? 'var(--untouched)';
  }

  public bookOf(n: GraphNodeDto): GraphNodeDto | null {
    return n.book ? (this.store.byId().get(n.book) ?? null) : null;
  }

  public kindLabel(n: GraphNodeDto): string {
    if (n.concept) return 'Concept note';
    if (n.raw) return 'Raw resource';
    if (n.workstream) return 'Workstream';
    if (n.project) return 'Project';
    if (n.plan) {
      return n.planLevel
        ? `${labelOf(GRAPH_PLAN_LEVELS, n.planLevel)} plan`
        : 'Plan';
    }
    return 'Note';
  }

  public bucketLabel(n: GraphNodeDto): string {
    return labelOf(GRAPH_BUCKETS, bucketOfNode(n));
  }

  public workstreamStateLabel(status: string): string {
    return labelOf(GRAPH_WORKSTREAM_STATES, status);
  }

  public workstreamColor(status: GraphNodeDto['workstreamStatus']): string {
    return workstreamFillOf(status);
  }

  public masteryLabel(mastery: string): string {
    return labelOf(GRAPH_MASTERY, mastery);
  }

  public masteryColor(mastery: GraphNodeDto['mastery']): string {
    return GRAPH_MASTERY_RING[mastery] ?? 'var(--muted)';
  }

  public stageLabel(stage: string | null): string {
    return labelOf(GRAPH_STAGES, stage);
  }

  public chapterStateLabel(state: string): string {
    return GRAPH_CHAPTER_STATE_LABEL[state] ?? state;
  }

  public linkedSubtitle(m: GraphNodeDto): string {
    return m.planLevel
      ? `${labelOf(GRAPH_PLAN_LEVELS, m.planLevel)} plan`
      : this.bucketLabel(m);
  }

  public bookSteps(b: GraphNodeDto): { name: string; done: boolean }[] {
    const c = this.store.bookCounts(b.id);
    return [
      { name: 'Read', done: Boolean(b.readOn) },
      { name: 'Notes', done: (b.notesFrom?.length ?? 0) > 0 },
      { name: 'Distilling', done: c.complete + c.progress > 0 },
      { name: 'Distilled', done: c.total > 0 && c.complete === c.total },
      { name: 'Concepts', done: (b.conceptsFrom?.length ?? 0) > 0 },
    ];
  }

  public bookSummaryLine(
    b: GraphNodeDto,
    complete: number,
    total: number,
  ): string {
    return `${this.stageLabel(b.stage)} · ${complete}/${total} chapters · ${pluralize(b.notesFrom?.length ?? 0, 'note')} · ${pluralize(b.conceptsFrom?.length ?? 0, 'concept')}`;
  }

  public obsidianHref(id: string): string {
    const vaultName = this.store.graph()?.vaultName ?? '';
    return obsidianUri(vaultName, id.replace(/\.md$/, ''));
  }
}
