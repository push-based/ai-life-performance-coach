import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import type { ClimbConceptDto } from '@ai-coach/vault-view-data-access';
import {
  CLIMB_STEP_HEADERS,
  CLIMB_STEPS,
  obsidianUri,
  stairBox,
  type ClimbStepName,
} from '@ai-coach/vault-view-util';

@Component({
  selector: 'vault-climb-stairs-tab',
  template: `
    <div class="vault-stairs-tab">
      <div class="list">
        <h2>Concepts</h2>
        <table>
          <thead>
            <tr>
              <th>Concept</th>
              @for (h of headers; track h.step) {
                <th [title]="h.label">{{ h.short }}</th>
              }
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            @for (section of groupedConcepts(); track section.group) {
              @if (showGroupHeaders()) {
                <tr class="group-row">
                  <td colspan="9">{{ section.group }}</td>
                </tr>
              }
              @for (c of section.items; track c.path) {
                <tr
                  class="concept"
                  [class.selected]="c.path === selectedPath()"
                  (click)="conceptSelect.emit(c.path)"
                >
                  <td>{{ c.title }}</td>
                  @for (s of steps; track s) {
                    <td class="cell" [title]="pipTitle(c, s)">
                      <span [class]="pipClass(c, s)"></span>
                    </td>
                  }
                  <td class="next">
                    {{ c.next ? 'next: ' + c.next : 'done' }}
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
        @if (!concepts().length) {
          <p class="empty faint">
            No concept notes yet. create_concept writes them.
          </p>
        }
      </div>

      <div class="stage">
        @if (selectedConcept(); as c) {
          <h3>{{ c.title }}</h3>
          <p class="muted">{{ stageSubtitle(c) }}</p>
          <svg
            class="stair"
            viewBox="0 0 760 420"
            role="img"
            [attr.aria-label]="chartLabel(c)"
          >
            @for (s of steps; track s; let i = $index) {
              @let box = boxAt(i);
              @let done = c.steps[s];
              <g [class]="stepClass(c, s, i)">
                <title>{{ stepTooltip(c, s) }}</title>
                <rect
                  [attr.x]="box.x"
                  [attr.y]="box.y"
                  [attr.width]="box.width"
                  [attr.height]="box.height"
                  rx="8"
                />
                <text
                  [attr.x]="box.centerX"
                  [attr.y]="box.y + 26"
                  text-anchor="middle"
                >
                  {{ s.toUpperCase() }}
                </text>
                @if (done) {
                  <text
                    class="date"
                    [attr.x]="box.centerX"
                    [attr.y]="box.y + 44"
                    text-anchor="middle"
                  >
                    {{ done.date }}
                  </text>
                }
              </g>
            }
            <g class="labels">
              <text x="4" y="412">fluency</text>
              <text x="756" y="412" text-anchor="end">mastery</text>
            </g>
          </svg>

          <dl class="facts">
            <dt>Next</dt>
            <dd>{{ c.next || 'all seven steps done' }}</dd>
            @if (c.skipped.length) {
              <dt>Skipped</dt>
              <dd>{{ c.skipped.join(', ') }}</dd>
            }
            <dt>Teach</dt>
            <dd>
              {{
                c.steps.teach
                  ? 'done ' + c.steps.teach.date
                  : c.teach.ok
                    ? 'unlocked'
                    : c.teach.reason
              }}
            </dd>
            @if (c.books && c.books.length > 1) {
              <dt>Books</dt>
              <dd>{{ booksSummary(c) }}</dd>
            }
            <dt>Summary</dt>
            <dd>
              {{
                c.current
                  ? 'climb: matches the evidence'
                  : 'climb: differs from the evidence; run rebuild_climb'
              }}
            </dd>
            <dt>Note</dt>
            <dd>
              <a [href]="obsidianHref(c.path)">{{ c.path }}</a>
            </dd>
          </dl>
        } @else {
          <p class="faint">Pick a concept.</p>
        }
      </div>
    </div>
  `,
  styles: `
    .vault-stairs-tab {
      display: grid;
      grid-template-columns: minmax(380px, 1fr) minmax(420px, 1.1fr);
      gap: 24px;
      padding: 0 18px 24px;
    }
    h2 {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin: 16px 0 8px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th,
    td {
      padding: 6px;
      text-align: left;
      border-bottom: 1px solid var(--line);
    }
    th {
      font: 600 11px/1 var(--mono);
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    tr.concept {
      cursor: pointer;
    }
    tr.concept:hover td {
      background: var(--raised);
    }
    tr.concept.selected td {
      background: var(--accent-soft);
    }
    tr.group-row td {
      font: 600 12px/1 var(--mono);
      color: var(--muted);
      padding-top: 14px;
      border-bottom: none;
    }
    td.cell {
      width: 26px;
      text-align: center;
    }
    .pip {
      display: inline-block;
      width: 14px;
      height: 14px;
      border-radius: 4px;
      border: 1.5px solid var(--line-strong);
    }
    .pip.done {
      background: var(--done);
      border-color: var(--done);
    }
    .pip.teach {
      background: var(--teach);
      border-color: var(--teach);
    }
    .pip.skipped {
      border-style: dashed;
      border-color: var(--wrong);
    }
    td.next {
      font: 12px/1.2 var(--mono);
      color: var(--muted);
      white-space: nowrap;
    }
    .stage {
      position: sticky;
      top: 0;
      padding-top: 4px;
    }
    .stage h3 {
      font-size: 22px;
      margin: 14px 0 2px;
    }
    .muted {
      color: var(--muted);
    }
    .faint {
      color: var(--faint);
    }
    svg.stair {
      width: 100%;
      height: auto;
      display: block;
    }
    svg.stair .step rect {
      fill: transparent;
      stroke: var(--line-strong);
      stroke-width: 2;
      transition:
        fill 0.45s ease,
        stroke 0.45s ease,
        opacity 0.45s ease;
    }
    svg.stair .step text {
      font: 700 15px var(--font);
      fill: var(--faint);
      letter-spacing: 0.06em;
      transition: fill 0.45s ease;
    }
    svg.stair .step text.date {
      font: 500 11px var(--mono);
      letter-spacing: 0;
    }
    svg.stair .step.done rect {
      fill: var(--done-soft);
      stroke: var(--done);
    }
    svg.stair .step.done text {
      fill: var(--done);
    }
    svg.stair .step.teach.done rect {
      fill: var(--teach-soft);
      stroke: var(--teach);
    }
    svg.stair .step.teach.done text {
      fill: var(--teach);
    }
    svg.stair .step.skipped rect {
      stroke: var(--wrong);
      stroke-dasharray: 6 5;
    }
    svg.stair .step.hide {
      opacity: 0;
    }
    svg.stair .labels text {
      font: 600 12px var(--font);
      fill: var(--muted);
    }
    .facts {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 4px 14px;
      margin-top: 10px;
    }
    .facts dt {
      color: var(--muted);
    }
    .facts dd {
      margin: 0;
      font-family: var(--mono);
      font-size: 12.5px;
      word-break: break-all;
    }
    .facts a {
      color: var(--accent);
      text-decoration: none;
    }
    .facts a:hover {
      text-decoration: underline;
    }
  `,
})
export class ClimbStairsTabComponent {
  public readonly concepts = input.required<readonly ClimbConceptDto[]>();
  public readonly selectedConcept = input<ClimbConceptDto | null>(null);
  public readonly selectedPath = input<string | null>(null);
  public readonly book = input<string | null>(null);
  public readonly vaultName = input.required<string>();
  public readonly animateTick = input<number>(0);

