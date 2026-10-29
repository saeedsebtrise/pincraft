/**
 * High-click Pin designs, built on what the top blog Pins share and on
 * Pinterest's own creative guidance:
 *
 *  1. The keyword line is the biggest thing on the Pin and readable at
 *     feed size (≥ ~10% of the height) — people scan, they don't read.
 *  2. Text sits on a solid band or panel, never straight on a busy photo.
 *  3. One message: number + keyword + a short benefit line, nothing else.
 *  4. A big list number (listicles are what people save and click).
 *  5. Several real photos for "ideas" posts — the Pin proves there's more.
 *  6. A clear call-to-action button, kept out of the lower-right corner
 *     where Pinterest's own icons sit.
 *  7. 2:3 vertical (1000 × 1500), high contrast, website small at the bottom.
 */
import { createShape, createText } from '../model/factory';
import type { Layer, TextLayer } from '../model/types';
import { badge, bandShape, bgOff, bgOn, footer, titleLine, tpl } from './kit';

type TP = Partial<TextLayer>;
const W0 = 1000;

const rect = (x: number, y: number, w: number, h: number, fill: string, p: Parameters<typeof createShape>[0] = {}): Layer =>
  createShape({ name: 'Shape', role: 'decor', x, y, width: w, height: h, fill, ...p });

const line = (x: number, y: number, w: number, h: number, text: string, p: TP = {}) =>
  titleLine(W0, y, h, text, { x, width: w, background: bgOff(), letterSpacing: 0, lineHeight: 1, fontWeight: 400, fontSize: h * 0.92, minFontSize: 18, ...p });
const sub = (x: number, y: number, w: number, h: number, text: string, p: TP = {}) =>
  titleLine(W0, y, h, text, {
    name: 'Subtitle line', role: 'subtitle', x, width: w, background: bgOff(), letterSpacing: 0, lineHeight: 1, textTransform: 'none',
    fontFamily: 'Montserrat', fontWeight: 600, fontSize: h * 0.8, minFontSize: 14, ...p,
  });
/** Call-to-action button (Auto Design rewords it per Pin). */
const cta = (x: number, y: number, w: number, h: number, color: string, fill: string, p: TP = {}): TextLayer =>
  createText({
    name: 'Call to action', role: 'cta', x, y, width: w, height: h, text: 'See All the Ideas',
    fontFamily: 'Montserrat', fontWeight: 800, fontSize: h * 0.42, minFontSize: 12, letterSpacing: 2, textTransform: 'uppercase', fill,
    background: bgOn(color, { hug: true, shape: 'pill', paddingX: h * 0.55, paddingY: h * 0.16 }),
    ...p,
  });
const web = (H: number, fill: string, p: TP = {}) =>
  footer(W0, H, 'plain-dark', { y: H * 0.955, height: H * 0.03, fontFamily: 'Montserrat', fontWeight: 700, fontSize: H * 0.014, letterSpacing: 4, fill, ...p });
const circleNum = (cx: number, cy: number, d: number, color: string, fill: string, p: TP = {}) =>
  badge(cx - d / 2, cy - d / 2, d, '25', 'circle', color, fill, { fontFamily: 'Anton', fontSize: d * 0.56, ...p });

const X = W0 * 0.06;
const TW = W0 * 0.88;

