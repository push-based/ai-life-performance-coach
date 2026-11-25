import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  GlassCardComponent,
  StatusPillComponent,
} from '@ai-coach/vault-view-ui';

@Component({
  selector: 'vv-shell-placeholder',
  imports: [GlassCardComponent, StatusPillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="placeholder">
      <vv-glass-card [heading]="section()">
        <p class="copy">{{ description() }}</p>
        <vv-status-pill label="Angular shell ready" color="var(--complete)" />
      </vv-glass-card>
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
  private readonly route = inject(ActivatedRoute);
  readonly section = () =>
    String(this.route.snapshot.data['section'] ?? 'Vault view');
  readonly description = () =>
    String(this.route.snapshot.data['description'] ?? '');
}
