import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  type BoardDrawingDto,
  type ClimbBookDto,
  type ClimbConceptDto,
  type ClimbViewDto,
  type GenerateMarkInputDto,
  type GenerateResultDto,
  type RevealResultDto,
  type SketchResultDto,
  type StructureDto,
  type StructurePreviewDto,
} from './climb.dto.js';
import { ShellStore } from './shell.store.js';

export type ClimbTab = 'stairs' | 'draw' | 'sketch';
export type DrawMode = 'memory' | 'structure';

@Injectable({ providedIn: 'root' })
export class ClimbStore {
  private readonly http = inject(HttpClient);
  private readonly shell = inject(ShellStore);

  public readonly data = signal<ClimbViewDto | null>(null);
  public readonly tab = signal<ClimbTab>('stairs');
  public readonly book = signal<string | null>(null);
  public readonly selected = signal<string | null>(null);
  public readonly mode = signal<DrawMode>('memory');
  public readonly error = signal<string | null>(null);

  public readonly bookData = computed<ClimbBookDto | null>(() => {
    const view = this.data();
    const current = this.book();
    if (!view || !current) return null;
    return view.books.find((b) => b.book === current) ?? null;
  });

  public readonly filteredConcepts = computed<ClimbConceptDto[]>(() => {
    const view = this.data();
    if (!view) return [];
    const b = this.bookData();
    const current = this.book();
    if (b && b.kind === 'topic') {
      return view.concepts.filter((c) =>
        b.concepts.some((x) => x.path === c.path),
      );
    }
    return view.concepts.filter(
      (c) => !current || (c.books ?? [c.book]).includes(current),
    );
  });

  public readonly selectedConcept = computed<ClimbConceptDto | null>(() => {
    const view = this.data();
    const sel = this.selected();
    if (!view || !sel) return null;
    return view.concepts.find((c) => c.path === sel) ?? null;
  });

  public readonly sketchTargets = computed<{ value: string; label: string }[]>(
    () => {
      const view = this.data();
      if (!view) return [];
      return [
        ...view.books.map((b) => ({ value: b.book, label: `Book: ${b.book}` })),
        ...view.concepts.map((c) => ({ value: c.path, label: c.title })),
      ];
    },
  );

  constructor() {
    const hashNote = new URLSearchParams(
      (globalThis.location?.hash ?? '').slice(1),
    ).get('note');
    if (hashNote) this.selected.set(hashNote);

    effect(() => {
      this.shell.refreshCount();
      void this.load();
    });
  }

  public async load(): Promise<void> {
    this.error.set(null);
    try {
      const view = await firstValueFrom(
        this.http.get<ClimbViewDto>('/climb.json'),
      );
      this.data.set(view);
      const bookNames = view.books.map((b) => b.book);
      const currentBook = this.book();
      if (!currentBook || !bookNames.includes(currentBook)) {
        this.book.set(bookNames[0] ?? null);
      }
      const currentSel = this.selected();
      if (!currentSel || !view.concepts.some((c) => c.path === currentSel)) {
        const list = this.filteredConcepts();
        this.selected.set(list[0]?.path ?? view.concepts[0]?.path ?? null);
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : String(err));
    }
  }

  public setTab(tab: ClimbTab): void {
    this.tab.set(tab);
  }

  public setMode(mode: DrawMode): void {
    this.mode.set(mode);
  }

  public selectBook(book: string): void {
    this.book.set(book);
    const first = this.filteredConcepts()[0];
    if (first) this.selected.set(first.path);
  }

  public selectConcept(path: string): void {
    this.selected.set(path);
  }

  public addTopic(rawName: string): void {
    const name = rawName.trim();
    const view = this.data();
    if (!name || !view) return;
    if (!view.books.some((b) => b.book === name)) {
      const topic: ClimbBookDto = {
        book: name,
        kind: 'topic',
        concepts: [],
        candidates: view.concepts.map((c) => ({
          path: c.path,
          title: c.title,
        })),
        structure: null,
      };
      this.data.set({ ...view, books: [topic, ...view.books] });
    }
    this.book.set(name);
    this.mode.set('structure');
  }

  public async fetchStructure(book: string): Promise<StructureDto | null> {
    const params = new HttpParams().set('book', book);
    try {
      return await firstValueFrom(
        this.http.get<StructureDto>('/structure.json', { params }),
      );
    } catch {
      return null;
    }
  }

  public async postStructure(
    drawing: BoardDrawingDto,
    execute?: boolean,
    versions?: Record<string, string>,
  ): Promise<StructurePreviewDto> {
    return this.postJson<StructurePreviewDto>('/api/structure', {
      ...this.targetBody(),
      ...drawing,
      ...(execute ? { execute: true, versions } : {}),
    });
  }

  public async postReveal(
    drawing: BoardDrawingDto,
    idk: boolean,
  ): Promise<{ ok: boolean; data: RevealResultDto }> {
    try {
      const data = await firstValueFrom(
        this.http.post<RevealResultDto>('/api/reveal', {
          ...this.targetBody(),
          ...drawing,
          idk,
        }),
      );
      return { ok: true, data };
    } catch (err) {
      const payload = (err as { error?: RevealResultDto })?.error ?? {
        id: '',
        attempted_at: '',
        revealed_at: '',
        structure: { groups: [], buildsOn: [] },
        marks: [],
        error: 'could not reveal',
      };
      return { ok: false, data: payload };
    }
  }

  public async postGenerate(
    id: string,
    marks: GenerateMarkInputDto[],
    execute?: boolean,
  ): Promise<GenerateResultDto> {
    return this.postJson<GenerateResultDto>('/api/generate', {
      id,
      marks,
      ...(execute ? { execute: true } : {}),
    });
  }

  public async postSketch(
    target: string,
    png: string,
    execute?: boolean,
  ): Promise<SketchResultDto> {
    return this.postJson<SketchResultDto>('/api/sketch', {
      target,
      png,
      ...(execute ? { execute: true } : {}),
    });
  }

  private targetBody(): { topic: string } | { book: string | null } {
    const b = this.bookData();
    return b && b.kind === 'topic' ? { topic: b.book } : { book: this.book() };
  }

  private async postJson<T extends { errors?: string[] }>(
    url: string,
    body: unknown,
  ): Promise<T> {
    try {
      return await firstValueFrom(this.http.post<T>(url, body));
    } catch (err) {
      const payload = (err as { error?: T })?.error;
      if (payload && typeof payload === 'object') return payload;
      return {
        errors: [err instanceof Error ? err.message : String(err)],
      } as T;
    }
  }
}
