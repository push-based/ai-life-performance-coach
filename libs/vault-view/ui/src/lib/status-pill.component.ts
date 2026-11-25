import { Component, input } from '@angular/core';

@Component({
  selector: 'vault-status-pill',
  template: `
    <span
      class="vault-pill"
      [style.color]="color()"
      [style.border-color]="color()"
      [style.background]="
        'color-mix(in srgb, ' + color() + ' 12%, transparent)'
      "
    >
      {{ label() }}
    </span>
  `,
  styles: `
    .vault-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid;
    }
  `,
})
export class StatusPillComponent {
  readonly label = input.required<string>();
  readonly color = input<string>('var(--accent)');
}
