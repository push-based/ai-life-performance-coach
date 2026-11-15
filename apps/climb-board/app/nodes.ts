import { ChangeDetectionStrategy, Component, inject, input } from "@angular/core";
import { NgDiagramModelService, NgDiagramPortComponent, type GroupNode, type NgDiagramGroupNodeTemplate, type NgDiagramNodeTemplate, type SimpleNode } from "ng-diagram";

export interface ConceptData { path: string; title: string }
export interface LayerData { name: string }

@Component({
  selector: "cb-concept-node",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="concept" [title]="node().data.path">{{ node().data.title }}</div>`,
})
export class ConceptNodeComponent implements NgDiagramNodeTemplate<ConceptData> {
  readonly node = input.required<SimpleNode<ConceptData>>();
}

@Component({
  selector: "cb-layer-node",
  imports: [NgDiagramPortComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="layer" [class.highlighted]="node().highlighted">
      <input class="name" type="text" placeholder="Group name" [value]="node().data.name"
        (input)="rename($any($event.target).value)" (pointerdown)="$event.stopPropagation()" (keydown)="$event.stopPropagation()" />
    </div>
    <ng-diagram-port id="base" type="target" side="top" />
    <ng-diagram-port id="builds-on" type="source" side="bottom" />
  `,
})
export class LayerNodeComponent implements NgDiagramGroupNodeTemplate<LayerData> {
  readonly node = input.required<GroupNode<LayerData>>();
  private readonly model = inject(NgDiagramModelService);

  rename(name: string): void {
    this.model.updateNodeData(this.node().id, { ...this.node().data, name });
  }
}
