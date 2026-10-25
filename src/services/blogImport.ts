/**
 * Blog URL → Pins, browser side: read a post's title and photo links through
 * the app's own server (/api/page — see server/pageFetch.mjs), download the
 * photos through /api/image and store them like normal uploads.
 */
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
async function toStorable(blob: Blob): Promise<{ blob: Blob; width: number; height: number } | null> {
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
  if (sniffImageType(new Uint8Array(await blob.slice(0, 16).arrayBuffer()))) {
    bmp.close();
    return { blob, width, height };
  }
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  c.getContext('2d')!.drawImage(bmp, 0, 0);
  bmp.close();
  const jpeg = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.92));
  return jpeg ? { blob: jpeg, width, height } : null;
}

/**
 * Downloads up to `max` usable photos (big enough, decodable) in page order and
 * imports them as assets. Small images (icons, thumbnails) are skipped.
 */
export async function importPagePhotos(
  images: PageImage[],
  opts: { max?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<{ ids: Id[]; skipped: number }> {
  const max = opts.max ?? 8;
  const picked: { i: number; blob: Blob & { name?: string } }[] = [];
  let skipped = 0;
  let next = 0;
  let done = 0;
  const total = Math.min(images.length, max * 2);
  const worker = async () => {
    while (next < total && picked.length < max) {
      const i = next++;
      try {
        const res = await fetch(`/api/image?url=${encodeURIComponent(images[i].url)}`);
        const ok = res.ok ? await toStorable(await res.blob()) : null;
        if (ok) {
          const name = decodeURIComponent(new URL(images[i].url).pathname.split('/').pop() || 'photo.jpg');
          picked.push({ i, blob: Object.assign(ok.blob, { name }) });
        } else skipped++;
      } catch {
        skipped++;
      }
      opts.onProgress?.(++done, total);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  // Keep the page order (featured image first), whatever order the downloads finished in.
  const ordered = picked.sort((a, b) => a.i - b.i).slice(0, max).map((p) => p.blob);
  const { ids, errors } = await useAssets.getState().importFiles(ordered);
  return { ids, skipped: skipped + errors.length };
}
