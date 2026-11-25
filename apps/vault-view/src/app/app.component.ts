import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShellStore } from '@ai-coach/vault-view-data-access';
import { ShellHeaderComponent } from '@ai-coach/vault-view-ui';
import { isGlobalShortcut } from '@ai-coach/vault-view-util';

@Component({
  selector: 'vault-root',
  imports: [RouterOutlet, ShellHeaderComponent],
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    <vault-shell-header
      [theme]="shell.theme()"
      [present]="shell.present()"
      (themeToggle)="shell.toggleTheme()"
      (presentToggle)="shell.togglePresent()"
      (refreshClick)="shell.triggerRefresh()"
    />
    <main class="vault-main">
      <router-outlet />
    </main>
  `,
  styles: `
    .vault-main {
      min-height: 100vh;
    }
  `,
})
export class AppComponent {
  readonly shell = inject(ShellStore);

  onKeydown(ev: KeyboardEvent): void {
    if (!isGlobalShortcut(ev)) return;
    if (ev.key === 'p' || ev.key === 'P') {
      ev.preventDefault();
      this.shell.togglePresent();
    } else if (ev.key === 'Escape' && this.shell.present()) {
      ev.preventDefault();
      this.shell.setPresent(false);
    }
  }
}
