import { Component, computed, inject } from '@angular/core';
import { GraphStore } from '@ai-coach/vault-view-data-access';
import { StatusPillComponent } from '@ai-coach/vault-view-ui';
import {
  chapterFillOf,
  distillMarkLabel,
  fillOfNode,
  GRAPH_CHAPTER_STATE_LABEL,
  GRAPH_MARK_FILL,
  obsidianUri,
} from '@ai-coach/vault-view-util';
import { PassageEditorComponent } from './passage-editor.component.js';
import { SummaryEditorComponent } from './summary-editor.component.js';

@Component({
  selector: 'vault-focus-reader',
  imports: [
    StatusPillComponent,
    PassageEditorComponent,
    SummaryEditorComponent,
  ],
  template: `
    @if (focusInfo(); as info) {
      <div class="focus-backdrop" (click)="store.closeFocus()"></div>
      <div
        class="focus-panel glass"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="info.chapter.title + ', page ' + info.page.page"
      >
        <div class="focus-head">
          <div class="head-meta">
            <span class="eyebrow">
              <i [style.background]="info.chapterFill"></i>
              {{ info.bookTitle }}
            </span>
            <h2>{{ info.chapter.title }}</h2>
          </div>
          <div class="spacer"></div>
          <a class="btn" [href]="info.obsidianHref">Obsidian</a>
          <button
            type="button"
            class="icon-btn"
            title="Close (Esc)"
            aria-label="Close"
            (click)="store.closeFocus()"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="focus-body">
          <main class="focus-main">
            <div class="focus-page-title">
              <span>Page {{ info.page.page }}</span>
              <vault-status-pill
                [label]="info.markLabel"
                [color]="info.markColor"
              />
            </div>
            <vault-passage-editor
              [chapterId]="info.chapter.id"
              [page]="info.page.page"
              [large]="true"
            />
          </main>

          <aside class="focus-side">
            <section>
              <h3>Pages</h3>
              <div class="cells pages">
                @for (p of info.pages; track p.page) {
                  <button
                    type="button"
                    class="cell"
                    [class.empty]="p.empty"
                    [class.summ]="p.summary"
                    [class.sel]="p.page === info.page.page"
                    [style.background]="
                      p.empty ? 'transparent' : pageFill(p.mark)
                    "
                    (click)="selectFocusPage(info.chapter.id, p.page)"
                  >
                    {{ p.page }}
                  </button>
                }
              </div>
              <div class="pager">
                <button
                  type="button"
                  class="btn"
                  [disabled]="!info.hasPrev"
                  title="Previous page (←)"
                  (click)="store.stepFocusPage(-1)"
                >
                  ← Prev
                </button>
                <span class="muted">
                  Page {{ info.pageIndex + 1 }} of {{ info.pages.length }}
                </span>
                <button
                  type="button"
                  class="btn"
                  [disabled]="!info.hasNext"
                  title="Next page (→)"
                  (click)="store.stepFocusPage(1)"
                >
                  Next →
                </button>
              </div>
            </section>

            <section>
              <h3>This chapter</h3>
              <dl class="rows">
                <dt>Pages bolded</dt>
                <dd>{{ info.boldCount }} of {{ info.textPagesCount }}</dd>
                <dt>Highlighted</dt>
                <dd>{{ info.highlightCount }}</dd>
                <dt>Page summaries</dt>
                <dd>{{ info.summaryCount }}</dd>
                <dt>State</dt>
                <dd>
                  <vault-status-pill
                    [label]="info.stateLabel"
                    [color]="info.chapterFill"
                  />
                </dd>
              </dl>
            </section>

            <section>
              <vault-summary-editor
                title="Chapter summary"
                hint="The whole chapter in your own words. Writing it completes the chapter."
                emptyLabel="Write the chapter summary to complete it"
                [value]="info.chapterSummary"
                [saveFn]="saveChapterSummaryFn(info.chapter.id)"
              />
            </section>

            <section>
              <h3>How to distil</h3>
              <ol class="how">
                <li>
                  Select a passage that matters and
                  <span class="mk-b">bold</span> it (B).
                </li>
                <li>
                  Of the bold, <span class="mk-h">highlight</span> the best (H).
                </li>
                <li>
                  Write the chapter summary in your own words to complete the
                  chapter.
                </li>
              </ol>
            </section>
          </aside>
        </div>
      </div>
    }
  `,
  styles: `
    .focus-backdrop {
      position: fixed;
      inset: 0;
      z-index: 20;
      background: color-mix(in srgb, var(--bg) 62%, transparent);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
    .focus-panel {
      position: fixed;
      z-index: 21;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(1180px, 94vw);
      height: min(900px, 92vh);
      display: grid;
      grid-template-rows: auto 1fr;
      overflow: hidden;
      background: var(--panel-solid);
    }
    .focus-head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 18px 22px;
      border-bottom: 1px solid var(--line);
    }
    .head-meta {
      min-width: 0;
    }
    .spacer {
      flex: 1;
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
      margin: 8px 0 0;
      font-size: 20px;
      font-weight: 680;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .focus-body {
      display: grid;
      grid-template-columns: 1fr 340px;
      min-height: 0;
    }
    .focus-main {
      overflow: auto;
      padding: 34px 48px 60px;
    }
    .focus-main > * {
      max-width: 720px;
      margin-left: auto;
      margin-right: auto;
    }
    .focus-page-title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 18px;
      font: 650 12px var(--font);
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--faint);
    }
    .focus-side {
      overflow: auto;
      border-left: 1px solid var(--line);
      background: var(--raised);
    }
    .focus-side section {
      padding: 18px 20px;
      border-bottom: 1px solid var(--line);
    }
    .focus-side h3 {
      margin: 0 0 12px;
      font-size: 11px;
      font-weight: 650;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--faint);
    }
    .cells.pages {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(30px, 1fr));
      gap: 5px;
    }
    .cell {
      position: relative;
      height: 30px;
      border-radius: 6px;
      border: 0;
      padding: 0;
      cursor: pointer;
      font: 600 10px var(--mono);
      color: rgba(0, 0, 0, 0.65);
    }
    .cell.empty {
      border: 1.5px dashed var(--line-strong);
      color: var(--faint);
    }
    .cell.sel {
      box-shadow:
        0 0 0 2px var(--panel-solid),
        0 0 0 4px var(--text);
    }
    .cell.summ::after {
      content: '';
      position: absolute;
      right: -2px;
      top: -2px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text);
      border: 2px solid var(--panel-solid);
    }
    .pager {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 12px;
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
      text-decoration: none;
      font: inherit;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .muted {
      color: var(--muted);
      font-size: 12px;
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
    .how {
      margin: 0;
      padding-left: 18px;
      color: var(--muted);
      font-size: 13px;
      display: grid;
      gap: 8px;
    }
    .mk-b {
      font-weight: 700;
      color: var(--bold-ink);
    }
    .mk-h {
      background: var(--highlight);
      color: var(--highlight-ink);
      border-radius: 3px;
      padding: 0 3px;
    }
    @media (max-width: 960px) {
      .focus-body {
        grid-template-columns: 1fr;
      }
      .focus-side {
        display: none;
      }
      .focus-main {
        padding: 22px;
      }
    }
  `,
})
export class FocusReaderComponent {
  public readonly store = inject(GraphStore);

