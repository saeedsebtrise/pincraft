import type { DrawableImage } from '../store/assetStore';

/** Small JPEG data URL for library thumbnails (canvas, bitmap or <img> sources). */
export function thumbUrl(img: DrawableImage, max = 240): string {
  const c = document.createElement('canvas');
  const k = max / Math.max(img.width, img.height);
  c.width = Math.max(1, Math.round(img.width * k));
  c.height = Math.max(1, Math.round(img.height * k));
  c.getContext('2d')!.drawImage(img as CanvasImageSource, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}
