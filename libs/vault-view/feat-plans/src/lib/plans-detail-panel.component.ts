import { Component, computed, input, output } from '@angular/core';
import type {
  GoalNodeDto,
  PlanColumnDto,
  PlanTaskRefDto,
  PlansSelection,
} from '@ai-coach/vault-view-data-access';
import {
  goalDisplayText,
  graphNoteHref,
  obsidianUri,
  stripWikilinks,
  type GoalStatusName,
} from '@ai-coach/vault-view-util';

@Component({
  selector: 'vault-plans-detail-panel',
  template: `
    <aside class="vault-detail">
      <button
        type="button"
        class="btn close"
        title="Close (Esc)"
        (click)="closed.emit()"
      >
        ×
      </button>

      @if (selection(); as sel) {
        @if (sel.kind === 'goal') {
          <h3>{{ goalWords(sel.goal.text) }}</h3>
          @if (ownerOf(sel.goal); as owner) {
            <div class="owner">for {{ owner }}</div>
          }
          <div class="muted">
            {{ sel.goal.level }} goal · {{ sel.goal.period }} ·
            {{ sel.goal.status }}
          </div>
          @if (sel.goal.slipped.length) {
            <div class="vault-tag slip">
              slipped from {{ sel.goal.slipped.join(', ') }}
            </div>
          }
          <span class="links">
            <a [href]="obsidianHref(sel.goal.note)">Open in Obsidian</a>
            <a [href]="graphHref(sel.goal.note)">Show in graph</a>
          </span>

          <h2>Goals serving it</h2>
          @if (descendants().length) {
            <div class="muted">{{ statusSummary() }}</div>
            <ul>
              @for (kid of descendants(); track kid.note + ':' + kid.text) {
                <li>
                  <div>
                    <span class="dot" [class]="kid.status"></span>
                    {{ goalWords(kid.text) }}
                    @if (ownerOf(kid); as kOwner) {
                      <span class="owner inline">{{ kOwner }}</span>
                    }
                  </div>
                  <div class="meta">
                    <span class="vault-tag">{{ kid.period }}</span>
                    @if (kid.slipped.length) {
                      <span class="vault-tag slip"
                        >↻{{ kid.slipped.length }}</span
                      >
                    }
                  </div>
                </li>
              }
            </ul>
          } @else {
            <div class="faint">None yet.</div>
          }
        } @else {
          <h3>
            {{
              sel.row.kind === 'workstream'
                ? sel.row.project + ' → ' + sel.row.name
                : sel.row.name
            }}
          </h3>
          <div class="muted">{{ rowSubtitle() }}</div>
          @if (rowDeadlineText(); as dl) {
            <div class="muted">{{ dl }}</div>
          }
          @if (sel.row.note; as note) {
            <span class="links">
              <a [href]="obsidianHref(note)">Open in Obsidian</a>
              <a [href]="graphHref(note)">Show in graph</a>
            </span>
          }

          <h2>Done · {{ doneWeight() }} weight</h2>
          @if (doneTasks().length) {
            <ul>
              @for (
                t of doneTasks();
                track t.note + ':' + t.text + ':' + t.column
              ) {
                <li>
                  <div class="state-done">{{ plainText(t.text) }}</div>
                  <div class="meta">
                    @if (t.size) {
                      <span class="vault-tag">{{ t.size }}</span>
                    }
                    @if (t.doneOn) {
                      <span class="vault-tag">✅ {{ t.doneOn }}</span>
                    } @else if (t.scheduled) {
                      <span class="vault-tag">⏳ {{ t.scheduled }}</span>
                    }
                    @if (t.slipped.length) {
                      <span class="vault-tag slip"
                        >↻ {{ t.slipped.join(', ') }}</span
                      >
                    }
                  </div>
                  <span class="links">
                    <a [href]="obsidianHref(t.note)">Open in Obsidian</a>
                    <a [href]="graphHref(t.note)">Show in graph</a>
                  </span>
                </li>
              }
            </ul>
          } @else {
            <div class="faint">Nothing done here.</div>
          }

          <h2>Planned · {{ openWeight() }} weight</h2>
          @if (openTasks().length) {
            <ul>
              @for (
                t of openTasks();
                track t.note + ':' + t.text + ':' + t.column
              ) {
                <li>
                  <div>{{ plainText(t.text) }}</div>
                  <div class="meta">
                    @if (t.size) {
                      <span class="vault-tag">{{ t.size }}</span>
                    }
                    @if (t.scheduled) {
                      <span class="vault-tag">⏳ {{ t.scheduled }}</span>
                    }
                    @if (t.slipped.length) {
                      <span class="vault-tag slip"
                        >↻ {{ t.slipped.join(', ') }}</span
                      >
                    }
                  </div>
                  <span class="links">
                    <a [href]="obsidianHref(t.note)">Open in Obsidian</a>
                    <a [href]="graphHref(t.note)">Show in graph</a>
                  </span>
                </li>
              }
            </ul>
          } @else {
            <div class="faint">Nothing scheduled here.</div>
          }

          @if (sel.row.packets.length) {
            <h2>Intermediate Packets</h2>
            <ul>
              @for (packet of sel.row.packets; track packet.path) {
                <li>
                  <div>{{ packet.title }}</div>
                  <span class="links">
                    <a [href]="obsidianHref(packet.path)">Open in Obsidian</a>
                    <a [href]="graphHref(packet.path)">Show in graph</a>
                  </span>
                </li>
              }
            </ul>
          }
        }
      }
    </aside>
  `,
  styles: `
    .vault-detail {
      overflow: auto;
      height: 100%;
      border-left: 1px solid var(--line);
      background: var(--panel);
      padding: 16px 18px 24px;
    }
    h3 {
      margin: 0 0 4px;
      font-size: 16px;
    }
    h2 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin: 16px 0 8px;
    }
    .close {
      float: right;
    }
    .btn {
      border: 1px solid var(--line-strong);
      background: var(--raised);
      border-radius: 8px;
      padding: 4px 10px;
      cursor: pointer;
      color: inherit;
    }
    .btn:hover {
      background: var(--raised-2);
    }
    .muted {
      color: var(--muted);
      font-size: 13px;
    }
    .faint {
      color: var(--faint);
      font-size: 13px;
    }
    .owner {
      font-size: 12px;
      color: var(--muted);
      margin-top: 2px;
    }
    .owner.inline {
      display: inline;
      margin-left: 6px;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 8px 0 16px;
    }
    li {
      padding: 7px 0;
      border-bottom: 1px solid var(--line);
    }
    .meta {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 3px;
    }
    .vault-tag {
      display: inline-block;
      font: 600 10.5px/1 var(--mono);
      padding: 3px 5px;
      border-radius: 5px;
      background: var(--raised-2);
      color: var(--muted);
      white-space: nowrap;
      margin-top: 4px;
    }
    .vault-tag.slip {
      color: var(--slip);
    }
    .state-done {
      text-decoration: line-through;
      color: var(--muted);
    }
    .links {
      display: flex;
      gap: 10px;
      font-size: 12px;
      margin-top: 4px;
    }
    .links a {
      color: var(--accent);
      text-decoration: none;
    }
    .links a:hover {
      text-decoration: underline;
    }
    .dot {
      display: inline-block;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .dot.met {
      background: var(--met);
    }
    .dot.open {
      background: var(--open);
    }
    .dot.missed {
      background: var(--missed);
    }
    .dot.dropped {
      background: var(--dropped);
    }
  `,
})
export class PlansDetailPanelComponent {
  public readonly selection = input.required<PlansSelection>();
  public readonly vaultName = input.required<string>();
  public readonly spanPeriod = input.required<string>();
  public readonly columns = input.required<readonly PlanColumnDto[]>();
  public readonly descendants = input<readonly GoalNodeDto[]>([]);
  public readonly statusCounts = input<
    readonly { status: GoalStatusName; count: number }[]
  >([]);

