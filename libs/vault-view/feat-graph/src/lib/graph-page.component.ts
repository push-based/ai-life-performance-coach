import { Component, inject, viewChild } from '@angular/core';
import {
  GraphStore,
  type GraphNodeDto,
} from '@ai-coach/vault-view-data-access';
import {
  bucketOfNode,
  fillOfNode,
  GRAPH_BUCKETS,
  isGlobalShortcut,
  labelOf,
} from '@ai-coach/vault-view-util';
import { GraphDetailPanelComponent } from './graph-detail-panel.component.js';
import { GraphFiltersComponent } from './graph-filters.component.js';

@Component({
  selector: 'vault-graph-page',
  imports: [GraphFiltersComponent, GraphDetailPanelComponent],
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    <div class="vault-graph-shell">
      @if (store.filtersOpen()) {
        <vault-graph-filters />
      }

      <section class="vault-graph-stage">
        <div class="stage-bar">
          <button
            type="button"
            class="icon-btn"
            [attr.aria-pressed]="store.filtersOpen()"
            (click)="store.toggleFilters()"
          >
            <span class="txt">Filters</span>
          </button>
          <span class="status">
            {{ store.visibleNodes().length }} of {{ store.nodes().length }}
            notes
          </span>
        </div>

        @if (store.error(); as err) {
          <p class="err">{{ err }}</p>
        } @else {
          <div class="node-grid">
            @for (n of store.visibleNodes().slice(0, 120); track n.id) {
              <button
                type="button"
                class="node-card"
                [class.selected]="store.selectedId() === n.id"
                (click)="store.select(n.id)"
              >
                <i class="dot" [style.background]="fillOf(n)"></i>
                <span class="meta">
                  <b>{{ n.title }}</b>
                  <small>{{ bucketLabel(n) }}</small>
                </span>
              </button>
            }
          </div>
        }
      </section>

      <vault-graph-detail-panel />
    </div>
  `,
  styles: `
    .vault-graph-shell {
      display: flex;
      gap: 16px;
      height: 100vh;
      padding: 92px 16px 16px;
    }
    .vault-graph-stage {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow: auto;
    }
    .stage-bar {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .status {
      font-size: 12.5px;
      color: var(--muted);
    }
    .node-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 8px;
      padding-bottom: 16px;
    }
    .node-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--line);
      background: var(--panel);
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .node-card:hover {
      border-color: var(--line-strong);
    }
    .node-card.selected {
      border-color: var(--accent);
      background: var(--accent-soft);
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex: none;
    }
    .meta {
      min-width: 0;
      flex: 1;
    }
    .meta b {
      display: block;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta small {
      color: var(--muted);
      font-size: 11.5px;
    }
    .err {
      color: var(--wrong);
    }
  `,
})
export class GraphPageComponent {
  public readonly store = inject(GraphStore);
  private readonly filters = viewChild(GraphFiltersComponent);

  public fillOf(n: GraphNodeDto): string {
    return fillOfNode(n);
  }

  public bucketLabel(n: GraphNodeDto): string {
    return labelOf(GRAPH_BUCKETS, bucketOfNode(n));
  }

  public onKeydown(ev: KeyboardEvent): void {
    if (!isGlobalShortcut(ev)) return;
    if (ev.key === '/') {
      ev.preventDefault();
      if (!this.store.filtersOpen()) this.store.toggleFilters();
      setTimeout(() => this.filters()?.focusSearch(), 0);
    } else if (ev.key === 'Escape' && this.store.selectedId()) {
      this.store.select(null);
    }
  }
}
