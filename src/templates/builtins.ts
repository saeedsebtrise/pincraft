/**
 * Starter template library, organised in 10 families modelled on the structure
 * of real Pinterest blog Pins (collage + center band, number-badge listicles,
 * script + bold type, overlays, text panels, hair/beauty, home decor, blank).
 *
 * Each template is a plain PinDocument authored at its native size; it is data,
 * not a screenshot. instantiateTemplate() scales it to the user's canvas and
 * every layer stays editable.
 */
import { bandRect, getLayout } from '../collage/layouts';
import type { DesignType, TemplateFamilyId } from '../config/designTypes';
import { applyCollage, frames } from '../model/docOps';
import { createDocument, createShape, createText, defaultBackground } from '../model/factory';
import type { CollageSettings, Layer, PinDocument, Rect, Template, TemplateCategory, TextLayer } from '../model/types';

interface Ctx {
  W: number;
  H: number;
  /** Open text band between image rows (band layouts only). */
  band: Rect;
}

interface TplSpec {
  id: string;
  name: string;
  description: string;
  family: TemplateFamilyId;
  categories: TemplateCategory[];
  designTypes: DesignType[];
  w?: number;
  h?: number;
  bg?: string;
  collage?: Partial<CollageSettings> & { layoutId: string };
  layers?: (c: Ctx) => Layer[];
}

const FULL = { x: 0, y: 0, width: 1, height: 1 };

function tpl(s: TplSpec): Template {
  const W = s.w ?? 1000;
  const H = s.h ?? 1500;
  let doc: PinDocument = createDocument(W, H, W === 736 && H === 1472 ? 'custom-blog-736' : 'pin-standard');
  doc.background = defaultBackground(s.bg ?? '#FFFFFF');
  let band: Rect = { x: 0, y: H * 0.4, width: W, height: H * 0.2 };
  if (s.collage) {
    const settings: CollageSettings = {
      region: FULL,
      gap: 0,
      margin: 0,
      band: 0,
      cornerRadius: 0,
      borderWidth: 0,
      borderColor: '#FFFFFF',
      ...s.collage,
    };
    doc = applyCollage(doc, settings);
    const layout = getLayout(settings.layoutId);
    const b = layout && bandRect(layout, W, H, settings.region, settings.margin, settings.band);
    if (b) band = b;
  }
  doc.layers = [...doc.layers, ...(s.layers?.({ W, H, band }) ?? [])];
  if (doc.collage) doc = applyCollage(doc, doc.collage); // sync band shapes
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    family: s.family,
    categories: s.categories,
    designTypes: s.designTypes,
    imageCount: frames(doc).filter((f) => f.role !== 'logo').length,
    doc,
    source: 'builtin',
    createdAt: 0,
  };
}

// ---------- reusable design blocks ----------
type TP = Partial<TextLayer>;

export const bgOn = (color: string, p: Partial<TextLayer['background']> = {}): TextLayer['background'] => ({
  enabled: true,
  shape: 'rect',
  color,
  opacity: 1,
  paddingX: 28,
  paddingY: 10,
  radius: 0,
  borderWidth: 0,
  borderColor: '#111111',
  hug: true,
  ...p,
});
const bgOff = (): TextLayer['background'] => ({ ...bgOn('#FFFFFF'), enabled: false });
const SHADOW = { enabled: true, color: '#000000', blur: 14, offsetX: 0, offsetY: 3, opacity: 0.45 };

function bandShape(color: string, name = 'Text band'): Layer {
  return createShape({ name, role: 'band', fill: color, x: 0, y: 0, width: 10, height: 10 });
}

function divider(x: number, y: number, w: number, color = '#111111', h = 3): Layer {
  return createShape({ name: 'Divider line', role: 'decor', x, y, width: w, height: h, fill: color });
}

function titleLine(W: number, y: number, h: number, text: string, p: TP = {}): TextLayer {
  return createText({
    name: 'Title line',
    role: 'title-line',
    x: W * 0.08,
    y,
    width: W * 0.84,
    height: h,
    text,
    fontFamily: 'Playfair Display',
    fontWeight: 800,
    fontSize: h * 0.82,
    lineHeight: 1,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fill: '#111111',
    minFontSize: 20,
    background: bgOn('#FFFFFF'),
    ...p,
  });
}

type BadgeShape = 'circle' | 'square' | 'rounded' | 'pill';
function badge(x: number, y: number, size: number, text: string, shape: BadgeShape, color: string, fill: string, p: TP = {}): TextLayer {
  const pill = shape === 'pill';
  return createText({
    name: 'Number badge',
    role: 'badge',
    x,
    y,
    width: pill ? size * 1.6 : size,
    height: size,
    text,
    fontFamily: 'Anton',
    fontWeight: 400,
    fontSize: size * 0.58,
    lineHeight: 1,
    fill,
    minFontSize: 16,
    autoFit: true,
    background: bgOn(color, {
      hug: false,
      shape: shape === 'circle' ? 'circle' : pill ? 'pill' : 'rect',
      radius: shape === 'rounded' ? size * 0.18 : 0,
      paddingX: size * 0.08,
      paddingY: size * 0.08,
    }),
    ...p,
  });
}

function title(x: number, y: number, w: number, h: number, text: string, p: TP = {}): TextLayer {
  return createText({
    name: 'Title',
    role: 'title',
    x,
    y,
    width: w,
    height: h,
    text,
    fontFamily: 'Anton',
    fontWeight: 400,
    fontSize: 120,
    lineHeight: 1.05,
    textTransform: 'uppercase',
    fill: '#111111',
    minFontSize: 22,
    ...p,
  });
}

function accent(x: number, y: number, w: number, h: number, text: string, p: TP = {}): TextLayer {
  return createText({
    name: 'Script accent',
    role: 'accent',
    x,
    y,
    width: w,
    height: h,
    text,
    fontFamily: 'Great Vibes',
    fontWeight: 400,
    fontSize: h * 0.9,
    lineHeight: 1,
    fill: '#B5651D',
    minFontSize: 20,
    ...p,
  });
}

