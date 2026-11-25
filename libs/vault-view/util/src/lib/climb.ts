export const CLIMB_STEPS = [
  'read',
  'group',
  'generate',
  'retrieve',
  'elaborate',
  'space',
  'teach',
] as const;

export type ClimbStepName = (typeof CLIMB_STEPS)[number];

export const CLIMB_STEP_HEADERS: readonly {
  step: ClimbStepName;
  short: string;
  label: string;
}[] = [
  { step: 'read', short: 'R', label: 'Read' },
  { step: 'group', short: 'G', label: 'Group' },
  { step: 'generate', short: 'Ge', label: 'Generate' },
  { step: 'retrieve', short: 'Re', label: 'Retrieve' },
  { step: 'elaborate', short: 'E', label: 'Elaborate' },
  { step: 'space', short: 'S', label: 'Space' },
  { step: 'teach', short: 'T', label: 'Teach' },
];

export interface StairBox {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
}

export function stairBox(
  index: number,
  totalWidth = 760,
  totalHeight = 420,
): StairBox {
  const stepWidth = totalWidth / CLIMB_STEPS.length;
  const rise = (totalHeight - 70) / CLIMB_STEPS.length;
  const height = rise * (index + 1);
  const x = index * stepWidth;
  const y = totalHeight - 30 - height;
  return {
    x: x + 3,
    y,
    width: stepWidth - 6,
    height,
    centerX: x + stepWidth / 2,
  };
}

export function sketchImageHref(path: string): string {
  return `/sketch.png?path=${encodeURIComponent(path)}`;
}