  public readonly conceptSelect = output<string>();

  public readonly steps = CLIMB_STEPS;
  public readonly headers = CLIMB_STEP_HEADERS;
  private readonly revealedSteps = signal<number>(CLIMB_STEPS.length);
  private timers: ReturnType<typeof setTimeout>[] = [];

  public readonly groupedConcepts = computed(() => {
    const byGroup = new Map<string, ClimbConceptDto[]>();
    const currentBook = this.book();
    for (const c of this.concepts()) {
      const key = (currentBook && c.groups?.[currentBook]) || 'No group';
      const list = byGroup.get(key) ?? [];
      list.push(c);
      byGroup.set(key, list);
    }
    return [...byGroup.entries()].map(([group, items]) => ({ group, items }));
  });

  public readonly showGroupHeaders = computed(() => {
    const groups = this.groupedConcepts();
    return groups.length > 1 || (groups[0] && groups[0].group !== 'No group');
  });

  constructor() {
    effect(() => {
      const tick = this.animateTick();
      this.clearTimers();
      if (tick === 0) {
        this.revealedSteps.set(CLIMB_STEPS.length);
        return;
      }
      this.revealedSteps.set(0);
      CLIMB_STEPS.forEach((_, i) => {
        const timer = setTimeout(
          () => {
            this.revealedSteps.set(i + 1);
          },
          350 + i * 650,
        );
        this.timers.push(timer);
      });
    });
  }

  public boxAt(index: number) {
    return stairBox(index);
  }

  public pipClass(c: ClimbConceptDto, step: ClimbStepName): string {
    if (c.steps[step]) return step === 'teach' ? 'pip teach' : 'pip done';
    return c.skipped.includes(step) ? 'pip skipped' : 'pip';
  }

  public pipTitle(c: ClimbConceptDto, step: ClimbStepName): string {
    const done = c.steps[step];
    if (done) return `${step}: ${done.date} · ${done.evidence}`;
    return c.skipped.includes(step) ? `${step}: skipped` : `${step}: open`;
  }

  public stepClass(
    c: ClimbConceptDto,
    step: ClimbStepName,
    index: number,
  ): string {
    const done = Boolean(c.steps[step]);
    return [
      'step',
      step === 'teach' ? 'teach' : '',
      done ? 'done' : '',
      !done && c.skipped.includes(step) ? 'skipped' : '',
      index >= this.revealedSteps() ? 'hide' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  public stepTooltip(c: ClimbConceptDto, step: ClimbStepName): string {
    const done = c.steps[step];
    if (done) return `${step} · ${done.date}\n${done.evidence}`;
    return c.skipped.includes(step) ? `${step} · skipped` : `${step} · open`;
  }

  public chartLabel(c: ClimbConceptDto): string {
    const count = CLIMB_STEPS.filter((s) => Boolean(c.steps[s])).length;
    return `${c.title}: ${count} of 7 steps done`;
  }

  public stageSubtitle(c: ClimbConceptDto): string {
    const current = this.book();
    const book =
      current && (c.books ?? []).includes(current) ? current : c.book;
    return [book, (book && c.groups?.[book]) || null]
      .filter(Boolean)
      .join(' · ');
  }

  public booksSummary(c: ClimbConceptDto): string {
    return (c.books ?? [])
      .map((b) => `${b}: ${c.groups?.[b] || 'not grouped yet'}`)
      .join(' · ');
  }

  public obsidianHref(path: string): string {
    return obsidianUri(this.vaultName(), path);
  }

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }
}
