import type { Rect, Rect01 } from '../model/types';

/**
 * Collage layouts are fractional cells in a unit square. They are applied to a
 * region of the canvas; gaps are inserted on interior edges only, so outer
 * edges stay flush with the region (margin controls the outer spacing).
 */
export interface CollageLayout {
  id: string;
  name: string;
  count: number;
  cells: Rect01[];
  /**
   * Band layouts split rows at y = 0.5. CollageSettings.band opens a text band
   * of that height between the top and bottom rows (2 top + text + 2/3 bottom).
   */
  bandable?: boolean;
}

const c = (x: number, y: number, width: number, height: number): Rect01 => ({ x, y, width, height });
const third = 1 / 3;

export const COLLAGE_LAYOUTS: CollageLayout[] = [
  { id: 'single', name: 'Single image', count: 1, cells: [c(0, 0, 1, 1)] },
  { id: 'two-stack', name: '2 stacked', count: 2, cells: [c(0, 0, 1, 0.5), c(0, 0.5, 1, 0.5)] },
  { id: 'two-side', name: '2 side by side', count: 2, cells: [c(0, 0, 0.5, 1), c(0.5, 0, 0.5, 1)] },
  { id: 'two-hero', name: 'Large top + small', count: 2, cells: [c(0, 0, 1, 0.62), c(0, 0.62, 1, 0.38)] },
  { id: 'three-hero-top', name: 'Hero top + 2', count: 3, cells: [c(0, 0, 1, 0.6), c(0, 0.6, 0.5, 0.4), c(0.5, 0.6, 0.5, 0.4)] },
  { id: 'three-hero-left', name: 'Hero left + 2', count: 3, cells: [c(0, 0, 0.6, 1), c(0.6, 0, 0.4, 0.5), c(0.6, 0.5, 0.4, 0.5)] },
  { id: 'three-rows', name: '3 rows', count: 3, cells: [c(0, 0, 1, third), c(0, third, 1, third), c(0, 2 * third, 1, third)] },
  { id: 'three-cols', name: '3 columns', count: 3, cells: [c(0, 0, third, 1), c(third, 0, third, 1), c(2 * third, 0, third, 1)] },
  {
    id: 'band-2-2',
    name: '2 top + band + 2 bottom',
    count: 4,
    bandable: true,
    cells: [c(0, 0, 0.5, 0.5), c(0.5, 0, 0.5, 0.5), c(0, 0.5, 0.5, 0.5), c(0.5, 0.5, 0.5, 0.5)],
  },
  {
    id: 'band-2-3',
    name: '2 top + band + 3 bottom',
    count: 5,
    bandable: true,
    cells: [c(0, 0, 0.5, 0.5), c(0.5, 0, 0.5, 0.5), c(0, 0.5, third, 0.5), c(third, 0.5, third, 0.5), c(2 * third, 0.5, third, 0.5)],
  },
  {
    id: 'band-1-2',
    name: '1 top + band + 2 bottom',
    count: 3,
    bandable: true,
    cells: [c(0, 0, 1, 0.5), c(0, 0.5, 0.5, 0.5), c(0.5, 0.5, 0.5, 0.5)],
  },
  {
    id: 'band-1-1',
    name: '1 top + band + 1 bottom',
    count: 2,
    bandable: true,
    cells: [c(0, 0, 1, 0.5), c(0, 0.5, 1, 0.5)],
  },
  {
    id: 'grid-2x2',
    name: '2 × 2 grid',
    count: 4,
    cells: [c(0, 0, 0.5, 0.5), c(0.5, 0, 0.5, 0.5), c(0, 0.5, 0.5, 0.5), c(0.5, 0.5, 0.5, 0.5)],
  },
  {
    id: 'hero-top-3',
    name: 'Large top + 3 below',
    count: 4,
    cells: [c(0, 0, 1, 0.62), c(0, 0.62, third, 0.38), c(third, 0.62, third, 0.38), c(2 * third, 0.62, third, 0.38)],
  },
  {
    id: 'hero-left-3',
    name: 'Large left + 3 right',
    count: 4,
    cells: [c(0, 0, 0.62, 1), c(0.62, 0, 0.38, third), c(0.62, third, 0.38, third), c(0.62, 2 * third, 0.38, third)],
  },
  {
    id: 'four-cols',
    name: '4 vertical panels',
    count: 4,
    cells: [c(0, 0, 0.25, 1), c(0.25, 0, 0.25, 1), c(0.5, 0, 0.25, 1), c(0.75, 0, 0.25, 1)],
  },
  {
    id: 'four-rows',
    name: '4 rows',
    count: 4,
    cells: [c(0, 0, 1, 0.25), c(0, 0.25, 1, 0.25), c(0, 0.5, 1, 0.25), c(0, 0.75, 1, 0.25)],
  },
  {
    id: 'editorial-offset',
    name: 'Editorial offset',
    count: 4,
    cells: [c(0, 0, 0.62, 0.56), c(0.62, 0, 0.38, 0.56), c(0, 0.56, 0.38, 0.44), c(0.38, 0.56, 0.62, 0.44)],
  },
  {
    id: 'hero-4',
    name: 'Hero + 4',
    count: 5,
    cells: [c(0, 0, 1, 0.5), c(0, 0.5, 0.5, 0.25), c(0.5, 0.5, 0.5, 0.25), c(0, 0.75, 0.5, 0.25), c(0.5, 0.75, 0.5, 0.25)],
  },
  {
    id: 'two-top-three-bottom',
    name: '2 top + 3 bottom',
    count: 5,
    cells: [c(0, 0, 0.5, 0.55), c(0.5, 0, 0.5, 0.55), c(0, 0.55, third, 0.45), c(third, 0.55, third, 0.45), c(2 * third, 0.55, third, 0.45)],
  },
  {
    id: 'three-top-two-bottom',
    name: '3 top + 2 bottom',
    count: 5,
    cells: [c(0, 0, third, 0.45), c(third, 0, third, 0.45), c(2 * third, 0, third, 0.45), c(0, 0.45, 0.5, 0.55), c(0.5, 0.45, 0.5, 0.55)],
  },
  {
    id: 'center-hero',
    name: 'Center hero + 4',
    count: 5,
    cells: [c(0.25, 0, 0.5, 1), c(0, 0, 0.25, 0.5), c(0, 0.5, 0.25, 0.5), c(0.75, 0, 0.25, 0.5), c(0.75, 0.5, 0.25, 0.5)],
  },
  {
    id: 'grid-2x3',
    name: '2 × 3 grid',
    count: 6,
    cells: [
      c(0, 0, 0.5, third), c(0.5, 0, 0.5, third),
      c(0, third, 0.5, third), c(0.5, third, 0.5, third),
      c(0, 2 * third, 0.5, third), c(0.5, 2 * third, 0.5, third),
    ],
  },
];

