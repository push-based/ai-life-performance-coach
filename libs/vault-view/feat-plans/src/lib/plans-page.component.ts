import { Component, inject } from '@angular/core';
import {
  PlansStore,
  type GoalNodeDto,
  type PlanColumnDto,
  type PlanRowDto,
} from '@ai-coach/vault-view-data-access';
import { isGlobalShortcut, PLAN_ZOOM_OPTIONS } from '@ai-coach/vault-view-util';
import { EffortTimelineComponent } from './effort-timeline.component.js';
import { GoalTreeComponent } from './goal-tree.component.js';
import { PlansDetailPanelComponent } from './plans-detail-panel.component.js';

@Component({
  selector: 'vault-plans-page',
  imports: [
    GoalTreeComponent,
    EffortTimelineComponent,
    PlansDetailPanelComponent,
  ],
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(window:hashchange)': 'onHashChange()',
  },
  template: `
    <div class="vault-plans-shell">
      <div class="vault-plans-bar">
        <button
          type="button"
          class="btn"
          title="Previous span (←)"
          (click)="store.goPrevious()"
        >
          ‹
        </button>
        <span class="span">{{ store.data()?.span?.period ?? '' }}</span>
        <button
          type="button"
          class="btn"
          title="Next span (→)"
          (click)="store.goNext()"
        >
          ›
        </button>
        <button
          type="button"
          class="btn"
          title="Back to today (T)"
          (click)="store.goToday()"
        >
          Today
        </button>

        @if (store.data(); as view) {
          <span class="group">
            @for (opt of zoomOptions; track opt.level) {
              <button
                type="button"
                class="btn"
                [attr.aria-pressed]="view.span.level === opt.level"
                [title]="opt.label + ' by ' + opt.by"
                (click)="store.go(view.focusAt[opt.level], opt.by)"
              >
                {{ opt.label }}
              </button>
            }
          </span>
        }

        <button
          type="button"
          class="btn"
          [attr.aria-pressed]="store.archived()"
          title="Show archived projects (A)"
          (click)="store.toggleArchived()"
        >
          Archived
        </button>
      </div>

      @if (store.error(); as err) {
        <div class="error">{{ err }}</div>
      } @else if (store.data(); as view) {
        <div
          class="vault-plans-grid"
          [class.with-panel]="store.selected() !== null"
        >
          <section class="pane">
            <h2>Goals</h2>
            @if (view.goals.length) {
              <vault-goal-tree
                [goals]="view.goals"
                [selectedGoal]="selectedGoal()"
                (goalSelect)="onGoalSelect($event)"
              />
            } @else {
              <div class="empty">
                No goals in plans overlapping this span. Write them in Plans/ or
                with plan_period.
              </div>
            }
          </section>

          <section class="pane">
            <h2>
              Effort by {{ view.by }} · {{ view.span.start }} to
              {{ view.span.end }}
            </h2>
            <vault-effort-timeline
              [columns]="view.columns"
              [rows]="store.visibleRows()"
              [maxDoneWeight]="store.maxDoneWeight()"
              [litRowIds]="store.litRowIds()"
              [selectedRow]="selectedRow()"
              [pinsResolver]="resolvePins"
              (columnZoom)="store.zoomInto($event)"
              (rowSelect)="onRowSelect($event)"
            />
            <div class="legend">
              <span>
                <span
                  class="legend-cell"
                  style="background: rgba(var(--done-rgb), 0.55)"
                ></span>
                done (size-weighted)
              </span>
              <span>
                <span class="legend-cell planned"></span>
                planned, open
              </span>
              <span><span class="legend-dot met"></span> met</span>
              <span><span class="legend-dot open"></span> open</span>
              <span><span class="legend-dot missed"></span> missed</span>
              <span><span class="legend-dot dropped"></span> dropped</span>
              <span class="legend-slip">↻ slipped</span>
            </div>
          </section>

          @if (store.selected(); as sel) {
            <vault-plans-detail-panel
              [selection]="sel"
              [vaultName]="view.vaultName"
              [spanPeriod]="view.span.period"
              [columns]="view.columns"
              [descendants]="store.selectedGoalDescendants()"
              [statusCounts]="store.selectedGoalStatusCounts()"
              (closed)="store.select(null)"
            />
          }
        </div>
      }
    </div>
  `,
  styles: `
    .vault-plans-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      padding-top: 84px;
    }
    .vault-plans-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding: 10px 18px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }
    .span {
      font: 600 15px/1 var(--mono);
      min-width: 7.5em;
      text-align: center;
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
    .group {
      display: inline-flex;
      gap: 4px;
    }
    .vault-plans-grid {
      flex: 1;
      display: grid;
      grid-template-columns: minmax(260px, 340px) 1fr;
      min-height: 0;
    }
    .vault-plans-grid.with-panel {
      grid-template-columns: minmax(260px, 340px) 1fr minmax(300px, 380px);
    }
    .pane {
      overflow: auto;
      min-height: 0;
    }
    .pane + .pane {
      border-left: 1px solid var(--line);
    }
    h2 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin: 16px 18px 8px;
    }
    .empty {
      color: var(--faint);
      padding: 8px 18px;
    }
    .legend {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      align-items: center;
      padding: 0 18px 18px;
      color: var(--muted);
      font-size: 12px;
    }
    .legend-cell {
      width: 22px;
      height: 14px;
      border-radius: 4px;
      display: inline-block;
      vertical-align: middle;
      margin-right: 5px;
    }
    .legend-cell.planned {
      box-shadow: inset 0 0 0 1.5px var(--planned);
      background-image: repeating-linear-gradient(
        135deg,
        transparent 0 5px,
        var(--accent-soft) 5px 7px
      );
    }
    .legend-dot {
      display: inline-block;
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }
    .legend-dot.met {
      background: var(--met);
    }
    .legend-dot.open {
      background: var(--open);
    }
    .legend-dot.missed {
      background: var(--missed);
    }
    .legend-dot.dropped {
      background: var(--dropped);
    }
    .legend-slip {
      font: 600 10.5px/1 var(--mono);
      padding: 3px 5px;
      border-radius: 5px;
      background: var(--raised-2);
      color: var(--slip);
    }
    .error {
      padding: 24px;
      color: var(--missed);
    }
  `,
})
export class PlansPageComponent {
  public readonly store = inject(PlansStore);
  public readonly zoomOptions = PLAN_ZOOM_OPTIONS;

