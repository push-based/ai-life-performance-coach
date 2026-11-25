import { describe, it, expect } from 'vitest';
import {
  CLIMB_STEPS,
  CLIMB_STEP_HEADERS,
  sketchImageHref,
  stairBox,
} from './climb.js';

describe('climb util', () => {
  it('defines all seven climb steps in order', () => {
    expect(CLIMB_STEPS).toHaveLength(7);
    expect(CLIMB_STEP_HEADERS.map((h) => h.step)).toEqual([...CLIMB_STEPS]);
  });

  it('computes rising stair boxes across the chart', () => {
    const first = stairBox(0);
    const last = stairBox(6);
    expect(last.height).toBeGreaterThan(first.height);
    expect(last.y).toBeLessThan(first.y);
    expect(last.x).toBeGreaterThan(first.x);
  });

  it('encodes sketch image paths', () => {
    expect(sketchImageHref('3.Resources/Concepts/Sketches/a b.png')).toBe(
      '/sketch.png?path=3.Resources%2FConcepts%2FSketches%2Fa%20b.png',
    );
  });
});
