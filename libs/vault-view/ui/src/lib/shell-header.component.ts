import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { ThemeMode } from '@ai-coach/vault-view-util';

export interface ShellNavItem {
  label: string;
  route: string;
  title: string;
}

@Component({
  selector: 'vv-shell-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="glass vv-header">
      <div class="brand">
        <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
          <rect
            x="1"
            y="1"
            width="32"
            height="32"
            rx="10"
            fill="var(--accent-soft)"
            stroke="var(--accent)"
            stroke-opacity=".5"
          />
          <path
            d="M10 22 L17 11 L24 20"
            fill="none"
            stroke="var(--line-strong)"
            stroke-width="1.6"
          />
          <circle cx="10" cy="22" r="3.2" fill="var(--inbox)" />
          <rect
            x="14"
            y="8"
            width="6"
            height="6"
            rx="1.6"
            fill="var(--complete)"
          />
          <path
            d="M24 16.2 L27.6 19.8 L24 23.4 L20.4 19.8 Z"
            fill="var(--highlight)"
          />
        </svg>
        <div>
          <h1>{{ title() }}</h1>
          <p>{{ subtitle() }}</p>
        </div>
      </div>

      <div class="spacer"></div>

      <nav class="nav" aria-label="Vault views">
        @for (item of navItems(); track item.route) {
          <a
            class="icon-btn"
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.route === '/' }"
            [title]="item.title"
          >
            <span class="txt">{{ item.label }}</span>
          </a>
        }
      </nav>

      <button
        class="icon-btn"
        type="button"
        [attr.aria-pressed]="present()"
        title="Presentation mode (P)"
        (click)="presentToggle.emit()"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </svg>
        <span class="txt hide-present">Present</span>
      </button>

      <button
        class="icon-btn"
        type="button"
        [title]="theme() === 'dark' ? 'Switch to light' : 'Switch to dark'"
        (click)="themeToggle.emit()"
      >
        @if (theme() === 'dark') {
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3v2M12 19v2M5 5l1.4 1.4M17.6 17.6 19 19M3 12h2M19 12h2M5 19l1.4-1.4M17.6 6.4 19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"
            />
          </svg>
        } @else {
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        }
      </button>

      <button
        class="icon-btn"
        type="button"
        title="Reload the vault"
        (click)="refreshClick.emit()"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M20 11a8 8 0 0 0-14.9-3.9M4 4v4h4M4 13a8 8 0 0 0 14.9 3.9M20 20v-4h-4"
          />
        </svg>
      </button>
    </header>
  `,
  styles: `
    .vv-header {
      position: fixed;
      top: 16px;
      left: 16px;
      right: 16px;
      height: 60px;
      z-index: 5;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 12px 0 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .brand h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 650;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .brand p {
      margin: 0;
      font-size: 12px;
      color: var(--muted);
      white-space: nowrap;
    }
    .spacer {
      flex: 1;
    }
    .nav {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .icon-btn.active {
      background: var(--accent-soft);
      border-color: var(--accent);
      color: var(--accent);
    }
  `,
})
export class ShellHeaderComponent {
  readonly title = input<string>('Vault view');
  readonly subtitle = input<string>('Second brain');
  readonly theme = input<ThemeMode>('dark');
  readonly present = input<boolean>(false);
  readonly navItems = input<ShellNavItem[]>([
    { label: 'Graph', route: '/', title: 'Vault link graph' },
    { label: 'Plans', route: '/plans', title: 'Plans: goals and effort' },
    { label: 'Climb', route: '/climb', title: 'Climb: seven learning steps' },
  ]);

  readonly themeToggle = output<void>();
  readonly presentToggle = output<void>();
  readonly refreshClick = output<void>();
}
