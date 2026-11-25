import { Component, type ElementRef, inject, viewChild } from '@angular/core';
import { GraphStore } from '@ai-coach/vault-view-data-access';
import {
  bucketOfNode,
  GRAPH_BUCKETS,
  GRAPH_KINDS,
  GRAPH_MASTERY,
  GRAPH_MASTERY_RING,
  GRAPH_PLAN_LEVELS,
  GRAPH_WORKSTREAM_STATES,
  kindOfNode,
  type GraphBucketKey,
  type GraphKindKey,
  type GraphMasteryKey,
  type GraphWorkstreamStateKey,
} from '@ai-coach/vault-view-util';

@Component({
  selector: 'vault-graph-filters',
  template: `
    <aside class="glass vault-filters" aria-label="Filters">
      <label class="search">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          #searchInput
          type="search"
          placeholder="Search notes"
          autocomplete="off"
          spellcheck="false"
          [value]="store.query()"
          (input)="store.setQuery($any($event.target).value)"
          (keydown.escape)="clearSearch(searchInput)"
        />
        <kbd>/</kbd>
      </label>

      <div class="section-title">PARA</div>
      <div class="chips">
        @for (item of buckets; track item[0]) {
          <button
            type="button"
            class="chip"
            [class.off]="store.hiddenBuckets().has(item[0])"
            (click)="store.toggleBucket(item[0])"
          >
            <i
              class="mark"
              [class.hex]="item[0] === 'plans'"
              [style.background]="'var(--' + item[0] + ')'"
            ></i>
            <span class="name">{{ item[1] }}</span>
            <span class="count">{{ bucketCount(item[0]) }}</span>
          </button>
        }
      </div>

      <div class="section-title">Kinds</div>
      <div class="chips">
        @for (item of kinds; track item[0]) {
          <button
            type="button"
            class="chip"
            [class.off]="store.hiddenKinds().has(item[0])"
            (click)="store.toggleKind(item[0])"
          >
            <i
              class="mark"
              [class]="item[2]"
              style="background: var(--muted)"
            ></i>
            <span class="name">{{ item[1] }}</span>
            <span class="count">{{ kindCount(item[0]) }}</span>
          </button>
        }
      </div>

      <div class="section-title">Plan levels</div>
      <div class="chips">
        @for (item of planLevels; track item[0]) {
          <button
            type="button"
            class="chip"
            [class.off]="store.hiddenPlanLevels().has(item[0])"
            (click)="store.togglePlanLevel(item[0])"
          >
            <i
              class="mark hex"
              [style.background]="'var(--plan-' + item[0] + ')'"
            ></i>
            <span class="name">{{ item[1] }}</span>
            <span class="count">{{ planLevelCount(item[0]) }}</span>
          </button>
        }
      </div>

      <div class="section-title">Workstream states</div>
      <div class="chips">
        @for (item of workstreamStates; track item[0]) {
          <button
            type="button"
            class="chip"
            [class.off]="store.hiddenWorkstreamStates().has(item[0])"
            (click)="store.toggleWorkstreamState(item[0])"
          >
            <i
              class="mark"
              [class.ws-draft]="item[0] === 'draft'"
              [class.ws-ready]="item[0] === 'ready'"
              [class.ws-finished]="item[0] === 'finished'"
              [class.ws-migrated]="item[0] === 'migrated'"
              [style.background]="
                item[0] === 'draft' || item[0] === 'ready'
                  ? 'transparent'
                  : 'var(--ws-' + item[0] + ')'
              "
              [style.border-color]="'var(--ws-' + item[0] + ')'"
              [style.color]="'var(--ws-' + item[0] + ')'"
            ></i>
            <span class="name">{{ item[1] }}</span>
            <span class="count">{{ workstreamStateCount(item[0]) }}</span>
          </button>
        }
      </div>

      <div class="section-title">Sparring mastery</div>
      <div class="chips">
        @for (item of masteryLevels; track item[0]) {
          <button
            type="button"
            class="chip"
            [class.off]="store.hiddenMastery().has(item[0])"
            (click)="store.toggleMastery(item[0])"
          >
            <i
              class="mark ring"
              [style.border-color]="masteryColor(item[0])"
              [style.border-style]="
                item[0] === 'attempted' ? 'dashed' : 'solid'
              "
            ></i>
            <span class="name">{{ item[1] }}</span>
            <span class="count">{{ masteryCount(item[0]) }}</span>
          </button>
        }
      </div>
    </aside>
  `,
  styles: `
    .vault-filters {
      width: 272px;
      height: 100%;
      padding: 14px;
      overflow: auto;
    }
    .search {
      position: relative;
      display: block;
    }
    .search svg {
      position: absolute;
      left: 11px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      stroke: var(--faint);
      fill: none;
      stroke-width: 2;
    }
    .search input {
      width: 100%;
      height: 40px;
      padding: 0 40px 0 36px;
      border-radius: 11px;
      border: 1px solid var(--line);
      background: var(--raised);
      color: inherit;
      font: inherit;
      outline: none;
    }
    .search input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 4px var(--accent-soft);
    }
    .search kbd {
      position: absolute;
      right: 9px;
      top: 50%;
      transform: translateY(-50%);
      font: 600 11px/1 var(--mono);
      padding: 3px 6px;
      border-radius: 5px;
      border: 1px solid var(--line-strong);
      border-bottom-width: 2px;
      background: var(--raised);
      color: var(--muted);
    }
    .section-title {
      margin: 18px 4px 8px;
      font-size: 11px;
      font-weight: 650;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--faint);
    }
    .chips {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .chip {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 7px 8px;
      border-radius: 9px;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
      text-align: left;
    }
    .chip:hover {
      background: var(--raised);
    }
    .chip.off {
      opacity: 0.38;
    }
    .chip .name {
      flex: 1;
      font-size: 13px;
    }
    .chip .count {
      font: 550 12px var(--mono);
      color: var(--muted);
      font-variant-numeric: tabular-nums;
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
    .mark.ring {
      background: transparent;
      border: 2.5px solid;
    }
    .mark.ws-draft {
      border: 2px dashed;
    }
    .mark.ws-ready {
      border: 2.5px solid;
    }
    .mark.ws-finished {
      box-shadow: inset 0 0 0 2px var(--halo);
    }
    .mark.ws-migrated {
      box-shadow:
        0 0 0 1.5px var(--panel-solid),
        0 0 0 3px currentColor;
    }
  `,
})
export class GraphFiltersComponent {
  public readonly store = inject(GraphStore);
  private readonly searchRef =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');

