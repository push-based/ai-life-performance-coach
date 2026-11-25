import { Component, Injector, inject, signal } from '@angular/core';
import type {
  BoardDrawingDto,
  StructureDto,
} from '@ai-coach/vault-view-data-access';
import {
  NgDiagramComponent,
  NgDiagramModelService,
  NgDiagramNodeTemplateMap,
  initializeModel,
  provideNgDiagram,
  type Edge,
  type ModelAdapter,
  type Node,
} from 'ng-diagram';
import {
  ConceptNodeComponent,
  LayerNodeComponent,
  type BoardConceptData,
  type BoardLayerData,
} from './climb-board-nodes.component.js';

export interface ClimbBoardInput {
  concepts: BoardConceptData[];
  prefill?: StructureDto | null;
}

const LAYER = { width: 300, height: 130 };
const TRAY_X = 24;

type BoardConfig = NonNullable<ReturnType<NgDiagramComponent['config']>>;

@Component({
  selector: 'vault-climb-board',
  imports: [NgDiagramComponent],
  providers: [provideNgDiagram()],
  template: `
    @for (m of models(); track m) {
      <ng-diagram [model]="m" [config]="config" [nodeTemplateMap]="templates" />
    }
  `,
})
export class ClimbBoardComponent {
  private readonly injector = inject(Injector);
  private readonly service = inject(NgDiagramModelService);
  private seq = 0;
  private model: ModelAdapter = initializeModel({}, this.injector);

  public readonly models = signal<ModelAdapter[]>([this.model]);
  public readonly templates = new NgDiagramNodeTemplateMap([
    ['concept', ConceptNodeComponent],
    ['layer', LayerNodeComponent],
  ]);
  public readonly config: BoardConfig = {
    computeNodeId: () => `n${++this.seq}`,
    computeEdgeId: () => `e${++this.seq}`,
    grouping: {
      canGroup: (node: Node, group: Node) =>
        node.type === 'concept' && group.type === 'layer',
    },
    linking: {
      validateConnection: (
        source: Node | null,
        _sp: unknown,
        target: Node | null,
      ) =>
        !!source &&
        !!target &&
        source.id !== target.id &&
        source.type === 'layer' &&
        target.type === 'layer',
      finalEdgeDataBuilder: (edge: Edge) => ({
        ...edge,
        targetArrowhead: 'ng-diagram-arrow',
      }),
    },
    zoom: { min: 0.4, max: 2 },
  };

  public load(input: ClimbBoardInput): void {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const layerOf = new Map<string, string>();
    const groups = input.prefill?.groups ?? [];
    groups.forEach((g, i) => {
      const id = `n${++this.seq}`;
      layerOf.set(g.name, id);
      nodes.push({
        id,
        type: 'layer',
        isGroup: true,
        highlighted: false,
        position: {
          x: 260 + Math.floor(i / 3) * (LAYER.width + 40),
          y: 320 - (i % 3) * (LAYER.height + 50),
        },
        size: LAYER,
        autoSize: false,
        resizable: true,
        data: { name: g.name } satisfies BoardLayerData,
      } as Node);
    });
    const inGroup = new Map(
      groups.flatMap((g) => g.concepts.map((c) => [c.path, g.name] as const)),
    );
    const placed = new Map<string, number>();
    input.concepts.forEach((c, i) => {
      const group = inGroup.get(c.path);
      const gid = group ? layerOf.get(group) : undefined;
      const layer = gid ? nodes.find((n) => n.id === gid)! : null;
      const k = gid ? (placed.get(gid) ?? 0) : 0;
      if (gid) placed.set(gid, k + 1);
      const position = layer
        ? {
            x: layer.position.x + 16 + (k % 2) * 140,
            y: layer.position.y + 56 + Math.floor(k / 2) * 36,
          }
        : { x: TRAY_X, y: 40 + i * 44 };
      nodes.push({
        id: `n${++this.seq}`,
        type: 'concept',
        position,
        ...(gid ? { groupId: gid } : {}),
        data: { path: c.path, title: c.title } satisfies BoardConceptData,
      } as Node);
    });
    for (const e of input.prefill?.buildsOn ?? []) {
      const [source, target] = [layerOf.get(e.from), layerOf.get(e.to)];
      if (source && target) {
        edges.push({
          id: `e${++this.seq}`,
          source,
          target,
          sourcePort: 'builds-on',
          targetPort: 'base',
          targetArrowhead: 'ng-diagram-arrow',
          data: {},
        });
      }
    }
    this.model = initializeModel({ nodes, edges }, this.injector);
    this.models.set([this.model]);
  }

  public addGroup(): void {
    const layers = this.model.getNodes().filter((n) => n.type === 'layer');
    const top = layers.length
      ? layers.reduce((a, n) => (n.position.y < a.position.y ? n : a))
      : null;
    let position = { x: 260, y: 320 };
    if (top) {
      position =
        top.position.y - LAYER.height - 50 >= 20
          ? { x: top.position.x, y: top.position.y - LAYER.height - 50 }
          : {
              x:
                Math.max(...layers.map((n) => n.position.x)) + LAYER.width + 40,
              y: 320,
            };
    }
    const node = {
      id: `n${++this.seq}`,
      type: 'layer',
      isGroup: true,
      highlighted: false,
      position,
      size: LAYER,
      autoSize: false,
      resizable: true,
      data: { name: '' } satisfies BoardLayerData,
    } as Node;
    void this.service.addNodes([node]);
  }

  public drawing(): BoardDrawingDto {
    const nodes = this.model.getNodes();
    const layers = nodes.filter((n) => n.type === 'layer');
    const nameOf = (id: string) =>
      (
        (nodes.find((n) => n.id === id)?.data as BoardLayerData | undefined)
          ?.name ?? ''
      ).trim();
    return {
      groups: layers.map((l) => ({
        name: (l.data as BoardLayerData).name.trim(),
        concepts: nodes
          .filter(
            (n) => n.type === 'concept' && 'groupId' in n && n.groupId === l.id,
          )
          .map((n) => (n.data as BoardConceptData).path),
      })),
      builds_on: this.model
        .getEdges()
        .filter(
          (e) =>
            layers.some((l) => l.id === e.source) &&
            layers.some((l) => l.id === e.target),
        )
        .map((e) => ({ from: nameOf(e.source), to: nameOf(e.target) })),
    };
  }
}
