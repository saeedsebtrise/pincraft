/**
 * Blog URL → Pins, browser side: read a post's title and photo links through
 * the app's own server (/api/page — see server/pageFetch.mjs), download the
 * photos through /api/image and store them like normal uploads.
 */
import type { ImageSource } from '../editor/canvas/nodes';
import type { Id } from '../model/types';
import { useAssets } from '../store/assetStore';
import { sniffImageType } from './fileValidation';

export interface PageImage {
  url: string;
  alt: string;
}
export interface PageInfo {
  url: string;
  title: string;
  description: string;
  siteName: string;
  images: PageImage[];
}

/** "example.com/post", "https://…" — one token with a dot and no spaces. */
export function looksLikeUrl(s: string): boolean {
  const t = s.trim();
  return !/\s/.test(t) && /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(t);
}

export function normalizeUrl(s: string): string {
  const t = s.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/** "www.luxehairstyles.com" → "luxehairstyles.com" (for the website footer). */
export function siteHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

async function errorText(res: Response): Promise<string> {
  try {
    return ((await res.json()) as { error?: string }).error || `Request failed (${res.status})`;
  } catch {
    return res.status === 404 ? 'The page reader isn’t running — restart the dev server (npm run dev).' : `Request failed (${res.status})`;
  }
}

export async function fetchPage(url: string): Promise<PageInfo> {
  const res = await fetch(`/api/page?url=${encodeURIComponent(normalizeUrl(url))}`);
  if (!res.ok) throw new Error(await errorText(res));
  return (await res.json()) as PageInfo;
}

/** Shortest side a downloaded photo needs to be worth putting on a Pin. */
export const MIN_PHOTO_SIDE = 400;

/** JPEG/PNG/WEBP pass through; anything else the browser can decode (AVIF…) is re-encoded as JPEG. */
// ---------------------------------------------------------------- picking the best photos

export interface PhotoStats {
  width: number;
  height: number;
  /** Variance of the Laplacian on a small grey copy — low means blurry. */
  sharpness: number;
  /** Standard deviation of brightness (0–255) — low means flat / washed out. */
  contrast: number;
  /** Mean brightness (0–255). */
  brightness: number;
  /** 64-bit average hash (as 64 booleans) to spot the same photo at another size or crop. */
  hash: boolean[];
}

const STAT_SIDE = 96;

/** Measures a photo from a small RGBA copy (any size; STAT_SIDE×STAT_SIDE in the app). */
export function photoStats(rgba: Uint8ClampedArray, w: number, h: number, width: number, height: number): PhotoStats {
  const grey = new Float32Array(w * h);
  let sum = 0;
  for (let i = 0; i < w * h; i++) {
    const g = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    grey[i] = g;
    sum += g;
  }
  const brightness = sum / (w * h);
  let sq = 0;
  for (const g of grey) sq += (g - brightness) ** 2;
  const contrast = Math.sqrt(sq / (w * h));
  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = grey[i - 1] + grey[i + 1] + grey[i - w] + grey[i + w] - 4 * grey[i];
      lapSum += lap;
      lapSq += lap * lap;
      n++;
    }
  }
  const sharpness = n ? lapSq / n - (lapSum / n) ** 2 : 0;
  // 8×8 average hash.
  const cells: number[] = [];
  for (let cy = 0; cy < 8; cy++) {
    for (let cx = 0; cx < 8; cx++) {
      let s = 0;
      let c = 0;
      for (let y = Math.floor((cy * h) / 8); y < Math.floor(((cy + 1) * h) / 8); y++) {
        for (let x = Math.floor((cx * w) / 8); x < Math.floor(((cx + 1) * w) / 8); x++) {
          s += grey[y * w + x];
          c++;
        }
      }
      cells.push(c ? s / c : 0);
    }
  }
  const avg = cells.reduce((a, b) => a + b, 0) / 64;
  return { width, height, sharpness, contrast, brightness, hash: cells.map((v) => v > avg) };
}

export const hashDistance = (a: boolean[], b: boolean[]) => a.reduce((n, v, i) => n + (v !== b[i] ? 1 : 0), 0);

/**
 * 0..1 — how good a photo is for a Pin: big enough to stay crisp, tall rather
 * than wide (Pins are 2:3), sharp, with real contrast and a sensible exposure.
 * `position` (0 = featured image) gives the author's own pick a small nudge.
 */
