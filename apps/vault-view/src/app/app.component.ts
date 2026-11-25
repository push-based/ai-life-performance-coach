import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type OnInit,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShellStore } from '@ai-coach/vault-view-data-access';
import { ShellHeaderComponent } from '@ai-coach/vault-view-ui';
import { isGlobalShortcut } from '@ai-coach/vault-view-util';

@Component({
  selector: 'vv-root',
  imports: [RouterOutlet, ShellHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    <vv-shell-header
      [theme]="shell.theme()"
      [present]="shell.present()"
      (themeToggle)="shell.toggleTheme()"
      (presentToggle)="shell.togglePresent()"
      (refreshClick)="shell.triggerRefresh()"
    />
    <main class="vv-main">
      <router-outlet />
    </main>
  `,
  styles: `
    .vv-main {
      min-height: 100vh;
    }
  `,
})
export class AppComponent implements OnInit {
  readonly shell = inject(ShellStore);

  ngOnInit(): void {
    this.shell.init();
  }

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
