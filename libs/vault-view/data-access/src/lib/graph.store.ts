import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  bucketOfNode,
  GRAPH_BUCKETS,
  GRAPH_MASTERY,
  GRAPH_MASTERY_RING,
  kindOfNode,
  type GraphBucketKey,
  type GraphKindKey,
  type GraphMasteryKey,
  type GraphWorkstreamStateKey,
} from '@ai-coach/vault-view-util';
import { firstValueFrom } from 'rxjs';
import { type GraphNodeDto, type VaultGraphDto } from './graph.dto.js';
import { ShellStore } from './shell.store.js';
import type { VaultNoteBodyDto } from './vault-api.dto.js';

@Injectable({ providedIn: 'root' })
export class GraphStore {
  private readonly http = inject(HttpClient);
  private readonly shell = inject(ShellStore);

  public readonly graph = signal<VaultGraphDto | null>(null);
  public readonly loading = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly selectedId = signal<string | null>(null);
  public readonly query = signal('');
  public readonly filtersOpen = signal(true);

  public readonly hiddenBuckets = signal<ReadonlySet<GraphBucketKey>>(
    new Set(['archive']),
  );
  public readonly hiddenKinds = signal<ReadonlySet<GraphKindKey>>(new Set());
  public readonly hiddenPlanLevels = signal<ReadonlySet<string>>(new Set());
  public readonly hiddenWorkstreamStates = signal<
    ReadonlySet<GraphWorkstreamStateKey>
  >(new Set());
  public readonly hiddenMastery = signal<ReadonlySet<GraphMasteryKey>>(
    new Set(),
  );
  public readonly expandedBooks = signal<ReadonlySet<string>>(new Set());

  public readonly nodes = computed<GraphNodeDto[]>(
    () => this.graph()?.nodes ?? [],
  );

  public readonly byId = computed<ReadonlyMap<string, GraphNodeDto>>(
    () => new Map(this.nodes().map((n) => [n.id, n])),
  );

