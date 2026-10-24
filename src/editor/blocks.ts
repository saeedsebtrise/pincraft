/**
 * Reusable Pinterest design blocks the user can drop into any design:
 * number badges, center text bands, website footers, text styles and
 * mixed-typography compositions. All produce ordinary editable layers.
 */
import { getLayout } from '../collage/layouts';
import { applyCollage, frames, isText } from '../model/docOps';
import { createFrame, createShape, createText } from '../model/factory';
import { unionRect } from '../model/geometry';
import type { Layer, PinDocument, Rect, TextLayer } from '../model/types';
import { bgOn, footer, type FooterStyle } from '../templates/builtins';

const s = (doc: PinDocument) => doc.width / 1000; // design unit relative to a 1000px-wide Pin

// ---------- text kinds ----------
export type TextKind = 'heading' | 'subheading' | 'body' | 'cta' | 'custom';

export function newTextLayer(doc: PinDocument, kind: TextKind, brandHeading: string, brandBody: string): TextLayer {
  const k = s(doc);
  const W = doc.width;
  const base = { x: W * 0.1, width: W * 0.8 };
  switch (kind) {
    case 'heading':
      // Only the first heading receives generated headlines; extra headings are free text.
      return createText({ ...base, name: 'Heading', role: doc.layers.some((l) => l.role === 'title') ? 'none' : 'title', y: doc.height * 0.4, height: 240 * k, text: 'Add a Pin headline', fontFamily: brandHeading, fontWeight: 800, fontSize: 96 * k, minFontSize: 24 * k });
    case 'subheading':
      return createText({ ...base, name: 'Subheading', role: 'subtitle', y: doc.height * 0.3, height: 70 * k, text: 'Subheading', fontFamily: brandBody, fontWeight: 600, fontSize: 40 * k, letterSpacing: 3 * k, textTransform: 'uppercase', minFontSize: 14 * k });
    case 'body':
      return createText({ ...base, name: 'Body text', role: 'body', y: doc.height * 0.6, height: 160 * k, text: 'Add a short description for your readers.', fontFamily: brandBody, fontWeight: 400, fontSize: 34 * k, lineHeight: 1.35, minFontSize: 14 * k });
    case 'cta':
      return createText({ x: W * 0.3, width: W * 0.4, name: 'Call to action', role: 'cta', y: doc.height * 0.75, height: 70 * k, text: 'Read more', fontFamily: brandBody, fontWeight: 700, fontSize: 30 * k, letterSpacing: 2 * k, textTransform: 'uppercase', fill: '#FFFFFF', background: bgOn('#111111', { paddingX: 28 * k, paddingY: 12 * k, shape: 'pill' }) });
    default:
      return createText({ ...base, name: 'Text', y: doc.height * 0.45, height: 110 * k, text: 'Your text', fontFamily: brandBody, fontSize: 56 * k });
  }
}

// ---------- number badge ----------
export type BadgeShape = 'circle' | 'rounded' | 'square' | 'pill';
export type BadgePosition = 'top-left' | 'center-top' | 'over-band' | 'over-image';

export function newBadge(doc: PinDocument, shape: BadgeShape, number = '25', color = '#111111', fill = '#FFFFFF'): TextLayer {
  const size = 150 * s(doc);
  const pill = shape === 'pill';
  const layer = createText({
    name: 'Number badge',
    role: 'badge',
    width: pill ? size * 1.6 : size,
    height: size,
    text: number,
    fontFamily: 'Anton',
    fontWeight: 400,
    fontSize: size * 0.58,
    lineHeight: 1,
    fill,
    minFontSize: 12,
    background: bgOn(color, {
      hug: false,
      shape: shape === 'circle' ? 'circle' : pill ? 'pill' : 'rect',
      radius: shape === 'rounded' ? size * 0.18 : 0,
      paddingX: size * 0.08,
      paddingY: size * 0.08,
    }),
  });
  const pos = badgePosition(doc, layer, 'center-top');
  return { ...layer, ...pos };
}

/** Where a badge goes for a quick position preset. */
export function badgePosition(doc: PinDocument, badge: Pick<TextLayer, 'width' | 'height'>, pos: BadgePosition): { x: number; y: number } {
  const m = doc.width * 0.06;
  if (pos === 'top-left') return { x: m, y: m };
  if (pos === 'center-top') return { x: (doc.width - badge.width) / 2, y: m };
  if (pos === 'over-band') {
    const band = findBand(doc);
    if (band) return { x: (doc.width - badge.width) / 2, y: band.y - badge.height / 2 };
    return { x: (doc.width - badge.width) / 2, y: doc.height / 2 - badge.height / 2 };
  }
  const biggest = frames(doc).sort((a, b) => b.width * b.height - a.width * a.height)[0];
  if (biggest) return { x: biggest.x + m * 0.6, y: biggest.y + m * 0.6 };
  return { x: m, y: m };
}

