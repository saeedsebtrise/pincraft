/**
 * High-click hair / beauty listicle Pins recreated from top-performing
 * 736 × 1472 Pins: photos above and below a bold text panel with a huge list
 * number, a script word, a condensed keyword in a strong color, the rest of
 * the title as a benefit line, and a call-to-action pill on the photos.
 */
import { createShape, createText } from '../model/factory';
import type { Layer, TextLayer } from '../model/types';
import { badge, bandShape, bgOff, bgOn, footer, titleLine, tpl } from './kit';

type TP = Partial<TextLayer>;
const W = 736;
const H = 1472;
const size = { w: W, h: H };

const rect = (x: number, y: number, w: number, h: number, fill: string, name = 'Shape'): Layer => createShape({ name, role: 'decor', x, y, width: w, height: h, fill });

/** A headline line (Auto Design puts the article's words in, `wordCount` words per line). */
const ln = (x: number, y: number, w: number, h: number, text: string, p: TP = {}) =>
  titleLine(W, y, h, text, { x, width: w, background: bgOff(), letterSpacing: 0, lineHeight: 1, fontWeight: 400, fontSize: h * 0.92, minFontSize: 16, ...p });
const anton = (fill: string, p: TP = {}): TP => ({ fontFamily: 'Anton', fill, ...p });
const script = (fill: string, p: TP = {}): TP => ({ fontFamily: 'Pacifico', textTransform: 'none', fill, wordCount: 1, ...p });

/** The list number set as big type, optionally outlined. */
const bigNum = (x: number, y: number, w: number, h: number, fill: string, p: TP = {}) =>
  badge(x, y, h, '25', 'square', '#FFFFFF', fill, { x, width: w, height: h, background: bgOff(), fontFamily: 'Anton', fontSize: h * 0.95, lineHeight: 1, ...p });
const circleNum = (cx: number, cy: number, d: number, color: string, fill: string) =>
  badge(cx - d / 2, cy - d / 2, d, '25', 'circle', color, fill, { fontFamily: 'Anton', fontSize: d * 0.6 });

/** Call-to-action pill (Auto Design rewords it per Pin). */
const cta = (y: number, color: string, fill: string, text = 'See All the Ideas', w = W * 0.5, h = H * 0.03): TextLayer =>
  createText({
    name: 'Call to action', role: 'cta', x: (W - w) / 2, y, width: w, height: h, text,
    fontFamily: 'Montserrat', fontWeight: 800, fontSize: h * 0.5, minFontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fill,
    background: bgOn(color, { hug: true, shape: 'pill', paddingX: h * 0.6, paddingY: h * 0.2 }),
  });
/** Website, small white caps over the bottom photos. */
const web = (fill = '#FFFFFF', p: TP = {}) =>
  footer(W, H, 'plain-light', {
    y: H * 0.958, height: H * 0.026, fontFamily: 'Montserrat', fontWeight: 800, fontSize: H * 0.012, letterSpacing: 3, fill,
    shadow: { enabled: true, color: '#000000', blur: 8, offsetX: 0, offsetY: 1, opacity: 0.55 }, ...p,
  });

const PINK = '#E8458B';
const RED = '#E3262E';

