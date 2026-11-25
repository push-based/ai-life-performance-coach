import { Component, input } from '@angular/core';

@Component({
  selector: 'vault-glass-card',
  template: `
    <section class="glass vault-card">
      @if (heading()) {
        <h3>{{ heading() }}</h3>
      }
      <ng-content />
    </section>
  `,
  styles: `
    .vault-card {
      padding: 20px 20px 22px;
    }
    h3 {
      margin: 0 0 12px;
      font-size: 11px;
      font-weight: 650;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: var(--faint);
    }
  `,
})
export class GlassCardComponent {
  readonly heading = input<string>('');
}
