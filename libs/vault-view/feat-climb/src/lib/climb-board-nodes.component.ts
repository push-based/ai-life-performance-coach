import { Component, inject, input } from '@angular/core';
import {
  NgDiagramModelService,
  NgDiagramPortComponent,
  type GroupNode,
  type NgDiagramGroupNodeTemplate,
  type NgDiagramNodeTemplate,
  type SimpleNode,
} from 'ng-diagram';

export interface BoardConceptData {
  path: string;
  title: string;
}

export interface BoardLayerData {
  name: string;
}

@Component({
  selector: 'vault-concept-node',
  template: `<div class="concept" [title]="node().data.path">
    {{ node().data.title }}
  </div>`,
})
export class ConceptNodeComponent implements NgDiagramNodeTemplate<BoardConceptData> {
  public readonly node = input.required<SimpleNode<BoardConceptData>>();
}

@Component({
  selector: 'vault-layer-node',
  imports: [NgDiagramPortComponent],
  template: `
    <div class="layer" [class.highlighted]="node().highlighted">
      <input
        class="name"
        type="text"
        placeholder="Group name"
        [value]="node().data.name"
        (input)="rename($any($event.target).value)"
        (pointerdown)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      />
    </div>
    <ng-diagram-port id="base" type="target" side="top" />
    <ng-diagram-port id="builds-on" type="source" side="bottom" />
  `,
})
export class LayerNodeComponent implements NgDiagramGroupNodeTemplate<BoardLayerData> {
  public readonly node = input.required<GroupNode<BoardLayerData>>();
  private readonly model = inject(NgDiagramModelService);

  public rename(name: string): void {
    this.model.updateNodeData(this.node().id, { ...this.node().data, name });
  }
}
