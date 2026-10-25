/**
 * Uploaded images. Originals are stored untouched in the asset repository;
 * the editor draws a downscaled preview, export decodes the full original.
 * All crops/filters are stored on layers, never baked into the source.
 */
import { create } from 'zustand';
import { UPLOAD_LIMITS } from '../config/colors';
import { newId } from '../model/factory';
import type { AssetMeta, Id } from '../model/types';
import { validateImageFile } from '../services/fileValidation';
import { repos } from '../storage/repositories';

export type DrawableImage = HTMLCanvasElement | ImageBitmap | HTMLImageElement;

interface AssetState {
  metas: Record<Id, AssetMeta>;
  previews: Record<Id, DrawableImage>;
  missing: Record<Id, true>;
  ensureLoaded: (ids: Id[]) => Promise<void>;
  importFiles: (files: (Blob & { name?: string })[]) => Promise<{ ids: Id[]; errors: string[] }>;
  getFull: (id: Id) => Promise<DrawableImage | null>;
  /** Frees in-memory previews (big batches); ensureLoaded brings them back from storage when needed. */
  dropPreviews: (ids: Id[]) => void;
}

async function decode(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

function makePreview(bmp: ImageBitmap): DrawableImage {
  const max = UPLOAD_LIMITS.previewMaxDimension;
  const longest = Math.max(bmp.width, bmp.height);
  if (longest <= max) return bmp;
  const k = max / longest;
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return c;
}

const inflight = new Map<Id, Promise<void>>();

export const useAssets = create<AssetState>((set, get) => ({
  metas: {},
  previews: {},
  missing: {},

  ensureLoaded: async (ids) => {
    await Promise.all(
      ids.map((id) => {
        if (get().previews[id] || get().missing[id]) return Promise.resolve();
        if (!inflight.has(id)) {
          inflight.set(
            id,
            (async () => {
              try {
                const stored = await repos.assets.get(id);
                if (!stored) throw new Error('missing');
                const bmp = await decode(stored.blob);
                set((s) => ({
                  metas: { ...s.metas, [id]: stored.meta },
                  previews: { ...s.previews, [id]: makePreview(bmp) },
                }));
              } catch {
                set((s) => ({ missing: { ...s.missing, [id]: true } }));
              } finally {
                inflight.delete(id);
              }
            })(),
          );
        }
        return inflight.get(id)!;
      }),
    );
  },

  importFiles: async (files) => {
    const ids: Id[] = [];
    const errors: string[] = [];
    for (const file of files) {
      const v = await validateImageFile(file);
      if (!v.ok) {
        errors.push(v.error);
        continue;
      }
      let bmp: ImageBitmap;
      try {
        bmp = await decode(file);
      } catch {
        errors.push(`${file.name ?? 'Image'} looks corrupted and couldn't be opened.`);
        continue;
      }
      if (Math.max(bmp.width, bmp.height) > UPLOAD_LIMITS.maxDimension) {
        errors.push(`${file.name ?? 'Image'} is ${bmp.width}×${bmp.height}px — max is ${UPLOAD_LIMITS.maxDimension}px per side.`);
        bmp.close();
        continue;
      }
      const meta: AssetMeta = {
        id: newId('a_'),
        name: file.name ?? 'image',
        mime: v.mime,
        width: bmp.width,
        height: bmp.height,
        size: file.size,
        createdAt: Date.now(),
      };
      try {
        await repos.assets.put({ meta, blob: file });
      } catch {
        errors.push(`Couldn't store ${meta.name}. Your browser storage may be full.`);
        bmp.close();
        continue;
      }
      set((s) => ({ metas: { ...s.metas, [meta.id]: meta }, previews: { ...s.previews, [meta.id]: makePreview(bmp) } }));
      ids.push(meta.id);
    }
    return { ids, errors };
  },

  /** Full-resolution decode for export. Caller should close() ImageBitmaps when done. */
  dropPreviews: (ids) =>
    set((s) => {
      const previews = { ...s.previews };
      for (const id of ids) {
        const p = previews[id];
        if (p && 'close' in p) p.close();
        delete previews[id];
      }
      return { previews };
    }),

  getFull: async (id) => {
    const stored = await repos.assets.get(id);
    if (!stored) return null;
    try {
      return await decode(stored.blob);
    } catch {
      return null;
    }
  },
}));