  public readonly focusInfo = computed(() => {
    const f = this.store.focusPage();
    if (!f) return null;
    const chapter = this.store.byId().get(f.chapterId);
    const distill = chapter?.distill;
    if (!chapter || !distill?.pages.length) return null;
    const page =
      distill.pages.find((x) => x.page === f.page) ?? distill.pages[0];
    const pageIndex = distill.pages.findIndex((x) => x.page === page.page);
    const book = chapter.book ? this.store.byId().get(chapter.book) : null;
    const textPages = distill.pages.filter((x) => !x.empty);
    const cached = this.store.cachedPage(chapter.id, page.page);
    const vaultName = this.store.graph()?.vaultName ?? '';
    return {
      chapter,
      page,
      pages: distill.pages,
      pageIndex,
      bookTitle: book?.title ?? 'Book',
      chapterFill: chapterFillOf(chapter) ?? fillOfNode(chapter),
      markLabel: distillMarkLabel(page.mark, page.empty),
      markColor: page.empty
        ? 'var(--muted)'
        : (GRAPH_MARK_FILL[page.mark] ?? 'var(--untouched)'),
      stateLabel: GRAPH_CHAPTER_STATE_LABEL[distill.state] ?? distill.state,
      textPagesCount: textPages.length,
      boldCount: textPages.filter((x) => x.mark !== 'none').length,
      highlightCount: textPages.filter((x) => x.mark === 'highlight').length,
      summaryCount: textPages.filter((x) => x.summary).length,
      chapterSummary: cached?.chapterSummary ?? null,
      hasPrev: Boolean(this.store.adjacentPage(chapter.id, page.page, -1)),
      hasNext: Boolean(this.store.adjacentPage(chapter.id, page.page, 1)),
      obsidianHref: obsidianUri(
        vaultName,
        `${chapter.id.replace(/\.md$/, '')}#Page ${page.page}`,
      ),
    };
  });

  public pageFill(mark: string): string {
    return GRAPH_MARK_FILL[mark] ?? 'var(--untouched)';
  }

  public selectFocusPage(chapterId: string, page: number): void {
    this.store.openFocus(chapterId, page);
  }

  public saveChapterSummaryFn(
    chapterId: string,
  ): (text: string) => Promise<boolean> {
    return (text: string) => this.store.saveChapterSummary(chapterId, text);
  }
}
