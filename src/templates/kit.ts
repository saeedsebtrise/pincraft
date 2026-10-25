/**
 * Building blocks for template authoring: the tpl() builder plus reusable
 * text/shape blocks (badges, title lines, script accents, footers, bands).
 */
import { bandRect, getLayout } from '../collage/layouts';
import type { DesignType, TemplateFamilyId } from '../config/designTypes';
import { applyCollage, frames } from '../model/docOps';
import { createDocument, createShape, createText, defaultBackground } from '../model/factory';
import type { CollageSettings, Layer, PinDocument, Rect, Template, TemplateCategory, TextLayer } from '../model/types';

export interface Ctx {
  W: number;
  H: number;
  /** Open text band between image rows (band layouts only). */
  band: Rect;
}

export interface TplSpec {
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

export const FULL = { x: 0, y: 0, width: 1, height: 1 };

export function tpl(s: TplSpec): Template {
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
export type TP = Partial<TextLayer>;

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
export const bgOff = (): TextLayer['background'] => ({ ...bgOn('#FFFFFF'), enabled: false });
export const SHADOW = { enabled: true, color: '#000000', blur: 14, offsetX: 0, offsetY: 3, opacity: 0.45 };

export function bandShape(color: string, name = 'Text band'): Layer {
  return createShape({ name, role: 'band', fill: color, x: 0, y: 0, width: 10, height: 10 });
}

export function divider(x: number, y: number, w: number, color = '#111111', h = 3): Layer {
  return createShape({ name: 'Divider line', role: 'decor', x, y, width: w, height: h, fill: color });
}

export function titleLine(W: number, y: number, h: number, text: string, p: TP = {}): TextLayer {
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

export type BadgeShape = 'circle' | 'square' | 'rounded' | 'pill';
export function badge(x: number, y: number, size: number, text: string, shape: BadgeShape, color: string, fill: string, p: TP = {}): TextLayer {
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

export function title(x: number, y: number, w: number, h: number, text: string, p: TP = {}): TextLayer {
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

export function accent(x: number, y: number, w: number, h: number, text: string, p: TP = {}): TextLayer {
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
export function label(x: number, y: number, w: number, h: number, text: string, p: TP = {}): TextLayer {
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
export const inBand = (b: Rect, fy: number, fh: number, padX = 0.07) => ({
  x: b.x + b.width * padX,
  y: b.y + b.height * fy,
  w: b.width * (1 - padX * 2),
  h: b.height * fh,
});

// ---------- the library ----------
