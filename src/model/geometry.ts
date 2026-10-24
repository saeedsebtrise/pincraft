import type { FrameLayer, Rect } from './types';

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export interface ImagePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Source pixels per canvas pixel inverse: >1 means the source is upscaled. */
  scale: number;
}

/**
 * Where the source image sits inside a frame (frame-local coordinates).
 * Computed from the asset's natural size, so preview and full-res sources
 * produce identical geometry — the basis of editor/export parity.
 */
export function placeImage(
  frame: Pick<FrameLayer, 'width' | 'height' | 'crop' | 'fit'>,
  naturalW: number,
  naturalH: number,
): ImagePlacement {
  const { width: w, height: h } = frame;
  const zoom = Math.max(1, frame.crop.zoom);
  const base = frame.fit === 'contain' ? Math.min(w / naturalW, h / naturalH) : Math.max(w / naturalW, h / naturalH);
  const s = base * zoom;
  const dw = naturalW * s;
  const dh = naturalH * s;
  let x = w / 2 - frame.crop.fx * dw;
  let y = h / 2 - frame.crop.fy * dh;
  // Keep the frame covered when the image is larger than the frame; center when smaller.
  x = dw >= w ? clamp(x, w - dw, 0) : (w - dw) / 2;
  y = dh >= h ? clamp(y, h - dh, 0) : (h - dh) / 2;
  return { x, y, width: dw, height: dh, scale: s };
}

/** Inverse of placeImage: focal point for a dragged image position. */
export function focalFromPosition(
  frame: Pick<FrameLayer, 'width' | 'height'>,
  placement: Pick<ImagePlacement, 'x' | 'y' | 'width' | 'height'>,
): { fx: number; fy: number } {
  const x = placement.width >= frame.width ? clamp(placement.x, frame.width - placement.width, 0) : placement.x;
  const y = placement.height >= frame.height ? clamp(placement.y, frame.height - placement.height, 0) : placement.y;
  return {
    fx: clamp((frame.width / 2 - x) / placement.width, 0, 1),
    fy: clamp((frame.height / 2 - y) / placement.height, 0, 1),
  };
}

/** Axis-aligned bounding box of a rect rotated (degrees) around its top-left corner. */
export function rotatedBounds(r: Rect & { rotation: number }): Rect {
  if (!r.rotation) return { x: r.x, y: r.y, width: r.width, height: r.height };
  const a = (r.rotation * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const pts = [
    [0, 0],
    [r.width, 0],
    [r.width, r.height],
    [0, r.height],
  ].map(([px, py]) => [r.x + px * cos - py * sin, r.y + px * sin + py * cos]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
}

export function unionRect(rects: Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => r.x + r.width));
  const y2 = Math.max(...rects.map((r) => r.y + r.height));
  return { x, y, width: x2 - x, height: y2 - y };
}
