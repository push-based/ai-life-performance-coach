import { Component, input, output } from '@angular/core';
import type { GoalNodeDto } from '@ai-coach/vault-view-data-access';
import { goalDisplayText } from '@ai-coach/vault-view-util';

@Component({
  selector: 'vault-goal-tree',
  template: `
    <ul class="vault-tree" [class.nested]="nested()">
      @for (g of goals(); track g.note + ':' + g.period + ':' + g.text) {
        <li>
          <div
            class="vault-goal"
            [class.selected]="selectedGoal() === g"
            [title]="g.level + ' ' + g.period"
            (click)="goalSelect.emit(g)"
          >
            <span class="vault-dot" [class]="g.status"></span>
            <span class="text">
              {{ displayWords(g.text) }}
              @if (ownerOf(g); as owner) {
                <span class="owner">{{ owner }}</span>
              }
            </span>
            <span class="vault-tag">{{ g.period }}</span>
            @if (g.slipped.length) {
              <span class="vault-tag slip">↻{{ g.slipped.length }}</span>
            }
          </div>
          @if (g.children.length) {
            <vault-goal-tree
              [goals]="g.children"
              [selectedGoal]="selectedGoal()"
              [nested]="true"
              (goalSelect)="goalSelect.emit($event)"
            />
          }
        </li>
      }
    </ul>
  `,
  styles: `
    .vault-tree {
      list-style: none;
      margin: 0;
      padding: 0 10px 18px 18px;
    }
    .vault-tree.nested {
      padding: 0 0 0 16px;
      border-left: 1px dashed var(--line-strong);
      margin-left: 6px;
    }
    .vault-goal {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 5px 8px;
      border-radius: 8px;
      cursor: pointer;
    }
    .vault-goal:hover {
      background: var(--raised);
    }
    .vault-goal.selected {
      background: var(--accent-soft);
    }
    .vault-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex: none;
      transform: translateY(1px);
    }
    .vault-dot.met {
      background: var(--met);
    }
    .vault-dot.open {
      background: var(--open);
    }
    .vault-dot.missed {
      background: var(--missed);
    }
    .vault-dot.dropped {
      background: var(--dropped);
    }
    .text {
      flex: 1;
    }
    .owner {
      display: inline;
      font-size: 12px;
      color: var(--muted);
      margin-left: 6px;
    }
    .vault-tag {
      font: 600 10.5px/1 var(--mono);
      padding: 3px 5px;
      border-radius: 5px;
      background: var(--raised-2);
      color: var(--muted);
      white-space: nowrap;
    }
    .vault-tag.slip {
      color: var(--slip);
    }
  `,
})
export class GoalTreeComponent {
  public readonly goals = input.required<readonly GoalNodeDto[]>();
  public readonly selectedGoal = input<GoalNodeDto | null>(null);
  public readonly nested = input<boolean>(false);

  public readonly goalSelect = output<GoalNodeDto>();

  public displayWords(text: string): string {
    return goalDisplayText(text);
  }

  public ownerOf(g: GoalNodeDto): string | null {
    return g.owner.workstream || g.owner.project || g.owner.area || null;
  }
}
