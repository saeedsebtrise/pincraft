/**
 * Video Pins: turns photos + text into a short vertical video in the browser
 * (canvas → MediaRecorder; MP4 where the browser can record it, else WebM),
 * and keeps a local video library (IndexedDB) with each video's Pin details.
 */
import { createStore, del, get, set, values } from 'idb-keyval';
import type { BrandKit } from '../model/types';
import { cssFontFamily } from '../config/fonts';
import { ensureFonts } from './fonts';

export type StoryFormat = 'product' | 'tips' | 'slideshow';

export const STORY_FORMATS: { id: StoryFormat; label: string; hint: string }[] = [
  { id: 'product', label: 'Product Showcase', hint: 'Tell your product story with clear details and a shop CTA.' },
  { id: 'tips', label: 'Blog Tips', hint: 'Turn the useful points in your post into a short, readable video.' },
  { id: 'slideshow', label: 'Image Slideshow', hint: 'Let your images tell the story with smooth photo transitions.' },
];

export interface Slide {
  image: CanvasImageSource & { width: number; height: number };
  /** Big line on the slide (may be empty). */
  text: string;
  /** Small line under it. */
  sub?: string;
}

export interface StoryInput {
  title: string;
  description: string;
  url: string;
  photos: Slide['image'][];
  format: StoryFormat;
}