/** The text band of the design: a band shape, else the first title's box. */
export function findBand(doc: PinDocument): Rect | null {
  const band = doc.layers.find((l) => l.role === 'band' && l.visible);
  if (band) return band;
  const title = doc.layers.find((l) => isText(l) && (l.role === 'title' || l.role === 'title-line'));
  return title ?? null;
}

// ---------- center text band ----------
export type BandStyle = 'white' | 'cream' | 'color' | 'dark' | 'split';

const BAND_COLORS: Record<Exclude<BandStyle, 'split'>, { bg: string; text: string }> = {
  white: { bg: '#FFFFFF', text: '#111111' },
  cream: { bg: '#F3EBDD', text: '#2E2420' },
  color: { bg: '#C7797D', text: '#FFFFFF' },
  dark: { bg: '#111111', text: '#FFFFFF' },
};

/**
 * Adds a center text band. On a band-capable collage the image rows move apart
 * to open the band; otherwise the band is laid over the middle of the design.
 */
export function addCenterBand(doc: PinDocument, style: BandStyle, withDividers: boolean, headline: string, accentColor: string): PinDocument {
  let next = doc;
  let rect: Rect;
  const layout = doc.collage ? getLayout(doc.collage.layoutId) : undefined;
  const k = s(doc);
  const newLayers: Layer[] = [];

  // Band shapes sit just above the photos and below all existing text.
  const insertBand = (d: PinDocument, shape: Layer): PinDocument => {
    const lastFrame = d.layers.reduce((acc, l, i) => (l.type === 'frame' ? i : acc), -1);
    const layers = [...d.layers];
    layers.splice(lastFrame + 1, 0, shape);
    return { ...d, layers };
  };
  const fill = style === 'split' ? '#FFFFFF' : BAND_COLORS[style].bg;

  if (doc.collage && layout?.bandable) {
    const band = doc.collage.band > 0.05 ? doc.collage.band : 0.28;
    // replace a previous band so switching styles doesn't stack shapes
    next = { ...next, layers: next.layers.filter((l) => l.role !== 'band') };
    next = applyCollage(insertBand(next, createShape({ name: 'Text band', role: 'band', fill })), { ...doc.collage, band });
    rect = next.layers.find((l) => l.role === 'band')!;
  } else {
    rect = { x: 0, y: doc.height * 0.37, width: doc.width, height: doc.height * 0.26 };
    next = insertBand(next, createShape({ name: 'Text band', role: 'decor', ...rect, fill }));
  }

  const pad = rect.width * 0.07;
  const headlineRoles = new Set(['title', 'title-line', 'accent', 'badge']);
  const existing = next.layers.filter((l): l is TextLayer => isText(l) && headlineRoles.has(l.role) && l.visible);
  if (existing.length && style !== 'split') {
    // Move the Pin's current headline group into the band instead of adding a second headline.
    const box = unionRect(existing);
    const scale = Math.min(1, (rect.height * 0.9) / box.height, (rect.width - pad) / box.width);
    const textColor = BAND_COLORS[style].text;
    const ids = new Set(existing.map((l) => l.id));
    next = {
      ...next,
      layers: next.layers.map((l) => {
        if (!ids.has(l.id) || !isText(l)) return l;
        const nx = rect.x + rect.width / 2 + (l.x - (box.x + box.width / 2)) * scale;
        const ny = rect.y + rect.height / 2 + (l.y - (box.y + box.height / 2)) * scale;
        const moved: TextLayer = { ...l, x: nx, y: ny, width: l.width * scale, height: l.height * scale, fontSize: l.fontSize * scale };
        // Plain text takes the band's text color; text in its own block keeps its block colors.
        return l.background.enabled ? moved : { ...moved, fill: textColor };
      }),
    };
  } else if (style === 'split') {
    const half = rect.height / 2;
    newLayers.push(createShape({ name: 'Band lower half', role: 'decor', x: rect.x, y: rect.y + half, width: rect.width, height: half, fill: '#111111' }));
    const words = headline.split(/\s+/);
    const cut = Math.ceil(words.length / 2);
    newLayers.push(
      createText({ name: 'Title line', role: 'title-line', x: rect.x + pad, y: rect.y + half * 0.12, width: rect.width - pad * 2, height: half * 0.76, text: words.slice(0, cut).join(' '), fontFamily: 'Anton', fontWeight: 400, fontSize: half * 0.6, textTransform: 'uppercase', fill: '#111111' }),
      createText({ name: 'Title line', role: 'title-line', x: rect.x + pad, y: rect.y + half * 1.12, width: rect.width - pad * 2, height: half * 0.76, text: words.slice(cut).join(' '), fontFamily: 'Anton', fontWeight: 400, fontSize: half * 0.6, textTransform: 'uppercase', fill: '#FFFFFF' }),
    );
  } else {
    newLayers.push(
      createText({ name: 'Title', role: 'title', x: rect.x + pad, y: rect.y + rect.height * 0.14, width: rect.width - pad * 2, height: rect.height * 0.72, text: headline, fontFamily: 'Anton', fontWeight: 400, fontSize: 130 * k, textTransform: 'uppercase', fill: BAND_COLORS[style].text, minFontSize: 20 * k }),
    );
  }
  if (withDividers) {
    const lineColor = style === 'dark' || style === 'color' ? '#FFFFFF' : style === 'split' ? accentColor : '#111111';
    newLayers.push(
      createShape({ name: 'Divider line', role: 'decor', x: rect.x + rect.width * 0.3, y: rect.y + rect.height * 0.07, width: rect.width * 0.4, height: 3 * k, fill: lineColor }),
      createShape({ name: 'Divider line', role: 'decor', x: rect.x + rect.width * 0.3, y: rect.y + rect.height * 0.93 - 3 * k, width: rect.width * 0.4, height: 3 * k, fill: lineColor }),
    );
  }
  return { ...next, layers: [...next.layers, ...newLayers] };
}