export const LUXE_CTR_TEMPLATES = [
  tpl({
    id: 'lx-red-number-script',
    name: 'High CTR — Red Number, Script & Red Keyword, 6 Photos',
    description: 'A 2×2 photo grid, a white panel with a huge red number, a black script word, a red condensed keyword and a black benefit line, two photos below with a red CTA pill.',
    family: 5,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['image-text-panel', 'script-bold', 'number-badge'],
    ...size,
    collage: { layoutId: 'grid4-band-2', gap: 6 },
    layers: () => {
      const y0 = H * 0.514;
      const ph = H * 0.221;
      const y = (f: number) => y0 + ph * f;
      return [
        bigNum(W * 0.03, y(0.08), W * 0.33, ph * 0.66, RED),
        ln(W * 0.37, y(0.02), W * 0.6, ph * 0.3, 'Stunning', script('#111111')),
        ln(W * 0.37, y(0.34), W * 0.6, ph * 0.3, 'Medium Hair', anton(RED, { wordCount: 2 })),
        ln(W * 0.37, y(0.67), W * 0.6, ph * 0.27, 'Holiday Styles for Parties and Events', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#111111', lineHeight: 1.05, fontSize: ph * 0.11 }),
        cta(H * 0.742, RED, '#FFFFFF', 'Get the Ideas'),
        web(),
      ];
    },
  }),
  tpl({
    id: 'lx-pink-band-gorgeous',
    name: 'High CTR — Pink Number, Script & Pink Keyword Band',
    description: '2 photos above and below a white panel: a big pink number beside a black script word, a full-width pink band with the keyword in white, and a black closing line.',
    family: 5,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...size,
    collage: { layoutId: 'band-2-2', gap: 6, band: 0.3 },
    layers: ({ band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      return [
        bandShape('#FFFFFF'),
        bigNum(W * 0.04, y(0.05), W * 0.3, h(0.36), PINK, { fontFamily: 'Archivo Black', fontSize: h(0.34) }),
        ln(W * 0.36, y(0.04), W * 0.6, h(0.34), 'Gorgeous', script('#111111')),
        rect(0, y(0.44), W, h(0.26), PINK, 'Keyword band'),
        ln(W * 0.03, y(0.455), W * 0.94, h(0.23), 'Bob Cuts Ideas', anton('#FFFFFF', { wordCount: 3 })),
        ln(W * 0.05, y(0.75), W * 0.9, h(0.2), 'You Need to See', anton('#111111')),
        cta(H * 0.9, '#FFFFFF', '#111111', 'See All the Ideas', W * 0.42, H * 0.026),
        web(),
      ];
    },
  }),
  tpl({
    id: 'lx-pink-circle-flattering',
    name: 'High CTR — Pink Circle, Script & Outlined Pink Keyword',
    description: '2 photos above and below a white panel: a pink circle number, a black script word, a huge outlined pink keyword and a black two-line benefit, with a white CTA pill on the photos.',
    family: 5,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...size,
    collage: { layoutId: 'band-2-2', gap: 6, band: 0.3 },
    layers: ({ band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      return [
        bandShape('#FFFFFF'),
        circleNum(W * 0.2, y(0.18), h(0.32), PINK, '#FFFFFF'),
        ln(W * 0.38, y(0.02), W * 0.58, h(0.32), 'Fun', script('#111111')),
        ln(W * 0.03, y(0.36), W * 0.94, h(0.3), 'Flattering', anton(PINK, { wordCount: 1, stroke: '#111111', strokeWidth: 3, shadow: { enabled: true, color: '#000000', blur: 0, offsetX: 3, offsetY: 3, opacity: 0.85 } })),
        ln(W * 0.06, y(0.69), W * 0.88, h(0.28), 'Haircuts for Women Over 40 That Look Amazing', anton('#111111', { lineHeight: 1.02, fontSize: h(0.13) })),
        cta(H * 0.9, '#FFFFFF', '#111111', 'See All the Ideas', W * 0.46, H * 0.028),
        web(),
      ];
    },
  }),
  tpl({
    id: 'lx-black-panel-yellow',
    name: 'High CTR — Black Panel, Yellow Number & CTA',
    description: '2 photos above and below a black panel: a huge yellow number beside a two-line white keyword, a yellow benefit line and a yellow "view all" pill.',
    family: 7,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['split', 'number-badge', 'listicle'],
    ...size,
    collage: { layoutId: 'band-2-2', gap: 6, band: 0.3 },
    layers: ({ band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      return [
        bandShape('#111111'),
        bigNum(W * 0.03, y(0.06), W * 0.32, h(0.52), '#FFD21F'),
        ln(W * 0.37, y(0.05), W * 0.6, h(0.26), 'Short', anton('#FFFFFF', { wordCount: 1 })),
        ln(W * 0.37, y(0.32), W * 0.6, h(0.25), 'Hairstyles', anton('#FFFFFF', { wordCount: 1 })),
        ln(W * 0.05, y(0.62), W * 0.9, h(0.18), 'For Women Over 50 That Look Absolutely Modern', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#FFD21F', lineHeight: 1.05, fontSize: h(0.075), letterSpacing: 1.5 }),
        cta(y(0.84), '#FFD21F', '#111111', 'View All the Looks', W * 0.46, h(0.11)),
        web(),
      ];
    },
  }),
  tpl({
    id: 'lx-orange-circle-modern',
    name: 'High CTR — Orange Circle, Script & Outlined Orange Keyword',
    description: '2 photos above and below a cream panel: an orange circle number, a black script word, a huge outlined orange keyword and a black two-line benefit, with an orange website pill.',
    family: 5,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...size,
    collage: { layoutId: 'band-2-2', gap: 6, band: 0.3 },
    layers: ({ band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      return [
        bandShape('#FFF8EE'),
        circleNum(W * 0.2, y(0.18), h(0.34), '#F5A623', '#111111'),
        ln(W * 0.38, y(0.03), W * 0.58, h(0.32), 'Modern', script('#111111')),
        ln(W * 0.03, y(0.37), W * 0.94, h(0.3), 'Hairstyles', anton('#F08A00', { wordCount: 1, stroke: '#3A2418', strokeWidth: 3, shadow: { enabled: true, color: '#3A2418', blur: 0, offsetX: 3, offsetY: 3, opacity: 0.9 } })),
        ln(W * 0.06, y(0.7), W * 0.88, h(0.27), 'for Women Over 50 That Look Absolutely Stunning', anton('#111111', { lineHeight: 1.02, fontSize: h(0.125) })),
        cta(H * 0.9, '#F5A623', '#111111', 'See the Looks', W * 0.42, H * 0.026),
        web(),
      ];
    },
  }),
  tpl({
    id: 'lx-pink-number-keyword',
    name: 'High CTR — Outlined Pink Number & Pink Keyword',
    description: '2 photos above and below a white panel: a huge outlined pink number beside a black keyword, a big pink keyword line and a black benefit line, with a pink CTA pill on the photos.',
    family: 7,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['split', 'number-badge', 'listicle'],
    ...size,
    collage: { layoutId: 'band-2-2', gap: 6, band: 0.27 },
    layers: ({ band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      return [
        bandShape('#FFFFFF'),
        bigNum(W * 0.03, y(0.05), W * 0.36, h(0.42), '#EC2A8C', { stroke: '#111111', strokeWidth: 3, shadow: { enabled: true, color: '#111111', blur: 0, offsetX: 3, offsetY: 3, opacity: 0.9 } }),
        ln(W * 0.41, y(0.14), W * 0.56, h(0.22), 'Strawberry Blonde', anton('#111111', { wordCount: 2 })),
        ln(W * 0.05, y(0.47), W * 0.9, h(0.27), 'Hair Ideas', anton('#EC2A8C', { wordCount: 2 })),
        ln(W * 0.05, y(0.77), W * 0.9, h(0.18), 'for a Soft Rosy Glow', anton('#111111')),
        cta(H * 0.895, '#EC2A8C', '#FFFFFF', 'Find Out Now', W * 0.42, H * 0.028),
        web(),
      ];
    },
  }),
].map((t) => ({ ...t, highCtr: true }));
