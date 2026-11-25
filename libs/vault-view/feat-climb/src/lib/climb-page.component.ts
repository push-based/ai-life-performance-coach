import { Component, inject, signal } from '@angular/core';
import { ClimbStore, ShellStore } from '@ai-coach/vault-view-data-access';
import { isGlobalShortcut } from '@ai-coach/vault-view-util';
import { ClimbDrawTabComponent } from './climb-draw-tab.component.js';
import { ClimbSketchTabComponent } from './climb-sketch-tab.component.js';
import { ClimbStairsTabComponent } from './climb-stairs-tab.component.js';

@Component({
  selector: 'vault-climb-page',
  imports: [
    ClimbStairsTabComponent,
    ClimbDrawTabComponent,
    ClimbSketchTabComponent,
  ],
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    <div class="vault-climb-shell">
      <div class="vault-climb-bar">
        <span class="group-btns hide-present">
          <button
            type="button"
            class="btn"
            [attr.aria-pressed]="store.tab() === 'stairs'"
            (click)="store.setTab('stairs')"
          >
            Stairs
          </button>
          <button
            type="button"
            class="btn"
            [attr.aria-pressed]="store.tab() === 'draw'"
            (click)="store.setTab('draw')"
          >
            Draw
          </button>
          <button
            type="button"
            class="btn"
            [attr.aria-pressed]="store.tab() === 'sketch'"
            (click)="store.setTab('sketch')"
          >
            Sketch
          </button>
        </span>

        @if (store.data()?.books?.length) {
          <select
            class="hide-present"
            title="Book"
            [value]="store.book() ?? ''"
            (change)="store.selectBook($any($event.target).value)"
          >
            @for (b of store.data()!.books; track b.book) {
              <option [value]="b.book">
                {{ b.kind === 'topic' ? 'Topic: ' + b.book : b.book }}
              </option>
            }
          </select>
        }

        <span class="spacer"></span>

        @if (store.tab() === 'stairs') {
          <button
            type="button"
            class="btn"
            title="Draw the stairs one step at a time (A)"
            (click)="triggerAnimate()"
          >
            Animate
          </button>
        }
      </div>

      @if (store.error(); as err) {
        <div class="error">{{ err }}</div>
      } @else if (store.data(); as view) {
        <div class="vault-climb-body">
          @if (store.tab() === 'stairs') {
            <vault-climb-stairs-tab
              [concepts]="store.filteredConcepts()"
              [selectedConcept]="store.selectedConcept()"
              [selectedPath]="store.selected()"
              [book]="store.book()"
              [vaultName]="view.vaultName"
              [animateTick]="animateTick()"
              (conceptSelect)="store.selectConcept($event)"
            />
          } @else if (store.tab() === 'draw') {
            <vault-climb-draw-tab />
          } @else {
            <vault-climb-sketch-tab />
          }
        </div>
      }
    </div>
  `,
  styles: `
    .vault-climb-shell {
      display: flex;
      flex-direction: column;
      height: 100vh;
      padding-top: 84px;
    }
    .vault-climb-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding: 10px 18px;
      border-bottom: 1px solid var(--line);
      background: var(--panel);
    }
    .group-btns {
      display: inline-flex;
      gap: 4px;
    }
    .spacer {
      flex: 1;
    }
    .btn {
      border: 1px solid var(--line-strong);
      background: var(--raised);
      border-radius: 8px;
      padding: 5px 10px;
      cursor: pointer;
      color: inherit;
      font: inherit;
    }
    .btn:hover {
      background: var(--raised-2);
    }
    .btn[aria-pressed='true'] {
      background: var(--accent-soft);
      border-color: var(--accent);
    }
    select {
      background: var(--raised);
      border: 1px solid var(--line-strong);
      border-radius: 8px;
      padding: 5px 8px;
      color: inherit;
      font: inherit;
    }
    .vault-climb-body {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
    .error {
      padding: 24px;
      color: var(--wrong);
    }
  `,
})
export class ClimbPageComponent {
  public readonly store = inject(ClimbStore);
  private readonly shell = inject(ShellStore);
  public readonly animateTick = signal(0);

  public triggerAnimate(): void {
    this.animateTick.update((n) => n + 1);
  }

  public onKeydown(ev: KeyboardEvent): void {
    const path = ev.composedPath ? ev.composedPath() : [ev.target];
    if (
      path.some(
        (n) =>
          n instanceof Element &&
          n.matches(
            'input,textarea,select,[contenteditable],vault-climb-board',
          ),
      )
    ) {
      return;
    }
    if (!isGlobalShortcut(ev)) return;
    if ((ev.key === 'p' || ev.key === 'P') && this.store.tab() !== 'stairs') {
      this.store.setTab('stairs');
      this.shell.setPresent(true);
      return;
    }
    if ((ev.key === 'a' || ev.key === 'A') && this.store.tab() === 'stairs') {
      this.triggerAnimate();
      return;
    }
    if (
      this.store.tab() === 'stairs' &&
      (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')
    ) {
      const list = this.store.filteredConcepts();
      const idx = list.findIndex((c) => c.path === this.store.selected());
      const next =
        list[
          Math.max(
            0,
            Math.min(list.length - 1, idx + (ev.key === 'ArrowDown' ? 1 : -1)),
          )
        ];
      if (next) {
        this.store.selectConcept(next.path);
        ev.preventDefault();
      }
    }
  }
}