  public readonly buckets = GRAPH_BUCKETS;
  public readonly kinds = GRAPH_KINDS;
  public readonly planLevels = GRAPH_PLAN_LEVELS;
  public readonly workstreamStates = GRAPH_WORKSTREAM_STATES;
  public readonly masteryLevels = GRAPH_MASTERY;

  public focusSearch(): void {
    this.searchRef()?.nativeElement.focus();
  }

  public clearSearch(inputEl: HTMLInputElement): void {
    this.store.setQuery('');
    inputEl.blur();
  }

  public bucketCount(key: GraphBucketKey): number {
    return this.store.nodes().filter((n) => bucketOfNode(n) === key).length;
  }

  public kindCount(key: GraphKindKey): number {
    return this.store.nodes().filter((n) => kindOfNode(n) === key).length;
  }

  public planLevelCount(key: string): number {
    return this.store.nodes().filter((n) => n.planLevel === key).length;
  }

  public workstreamStateCount(key: GraphWorkstreamStateKey): number {
    return this.store
      .nodes()
      .filter(
        (n) =>
          n.workstream && n.bucket === 'projects' && n.workstreamStatus === key,
      ).length;
  }

  public masteryCount(key: GraphMasteryKey): number {
    return this.store.nodes().filter((n) => !n.raw && n.mastery === key).length;
  }

  public masteryColor(key: GraphMasteryKey): string {
    return GRAPH_MASTERY_RING[key] ?? 'var(--line-strong)';
  }
}