// ---------- website footer ----------
export const FOOTER_STYLES: { id: FooterStyle; label: string }[] = [
  { id: 'over-image', label: 'White text over image' },
  { id: 'dark-pill', label: 'White on dark pill' },
  { id: 'light-pill', label: 'Black on light pill' },
  { id: 'plain-dark', label: 'Black text, no panel' },
  { id: 'plain-light', label: 'White text, no panel' },
];

export function newFooter(doc: PinDocument, style: FooterStyle, website: string, withPanel: boolean, withSeparator: boolean): Layer[] {
  const f = footer(doc.width, doc.height, style, { text: website || 'yourwebsite.com' });
  const out: Layer[] = [];
  if (withPanel) {
    const ph = f.height + doc.height * 0.04;
    out.push(createShape({ name: 'Footer panel', role: 'decor', x: 0, y: doc.height - ph, width: doc.width, height: ph, fill: '#FFFFFF' }));
    f.fill = '#111111';
    f.background = { ...f.background, enabled: false };
    f.shadow = { ...f.shadow, enabled: false };
    f.y = doc.height - ph + (ph - f.height) / 2;
  }
  if (withSeparator) {
    out.push(createShape({ name: 'Footer separator', role: 'decor', x: doc.width * 0.35, y: f.y - doc.height * 0.012, width: doc.width * 0.3, height: Math.max(2, 2 * s(doc)), fill: f.fill }));
  }
  out.push(f);
  return out;
}

// ---------- text style presets ----------
export interface TextStylePreset {
  id: string;
  label: string;
  sample: string;
  css: React.CSSProperties;
  patch: (l: TextLayer) => Partial<TextLayer>;
}

