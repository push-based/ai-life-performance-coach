import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  bucketOfNode,
  GRAPH_BUCKETS,
  GRAPH_MASTERY,
  GRAPH_MASTERY_RING,
  kindOfNode,
  type DistillMarkOp,
  type GraphBucketKey,
  type GraphKindKey,
  type GraphMasteryKey,
  type GraphWorkstreamStateKey,
} from '@ai-coach/vault-view-util';
import { firstValueFrom } from 'rxjs';
import {
  type BookPageDto,
  type GraphNodeDto,
  type VaultGraphDto,
} from './graph.dto.js';
import { ShellStore } from './shell.store.js';
import type { VaultNoteBodyDto } from './vault-api.dto.js';

export interface SelectedPageRef {
  chapterId: string;
  page: number;
}

export interface DistillToast {
  text: string;
  kind: 'bold' | 'highlight' | 'clear' | 'done' | 'warn';
}

@Injectable({ providedIn: 'root' })
export class GraphStore {
  private readonly http = inject(HttpClient);
  private readonly shell = inject(ShellStore);

  public readonly graph = signal<VaultGraphDto | null>(null);
  public readonly loading = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly selectedId = signal<string | null>(null);
  public readonly selectedPage = signal<SelectedPageRef | null>(null);
  public readonly focusPage = signal<SelectedPageRef | null>(null);
  public readonly toast = signal<DistillToast | null>(null);
  public readonly pageCache = signal<ReadonlyMap<string, BookPageDto>>(
    new Map(),
  );
  public readonly query = signal('');
  public readonly filtersOpen = signal(false);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

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
  public readonly openChapters = signal<ReadonlySet<string>>(new Set());

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

  public readonly readersByBook = computed<ReadonlyMap<string, GraphNodeDto[]>>(
    () => {
      const byId = this.byId();
      const out = new Map<string, GraphNodeDto[]>();
      for (const e of this.graph()?.edges ?? []) {
        const a = byId.get(e.source);
        const b = byId.get(e.target);
        if (!a || !b) continue;
        if (a.raw || a.concept || bucketOfNode(a) !== 'resources') continue;
        const book =
          b.rawRole === 'index' ? b : b.book ? byId.get(b.book) : undefined;
        if (!book) continue;
        const list = out.get(book.id) ?? [];
        if (!list.includes(a)) list.push(a);
        out.set(book.id, list);
      }
      for (const list of out.values()) {
        list.sort((x, y) => (x.title < y.title ? -1 : 1));
      }
      return out;
    },
  );

