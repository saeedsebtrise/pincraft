/**
 * Off-screen rendering of a document with the same node components the editor
 * uses. Export renders at scale 1 on a stage the exact size of the canvas, so
 * a 1000×1500 document always produces a 1000×1500 image.
 */
import Konva from 'konva';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Layer, Stage } from 'react-konva';
import { DocLayers, type ImageMap } from '../editor/canvas/nodes';
import { frames, isText } from '../model/docOps';
import type { AssetMeta, Id, PinDocument } from '../model/types';
import { useAssets, type DrawableImage } from '../store/assetStore';
import { FORMAT_MIME, type ExportFormat } from './filename';
import { docTextLayers, ensureFonts } from './fonts';

export function docAssetIds(doc: PinDocument): Id[] {
  const ids = frames(doc).map((f) => f.assetId).filter((a): a is Id => !!a);
  if (doc.background.type === 'image' && doc.background.assetId) ids.push(doc.background.assetId);
  return [...new Set(ids)];
}

/** Preview-quality image map from the asset store (fast; for thumbnails and previews). */
export async function previewImages(doc: PinDocument): Promise<ImageMap> {
  const ids = docAssetIds(doc);
  await useAssets.getState().ensureLoaded(ids);
  const { previews, metas } = useAssets.getState();
  return buildMap(ids, previews, metas);
}

export function buildMap(ids: Id[], images: Record<Id, DrawableImage>, metas: Record<Id, AssetMeta>): ImageMap {
  const map: ImageMap = {};
  for (const id of ids) {
    const img = images[id];
    const meta = metas[id];
    if (img && meta) map[id] = { image: img, width: meta.width, height: meta.height };
  }
  return map;
}

export interface RenderOptions {
  pixelRatio?: number;
  images: ImageMap;
  hidden?: Set<Id>;
}

export async function renderDocToCanvas(doc: PinDocument, o: RenderOptions): Promise<HTMLCanvasElement> {
  await ensureFonts(docTextLayers(doc));
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-100000px;top:0;pointer-events:none;opacity:0;';
  document.body.appendChild(host);
  const root = createRoot(host);
  let stage: Konva.Stage | null = null;
  try {
    flushSync(() => {
      root.render(
        <Stage width={doc.width} height={doc.height} ref={(s) => (stage = s)} listening={false}>
          <Layer listening={false}>
            <DocLayers doc={doc} images={o.images} mode="render" hidden={o.hidden} />
          </Layer>
        </Stage>,
      );
    });
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    if (!stage) throw new Error('Renderer failed to initialise');
    return (stage as Konva.Stage).toCanvas({ x: 0, y: 0, width: doc.width, height: doc.height, pixelRatio: o.pixelRatio ?? 1 });
  } finally {
    root.unmount();
    host.remove();
  }
}

export interface ExportResult {
  blob: Blob;
  width: number;
  height: number;
  mime: string;
}

export function webpSupported(): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

/**
 * Full-resolution render for export. Never resizes: the canvas is created at
 * the document size and the result is verified before it is returned.
 */
export async function renderForExport(doc: PinDocument, keepAlpha: boolean): Promise<HTMLCanvasElement> {
  const ids = docAssetIds(doc);
  await useAssets.getState().ensureLoaded(ids);
  const full: Record<Id, DrawableImage> = {};
  await Promise.all(
    ids.map(async (id) => {
      const img = await useAssets.getState().getFull(id);
      if (img) full[id] = img;
    }),
  );
  try {
    const rendered = await renderDocToCanvas(doc, { images: buildMap(ids, full, useAssets.getState().metas) });
    if (rendered.width !== doc.width || rendered.height !== doc.height) {
      throw new Error(`Render size ${rendered.width}×${rendered.height} doesn't match ${doc.width}×${doc.height}`);
    }
    const out = document.createElement('canvas');
    out.width = doc.width;
    out.height = doc.height;
    const ctx = out.getContext('2d')!;
    if (!keepAlpha) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, out.width, out.height);
    }
    ctx.drawImage(rendered, 0, 0);
    return out;
  } finally {
    Object.values(full).forEach((img) => 'close' in img && typeof img.close === 'function' && img.close());
  }
}

export async function encodeCanvas(canvas: HTMLCanvasElement, format: ExportFormat, quality = 0.92): Promise<ExportResult> {
  const mime = FORMAT_MIME[format];
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, format === 'png' ? undefined : quality));
  if (!blob) throw new Error('The browser could not encode the image.');
  if (blob.type !== mime) throw new Error(`This browser can't export ${format.toUpperCase()}.`);
  return { blob, width: canvas.width, height: canvas.height, mime };
}

export async function exportDocument(doc: PinDocument, format: ExportFormat, quality = 0.92, transparent = false): Promise<ExportResult> {
  const keepAlpha = format === 'png' && transparent && doc.background.type === 'transparent';
  return encodeCanvas(await renderForExport(doc, keepAlpha), format, quality);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Small JPEG data URL for dashboard cards and previews. */
export async function renderThumbnail(doc: PinDocument, width = 320, images?: ImageMap): Promise<string> {
  const map = images ?? (await previewImages(doc));
  const canvas = await renderDocToCanvas(doc, { images: map, pixelRatio: width / doc.width });
  const out = document.createElement('canvas');
  out.width = canvas.width;
  out.height = canvas.height;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(canvas, 0, 0);
  return out.toDataURL('image/jpeg', 0.82);
}

/** Average color under each text layer with the text hidden — feeds the contrast check. */
export async function sampleTextBackgrounds(doc: PinDocument): Promise<Record<Id, string>> {
  const texts = doc.layers.filter(isText).filter((t) => t.visible && t.text.trim() && !(t.background.enabled && t.background.opacity >= 0.7));
  if (!texts.length) return {};
  const k = 0.25;
  const canvas = await renderDocToCanvas(doc, {
    images: await previewImages(doc),
    pixelRatio: k,
    hidden: new Set(doc.layers.filter(isText).map((t) => t.id)),
  });
  const ctx = canvas.getContext('2d')!;
  const out: Record<Id, string> = {};
  for (const t of texts) {
    const x = Math.max(0, Math.floor(t.x * k));
    const y = Math.max(0, Math.floor(t.y * k));
    const w = Math.max(1, Math.min(canvas.width - x, Math.floor(t.width * k)));
    const h = Math.max(1, Math.min(canvas.height - y, Math.floor(t.height * k)));
    if (w <= 0 || h <= 0 || x >= canvas.width || y >= canvas.height) continue;
    const d = ctx.getImageData(x, y, w, h).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3] / 255;
      r += d[i] * a + 255 * (1 - a);
      g += d[i + 1] * a + 255 * (1 - a);
      b += d[i + 2] * a + 255 * (1 - a);
      n++;
    }
    const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0');
    out[t.id] = `#${hex(r)}${hex(g)}${hex(b)}`;
  }
  return out;
}
