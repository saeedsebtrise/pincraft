/**
 * Template thumbnails rendered from the template data itself (not screenshots),
 * with soft generated placeholder photos in the image frames — or, inside a
 * project, with the user's own uploaded photos so they can preview their Pin.
 */
import type { ImageMap, ImageSource } from '../editor/canvas/nodes';
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

export interface PreviewPhotos {
  /** Stable cache key for this photo set (e.g. joined asset ids). */
  key: string;
  sources: ImageSource[];
}

function fillFrames(doc: PinDocument, photos?: PreviewPhotos): { doc: PinDocument; images: ImageMap } {
  placeholders ??= PALETTES.map((_, i) => makePlaceholder(i));
  const pool: ImageSource[] = photos?.sources.length ? photos.sources : placeholders.map((c) => ({ image: c, width: 600, height: 800 }));
  const d = clone(doc);
  const images: ImageMap = {};
  frames(d).forEach((f, i) => {
    const id = `ph_${i % pool.length}`;
    f.assetId = id;
    images[id] = pool[i % pool.length];
  });
  return { doc: d, images };
}

const cache = new Map<string, Promise<string>>();

export function templateThumbnail(t: Template, width = 260, photos?: PreviewPhotos): Promise<string> {
  const key = `${t.id}:${t.source === 'user' ? t.createdAt : 0}:${width}:${photos?.sources.length ? photos.key : ''}`;
  if (!cache.has(key)) {
    if (cache.size > 400) cache.clear();
    const { doc, images } = fillFrames(t.doc, photos);
    cache.set(key, renderThumbnail(doc, width, images).catch(() => ''));
  }
  return cache.get(key)!;
}

/** Preview of any document with placeholder photos in its empty frames (Auto Design results). */
export function docThumbnail(doc: PinDocument, width = 260): Promise<string> {
  const { doc: filled, images } = fillFrames(doc);
  return renderThumbnail(filled, width, images).catch(() => '');
}