/** Small decorative caption ("The ultimate guide"). Real subtitles use role 'subtitle' and get filled from the article title. */
function label(x: number, y: number, w: number, h: number, text: string, p: TP = {}): TextLayer {
  return createText({
    name: 'Label',
    role: 'decor',
    x,
    y,
    width: w,
    height: h,
    text,
    fontFamily: 'Montserrat',
    fontWeight: 600,
    fontSize: h * 0.6,
    letterSpacing: 4,
    textTransform: 'uppercase',
    fill: '#111111',
    minFontSize: 12,
    ...p,
  });
}

export type FooterStyle = 'over-image' | 'dark-pill' | 'light-pill' | 'plain-dark' | 'plain-light';

/** Website footer block — uppercase, letter-spaced, centered by default. */
export function footer(W: number, H: number, style: FooterStyle, p: TP = {}): TextLayer {
  const h = Math.max(36, W * 0.05);
  const base: TP = {
    name: 'Website footer',
    role: 'website',
    x: W * 0.15,
    y: H - h - H * 0.028,
    width: W * 0.7,
    height: h,
    text: 'yourwebsite.com',
    fontFamily: 'Montserrat',
    fontWeight: 700,
    fontSize: W * 0.024,
    letterSpacing: W * 0.004,
    textTransform: 'uppercase',
    minFontSize: 11,
    background: bgOff(),
  };
  const styles: Record<FooterStyle, TP> = {
    'over-image': { fill: '#FFFFFF', shadow: SHADOW },
    'dark-pill': { fill: '#FFFFFF', background: bgOn('#111111', { shape: 'pill', paddingX: W * 0.03, paddingY: W * 0.01 }) },
    'light-pill': { fill: '#111111', background: bgOn('#FFFFFF', { shape: 'pill', paddingX: W * 0.03, paddingY: W * 0.01 }) },
    'plain-dark': { fill: '#111111' },
    'plain-light': { fill: '#FFFFFF' },
  };
  return createText({ ...base, ...styles[style], ...p });
}

// Band text positions as fractions of the band, so templates read clearly.
const inBand = (b: Rect, fy: number, fh: number, padX = 0.07) => ({
  x: b.x + b.width * padX,
  y: b.y + b.height * fy,
  w: b.width * (1 - padX * 2),
  h: b.height * fh,
});

