/**
 * AI designs, browser side: asks the app's AI server (/api/ai-design, see
 * server/aiDesign.mjs) for brand-new Pin designs and turns each returned spec
 * into a normal PinCraft template. Every value from the AI is checked and
 * clamped (positions, sizes, colours, fonts, layouts), and the result then goes
 * through the same Auto Design pipeline as the built-in templates: headline
 * split, text fit, nothing cut off, real photos, CTA.
 */
import { COLLAGE_LAYOUTS } from '../collage/layouts';
import { FONT_LIBRARY } from '../config/fonts';
import type { ImageSource } from '../editor/canvas/nodes';
import { createShape, createText } from '../model/factory';
import type { Layer, Template, TextLayer } from '../model/types';
import { badge, bgOff, bgOn, tpl } from '../templates/kit';

// ---------------------------------------------------------------- spec (mirrors server/aiDesign.mjs)

interface TextSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  font: string;
  weight: number;
  color: string;
  size: number;
  uppercase: boolean;
  italic: boolean;
  letterSpacing: number;
  align: 'left' | 'center' | 'right';
  background: 'none' | 'block' | 'pill' | 'full-width';
  backgroundColor: string;
  outlineWidth: number;
  outlineColor: string;
  shadow: boolean;
}

export interface AiDesignSpec {
  name: string;
  background: string;
  photos: { layout: string; top: number; height: number; gap: number };
  panels: { x: number; y: number; w: number; h: number; color: string; opacity: number; radius: number }[];
  rules: { x: number; y: number; w: number; h: number; color: string }[];
  badge: { show: boolean; x: number; y: number; size: number; shape: 'circle' | 'square' | 'rounded' | 'plain'; color: string; textColor: string; font: string; outlineWidth: number; outlineColor: string };
  lines: (TextSpec & { words: number })[];
  subtitle: TextSpec & { show: boolean };
  cta: TextSpec & { show: boolean };
  website: TextSpec & { show: boolean };
}

// ---------------------------------------------------------------- request

export interface AiDesignRequest {
  headline: string;
  subtitle?: string;
  topic?: string;
  width: number;
  height: number;
  count: number;
  photos?: ImageSource[];
}

/** Up to 6 colours that dominate the photos (coarse buckets, greys and near-white/black skipped). */
export function photoPalette(photos: ImageSource[]): string[] {
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  const c = document.createElement('canvas');
  c.width = 24;
  c.height = 24;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  for (const p of photos.slice(0, 8)) {
    ctx.drawImage(p.image as CanvasImageSource, 0, 0, 24, 24);
    const d = ctx.getImageData(0, 0, 24, 24).data;
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max < 30 || min > 235 || max - min < 18) continue;
      const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
      const s = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      buckets.set(key, { n: s.n + 1, r: s.r + r, g: s.g + g, b: s.b + b });
    }
  }
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
    .map((s) => `#${hex(s.r / s.n)}${hex(s.g / s.n)}${hex(s.b / s.n)}`);
}

export class AiDesignError extends Error {}

export async function requestAiDesigns(req: AiDesignRequest): Promise<AiDesignSpec[]> {
  let res: Response;
  try {
    res = await fetch('/api/ai-design', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        headline: req.headline,
        subtitle: req.subtitle,
        topic: req.topic,
        width: req.width,
        height: req.height,
        count: req.count,
        layouts: COLLAGE_LAYOUTS.map((l) => ({ id: l.id, count: l.count, band: !!l.bandable })),
        fonts: FONT_LIBRARY.map((f) => f.family),
        palette: req.photos?.length ? photoPalette(req.photos) : [],
        photoRatios: (req.photos ?? []).map((p) => p.height / p.width),
      }),
    });
  } catch {
    throw new AiDesignError(AI_OFFLINE);
  }
  if (!res.ok) {
    let msg = '';
    try {
      msg = ((await res.json()) as { error?: string }).error ?? '';
    } catch {
      /* not JSON: the AI server isn't running behind the dev proxy */
    }
    throw new AiDesignError(res.status === 404 || res.status >= 500 && !msg ? AI_OFFLINE : msg || `AI request failed (${res.status})`);
  }
  const data = (await res.json()) as { designs?: AiDesignSpec[] };
  return Array.isArray(data.designs) ? data.designs : [];
}

export const AI_OFFLINE = 'AI designs need the AI server. Start it with your Anthropic API key: ANTHROPIC_API_KEY=… npm run ai-proxy (see README).';

// ---------------------------------------------------------------- spec → template

const clamp = (v: unknown, lo: number, hi: number, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);
const color = (v: unknown, fallback: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim()) ? v.trim().toUpperCase() : fallback);
const FONTS = new Set(FONT_LIBRARY.map((f) => f.family));
const font = (v: unknown) => (typeof v === 'string' && FONTS.has(v) ? v : 'Montserrat');
const LAYOUTS = new Map(COLLAGE_LAYOUTS.map((l) => [l.id, l]));

