import { Injectable, signal } from '@angular/core';
import {
  hasPresentQuery,
  readStoredTheme,
  resolveInitialTheme,
  writeStoredTheme,
  type ThemeMode,
} from '@ai-coach/vault-view-util';

@Injectable({ providedIn: 'root' })
export class ShellStore {
  readonly theme = signal<ThemeMode>('dark');
  readonly present = signal(false);
  readonly refreshCount = signal(0);

  init(): void {
    const search = globalThis.location?.search ?? '';
    const initial = resolveInitialTheme(search, readStoredTheme());
    this.setTheme(initial, false);
    if (hasPresentQuery(search)) this.setPresent(true);
  }

  setTheme(mode: ThemeMode, persist = true): void {
    this.theme.set(mode);
    if (globalThis.document?.documentElement) {
      globalThis.document.documentElement.dataset['theme'] = mode;
    }
    if (persist) writeStoredTheme(mode);
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark', true);
  }

  setPresent(active: boolean): void {
    this.present.set(active);
    if (globalThis.document?.body) {
      globalThis.document.body.classList.toggle('present', active);
    }
  }

  togglePresent(): void {
    this.setPresent(!this.present());
  }

  triggerRefresh(): void {
    this.refreshCount.update((c) => c + 1);
  }
}
