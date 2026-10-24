/**
 * Template thumbnails rendered from the template data itself (not screenshots),
 * with soft generated placeholder photos in the image frames.
 */
import type { ImageMap } from '../editor/canvas/nodes';
import { frames } from '../model/docOps';
import { clone } from '../model/factory';
import type { PinDocument, Template } from '../model/types';
import { renderThumbnail } from '../services/render';

const PALETTES = [
  ['#D8C3A5', '#8E8D8A', '#E98074'],
  ['#C9B79C', '#6B705C', '#A5A58D'],
  ['#E3D5CA', '#D5BDAF', '#8D6E63'],
  ['#B7B7A4', '#6B705C', '#FFE8D6'],
  ['#CB997E', '#DDBEA9', '#7F5539'],
  ['#A3B18A', '#588157', '#DAD7CD'],
];

let placeholders: HTMLCanvasElement[] | null = null;

function makePlaceholder(i: number): HTMLCanvasElement {
  const [a, b, c] = PALETTES[i % PALETTES.length];
  const cv = document.createElement('canvas');
  cv.width = 600;
  cv.height = 800;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 600, 800);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 600, 800);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(180 + (i % 3) * 120, 300, 150, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 560 - (i % 2) * 60, 600, 240);
  ctx.globalAlpha = 1;
  return cv;
}

function placeholderMap(doc: PinDocument): { doc: PinDocument; images: ImageMap } {
  placeholders ??= PALETTES.map((_, i) => makePlaceholder(i));
  const d = clone(doc);
  const images: ImageMap = {};
  frames(d).forEach((f, i) => {
    const id = `ph_${i % placeholders!.length}`;
    f.assetId = id;
    images[id] = { image: placeholders![i % placeholders!.length], width: 600, height: 800 };
  });
  return { doc: d, images };
}

const cache = new Map<string, Promise<string>>();

export function templateThumbnail(t: Template, width = 260): Promise<string> {
  const key = `${t.id}:${t.source === 'user' ? t.createdAt : 0}:${width}`;
  if (!cache.has(key)) {
    const { doc, images } = placeholderMap(t.doc);
    cache.set(key, renderThumbnail(doc, width, images).catch(() => ''));
  }
  return cache.get(key)!;
}

