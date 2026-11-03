/**
 * Design Studio building pieces: ready blocks (groups of layers), single
 * elements and basic shapes. Text uses {{variables}} where it makes sense, so
 * a design built from blocks is ready for CSV bulk rendering.
 */
import { createFrame, createShape, createText } from '../model/factory';
import type { BrandKit, FrameLayer, Layer, PinDocument, TextLayer } from '../model/types';
import { bgOn } from '../templates/builtins';
import { token } from '../services/studioVars';

const unit = (doc: PinDocument) => doc.width / 1000;

/** An image placeholder frame bound to {{image_n}}. */
export function imagePlaceholder(doc: PinDocument, n: number, rect?: Partial<FrameLayer>): FrameLayer {
  const W = doc.width;
  return createFrame({
    name: `Image placeholder ${token(`image_${n}`)}`,
    x: W * 0.1,
    y: doc.height * 0.08,
    width: W * 0.8,
    height: doc.height * 0.5,
    cornerRadius: 24 * unit(doc),
    ...rect,
  });
}

/** The next free {{image_n}} number in the design. */
export function nextImageNumber(doc: PinDocument): number {
  const used = new Set(doc.layers.map((l) => /\{\{\s*image_(\d+)\s*\}\}/i.exec(l.name)?.[1]).filter(Boolean).map(Number));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

const titleText = (doc: PinDocument, kit: BrandKit, p: Partial<TextLayer> = {}) =>
  createText({
    name: 'Headline',
    role: 'title',
    x: doc.width * 0.08,
    y: doc.height * 0.62,
    width: doc.width * 0.84,
    height: 230 * unit(doc),
    text: token('title'),
    fontFamily: kit.headingFont,
    fontWeight: 800,
    fontSize: 104 * unit(doc),
    minFontSize: 28 * unit(doc),
    lineHeight: 1.05,
    fill: kit.primary,
    ...p,
  });

const ctaButton = (doc: PinDocument, kit: BrandKit, y: number, text = token('cta')) => {
  const k = unit(doc);
  return createText({
    name: 'CTA button',
    role: 'cta',
    x: doc.width * 0.27,
    y,
    width: doc.width * 0.46,
    height: 84 * k,
    text,
    fontFamily: kit.bodyFont,
    fontWeight: 800,
    fontSize: 34 * k,
    letterSpacing: 2 * k,
    textTransform: 'uppercase',
    fill: '#FFFFFF',
    background: bgOn(kit.accent, { paddingX: 34 * k, paddingY: 14 * k, shape: 'pill' }),
  });
};

const websitePill = (doc: PinDocument, kit: BrandKit) => {
  const k = unit(doc);
  return createText({
    name: 'Website',
    role: 'website',
    x: doc.width * 0.25,
    y: doc.height - 110 * k,
    width: doc.width * 0.5,
    height: 64 * k,
    text: token('website'),
    fontFamily: kit.bodyFont,
    fontWeight: 700,
    fontSize: 28 * k,
    letterSpacing: 1 * k,
    fill: kit.primary,
    background: bgOn('#FFFFFF', { paddingX: 30 * k, paddingY: 10 * k, shape: 'pill' }),
  });
};

export type ReadyBlockId = 'hero' | 'recipe' | 'footer' | 'cta' | 'grid4' | 'before-after';

export const READY_BLOCKS: { id: ReadyBlockId; label: string; emoji: string }[] = [
  { id: 'hero', label: 'Hero', emoji: '🏔️' },
  { id: 'recipe', label: 'Recipe', emoji: '🍲' },
  { id: 'footer', label: 'Footer', emoji: '🌐' },
  { id: 'cta', label: 'CTA', emoji: '📣' },
  { id: 'grid4', label: '4 Grid', emoji: '🔲' },
  { id: 'before-after', label: 'Before/After', emoji: '↔️' },
];

export function readyBlock(doc: PinDocument, id: ReadyBlockId, kit: BrandKit): Layer[] {
  const W = doc.width;
  const H = doc.height;
  const k = unit(doc);
  switch (id) {
    case 'hero':
      return [
        imagePlaceholder(doc, nextImageNumber(doc), { x: 0, y: 0, width: W, height: H * 0.62, cornerRadius: 0 }),
        createShape({ name: 'Headline panel', role: 'band', x: 0, y: H * 0.6, width: W, height: H * 0.4, fill: kit.secondary }),
        titleText(doc, kit, { y: H * 0.65 }),
        createText({ name: 'Subtitle', role: 'subtitle', x: W * 0.1, y: H * 0.65 + 240 * k, width: W * 0.8, height: 60 * k, text: token('description'), fontFamily: kit.bodyFont, fontWeight: 500, fontSize: 34 * k, fill: kit.primary, opacity: 0.8 }),
      ];
    case 'recipe':
      return [
        imagePlaceholder(doc, nextImageNumber(doc)),
        titleText(doc, kit, { y: H * 0.6 }),
        ctaButton(doc, kit, H * 0.6 + 250 * k),
        websitePill(doc, kit),
      ];
    case 'footer':
      return [createShape({ name: 'Footer panel', role: 'decor', x: 0, y: H - 130 * k, width: W, height: 130 * k, fill: kit.primary }), { ...websitePill(doc, kit), y: H - 97 * k }];
    case 'cta': {
      const y = H * 0.8;
      return [
        createShape({ name: 'CTA banner', role: 'decor', x: W * 0.15, y, width: W * 0.7, height: 100 * k, fill: kit.accent, cornerRadius: 12 * k }),
        createText({ name: 'CTA text', role: 'cta', x: W * 0.15, y, width: W * 0.7, height: 100 * k, text: 'Click to read more', fontFamily: kit.bodyFont, fontWeight: 800, fontSize: 38 * k, letterSpacing: 2 * k, textTransform: 'uppercase', fill: '#FFFFFF' }),
      ];
    }
    case 'grid4': {
      const g = 12 * k;
      const cw = (W - g * 3) / 2;
      const ch = (H * 0.62 - g * 3) / 2;
      const start = nextImageNumber(doc);
      return [0, 1, 2, 3].map((i) =>
        imagePlaceholder(doc, start + i, { x: g + (i % 2) * (cw + g), y: g + Math.floor(i / 2) * (ch + g), width: cw, height: ch, cornerRadius: 10 * k }),
      );
    }
    case 'before-after': {
      const g = 12 * k;
      const cw = (W - g * 3) / 2;
      const h = H * 0.55;
      const n = nextImageNumber(doc);
      const label = (text: string, x: number) =>
        createText({ name: `${text} label`, role: 'badge', x: x + cw * 0.2, y: g + h - 90 * k, width: cw * 0.6, height: 66 * k, text, fontFamily: kit.bodyFont, fontWeight: 800, fontSize: 30 * k, letterSpacing: 2 * k, textTransform: 'uppercase', fill: kit.primary, background: bgOn('#FFFFFF', { paddingX: 24 * k, paddingY: 10 * k, shape: 'pill' }) });
      return [
        imagePlaceholder(doc, n, { x: g, y: g, width: cw, height: h, cornerRadius: 10 * k }),
        imagePlaceholder(doc, n + 1, { x: g * 2 + cw, y: g, width: cw, height: h, cornerRadius: 10 * k }),
        label('Before', g),
        label('After', g * 2 + cw),
      ];
    }
  }
}

export type ElementId = 'arrow' | 'star' | 'price' | 'label' | 'divider' | 'recipe-info';

export const ELEMENTS: { id: ElementId; label: string; emoji: string }[] = [
  { id: 'arrow', label: 'Arrow', emoji: '→' },
  { id: 'star', label: 'Star', emoji: '⭐' },
  { id: 'price', label: 'Price', emoji: '💲' },
  { id: 'label', label: 'Label', emoji: '🏷️' },
  { id: 'divider', label: 'Divider', emoji: '➖' },
  { id: 'recipe-info', label: 'Recipe', emoji: '📋' },
];

export function element(doc: PinDocument, id: ElementId, kit: BrandKit): Layer[] {
  const W = doc.width;
  const H = doc.height;
  const k = unit(doc);
  const base = { fontFamily: kit.bodyFont, fontWeight: 800 };
  switch (id) {
    case 'arrow':
      return [createText({ ...base, name: 'Arrow', role: 'decor', x: W * 0.4, y: H * 0.45, width: W * 0.2, height: 120 * k, text: '➜', fontSize: 110 * k, fill: kit.accent })];
    case 'star':
      return [createText({ ...base, name: 'Stars', role: 'decor', x: W * 0.25, y: H * 0.45, width: W * 0.5, height: 80 * k, text: '★★★★★', fontSize: 64 * k, letterSpacing: 6 * k, fill: '#F5B301' })];
    case 'price':
      return [createText({ ...base, name: 'Price badge', role: 'badge', x: W * 0.68, y: H * 0.06, width: 220 * k, height: 220 * k, text: '$19', fontFamily: 'Anton', fontWeight: 400, fontSize: 90 * k, lineHeight: 1, fill: '#FFFFFF', background: bgOn(kit.accent, { shape: 'circle', hug: false, paddingX: 10 * k, paddingY: 10 * k }) })];
    case 'label':
      return [createText({ ...base, name: 'Label', role: 'badge', x: W * 0.06, y: H * 0.05, width: W * 0.3, height: 66 * k, text: 'NEW', fontSize: 30 * k, letterSpacing: 3 * k, fill: '#FFFFFF', background: bgOn(kit.primary, { paddingX: 26 * k, paddingY: 10 * k, shape: 'pill' }) })];
    case 'divider':
      return [createShape({ name: 'Divider', role: 'decor', x: W * 0.3, y: H * 0.5, width: W * 0.4, height: 5 * k, fill: kit.accent })];
    case 'recipe-info':
      return [
        createText({ ...base, name: 'Recipe info', role: 'body', x: W * 0.1, y: H * 0.5, width: W * 0.8, height: 80 * k, text: 'PREP 10 MIN  •  COOK 20 MIN  •  SERVES 4', fontWeight: 700, fontSize: 28 * k, letterSpacing: 1 * k, fill: kit.primary, background: bgOn('#FFFFFF', { paddingX: 26 * k, paddingY: 14 * k, radius: 14 * k }) }),
      ];
  }
}

export type BasicShapeId = 'rect' | 'circle' | 'cta' | 'ribbon';

export const BASIC_SHAPES: { id: BasicShapeId; label: string; emoji: string }[] = [
  { id: 'rect', label: 'Rect', emoji: '▭' },
  { id: 'circle', label: 'Circle', emoji: '●' },
  { id: 'cta', label: 'CTA', emoji: '📣' },
  { id: 'ribbon', label: 'Ribbon', emoji: '🎀' },
];

export function basicShape(doc: PinDocument, id: BasicShapeId, kit: BrandKit): Layer[] {
  const W = doc.width;
  const H = doc.height;
  const k = unit(doc);
  switch (id) {
    case 'rect':
      return [createShape({ name: 'Rectangle', x: W * 0.2, y: H * 0.4, width: W * 0.6, height: H * 0.18, fill: kit.accent, cornerRadius: 16 * k })];
    case 'circle':
      return [createShape({ name: 'Circle', shape: 'ellipse', x: W * 0.35, y: H * 0.42, width: W * 0.3, height: W * 0.3, fill: kit.accent })];
    case 'cta':
      return [ctaButton(doc, kit, H * 0.78, 'Click to read more')];
    case 'ribbon':
      return [
        createText({ name: 'Ribbon', role: 'badge', x: -W * 0.04, y: H * 0.06, width: W * 0.6, height: 80 * k, rotation: -4, text: 'MUST TRY', fontFamily: kit.bodyFont, fontWeight: 900, fontSize: 40 * k, letterSpacing: 4 * k, fill: '#FFFFFF', background: bgOn(kit.accent, { hug: false, paddingX: 20 * k, paddingY: 10 * k }) }),
      ];
  }
}