export function scorePhoto(s: PhotoStats, position = 0): number {
  const size = Math.min(1, Math.min(s.width, s.height) / 1000);
  const r = s.height / s.width;
  const shape = r >= 1.2 && r <= 2.2 ? 1 : r >= 0.9 ? 0.7 : r >= 0.66 ? 0.45 : 0.2;
  const sharp = Math.min(1, s.sharpness / 300);
  const contrast = Math.min(1, s.contrast / 55);
  const exposure = 1 - (Math.abs(s.brightness - 128) / 128) * 0.7;
  const featured = position === 0 ? 0.05 : Math.max(0, 0.03 - position * 0.002);
  return 0.3 * size + 0.25 * shape + 0.2 * sharp + 0.15 * contrast + 0.1 * exposure + featured;
}

/** Best photos first, dropping near-duplicates (same picture at another size/crop) of a better one. */
export function pickBest<T extends { stats: PhotoStats; score: number }>(items: T[], max: number): T[] {
  const out: T[] = [];
  for (const it of [...items].sort((a, b) => b.score - a.score)) {
    if (out.length >= max) break;
    if (out.some((o) => hashDistance(o.stats.hash, it.stats.hash) <= 6)) continue;
    out.push(it);
  }
  return out;
}

/** Decodes a download; measures it; JPEG/PNG/WEBP pass through, anything else (AVIF…) is re-encoded as JPEG. */
async function analyse(blob: Blob): Promise<{ blob: Blob; stats: PhotoStats; thumb: HTMLCanvasElement } | null> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(blob);
  } catch {
    return null;
  }
  const { width, height } = bmp;
  if (Math.min(width, height) < MIN_PHOTO_SIDE) {
    bmp.close();
    return null;
  }
  const small = document.createElement('canvas');
  small.width = STAT_SIDE;
  small.height = STAT_SIDE;
  const sctx = small.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(bmp, 0, 0, STAT_SIDE, STAT_SIDE);
  const stats = photoStats(sctx.getImageData(0, 0, STAT_SIDE, STAT_SIDE).data, STAT_SIDE, STAT_SIDE, width, height);
  // A light preview for result thumbnails, so big batches don't keep full-size photos in memory.
  const k = Math.min(1, THUMB_SIDE / Math.max(width, height));
  const thumb = document.createElement('canvas');
  thumb.width = Math.round(width * k);
  thumb.height = Math.round(height * k);
  thumb.getContext('2d')!.drawImage(bmp, 0, 0, thumb.width, thumb.height);
  let out: Blob | null = blob;
  if (!sniffImageType(new Uint8Array(await blob.slice(0, 16).arrayBuffer()))) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    c.getContext('2d')!.drawImage(bmp, 0, 0);
    out = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.92));
  }
  bmp.close();
  return out ? { blob: out, stats, thumb } : null;
}

const THUMB_SIDE = 640;

export interface ImportedPhoto {
  id: Id;
  score: number;
  /** Small preview (≤640px) for result thumbnails; natural size in width/height. */
  preview: ImageSource;
}

/**
 * Downloads up to `candidates` photos of a post, scores them and imports the
 * best `max` (near-duplicates dropped), best first. Small images (icons,
 * thumbnails) and undecodable files are skipped.
 */
export async function importPagePhotos(
  images: PageImage[],
  opts: { max?: number; candidates?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<{ ids: Id[]; photos: ImportedPhoto[]; skipped: number }> {
  const max = opts.max ?? 8;
  const total = Math.min(images.length, opts.candidates ?? Math.max(12, max * 2));
  const got: { i: number; name: string; blob: Blob; stats: PhotoStats; thumb: HTMLCanvasElement; score: number }[] = [];
  let skipped = 0;
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < total) {
      const i = next++;
      try {
        const res = await fetch(`/api/image?url=${encodeURIComponent(images[i].url)}`);
        const a = res.ok ? await analyse(await res.blob()) : null;
        if (a) {
          const name = decodeURIComponent(new URL(images[i].url).pathname.split('/').pop() || 'photo.jpg');
          got.push({ i, name, ...a, score: scorePhoto(a.stats, i) });
        } else skipped++;
      } catch {
        skipped++;
      }
      opts.onProgress?.(++done, total);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);

  const best = pickBest(got, max);
  const photos: ImportedPhoto[] = [];
  for (const p of best) {
    const { ids } = await useAssets.getState().importFiles([Object.assign(p.blob, { name: p.name })]);
    if (ids[0]) photos.push({ id: ids[0], score: p.score, preview: { image: p.thumb, width: p.stats.width, height: p.stats.height } });
    else skipped++;
  }
  return { ids: photos.map((p) => p.id), photos, skipped: skipped + (got.length - best.length) };
}