  public readonly chaptersByBook = computed<
    ReadonlyMap<string, GraphNodeDto[]>
  >(() => {
    const map = new Map<string, GraphNodeDto[]>();
    for (const n of this.nodes()) {
      if (!n.book) continue;
      const list = map.get(n.book) ?? [];
      list.push(n);
      map.set(n.book, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.id < b.id ? -1 : 1));
    }
    return map;
  });

  public readonly adjacency = computed<ReadonlyMap<string, Set<string>>>(() => {
    const adj = new Map<string, Set<string>>();
    const touch = (a: string, b: string) => {
      let set = adj.get(a);
      if (!set) {
        set = new Set();
        adj.set(a, set);
      }
      set.add(b);
    };
    for (const e of this.graph()?.edges ?? []) {
      if (e.source === e.target) continue;
      touch(e.source, e.target);
      touch(e.target, e.source);
    }
    return adj;
  });

  public readonly selectedNode = computed<GraphNodeDto | null>(() => {
    const id = this.selectedId();
    return id ? (this.byId().get(id) ?? null) : null;
  });

  public readonly selectedNeighbors = computed<GraphNodeDto[]>(() => {
    const sel = this.selectedNode();
    if (!sel) return [];
    const byId = this.byId();
    return [...(this.adjacency().get(sel.id) ?? [])]
      .map((id) => byId.get(id))
      .filter((n): n is GraphNodeDto => Boolean(n));
  });

  public readonly books = computed(() =>
    this.nodes().filter((n) => n.rawRole === 'index'),
  );

  public readonly concepts = computed(() =>
    this.nodes().filter((n) => n.concept),
  );

  public readonly sparrable = computed(() =>
    this.nodes().filter((n) => n.bucket === 'resources' && !n.raw),
  );

  public readonly visibleNodes = computed<GraphNodeDto[]>(() => {
    const hiddenB = this.hiddenBuckets();
    const hiddenK = this.hiddenKinds();
    const hiddenP = this.hiddenPlanLevels();
    const hiddenW = this.hiddenWorkstreamStates();
    const hiddenM = this.hiddenMastery();
    const q = this.query().trim().toLowerCase();
    return this.nodes().filter((n) => {
      if (hiddenB.has(bucketOfNode(n))) return false;
      if (hiddenK.has(kindOfNode(n))) return false;
      if (n.planLevel && hiddenP.has(n.planLevel)) return false;
      if (
        n.workstream &&
        n.bucket === 'projects' &&
        n.workstreamStatus &&
        hiddenW.has(n.workstreamStatus)
      ) {
        return false;
      }
      if (!n.raw && hiddenM.has(n.mastery)) return false;
      if (q && !(n.title + ' ' + n.id).toLowerCase().includes(q)) return false;
      return true;
    });
  });

  public readonly bucketStats = computed(() =>
    GRAPH_BUCKETS.map(([key, name]) => ({
      key,
      name,
      value: this.nodes().filter((n) => bucketOfNode(n) === key).length,
      color: `var(--${key})`,
    })),
  );

  public readonly masteryStats = computed(() =>
    GRAPH_MASTERY.map(([key, name]) => ({
      key,
      name,
      value: this.sparrable().filter((n) => n.mastery === key).length,
      color: GRAPH_MASTERY_RING[key] ?? 'var(--untouched)',
    })),
  );

  constructor() {
    const hash = new URLSearchParams(
      (globalThis.location?.hash ?? '').slice(1),
    );
    const open = hash.get('open');
    if (open) this.selectedId.set(open);

    effect(() => {
      this.shell.refreshCount();
      void this.load();
    });
  }

  public async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await firstValueFrom(
        this.http.get<VaultGraphDto>('/graph.json'),
      );
      this.graph.set(data);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.loading.set(false);
    }
  }

  public select(id: string | null): void {
    this.selectedId.set(id);
  }

  public setQuery(value: string): void {
    this.query.set(value);
  }

  public toggleFilters(): void {
    this.filtersOpen.update((v) => !v);
  }

  public toggleBucket(key: GraphBucketKey): void {
    this.hiddenBuckets.update((set) => this.toggleInSet(set, key));
  }

  public toggleKind(key: GraphKindKey): void {
    this.hiddenKinds.update((set) => this.toggleInSet(set, key));
  }

  public togglePlanLevel(key: string): void {
    this.hiddenPlanLevels.update((set) => this.toggleInSet(set, key));
  }

  public toggleWorkstreamState(key: GraphWorkstreamStateKey): void {
    this.hiddenWorkstreamStates.update((set) => this.toggleInSet(set, key));
  }

  public toggleMastery(key: GraphMasteryKey): void {
    this.hiddenMastery.update((set) => this.toggleInSet(set, key));
  }

  public toggleBook(bookId: string): void {
    this.expandedBooks.update((set) => this.toggleInSet(set, bookId));
  }

  public bookCounts(bookId: string): {
    chapters: GraphNodeDto[];
    total: number;
    complete: number;
    progress: number;
    untouched: number;
  } {
    const chapters = this.chaptersByBook().get(bookId) ?? [];
    const complete = chapters.filter(
      (c) => c.distill?.state === 'complete',
    ).length;
    const progress = chapters.filter(
      (c) => c.distill?.state === 'in_progress',
    ).length;
    return {
      chapters,
      total: chapters.length,
      complete,
      progress,
      untouched: chapters.length - complete - progress,
    };
  }

  public resolveTarget(target: string): GraphNodeDto | null {
    const t = target.split('#')[0].trim();
    if (!t) return null;
    const path = t.endsWith('.md') ? t : `${t}.md`;
    const direct = this.byId().get(path);
    if (direct) return direct;
    const all = this.nodes();
    return (
      all.find((n) => n.id.endsWith(`/${path}`) || n.id === path) ??
      all.find((n) => n.title === t) ??
      null
    );
  }

  public async fetchNoteBody(noteId: string): Promise<VaultNoteBodyDto | null> {
    const params = new HttpParams().set('note', noteId);
    try {
      return await firstValueFrom(
        this.http.get<VaultNoteBodyDto>('/note.json', { params }),
      );
    } catch {
      return null;
    }
  }

  private toggleInSet<T>(set: ReadonlySet<T>, key: T): ReadonlySet<T> {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }
}
