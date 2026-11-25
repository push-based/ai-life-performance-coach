import { Component, inject, viewChild } from '@angular/core';
import { GraphStore } from '@ai-coach/vault-view-data-access';
import { isGlobalShortcut } from '@ai-coach/vault-view-util';
import { GraphCanvasComponent } from './graph-canvas.component.js';
import { GraphDetailPanelComponent } from './graph-detail-panel.component.js';
import { GraphFiltersComponent } from './graph-filters.component.js';

@Component({
  selector: 'vault-graph-page',
  imports: [
    GraphCanvasComponent,
    GraphFiltersComponent,
    GraphDetailPanelComponent,
  ],
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    <vault-graph-canvas />

    <button
      type="button"
      class="icon-btn glass filters-toggle hide-present"
      [class.open]="store.filtersOpen()"
      [attr.aria-pressed]="store.filtersOpen()"
      title="Toggle filters (/)"
      (click)="store.toggleFilters()"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16M7 12h10M10 18h4" />
      </svg>
      <span class="txt">Filters</span>
    </button>

    @if (store.filtersOpen()) {
      <div class="filters-dock hide-present">
        <vault-graph-filters (searchSubmit)="onSearchSubmit()" />
      </div>
    }

    @if (store.error(); as err) {
      <div class="glass error-banner" role="alert">{{ err }}</div>
    }

    <div class="detail-dock">
      <vault-graph-detail-panel />
    </div>
  `,
  styles: `
    .filters-toggle {
      position: fixed;
      top: 92px;
      left: 16px;
      z-index: 5;
      border-radius: 12px;
      transition: left 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    .filters-toggle.open {
      left: 300px;
    }
    .filters-dock {
      position: fixed;
      top: 92px;
      left: 16px;
      bottom: 16px;
      z-index: 4;
    }
    .detail-dock {
      position: fixed;
      top: 92px;
      right: 16px;
      bottom: 16px;
      z-index: 4;
    }
    .error-banner {
      position: fixed;
      top: 92px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 6;
      padding: 10px 16px;
      color: var(--wrong);
      font-size: 13px;
    }
    @media (max-width: 960px) {
      .filters-toggle.open {
        left: 16px;
      }
      .filters-dock {
        top: auto;
        bottom: 8px;
        left: 8px;
        right: 8px;
        max-height: 38vh;
      }
      .detail-dock {
        top: auto;
        left: 8px;
        right: 8px;
        bottom: 8px;
        max-height: 52vh;
      }
    }
  `,
})
export class GraphPageComponent {
  public readonly store = inject(GraphStore);
  private readonly filters = viewChild(GraphFiltersComponent);
  private readonly canvas = viewChild(GraphCanvasComponent);

  public onSearchSubmit(): void {
    const q = this.store.query().trim();
    if (!q) return;
    const shown = this.store.canvasVisibleIds();
    const hit =
      this.store
        .nodes()
        .find((n) => shown.has(n.id) && this.store.matchesQuery(n)) ??
      this.store.nodes().find((n) => this.store.matchesQuery(n));
    if (!hit) return;
    this.store.expandBookForNode(hit);
    this.store.select(hit.id);
    this.canvas()?.frameNode(hit.id);
  }

  public onKeydown(ev: KeyboardEvent): void {
    if (!isGlobalShortcut(ev)) return;
    if (ev.key === '/') {
      ev.preventDefault();
      if (!this.store.filtersOpen()) this.store.toggleFilters();
      setTimeout(() => this.filters()?.focusSearch(), 0);
      return;
    }
    if (ev.key === 'f' || ev.key === 'F') {
      this.canvas()?.fitAll();
      return;
    }
    if (ev.key === '+' || ev.key === '=') {
      this.canvas()?.zoomIn();
      return;
    }
    if (ev.key === '-' || ev.key === '_') {
      this.canvas()?.zoomOut();
      return;
    }
    if (ev.key === 'Escape') {
      const selPage = this.store.selectedPage();
      if (selPage) {
        this.store.clearSelectedPage();
        return;
      }
      const sel = this.store.selectedNode();
      if (sel?.book) {
        this.store.select(sel.book);
        this.canvas()?.frameNode(sel.book);
        return;
      }
      if (sel) {
        this.store.select(null);
      }
    }
  }
}