  public readonly readChapters = computed<ReadonlySet<string>>(() => {
    const byId = this.byId();
    const readers = this.readersByBook();
    const out = new Set<string>();
    for (const e of this.graph()?.edges ?? []) {
      const a = byId.get(e.source);
      const b = byId.get(e.target);
      if (a && b?.book && (readers.get(b.book) ?? []).includes(a)) {
        out.add(b.id);
      }
    }
    return out;
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

  public readonly canvasVisibleIds = computed<ReadonlySet<string>>(() => {
    const hiddenB = this.hiddenBuckets();
    const hiddenK = this.hiddenKinds();
    const hiddenP = this.hiddenPlanLevels();
    const hiddenW = this.hiddenWorkstreamStates();
    const hiddenM = this.hiddenMastery();
    const expanded = this.expandedBooks();
    const focal = this.selectedNode();

    const shown = new Set<string>();
    for (const n of this.nodes()) {
      if (n.book && !expanded.has(n.book)) continue;
      if (hiddenB.has(bucketOfNode(n))) continue;
      if (hiddenK.has(kindOfNode(n))) continue;
      if (n.planLevel && hiddenP.has(n.planLevel)) continue;
      if (
        n.workstream &&
        n.bucket === 'projects' &&
        n.workstreamStatus &&
        hiddenW.has(n.workstreamStatus)
      ) {
        continue;
      }
      if (!this.isDailyAllowed(n, focal)) continue;
      if (!n.raw && hiddenM.has(n.mastery)) continue;
      shown.add(n.id);
    }

    if (focal) {
      const keep = this.neighbourhoodOf(focal);
      for (const id of [...shown]) {
        if (!keep.has(id)) shown.delete(id);
      }
    }
    return shown;
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
      const validIds = new Set(data.nodes.map((n) => n.id));
      this.expandedBooks.update(
        (set) => new Set([...set].filter((id) => validIds.has(id))),
      );
      this.openChapters.update(
        (set) => new Set([...set].filter((id) => validIds.has(id))),
      );
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.loading.set(false);
    }
  }

  public select(id: string | null): void {
    this.selectedPage.set(null);
    this.selectedId.set(id);
  }

  public selectPage(chapterId: string, page: number): void {
    const ch = this.byId().get(chapterId);
    if (ch?.book) {
      this.expandedBooks.update((set) => {
        const next = new Set(set);
        next.add(ch.book as string);
        return next;
      });
    }
    this.openChapters.update((set) => {
      const next = new Set(set);
      next.add(chapterId);
      return next;
    });
    this.selectedId.set(chapterId);
    this.selectedPage.set({ chapterId, page });
  }

  public clearSelectedPage(): void {
    this.selectedPage.set(null);
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

  public toggleBook(bookId: string): boolean {
    const wasExpanded = this.expandedBooks().has(bookId);
    this.expandedBooks.update((set) => this.toggleInSet(set, bookId));
    if (wasExpanded) {
      const chapters = this.chaptersByBook().get(bookId) ?? [];
      this.openChapters.update((set) => {
        const next = new Set(set);
        for (const c of chapters) next.delete(c.id);
        return next;
      });
    }
    return !wasExpanded;
  }

  public toggleChapterPages(chapterId: string): boolean {
    const wasOpen = this.openChapters().has(chapterId);
    const chapter = this.byId().get(chapterId);
    this.openChapters.update((set) => {
      const next = new Set(set);
      if (wasOpen) {
        next.delete(chapterId);
        return next;
      }
      if (chapter?.book) {
        for (const sibling of this.chaptersByBook().get(chapter.book) ?? []) {
          next.delete(sibling.id);
        }
      }
      next.add(chapterId);
      return next;
    });
    return !wasOpen;
  }

  public expandBookForNode(node: GraphNodeDto): void {
    if (!node.book || this.expandedBooks().has(node.book)) return;
    this.expandedBooks.update((set) => {
      const next = new Set(set);
      next.add(node.book as string);
      return next;
    });
  }

  public isReadingEdge(a: GraphNodeDto, b: GraphNodeDto): boolean {
    const readers = this.readersByBook();
    const bookA = a.rawRole === 'index' ? a.id : a.book;
    const bookB = b.rawRole === 'index' ? b.id : b.book;
    return (
      (bookB ? (readers.get(bookB) ?? []).includes(a) : false) ||
      (bookA ? (readers.get(bookA) ?? []).includes(b) : false)
    );
  }

  public matchesQuery(n: GraphNodeDto): boolean {
    const q = this.query().trim().toLowerCase();
    return !q || (n.title + ' ' + n.id).toLowerCase().includes(q);
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

  public pageKey(chapterId: string, page: number): string {
    return `${chapterId}#${page}`;
  }

  public cachedPage(chapterId: string, page: number): BookPageDto | null {
    return this.pageCache().get(this.pageKey(chapterId, page)) ?? null;
  }

  public async loadPage(
    chapterId: string,
    page: number,
    force = false,
  ): Promise<BookPageDto | null> {
    const key = this.pageKey(chapterId, page);
    if (!force) {
      const existing = this.pageCache().get(key);
      if (existing) return existing;
    }
    const params = new HttpParams()
      .set('note', chapterId)
      .set('page', String(page));
    try {
      const data = await firstValueFrom(
        this.http.get<BookPageDto>('/page.json', { params }),
      );
      this.pageCache.update((map) => {
        const next = new Map(map);
        next.set(key, data);
        return next;
      });
      return data;
    } catch {
      return null;
    }
  }

  public openFocus(chapterId: string, page: number): void {
    this.focusPage.set({ chapterId, page });
  }

  public closeFocus(): void {
    const f = this.focusPage();
    if (!f) return;
    this.focusPage.set(null);
    this.selectPage(f.chapterId, f.page);
  }

  public stepSelectedPage(dir: 1 | -1): void {
    const cur = this.selectedPage();
    if (!cur) return;
    const next = this.adjacentPage(cur.chapterId, cur.page, dir);
    if (next) this.selectPage(next.chapterId, next.page);
  }

  public stepFocusPage(dir: 1 | -1): void {
    const cur = this.focusPage();
    if (!cur) return;
    const next = this.adjacentPage(cur.chapterId, cur.page, dir);
    if (next) this.focusPage.set(next);
  }

  public adjacentPage(
    chapterId: string,
    page: number,
    dir: 1 | -1,
  ): SelectedPageRef | null {
    const chapter = this.byId().get(chapterId);
    const pages = chapter?.distill?.pages ?? [];
    const idx = pages.findIndex((p) => p.page === page) + dir;
    if (idx >= 0 && idx < pages.length) {
      return { chapterId, page: pages[idx].page };
    }
    if (!chapter?.book) return null;
    const chapters = this.chaptersByBook().get(chapter.book) ?? [];
    const ci = chapters.findIndex((c) => c.id === chapterId) + dir;
    const nextChapter = chapters[ci];
    const nextPages = nextChapter?.distill?.pages ?? [];
    if (!nextChapter || !nextPages.length) return null;
    return {
      chapterId: nextChapter.id,
      page: dir > 0 ? nextPages[0].page : nextPages[nextPages.length - 1].page,
    };
  }

  public async markPassage(
    chapterId: string,
    page: number,
    start: number,
    end: number,
    mark: DistillMarkOp,
  ): Promise<boolean> {
    const data = this.cachedPage(chapterId, page);
    if (!data) return false;
    try {
      const res = await firstValueFrom(
        this.http.post<{ text: string }>('/api/mark', {
          note: chapterId,
          page,
          start,
          end,
          mark,
          base: data.text,
        }),
      );
      this.updateCachedPageText(chapterId, page, res.text);
      this.showToast(
        mark === 'clear'
          ? 'Marks cleared'
          : mark === 'bold'
            ? 'Bolded'
            : 'Highlighted',
        mark,
      );
      await this.load();
      return true;
    } catch (err) {
      return this.handleDistillError(chapterId, page, err);
    }
  }

  public async savePageSummary(
    chapterId: string,
    page: number,
    text: string,
  ): Promise<boolean> {
    const data = this.cachedPage(chapterId, page);
    try {
      const res = await firstValueFrom(
        this.http.post<{ text: string }>('/api/summary', {
          note: chapterId,
          page,
          text,
          base: data?.text,
        }),
      );
      this.updateCachedPageText(chapterId, page, res.text);
      this.showToast(
        text.trim() ? 'Page summary saved' : 'Page summary removed',
        'done',
      );
      await this.load();
      return true;
    } catch (err) {
      return this.handleDistillError(chapterId, page, err);
    }
  }

  public async saveChapterSummary(
    chapterId: string,
    text: string,
  ): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post<{ text: string }>('/api/summary', {
          note: chapterId,
          page: null,
          text,
        }),
      );
      const trimmed = text.trim() || null;
      this.pageCache.update((map) => {
        const next = new Map(map);
        for (const [k, v] of next) {
          if (k.startsWith(`${chapterId}#`)) {
            next.set(k, { ...v, chapterSummary: trimmed });
          }
        }
        return next;
      });
      this.showToast(
        trimmed
          ? 'Chapter summary saved — chapter complete'
          : 'Chapter summary removed',
        'done',
      );
      await this.load();
      return true;
    } catch (err) {
      const msg =
        err instanceof HttpErrorResponse
          ? ((err.error as { error?: string } | null)?.error ??
            `Could not save (${err.status})`)
          : 'Could not save';
      this.showToast(msg, 'warn');
      return false;
    }
  }

  public showToast(text: string, kind: DistillToast['kind']): void {
    this.toast.set({ text, kind });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.set(null);
      this.toastTimer = null;
    }, 2600);
  }

  private updateCachedPageText(
    chapterId: string,
    page: number,
    text: string,
  ): void {
    const key = this.pageKey(chapterId, page);
    this.pageCache.update((map) => {
      const existing = map.get(key);
      if (!existing) return map;
      const next = new Map(map);
      next.set(key, { ...existing, text });
      return next;
    });
  }

  private async handleDistillError(
    chapterId: string,
    page: number,
    err: unknown,
  ): Promise<boolean> {
    if (err instanceof HttpErrorResponse) {
      const payload = err.error as { error?: string; text?: string } | null;
      if (err.status === 409 && payload?.text !== undefined) {
        this.updateCachedPageText(chapterId, page, payload.text);
        this.showToast(
          'The page changed in Obsidian — showing the latest',
          'warn',
        );
        await this.load();
        return false;
      }
      this.showToast(
        payload?.error ?? `Could not save (${err.status})`,
        'warn',
      );
      return false;
    }
    this.showToast('Could not save', 'warn');
    return false;
  }

  private isOwnerFocus(n: GraphNodeDto | null): boolean {
    if (!n) return false;
    const b = bucketOfNode(n);
    return b === 'projects' || b === 'workstreams' || b === 'areas';
  }

  private isDailyAllowed(n: GraphNodeDto, focal: GraphNodeDto | null): boolean {
    if (n.planLevel !== 'day') return true;
    return (
      focal === n ||
      this.isOwnerFocus(focal) ||
      Boolean(focal && focal.planLevel === 'week')
    );
  }

  private neighbourhoodOf(n: GraphNodeDto): ReadonlySet<string> {
    const byId = this.byId();
    const expanded = this.expandedBooks();
    const keep = new Set<string>([n.id]);
    const book = n.rawRole === 'index' ? n.id : n.book;
    if (book) {
      keep.add(book);
      for (const c of this.chaptersByBook().get(book) ?? []) keep.add(c.id);
    }
    const projectWorkstreams =
      bucketOfNode(n) === 'projects' && n.container
        ? new Set(
            this.nodes()
              .filter(
                (w) =>
                  w.workstream &&
                  w.bucket === 'projects' &&
                  w.container === n.container,
              )
              .map((w) => w.id),
          )
        : null;

    const anchor = (
      node: GraphNodeDto | undefined,
    ): GraphNodeDto | undefined =>
      node?.book && !expanded.has(node.book) ? byId.get(node.book) : node;

    for (const e of this.graph()?.edges ?? []) {
      let a = anchor(byId.get(e.source));
      let b = anchor(byId.get(e.target));
      if (a && b && this.isReadingEdge(a, b)) {
        if (b.book) b = byId.get(b.book);
        if (a.book) a = byId.get(a.book);
      }
      if (!a || !b || a === b) continue;
      if (a.id === n.id) keep.add(b.id);
      if (b.id === n.id) keep.add(a.id);
      if (projectWorkstreams) {
        if (projectWorkstreams.has(a.id) && b.planLevel === 'day') {
          keep.add(a.id);
          keep.add(b.id);
        }
        if (projectWorkstreams.has(b.id) && a.planLevel === 'day') {
          keep.add(b.id);
          keep.add(a.id);
        }
      }
    }
    return keep;
  }

  private toggleInSet<T>(set: ReadonlySet<T>, key: T): ReadonlySet<T> {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }
}