export const TEXT_STYLES: TextStylePreset[] = [
  { id: 'bold-caps', label: 'Bold uppercase', sample: 'BOLD HEADLINE', css: { fontFamily: 'Anton', fontSize: 20 }, patch: () => ({ fontFamily: 'Anton', fontWeight: 400, textTransform: 'uppercase', letterSpacing: 1 }) },
  { id: 'serif', label: 'Editorial serif', sample: 'Editorial Serif', css: { fontFamily: 'Playfair Display', fontWeight: 800, fontSize: 19 }, patch: () => ({ fontFamily: 'Playfair Display', fontWeight: 800, textTransform: 'none' }) },
  { id: 'sans', label: 'Sans-serif bold', sample: 'SANS BOLD', css: { fontFamily: 'Montserrat', fontWeight: 800, fontSize: 17 }, patch: () => ({ fontFamily: 'Montserrat', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2 }) },
  { id: 'distressed', label: 'Distressed display', sample: 'DISTRESSED', css: { fontFamily: 'Rubik Distressed', fontSize: 20 }, patch: () => ({ fontFamily: 'Rubik Distressed', fontWeight: 400, textTransform: 'uppercase' }) },
  { id: 'script', label: 'Script accent', sample: 'Script accent', css: { fontFamily: 'Great Vibes', fontSize: 26 }, patch: () => ({ fontFamily: 'Great Vibes', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }) },
  { id: 'white-box', label: 'Text in white box', sample: 'WHITE BOX', css: { fontFamily: 'Playfair Display', fontWeight: 800, background: '#fff', color: '#111', padding: '2px 8px', border: '1px solid #ddd' }, patch: (l) => ({ fill: '#111111', background: { ...l.background, enabled: true, color: '#FFFFFF', opacity: 1, hug: true } }) },
  { id: 'black-box', label: 'Text in black box', sample: 'BLACK BOX', css: { fontFamily: 'Playfair Display', fontWeight: 800, background: '#111', color: '#fff', padding: '2px 8px' }, patch: (l) => ({ fill: '#FFFFFF', background: { ...l.background, enabled: true, color: '#111111', opacity: 1, hug: true } }) },
  { id: 'outline', label: 'Outlined', sample: 'OUTLINED', css: { fontFamily: 'Anton', color: '#fff', WebkitTextStroke: '1.5px #111', fontSize: 20 }, patch: (l) => ({ fill: '#FFFFFF', stroke: '#111111', strokeWidth: Math.max(2, l.fontSize * 0.04) }) },
  { id: 'shadow', label: 'Soft shadow', sample: 'SHADOWED', css: { fontFamily: 'Anton', color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.6)', background: '#9a8f84', padding: '2px 8px' }, patch: (l) => ({ fill: '#FFFFFF', shadow: { ...l.shadow, enabled: true, opacity: 0.5, blur: 14, offsetY: 3 } }) },
];

// ---------- compositions ----------
export type CompositionId = 'script-bold' | 'stacked-blocks' | 'number-keyword';

export function newComposition(doc: PinDocument, id: CompositionId): Layer[] {
  const W = doc.width;
  const k = s(doc);
  const cy = doc.height * 0.42;
  if (id === 'script-bold') {
    return [
      createText({ name: 'Script accent', role: 'accent', x: W * 0.1, y: cy, width: W * 0.8, height: 120 * k, text: 'Stunning', fontFamily: 'Great Vibes', fontWeight: 400, fontSize: 110 * k, fill: '#B5651D' }),
      createText({ name: 'Title', role: 'title', x: W * 0.07, y: cy + 120 * k, width: W * 0.86, height: 200 * k, text: 'Balcony Decor Ideas', fontFamily: 'Anton', fontWeight: 400, fontSize: 120 * k, textTransform: 'uppercase', fill: '#111111' }),
    ];
  }
  if (id === 'stacked-blocks') {
    return ['Lob', 'Haircut', 'Ideas'].map((t, i) =>
      createText({ name: 'Title line', role: 'title-line', x: W * 0.08, y: cy + i * 112 * k, width: W * 0.84, height: 104 * k, text: t, fontFamily: 'Playfair Display', fontWeight: 800, fontSize: 86 * k, lineHeight: 1, textTransform: 'uppercase', fill: i === 1 ? '#FFFFFF' : '#111111', background: bgOn(i === 1 ? '#111111' : '#FFFFFF', { paddingX: 28 * k, paddingY: 10 * k }) }),
    );
  }
  const badge = newBadge(doc, 'circle', '32');
  return [
    { ...badge, y: cy - badge.height - 10 * k },
    createText({ name: 'Title', role: 'title', x: W * 0.07, y: cy, width: W * 0.86, height: 230 * k, text: 'Minimalist Balcony Decor Ideas', fontFamily: 'Anton', fontWeight: 400, fontSize: 110 * k, textTransform: 'uppercase', fill: '#111111' }),
  ];
}

// ---------- image frames & shapes ----------
export function newFrame(doc: PinDocument, assetW?: number, assetH?: number, at?: { x: number; y: number }) {
  const w = doc.width * 0.45;
  const h = assetW && assetH ? (w * assetH) / assetW : w * 1.25;
  return createFrame({ name: 'Image', x: at ? at.x - w / 2 : (doc.width - w) / 2, y: at ? at.y - h / 2 : (doc.height - h) / 2, width: w, height: h });
}

export function newShape(doc: PinDocument, kind: 'rect' | 'rounded' | 'ellipse' | 'line' | 'overlay'): Layer {
  const W = doc.width;
  const k = s(doc);
  switch (kind) {
    case 'ellipse':
      return createShape({ name: 'Circle', shape: 'ellipse', x: W * 0.35, y: doc.height * 0.4, width: W * 0.3, height: W * 0.3, fill: '#C7797D' });
    case 'line':
      return createShape({ name: 'Divider line', x: W * 0.3, y: doc.height * 0.5, width: W * 0.4, height: 4 * k, fill: '#111111' });
    case 'rounded':
      return createShape({ name: 'Rounded box', x: W * 0.15, y: doc.height * 0.4, width: W * 0.7, height: doc.height * 0.2, fill: '#FFFFFF', cornerRadius: 28 * k });
    case 'overlay':
      return createShape({ name: 'Dark overlay', x: 0, y: 0, width: W, height: doc.height, fill: '#000000', opacity: 0.3 });
    default:
      return createShape({ name: 'Box', x: W * 0.15, y: doc.height * 0.4, width: W * 0.7, height: doc.height * 0.2, fill: '#111111' });
  }
}
