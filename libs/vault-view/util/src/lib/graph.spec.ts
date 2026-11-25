import { describe, it, expect } from 'vitest';
import {
  bucketOfNode,
  fillOfNode,
  kindOfNode,
  type GraphNodeLike,
} from './graph.js';

const base = (overrides: Partial<GraphNodeLike> = {}): GraphNodeLike => ({
  bucket: 'resources',
  project: false,
  workstream: false,
  workstreamStatus: null,
  plan: false,
  planLevel: null,
  raw: false,
  rawRole: null,
  concept: false,
  stage: null,
  distill: null,
  ...overrides,
});

describe('graph util', () => {
  it('categorizes buckets and kinds accurately', () => {
    expect(bucketOfNode(base({ bucket: 'projects', project: true }))).toBe(
      'projects',
    );
    expect(bucketOfNode(base({ bucket: 'projects', project: false }))).toBe(
      'project-notes',
    );
    expect(bucketOfNode(base({ bucket: 'projects', workstream: true }))).toBe(
      'workstreams',
    );
    expect(bucketOfNode(base({ bucket: 'archive', workstream: true }))).toBe(
      'archive',
    );
    expect(bucketOfNode(base({ bucket: null, plan: true }))).toBe('plans');
    expect(kindOfNode(base({ concept: true }))).toBe('concept');
    expect(kindOfNode(base({ plan: true }))).toBe('plan');
  });

  it('computes node fill colours for workstream states and plan levels', () => {
    expect(
      fillOfNode(
        base({
          bucket: 'projects',
          workstream: true,
          workstreamStatus: 'finished',
        }),
      ),
    ).toBe('var(--ws-finished)');
    expect(fillOfNode(base({ plan: true, planLevel: 'week' }))).toBe(
      'var(--plan-week)',
    );
  });
});