  public readonly closed = output<void>();

  public readonly statusSummary = computed(() =>
    this.statusCounts()
      .map((c) => `${c.count} ${c.status}`)
      .join(' · '),
  );

  public readonly filteredTasks = computed<PlanTaskRefDto[]>(() => {
    const sel = this.selection();
    if (sel.kind !== 'row') return [];
    return sel.row.tasks.filter(
      (t) => sel.column === undefined || t.column === sel.column,
    );
  });

  public readonly doneTasks = computed(() =>
    this.filteredTasks().filter((t) => t.state === 'done'),
  );

  public readonly openTasks = computed(() =>
    this.filteredTasks().filter((t) => t.state === 'open'),
  );

  public readonly doneWeight = computed(() =>
    this.doneTasks().reduce((sum, t) => sum + t.weight, 0),
  );

  public readonly openWeight = computed(() =>
    this.openTasks().reduce((sum, t) => sum + t.weight, 0),
  );

  public readonly rowSubtitle = computed(() => {
    const sel = this.selection();
    if (sel.kind !== 'row') return '';
    const col =
      sel.column === undefined ? null : (this.columns()[sel.column] ?? null);
    return [
      sel.row.kind,
      sel.row.archived ? 'archived' : null,
      sel.row.status,
      col ? `${col.period} (${col.start} to ${col.end})` : this.spanPeriod(),
    ]
      .filter(Boolean)
      .join(' · ');
  });

  public readonly rowDeadlineText = computed(() => {
    const sel = this.selection();
    if (sel.kind !== 'row') return '';
    return [
      sel.row.deadline ? `deadline ${sel.row.deadline}` : null,
      sel.row.doneWhen ? `done when: ${sel.row.doneWhen}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  });

  public goalWords(text: string): string {
    return goalDisplayText(text);
  }

  public plainText(text: string): string {
    return stripWikilinks(text);
  }

  public ownerOf(g: GoalNodeDto): string | null {
    return g.owner.workstream || g.owner.project || g.owner.area || null;
  }

  public obsidianHref(path: string): string {
    return obsidianUri(this.vaultName(), path);
  }

  public graphHref(path: string): string {
    return graphNoteHref(path);
  }
}