export const CTR_TEMPLATES = [
  tpl({
    id: 'ctr-keyword-band-4',
    name: 'High CTR — Huge Keyword Band, 4 Photos',
    description: '2 photos above and below a white band: a pink circle number on the photo edge, a small lead-in, a huge black keyword, a benefit line and a CTA button.',
    family: 1,
    categories: ['Home Decor', 'Hair', 'Listicle', 'Lifestyle'],
    designTypes: ['split', 'number-badge', 'listicle'],
    collage: { layoutId: 'band-2-2', gap: 8, band: 0.34 },
    layers: ({ H, band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      return [
        bandShape('#FFFFFF'),
        circleNum(W0 * 0.5, y(-0.02), h(0.3), '#E6397A', '#FFFFFF'),
        line(X, y(0.15), TW, h(0.11), 'Cozy', { fontFamily: 'Montserrat', fontWeight: 800, letterSpacing: 8, fill: '#E6397A', wordCount: 1 }),
        line(X, y(0.27), TW, h(0.21), 'Bedroom Decor', { fontFamily: 'Anton', fill: '#111111', wordCount: 2 }),
        line(X, y(0.49), TW, h(0.16), 'Ideas', { fontFamily: 'Anton', fill: '#111111' }),
        sub(X, y(0.67), TW, h(0.09), 'That look expensive', { fill: '#555555' }),
        cta(W0 * 0.25, y(0.8), W0 * 0.5, h(0.14), '#111111', '#FFFFFF'),
        web(H, '#FFFFFF', { shadow: { enabled: true, color: '#000000', blur: 10, offsetX: 0, offsetY: 2, opacity: 0.5 } }),
      ];
    },
  }),
  tpl({
    id: 'ctr-top-panel-3photos',
    name: 'High CTR — Headline Panel on Top, 3 Photos',
    description: 'A white top panel with a red number tile beside a huge keyword and a benefit line, three photos below and a CTA button on the photos.',
    family: 7,
    categories: ['Food / Recipe', 'Home Decor', 'Listicle'],
    designTypes: ['image-text-panel', 'three-image', 'number-badge'],
    collage: { layoutId: 'three-hero-top', gap: 8, region: { x: 0, y: 0.36, width: 1, height: 0.64 } },
    layers: ({ H }) => [
      badge(X, H * 0.035, H * 0.12, '25', 'rounded', '#E63946', '#FFFFFF', { fontFamily: 'Anton', fontSize: H * 0.075 }),
      line(X + H * 0.135, H * 0.045, TW - H * 0.135, H * 0.1, 'Easy', { fontFamily: 'Anton', fill: '#E63946', align: 'left', wordCount: 1 }),
      line(X, H * 0.165, TW, H * 0.09, 'Dinner Recipes', { fontFamily: 'Anton', fill: '#111111', align: 'left', wordCount: 2 }),
      line(X, H * 0.255, TW, H * 0.065, 'For Busy Nights', { fontFamily: 'Anton', fill: '#111111', align: 'left' }),
      sub(X, H * 0.322, TW, H * 0.03, 'Ready in 30 minutes or less', { fill: '#444444', align: 'left' }),
      cta(X, H * 0.87, W0 * 0.5, H * 0.055, '#E63946', '#FFFFFF'),
      web(H, '#FFFFFF', { x: W0 * 0.56, width: W0 * 0.38, align: 'right', y: H * 0.958, shadow: { enabled: true, color: '#000000', blur: 10, offsetX: 0, offsetY: 2, opacity: 0.6 } }),
    ],
  }),
  tpl({
    id: 'ctr-yellow-band-6photos',
    name: 'High CTR — Yellow Band, 6 Photos',
    description: 'Two photos above and four below a bright yellow band: black number, huge black condensed keyword and a benefit line — many photos show there are lots of ideas.',
    family: 2,
    categories: ['Home Decor', 'Fashion', 'Listicle'],
    designTypes: ['split', 'collage-5', 'listicle'],
    collage: { layoutId: 'band-2-4', gap: 8, band: 0.3 },
    layers: ({ H, band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      return [
        bandShape('#FFD23F'),
        line(X, y(0.04), TW, h(0.21), '25 Small', { fontFamily: 'Anton', fill: '#111111', wordCount: 2 }),
        line(X, y(0.26), TW, h(0.3), 'Balcony Ideas', { fontFamily: 'Anton', fill: '#111111', wordCount: 2 }),
        line(X, y(0.57), TW, h(0.18), 'You Will Love', { fontFamily: 'Anton', fill: '#111111' }),
        sub(X, y(0.78), TW, h(0.13), 'On a budget', { fontFamily: 'Montserrat', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 4, fill: '#111111' }),
        web(H, '#FFFFFF', { shadow: { enabled: true, color: '#000000', blur: 10, offsetX: 0, offsetY: 2, opacity: 0.6 } }),
      ];
    },
  }),
  tpl({
    id: 'ctr-dark-band-yellow-number',
    name: 'High CTR — Black Band, Yellow Number',
    description: '2 photos above and below a black band: a giant yellow number beside two huge white condensed lines, a yellow benefit line and a yellow CTA.',
    family: 4,
    categories: ['Lifestyle', 'Hair', 'Listicle'],
    designTypes: ['split', 'number-badge', 'listicle'],
    collage: { layoutId: 'band-2-2', gap: 8, band: 0.32 },
    layers: ({ H, band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      return [
        bandShape('#111111'),
        badge(X, y(0.08), h(0.55), '25', 'square', '#111111', '#FFD23F', { x: X, width: W0 * 0.3, height: h(0.55), fontFamily: 'Anton', fontSize: h(0.52), background: bgOff() }),
        line(W0 * 0.37, y(0.08), W0 * 0.57, h(0.27), 'Short', { fontFamily: 'Anton', fill: '#FFFFFF', align: 'left', wordCount: 1 }),
        line(W0 * 0.37, y(0.36), W0 * 0.57, h(0.27), 'Haircuts', { fontFamily: 'Anton', fill: '#FFFFFF', align: 'left', wordCount: 1 }),
        line(X, y(0.66), TW, h(0.14), 'For Fine Hair', { fontFamily: 'Montserrat', fontWeight: 800, letterSpacing: 4, fill: '#FFD23F' }),
        cta(W0 * 0.28, y(0.83), W0 * 0.44, h(0.13), '#FFD23F', '#111111'),
        web(H, '#FFFFFF', { shadow: { enabled: true, color: '#000000', blur: 10, offsetX: 0, offsetY: 2, opacity: 0.6 } }),
      ];
    },
  }),
  tpl({
    id: 'ctr-photo-colour-box',
    name: 'High CTR — Photo with Solid Colour Box',
    description: 'One big photo with a solid teal box across the middle: white number and lead-in, a huge white keyword, benefit line and a white CTA — text never sits on the busy photo.',
    family: 6,
    categories: ['Lifestyle', 'Beauty', 'How-To'],
    designTypes: ['single-image', 'image-text-overlay', 'number-badge'],
    collage: { layoutId: 'single' },
    layers: ({ H }) => [
      rect(0, H * 0.32, W0, H * 0.41, '#127C7A', { name: 'Colour box', opacity: 0.96 }),
      line(X, H * 0.34, TW, H * 0.065, '25 Simple', { fontFamily: 'Montserrat', fontWeight: 800, letterSpacing: 6, fill: '#FFFFFF', wordCount: 2 }),
      line(X, H * 0.41, TW, H * 0.12, 'Skincare Tips', { fontFamily: 'Anton', fill: '#FFFFFF', wordCount: 2 }),
      line(X, H * 0.53, TW, H * 0.085, 'For Glowing Skin', { fontFamily: 'Anton', fill: '#FFFFFF' }),
      sub(X, H * 0.625, TW, H * 0.03, 'Simple steps for every day', { fill: '#D7F2F1' }),
      cta(W0 * 0.27, H * 0.665, W0 * 0.46, H * 0.045, '#FFFFFF', '#127C7A'),
      web(H, '#FFFFFF', { shadow: { enabled: true, color: '#000000', blur: 10, offsetX: 0, offsetY: 2, opacity: 0.6 } }),
    ],
  }),
  tpl({
    id: 'ctr-hook-underline',
    name: 'High CTR — Hook Headline with Underline',
    description: 'A white top with a huge two-line hook, the keyword underlined with a thick red bar, a benefit line, then one big photo with a CTA button.',
    family: 7,
    categories: ['How-To', 'Lifestyle', 'Custom Blog Pin'],
    designTypes: ['image-text-panel'],
    collage: { layoutId: 'single', region: { x: 0, y: 0.43, width: 1, height: 0.57 } },
    layers: ({ H }) => [
      line(X, H * 0.035, TW, H * 0.1, 'How to Save', { fontFamily: 'Montserrat', fontWeight: 900, textTransform: 'none', letterSpacing: -1, fill: '#111111', wordCount: 3 }),
      line(X, H * 0.14, TW, H * 0.12, '$500 a', { fontFamily: 'Montserrat', fontWeight: 900, textTransform: 'none', letterSpacing: -1, fill: '#111111', wordCount: 2 }),
      line(X, H * 0.26, TW, H * 0.075, 'Month', { fontFamily: 'Montserrat', fontWeight: 900, textTransform: 'none', letterSpacing: -1, fill: '#111111' }),
      rect(W0 * 0.2, H * 0.342, W0 * 0.6, H * 0.014, '#E63946', { name: 'Underline' }),
      sub(X, H * 0.37, TW, H * 0.034, 'Without feeling broke', { fill: '#555555' }),
      cta(X, H * 0.87, W0 * 0.5, H * 0.055, '#111111', '#FFFFFF'),
      web(H, '#FFFFFF', { x: W0 * 0.56, width: W0 * 0.38, align: 'right', y: H * 0.958, shadow: { enabled: true, color: '#000000', blur: 10, offsetX: 0, offsetY: 2, opacity: 0.6 } }),
    ],
  }),
  tpl({
    id: 'ctr-coral-band-pill-number',
    name: 'High CTR — Coral Band, Pill Number',
    description: '2 photos above and below a coral band: a white pill number, a huge white keyword, a benefit line and a black CTA button.',
    family: 1,
    categories: ['Beauty', 'Fashion', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    collage: { layoutId: 'band-2-2', gap: 8, band: 0.32 },
    layers: ({ H, band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      return [
        bandShape('#F26B5B'),
        badge(W0 * 0.5 - h(0.2), y(0.05), h(0.2), '25', 'pill', '#FFFFFF', '#F26B5B', { fontFamily: 'Anton', fontSize: h(0.15) }),
        line(X, y(0.28), TW, h(0.3), 'Nail Designs', { fontFamily: 'Anton', fill: '#FFFFFF', wordCount: 2 }),
        line(X, y(0.58), TW, h(0.13), 'For Spring', { fontFamily: 'Montserrat', fontWeight: 800, letterSpacing: 6, fill: '#FFFFFF' }),
        cta(W0 * 0.27, y(0.76), W0 * 0.46, h(0.16), '#111111', '#FFFFFF'),
        web(H, '#FFFFFF', { shadow: { enabled: true, color: '#000000', blur: 10, offsetX: 0, offsetY: 2, opacity: 0.6 } }),
      ];
    },
  }),
  tpl({
    id: 'ctr-cream-panel-recipe',
    name: 'High CTR — Photo + Cream Panel, Green Tag',
    description: 'A big photo over a cream panel: a green tag with the number, a huge dark keyword, a benefit line and a green CTA — clean and very readable.',
    family: 7,
    categories: ['Food / Recipe', 'How-To', 'Lifestyle'],
    designTypes: ['image-text-panel', 'number-badge'],
    bg: '#FBF5EA',
    collage: { layoutId: 'single', region: { x: 0, y: 0, width: 1, height: 0.58 } },
    layers: ({ H }) => [
      badge(W0 * 0.5 - H * 0.06, H * 0.55, H * 0.06, '25', 'pill', '#2E7D4F', '#FFFFFF', { fontFamily: 'Montserrat', fontWeight: 800, fontSize: H * 0.034 }),
      line(X, H * 0.625, TW, H * 0.06, 'Healthy', { fontFamily: 'Montserrat', fontWeight: 800, letterSpacing: 8, fill: '#2E7D4F', wordCount: 1 }),
      line(X, H * 0.69, TW, H * 0.1, 'Lunch Ideas', { fontFamily: 'Anton', fill: '#2B2118', wordCount: 2 }),
      line(X, H * 0.79, TW, H * 0.065, 'For Work', { fontFamily: 'Anton', fill: '#2B2118' }),
      sub(X, H * 0.86, TW, H * 0.028, 'Quick, cheap and filling', { fill: '#6B5A48' }),
      cta(W0 * 0.3, H * 0.895, W0 * 0.4, H * 0.042, '#2E7D4F', '#FFFFFF'),
      web(H, '#6B5A48'),
    ],
  }),
  tpl({
    id: 'ctr-blue-top-strip',
    name: 'High CTR — Blue Top Strip on Photo',
    description: 'One big photo with a solid blue strip at the top: a white number tile, huge white keyword and benefit line; a white CTA button at the bottom left.',
    family: 6,
    categories: ['Lifestyle', 'Home Decor', 'How-To'],
    designTypes: ['single-image', 'image-text-overlay', 'number-badge'],
    collage: { layoutId: 'single' },
    layers: ({ H }) => [
      rect(0, 0, W0, H * 0.37, '#1E56C8', { name: 'Top strip' }),
      badge(X, H * 0.03, H * 0.1, '25', 'rounded', '#FFFFFF', '#1E56C8', { fontFamily: 'Anton', fontSize: H * 0.065 }),
      line(X + H * 0.115, H * 0.035, TW - H * 0.115, H * 0.09, 'Genius', { fontFamily: 'Anton', fill: '#FFFFFF', align: 'left', wordCount: 1 }),
      line(X, H * 0.14, TW, H * 0.1, 'Storage Hacks', { fontFamily: 'Anton', fill: '#FFFFFF', align: 'left', wordCount: 2 }),
      line(X, H * 0.245, TW, H * 0.065, 'For Small Spaces', { fontFamily: 'Anton', fill: '#FFFFFF', align: 'left' }),
      sub(X, H * 0.318, TW, H * 0.032, 'That actually work', { fill: '#D6E2FF', align: 'left' }),
      cta(X, H * 0.87, W0 * 0.5, H * 0.055, '#FFFFFF', '#1E56C8'),
      web(H, '#FFFFFF', { x: W0 * 0.56, width: W0 * 0.38, align: 'right', y: H * 0.958, shadow: { enabled: true, color: '#000000', blur: 10, offsetX: 0, offsetY: 2, opacity: 0.6 } }),
    ],
  }),
  tpl({
    id: 'ctr-purple-band-two-photos',
    name: 'High CTR — Purple Band, Photo Above & Below',
    description: 'One photo above and one below a deep purple band: a yellow number, a huge white keyword, yellow benefit line and a yellow CTA.',
    family: 7,
    categories: ['Lifestyle', 'Fashion', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    collage: { layoutId: 'band-1-1', gap: 0, band: 0.34 },
    layers: ({ H, band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      return [
        bandShape('#4B1F6F'),
        line(X, y(0.05), TW, h(0.16), '25', { role: 'badge', name: 'Number badge', fontFamily: 'Anton', fill: '#FFD23F' }),
        line(X, y(0.22), TW, h(0.12), 'Fall', { fontFamily: 'Montserrat', fontWeight: 800, letterSpacing: 6, fill: '#FFFFFF', wordCount: 1 }),
        line(X, y(0.35), TW, h(0.22), 'Outfit Ideas', { fontFamily: 'Anton', fill: '#FFFFFF', wordCount: 2 }),
        line(X, y(0.58), TW, h(0.1), 'For Women', { fontFamily: 'Anton', fill: '#FFFFFF' }),
        sub(X, y(0.7), TW, h(0.08), "You'll want to copy", { fill: '#FFD23F' }),
        cta(W0 * 0.27, y(0.81), W0 * 0.46, h(0.14), '#FFD23F', '#4B1F6F'),
        web(H, '#FFFFFF', { shadow: { enabled: true, color: '#000000', blur: 10, offsetX: 0, offsetY: 2, opacity: 0.6 } }),
      ];
    },
  }),
  tpl({
    id: 'ctr-hair-magenta-band',
    name: 'High CTR — Magenta Number & Keyword, 4 Photos',
    description: '2 photos above and below a white band: a giant magenta number outlined in black beside a black word, a full-width magenta condensed keyword and two black lines finishing the title.',
    family: 1,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['split', 'number-badge', 'hair-beauty'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'band-2-2', gap: 8, band: 0.2 },
    layers: ({ W, H, band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      const xs = W * 0.05;
      const ws = W * 0.9;
      return [
        bandShape('#FFFFFF'),
        badge(xs, y(-0.14), h(0.4), '20', 'square', '#FFFFFF', '#E0168C', {
          x: xs, width: W * 0.36, height: h(0.4), fontFamily: 'Montserrat', fontWeight: 900, fontSize: h(0.38), background: bgOff(), stroke: '#111111', strokeWidth: 6,
        }),
        titleLine(W, y(0.02), h(0.22), 'Trendy', {
          x: W * 0.43, width: W * 0.52, align: 'left', fontFamily: 'Montserrat', fontWeight: 900, fill: '#111111', letterSpacing: 2, lineHeight: 1, fontSize: h(0.21), background: bgOff(), wordCount: 1,
        }),
        titleLine(W, y(0.3), h(0.27), 'Fall Hair Color Ideas', {
          x: xs, width: ws, fontFamily: 'Anton', fontWeight: 400, fill: '#E0168C', letterSpacing: 0, lineHeight: 1, fontSize: h(0.26), background: bgOff(), wordCount: 4,
        }),
        titleLine(W, y(0.61), h(0.15), "You'll Want to Try Before", {
          x: xs, width: ws, fontFamily: 'Montserrat', fontWeight: 800, fill: '#111111', letterSpacing: 0, lineHeight: 1, fontSize: h(0.14), background: bgOff(), wordCount: 5,
        }),
        titleLine(W, y(0.79), h(0.15), 'Your Next Salon Visit', {
          x: xs, width: ws, fontFamily: 'Montserrat', fontWeight: 800, fill: '#111111', letterSpacing: 0, lineHeight: 1, fontSize: h(0.14), background: bgOff(),
        }),
        footer(W, H, 'over-image', { y: H * 0.955, height: H * 0.03, fontFamily: 'Montserrat', fontWeight: 700, fontSize: H * 0.014, letterSpacing: 4 }),
      ];
    },
  }),
  tpl({
    id: 'ctr-hair-white-boxes',
    name: 'High CTR — Photo with Three White Boxes',
    description: 'One big photo with three stacked white boxes in condensed bold type — black, a wide magenta keyword, black — and a magenta website bar.',
    family: 6,
    categories: ['Hair', 'Beauty', 'Fashion'],
    designTypes: ['single-image', 'image-text-overlay', 'hair-beauty'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => {
      const box = (y: number, h: number, text: string, fill: string, p: TP = {}) =>
        titleLine(W, y, h, text, {
          x: W * 0.03, width: W * 0.94, fontFamily: 'Anton', fontWeight: 400, textTransform: 'none', fill, letterSpacing: 1, lineHeight: 1, fontSize: h * 0.72,
          background: bgOn('#FFFFFF', { hug: true, paddingX: W * 0.025, paddingY: h * 0.08 }), ...p,
        });
      return [
        box(H * 0.52, H * 0.105, 'Biggest', '#111111', { wordCount: 1 }),
        box(H * 0.645, H * 0.105, 'Balayage Hair Color', '#F0165A', { wordCount: 3 }),
        box(H * 0.77, H * 0.105, 'Trends 2026', '#111111'),
        rect(0, H * 0.958, W, H * 0.042, '#F0165A', { name: 'Footer bar' }),
        footer(W, H, 'plain-light', { x: 0, width: W, y: H * 0.961, height: H * 0.036, fontFamily: 'Montserrat', fontWeight: 800, fontSize: H * 0.018, letterSpacing: 2, fill: '#FFFFFF' }),
      ];
    },
  }),
  ...photoOverlays(),
  ...fashionPack(),
].map((t) => ({ ...t, highCtr: true }));

/**
 * Bold fashion & food blog Pins (white bands between photo collages, pink keyword
 * bars, outlined pink numbers, red scripts, white type boxes on one photo).
 * Mostly 9:16 (1080 × 1920); two are 2:3.
 */
function fashionPack() {
  const PINK = '#F0499B';
  const HOT = '#F0168C';
  const site = (W: number, H: number, p: TP = {}) =>
    footer(W, H, 'over-image', { x: 0, width: W, y: H * 0.957, height: H * 0.03, fontFamily: 'Montserrat', fontWeight: 700, fontSize: H * 0.016, letterSpacing: 8, ...p });
  const pinkBar = (W: number, H: number) => [
    rect(0, H * 0.958, W, H * 0.042, PINK, { name: 'Footer bar' }),
    footer(W, H, 'plain-light', { x: 0, width: W, y: H * 0.961, height: H * 0.036, fontFamily: 'Montserrat', fontWeight: 600, fontSize: H * 0.017, letterSpacing: 5, fill: '#FFFFFF' }),
  ];
  /** Headline line at (x, w) in canvas units. */
  const ln = (W: number, x: number, y: number, w: number, h: number, text: string, p: TP = {}) =>
    titleLine(W, y, h, text, { x, width: w, background: bgOff(), letterSpacing: 0, lineHeight: 1, fontWeight: 400, fontSize: h * 0.92, minFontSize: 18, ...p });
  /** A big number set as type (pink with a black outline by default). */
  const bigNum = (x: number, y: number, w: number, h: number, p: TP = {}) =>
    badge(x, y, h, '20', 'square', '#FFFFFF', PINK, { x, width: w, height: h, background: bgOff(), fontFamily: 'Archivo Black', fontSize: h * 0.92, lineHeight: 1, stroke: '#111111', strokeWidth: h * 0.045, ...p });
  const anton = (fill: string, p: TP = {}): TP => ({ fontFamily: 'Anton', fill, ...p });
  const heavy = (fill: string, p: TP = {}): TP => ({ fontFamily: 'Archivo Black', fill, ...p });
  const tall = { w: 1080, h: 1920 };

  return [
    tpl({
      id: 'ctr-fp-pink-bar-script',
      name: 'High CTR — Pink Number, Script & Pink Keyword Bar',
      description: '2 photos above and below a white band: an outlined pink number beside a black script word, a pink bar with white condensed keyword and a black closing line.',
      family: 5,
      categories: ['Fashion', 'Beauty', 'Listicle'],
      designTypes: ['split', 'script-bold', 'number-badge'],
      ...tall,
      collage: { layoutId: 'band-2-2', gap: 8, band: 0.27 },
      layers: ({ W, H, band }) => {
        const y = (f: number) => band.y + band.height * f;
        const h = (f: number) => band.height * f;
        return [
          bandShape('#FFFFFF'),
          bigNum(W * 0.05, y(0.03), W * 0.34, h(0.4)),
          ln(W, W * 0.38, y(0.0), W * 0.58, h(0.38), 'Trendy', { fontFamily: 'Pacifico', textTransform: 'none', fill: '#111111', wordCount: 1 }),
          rect(0, y(0.47), W, h(0.27), PINK, { name: 'Keyword bar' }),
          ln(W, W * 0.03, y(0.485), W * 0.94, h(0.24), 'Combat Boot Outfits', anton('#FFFFFF', { wordCount: 3 })),
          ln(W, W * 0.03, y(0.78), W * 0.94, h(0.19), "You Can't Get Around Right Now", anton('#111111')),
          site(W, H),
        ];
      },
    }),
    tpl({
      id: 'ctr-fp-classy-red-script',
      name: 'High CTR — Giant Number, Red Script, 6 Photos',
      description: 'Two short photos on top, a white text area with a giant black number, a red script word, black condensed caps and a heavy last word, then a 2×2 photo grid.',
      family: 5,
      categories: ['Fashion', 'Lifestyle', 'Listicle'],
      designTypes: ['image-text-panel', 'script-bold', 'number-badge'],
      ...tall,
      collage: { layoutId: 'top2-gap-grid4', gap: 8 },
      layers: ({ W, H }) => [
        bigNum(W * 0.02, H * 0.158, W * 0.38, H * 0.16, { fill: '#111111', strokeWidth: 0, fontFamily: 'Archivo Black' }),
        ln(W, W * 0.4, H * 0.158, W * 0.58, H * 0.068, 'Classy', { fontFamily: 'Pacifico', textTransform: 'none', fill: '#D91E2E', wordCount: 1 }),
        ln(W, W * 0.4, H * 0.238, W * 0.58, H * 0.078, 'January', anton('#111111', { wordCount: 1 })),
        ln(W, W * 0.03, H * 0.316, W * 0.94, H * 0.068, 'Outfits', heavy('#111111')),
        site(W, H),
      ],
    }),
    tpl({
      id: 'ctr-fp-pink-number-5photos',
      name: 'High CTR — Outlined Pink Number, Pink Keyword, 5 Photos',
      description: '2 photos above and 3 below a white band: an outlined pink number beside a black word, a full-width pink condensed keyword and two heavy black lines.',
      family: 2,
      categories: ['Fashion', 'Beauty', 'Listicle'],
      designTypes: ['split', 'number-badge'],
      ...tall,
      collage: { layoutId: 'band-2-3', gap: 8, band: 0.29 },
      layers: ({ W, H, band }) => {
        const y = (f: number) => band.y + band.height * f;
        const h = (f: number) => band.height * f;
        return [
          bandShape('#FFFFFF'),
          bigNum(W * 0.05, y(0.03), W * 0.36, h(0.31), { fill: HOT }),
          ln(W, W * 0.42, y(0.05), W * 0.54, h(0.29), 'Casual', anton('#111111', { align: 'left', wordCount: 1 })),
          ln(W, W * 0.03, y(0.36), W * 0.94, h(0.23), 'Winter Outfit Ideas', anton(HOT, { wordCount: 3 })),
          ln(W, W * 0.03, y(0.61), W * 0.94, h(0.17), "You'll Want to Copy", heavy('#111111', { wordCount: 4 })),
          ln(W, W * 0.03, y(0.8), W * 0.94, h(0.17), 'All Season', heavy('#111111')),
          site(W, H),
        ];
      },
    }),
    tpl({
      id: 'ctr-fp-serif-boxes-pink',
      name: 'High CTR — Serif in White Boxes, Pink Keyword Box',
      description: 'One photo with heavy black serif lines in white boxes, the keyword in white on a pink box, and a pink website bar.',
      family: 6,
      categories: ['Fashion', 'Lifestyle', 'Beauty'],
      designTypes: ['single-image', 'image-text-overlay'],
      ...tall,
      collage: { layoutId: 'single' },
      layers: ({ W, H }) => {
        const box = (y: number, h: number, text: string, fill: string, bg: string, p: TP = {}) =>
          ln(W, W * 0.03, y, W * 0.94, h, text, {
            fontFamily: 'Abril Fatface', fill, fontSize: h * 0.82, background: bgOn(bg, { hug: true, paddingX: W * 0.03, paddingY: h * 0.06 }), ...p,
          });
        return [
          box(H * 0.505, H * 0.075, '15 Ways', '#111111', '#FFFFFF', { wordCount: 2 }),
          box(H * 0.585, H * 0.075, 'To Look', '#111111', '#FFFFFF', { wordCount: 2 }),
          box(H * 0.665, H * 0.085, 'Expensive', '#FFFFFF', PINK, { wordCount: 1 }),
          box(H * 0.757, H * 0.07, 'On a Budget', '#111111', '#FFFFFF'),
          ...pinkBar(W, H),
        ];
      },
    }),
    tpl({
      id: 'ctr-fp-side-rules-6photos',
      name: 'High CTR — Ruled Lead-in, Huge Pink Keyword, 6 Photos',
      description: 'Two photos on top, a white band with a lead-in between side rules, a huge pink condensed keyword and two black lines, a 2×2 grid below and a pink website bar.',
      family: 1,
      categories: ['Fashion', 'Lifestyle', 'Listicle'],
      designTypes: ['image-text-panel', 'listicle'],
      ...tall,
      collage: { layoutId: 'top2-band-grid4', gap: 8, region: { x: 0, y: 0, width: 1, height: 0.958 } },
      layers: ({ W, H }) => [
        rect(W * 0.02, H * 0.296, W * 0.13, 4, '#111111', { name: 'Rule' }),
        rect(W * 0.85, H * 0.296, W * 0.13, 4, '#111111', { name: 'Rule' }),
        ln(W, W * 0.16, H * 0.27, W * 0.68, H * 0.052, '20 Trendy Winter', { fontFamily: 'Oswald', fontWeight: 700, fill: '#111111', wordCount: 3 }),
        ln(W, W * 0.03, H * 0.325, W * 0.94, H * 0.083, 'Outfit Ideas', anton(HOT, { wordCount: 2 })),
        ln(W, W * 0.03, H * 0.41, W * 0.94, H * 0.036, "You'll Want to Copy Before", { fontFamily: 'Oswald', fontWeight: 700, fill: '#111111', wordCount: 5 }),
        ln(W, W * 0.03, H * 0.446, W * 0.94, H * 0.036, 'The Cold Really Hits', { fontFamily: 'Oswald', fontWeight: 700, fill: '#111111' }),
        ...pinkBar(W, H),
      ],
    }),
    tpl({
      id: 'ctr-fp-old-money-band',
      name: 'High CTR — Ruled Lead-in, Two Huge Pink Lines',
      description: '2 photos above and below a white band: a lead-in between side rules, two huge pink condensed keyword lines and a black closing line; pink website bar.',
      family: 1,
      categories: ['Fashion', 'Lifestyle', 'Listicle'],
      designTypes: ['split', 'listicle'],
      ...tall,
      collage: { layoutId: 'band-2-2', gap: 8, band: 0.34, region: { x: 0, y: 0, width: 1, height: 0.958 } },
      layers: ({ W, H, band }) => {
        const y = (f: number) => band.y + band.height * f;
        const h = (f: number) => band.height * f;
        return [
          bandShape('#FFFFFF'),
          rect(W * 0.02, y(0.1), W * 0.11, 4, '#111111', { name: 'Rule' }),
          rect(W * 0.87, y(0.1), W * 0.11, 4, '#111111', { name: 'Rule' }),
          ln(W, W * 0.14, y(0.03), W * 0.72, h(0.14), '20 Timeless Style', { fontFamily: 'Oswald', fontWeight: 700, fill: '#111111', wordCount: 3 }),
          ln(W, W * 0.03, y(0.19), W * 0.94, h(0.3), 'Old Money', anton(HOT, { wordCount: 2 })),
          ln(W, W * 0.03, y(0.5), W * 0.94, h(0.28), 'Outfits', anton(HOT, { wordCount: 1 })),
          ln(W, W * 0.03, y(0.81), W * 0.94, h(0.15), 'To Copy This Season', { fontFamily: 'Oswald', fontWeight: 700, fill: '#111111' }),
          ...pinkBar(W, H),
        ];
      },
    }),
    tpl({
      id: 'ctr-fp-big-number-5photos',
      name: 'High CTR — Big Outlined Number over the Photo Edge',
      description: '2 photos above and 3 below a white band: a big outlined pink number breaking over the top photos, black condensed caps, a pink keyword and a black closing line.',
      family: 2,
      categories: ['Fashion', 'Lifestyle', 'Listicle'],
      designTypes: ['split', 'number-badge'],
      ...tall,
      collage: { layoutId: 'band-2-3', gap: 8, band: 0.28 },
      layers: ({ W, H, band }) => {
        const y = (f: number) => band.y + band.height * f;
        const h = (f: number) => band.height * f;
        return [
          bandShape('#FFFFFF'),
          bigNum(W * 0.03, y(-0.3), W * 0.38, h(0.62), { fill: HOT }),
          ln(W, W * 0.42, y(0.05), W * 0.55, h(0.27), 'Old Money', anton('#111111', { wordCount: 2 })),
          ln(W, W * 0.03, y(0.36), W * 0.94, h(0.33), 'Winter Outfits', anton(HOT, { wordCount: 2 })),
          ln(W, W * 0.03, y(0.74), W * 0.94, h(0.18), 'Everyone Will Be Copying This Season', { fontFamily: 'Oswald', fontWeight: 700, fill: '#111111' }),
          site(W, H),
        ];
      },
    }),
    tpl({
      id: 'ctr-fp-recipe-red-script',
      name: 'High CTR — Number + Red Script, Orange Outlined Line, 6 Photos',
      description: '3 photos above and below a white band: a heavy black number beside a red script, a huge black keyword and an orange line outlined in black.',
      family: 5,
      categories: ['Food / Recipe', 'Listicle'],
      designTypes: ['split', 'script-bold', 'number-badge'],
      ...tall,
      collage: { layoutId: 'band-3-3', gap: 8, band: 0.26 },
      layers: ({ W, H, band }) => {
        const y = (f: number) => band.y + band.height * f;
        const h = (f: number) => band.height * f;
        return [
          bandShape('#FFFFFF'),
          bigNum(W * 0.02, y(0.03), W * 0.28, h(0.34), { fill: '#111111', strokeWidth: 0, fontFamily: 'Montserrat', fontWeight: 900 }),
          ln(W, W * 0.3, y(0.02), W * 0.68, h(0.36), 'Insanely Good', { fontFamily: 'Pacifico', textTransform: 'none', fill: '#D91E2E', wordCount: 2 }),
          ln(W, W * 0.02, y(0.4), W * 0.96, h(0.27), 'Thanksgiving', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#111111', wordCount: 1 }),
          ln(W, W * 0.02, y(0.69), W * 0.96, h(0.27), 'Recipes to Try', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#F07A1E', stroke: '#111111', strokeWidth: h(0.012) }),
          site(W, H, { fontFamily: 'Archivo Black', fontSize: H * 0.022, letterSpacing: 4, stroke: '#111111', strokeWidth: 3, shadow: { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0, opacity: 0 } }),
        ];
      },
    }),
    tpl({
      id: 'ctr-fp-marker-outline-photo',
      name: 'High CTR — Pink Number & Marker Caps on Photo',
      description: 'One photo with a big pink number outlined thickly in black and two lines of white marker caps outlined in black.',
      family: 6,
      categories: ['Fashion', 'Lifestyle'],
      designTypes: ['single-image', 'image-text-overlay', 'number-badge'],
      collage: { layoutId: 'single' },
      layers: ({ W, H }) => [
        bigNum(W * 0.25, H * 0.09, W * 0.5, H * 0.21, { fill: '#F7B6D2', strokeWidth: H * 0.012, fontFamily: 'Montserrat', fontWeight: 800 }),
        ln(W, W * 0.04, H * 0.31, W * 0.92, H * 0.1, 'Easy Looks', { fontFamily: 'Permanent Marker', fill: '#FFFFFF', stroke: '#111111', strokeWidth: 12, wordCount: 2 }),
        ln(W, W * 0.04, H * 0.41, W * 0.92, H * 0.1, 'For Real Life', { fontFamily: 'Permanent Marker', fill: '#FFFFFF', stroke: '#111111', strokeWidth: 12 }),
        site(W, H, { letterSpacing: 4 }),
      ],
    }),
    tpl({
      id: 'ctr-fp-pink-bar-brush',
      name: 'High CTR — Giant Number, Pink Bar, Brush Script',
      description: '2 photos above and below a cream band: a giant black number beside a black word, a pink bar with a white heavy keyword, black condensed caps and a pink brush-script last word.',
      family: 4,
      categories: ['Fashion', 'Lifestyle', 'Listicle'],
      designTypes: ['split', 'number-badge', 'script-bold'],
      collage: { layoutId: 'band-2-2', gap: 8, band: 0.48 },
      layers: ({ W, H, band }) => {
        const y = (f: number) => band.y + band.height * f;
        const h = (f: number) => band.height * f;
        return [
          bandShape('#FBF8F3'),
          bigNum(W * 0.04, y(0.02), W * 0.46, h(0.31), { fill: '#111111', strokeWidth: 0 }),
          ln(W, W * 0.5, y(0.04), W * 0.46, h(0.27), 'Chic', anton('#111111', { wordCount: 1 })),
          rect(0, y(0.35), W, h(0.2), HOT, { name: 'Keyword bar' }),
          ln(W, W * 0.03, y(0.355), W * 0.94, h(0.19), 'Brown', heavy('#FFFFFF', { wordCount: 1 })),
          ln(W, W * 0.03, y(0.58), W * 0.94, h(0.2), 'Palazzo Pants', anton('#111111', { wordCount: 2 })),
          ln(W, W * 0.03, y(0.8), W * 0.94, h(0.18), 'Outfits', { fontFamily: 'Permanent Marker', fill: HOT, italic: true }),
          site(W, H),
        ];
      },
    }),
    tpl({
      id: 'ctr-fp-glass-panel-mix',
      name: 'High CTR — See-Through Panel, Script + Serif + Outlined Caps',
      description: 'One photo with a see-through white panel: an outlined white number, a pink script, black serif caps, two big light-pink lines outlined in black, a serif closing line and the website.',
      family: 5,
      categories: ['Fashion', 'Beauty', 'Lifestyle'],
      designTypes: ['single-image', 'image-text-overlay', 'script-bold'],
      ...tall,
      collage: { layoutId: 'single' },
      layers: ({ W, H }) => {
        const pinkCaps: TP = { fontFamily: 'Montserrat', fontWeight: 900, fill: '#F8B4CF', stroke: '#111111', strokeWidth: H * 0.0035 };
        const serif: TP = { fontFamily: 'Playfair Display', fontWeight: 800, fill: '#111111' };
        return [
          rect(W * 0.02, H * 0.305, W * 0.96, H * 0.58, '#FFFFFF', { name: 'Panel', opacity: 0.55 }),
          bigNum(W * 0.3, H * 0.255, W * 0.4, H * 0.1, { fill: '#FFFFFF', strokeWidth: H * 0.005, fontFamily: 'Montserrat', fontWeight: 900 }),
          ln(W, W * 0.06, H * 0.36, W * 0.88, H * 0.085, 'So Chic', { fontFamily: 'Pacifico', textTransform: 'none', fill: HOT, wordCount: 2 }),
          ln(W, W * 0.04, H * 0.45, W * 0.92, H * 0.065, 'Date Night', { ...serif, fontWeight: 900, wordCount: 2 }),
          ln(W, W * 0.04, H * 0.52, W * 0.92, H * 0.09, 'Outfit', { ...pinkCaps, wordCount: 1 }),
          ln(W, W * 0.04, H * 0.612, W * 0.92, H * 0.09, 'Ideas', { ...pinkCaps, wordCount: 1 }),
          ln(W, W * 0.06, H * 0.712, W * 0.88, H * 0.036, "You'll Want to Recreate", { ...serif, wordCount: 4 }),
          ln(W, W * 0.06, H * 0.75, W * 0.88, H * 0.036, 'Every Look', serif),
          rect(W * 0.38, H * 0.796, W * 0.24, 3, '#111111', { name: 'Rule' }),
          footer(W, H, 'plain-dark', { x: W * 0.1, width: W * 0.8, y: H * 0.81, height: H * 0.03, fontFamily: 'Montserrat', fontWeight: 600, fontSize: H * 0.016, letterSpacing: 6, fill: '#111111' }),
        ];
      },
    }),
    tpl({
      id: 'ctr-fp-grid-red-brush',
      name: 'High CTR — 6 Photos, Giant Number + Red Brush Script',
      description: 'A 2×2 grid, a white band with a giant black number beside a red brush script with an underline swoosh and huge black condensed caps, two photos below.',
      family: 5,
      categories: ['Fashion', 'Lifestyle', 'Listicle'],
      designTypes: ['image-text-panel', 'script-bold', 'number-badge'],
      w: 736,
      h: 1472,
      collage: { layoutId: 'grid4-band-2', gap: 8 },
      layers: ({ W, H }) => [
        bigNum(W * 0.03, H * 0.53, W * 0.36, H * 0.125, { fill: '#111111', strokeWidth: 0 }),
        ln(W, W * 0.38, H * 0.525, W * 0.6, H * 0.12, 'Trendy', { fontFamily: 'Permanent Marker', textTransform: 'none', fill: '#D91E2E', italic: true, wordCount: 1 }),
        createShape({ name: 'Swoosh', role: 'decor', x: W * 0.45, y: H * 0.648, width: W * 0.45, height: H * 0.006, fill: '#D91E2E', rotation: -4, cornerRadius: 4 }),
        ln(W, W * 0.03, H * 0.66, W * 0.94, H * 0.066, 'Street Style Outfits', anton('#111111')),
      ],
    }),
    tpl({
      id: 'ctr-fp-grid-red-number',
      name: 'High CTR — 6 Photos, Giant Red Number + Script',
      description: 'A 2×2 grid, a white band with a giant red condensed number beside a black brush script, red caps and a heavy black last word, two photos below.',
      family: 5,
      categories: ['Fashion', 'Lifestyle', 'Listicle'],
      designTypes: ['image-text-panel', 'script-bold', 'number-badge'],
      w: 736,
      h: 1472,
      collage: { layoutId: 'grid4-band-2', gap: 8 },
      layers: ({ W, H }) => [
        bigNum(W * 0.02, H * 0.522, W * 0.32, H * 0.205, { fill: '#D91E2E', strokeWidth: 0, fontFamily: 'Anton', fontWeight: 400 }),
        ln(W, W * 0.34, H * 0.525, W * 0.64, H * 0.068, 'Stylish', { fontFamily: 'Pacifico', textTransform: 'none', fill: '#111111', wordCount: 1 }),
        ln(W, W * 0.34, H * 0.61, W * 0.64, H * 0.055, 'Cold Winter', anton('#D91E2E', { wordCount: 2 })),
        ln(W, W * 0.34, H * 0.667, W * 0.64, H * 0.06, 'Outfits', heavy('#111111')),
      ],
    }),
    tpl({
      ...tall,
      id: 'ctr-fp-black-boxes-left',
      name: 'High CTR — Black Boxes, White Caps, Flush Left',
      description: 'One photo with a stack of black boxes set flush left holding white condensed caps — number, keyword lines and a smaller closing line — and a black website bar.',
      family: 6,
      categories: ['Beauty', 'Fashion', 'Lifestyle'],
      designTypes: ['single-image', 'image-text-overlay'],
      collage: { layoutId: 'single' },
      layers: ({ W, H }) => {
        const box = (y: number, h: number, text: string, p: TP = {}) =>
          ln(W, W * 0.06, y, W * 0.9, h, text, {
            ...anton('#FFFFFF'), align: 'left', fontSize: h * 0.82, background: bgOn('#111111', { hug: true, paddingX: W * 0.025, paddingY: h * 0.06 }), ...p,
          });
        return [
          box(H * 0.385, H * 0.082, '+20', { wordCount: 1 }),
          box(H * 0.475, H * 0.082, 'Amazing', { wordCount: 1 }),
          box(H * 0.565, H * 0.082, 'Winter Nails', { wordCount: 2 }),
          box(H * 0.655, H * 0.082, '2026', { wordCount: 1 }),
          box(H * 0.75, H * 0.05, "You'll Be Obsessed With!", { fontSize: H * 0.042 }),
          rect(0, H * 0.952, W, H * 0.048, '#111111', { name: 'Footer bar' }),
          footer(W, H, 'plain-light', { x: 0, width: W, y: H * 0.957, height: H * 0.036, fontFamily: 'Montserrat', fontWeight: 600, fontSize: H * 0.016, letterSpacing: 6, fill: '#FFFFFF' }),
        ];
      },
    }),
    tpl({
      ...tall,
      id: 'ctr-fp-white-display-serif',
      name: 'High CTR — Big White Display Serif on Photo',
      description: 'One photo with a tall stack of big white display-serif words centred over it, softly shadowed, and the website at the bottom.',
      family: 6,
      categories: ['Home Decor', 'Lifestyle', 'Fashion'],
      designTypes: ['single-image', 'image-text-overlay'],
      collage: { layoutId: 'single' },
      layers: ({ W, H }) => {
        const soft = { enabled: true, color: '#000000', blur: 22, offsetX: 0, offsetY: 4, opacity: 0.45 };
        const serif = (p: TP = {}): TP => ({ fontFamily: 'Playfair Display', fontWeight: 600, textTransform: 'none', fill: '#FFFFFF', shadow: soft, ...p });
        return [
          ln(W, W * 0.05, H * 0.16, W * 0.9, H * 0.12, 'Small', serif({ wordCount: 1 })),
          ln(W, W * 0.03, H * 0.29, W * 0.94, H * 0.12, 'Bedroom', serif({ wordCount: 1 })),
          ln(W, W * 0.03, H * 0.42, W * 0.94, H * 0.12, 'Storage', serif({ wordCount: 1 })),
          ln(W, W * 0.05, H * 0.55, W * 0.9, H * 0.12, 'Hacks', serif()),
          site(W, H, { fontSize: H * 0.017, letterSpacing: 2 }),
        ];
      },
    }),
    tpl({
      id: 'ctr-fp-lowercase-serif-outline',
      name: 'High CTR — Lowercase Serif with Thick White Outline',
      description: 'One photo with a stack of heavy black lowercase serif words outlined thickly in white, one italic line, and a small outlined closing line.',
      family: 6,
      categories: ['Fashion', 'Beauty', 'Lifestyle'],
      designTypes: ['single-image', 'image-text-overlay'],
      w: 736,
      h: 1472,
      collage: { layoutId: 'single' },
      layers: ({ W, H }) => {
        const serif = (p: TP = {}): TP => ({ fontFamily: 'Abril Fatface', textTransform: 'lowercase', fill: '#111111', stroke: '#FFFFFF', strokeWidth: 7, ...p });
        return [
          ln(W, W * 0.05, H * 0.24, W * 0.9, H * 0.075, '10', serif({ wordCount: 1 })),
          ln(W, W * 0.05, H * 0.315, W * 0.9, H * 0.08, 'hottest', serif({ wordCount: 1 })),
          ln(W, W * 0.05, H * 0.395, W * 0.9, H * 0.08, 'winter', serif({ wordCount: 1 })),
          ln(W, W * 0.05, H * 0.475, W * 0.9, H * 0.075, '2026', serif({ fontFamily: 'Playfair Display', fontWeight: 800, italic: true, wordCount: 1 })),
          ln(W, W * 0.05, H * 0.55, W * 0.9, H * 0.08, 'fashion', serif({ wordCount: 1 })),
          ln(W, W * 0.05, H * 0.63, W * 0.9, H * 0.08, 'trends', serif({ wordCount: 1 })),
          ln(W, W * 0.1, H * 0.735, W * 0.8, H * 0.036, 'to hop on before', serif({ strokeWidth: 4, wordCount: 4 })),
          ln(W, W * 0.1, H * 0.776, W * 0.8, H * 0.036, 'everyone else', serif({ strokeWidth: 4 })),
          site(W, H, { fontSize: H * 0.019, letterSpacing: 4 }),
        ];
      },
    }),
  ];
}

/** Text straight on one photo, made readable by thick outlines, hard shadows or white boxes (all 736 × 1472). */
function photoOverlays() {
  const W = 736;
  const H = 1472;
  const base = { w: W, h: H, collage: { layoutId: 'single' } } as const;
  /** A full-width headline line on the photo. */
  const pl = (y: number, h: number, text: string, p: TP = {}) =>
    titleLine(W, y, h, text, { x: W * 0.04, width: W * 0.92, background: bgOff(), letterSpacing: 0, lineHeight: 1, fontWeight: 400, fontSize: h * 0.9, minFontSize: 18, ...p });
  const spacedSite = (fill = '#FFFFFF') =>
    footer(W, H, 'over-image', { x: 0, width: W, y: H * 0.955, height: H * 0.03, fontFamily: 'Montserrat', fontWeight: 700, fontSize: H * 0.019, letterSpacing: 10, fill });
  const boxed = (fill: string): TP => ({ fill, background: bgOn('#FFFFFF', { hug: true, paddingX: W * 0.025, paddingY: H * 0.006 }) });
  const sticker = (fill: string, ring = '#FFFFFF', width = 12): TP => ({ fill, stroke: ring, strokeWidth: width });
  const hardShadow = { enabled: true, color: '#111111', blur: 0, offsetX: 7, offsetY: 7, opacity: 1 };

  return [
    tpl({
      id: 'ctr-nails-white-band',
      name: 'High CTR — White Band, Pink Keyword, 4 Photos',
      description: '2 photos above and below a white band with three huge condensed lines: black number line, pink keyword, black closing line; spaced website on the photo.',
      family: 1,
      categories: ['Beauty', 'Hair', 'Listicle'],
      designTypes: ['split', 'hair-beauty'],
      w: W,
      h: H,
      collage: { layoutId: 'band-2-2', gap: 8, band: 0.29 },
      layers: ({ band }) => {
        const y = (f: number) => band.y + band.height * f;
        const h = (f: number) => band.height * f;
        return [
          bandShape('#FFFFFF'),
          pl(y(0.04), h(0.3), '20+ Trendy', { fontFamily: 'Anton', fill: '#111111', wordCount: 2 }),
          pl(y(0.36), h(0.28), 'Halloween Nails', { fontFamily: 'Anton', fill: '#D65A8C', wordCount: 2 }),
          pl(y(0.66), h(0.3), 'For 2026', { fontFamily: 'Anton', fill: '#111111' }),
          spacedSite(),
        ];
      },
    }),
    tpl({
      ...base,
      id: 'ctr-serif-outline-question',
      name: 'High CTR — Bold Serif with Thick White Outline',
      description: 'One photo with a black heavy serif question outlined thickly in white over the lower half: big key word, then a two-line payoff.',
      family: 6,
      categories: ['Hair', 'Beauty', 'How-To'],
      designTypes: ['single-image', 'image-text-overlay'],
      layers: () => {
        const serif = (p: TP = {}): TP => ({ fontFamily: 'Playfair Display', fontWeight: 900, textTransform: 'none', letterSpacing: -1, ...sticker('#111111', '#FFFFFF', 14), ...p });
        return [
          pl(H * 0.53, H * 0.085, 'How Much', serif({ wordCount: 2 })),
          pl(H * 0.615, H * 0.085, 'Does Balayage', serif({ wordCount: 2 })),
          pl(H * 0.7, H * 0.11, 'Cost?', serif({ wordCount: 1 })),
          pl(H * 0.815, H * 0.07, 'Price Guide and', serif({ wordCount: 3 })),
          pl(H * 0.885, H * 0.07, 'Ways to Save', serif()),
          footer(W, H, 'over-image', { y: H * 0.962, height: H * 0.028, fontSize: H * 0.014 }),
        ];
      },
    }),
    tpl({
      ...base,
      id: 'ctr-white-caps-hard-shadow',
      name: 'High CTR — Huge White Caps, Hard Shadow',
      description: 'One photo with a stack of huge white heavy caps carrying a solid black offset shadow: number, two keyword lines and a closing word.',
      family: 6,
      categories: ['Hair', 'Beauty', 'Fashion'],
      designTypes: ['single-image', 'image-text-overlay', 'number-badge'],
      layers: () => {
        const caps: TP = { fontFamily: 'Archivo Black', fill: '#FFFFFF', shadow: hardShadow };
        return [
          badge(W * 0.04, H * 0.3, H * 0.13, '18+', 'square', '#FFFFFF', '#FFFFFF', {
            x: W * 0.04, width: W * 0.92, height: H * 0.13, background: bgOff(), fontFamily: 'Archivo Black', fontSize: H * 0.12, shadow: hardShadow, lineHeight: 1,
          }),
          pl(H * 0.445, H * 0.13, 'Beige', { ...caps, wordCount: 1 }),
          pl(H * 0.59, H * 0.13, 'Blonde', { ...caps, wordCount: 1 }),
          pl(H * 0.735, H * 0.13, 'Ideas', caps),
          footer(W, H, 'over-image', { y: H * 0.955, height: H * 0.03, fontSize: H * 0.015 }),
        ];
      },
    }),
    tpl({
      ...base,
      id: 'ctr-serif-cream-overlay',
      name: 'High CTR — Elegant Serif in White & Cream',
      description: 'One photo with a classic serif headline centred over it in white and soft cream with a gentle shadow, and a spaced website.',
      family: 6,
      categories: ['Hair', 'Beauty', 'Lifestyle'],
      designTypes: ['single-image', 'image-text-overlay'],
      layers: () => {
        const soft = { enabled: true, color: '#000000', blur: 18, offsetX: 0, offsetY: 3, opacity: 0.55 };
        const serif = (fill: string, p: TP = {}): TP => ({ fontFamily: 'Libre Baskerville', fontWeight: 400, textTransform: 'none', fill, shadow: soft, ...p });
        return [
          badge(W * 0.04, H * 0.2, H * 0.1, '16', 'square', '#FFFFFF', '#FFFFFF', {
            x: W * 0.04, width: W * 0.92, height: H * 0.1, background: bgOff(), fontFamily: 'Libre Baskerville', fontWeight: 400, fontSize: H * 0.085, shadow: soft, lineHeight: 1,
          }),
          pl(H * 0.31, H * 0.095, 'Fresh Short', serif('#FFFFFF', { wordCount: 2 })),
          pl(H * 0.41, H * 0.095, 'Choppy', serif('#F6F0D8', { wordCount: 1 })),
          pl(H * 0.51, H * 0.095, 'Haircuts', serif('#F6F0D8', { wordCount: 1 })),
          pl(H * 0.61, H * 0.095, '2026', serif('#FFFFFF')),
          spacedSite(),
        ];
      },
    }),
    tpl({
      ...base,
      id: 'ctr-lowercase-sticker',
      name: 'High CTR — Lowercase Rounded Sticker Text',
      description: 'One photo with a tall stack of heavy rounded lowercase words outlined in white: black number, pink keyword lines, black payoff lines.',
      family: 6,
      categories: ['Beauty', 'Hair', 'Lifestyle'],
      designTypes: ['single-image', 'image-text-overlay'],
      layers: () => {
        const round = (fill: string, p: TP = {}): TP => ({ fontFamily: 'Montserrat', fontWeight: 800, textTransform: 'lowercase', letterSpacing: -1, ...sticker(fill, '#FFFFFF', 12), ...p });
        return [
          pl(H * 0.25, H * 0.08, '20+', round('#111111', { wordCount: 1 })),
          pl(H * 0.33, H * 0.085, 'halloween', round('#D65A8C', { wordCount: 1 })),
          pl(H * 0.415, H * 0.085, 'nails', round('#D65A8C', { wordCount: 1 })),
          pl(H * 0.5, H * 0.08, 'everyone', round('#111111', { wordCount: 1 })),
          pl(H * 0.58, H * 0.08, 'will be', round('#111111', { wordCount: 2 })),
          pl(H * 0.66, H * 0.08, 'saving', round('#111111')),
          spacedSite(),
        ];
      },
    }),
    tpl({
      id: 'ctr-grid-white-card-magenta',
      name: 'High CTR — Grid with White Card, Magenta Keyword',
      description: '2×2 photos with a white card across the middle: black condensed lead-in, a huge magenta keyword, spaced serif caps and a small closing line; magenta website bar.',
      family: 3,
      categories: ['Hair', 'Beauty', 'Fashion'],
      designTypes: ['collage-4', 'hair-beauty'],
      w: W,
      h: H,
      collage: { layoutId: 'grid-2x2', gap: 8 },
      layers: () => {
        const cx = W * 0.1;
        const cw = W * 0.8;
        const cl = (y: number, h: number, text: string, p: TP = {}) =>
          titleLine(W, y, h, text, { x: cx + W * 0.02, width: cw - W * 0.04, background: bgOff(), letterSpacing: 0, lineHeight: 1, fontWeight: 400, fontSize: h * 0.9, minFontSize: 16, ...p });
        return [
          rect(cx, H * 0.375, cw, H * 0.27, '#FFFFFF', { name: 'Card' }),
          cl(H * 0.39, H * 0.058, '22+ Classiest Ever', { fontFamily: 'Anton', fill: '#111111', wordCount: 3 }),
          cl(H * 0.452, H * 0.088, 'Jet Black', { fontFamily: 'Anton', fill: '#F0165A', wordCount: 2 }),
          cl(H * 0.545, H * 0.05, 'Hair Ideas', { fontFamily: 'Playfair Display', fontWeight: 700, letterSpacing: 6, fill: '#111111', wordCount: 2 }),
          cl(H * 0.6, H * 0.032, 'You Need to Try', { fontFamily: 'Montserrat', fontWeight: 600, letterSpacing: 1, fill: '#111111' }),
          rect(0, H * 0.958, W, H * 0.042, '#F0165A', { name: 'Footer bar' }),
          footer(W, H, 'plain-light', { x: 0, width: W, y: H * 0.961, height: H * 0.036, fontFamily: 'Montserrat', fontWeight: 600, textTransform: 'none', letterSpacing: 0, fontSize: H * 0.02, fill: '#FFFFFF' }),
        ];
      },
    }),
    tpl({
      ...base,
      id: 'ctr-four-white-boxes',
      name: 'High CTR — Four White Boxes, Boxed Website',
      description: 'One photo with four stacked white boxes in condensed bold type — black, a wide magenta keyword, black, black — and the website in its own small white box.',
      family: 6,
      categories: ['Hair', 'Beauty', 'Fashion'],
      designTypes: ['single-image', 'image-text-overlay', 'hair-beauty'],
      layers: () => {
        const cond = (fill: string, p: TP = {}): TP => ({ fontFamily: 'Anton', textTransform: 'none', letterSpacing: 1, fontSize: H * 0.062, ...boxed(fill), ...p });
        return [
          pl(H * 0.43, H * 0.082, 'Trendiest', cond('#111111', { wordCount: 1 })),
          pl(H * 0.522, H * 0.082, 'Chocolate Brown', cond('#F0165A', { wordCount: 2 })),
          pl(H * 0.614, H * 0.082, 'Hair for', cond('#111111', { wordCount: 2 })),
          pl(H * 0.706, H * 0.082, 'Women Over 40', cond('#111111')),
          footer(W, H, 'plain-dark', {
            x: W * 0.3, width: W * 0.4, y: H * 0.95, height: H * 0.03, fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'none', letterSpacing: 0, fontSize: H * 0.015,
            fill: '#111111', background: bgOn('#FFFFFF', { hug: true, paddingX: 14, paddingY: 6 }),
          }),
        ];
      },
    }),
  ];
}