  public readonly resolvePins = (rowId: string, col: PlanColumnDto) =>
    this.store.pinsFor(rowId, col);

  public selectedGoal(): GoalNodeDto | null {
    const sel = this.store.selected();
    return sel?.kind === 'goal' ? sel.goal : null;
  }

  public selectedRow(): PlanRowDto | null {
    const sel = this.store.selected();
    return sel?.kind === 'row' ? sel.row : null;
  }

  public onGoalSelect(goal: GoalNodeDto): void {
    this.store.select({ kind: 'goal', goal });
  }

  public onRowSelect(ev: { row: PlanRowDto; column?: number }): void {
    this.store.select({ kind: 'row', row: ev.row, column: ev.column });
  }

  public onHashChange(): void {
    this.store.syncFromHash();
  }

  public onKeydown(ev: KeyboardEvent): void {
    if (!isGlobalShortcut(ev)) return;
    if (ev.key === 'ArrowLeft') this.store.goPrevious();
    else if (ev.key === 'ArrowRight') this.store.goNext();
    else if (ev.key === 't' || ev.key === 'T') this.store.goToday();
    else if (ev.key === 'a' || ev.key === 'A') this.store.toggleArchived();
    else if (ev.key === 'Escape' && this.store.selected()) {
      this.store.select(null);
    }
  }
}
