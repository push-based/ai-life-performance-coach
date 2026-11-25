import { effect, Injectable, signal } from '@angular/core';
import {
  hasPresentQuery,
  readStoredTheme,
  resolveInitialTheme,
  writeStoredTheme,
  type ThemeMode,
} from '@ai-coach/vault-view-util';

@Injectable({ providedIn: 'root' })
export class ShellStore {
  readonly theme = signal<ThemeMode>(
    resolveInitialTheme(globalThis.location?.search ?? '', readStoredTheme()),
  );
  readonly present = signal<boolean>(
    hasPresentQuery(globalThis.location?.search ?? ''),
  );
  readonly refreshCount = signal(0);

  constructor() {
    effect(() => {
      const mode = this.theme();
      if (globalThis.document?.documentElement) {
        globalThis.document.documentElement.dataset['theme'] = mode;
      }
    });
    effect(() => {
      const active = this.present();
      if (globalThis.document?.body) {
        globalThis.document.body.classList.toggle('present', active);
      }
    });
  }

  setTheme(mode: ThemeMode, persist = true): void {
    this.theme.set(mode);
    if (persist) writeStoredTheme(mode);
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark', true);
  }

  setPresent(active: boolean): void {
    this.present.set(active);
  }

  togglePresent(): void {
    this.present.update((active) => !active);
  }

  triggerRefresh(): void {
    this.refreshCount.update((c) => c + 1);
  }
}
