import { Component, input, output } from '@angular/core';
import type {
  GoalNodeDto,
  PlanColumnDto,
  PlanRowDto,
} from '@ai-coach/vault-view-data-access';
import {
  columnShortLabel,
  pluralize,
  worstGoalStatus,
} from '@ai-coach/vault-view-util';

@Component({
  selector: 'vault-effort-timeline',
  template: `
    <table class="vault-timeline">
      <thead>
        <tr>
          <th class="name"></th>
          @for (col of columns(); track col.period) {
            <th
              [class.current]="col.current"
              [title]="columnTitle(col)"
              (click)="columnZoom.emit(col)"
            >
              {{ columnLabel(col) }}
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track row.id; let idx = $index) {
          <tr
            [class]="rowClass(row, idx)"
            [class.lit]="litRowIds().has(row.id)"
            [class.selected]="selectedRow() === row"
          >
            <th
              class="name"
              [title]="row.status ? row.name + ' · ' + row.status : row.name"
              (click)="rowSelect.emit({ row })"
            >
              {{ row.name }}
            </th>
            @for (cell of row.cells; track $index; let ci = $index) {
              @let col = columns()[ci];
              @let pins = pinsResolver()(row.id, col);
              <td [class.current]="col.current">
                <div
                  class="vault-cell"
                  [class.planned]="cell.planned > 0"
                  [style.background]="cellBackground(cell.done)"
                  [title]="
                    cellTitle(row, col, cell.done, cell.planned, pins.length)
                  "
                  (click)="rowSelect.emit({ row, column: ci })"
                >
                  {{
                    cell.done
                      ? cell.done
                      : cell.planned
                        ? '+' + cell.planned
                        : ''
                  }}
                  @if (pins.length) {
                    <span class="pin" [class]="pinStatus(pins)"></span>
                  }
                  @if (hasSlippedOpen(row, ci)) {
                    <span class="slip">↻</span>
                  }
                </div>
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    .vault-timeline {
      border-collapse: separate;
      border-spacing: 0;
      margin: 0 18px 18px 0;
    }
    th,
    td {
      padding: 0;
    }
    thead th {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--bg);
      font: 600 11px/1 var(--mono);
      color: var(--muted);
      padding: 10px 4px 8px;
      cursor: pointer;
      white-space: nowrap;
    }
    thead th.current {
      color: var(--accent);
    }
    th.name {
      position: sticky;
      left: 0;
      z-index: 3;
      background: var(--bg);
      text-align: left;
      padding: 0 12px 0 18px;
      font: inherit;
      min-width: 210px;
      cursor: pointer;
    }
    thead th.name {
      cursor: default;
    }
    tr.workstream th.name {
      padding-left: 34px;
      font-size: 13px;
      color: var(--muted);
    }
    tr.project th.name {
      font-weight: 600;
    }
    tr.project th.name::before,
    tr.area th.name::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 2px;
      margin-right: 8px;
      background: var(--projects);
    }
    tr.area th.name::before {
      background: var(--areas);
      border-radius: 50%;
    }
    tr.archived th.name {
      color: var(--faint);
    }
    tr.archived th.name::before {
      background: var(--archive);
    }
    tr.selected th.name,
    tr.lit th.name {
      color: var(--accent);
    }
    tr.lit td .vault-cell {
      box-shadow: inset 0 0 0 1px var(--accent);
    }
    tr.sep th,
    tr.sep td {
      border-top: 1px solid var(--line);
    }
    td {
      padding: 3px;
    }
    .vault-cell {
      position: relative;
      width: 52px;
      height: 30px;
      border-radius: 6px;
      background: var(--raised);
      cursor: pointer;
      display: grid;
      place-items: center;
      font: 600 11px/1 var(--mono);
    }
    td.current .vault-cell {
      outline: 1px solid var(--line-strong);
    }
    .vault-cell.planned {
      box-shadow: inset 0 0 0 1.5px var(--planned);
      background-image: repeating-linear-gradient(
        135deg,
        transparent 0 5px,
        var(--accent-soft) 5px 7px
      );
    }
    .vault-cell .pin {
      position: absolute;
      top: -3px;
      right: -3px;
      width: 9px;
      height: 9px;
      transform: rotate(45deg);
      border: 1.5px solid var(--bg);
    }
    .vault-cell .pin.met {
      background: var(--met);
    }
    .vault-cell .pin.open {
      background: var(--open);
    }
    .vault-cell .pin.missed {
      background: var(--missed);
    }
    .vault-cell .pin.dropped {
      background: var(--dropped);
    }
    .vault-cell .slip {
      position: absolute;
      bottom: 1px;
      right: 3px;
      font-size: 9px;
      color: var(--slip);
    }
  `,
})
export class EffortTimelineComponent {
  public readonly columns = input.required<readonly PlanColumnDto[]>();
  public readonly rows = input.required<readonly PlanRowDto[]>();
  public readonly maxDoneWeight = input.required<number>();
  public readonly litRowIds = input.required<ReadonlySet<string>>();
  public readonly selectedRow = input<PlanRowDto | null>(null);
  public readonly pinsResolver =
    input.required<(rowId: string, col: PlanColumnDto) => GoalNodeDto[]>();

  public readonly columnZoom = output<PlanColumnDto>();
  public readonly rowSelect = output<{ row: PlanRowDto; column?: number }>();

  public columnLabel(col: PlanColumnDto): string {
    return columnShortLabel(col);
  }

  public columnTitle(col: PlanColumnDto): string {
    return `${col.start} to ${col.end}${col.level !== 'day' ? ' · click to zoom in' : ''}`;
  }

  public rowClass(row: PlanRowDto, index: number): string {
    const prev = index > 0 ? this.rows()[index - 1] : null;
    const sep =
      prev !== null &&
      row.kind !== 'workstream' &&
      (row.kind !== prev.kind || row.kind === 'project');
    return [row.kind, row.archived ? 'archived' : '', sep ? 'sep' : '']
      .filter(Boolean)
      .join(' ');
  }

  public cellBackground(done: number): string | null {
    if (!done) return null;
    const alpha = 0.18 + 0.72 * Math.min(1, done / this.maxDoneWeight());
    return `rgba(var(--done-rgb), ${alpha.toFixed(2)})`;
  }

  public cellTitle(
    row: PlanRowDto,
    col: PlanColumnDto,
    done: number,
    planned: number,
    pinCount: number,
  ): string {
    return `${row.name} · ${columnShortLabel(col)}: ${done} done${planned ? `, ${planned} planned` : ''}${pinCount ? ` · ${pluralize(pinCount, 'goal')}` : ''}`;
  }

  public pinStatus(pins: readonly GoalNodeDto[]): string {
    return worstGoalStatus(pins.map((p) => p.status));
  }

  public hasSlippedOpen(row: PlanRowDto, columnIndex: number): boolean {
    return row.tasks.some(
      (t) =>
        t.column === columnIndex && t.state === 'open' && t.slipped.length > 0,
    );
  }
}
