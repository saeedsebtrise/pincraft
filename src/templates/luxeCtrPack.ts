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
  tpl({
    id: 'lx-top-block-3photos',
    name: 'High CTR — Color Block Headline, 3 Photos',
    description: 'A terracotta block on top with a big white number, a script word, a two-line white keyword and a benefit line, a large photo and two smaller ones below with a CTA pill.',
    family: 7,
    categories: ['Hair', 'Home Decor', 'Listicle'],
    designTypes: ['image-text-panel', 'script-bold', 'number-badge'],
    ...size,
    collage: { layoutId: 'three-hero-top', gap: 6, region: { x: 0, y: 0.34, width: 1, height: 0.66 } },
    layers: () => {
      const y = (f: number) => H * 0.34 * f;
      return [
        rect(0, 0, W, H * 0.34, '#8C4A32', 'Headline block'),
        bigNum(W * 0.05, y(0.08), W * 0.3, y(0.42), '#FFFFFF'),
        ln(W * 0.37, y(0.07), W * 0.58, y(0.2), 'Gorgeous', script('#FFE2C6')),
        ln(W * 0.37, y(0.29), W * 0.58, y(0.2), 'Balayage', anton('#FFFFFF', { wordCount: 1 })),
        ln(W * 0.05, y(0.56), W * 0.9, y(0.2), 'Hair Color Ideas', anton('#FFFFFF', { wordCount: 3 })),
        ln(W * 0.06, y(0.8), W * 0.88, y(0.13), 'For Long Layered Hair', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#FFE2C6', letterSpacing: 2 }),
        cta(H * 0.9, '#FFFFFF', '#8C4A32', 'See All the Looks', W * 0.46, H * 0.028),
        web(),
      ];
    },
  }),
  tpl({
    id: 'lx-photo-bottom-card',
    name: 'High CTR — Full Photo, Rounded Headline Card',
    description: 'One full-bleed photo with a white rounded card low on the Pin: a pink number circle on its edge, a script word, a bold two-line keyword, a benefit line and a pink CTA button.',
    family: 3,
    categories: ['Hair', 'Beauty', 'Fashion', 'Listicle'],
    designTypes: ['image-text-overlay', 'script-bold', 'number-badge'],
    ...size,
    collage: { layoutId: 'single', gap: 0 },
    layers: () => {
      const cy = H * 0.56;
      const ch = H * 0.36;
      const y = (f: number) => cy + ch * f;
      const h = (f: number) => ch * f;
      return [
        createShape({ name: 'Headline card', role: 'band', x: W * 0.06, y: cy, width: W * 0.88, height: ch, fill: '#FFFFFF', cornerRadius: W * 0.05 }),
        circleNum(W * 0.5, cy, H * 0.075, PINK, '#FFFFFF'),
        ln(W * 0.12, y(0.12), W * 0.76, h(0.15), 'Stunning', script(PINK)),
        ln(W * 0.1, y(0.29), W * 0.8, h(0.17), 'Balayage Hair', anton('#1A1A1A', { wordCount: 2 })),
        ln(W * 0.1, y(0.47), W * 0.8, h(0.15), 'Color Ideas', anton('#1A1A1A', { wordCount: 2 })),
        ln(W * 0.1, y(0.64), W * 0.8, h(0.1), 'For Long Layered Hair', { fontFamily: 'Montserrat', fontWeight: 700, fill: '#555555', letterSpacing: 1.5 }),
        cta(y(0.79), PINK, '#FFFFFF', 'Get the Ideas', W * 0.44, h(0.13)),
        web(),
      ];
    },
  }),
  tpl({
    id: 'lx-magazine-cover',
    name: 'High CTR — Magazine Cover, Yellow Script',
    description: 'One full photo darkened at the bottom: a yellow number circle, a yellow script word, a huge white keyword and a white CTA pill.',
    family: 3,
    categories: ['Hair', 'Beauty', 'Fashion', 'Lifestyle'],
    designTypes: ['image-text-overlay', 'script-bold', 'number-badge'],
    ...size,
    collage: { layoutId: 'single', gap: 0 },
    layers: () => {
      const glow = { enabled: true, color: '#000000', blur: 12, offsetX: 0, offsetY: 3, opacity: 0.5 };
      return [
        createShape({ name: 'Dark fade', role: 'decor', x: 0, y: H * 0.42, width: W, height: H * 0.58, fill: '#000000', opacity: 0.5 }),
        circleNum(W * 0.16, H * 0.08, H * 0.09, '#FFD21F', '#111111'),
        ln(W * 0.08, H * 0.47, W * 0.84, H * 0.07, 'Dreamy', script('#FFD21F')),
        ln(W * 0.05, H * 0.55, W * 0.9, H * 0.095, 'Balayage', anton('#FFFFFF', { wordCount: 1, shadow: glow })),
        ln(W * 0.05, H * 0.655, W * 0.9, H * 0.085, 'Hair Color Ideas', anton('#FFFFFF', { wordCount: 3, shadow: glow })),
        ln(W * 0.08, H * 0.75, W * 0.84, H * 0.04, 'For Long Layered Hair', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#FFD21F', letterSpacing: 2 }),
        cta(H * 0.84, '#FFFFFF', '#111111', 'See All the Looks', W * 0.46, H * 0.03),
        web(),
      ];
    },
  }),
  tpl({
    id: 'lx-left-panel-2photos',
    name: 'High CTR — Left Headline Panel, 2 Photos',
    description: 'A blush panel down the left with a big number, a script word, a stacked keyword and a CTA button; two photos stacked on the right.',
    family: 7,
    categories: ['Hair', 'Beauty', 'Home Decor', 'Listicle'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...size,
    collage: { layoutId: 'two-stack', gap: 6, region: { x: 0.44, y: 0, width: 0.56, height: 1 } },
    layers: () => {
      const PW = W * 0.44;
      const x = PW * 0.08;
      const w = PW * 0.84;
      return [
        rect(0, 0, PW, H, '#F6DCDC', 'Headline panel'),
        bigNum(x, H * 0.12, w, H * 0.14, '#C2185B'),
        ln(x, H * 0.29, w, H * 0.06, 'Trendy', script('#111111')),
        ln(x, H * 0.37, w, H * 0.07, 'Balayage', anton('#111111', { wordCount: 1 })),
        ln(x, H * 0.45, w, H * 0.06, 'Hair Color', anton('#C2185B', { wordCount: 2 })),
        ln(x, H * 0.52, w, H * 0.06, 'Ideas', anton('#111111', { wordCount: 1 })),
        ln(x, H * 0.6, w, H * 0.07, 'For Long Layered Hair', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#333333', lineHeight: 1.1, fontSize: H * 0.017 }),
        createText({
          name: 'Call to action', role: 'cta', x, y: H * 0.72, width: w, height: H * 0.04, text: 'Get the Ideas',
          fontFamily: 'Montserrat', fontWeight: 800, fontSize: H * 0.016, minFontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fill: '#FFFFFF',
          background: bgOn('#C2185B', { hug: true, shape: 'pill', paddingX: H * 0.02, paddingY: H * 0.008 }),
        }),
        footer(W, H, 'plain-dark', { x, width: w, y: H * 0.93, height: H * 0.026, fontFamily: 'Montserrat', fontWeight: 800, fontSize: H * 0.011, letterSpacing: 2, fill: '#C2185B' }),
      ];
    },
  }),
  tpl({
    id: 'lx-grid6-circle',
    name: 'High CTR — 6-Photo Grid, Center Circle',
    description: 'Six photos in a 2×3 grid with a big white circle in the middle holding the number, a script word and a two-line keyword, and a CTA pill below.',
    family: 1,
    categories: ['Hair', 'Home Decor', 'Fashion', 'Listicle'],
    designTypes: ['number-badge', 'listicle'],
    ...size,
    collage: { layoutId: 'grid-2x3', gap: 6 },
    layers: () => {
      const d = W * 0.7;
      const cx = W / 2;
      const top = H * 0.47 - d / 2;
      const y = (f: number) => top + d * f;
      return [
        createShape({ name: 'Center circle', role: 'band', shape: 'ellipse', x: cx - d / 2, y: top, width: d, height: d, fill: '#FFFFFF', stroke: PINK, strokeWidth: 6 }),
        bigNum(cx - d * 0.2, y(0.12), d * 0.4, d * 0.22, PINK, { fontFamily: 'Archivo Black', fontSize: d * 0.2 }),
        ln(cx - d * 0.38, y(0.34), d * 0.76, d * 0.13, 'Pretty', script('#111111')),
        ln(cx - d * 0.4, y(0.48), d * 0.8, d * 0.14, 'Balayage', anton('#111111', { wordCount: 1 })),
        ln(cx - d * 0.36, y(0.63), d * 0.72, d * 0.12, 'Hair Ideas', anton(PINK, { wordCount: 2 })),
        ln(cx - d * 0.3, y(0.77), d * 0.6, d * 0.07, 'To Save Now', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#333333', letterSpacing: 1.5 }),
        cta(H * 0.88, PINK, '#FFFFFF', 'See All the Ideas', W * 0.5, H * 0.03),
        web(),
      ];
    },
  }),
  tpl({
    id: 'lx-ribbon-band',
    name: 'High CTR — Tilted Ribbon, Cream Band, 4 Photos',
    description: '2 photos above and below a cream band: a tilted red ribbon with the lead word, a big number, a bold two-line keyword and a dark CTA pill.',
    family: 5,
    categories: ['Hair', 'Food / Recipe', 'Home Decor', 'Listicle'],
    designTypes: ['split', 'number-badge', 'listicle'],
    ...size,
    collage: { layoutId: 'band-2-2', gap: 6, band: 0.3 },
    layers: ({ band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      return [
        bandShape('#FBF3E6'),
        ln(W * 0.06, y(-0.08), W * 0.46, h(0.2), 'Must-Try', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#FFFFFF', wordCount: 1, rotation: -5, letterSpacing: 2, background: bgOn(RED, { paddingX: h(0.05), paddingY: h(0.02) }) }),
        bigNum(W * 0.05, y(0.18), W * 0.3, h(0.5), '#111111', { fontFamily: 'Archivo Black', fontSize: h(0.46) }),
        ln(W * 0.37, y(0.2), W * 0.58, h(0.24), 'Balayage', anton(RED, { wordCount: 1 })),
        ln(W * 0.37, y(0.45), W * 0.58, h(0.22), 'Hair Ideas', anton('#111111', { wordCount: 2 })),
        ln(W * 0.06, y(0.73), W * 0.88, h(0.12), 'For Long Layered Hair', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#333333', letterSpacing: 1.5 }),
        cta(H * 0.9, '#111111', '#FFFFFF', 'Get the Ideas', W * 0.42, H * 0.028),
        web(),
      ];
    },
  }),
].map((t) => ({ ...t, highCtr: true }));