export function getLayout(id: string): CollageLayout | undefined {
  return COLLAGE_LAYOUTS.find((l) => l.id === id);
}

const EPS = 1e-6;

/** Pixel rects for each cell of a layout placed in a canvas region. */
export function computeCells(
  layout: CollageLayout,
  canvasW: number,
  canvasH: number,
  region: Rect01,
  gap: number,
  margin: number,
  band = 0,
): Rect[] {
  const rx = region.x * canvasW + margin;
  const ry = region.y * canvasH + margin;
  const rw = region.width * canvasW - margin * 2;
  const rh = region.height * canvasH - margin * 2;
  const half = gap / 2;
  const b = layout.bandable ? Math.max(0, Math.min(0.8, band)) : 0;
  const cells = b
    ? layout.cells.map((cell) => ({ ...cell, y: cell.y * (1 - b) + (cell.y >= 0.5 - EPS ? b : 0), height: cell.height * (1 - b) }))
    : layout.cells;
  return cells.map((cell) => {
    const left = cell.x <= EPS ? 0 : half;
    const top = cell.y <= EPS ? 0 : half;
    const right = cell.x + cell.width >= 1 - EPS ? 0 : half;
    const bottom = cell.y + cell.height >= 1 - EPS ? 0 : half;
    const x = rx + cell.x * rw + left;
    const y = ry + cell.y * rh + top;
    return {
      x: round2(x),
      y: round2(y),
      width: round2(Math.max(1, cell.width * rw - left - right)),
      height: round2(Math.max(1, cell.height * rh - top - bottom)),
    };
  });
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** The open band between image rows, in canvas pixels (null if the layout has no band). */
export function bandRect(
  layout: CollageLayout,
  canvasW: number,
  canvasH: number,
  region: Rect01,
  margin: number,
  band: number,
): Rect | null {
  if (!layout.bandable || band <= 0) return null;
  const rx = region.x * canvasW;
  const ry = region.y * canvasH + margin;
  const rh = region.height * canvasH - margin * 2;
  const b = Math.min(0.8, band);
  return { x: rx, y: round2(ry + rh * 0.5 * (1 - b)), width: region.width * canvasW, height: round2(rh * b) };
}
