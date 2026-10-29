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
].map((t) => ({ ...t, highCtr: true }));