// ---------- the library ----------
export const BUILTIN_TEMPLATES: Template[] = [
  // ===== Signature designs (modelled on the PinCraft mockups) =====
  tpl({
    id: 'm1-lob-pink-blocks',
    name: 'Lob Haircut — Pink Blocks',
    description: '2×2 photos, big pink circle badge, white headline block, pink keyword block and a black website bar.',
    family: 3,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['editorial', 'listicle'],
    collage: { layoutId: 'grid-2x2', gap: 12, region: { x: 0, y: 0, width: 1, height: 0.945 } },
    layers: ({ W, H }) => [
      badge(W / 2 - 110, 352, 220, '50', 'circle', '#FF5C8D', '#111111', { fontFamily: 'Playfair Display', fontWeight: 900, fontSize: 150 }),
      titleLine(W, 562, 140, 'Lob Haircut', { fontFamily: 'Anton', fontWeight: 400, x: W * 0.04, width: W * 0.92, letterSpacing: 0, background: bgOn('#FFFFFF', { paddingX: 30, paddingY: 6 }) }),
      titleLine(W, 708, 130, 'Ideas', { fontFamily: 'Playfair Display', fontWeight: 800, fill: '#FFFFFF', background: bgOn('#FF5C8D', { paddingX: 44, paddingY: 4 }) }),
      createShape({ name: 'Footer bar', role: 'decor', x: 0, y: H * 0.945, width: W, height: H * 0.055, fill: '#111111' }),
      footer(W, H, 'plain-light', { y: H * 0.95, height: H * 0.045, fontSize: 34, letterSpacing: 9, fontWeight: 700 }),
    ],
  }),
  tpl({
    id: 'm2-lob-subtitle-band',
    name: 'Lob Haircut — Subtitle Band',
    description: 'Pink badge and blocks with a cream subtitle line (filled from your article title) and a soft pink website ribbon.',
    family: 3,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['editorial', 'listicle'],
    collage: { layoutId: 'grid-2x2', gap: 12 },
    layers: ({ W, H }) => [
      badge(W / 2 - 105, 330, 210, '50', 'circle', '#FF5C8D', '#FFFFFF', { fontFamily: 'Playfair Display', fontWeight: 900, fontSize: 140 }),
      titleLine(W, 526, 140, 'Lob Haircut', { fontFamily: 'Anton', fontWeight: 400, x: W * 0.04, width: W * 0.92, letterSpacing: 0, background: bgOn('#FFFFFF', { paddingX: 30, paddingY: 6 }) }),
      titleLine(W, 668, 120, 'Ideas', { fontFamily: 'Playfair Display', fontWeight: 800, fill: '#FFFFFF', background: bgOn('#FF5C8D', { paddingX: 60, paddingY: 4 }) }),
      createText({
        name: 'Subtitle',
        role: 'subtitle',
        x: W * 0.1,
        y: 790,
        width: W * 0.8,
        height: 120,
        text: 'To take to your next salon appointment',
        fontFamily: 'Montserrat',
        fontWeight: 800,
        fontSize: 40,
        letterSpacing: 4,
        lineHeight: 1.2,
        textTransform: 'uppercase',
        fill: '#2E2420',
        minFontSize: 18,
        background: bgOn('#FCEBDD', { paddingX: 28, paddingY: 12 }),
      }),
      footer(W, H, 'light-pill', { fill: '#2E2420', fontSize: 34, letterSpacing: 6, height: 70, y: H - 110, x: W * 0.12, width: W * 0.76, background: bgOn('#F8C8D4', { shape: 'rect', radius: 6, paddingX: 40, paddingY: 12 }) }),
    ],
  }),
  tpl({
    id: 'm3-balcony-stunning',
    name: 'Balcony — Stunning Script Band',
    description: 'Cream center band with a green number badge, a script accent, a distressed green keyword and bold caps.',
    family: 9,
    categories: ['Balcony', 'Home Decor', 'Patio', 'Listicle'],
    designTypes: ['split', 'script-bold', 'listicle'],
    bg: '#FBF4EA',
    collage: { layoutId: 'band-2-2', gap: 10, band: 0.36, region: { x: 0, y: 0, width: 1, height: 0.95 } },
    layers: ({ W, H, band }) => [
      bandShape('#FBF4EA'),
      badge(W / 2 - 100, band.y - 120, 200, '28', 'circle', '#3F5A2A', '#FFFFFF', { fontFamily: 'Playfair Display', fontWeight: 900, fontSize: 130 }),
      accent(W * 0.04, band.y + 60, W * 0.62, 170, 'Stunning', { fontFamily: 'Allura', fill: '#1F1A17', fontSize: 170, rotation: -6, align: 'left' }),
      titleLine(W, band.y + 170, 200, 'Balcony', {
        fontFamily: 'Rubik Distressed',
        fontWeight: 400,
        fill: '#4A6B2E',
        x: W * 0.03,
        width: W * 0.94,
        letterSpacing: 2,
        background: { ...bgOn('#FFFFFF'), enabled: false },
      }),
      titleLine(W, band.y + 370, 120, 'Decor Ideas', {
        fontFamily: 'Archivo Black',
        fontWeight: 400,
        fill: '#111111',
        x: W * 0.05,
        width: W * 0.9,
        background: { ...bgOn('#FFFFFF'), enabled: false },
      }),
      footer(W, H, 'plain-dark', { y: H * 0.955, height: H * 0.04, fontSize: 30, letterSpacing: 10, fontWeight: 700, x: W * 0.08, width: W * 0.84 }),
    ],
  }),

  // ===== Family 1 — 2 top + 2 bottom + center text =====
  tpl({
    id: 'f1-center-white-badge',
    name: 'Center Text — White Band + Badge',
    description: '2 photos top, 2 bottom, large white center text section and a circular number badge.',
    family: 1,
    categories: ['Hair', 'Beauty', 'Listicle', 'Lifestyle'],
    designTypes: ['split', 'listicle'],
    collage: { layoutId: 'band-2-2', gap: 8, band: 0.3 },
    layers: ({ W, H, band }) => {
      const t = inBand(band, 0.22, 0.7);
      return [
        bandShape('#FFFFFF'),
        badge(W / 2 - 78, band.y - 78, 156, '28', 'circle', '#111111', '#FFFFFF'),
        title(t.x, t.y, t.w, t.h, 'Hair Makeover Ideas', { fontSize: 150 }),
        footer(W, H, 'over-image'),
      ];
    },
  }),
  tpl({
    id: 'f1-center-cream-script',
    name: 'Center Text — Cream Band + Script',
    description: 'Cream center band with a script accent word, bold caps headline and divider lines.',
    family: 1,
    categories: ['Home Decor', 'Fall Decor', 'Living Room', 'Lifestyle'],
    designTypes: ['split'],
    collage: { layoutId: 'band-2-2', gap: 10, band: 0.32 },
    bg: '#F3EBDD',
    layers: ({ W, H, band }) => {
      const a = inBand(band, 0.1, 0.3);
      const t = inBand(band, 0.42, 0.42);
      return [
        bandShape('#F3EBDD'),
        accent(a.x, a.y, a.w, a.h, 'Cozy'),
        title(t.x, t.y, t.w, t.h, 'Fall Room Decor Ideas', { fontFamily: 'Oswald', fontWeight: 700, fill: '#2E2420', fontSize: 110 }),
        divider(W * 0.3, band.y + band.height * 0.9, W * 0.4, '#2E2420'),
        footer(W, H, 'dark-pill'),
      ];
    },
  }),
  tpl({
    id: 'f1-center-dark',
    name: 'Center Text — Dark Band',
    description: 'Black center band with bold white display type and a white square badge.',
    family: 1,
    categories: ['Hair', 'Fashion', 'Listicle'],
    designTypes: ['split', 'listicle'],
    collage: { layoutId: 'band-2-2', gap: 6, band: 0.26 },
    bg: '#111111',
    layers: ({ W, H, band }) => {
      const t = inBand(band, 0.12, 0.76, 0.2);
      return [
        bandShape('#111111'),
        badge(W * 0.05, band.y + band.height / 2 - 75, 150, '40', 'square', '#FFFFFF', '#111111'),
        title(t.x + W * 0.04, t.y, t.w, t.h, 'Short Haircuts for Women', { fill: '#FFFFFF', fontFamily: 'Bebas Neue', fontSize: 140, letterSpacing: 2 }),
        footer(W, H, 'light-pill'),
      ];
    },
  }),

  // ===== Family 2 — 2 top + headline + 3 bottom =====
  tpl({
    id: 'f2-balcony-white',
    name: 'Balcony Ideas — White Headline',
    description: '2 photos top, bold headline band, 3 photos bottom, overlapping number badge.',
    family: 2,
    categories: ['Balcony', 'Home Decor', 'Patio', 'Listicle'],
    designTypes: ['split', 'listicle'],
    collage: { layoutId: 'band-2-3', gap: 8, band: 0.28 },
    layers: ({ W, H, band }) => {
      const t = inBand(band, 0.16, 0.72, 0.06);
      return [
        bandShape('#FFFFFF'),
        badge(W * 0.04, band.y - 70, 140, '24', 'circle', '#B5651D', '#FFFFFF'),
        title(t.x, t.y, t.w, t.h, 'Charming Bohemian Balcony Ideas', { fontFamily: 'Archivo Black', fontSize: 92 }),
        footer(W, H, 'over-image'),
      ];
    },
  }),
  tpl({
    id: 'f2-patio-script',
    name: 'Patio Decor — Script + Bold Band',
    description: 'Cream headline band with script accent word between 2 top and 3 bottom photos.',
    family: 2,
    categories: ['Patio', 'Balcony', 'Home Decor'],
    designTypes: ['split', 'script-bold'],
    collage: { layoutId: 'band-2-3', gap: 10, band: 0.3 },
    bg: '#F6F1EB',
    layers: ({ W, H, band }) => {
      const a = inBand(band, 0.08, 0.34);
      const t = inBand(band, 0.42, 0.5);
      return [
        bandShape('#F6F1EB'),
        accent(a.x, a.y, a.w, a.h, 'Stunning', { fill: '#7A4E2D', fontFamily: 'Allura' }),
        title(t.x, t.y, t.w, t.h, 'Patio Decor Ideas', { fontFamily: 'Oswald', fontWeight: 700, fill: '#2E2420', letterSpacing: 3 }),
        footer(W, H, 'dark-pill'),
      ];
    },
  }),
  tpl({
    id: 'f2-distressed-dark',
    name: 'Distressed Headline — Dark Band',
    description: 'Textured distressed display headline on a dark band; 2 top and 3 bottom photos.',
    family: 2,
    categories: ['Fall Decor', 'Home Decor', 'Living Room', 'Listicle'],
    designTypes: ['split', 'listicle'],
    collage: { layoutId: 'band-2-3', gap: 6, band: 0.26 },
    bg: '#1F1A17',
    layers: ({ W, H, band }) => {
      const t = inBand(band, 0.1, 0.8, 0.05);
      return [
        bandShape('#1F1A17'),
        title(t.x, t.y, t.w, t.h, '40 New Fall Room Decor Ideas', { fontFamily: 'Rubik Distressed', fill: '#F3EBDD', fontSize: 100 }),
        footer(W, H, 'over-image'),
      ];
    },
  }),

  // ===== Family 3 — 4-image editorial collage =====
  tpl({
    id: 'f3-editorial-white-blocks',
    name: 'Editorial 2×2 — White Blocks',
    description: 'Four photos with thin dividers, stacked white title blocks over the center seam, badge and website.',
    family: 3,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['editorial', 'listicle'],
    collage: { layoutId: 'grid-2x2', gap: 10 },
    layers: ({ W, H }) => [
      badge(W / 2 - 80, 492, 160, '50', 'square', '#111111', '#FFFFFF', { fontFamily: 'Playfair Display', fontWeight: 900 }),
      titleLine(W, 668, 104, 'Lob'),
      titleLine(W, 780, 104, 'Haircut'),
      titleLine(W, 892, 104, 'Ideas'),
      footer(W, H, 'dark-pill'),
    ],
  }),
  tpl({
    id: 'f3-editorial-black-blocks',
    name: 'Editorial 2×2 — Black Blocks',
    description: 'Black blocks with white serif type over a thin-divider 2×2 grid.',
    family: 3,
    categories: ['Hair', 'Fashion', 'Listicle'],
    designTypes: ['editorial', 'listicle'],
    collage: { layoutId: 'grid-2x2', gap: 8 },
    layers: ({ W, H }) => [
      badge(W / 2 - 80, 520, 160, '30', 'circle', '#FFFFFF', '#111111', { fontFamily: 'Playfair Display', fontWeight: 900 }),
      titleLine(W, 694, 112, 'Chic Lob', { fill: '#FFFFFF', background: bgOn('#111111') }),
      titleLine(W, 814, 112, 'Haircuts', { fill: '#FFFFFF', background: bgOn('#111111'), italic: true, fontWeight: 600, textTransform: 'none' }),
      footer(W, H, 'light-pill'),
    ],
  }),
  tpl({
    id: 'f3-editorial-script-box',
    name: 'Editorial 2×2 — Script Accent Box',
    description: 'White center box with a script accent word and bold uppercase headline.',
    family: 3,
    categories: ['Home Decor', 'Living Room', 'Lifestyle'],
    designTypes: ['editorial', 'script-bold'],
    collage: { layoutId: 'grid-2x2', gap: 8 },
    layers: ({ W, H }) => [
      createShape({ name: 'Title box', role: 'decor', x: W * 0.1, y: 560, width: W * 0.8, height: 380, fill: '#FFFFFF' }),
      accent(W * 0.14, 585, W * 0.72, 110, 'Modern'),
      title(W * 0.14, 700, W * 0.72, 210, 'Living Room Ideas', { fontFamily: 'Oswald', fontWeight: 700, letterSpacing: 2 }),
      footer(W, H, 'dark-pill'),
    ],
  }),
  tpl({
    id: 'f3-fashion-hero-left',
    name: 'Editorial — Hero Left + 2',
    description: 'Tall hero with two supporting shots and black editorial blocks.',
    family: 3,
    categories: ['Fashion', 'Lifestyle'],
    designTypes: ['editorial'],
    collage: { layoutId: 'three-hero-left', gap: 8 },
    layers: ({ W, H }) => [
      titleLine(W, 1080, 96, 'Fall', { x: 50, width: 700, align: 'left', fill: '#FFFFFF', background: bgOn('#111111') }),
      titleLine(W, 1182, 96, 'Outfit Ideas', { x: 50, width: 700, align: 'left', fill: '#FFFFFF', background: bgOn('#111111') }),
      footer(W, H, 'light-pill', { x: 50, width: 500, align: 'left' }),
    ],
  }),

  // ===== Family 4 — number badge listicle =====
  tpl({
    id: 'f4-text-first-number',
    name: 'Text-First Big Number',
    description: 'Huge number and bold keyword headline on top, one photo below. Strong on mobile.',
    family: 4,
    categories: ['Listicle', 'Balcony', 'Home Decor'],
    designTypes: ['listicle', 'image-text-panel'],
    bg: '#F6F1EB',
    collage: { layoutId: 'single', region: { x: 0, y: 0.46, width: 1, height: 0.54 } },
    layers: ({ W, H }) => [
      badge(W / 2 - 150, 40, 300, '32', 'circle', '#2E2420', '#F6F1EB'),
      title(W * 0.06, 360, W * 0.88, 300, 'Minimalist Balcony Decor Ideas', { fontSize: 110, fill: '#2E2420' }),
      footer(W, H, 'light-pill'),
    ],
  }),
  tpl({
    id: 'f4-badge-grid',
    name: 'Number Badge + 4-Image Grid',
    description: 'Circular number badge and headline over a 2×2 photo grid.',
    family: 4,
    categories: ['Listicle', 'Hair', 'Beauty'],
    designTypes: ['listicle'],
    bg: '#F9E5E5',
    collage: { layoutId: 'grid-2x2', gap: 10, region: { x: 0, y: 0.34, width: 1, height: 0.66 } },
    layers: ({ W, H }) => [
      badge(W / 2 - 90, 36, 180, '25', 'circle', '#C7797D', '#FFFFFF'),
      title(W * 0.06, 232, W * 0.88, 240, 'Braided Hairstyles for Long Hair', { fontFamily: 'Playfair Display', fontWeight: 800, textTransform: 'none', fontSize: 84 }),
      footer(W, H, 'light-pill'),
    ],
  }),
  tpl({
    id: 'f4-badge-on-image',
    name: 'Badge Over Image — Hero + 3',
    description: 'Rounded-square badge overlapping the hero image, white headline card on the seam.',
    family: 4,
    categories: ['Listicle', 'Living Room', 'Home Decor'],
    designTypes: ['listicle'],
    collage: { layoutId: 'hero-top-3', gap: 10, region: { x: 0, y: 0, width: 1, height: 0.92 } },
    layers: ({ W, H }) => [
      badge(W * 0.05, 50, 170, '19', 'rounded', '#FFFFFF', '#111111'),
      title(70, 728, W - 140, 170, 'Cozy Living Room Ideas', {
        fontSize: 92,
        background: bgOn('#FFFFFF', { paddingX: 36, paddingY: 18 }),
      }),
      footer(W, H, 'plain-dark'),
    ],
  }),

  // ===== Family 5 — script + bold mixed font =====
  tpl({
    id: 'f5-script-bold-white-band',
    name: 'Script + Bold — White Band',
    description: 'Single photo with a white center band: script accent, bold caps headline and number badge.',
    family: 5,
    categories: ['Hair', 'Beauty'],
    designTypes: ['script-bold', 'image-text-overlay'],
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      createShape({ name: 'Text band', role: 'decor', x: 0, y: 560, width: W, height: 420, fill: '#FFFFFF', opacity: 0.94 }),
      badge(W / 2 - 70, 490, 140, '52', 'circle', '#111111', '#FFFFFF'),
      accent(W * 0.1, 640, W * 0.8, 120, 'Perfect', { fill: '#8B5A3C' }),
      title(W * 0.07, 760, W * 0.86, 200, 'Bronde Hair Color Ideas', { fontSize: 100 }),
      footer(W, H, 'over-image'),
    ],
  }),
  tpl({
    id: 'f5-script-bold-two-image',
    name: 'Script + Bold — Two Photos',
    description: 'Photo top and bottom with a script + bold headline band between them.',
    family: 5,
    categories: ['Balcony', 'Home Decor', 'Patio'],
    designTypes: ['script-bold', 'split'],
    collage: { layoutId: 'band-1-1', gap: 0, band: 0.3 },
    layers: ({ W, H, band }) => {
      const a = inBand(band, 0.08, 0.36);
      const t = inBand(band, 0.44, 0.46);
      return [
        bandShape('#FFFFFF'),
        accent(a.x, a.y, a.w, a.h, 'Best', { fontFamily: 'Pacifico', fill: '#C7797D', fontSize: 110 }),
        title(t.x, t.y, t.w, t.h, 'Balcony Decor Ideas', { letterSpacing: 2 }),
        footer(W, H, 'dark-pill'),
      ];
    },
  }),

  // ===== Family 6 — single image + bold overlay =====
  tpl({
    id: 'f6-dark-overlay-center',
    name: 'Bold Overlay — Dark Tint',
    description: 'Full-bleed photo, dark tint and a big centered headline.',
    family: 6,
    categories: ['Fashion', 'Lifestyle', 'Home Decor'],
    designTypes: ['image-text-overlay'],
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      createShape({ name: 'Dark overlay', role: 'decor', x: 0, y: 0, width: W, height: H, fill: '#000000', opacity: 0.32 }),
      label(W * 0.15, 540, W * 0.7, 46, 'The ultimate guide', { fill: '#FFFFFF' }),
      title(W * 0.07, 600, W * 0.86, 360, 'Fall Outfit Ideas', { fill: '#FFFFFF', fontSize: 160, shadow: SHADOW }),
      footer(W, H, 'over-image'),
    ],
  }),
  tpl({
    id: 'f6-white-box-badge',
    name: 'Bold Overlay — White Box + Badge',
    description: 'Photo with a white title box and a number badge on top of it.',
    family: 6,
    categories: ['Listicle', 'Beauty', 'Lifestyle'],
    designTypes: ['image-text-overlay', 'listicle'],
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      title(W * 0.1, 640, W * 0.8, 380, 'Spring Nail Designs to Copy', {
        fontSize: 110,
        background: bgOn('#FFFFFF', { hug: false, paddingX: 40, paddingY: 40 }),
      }),
      badge(W / 2 - 80, 560, 160, '21', 'circle', '#E60023', '#FFFFFF'),
      footer(W, H, 'light-pill'),
    ],
  }),
  tpl({
    id: 'f6-magazine',
    name: 'Bold Overlay — Magazine Cover',
    description: 'Masthead, bottom shade and an italic serif headline.',
    family: 6,
    categories: ['Fashion', 'Beauty'],
    designTypes: ['image-text-overlay', 'editorial'],
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      createShape({ name: 'Bottom shade', role: 'decor', x: 0, y: H * 0.55, width: W, height: H * 0.45, fill: '#000000', opacity: 0.35 }),
      createText({ name: 'Masthead', role: 'decor', x: W * 0.05, y: 50, width: W * 0.9, height: 150, text: 'STYLE EDIT', fontFamily: 'Italiana', fontWeight: 400, fontSize: 130, letterSpacing: 10, fill: '#FFFFFF' }),
      title(W * 0.07, 1030, W * 0.86, 260, 'Effortless Spring Capsule Wardrobe', {
        fontFamily: 'Playfair Display', fontWeight: 700, textTransform: 'none', italic: true, fill: '#FFFFFF', align: 'left', verticalAlign: 'bottom', fontSize: 84,
      }),
      divider(W * 0.07, 1310, 160, '#FFFFFF', 4),
      footer(W, H, 'plain-light', { x: W * 0.07, align: 'left' }),
    ],
  }),

  // ===== Family 7 — single image + text panel =====
  tpl({
    id: 'f7-bottom-panel',
    name: 'Text Panel — Bottom',
    description: 'Photo on top, warm text panel below with headline and call to action.',
    family: 7,
    categories: ['Food / Recipe', 'How-To', 'Lifestyle'],
    designTypes: ['image-text-panel'],
    bg: '#F6F1EB',
    collage: { layoutId: 'single', region: { x: 0, y: 0, width: 1, height: 0.66 } },
    layers: ({ W, H }) => [
      title(W * 0.07, 1035, W * 0.86, 240, 'Easy Lemon Garlic Pasta', { fontFamily: 'DM Serif Display', textTransform: 'none', fontSize: 96, fill: '#2E2420' }),
      label(W * 0.3, 1290, W * 0.4, 56, 'Get the recipe', { role: 'cta', fill: '#FFFFFF', fontSize: 24, background: bgOn('#8B6F5A', { paddingX: 26, paddingY: 12 }) }),
      footer(W, H, 'plain-dark', { fill: '#5B4636' }),
    ],
  }),
  tpl({
    id: 'f7-minimal-rounded',
    name: 'Text Panel — Minimal Rounded',
    description: 'Rounded photo, clean serif title, lots of white space.',
    family: 7,
    categories: ['Home Decor', 'Lifestyle'],
    designTypes: ['image-text-panel'],
    collage: { layoutId: 'single', region: { x: 0.07, y: 0.05, width: 0.86, height: 0.6 }, cornerRadius: 28 },
    layers: ({ W, H }) => [
      label(W * 0.07, 1000, W * 0.86, 38, 'Home inspiration', { fill: '#8B6F5A', align: 'left' }),
      title(W * 0.07, 1050, W * 0.86, 280, 'Small Bedroom Ideas That Feel Bigger', {
        fontFamily: 'Lora', fontWeight: 600, textTransform: 'none', fontSize: 76, align: 'left', verticalAlign: 'top',
      }),
      footer(W, H, 'plain-dark', { x: W * 0.07, align: 'left', fill: '#4A4A4A' }),
    ],
  }),
  tpl({
    id: 'f7-center-panel',
    name: 'Text Panel — Center Card',
    description: 'Full photo with an opaque cream card across the middle for maximum readability.',
    family: 7,
    categories: ['Lifestyle', 'How-To', 'Home Decor'],
    designTypes: ['image-text-panel'],
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      title(W * 0.08, 560, W * 0.84, 380, 'How to Style a Small Patio', {
        fontFamily: 'Libre Baskerville', fontWeight: 700, textTransform: 'none', fontSize: 84, fill: '#2E2420',
        background: bgOn('#F6F1EB', { hug: false, paddingX: 44, paddingY: 40, borderWidth: 3, borderColor: '#2E2420' }),
      }),
      footer(W, H, 'light-pill'),
    ],
  }),
  tpl({
    id: 'f7-relationship-quote',
    name: 'Quote / Advice — Blush',
    description: 'Blush background, rounded photo, quote mark and an elegant italic headline.',
    family: 7,
    categories: ['Relationship', 'Quote'],
    designTypes: ['quote-advice', 'image-text-panel'],
    bg: '#F3E6E0',
    collage: { layoutId: 'single', region: { x: 0.1, y: 0.05, width: 0.8, height: 0.44 }, cornerRadius: 240 },
    layers: ({ W, H }) => [
      createText({ name: 'Quote mark', role: 'decor', x: W / 2 - 60, y: 740, width: 120, height: 120, text: '“', fontFamily: 'Playfair Display', fontSize: 180, fill: '#C7797D', autoFit: false }),
      title(W * 0.08, 850, W * 0.84, 300, 'Little Things That Keep Love Strong', {
        fontFamily: 'Cormorant Garamond', fontWeight: 600, italic: true, textTransform: 'none', fontSize: 92, fill: '#3B2A2A',
      }),
      label(W * 0.2, 1180, W * 0.6, 44, 'Relationship advice', { fill: '#7A1E2C' }),
      footer(W, H, 'plain-dark', { fill: '#7A1E2C' }),
    ],
  }),
  tpl({
    id: 'f7-quote-text-only',
    name: 'Quote — Text Only',
    description: 'Text-first quote Pin on a solid color; no photo needed.',
    family: 7,
    categories: ['Quote', 'Relationship'],
    designTypes: ['quote-advice'],
    bg: '#2E2420',
    layers: ({ W, H }) => [
      createText({ name: 'Quote mark', role: 'decor', x: W / 2 - 80, y: 260, width: 160, height: 160, text: '“', fontFamily: 'Playfair Display', fontSize: 260, fill: '#C8B6A6', autoFit: false }),
      title(W * 0.1, 440, W * 0.8, 560, 'Love is a choice you make every single day', {
        fontFamily: 'Cormorant Garamond', fontWeight: 600, italic: true, textTransform: 'none', fontSize: 104, fill: '#F6F1EB',
      }),
      divider(W * 0.42, 1060, W * 0.16, '#C8B6A6'),
      footer(W, H, 'plain-light', { fill: '#C8B6A6' }),
    ],
  }),

  // ===== Family 8 — hair / beauty =====
  tpl({
    id: 'f8-hair-two-image',
    name: 'Hair — 2 Photos + White Blocks',
    description: 'Two portrait photos, circular badge, clean white editorial blocks across the seam.',
    family: 8,
    categories: ['Hair', 'Beauty'],
    designTypes: ['editorial'],
    collage: { layoutId: 'two-side', gap: 8 },
    layers: ({ W, H }) => [
      badge(W / 2 - 75, 560, 150, '16', 'circle', '#FFFFFF', '#111111'),
      titleLine(W, 740, 100, 'Curtain Bangs', { fontFamily: 'Playfair Display' }),
      titleLine(W, 850, 100, 'Hairstyles', { fontFamily: 'Playfair Display', italic: true, textTransform: 'none', fontWeight: 600 }),
      footer(W, H, 'light-pill'),
    ],
  }),
  tpl({
    id: 'f8-beauty-band',
    name: 'Beauty — 4 Photos + Pink Band',
    description: '2 top + 2 bottom with a soft pink band, script accent and number pill.',
    family: 8,
    categories: ['Beauty', 'Hair'],
    designTypes: ['split', 'script-bold'],
    collage: { layoutId: 'band-2-2', gap: 8, band: 0.3 },
    bg: '#F9E5E5',
    layers: ({ W, H, band }) => {
      const a = inBand(band, 0.3, 0.26);
      const t = inBand(band, 0.55, 0.38);
      return [
        bandShape('#F9E5E5'),
        badge(W / 2 - 96, band.y + band.height * 0.06, 120, '21', 'pill', '#111111', '#FFFFFF'),
        accent(a.x, a.y, a.w, a.h, 'Glowy', { fill: '#A4161A' }),
        title(t.x, t.y, t.w, t.h, 'Makeup Looks to Try', { fontFamily: 'Montserrat', fontWeight: 800, letterSpacing: 2, fontSize: 84 }),
        footer(W, H, 'dark-pill'),
      ];
    },
  }),
  tpl({
    id: 'f8-beauty-split',
    name: 'Beauty — Side by Side Bold',
    description: 'Two photos and a bold sans headline on black.',
    family: 8,
    categories: ['Beauty', 'Hair', 'Fashion'],
    designTypes: ['image-text-panel'],
    bg: '#111111',
    collage: { layoutId: 'two-side', gap: 6, region: { x: 0, y: 0, width: 1, height: 0.72 } },
    layers: ({ W, H }) => [
      title(W * 0.06, 1110, W * 0.88, 220, 'Soft Glam Makeup Ideas', { fontFamily: 'Bebas Neue', fontSize: 140, letterSpacing: 2, fill: '#FFFFFF' }),
      footer(W, H, 'plain-light', { fill: '#E8B4B8' }),
    ],
  }),

  // ===== Family 9 — home decor / balcony / patio =====
  tpl({
    id: 'f9-decor-hero4-band',
    name: 'Home Decor — Hero + 4 + Center Title',
    description: 'Warm 5-image collage with a cream title card bridging the seam and a number badge.',
    family: 9,
    categories: ['Home Decor', 'Living Room', 'Fall Decor'],
    designTypes: ['listicle'],
    collage: { layoutId: 'hero-4', gap: 8 },
    layers: ({ W, H }) => [
      title(W * 0.08, 650, W * 0.84, 200, 'Fall Living Room Decor', {
        fontFamily: 'Oswald', fontWeight: 700, fontSize: 88, fill: '#2E2420',
        background: bgOn('#F3EBDD', { paddingX: 36, paddingY: 20 }),
      }),
      badge(W / 2 - 70, 570, 140, '35', 'circle', '#B5651D', '#FFFFFF'),
      footer(W, H, 'over-image'),
    ],
  }),
  tpl({
    id: 'f9-decor-offset',
    name: 'Home Decor — Editorial Offset',
    description: 'Asymmetrical editorial grid on cream with a serif title panel.',
    family: 9,
    categories: ['Home Decor', 'Living Room'],
    designTypes: ['editorial', 'image-text-panel'],
    bg: '#F6F1EB',
    collage: { layoutId: 'editorial-offset', gap: 14, margin: 22, region: { x: 0, y: 0, width: 1, height: 0.78 } },
    layers: ({ W, H }) => [
      title(W * 0.07, 1185, W * 0.86, 200, 'Neutral Living Room Decor Ideas', {
        fontFamily: 'DM Serif Display', textTransform: 'none', fontSize: 80, fill: '#2E2420',
      }),
      footer(W, H, 'plain-dark', { fill: '#8B6F5A' }),
    ],
  }),
  tpl({
    id: 'f9-patio-band-23',
    name: 'Patio — Badge on Band, 2 + 3',
    description: 'Green band with a white number badge, 2 photos top and 3 bottom.',
    family: 9,
    categories: ['Patio', 'Balcony', 'Home Decor'],
    designTypes: ['split', 'listicle'],
    collage: { layoutId: 'band-2-3', gap: 8, band: 0.26 },
    bg: '#344E41',
    layers: ({ W, H, band }) => {
      const t = inBand(band, 0.12, 0.76, 0.06);
      return [
        bandShape('#344E41'),
        badge(W * 0.06, band.y + band.height / 2 - 70, 140, '32', 'circle', '#FFFFFF', '#344E41'),
        title(t.x + W * 0.16, t.y, t.w - W * 0.16, t.h, 'Small Patio Decor Ideas', { fill: '#FFFFFF', fontFamily: 'Archivo Black', fontSize: 88, align: 'left' }),
        footer(W, H, 'over-image'),
      ];
    },
  }),

  // ===== Other content types =====
  tpl({
    id: 'x-recipe-card',
    name: 'Recipe Card',
    description: 'Hero food photo and a second shot with a white recipe card overlapping both.',
    family: 7,
    categories: ['Food / Recipe'],
    designTypes: ['image-text-overlay'],
    collage: { layoutId: 'two-hero', gap: 8 },
    layers: ({ W, H }) => [
      label(W * 0.3, 806, W * 0.4, 50, 'Easy recipe', { fill: '#FFFFFF', fontSize: 24, background: bgOn('#E9A23B', { paddingX: 20, paddingY: 8 }) }),
      title(W * 0.1, 866, W * 0.8, 230, 'One-Pot Creamy Tuscan Chicken', {
        fontFamily: 'Libre Baskerville', fontWeight: 700, textTransform: 'none', fontSize: 68,
        background: bgOn('#FFFFFF', { hug: false, paddingX: 36, paddingY: 24, radius: 18 }),
      }),
      footer(W, H, 'dark-pill'),
    ],
  }),
  tpl({
    id: 'x-how-to-steps',
    name: 'How-To Steps',
    description: 'Header with headline, then three step photos stacked.',
    family: 7,
    categories: ['How-To', 'Food / Recipe', 'Lifestyle'],
    designTypes: ['image-text-panel'],
    collage: { layoutId: 'three-rows', gap: 8, region: { x: 0, y: 0.25, width: 1, height: 0.75 } },
    layers: ({ W }) => [
      label(W * 0.2, 40, W * 0.6, 44, 'Step by step', { fill: '#E60023' }),
      title(W * 0.06, 92, W * 0.88, 250, 'How to Make Cold Brew at Home', { fontFamily: 'Montserrat', fontWeight: 800, textTransform: 'none', fontSize: 76 }),
    ],
  }),

  // ===== Family 10 — blank =====
  tpl({
    id: 'f10-blank',
    name: 'Blank Editorial Canvas',
    description: 'Empty canvas. Add image frames, text blocks, bands and badges yourself.',
    family: 10,
    categories: [],
    designTypes: ['blank'],
  }),

  // ===== Custom Blog Pin — 736 × 1472 =====
  tpl({
    id: 'blog-736-four-editorial',
    name: 'Blog Pin 736 — 4-Image Editorial',
    description: '736×1472: 2×2 collage, stacked white blocks, number badge and website.',
    family: 3,
    categories: ['Custom Blog Pin', 'Hair', 'Listicle'],
    designTypes: ['editorial', 'listicle'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'grid-2x2', gap: 8 },
    layers: ({ W, H }) => [
      badge(W / 2 - 62, 486, 124, '50', 'square', '#111111', '#FFFFFF', { fontFamily: 'Playfair Display', fontWeight: 900 }),
      titleLine(W, 626, 86, 'Lob', { x: W * 0.06, width: W * 0.88 }),
      titleLine(W, 718, 86, 'Haircut', { x: W * 0.06, width: W * 0.88 }),
      titleLine(W, 810, 86, 'Ideas', { x: W * 0.06, width: W * 0.88 }),
      footer(W, H, 'dark-pill'),
    ],
  }),
  tpl({
    id: 'blog-736-center-band',
    name: 'Blog Pin 736 — 2 + Center Text + 2',
    description: '736×1472: 2 top, large white center text section, 2 bottom, badge.',
    family: 1,
    categories: ['Custom Blog Pin', 'Home Decor', 'Listicle'],
    designTypes: ['split', 'listicle'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'band-2-2', gap: 6, band: 0.28 },
    layers: ({ W, H, band }) => {
      const t = inBand(band, 0.24, 0.68, 0.06);
      return [
        bandShape('#FFFFFF'),
        badge(W / 2 - 60, band.y - 60, 120, '24', 'circle', '#111111', '#FFFFFF'),
        title(t.x, t.y, t.w, t.h, 'Cozy Bedroom Decor Ideas', { fontSize: 100 }),
        footer(W, H, 'over-image'),
      ];
    },
  }),
  tpl({
    id: 'blog-736-five-band',
    name: 'Blog Pin 736 — 2 + Headline + 3',
    description: '736×1472: 2 top, script + bold headline band, 3 bottom.',
    family: 2,
    categories: ['Custom Blog Pin', 'Balcony', 'Patio'],
    designTypes: ['split', 'script-bold'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'band-2-3', gap: 6, band: 0.28 },
    layers: ({ W, H, band }) => {
      const a = inBand(band, 0.08, 0.34);
      const t = inBand(band, 0.42, 0.5, 0.05);
      return [
        bandShape('#FFFFFF'),
        accent(a.x, a.y, a.w, a.h, 'Stunning'),
        title(t.x, t.y, t.w, t.h, 'Balcony Decor Ideas', { fontSize: 90 }),
        footer(W, H, 'over-image'),
      ];
    },
  }),
  tpl({
    id: 'blog-736-single-panel',
    name: 'Blog Pin 736 — Single Image + Panel',
    description: '736×1472: tall photo with a black headline panel below.',
    family: 7,
    categories: ['Custom Blog Pin', 'Lifestyle'],
    designTypes: ['image-text-panel'],
    w: 736,
    h: 1472,
    bg: '#111111',
    collage: { layoutId: 'single', region: { x: 0, y: 0, width: 1, height: 0.7 } },
    layers: ({ W, H }) => [
      title(W * 0.07, 1070, W * 0.86, 260, 'Easy Weeknight Dinner Ideas', { fill: '#FFFFFF', fontSize: 80 }),
      footer(W, H, 'plain-light', { fill: '#D9D9D9' }),
    ],
  }),
  tpl({
    id: 'blog-736-text-overlay',
    name: 'Blog Pin 736 — Text Overlay',
    description: '736×1472: full-bleed photo with a translucent white title box.',
    family: 6,
    categories: ['Custom Blog Pin', 'Beauty'],
    designTypes: ['image-text-overlay'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      title(W * 0.08, 560, W * 0.84, 330, 'Spring Nail Designs to Copy', {
        fontFamily: 'Playfair Display', fontWeight: 800, textTransform: 'none', fontSize: 72,
        background: bgOn('#FFFFFF', { hug: false, opacity: 0.88, paddingX: 30, paddingY: 30 }),
      }),
      footer(W, H, 'dark-pill'),
    ],
  }),
];

export const BLANK_TEMPLATE_ID = 'f10-blank';
