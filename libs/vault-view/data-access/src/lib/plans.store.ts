import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  formatPlansHash,
  GOAL_STATUS_ORDER,
  goalWithinRange,
  parsePlansHash,
  zoomByForLevel,
  type GoalStatusName,
  type PlanLevelName,
} from '@ai-coach/vault-view-util';
import { firstValueFrom } from 'rxjs';
import {
  type GoalNodeDto,
  type PlanColumnDto,
  type PlanRowDto,
  type PlansSelection,
  type PlansViewDto,
} from './plans.dto.js';
import { ShellStore } from './shell.store.js';

@Injectable({ providedIn: 'root' })
export class PlansStore {
  private readonly http = inject(HttpClient);
  private readonly shell = inject(ShellStore);

  public readonly data = signal<PlansViewDto | null>(null);
  public readonly loading = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly span = signal<string | null>(null);
  public readonly by = signal<string | null>(null);
  public readonly archived = signal(false);
  public readonly selected = signal<PlansSelection | null>(null);

  public readonly visibleRows = computed<PlanRowDto[]>(() => {
    const view = this.data();
    if (!view) return [];
    const showArchived = this.archived();
    return view.rows
      .filter((r) => showArchived || !r.archived)
      .filter(
        (r) =>
          r.kind !== 'unlinked' || r.cells.some((c) => c.done || c.planned),
      );
  });

  public readonly maxDoneWeight = computed<number>(() => {
    const rows = this.visibleRows();
    const values = rows
      .filter((r) => r.kind !== 'project')
      .flatMap((r) => r.cells.map((c) => c.done));
    return Math.max(1, ...values);
  });

  public readonly litRowIds = computed<ReadonlySet<string>>(() => {
    const sel = this.selected();
    const ids = new Set<string>();
    if (!sel || sel.kind !== 'goal') return ids;
    const walk = (goals: readonly GoalNodeDto[]) => {
      for (const g of goals) {
        if (g.row) ids.add(g.row);
        walk(g.children);
      }
    };
    if (sel.goal.row) ids.add(sel.goal.row);
    walk(sel.goal.children);
    return ids;
  });

  public readonly selectedGoalDescendants = computed<GoalNodeDto[]>(() => {
    const sel = this.selected();
    if (!sel || sel.kind !== 'goal') return [];
    const out: GoalNodeDto[] = [];
    const walk = (goals: readonly GoalNodeDto[]) => {
      for (const g of goals) {
        out.push(g);
        walk(g.children);
      }
    };
    walk(sel.goal.children);
    return out;
  });

  public readonly selectedGoalStatusCounts = computed<
    { status: GoalStatusName; count: number }[]
  >(() => {
    const kids = this.selectedGoalDescendants();
    return GOAL_STATUS_ORDER.map((status) => ({
      status,
      count: kids.filter((k) => k.status === status).length,
    })).filter((entry) => entry.count > 0);
  });

  private initialized = false;

  constructor() {
    this.readHash();
    effect(() => {
      this.shell.refreshCount();
      if (!this.initialized) {
        this.initialized = true;
      }
      void this.load();
    });
  }

  public pinsFor(rowId: string, col: PlanColumnDto): GoalNodeDto[] {
    const view = this.data();
    if (!view) return [];
    const out: GoalNodeDto[] = [];
    const walk = (goals: readonly GoalNodeDto[]) => {
      for (const g of goals) {
        if (g.row === rowId && goalWithinRange(g, col)) out.push(g);
        walk(g.children);
      }
    };
    walk(view.goals);
    return out;
  }

  public async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    let params = new HttpParams();
    const span = this.span();
    const by = this.by();
    if (span) params = params.set('span', span);
    if (by) params = params.set('by', by);
    try {
      const view = await firstValueFrom(
        this.http.get<PlansViewDto>('/plans.json', { params }),
      );
      this.data.set(view);
      this.span.set(view.span.period);
      this.by.set(view.by);
      this.writeHash();
    } catch (err) {
      const message =
        (err as { error?: { error?: string }; message?: string })?.error
          ?.error ?? (err instanceof Error ? err.message : String(err));
      this.error.set(message || 'Could not load plans');
    } finally {
      this.loading.set(false);
    }
  }

  public go(span: string, by: PlanLevelName | string | null): void {
    this.span.set(span);
    this.by.set(by);
    this.selected.set(null);
    void this.load();
  }

  public goPrevious(): void {
    const view = this.data();
    if (view) this.go(view.previous, this.by());
  }

  public goNext(): void {
    const view = this.data();
    if (view) this.go(view.next, this.by());
  }

  public goToday(): void {
    const view = this.data();
    if (view) this.go(view.todayAt[view.span.level], this.by());
  }

  public zoomInto(col: PlanColumnDto): void {
    const nextBy = zoomByForLevel(col.level);
    if (nextBy) this.go(col.period, nextBy);
  }

  public toggleArchived(): void {
    this.archived.update((v) => !v);
    this.writeHash();
  }

  public select(selection: PlansSelection | null): void {
    this.selected.set(selection);
  }

  public syncFromHash(): void {
    const before = `${this.span()}|${this.by()}|${this.archived()}`;
    this.readHash();
    const after = `${this.span()}|${this.by()}|${this.archived()}`;
    if (after !== before) void this.load();
  }

  private readHash(): void {
    const parsed = parsePlansHash(globalThis.location?.hash ?? '');
    this.span.set(parsed.span);
    this.by.set(parsed.by);
    this.archived.set(parsed.archived);
  }

  private writeHash(): void {
    const next = formatPlansHash({
      span: this.span(),
      by: this.by(),
      archived: this.archived(),
    });
    if (globalThis.history?.replaceState) {
      globalThis.history.replaceState(null, '', next);
    }
  }
}