/** Text box from a spec: inside the safe area, sized and styled from the (clamped) values. */
function textLayer(s: TextSpec, W: number, H: number, p: Partial<TextLayer>): TextLayer {
  const x = clamp(s.x, 0.02, 0.9, 0.08);
  const y = clamp(s.y, 0.01, 0.95, 0.4);
  const w = clamp(s.w, 0.08, 0.98 - x, 0.84);
  const h = clamp(s.h, 0.015, 0.97 - y, 0.08);
  const fontSize = Math.max(10, clamp(s.size, 0.01, 0.25, h) * H);
  const bgColor = color(s.backgroundColor, '#FFFFFF');
  const background =
    s.background === 'block'
      ? bgOn(bgColor, { hug: true, paddingX: fontSize * 0.25, paddingY: fontSize * 0.06 })
      : s.background === 'pill'
        ? bgOn(bgColor, { hug: true, shape: 'pill', paddingX: fontSize * 0.5, paddingY: fontSize * 0.12 })
        : s.background === 'full-width'
          ? bgOn(bgColor, { hug: false, paddingX: fontSize * 0.2, paddingY: fontSize * 0.06 })
          : bgOff();
  const outline = clamp(s.outlineWidth, 0, 0.3, 0);
  return createText({
    x: x * W,
    y: y * H,
    width: w * W,
    height: h * H,
    text: ' ',
    fontFamily: font(s.font),
    fontWeight: Math.round(clamp(s.weight, 100, 900, 700) / 100) * 100,
    fontSize,
    minFontSize: 10,
    lineHeight: 1,
    fill: color(s.color, '#111111'),
    italic: !!s.italic,
    textTransform: s.uppercase ? 'uppercase' : 'none',
    letterSpacing: clamp(s.letterSpacing, -2, 20, 0) * (fontSize / 100),
    align: s.align === 'left' || s.align === 'right' ? s.align : 'center',
    autoFit: true,
    background,
    strokeWidth: outline * fontSize,
    stroke: color(s.outlineColor, '#111111'),
    shadow: s.shadow ? { enabled: true, color: '#000000', blur: 12, offsetX: 0, offsetY: 3, opacity: 0.45 } : { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0, opacity: 0 },
    ...p,
  });
}

let seq = 0;

/** A PinCraft template from one AI design. Returns null when the spec has no usable headline lines. */
export function specToTemplate(spec: AiDesignSpec, W: number, H: number): Template | null {
  const lines = (Array.isArray(spec.lines) ? spec.lines : []).slice(0, 5);
  if (!lines.length) return null;
  const layout = LAYOUTS.get(spec.photos?.layout) ?? LAYOUTS.get('single')!;
  const top = clamp(spec.photos?.top, 0, 0.9, 0);
  const height = clamp(spec.photos?.height, 0.1, 1 - top, 1 - top);
  const name = (typeof spec.name === 'string' ? spec.name : 'Design').replace(/[^\p{L}\p{N} &'+-]/gu, '').slice(0, 40) || 'Design';
  return tpl({
    id: `ai-${Date.now().toString(36)}-${seq++}`,
    name: `AI — ${name}`,
    description: 'An original design made by AI for this post.',
    family: 6,
    categories: ['Custom Blog Pin'],
    designTypes: ['image-text-overlay'],
    w: W,
    h: H,
    bg: color(spec.background, '#FFFFFF'),
    collage: {
      layoutId: layout.id, // empty frames fill when photos are added
      gap: clamp(spec.photos?.gap, 0, 24, 6),
      region: { x: 0, y: top, width: 1, height },
      ...(layout.bandable ? { band: 0.32 } : {}),
    },
    layers: () => {
      const out: Layer[] = [];
      for (const p of (spec.panels ?? []).slice(0, 3)) {
        const x = clamp(p.x, 0, 1, 0);
        const y = clamp(p.y, 0, 1, 0);
        out.push(
          createShape({
            name: 'Panel',
            role: 'decor',
            x: x * W,
            y: y * H,
            width: clamp(p.w, 0.02, 1 - x, 1) * W,
            height: clamp(p.h, 0.01, 1 - y, 0.2) * H,
            fill: color(p.color, '#FFFFFF'),
            opacity: clamp(p.opacity, 0.1, 1, 1),
            cornerRadius: clamp(p.radius, 0, 0.1, 0) * W,
          }),
        );
      }
      for (const r of (spec.rules ?? []).slice(0, 4)) {
        const x = clamp(r.x, 0, 1, 0.1);
        const y = clamp(r.y, 0, 1, 0.5);
        out.push(createShape({ name: 'Rule', role: 'decor', x: x * W, y: y * H, width: clamp(r.w, 0.01, 1 - x, 0.2) * W, height: Math.max(2, clamp(r.h, 0.001, 0.02, 0.003) * H), fill: color(r.color, '#111111') }));
      }
      const b = spec.badge;
      if (b?.show) {
        const size = clamp(b.size, 0.08, 0.4, 0.2) * W;
        const shape = b.shape === 'plain' ? 'square' : b.shape === 'circle' || b.shape === 'rounded' ? b.shape : 'square';
        const x = clamp(b.x, 0.02, 0.98, 0.4) * W;
        const y = clamp(b.y, 0.01, 0.95, 0.3) * H;
        out.push(
          badge(Math.min(x, W - size), Math.min(y, H - size), size, '0', shape, color(b.color, '#111111'), color(b.textColor, '#FFFFFF'), {
            fontFamily: font(b.font),
            ...(b.shape === 'plain' ? { background: bgOff() } : {}),
            strokeWidth: clamp(b.outlineWidth, 0, 0.3, 0) * size * 0.58,
            stroke: color(b.outlineColor, '#111111'),
          }),
        );
      }
      lines.forEach((l, i) =>
        out.push(textLayer(l, W, H, { name: `Title line ${i + 1}`, role: 'title-line', wordCount: l.words > 0 ? Math.round(l.words) : undefined })),
      );
      if (spec.subtitle?.show) out.push(textLayer(spec.subtitle, W, H, { name: 'Subtitle line', role: 'subtitle' }));
      if (spec.cta?.show) out.push(textLayer(spec.cta, W, H, { name: 'Call to action', role: 'cta', text: 'Read More' }));
      if (spec.website?.show) out.push(textLayer(spec.website, W, H, { name: 'Website footer', role: 'website', text: 'yourwebsite.com' }));
      return out;
    },
  });
}