/** "product" for shop-like URLs/titles, else "tips" when the text has several points, else a slideshow. */
export function matchFormat(i: Pick<StoryInput, 'url' | 'title' | 'description'>): StoryFormat {
  if (/\/(products?|shop|store|item|p)\//i.test(i.url) || /\b(buy|shop|sale|price|\$\d)/i.test(`${i.title} ${i.description}`)) return 'product';
  if (/^\d+\s|\b(tips|ways|ideas|steps|how to|guide|hacks)\b/i.test(i.title)) return 'tips';
  return 'slideshow';
}

/** Short readable points from a description (sentences, then clauses), max `n`, each ≤ 70 chars. */
export function storyPoints(description: string, n = 4): string[] {
  const parts = description
    .split(/(?<=[.!?])\s+|\s+[–—-]\s+|;\s*/)
    .map((s) => s.replace(/[.!?]+$/, '').trim())
    .filter((s) => s.split(/\s+/).length >= 3);
  return parts.slice(0, n).map((s) => (s.length > 70 ? `${s.slice(0, 67).replace(/\s+\S*$/, '')}…` : s));
}

/** Slides for a story: an opening title frame, the middle points, and a CTA end frame. */
export function storySlides(i: StoryInput): Slide[] {
  const photos = i.photos.length ? i.photos : [];
  if (!photos.length) return [];
  const at = (k: number) => photos[k % photos.length];
  const points = storyPoints(i.description);
  const cta = i.format === 'product' ? 'Shop now' : i.format === 'tips' ? 'Read the full post' : 'See more';
  const middle =
    i.format === 'slideshow'
      ? photos.slice(1, 5).map((image) => ({ image, text: '' }))
      : (points.length ? points : [i.description || i.title]).map((text, k) => ({ image: at(k + 1), text, sub: i.format === 'tips' ? `Tip ${k + 1}` : undefined }));
  return [{ image: at(0), text: i.title, sub: i.format === 'product' ? 'New favourite' : undefined }, ...middle, { image: at(middle.length + 1), text: cta, sub: hostOf(i.url) }];
}

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export function recorderType(): string {
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  return types.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) ?? 'video/webm';
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function cover(ctx: CanvasRenderingContext2D, img: Slide['image'], W: number, H: number, zoom: number) {
  const s = Math.max(W / img.width, H / img.height) * zoom;
  const w = img.width * s;
  const h = img.height * s;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

/** Draws one frame: slide `i` at progress p (0..1), cross-fading into the next slide in the last 15%. */
export function drawFrame(ctx: CanvasRenderingContext2D, slides: Slide[], i: number, p: number, kit: Pick<BrandKit, 'accent' | 'headingFont' | 'bodyFont'>) {
  const { width: W, height: H } = ctx.canvas;
  const s = slides[i];
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  cover(ctx, s.image, W, H, 1.04 + 0.08 * p); // slow Ken Burns zoom
  const fade = slides[i + 1] && p > 0.85 ? (p - 0.85) / 0.15 : 0;
  if (fade) {
    ctx.globalAlpha = fade;
    cover(ctx, slides[i + 1].image, W, H, 1.04);
    ctx.globalAlpha = 1;
  }
  if (!s.text) return;
  const textAlpha = Math.min(1, p * 5) * (1 - fade);
  const last = i === slides.length - 1;
  ctx.globalAlpha = textAlpha;
  const g = ctx.createLinearGradient(0, H * 0.45, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = g;
  ctx.fillRect(0, H * 0.45, W, H * 0.55);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const size = Math.round(W * (i === 0 ? 0.085 : 0.066));
  ctx.font = `800 ${size}px ${cssFontFamily(kit.headingFont)}`;
  const lines = wrap(ctx, s.text, W * 0.84).slice(0, 4);
  let y = H * 0.86 - (lines.length - 1) * size * 1.12;
  if (last) {
    // CTA end card: a button in the brand accent
    ctx.font = `800 ${Math.round(W * 0.06)}px ${cssFontFamily(kit.bodyFont)}`;
    const tw = ctx.measureText(s.text).width + W * 0.12;
    const bh = W * 0.12;
    ctx.fillStyle = kit.accent;
    ctx.beginPath();
    ctx.roundRect((W - tw) / 2, H * 0.72, tw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(s.text, W / 2, H * 0.72 + bh * 0.66);
    y = H * 0.72 + bh + W * 0.08;
  } else {
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    for (const l of lines) {
      ctx.fillText(l, W / 2, y);
      y += size * 1.12;
    }
    ctx.shadowBlur = 0;
  }
  if (s.sub) {
    ctx.font = `700 ${Math.round(W * 0.036)}px ${cssFontFamily(kit.bodyFont)}`;
    ctx.fillStyle = last ? '#fff' : kit.accent;
    ctx.fillText(last ? s.sub : s.sub.toUpperCase(), W / 2, last ? y : H * 0.86 - lines.length * size * 1.12 - size * 0.2);
  }
  ctx.globalAlpha = 1;
}

/** Records the slides as a video (real time: ~seconds × slides). */
export async function renderVideo(
  slides: Slide[],
  kit: Pick<BrandKit, 'accent' | 'headingFont' | 'bodyFont'>,
  o: { width?: number; height?: number; seconds?: number; onProgress?: (p: number) => void } = {},
): Promise<{ blob: Blob; duration: number; cover: string }> {
  if (!slides.length) throw new Error('No photos to make a video from.');
  if (typeof MediaRecorder === 'undefined') throw new Error('This browser can’t record video. Try Chrome or Edge.');
  // The brand fonts must be loaded before the first frame, or the canvas falls back to a system font.
  await ensureFonts([700, 800].flatMap((w) => [kit.headingFont, kit.bodyFont].map((fontFamily) => ({ fontFamily, fontWeight: w, italic: false })))).catch(() => undefined);
  const canvas = Object.assign(document.createElement('canvas'), { width: o.width ?? 720, height: o.height ?? 1080 });
  const ctx = canvas.getContext('2d')!;
  const per = (o.seconds ?? 3) * 1000;
  const total = per * slides.length;
  drawFrame(ctx, slides, 0, 0.3, kit);
  const cover = canvas.toDataURL('image/jpeg', 0.8);
  const type = recorderType();
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((r) => (rec.onstop = () => r()));
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    // setInterval keeps drawing when the tab is in the background (rAF would pause).
    const id = setInterval(() => {
      const t = performance.now() - t0;
      if (t >= total) {
        clearInterval(id);
        resolve();
        return;
      }
      const i = Math.min(slides.length - 1, Math.floor(t / per));
      drawFrame(ctx, slides, i, (t - i * per) / per, kit);
      o.onProgress?.(t / total);
    }, 1000 / 30);
  });
  rec.stop();
  await stopped;
  stream.getTracks().forEach((t) => t.stop());
  return { blob: new Blob(chunks, { type: type.split(';')[0] }), duration: total / 1000, cover };
}

// ---------------------------------------------------------------- library

export type VideoStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface VideoPin {
  id: string;
  createdAt: number;
  source: 'made' | 'uploaded';
  blob: Blob;
  mime: string;
  duration: number;
  /** JPEG data URL of the opening frame. */
  cover: string;
  title: string;
  description: string;
  link: string;
  boardId: string;
  altText: string;
  aiMade: boolean;
  relationship: 'none' | 'affiliate' | 'sponsored';
  status: VideoStatus;
  publishAt: number | null;
  pinUrl?: string;
  error?: string;
}

const store = (() => {
  let s: ReturnType<typeof createStore> | undefined;
  return () => (s ??= createStore('pinforge-videos', 'videos'));
})();

export const videoRepo = {
  list: async () => ((await values(store())) as VideoPin[]).sort((a, b) => b.createdAt - a.createdAt),
  get: (id: string) => get<VideoPin>(id, store()),
  put: (v: VideoPin) => set(v.id, v, store()),
  remove: (id: string) => del(id, store()),
};

/** Duration and cover frame of an uploaded video file. */
export function probeVideo(file: Blob): Promise<{ duration: number; width: number; height: number; cover: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = Object.assign(document.createElement('video'), { muted: true, preload: 'auto', src: url });
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That video can’t be played in this browser. Use an MP4 (H.264).'));
    };
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(0.5, v.duration / 2);
    };
    v.onseeked = () => {
      const c = Object.assign(document.createElement('canvas'), { width: 360, height: Math.round((360 * v.videoHeight) / v.videoWidth) || 540 });
      c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
      resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight, cover: c.toDataURL('image/jpeg', 0.8) });
      URL.revokeObjectURL(url);
    };
  });
}
