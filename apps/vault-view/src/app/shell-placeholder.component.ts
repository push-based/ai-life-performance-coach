import { Component, input } from '@angular/core';
import {
  GlassCardComponent,
  StatusPillComponent,
} from '@ai-coach/vault-view-ui';

@Component({
  selector: 'vault-shell-placeholder',
  imports: [GlassCardComponent, StatusPillComponent],
  template: `
    <div class="placeholder">
      <vault-glass-card [heading]="section()">
        <p class="copy">{{ description() }}</p>
        <vault-status-pill
          label="Angular shell ready"
          color="var(--complete)"
        />
      </vault-glass-card>
    </div>
  `,
  styles: `
    .placeholder {
      max-width: 520px;
      margin: 120px auto 0;
      padding: 0 16px;
    }
    .copy {
      margin: 0 0 14px;
      color: var(--muted);
    }
  `,
})
export class ShellPlaceholderComponent {
  readonly section = input<string>('Vault');
  readonly description = input<string>('');
}
