/**
 * Pin layouts inspired by popular blog-Pin template packs: colour strips with
 * number boxes, centre bands with circle badges and sticker script, text-first
 * panels over a photo, mosaics with a centre card, starbursts, medallions,
 * polaroids, staggered labels and more.
 *
 * These are original PinCraft designs: the layout ideas are recreated with
 * PinCraft's own fonts, colours, spacing and example text — no artwork or
 * copy from any pack. Coordinates are fractions of the canvas (or of the
 * centre band) so each design reads like its sketch.
 */
import { createShape } from '../model/factory';
import type { Layer, Rect, TextLayer } from '../model/types';
import { accent, badge, bandShape, bgOff, bgOn, footer, title, titleLine, tpl } from './kit';

type TP = Partial<TextLayer>;
type Shape = Parameters<typeof createShape>[0];

// ---------------------------------------------------------------- helpers

const rect = (x: number, y: number, w: number, h: number, fill: string, p: Shape = {}): Layer =>
  createShape({ name: 'Shape', role: 'decor', x, y, width: w, height: h, fill, ...p });
const oval = (x: number, y: number, w: number, h: number, fill: string, p: Shape = {}): Layer =>
  createShape({ name: 'Circle', role: 'decor', shape: 'ellipse', x, y, width: w, height: h, fill, ...p });

/** A rectangle rotated about its centre (layers rotate about their top-left corner). */
function turned(cx: number, cy: number, w: number, h: number, deg: number, fill: string, p: Shape = {}): Layer {
  const a = (deg * Math.PI) / 180;
  const ox = (w / 2) * Math.cos(a) - (h / 2) * Math.sin(a);
  const oy = (w / 2) * Math.sin(a) + (h / 2) * Math.cos(a);
  return rect(cx - ox, cy - oy, w, h, fill, { rotation: deg, ...p });
}

/** x, y, w, h of a box of size w×h centred on (cx, cy) once rotated by deg about its top-left corner. */
function turnedBox(cx: number, cy: number, w: number, h: number, deg: number): [number, number, number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx - ((w / 2) * Math.cos(a) - (h / 2) * Math.sin(a)), cy - ((w / 2) * Math.sin(a) + (h / 2) * Math.cos(a)), w, h];
}

/** Headline line (no box unless given). */
const L = (W: number, y: number, h: number, text: string, p: TP = {}) =>
  titleLine(W, y, h, text, { background: bgOff(), letterSpacing: 0, fontWeight: 400, lineHeight: 0.9, fontSize: h * 0.92, ...p });
/** Supporting line (filled from the rest of the article title). */
const S = (x: number, y: number, w: number, h: number, text: string, p: TP = {}) =>
  titleLine(1000, y, h, text, { name: 'Subtitle line', role: 'subtitle', x, width: w, background: bgOff(), letterSpacing: 0, textTransform: 'none', fontWeight: 400, lineHeight: 1, fontSize: h * 0.8, ...p });
/** Plain big number (no badge shape). */
const N = (x: number, y: number, w: number, h: number, text: string, p: TP = {}) =>
  badge(x, y, h, text, 'square', '#FFFFFF', '#111111', { x, width: w, height: h, background: bgOff(), lineHeight: 0.85, fontSize: h * 0.95, ...p });

const outline = (color: string, width: number): TP => ({ stroke: color, strokeWidth: width });
const hard = (color: string, dx: number, dy: number): TextLayer['shadow'] => ({ enabled: true, color, blur: 0, offsetX: dx, offsetY: dy, opacity: 1 });

/** Sticker script: black letters with a thick white outline, overlapping the photo edge. */
const sticker = (p: TP = {}): TP => ({ fontFamily: 'Pacifico', fill: '#111111', textTransform: 'none', ...outline('#FFFFFF', 12), ...p });
/** Full-width website bar along the bottom. */
const bar = (W: number, H: number, color: string, text: string, p: TP = {}): Layer[] => [
  rect(0, H * 0.955, W, H * 0.045, color, { name: 'Footer bar' }),
  footer(W, H, 'plain-light', { x: 0, width: W, y: H * 0.958, height: H * 0.04, fill: text, fontSize: H * 0.017, letterSpacing: 2, ...p }),
];
/** Website straight on the photo, near the bottom. */
const web = (W: number, H: number, p: TP = {}) => footer(W, H, 'over-image', { y: H * 0.95, height: H * 0.04, fontSize: H * 0.017, letterSpacing: 2, ...p });

/** Coordinates inside the centre band. */
const inBand = (b: Rect) => ({ y: (f: number) => b.y + b.height * f, h: (f: number) => b.height * f });

const BLOG = { w: 736, h: 1472 };
const LIFESTYLE = ['Lifestyle', 'Listicle', 'Custom Blog Pin'] as const;

// ---------------------------------------------------------------- 2:3 designs (1000 × 1500)

const TWO_THIRDS = [
  tpl({
    id: 'cv-brush-circle',
    name: 'Big White Circle on Photo',
    description: 'One photo with a large white circle and a soft ring; condensed caps, a coloured keyword with a hard shadow and a script line.',
    family: 6,
    categories: ['Fashion', 'Lifestyle', 'Beauty'],
    designTypes: ['single-image', 'image-text-overlay'],
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      oval(-W * 0.12, H * 0.38, W * 1.24, H * 0.58, '#FFFFFF'),
      oval(-W * 0.15, H * 0.365, W * 1.3, H * 0.61, 'transparent', { stroke: '#FFFFFF', strokeWidth: 5, opacity: 0.85 }),
      L(W, H * 0.47, H * 0.075, 'How to Style', { fontFamily: 'Oswald', fontWeight: 700, fill: '#2B2B2B', wordCount: 3 }),
      L(W, H * 0.548, H * 0.09, 'Edgy Outfits', { fontFamily: 'Oswald', fontWeight: 700, fill: '#E07B45', shadow: hard('#2B2B2B', 4, 4), wordCount: 2 }),
      L(W, H * 0.645, H * 0.045, 'and instantly', { x: W * 0.2, width: W * 0.6, textTransform: 'none', lineHeight: 1, wordCount: 2, fontFamily: 'Sacramento', fill: '#2B2B2B', fontSize: H * 0.045 }),
      L(W, H * 0.69, H * 0.075, 'Look Better', { fontFamily: 'Oswald', fontWeight: 700, fill: '#2B2B2B' }),
      ...bar(W, H, '#111111', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-grid-card-pill',
    name: 'Grid + Centre Card, Outlined Word',
    description: '2×2 photos, a white rounded card with a cream circle number, a big outlined keyword and a soft pill subtitle.',
    family: 3,
    categories: ['Lifestyle', 'Fashion', 'Listicle'],
    designTypes: ['collage-4', 'number-badge'],
    collage: { layoutId: 'grid-2x2', gap: 10 },
    layers: ({ W, H }) => [
      rect(W * 0.13, H * 0.42, W * 0.74, H * 0.23, '#FFFFFF', { cornerRadius: 26 }),
      badge(W / 2 - W * 0.1, H * 0.31, W * 0.2, '16', 'circle', '#F1E4D1', '#2B2B2B', { fontFamily: 'Montserrat', fontWeight: 800 }),
      L(W, H * 0.485, H * 0.095, 'Poses', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#FFFFFF', ...outline('#111111', 9), x: W * 0.15, width: W * 0.7, wordCount: 1 }),
      L(W, H * 0.59, H * 0.042, 'for pictures', { x: W * 0.25, width: W * 0.5, textTransform: 'none', lineHeight: 1, fontSize: (H * 0.042) * 0.8, fontFamily: 'Poppins', fontWeight: 500, fill: '#2B2B2B', background: bgOn('#EAD9C4', { hug: true, paddingX: 22, paddingY: 6 }) }),
      ...bar(W, H, '#111111', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-textfirst-black',
    name: 'Text First, Huge Black Words',
    description: 'White top with three huge black lines and a small aside, photo underneath, black website bar.',
    family: 7,
    categories: [...LIFESTYLE],
    designTypes: ['image-text-panel'],
    collage: { layoutId: 'single', region: { x: 0, y: 0.52, width: 1, height: 0.435 } },
    layers: ({ W, H }) => [
      L(W, H * 0.04, H * 0.13, 'Reddit', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#111111', wordCount: 1 }),
      L(W, H * 0.18, H * 0.13, 'ChatGPT', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#111111', wordCount: 1 }),
      L(W, H * 0.32, H * 0.13, '= $500', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#111111' }),
      S(W * 0.55, H * 0.455, W * 0.38, H * 0.04, 'See how?', { fontFamily: 'Montserrat', fontWeight: 800, textTransform: 'uppercase', fill: '#111111', align: 'right' }),
      ...bar(W, H, '#111111', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-panel-chevron',
    name: 'Colour Panel with Point & Tab Number',
    description: 'Brick-red top panel ending in a point, a white tab with the number, cream keyword with a shadow and a script word; photo below.',
    family: 7,
    categories: ['Beauty', 'Hair', 'Lifestyle'],
    designTypes: ['image-text-panel', 'number-badge', 'script-bold'],
    collage: { layoutId: 'single', region: { x: 0, y: 0.5, width: 1, height: 0.455 } },
    layers: ({ W, H }) => [
      rect(0, 0, W, H * 0.5, '#B9473F'),
      turned(W / 2, H * 0.5, W * 0.12, W * 0.12, 45, '#B9473F'),
      rect(W / 2 - W * 0.085, H * 0.025, W * 0.17, H * 0.115, '#FFFFFF', { cornerRadius: W * 0.085 }),
      N(W / 2 - W * 0.085, H * 0.035, W * 0.17, H * 0.1, '6', { fontFamily: 'Montserrat', fontWeight: 900 }),
      L(W, H * 0.16, H * 0.06, 'Uncommon', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#FFFFFF', wordCount: 1 }),
      L(W, H * 0.225, H * 0.1, 'Beauty Tips', { fontFamily: 'Archivo Black', fill: '#F6D36B', shadow: hard('#5A1E1A', 4, 4), wordCount: 2 }),
      L(W, H * 0.335, H * 0.05, 'for glowing', { x: W * 0.15, width: W * 0.7, textTransform: 'none', lineHeight: 1, fontSize: (H * 0.05) * 0.8, wordCount: 2, fontFamily: 'Poppins', fontWeight: 600, fill: '#FFFFFF' }),
      L(W, H * 0.385, H * 0.085, 'Skin', { x: W * 0.15, width: W * 0.7, textTransform: 'none', lineHeight: 1, fontSize: (H * 0.085) * 0.8, fontFamily: 'Pacifico', fill: '#F6D36B' }),
      turned(W * 0.27, H * 0.42, W * 0.06, 5, -25, '#F6D36B', { cornerRadius: 3 }),
      turned(W * 0.73, H * 0.42, W * 0.06, 5, 25, '#F6D36B', { cornerRadius: 3 }),
      ...bar(W, H, '#111111', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-strips-cream-green',
    name: 'Colour Strips — Cream & Green',
    description: '2 top + 2 bottom photos, a centre of three strips: cream with a brown number box, dark green with white caps, cream again.',
    family: 1,
    categories: ['Hair', 'Beauty', 'Food / Recipe', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    collage: { layoutId: 'band-2-2', gap: 8, band: 0.27 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#F6E9C9'),
        rect(0, b.y(0.36), W, b.h(0.3), '#2F5D35'),
        badge(W * 0.06, b.y(0.05), b.h(0.27), '4', 'rounded', '#5A2E1E', '#FFFFFF', { fontFamily: 'Archivo Black' }),
        L(W, b.y(0.05), b.h(0.28), 'Ways to Use', { fontFamily: 'Oswald', fontWeight: 700, fill: '#5A2E1E', x: W * 0.2, width: W * 0.74, wordCount: 3 }),
        L(W, b.y(0.37), b.h(0.28), 'Rosemary Oil For', { fontFamily: 'Oswald', fontWeight: 700, fill: '#FFFFFF', x: W * 0.04, width: W * 0.92, wordCount: 3 }),
        L(W, b.y(0.69), b.h(0.28), 'Hair Growth', { fontFamily: 'Oswald', fontWeight: 700, fill: '#5A2E1E' }),
        ...bar(W, H, '#111111', '#FFFFFF'),
      ];
    },
  }),
  tpl({
    id: 'cv-strips-orange-outline',
    name: 'Colour Strips — Orange, Outlined Keyword',
    description: 'Photo, then cream/orange/cream strips: orange number box, white caps on orange, outlined orange keyword; photo below.',
    family: 7,
    categories: ['Beauty', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    collage: { layoutId: 'band-1-1', gap: 0, band: 0.27 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#F7E7D5'),
        rect(0, b.y(0.36), W, b.h(0.28), '#E8913A'),
        badge(W * 0.12, b.y(0.06), b.h(0.26), '5', 'rounded', '#E8913A', '#FFFFFF', { fontFamily: 'Archivo Black' }),
        L(W, b.y(0.05), b.h(0.28), 'Powerful', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#3A2A20', x: W * 0.24, width: W * 0.66, wordCount: 1 }),
        L(W, b.y(0.37), b.h(0.26), 'Exercises to Tone', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#FFFFFF', wordCount: 3 }),
        L(W, b.y(0.67), b.h(0.29), 'Flabby Skin', { fontFamily: 'Archivo Black', fill: '#E8913A', ...outline('#3A2A20', 5) }),
        ...bar(W, H, '#111111', '#FFFFFF'),
      ];
    },
  }),
  tpl({
    id: 'cv-strips-coral-pill',
    name: 'Coral Band with Pill Number',
    description: 'Photo, coral band framed by white rules with a coral pill number on top, white caps and a lighter middle line; photo below.',
    family: 7,
    categories: ['Beauty', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    collage: { layoutId: 'band-1-1', gap: 0, band: 0.3 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#E25C6A'),
        rect(0, b.y(0.03), W, 6, '#FFFFFF'),
        rect(0, b.y(0.96), W, 6, '#FFFFFF'),
        badge(W / 2 - b.h(0.24), b.y(-0.16), b.h(0.3), '10', 'pill', '#E25C6A', '#FFFFFF', { fontFamily: 'Montserrat', fontWeight: 800, background: bgOn('#E25C6A', { hug: false, shape: 'pill', paddingX: 10, paddingY: 4, borderWidth: 6, borderColor: '#FFFFFF' }) }),
        L(W, b.y(0.17), b.h(0.27), 'Easy Skin Care Tips', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#FFFFFF', x: W * 0.04, width: W * 0.92, wordCount: 4 }),
        L(W, b.y(0.46), b.h(0.18), 'To Keep Looking', { x: W * 0.1, width: W * 0.8, textTransform: 'none', lineHeight: 1, fontSize: (b.h(0.18)) * 0.8, wordCount: 3, fontFamily: 'Poppins', fontWeight: 600, fill: '#FFFFFF' }),
        L(W, b.y(0.66), b.h(0.27), 'Young After 25', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#FFFFFF' }),
        ...bar(W, H, '#111111', '#FFFFFF'),
      ];
    },
  }),
  tpl({
    id: 'cv-strips-yellow-brown',
    name: 'Yellow Band, Brown Pill Line',
    description: '2 top + 2 bottom photos, a soft yellow band: brown number box + condensed caps, a brown pill with white caps, brown caps below.',
    family: 1,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    collage: { layoutId: 'band-2-2', gap: 8, band: 0.28 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#FCEB8C'),
        rect(W * 0.07, b.y(0.37), W * 0.86, b.h(0.27), '#5A3A28', { cornerRadius: b.h(0.06) }),
        badge(W * 0.07, b.y(0.06), b.h(0.26), '7', 'rounded', '#5A3A28', '#FFFFFF', { fontFamily: 'Archivo Black' }),
        L(W, b.y(0.05), b.h(0.28), 'Easy Hair Hacks', { fontFamily: 'Oswald', fontWeight: 700, fill: '#5A3A28', x: W * 0.2, width: W * 0.74, wordCount: 3 }),
        L(W, b.y(0.39), b.h(0.23), 'To Make You Look', { fontFamily: 'Oswald', fontWeight: 700, fill: '#FFFFFF', x: W * 0.1, width: W * 0.8, wordCount: 4 }),
        L(W, b.y(0.68), b.h(0.28), 'Years Younger', { fontFamily: 'Oswald', fontWeight: 700, fill: '#5A3A28' }),
        ...bar(W, H, '#111111', '#FFFFFF'),
      ];
    },
  }),
  tpl({
    id: 'cv-band-mixed-sizes',
    name: 'White Band, Mixed Big & Small Words',
    description: '2 top + 2 bottom photos, white band: huge number beside a light word, then huge / small / huge black lines.',
    family: 1,
    categories: ['Food / Recipe', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'listicle'],
    collage: { layoutId: 'band-2-2', gap: 8, band: 0.36 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#FFFFFF'),
        N(W * 0.06, b.y(0.03), W * 0.28, b.h(0.27), '18', { fontFamily: 'Montserrat', fontWeight: 900 }),
        L(W, b.y(0.07), b.h(0.2), 'Cheapest', { fontFamily: 'Montserrat', fontWeight: 400, fill: '#111111', x: W * 0.36, width: W * 0.58, align: 'left', wordCount: 1 }),
        L(W, b.y(0.31), b.h(0.26), 'Foods', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#111111', wordCount: 1 }),
        L(W, b.y(0.58), b.h(0.12), 'to Buy When You’re', { fontFamily: 'Montserrat', fontWeight: 600, fill: '#111111' }),
        L(W, b.y(0.72), b.h(0.25), 'Broke', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#111111', wordCount: 1 }),
        ...bar(W, H, '#111111', '#FFFFFF'),
      ];
    },
  }),
  tpl({
    id: 'cv-beige-panel-minimal',
    name: 'Minimal Beige Band',
    description: 'Photo, a calm beige band with a two-line rounded sans headline, photo below — understated and clean.',
    family: 7,
    categories: ['Relationship', 'Lifestyle', 'Quote'],
    designTypes: ['split', 'image-text-panel'],
    collage: { layoutId: 'band-1-1', gap: 0, band: 0.3 },
    layers: ({ W, H, band }) => [
      bandShape('#E9DCD2'),
      title(W * 0.08, band.y + band.height * 0.1, W * 0.84, band.height * 0.8, 'Making New Friends in Midlife', {
        fontFamily: 'Poppins', fontWeight: 700, textTransform: 'none', fill: '#111111', fontSize: band.height * 0.26, lineHeight: 1.15,
      }),
      ...bar(W, H, '#111111', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-textfirst-blue-strip',
    name: 'Blue Text Panel, Red Money Strip',
    description: 'Sky-blue top, outlined number, huge black words left-aligned, a red full-width strip for the payoff; photo below.',
    family: 7,
    categories: [...LIFESTYLE],
    designTypes: ['image-text-panel', 'number-badge'],
    bg: '#9CC3E3',
    collage: { layoutId: 'single', region: { x: 0, y: 0.58, width: 1, height: 0.375 } },
    layers: ({ W, H }) => [
      N(W * 0.06, H * 0.03, W * 0.3, H * 0.1, '39', { fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', ...outline('#111111', 10), align: 'left' }),
      L(W, H * 0.135, H * 0.1, 'Side', { fontFamily: 'Archivo Black', fill: '#111111', x: W * 0.06, width: W * 0.88, align: 'left', wordCount: 1 }),
      L(W, H * 0.235, H * 0.1, 'Jobs', { fontFamily: 'Archivo Black', fill: '#111111', x: W * 0.06, width: W * 0.88, align: 'left', wordCount: 1 }),
      L(W, H * 0.345, H * 0.045, 'to make up to', { x: W * 0.06, width: W * 0.7, textTransform: 'none', lineHeight: 1, fontSize: (H * 0.045) * 0.8, wordCount: 4, fontFamily: 'Poppins', fontWeight: 700, fill: '#FFFFFF', align: 'left' }),
      rect(0, H * 0.4, W, H * 0.075, '#E2452F'),
      L(W, H * 0.405, H * 0.065, '$20/hr', { x: W * 0.06, width: W * 0.88, lineHeight: 1, fontSize: (H * 0.065) * 0.8, fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', textTransform: 'uppercase' }),
      ...bar(W, H, '#111111', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-textfirst-distressed',
    name: 'Text First, Distressed Keyword',
    description: 'White top: huge black word, small line, a big olive distressed keyword, small line and a marker-pen payoff; photo below.',
    family: 7,
    categories: ['How-To', ...LIFESTYLE],
    designTypes: ['image-text-panel'],
    collage: { layoutId: 'single', region: { x: 0, y: 0.55, width: 1, height: 0.405 } },
    layers: ({ W, H }) => [
      L(W, H * 0.03, H * 0.11, 'How', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#111111', wordCount: 1 }),
      L(W, H * 0.15, H * 0.06, 'to Start a', { fontFamily: 'Poppins', fontWeight: 700, fill: '#111111', textTransform: 'none', wordCount: 3 }),
      L(W, H * 0.215, H * 0.13, 'Blog', { fontFamily: 'Rubik Distressed', fill: '#5E6B34', wordCount: 1 }),
      L(W, H * 0.355, H * 0.06, 'That Makes', { fontFamily: 'Poppins', fontWeight: 700, fill: '#111111', textTransform: 'none', wordCount: 2 }),
      L(W, H * 0.425, H * 0.08, '$4000 Monthly', { fontFamily: 'Permanent Marker', fill: '#111111' }),
      ...bar(W, H, '#111111', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-band-black-bold',
    name: 'White Band, Bold Black Caps',
    description: '2 top + 2 bottom photos, a white band with three bold black caps lines and a letter-spaced line underneath.',
    family: 1,
    categories: ['Food / Recipe', 'Home Decor', 'Listicle'],
    designTypes: ['split', 'listicle'],
    collage: { layoutId: 'band-2-2', gap: 8, band: 0.3 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#FFFFFF'),
        L(W, b.y(0.05), b.h(0.24), '20 Delicious', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#111111', wordCount: 2 }),
        L(W, b.y(0.29), b.h(0.24), 'Grab & Go', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#111111', wordCount: 2 }),
        L(W, b.y(0.53), b.h(0.24), 'Breakfast Ideas', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#111111', wordCount: 2 }),
        L(W, b.y(0.81), b.h(0.13), 'For the most important meal', { x: W * 0.08, width: W * 0.84, lineHeight: 1, fontSize: (b.h(0.13)) * 0.8, fontFamily: 'Montserrat', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 3, fill: '#111111' }),
        ...bar(W, H, '#111111', '#FFFFFF'),
      ];
    },
  }),
  tpl({
    id: 'cv-torn-edge-script',
    name: 'Script + Green Caps, Torn Edge',
    description: 'Light top with an orange number and a script word, green caps, a script line, then a torn green edge into the photo.',
    family: 5,
    categories: ['Lifestyle', 'Relationship', 'Listicle'],
    designTypes: ['image-text-panel', 'script-bold'],
    bg: '#F2F2F0',
    collage: { layoutId: 'single', region: { x: 0, y: 0.5, width: 1, height: 0.455 } },
    layers: ({ W, H }) => {
      const teeth = [12, 20, 8, 16, 24, 10, 18, 6, 14, 22, 9, 17, 25, 11, 19, 7, 15, 23, 10, 18];
      return [
        ...teeth.map((t, i) => rect((i * W) / teeth.length, H * 0.5 - t, W / teeth.length + 1, t + 2, '#5E9E6E')),
        rect(0, H * 0.497, W, H * 0.012, '#5E9E6E'),
        N(W * 0.06, H * 0.03, W * 0.3, H * 0.13, '15', { fontFamily: 'Archivo Black', fill: '#F39A4A' }),
        L(W, H * 0.045, H * 0.1, 'Social', { fontFamily: 'Pacifico', fill: '#111111', textTransform: 'none', x: W * 0.38, width: W * 0.56, align: 'left', wordCount: 1 }),
        L(W, H * 0.17, H * 0.07, 'Hobbies to', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#5E9E6E', wordCount: 2 }),
        L(W, H * 0.245, H * 0.1, 'Meet People', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#5E9E6E', wordCount: 2 }),
        L(W, H * 0.36, H * 0.07, 'and make connections', { x: W * 0.08, width: W * 0.84, textTransform: 'none', lineHeight: 1, fontSize: (H * 0.07) * 0.8, fontFamily: 'Sacramento', fill: '#111111' }),
        ...bar(W, H, '#111111', '#FFFFFF'),
      ];
    },
  }),
  tpl({
    id: 'cv-pink-outline-number',
    name: 'Outlined Pink Number + Highlight',
    description: 'Photo, white band: a big outlined pink number beside bold black caps with a pink highlight stroke, spaced line below; photo.',
    family: 4,
    categories: ['Beauty', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    collage: { layoutId: 'band-1-1', gap: 0, band: 0.28 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#FFFFFF'),
        N(W * 0.04, b.y(0.06), W * 0.3, b.h(0.6), '15', { fontFamily: 'Abril Fatface', fill: '#F4B6C9', ...outline('#111111', 8) }),
        rect(W * 0.36, b.y(0.56), W * 0.58, b.h(0.09), '#F4B6C9'),
        L(W, b.y(0.1), b.h(0.27), 'At Home', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#111111', x: W * 0.36, width: W * 0.6, align: 'left', wordCount: 2 }),
        L(W, b.y(0.38), b.h(0.27), 'Spa Day Tips', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#111111', x: W * 0.36, width: W * 0.6, align: 'left', wordCount: 3 }),
        L(W, b.y(0.76), b.h(0.16), 'For a relaxing experience', { x: W * 0.06, width: W * 0.88, lineHeight: 1, fontSize: (b.h(0.16)) * 0.8, fontFamily: 'Montserrat', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 3, fill: '#111111' }),
        ...bar(W, H, '#111111', '#FFFFFF'),
      ];
    },
  }),
  tpl({
    id: 'cv-textfirst-tag',
    name: 'Text First, Orange Price Tag',
    description: 'White top with an outlined number, a light word, huge black stacked words and a tilted orange tag; photo below.',
    family: 7,
    categories: [...LIFESTYLE],
    designTypes: ['image-text-panel', 'number-badge'],
    collage: { layoutId: 'single', region: { x: 0, y: 0.56, width: 1, height: 0.395 } },
    layers: ({ W, H }) => [
      N(W * 0.06, H * 0.025, W * 0.28, H * 0.1, '30', { fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', ...outline('#111111', 9), align: 'left' }),
      L(W, H * 0.04, H * 0.07, 'Legit', { fontFamily: 'Poppins', fontWeight: 400, fill: '#111111', textTransform: 'none', x: W * 0.36, width: W * 0.58, align: 'left', wordCount: 1 }),
      L(W, H * 0.13, H * 0.11, 'Data', { fontFamily: 'Archivo Black', fill: '#111111', x: W * 0.06, width: W * 0.88, align: 'left', wordCount: 1 }),
      L(W, H * 0.24, H * 0.11, 'Entry', { fontFamily: 'Archivo Black', fill: '#111111', x: W * 0.06, width: W * 0.88, align: 'left', wordCount: 1 }),
      L(W, H * 0.35, H * 0.11, 'Jobs', { fontFamily: 'Archivo Black', fill: '#111111', x: W * 0.06, width: W * 0.88, align: 'left', wordCount: 1 }),
      L(W, H * 0.47, H * 0.045, 'from home', { x: W * 0.06, width: W * 0.4, textTransform: 'none', lineHeight: 1, fontSize: (H * 0.045) * 0.8, wordCount: 2, fontFamily: 'Poppins', fill: '#111111', align: 'left' }),
      L(W, H * 0.475, H * 0.06, '$3000/mo', { x: W * 0.56, width: W * 0.38, lineHeight: 1, fontSize: (H * 0.06) * 0.8, fontFamily: 'Montserrat', fontWeight: 800, fill: '#FFFFFF', textTransform: 'uppercase', rotation: -3, background: bgOn('#FF5A1F', { hug: true, paddingX: 18, paddingY: 6 }) }),
      ...bar(W, H, '#111111', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-sage-panel-sticker',
    name: 'Sage Panel, Sticker Keyword, Orange Strip',
    description: 'Sage top panel with white caps, a big orange outlined keyword with a hard shadow and an orange strip; photo below.',
    family: 7,
    categories: ['Lifestyle', 'Beauty', 'How-To'],
    designTypes: ['image-text-panel'],
    collage: { layoutId: 'single', region: { x: 0, y: 0.38, width: 1, height: 0.575 } },
    layers: ({ W, H }) => [
      rect(0, 0, W, H * 0.38, '#7FA99B'),
      L(W, H * 0.03, H * 0.06, 'A Simple', { fontFamily: 'Oswald', fontWeight: 700, fill: '#FFFFFF', wordCount: 2 }),
      L(W, H * 0.09, H * 0.06, 'Guide to Using', { fontFamily: 'Oswald', fontWeight: 700, fill: '#FFFFFF', wordCount: 3 }),
      L(W, H * 0.16, H * 0.11, 'Rosemary', { fontFamily: 'Oswald', fontWeight: 700, fill: '#F28C4B', ...outline('#111111', 6), shadow: hard('#111111', 5, 5), wordCount: 1 }),
      rect(0, H * 0.29, W, H * 0.07, '#F28C4B'),
      L(W, H * 0.295, H * 0.06, 'for healthy hair', { x: W * 0.05, width: W * 0.9, lineHeight: 1, fontSize: (H * 0.06) * 0.8, fontFamily: 'Oswald', fontWeight: 700, fill: '#FFFFFF', textTransform: 'uppercase' }),
      ...bar(W, H, '#111111', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-cloud-edge',
    name: 'Cloud Edge into Photo',
    description: 'White top with a big outlined orange number and light caps, a two-line subtitle, and a scalloped cloud edge into the photo.',
    family: 7,
    categories: ['Home Decor', 'Fall Decor', 'Lifestyle'],
    designTypes: ['image-text-panel', 'number-badge'],
    collage: { layoutId: 'single', region: { x: 0, y: 0.47, width: 1, height: 0.485 } },
    layers: ({ W, H }) => [
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => oval(i * W * 0.17 - W * 0.1, H * 0.44, W * 0.27, H * 0.1, '#FFFFFF')),
      N(W * 0.04, H * 0.02, W * 0.3, H * 0.22, '8', { fontFamily: 'Pacifico', fill: '#F28C5E', ...outline('#111111', 12) }),
      L(W, H * 0.05, H * 0.07, 'Less Toxic', { fontFamily: 'Josefin Sans', fontWeight: 400, fill: '#111111', x: W * 0.36, width: W * 0.6, align: 'left', wordCount: 2 }),
      L(W, H * 0.12, H * 0.07, 'Candles', { fontFamily: 'Josefin Sans', fontWeight: 400, fill: '#111111', x: W * 0.36, width: W * 0.6, align: 'left', wordCount: 1 }),
      L(W, H * 0.27, H * 0.06, 'to Make Your Home', { x: W * 0.08, width: W * 0.84, textTransform: 'none', lineHeight: 1, fontSize: (H * 0.06) * 0.8, wordCount: 4, fontFamily: 'Poppins', fontWeight: 600, fill: '#111111' }),
      L(W, H * 0.335, H * 0.06, 'Smell Like Fall', { x: W * 0.08, width: W * 0.84, textTransform: 'none', lineHeight: 1, fontSize: (H * 0.06) * 0.8, fontFamily: 'Poppins', fontWeight: 600, fill: '#111111' }),
      ...bar(W, H, '#111111', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-strips-beige-green-plain',
    name: 'Colour Strips — Beige & Green, No Number',
    description: '2 photos on top, one wide photo below; three strips between them: brown caps on beige, white caps on green, brown caps on beige.',
    family: 1,
    categories: ['Beauty', 'How-To', 'Lifestyle'],
    designTypes: ['split'],
    collage: { layoutId: 'band-2-1', gap: 8, band: 0.27 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#F4D6B0'),
        rect(0, b.y(0.35), W, b.h(0.3), '#5E8A2E'),
        L(W, b.y(0.05), b.h(0.27), 'What Happens When', { fontFamily: 'Archivo Black', fill: '#4A2A1A', wordCount: 3 }),
        L(W, b.y(0.37), b.h(0.26), 'When You Use Aloe Vera', { fontFamily: 'Archivo Black', fill: '#FFFFFF', wordCount: 5 }),
        L(W, b.y(0.69), b.h(0.27), 'On Your Face', { fontFamily: 'Archivo Black', fill: '#4A2A1A' }),
        ...bar(W, H, '#111111', '#FFFFFF'),
      ];
    },
  }),
  tpl({
    id: 'cv-strips-cream-brown-number',
    name: 'Colour Strips — Cream & Brown, Orange Number',
    description: '2 photos on top, one wide photo below; cream strips with an orange number tile and orange keyword, a brown strip with white caps.',
    family: 1,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    collage: { layoutId: 'band-2-1', gap: 8, band: 0.27 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#FCF1D8'),
        rect(0, b.y(0.36), W, b.h(0.29), '#5A2E1E'),
        badge(W * 0.13, b.y(0.04), b.h(0.28), '52', 'rounded', '#E8913A', '#FFFFFF', { fontFamily: 'Archivo Black', x: W * 0.13, width: W * 0.17 }),
        L(W, b.y(0.04), b.h(0.29), 'Short', { fontFamily: 'Archivo Black', fill: '#E8913A', x: W * 0.33, width: W * 0.55, align: 'left', wordCount: 1 }),
        L(W, b.y(0.38), b.h(0.25), 'Celebrity Hairstyles For', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#FFFFFF', wordCount: 3 }),
        L(W, b.y(0.68), b.h(0.29), 'Style Inspiration', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#E8913A' }),
        ...bar(W, H, '#111111', '#FFFFFF'),
      ];
    },
  }),
];

// ---------------------------------------------------------------- 1:2 designs (736 × 1472)

const BAND_PP = { layoutId: 'band-2-2', gap: 6 } as const;

const HALF = [
  tpl({
    id: 'cv-pp-white-band-spaced',
    name: 'Circle Number + Sticker Script, Spaced Caps',
    description: '2 top + 2 bottom photos, a white circle number and an outlined script word on the photos, spaced amber caps and black condensed caps.',
    family: 5,
    categories: ['Lifestyle', 'Home Decor', 'Listicle'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.26 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#F7F7F5'),
        badge(W * 0.09, b.y(-0.62), b.h(0.74), '20', 'circle', '#FFFFFF', '#111111', { fontFamily: 'Anton' }),
        accent(W * 0.44, b.y(-0.5), W * 0.52, b.h(0.5), 'Cute', sticker()),
        L(W, b.y(0.1), b.h(0.4), 'Baby Boy', { fontFamily: 'Bebas Neue', fill: '#F6B04B', letterSpacing: 28, ...outline('#111111', 6), wordCount: 2 }),
        L(W, b.y(0.54), b.h(0.42), 'Gift Ideas', { fontFamily: 'Bebas Neue', fill: '#111111', letterSpacing: 2 }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-pp-orange-band-black-badge',
    name: 'Orange Band, Black Circle Number',
    description: '2 top + 2 bottom photos, black circle number and a white outlined script word, orange band with white and black condensed caps.',
    family: 5,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.26 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#F6B04B'),
        badge(W * 0.02, b.y(-0.6), b.h(0.8), '11', 'circle', '#111111', '#FFFFFF', { fontFamily: 'Abril Fatface' }),
        accent(W * 0.36, b.y(-0.52), W * 0.62, b.h(0.5), 'Creative', { fontFamily: 'Pacifico', fill: '#111111', textTransform: 'none', ...outline('#FFFFFF', 12) }),
        L(W, b.y(0.08), b.h(0.42), 'Changing Table', { fontFamily: 'Bebas Neue', fill: '#FFFFFF', wordCount: 2 }),
        L(W, b.y(0.52), b.h(0.44), 'Storage Ideas', { fontFamily: 'Bebas Neue', fill: '#111111' }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-pp-rust-sticker',
    name: 'Rust Band, Sticker Caps',
    description: '2 top + 2 bottom photos, outlined white number and a marker-script word on the photos, rust band with outlined white caps.',
    family: 5,
    categories: ['Food / Recipe', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.26 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#B4693E'),
        N(W * 0.12, b.y(-0.6), W * 0.34, b.h(0.58), '12', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#FFFFFF', ...outline('#111111', 12) }),
        accent(W * 0.44, b.y(-0.44), W * 0.54, b.h(0.4), 'Creative', { fontFamily: 'Permanent Marker', fill: '#FFFFFF', textTransform: 'uppercase', ...outline('#111111', 12), rotation: -4 }),
        L(W, b.y(0.12), b.h(0.36), 'Baby Shower', { fontFamily: 'Archivo Black', fill: '#FFFFFF', ...outline('#111111', 8), wordCount: 2 }),
        L(W, b.y(0.54), b.h(0.38), 'Cake Ideas', { fontFamily: 'Archivo Black', fill: '#111111', textTransform: 'none', ...outline('#FFFFFF', 8) }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-pp-open-center-boxed',
    name: 'Spaced Keyword, Script & Boxed Last Word',
    description: '2 top + 2 bottom photos, light centre: spaced amber keyword, black condensed line, a script word and the last word in a black box.',
    family: 5,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'script-bold'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.38 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#F4F4F2'),
        L(W, b.y(0.02), b.h(0.27), 'Kitchen', { fontFamily: 'Bebas Neue', fill: '#F28C3F', letterSpacing: 30, ...outline('#111111', 5), wordCount: 1 }),
        L(W, b.y(0.3), b.h(0.22), 'Pots & Pans', { fontFamily: 'Oswald', fontWeight: 700, fill: '#111111' }),
        L(W, b.y(0.54), b.h(0.18), 'Organizing', { fontFamily: 'Pacifico', fill: '#111111', textTransform: 'none', wordCount: 1 }),
        L(W, b.y(0.75), b.h(0.21), 'Ideas', { fontFamily: 'Bebas Neue', fill: '#FFFFFF', x: W * 0.3, width: W * 0.4, background: bgOn('#111111', { hug: true, paddingX: 16, paddingY: 2 }), wordCount: 1 }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-pp-rust-tall',
    name: 'Rust Band, Tall Condensed Caps',
    description: '2 top + 2 bottom photos, a rust band with three tall condensed caps lines alternating white and black — no badge.',
    family: 1,
    categories: ['Home Decor', 'How-To', 'Lifestyle'],
    designTypes: ['split'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.34 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#B4693E'),
        L(W, b.y(0.04), b.h(0.3), 'Transform Your', { fontFamily: 'Oswald', fontWeight: 700, fill: '#FFFFFF', wordCount: 2 }),
        L(W, b.y(0.35), b.h(0.3), 'Kitchen With', { fontFamily: 'Oswald', fontWeight: 700, fill: '#111111', wordCount: 2 }),
        L(W, b.y(0.66), b.h(0.3), 'Upcycled Pallets', { fontFamily: 'Oswald', fontWeight: 700, fill: '#FFFFFF' }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-pp-script-boxed-last',
    name: 'Script Top, Boxed Last Word',
    description: '2 top + 2 bottom photos, an amber band with a script word, black condensed caps and the last word in a white box.',
    family: 5,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'script-bold'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.32 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#F6B04B'),
        L(W, b.y(0.04), b.h(0.26), 'Smart', { fontFamily: 'Pacifico', fill: '#111111', textTransform: 'none', wordCount: 1 }),
        L(W, b.y(0.33), b.h(0.3), 'Kitchen Storage', { fontFamily: 'Bebas Neue', fill: '#111111' }),
        L(W, b.y(0.67), b.h(0.27), 'Ideas', { fontFamily: 'Bebas Neue', fill: '#111111', x: W * 0.25, width: W * 0.5, background: bgOn('#FFFFFF', { hug: true, paddingX: 18, paddingY: 2 }), wordCount: 1 }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-pp-minimal-black',
    name: 'Minimal White Band, Black Condensed',
    description: '2 top + 2 bottom photos with a slim white band and two huge black condensed lines.',
    family: 1,
    categories: ['Fashion', 'Lifestyle', 'Listicle'],
    designTypes: ['split'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.24 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#FFFFFF'),
        L(W, b.y(0.06), b.h(0.42), '15 Bold Sleeve', { fontFamily: 'Bebas Neue', fill: '#111111', letterSpacing: 2, wordCount: 3 }),
        L(W, b.y(0.52), b.h(0.42), 'Tattoo Designs', { fontFamily: 'Bebas Neue', fill: '#111111', letterSpacing: 2 }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-pp-black-band',
    name: 'Black Band, White Condensed',
    description: '2 top + 2 bottom photos with a black band and two big white condensed lines.',
    family: 1,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['split'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.24 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#111111'),
        L(W, b.y(0.06), b.h(0.42), 'Seasonal Home', { fontFamily: 'Bebas Neue', fill: '#FFFFFF', letterSpacing: 2, wordCount: 2 }),
        L(W, b.y(0.52), b.h(0.42), 'Styling Tips', { fontFamily: 'Bebas Neue', fill: '#FFFFFF', letterSpacing: 2 }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-photo-panel-script',
    name: 'Big Photo, Script + Condensed Panel',
    description: 'A large photo on top, white panel with a thin script word and two huge black condensed lines, olive website bar.',
    family: 7,
    categories: ['Food / Recipe', 'Lifestyle'],
    designTypes: ['image-text-panel', 'script-bold'],
    ...BLOG,
    collage: { layoutId: 'single', region: { x: 0, y: 0, width: 1, height: 0.64 } },
    layers: ({ W, H }) => [
      L(W, H * 0.645, H * 0.07, 'Tasty', { fontFamily: 'Sacramento', fill: '#111111', textTransform: 'none', wordCount: 1 }),
      L(W, H * 0.72, H * 0.1, 'Cheesy Garlic', { fontFamily: 'Bebas Neue', fill: '#111111', wordCount: 2 }),
      L(W, H * 0.825, H * 0.1, 'Chicken Wraps', { fontFamily: 'Bebas Neue', fill: '#111111' }),
      ...bar(W, H, '#6B6B2E', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-grid-bottom-overlay',
    name: 'Grid with Shadowed Caps at the Bottom',
    description: '2×2 photos with big rounded white caps carrying a hard black shadow across the lower photos.',
    family: 6,
    categories: ['Hair', 'Fashion', 'Lifestyle'],
    designTypes: ['collage-4', 'image-text-overlay'],
    ...BLOG,
    collage: { layoutId: 'grid-2x2', gap: 6 },
    layers: ({ W, H }) => [
      L(W, H * 0.7, H * 0.075, 'Spring', { fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', shadow: hard('#111111', 4, 4), wordCount: 1 }),
      L(W, H * 0.775, H * 0.075, 'Haircuts', { fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', shadow: hard('#111111', 4, 4), wordCount: 1 }),
      L(W, H * 0.85, H * 0.075, '2026', { fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', shadow: hard('#111111', 4, 4) }),
      web(W, H),
    ],
  }),
  tpl({
    id: 'cv-hard-shadow-band',
    name: 'Hard-Shadow Caps on a Brown Band',
    description: '2 top + 2 bottom photos, a big white number with a hard shadow over the photos and white shadowed caps on a warm brown band.',
    family: 4,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.26 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#A86A4F'),
        N(W * 0.2, b.y(-0.52), W * 0.6, b.h(0.5), '30', { fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', shadow: hard('#111111', 6, 6) }),
        L(W, b.y(0.05), b.h(0.24), 'Trendy', { fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', shadow: hard('#111111', 4, 4), wordCount: 1 }),
        L(W, b.y(0.32), b.h(0.36), 'Hairstyle', { fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', shadow: hard('#111111', 5, 5), wordCount: 1 }),
        L(W, b.y(0.71), b.h(0.24), 'Ideas', { fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', shadow: hard('#111111', 4, 4) }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-brush-badge-spaced',
    name: 'Ringed Black Badge, Spaced Caps',
    description: '2 top + 2 bottom photos, a black circle number with a white ring over the photos and two wide letter-spaced black lines.',
    family: 4,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.26 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#F0F0EE'),
        badge(W / 2 - b.h(0.32), b.y(-0.52), b.h(0.64), '25', 'circle', '#111111', '#FFFFFF', {
          fontFamily: 'Bebas Neue', background: bgOn('#111111', { hug: false, shape: 'circle', paddingX: 8, paddingY: 8, borderWidth: 6, borderColor: '#FFFFFF' }),
        }),
        L(W, b.y(0.14), b.h(0.36), 'Yoga Corner', { fontFamily: 'Bebas Neue', fill: '#111111', letterSpacing: 10, wordCount: 2 }),
        L(W, b.y(0.54), b.h(0.36), 'Design Ideas', { fontFamily: 'Bebas Neue', fill: '#111111', letterSpacing: 10 }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-dark-script-overlay',
    name: 'Dimmed Grid, Outlined Script',
    description: '2×2 photos dimmed, an outlined serif number, a small sans word and big white script lines outlined in black.',
    family: 5,
    categories: ['Home Decor', 'Lifestyle'],
    designTypes: ['collage-4', 'script-bold'],
    ...BLOG,
    collage: { layoutId: 'grid-2x2', gap: 6 },
    layers: ({ W, H }) => [
      rect(0, 0, W, H, '#000000', { opacity: 0.32, name: 'Dim' }),
      N(W * 0.3, H * 0.3, W * 0.4, H * 0.1, '20', { fontFamily: 'Abril Fatface', fill: '#FFFFFF', ...outline('#111111', 6) }),
      L(W, H * 0.41, H * 0.045, 'Trendy', { fontFamily: 'Montserrat', fontWeight: 700, fill: '#FFFFFF', textTransform: 'none', wordCount: 1 }),
      L(W, H * 0.465, H * 0.09, 'Home Decor', { fontFamily: 'Pacifico', fill: '#FFFFFF', textTransform: 'none', ...outline('#111111', 8), wordCount: 2 }),
      L(W, H * 0.56, H * 0.09, 'Ideas', { fontFamily: 'Pacifico', fill: '#FFFFFF', textTransform: 'none', ...outline('#111111', 8) }),
      web(W, H),
    ],
  }),
  tpl({
    id: 'cv-starburst',
    name: 'Starburst Badge on a Grid',
    description: '2×2 photos with a pink starburst in the centre and tilted black condensed caps with a yellow offset shadow.',
    family: 3,
    categories: ['Home Decor', 'Living Room', 'Lifestyle'],
    designTypes: ['collage-4'],
    ...BLOG,
    collage: { layoutId: 'grid-2x2', gap: 6 },
    layers: ({ W, H }) => {
      const s = W * 0.66;
      const cx = W / 2;
      const cy = H * 0.47;
      return [
        ...[0, 22.5, 45, 67.5].map((deg) => turned(cx, cy, s, s, deg, '#F7B8D6')),
        L(W, cy - H * 0.13, H * 0.06, '40+ Chic', { fontFamily: 'Bebas Neue', fill: '#111111', shadow: hard('#F6D94A', 3, 3), rotation: -6, x: W * 0.2, width: W * 0.6, wordCount: 2 }),
        L(W, cy - H * 0.065, H * 0.06, 'Living Room', { fontFamily: 'Bebas Neue', fill: '#111111', shadow: hard('#F6D94A', 3, 3), rotation: -6, x: W * 0.2, width: W * 0.6, wordCount: 2 }),
        L(W, cy, H * 0.06, 'Decor', { fontFamily: 'Bebas Neue', fill: '#111111', shadow: hard('#F6D94A', 3, 3), rotation: -6, x: W * 0.22, width: W * 0.56, wordCount: 1 }),
        L(W, cy + H * 0.065, H * 0.06, 'Ideas', { fontFamily: 'Bebas Neue', fill: '#111111', shadow: hard('#F6D94A', 3, 3), rotation: -6, x: W * 0.24, width: W * 0.52 }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-wavy-serif-band',
    name: 'Wavy Cream Band, Serif',
    description: '2 top + 2 bottom photos, a cream band with scalloped edges and warm brown serif: a mixed-case line, big caps and a closing word.',
    family: 9,
    categories: ['Home Decor', 'Living Room', 'Lifestyle'],
    designTypes: ['split'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.26 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#EADBCB'),
        ...[0, 1, 2, 3, 4, 5].map((i) => oval(i * W * 0.2 - W * 0.06, b.y(-0.07), W * 0.26, b.h(0.18), '#EADBCB')),
        ...[0, 1, 2, 3, 4, 5].map((i) => oval(i * W * 0.2 + W * 0.04, b.y(0.89), W * 0.26, b.h(0.18), '#EADBCB')),
        L(W, b.y(0.06), b.h(0.26), '21 Moody Boho', { fontFamily: 'DM Serif Display', fill: '#5B3A29', textTransform: 'none', wordCount: 3 }),
        L(W, b.y(0.36), b.h(0.3), 'Bedroom', { fontFamily: 'DM Serif Display', fill: '#5B3A29', wordCount: 1 }),
        L(W, b.y(0.68), b.h(0.26), 'Ideas', { fontFamily: 'DM Serif Display', fill: '#5B3A29', textTransform: 'none' }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-circle-medallion',
    name: 'Round Medallion with Serif',
    description: '2×2 photos with a large white circle and a fine grey ring; a serif number, light serif words and a bold serif keyword.',
    family: 3,
    categories: ['Home Decor', 'Lifestyle'],
    designTypes: ['collage-4', 'number-badge'],
    ...BLOG,
    collage: { layoutId: 'grid-2x2', gap: 6 },
    layers: ({ W, H }) => {
      const d = W * 0.78;
      const top = H * 0.5 - d / 2;
      return [
        oval(W / 2 - d / 2 - 10, top - 10, d + 20, d + 20, 'transparent', { stroke: '#FFFFFF', strokeWidth: 4 }),
        oval(W / 2 - d / 2, top, d, d, '#FFFFFF', { stroke: '#9A9A9A', strokeWidth: 3 }),
        N(W * 0.35, top + d * 0.13, W * 0.3, d * 0.16, '21', { fontFamily: 'DM Serif Display', fill: '#111111' }),
        L(W, top + d * 0.32, d * 0.13, 'Must-Try', { fontFamily: 'Lora', fontWeight: 400, fill: '#111111', textTransform: 'none', x: W * 0.2, width: W * 0.6, wordCount: 1 }),
        L(W, top + d * 0.47, d * 0.14, 'Home Decor', { fontFamily: 'Playfair Display', fontWeight: 800, fill: '#111111', x: W * 0.16, width: W * 0.68, wordCount: 2 }),
        L(W, top + d * 0.63, d * 0.13, 'Trends', { fontFamily: 'Lora', fontWeight: 400, fill: '#111111', textTransform: 'none', x: W * 0.2, width: W * 0.6 }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-framed-box',
    name: 'Framed Brown Box on a Grid',
    description: '2×2 photos, a rounded brown box with a white frame: a bold number beside a script word, white caps and a closing line.',
    family: 3,
    categories: ['Home Decor', 'Fall Decor', 'Lifestyle'],
    designTypes: ['collage-4', 'number-badge', 'script-bold'],
    ...BLOG,
    collage: { layoutId: 'grid-2x2', gap: 6 },
    layers: ({ W, H }) => [
      rect(W * 0.08, H * 0.385, W * 0.84, H * 0.235, '#8B6A4E', { stroke: '#FFFFFF', strokeWidth: 8, cornerRadius: 12 }),
      N(W * 0.12, H * 0.4, W * 0.26, H * 0.085, '41', { fontFamily: 'Archivo Black', fill: '#FFFFFF' }),
      L(W, H * 0.405, H * 0.07, 'Farmhouse', { fontFamily: 'Great Vibes', fill: '#FFFFFF', textTransform: 'none', x: W * 0.38, width: W * 0.52, align: 'left', wordCount: 1 }),
      L(W, H * 0.485, H * 0.07, 'Bedroom', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#FFFFFF', wordCount: 1 }),
      L(W, H * 0.555, H * 0.055, 'Decor Ideas', { fontFamily: 'Poppins', fontWeight: 700, fill: '#FFFFFF', textTransform: 'none' }),
      web(W, H),
    ],
  }),
  tpl({
    id: 'cv-marker-band',
    name: 'Marker-Pen Band',
    description: '2 top + 2 bottom photos, a grey band with a marker-pen number outlined in brown, brown condensed caps and black marker lettering.',
    family: 5,
    categories: ['Fashion', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.26 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#D9D9D7'),
        N(W * 0.05, b.y(-0.22), W * 0.34, b.h(0.52), '40', { fontFamily: 'Permanent Marker', fill: '#FFFFFF', ...outline('#7A4E2D', 10) }),
        L(W, b.y(0.06), b.h(0.24), 'Must-Try', { fontFamily: 'Oswald', fontWeight: 700, fill: '#9C6B3F', x: W * 0.4, width: W * 0.55, align: 'left', wordCount: 1 }),
        L(W, b.y(0.35), b.h(0.32), 'Winter Outfits', { fontFamily: 'Permanent Marker', fill: '#111111', wordCount: 2 }),
        L(W, b.y(0.71), b.h(0.24), 'Ideas', { fontFamily: 'Oswald', fontWeight: 700, fill: '#9C6B3F' }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-outline-split',
    name: 'Outlined Caps, Top & Bottom',
    description: 'One photo, the headline split into a top block (brown first word, steel-blue caps) and a bottom block, all outlined in white.',
    family: 6,
    categories: ['Lifestyle', 'Listicle'],
    designTypes: ['single-image', 'image-text-overlay'],
    ...BLOG,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      L(W, H * 0.03, H * 0.08, 'Why', { fontFamily: 'Archivo Black', fill: '#6B3E2E', ...outline('#FFFFFF', 8), x: W * 0.03, width: W * 0.45, align: 'left', wordCount: 1 }),
      L(W, H * 0.12, H * 0.065, 'So Many People', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#5B7FA6', ...outline('#FFFFFF', 6), wordCount: 3 }),
      L(W, H * 0.19, H * 0.065, 'Can’t Afford', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#5B7FA6', ...outline('#FFFFFF', 6), wordCount: 2 }),
      L(W, H * 0.26, H * 0.065, 'to Travel', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#5B7FA6', ...outline('#FFFFFF', 6) }),
      S(W * 0.03, H * 0.8, W * 0.94, H * 0.05, 'The surprising math behind', { fontFamily: 'Archivo Black', fill: '#6B3E2E', textTransform: 'uppercase', ...outline('#FFFFFF', 6) }),
      S(W * 0.03, H * 0.86, W * 0.94, H * 0.05, 'rising travel prices', { fontFamily: 'Archivo Black', fill: '#6B3E2E', textTransform: 'uppercase', ...outline('#FFFFFF', 6) }),
      ...bar(W, H, '#3A3A3A', '#9DB7D5'),
    ],
  }),
  tpl({
    id: 'cv-outline-blue-script',
    name: 'Navy Outlined Caps + Red Script',
    description: 'One photo, big navy caps outlined in white, a red script word and a red small line, with the website running up the side.',
    family: 6,
    categories: ['How-To', 'Lifestyle'],
    designTypes: ['single-image', 'image-text-overlay', 'script-bold'],
    ...BLOG,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      L(W, H * 0.03, H * 0.09, 'How', { fontFamily: 'Poppins', fontWeight: 800, fill: '#2E4A62', ...outline('#FFFFFF', 8), x: W * 0.05, width: W * 0.6, align: 'left', wordCount: 1 }),
      L(W, H * 0.03, H * 0.07, 'to', { fontFamily: 'Pacifico', fill: '#D7263D', textTransform: 'none', x: W * 0.62, width: W * 0.3, align: 'left', wordCount: 1 }),
      L(W, H * 0.13, H * 0.08, 'Say Goodbye', { fontFamily: 'Poppins', fontWeight: 800, fill: '#2E4A62', ...outline('#FFFFFF', 8), wordCount: 2 }),
      S(W * 0.05, H * 0.22, W * 0.9, H * 0.045, 'to your pet without', { fontFamily: 'Poppins', fontWeight: 700, fill: '#D7263D', ...outline('#FFFFFF', 4) }),
      L(W, H * 0.28, H * 0.09, 'Falling Apart', { fontFamily: 'Poppins', fontWeight: 800, fill: '#2E4A62', ...outline('#FFFFFF', 8) }),
      footer(W, H, 'plain-dark', { rotation: -90, x: W * 0.02, y: H * 0.93, width: H * 0.3, height: W * 0.06, fill: '#2E4A62', fontSize: W * 0.03, letterSpacing: 3, ...outline('#FFFFFF', 3) }),
    ],
  }),
  tpl({
    id: 'cv-translucent-card',
    name: 'See-Through Card on Photo',
    description: 'One photo with a dark see-through square card framed in white: a script line, peach caps and soft-blue lines.',
    family: 6,
    categories: ['Lifestyle', 'How-To'],
    designTypes: ['single-image', 'image-text-overlay', 'script-bold'],
    ...BLOG,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      rect(W * 0.08, H * 0.28, W * 0.84, H * 0.42, '#1F2A30', { opacity: 0.6, stroke: '#FFFFFF', strokeWidth: 2 }),
      L(W, H * 0.31, H * 0.07, 'Tested Every', { fontFamily: 'Great Vibes', fill: '#FFFFFF', textTransform: 'none', x: W * 0.12, width: W * 0.76, wordCount: 2 }),
      L(W, H * 0.39, H * 0.08, 'Best Dog Food', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#F3C9A8', x: W * 0.12, width: W * 0.76 }),
      S(W * 0.12, H * 0.5, W * 0.76, H * 0.06, 'on the market', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#8FB4D9' }),
      S(W * 0.12, H * 0.57, W * 0.76, H * 0.05, '(the results will surprise you)', { fontFamily: 'Poppins', fontWeight: 600, fill: '#8FB4D9' }),
      ...bar(W, H, '#2B2B2B', '#8FB4D9'),
    ],
  }),
  tpl({
    id: 'cv-highlight-left-script',
    name: 'Left Highlight Blocks + Red Script',
    description: 'One photo, an outlined number top-left, a red script word and left-aligned black caps on white highlight blocks.',
    family: 6,
    categories: ['Fashion', 'Lifestyle', 'Listicle'],
    designTypes: ['single-image', 'image-text-overlay', 'script-bold'],
    ...BLOG,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      N(W * 0.04, H * 0.03, W * 0.36, H * 0.1, '39', { fontFamily: 'Archivo Black', fill: '#111111', ...outline('#FFFFFF', 8), align: 'left' }),
      L(W, H * 0.62, H * 0.06, 'Nostalgic', { fontFamily: 'Pacifico', fill: '#D7263D', textTransform: 'none', x: W * 0.05, width: W * 0.6, align: 'left', wordCount: 1 }),
      L(W, H * 0.69, H * 0.07, 'Vintage Baby', { fontFamily: 'Archivo Black', fill: '#111111', x: W * 0.05, width: W * 0.9, align: 'left', background: bgOn('#FFFFFF', { hug: true, paddingX: 10, paddingY: 2 }), wordCount: 2 }),
      L(W, H * 0.77, H * 0.07, 'Clothes', { fontFamily: 'Archivo Black', fill: '#111111', x: W * 0.05, width: W * 0.9, align: 'left', background: bgOn('#FFFFFF', { hug: true, paddingX: 10, paddingY: 2 }), wordCount: 1 }),
      L(W, H * 0.85, H * 0.07, 'Ideas', { fontFamily: 'Archivo Black', fill: '#111111', x: W * 0.05, width: W * 0.9, align: 'left', background: bgOn('#FFFFFF', { hug: true, paddingX: 10, paddingY: 2 }) }),
      web(W, H, { fill: '#FFFFFF' }),
    ],
  }),
  tpl({
    id: 'cv-glow-circle',
    name: 'Soft Glow Circle Behind Text',
    description: 'One photo, a soft see-through white circle behind the lower lines and earthy brown caps outlined in cream.',
    family: 6,
    categories: ['Home Decor', 'Lifestyle'],
    designTypes: ['single-image', 'image-text-overlay', 'number-badge'],
    ...BLOG,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      oval(-W * 0.2, H * 0.45, W * 1.4, H * 0.62, '#FFFFFF', { opacity: 0.45 }),
      N(W * 0.2, H * 0.02, W * 0.6, H * 0.1, '11', { fontFamily: 'Archivo Black', fill: '#6B4A2E', ...outline('#F4E3C3', 6) }),
      L(W, H * 0.12, H * 0.07, 'Easy Ways', { fontFamily: 'Archivo Black', fill: '#6B4A2E', ...outline('#F4E3C3', 6), textTransform: 'none', wordCount: 2 }),
      L(W, H * 0.56, H * 0.06, 'To Keep Your', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#6B4A2E', wordCount: 3 }),
      L(W, H * 0.63, H * 0.06, 'Tiny Home', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#6B4A2E', wordCount: 2 }),
      L(W, H * 0.72, H * 0.09, 'Warm This Winter', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#6B4A2E', textTransform: 'none' }),
      ...bar(W, H, '#4A3A2E', '#F4E3C3'),
    ],
  }),
  tpl({
    id: 'cv-dotted-frame',
    name: 'Dotted Frame on Green',
    description: 'Fresh green background with a dotted frame, a white number tile, cream shadowed rounded caps and a script line; photo at the bottom.',
    family: 7,
    categories: ['Lifestyle', 'Quote', 'Listicle'],
    designTypes: ['image-text-panel', 'number-badge'],
    ...BLOG,
    bg: '#8CC084',
    collage: { layoutId: 'single', region: { x: 0.06, y: 0.66, width: 0.88, height: 0.28 } },
    layers: ({ W, H }) => {
      const dots: Layer[] = [];
      for (let i = 0; i <= 16; i++) {
        dots.push(oval(W * 0.05 + (i * W * 0.9) / 16 - 4, H * 0.075, 8, 8, '#5B4636'));
        dots.push(oval(W * 0.05 + (i * W * 0.9) / 16 - 4, H * 0.555, 8, 8, '#5B4636'));
      }
      for (let i = 1; i < 26; i++) {
        dots.push(oval(W * 0.05 - 4, H * 0.075 + (i * H * 0.48) / 26, 8, 8, '#5B4636'));
        dots.push(oval(W * 0.95 - 4, H * 0.075 + (i * H * 0.48) / 26, 8, 8, '#5B4636'));
      }
      return [
        ...dots,
        badge(W * 0.3, H * 0.025, W * 0.4, '600', 'rounded', '#FFFFFF', '#4F78A8', { fontFamily: 'Montserrat', fontWeight: 800, height: H * 0.075 }),
        L(W, H * 0.12, H * 0.09, 'Funny', { fontFamily: 'Poppins', fontWeight: 800, fill: '#F7F1E1', textTransform: 'none', shadow: hard('#3D5A3B', 3, 3), wordCount: 1 }),
        L(W, H * 0.215, H * 0.09, 'Names', { fontFamily: 'Poppins', fontWeight: 800, fill: '#F7F1E1', textTransform: 'none', shadow: hard('#3D5A3B', 3, 3), wordCount: 1 }),
        L(W, H * 0.31, H * 0.07, 'For Golf', { fontFamily: 'Poppins', fontWeight: 800, fill: '#F7F1E1', textTransform: 'none', shadow: hard('#3D5A3B', 3, 3), wordCount: 2 }),
        L(W, H * 0.385, H * 0.07, 'Tournaments', { fontFamily: 'Poppins', fontWeight: 800, fill: '#F7F1E1', textTransform: 'none', shadow: hard('#3D5A3B', 3, 3) }),
        S(W * 0.4, H * 0.575, W * 0.55, H * 0.06, 'with smart choices', { fontFamily: 'Sacramento', fill: '#3D6FA8', align: 'right' }),
        ...bar(W, H, '#FFFFFF', '#4F78A8'),
      ];
    },
  }),
  tpl({
    id: 'cv-blob-box',
    name: 'Rounded Blob Behind the Keyword',
    description: 'Warm grey background, an outlined green number and line, a big green rounded blob behind the blue keyword lines; photo below.',
    family: 7,
    categories: ['Lifestyle', 'Listicle'],
    designTypes: ['image-text-panel', 'number-badge'],
    ...BLOG,
    bg: '#C9C5BE',
    collage: { layoutId: 'single', region: { x: 0, y: 0.62, width: 1, height: 0.335 } },
    layers: ({ W, H }) => [
      N(W * 0.2, H * 0.03, W * 0.6, H * 0.1, '600', { fontFamily: 'Poppins', fontWeight: 800, fill: '#5DAA5A', ...outline('#111111', 8) }),
      L(W, H * 0.14, H * 0.08, 'Funny Names', { fontFamily: 'Poppins', fontWeight: 800, fill: '#5DAA5A', ...outline('#111111', 6), textTransform: 'none', wordCount: 2 }),
      rect(W * 0.03, H * 0.29, W * 0.94, H * 0.26, '#5DAA5A', { cornerRadius: 46 }),
      L(W, H * 0.315, H * 0.1, 'For Golf', { fontFamily: 'Poppins', fontWeight: 800, fill: '#4F6F9F', textTransform: 'none', wordCount: 2 }),
      L(W, H * 0.42, H * 0.1, 'Tournaments', { fontFamily: 'Poppins', fontWeight: 800, fill: '#4F6F9F', textTransform: 'none' }),
      ...bar(W, H, '#5DAA5A', '#2E4A62'),
    ],
  }),
  tpl({
    id: 'cv-brush-rect',
    name: 'Rough White Card on Olive',
    description: 'Olive background, an outlined steel-blue number and a rough-edged white card holding bold slab-serif lines; photo below.',
    family: 7,
    categories: ['Lifestyle', 'How-To'],
    designTypes: ['image-text-panel', 'number-badge'],
    ...BLOG,
    bg: '#7A7254',
    collage: { layoutId: 'single', region: { x: 0, y: 0.6, width: 1, height: 0.355 } },
    layers: ({ W, H }) => [
      N(W * 0.25, H * 0.02, W * 0.5, H * 0.1, '13', { fontFamily: 'Archivo Black', fill: '#5B7FA6', ...outline('#111111', 8) }),
      turned(W / 2, H * 0.33, W * 0.9, H * 0.36, -1.5, '#FFFFFF'),
      turned(W / 2, H * 0.33, W * 0.86, H * 0.37, 1.2, '#FFFFFF'),
      L(W, H * 0.18, H * 0.09, 'Automating', { fontFamily: 'Archivo Black', fill: '#5B7FA6', textTransform: 'none', wordCount: 1 }),
      L(W, H * 0.28, H * 0.09, 'Savings', { fontFamily: 'Archivo Black', fill: '#5B7FA6', textTransform: 'none', wordCount: 1 }),
      L(W, H * 0.38, H * 0.09, 'Strategies', { fontFamily: 'Archivo Black', fill: '#5B7FA6', textTransform: 'none' }),
      ...bar(W, H, '#FFFFFF', '#111111'),
    ],
  }),
  tpl({
    id: 'cv-staggered-labels',
    name: 'Staggered Label Boxes',
    description: 'One photo with stacked label boxes stepping left and right in mustard and deep brown, letter-spaced white caps.',
    family: 6,
    categories: ['Lifestyle', 'How-To'],
    designTypes: ['single-image', 'image-text-overlay'],
    ...BLOG,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => {
      const box = (color: string): TP => ({ background: bgOn(color, { hug: true, paddingX: 22, paddingY: 6 }) });
      return [
        L(W, H * 0.11, H * 0.07, 'Van Life', { fontFamily: 'Oswald', fontWeight: 600, fill: '#2B1A10', letterSpacing: 8, x: W * 0.16, width: W * 0.76, ...box('#D99A2B'), wordCount: 2 }),
        L(W, H * 0.19, H * 0.08, 'Insurance Disaster', { fontFamily: 'Oswald', fontWeight: 600, fill: '#FFFFFF', letterSpacing: 6, x: W * 0.06, width: W * 0.76, ...box('#5A2A1E'), wordCount: 2 }),
        L(W, H * 0.285, H * 0.1, 'Critical Mistakes', { fontFamily: 'Oswald', fontWeight: 600, fill: '#2B1A10', letterSpacing: 6, x: W * 0.12, width: W * 0.8, ...box('#D99A2B') }),
        S(W * 0.08, H * 0.4, W * 0.84, H * 0.05, 'that cost this couple everything', { fontFamily: 'Oswald', fontWeight: 500, fill: '#8FB4D9', textTransform: 'uppercase', letterSpacing: 6, ...box('#5A2A1E') }),
        ...bar(W, H, '#FFFFFF', '#111111'),
      ];
    },
  }),
  tpl({
    id: 'cv-number-box-band',
    name: 'Number Tile + Purple Highlight Band',
    description: 'Light background, a purple number tile, purple and soft-blue lines with one word on a full-width purple band; photo below.',
    family: 7,
    categories: ['Lifestyle', 'Listicle'],
    designTypes: ['image-text-panel', 'number-badge'],
    ...BLOG,
    bg: '#F2EEF0',
    collage: { layoutId: 'single', region: { x: 0, y: 0.64, width: 1, height: 0.315 } },
    layers: ({ W, H }) => [
      badge(W * 0.36, H * 0.02, W * 0.28, '15', 'square', '#6F5BC9', '#FFFFFF', { fontFamily: 'Poppins', fontWeight: 800, height: H * 0.085 }),
      L(W, H * 0.115, H * 0.08, 'Jobs', { fontFamily: 'Poppins', fontWeight: 800, fill: '#6F5BC9', textTransform: 'none', wordCount: 1 }),
      L(W, H * 0.2, H * 0.05, 'That Are in', { fontFamily: 'Poppins', fontWeight: 500, fill: '#4F78A8', textTransform: 'none', wordCount: 3 }),
      rect(0, H * 0.265, W, H * 0.12, '#6F5BC9'),
      L(W, H * 0.275, H * 0.1, 'Danger', { fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', textTransform: 'none', wordCount: 1 }),
      L(W, H * 0.4, H * 0.05, 'With the Rise of', { fontFamily: 'Poppins', fontWeight: 500, fill: '#4F78A8', textTransform: 'none' }),
      L(W, H * 0.46, H * 0.1, 'AI', { fontFamily: 'Poppins', fontWeight: 800, fill: '#6F5BC9', wordCount: 1 }),
      ...bar(W, H, '#6F5BC9', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-photo-dark-caption',
    name: 'Big Photo + Dark Caption Panel',
    description: 'A large photo with outlined green caps at the top and a dark caption panel underneath with soft-blue lines.',
    family: 7,
    categories: ['Lifestyle', 'Relationship'],
    designTypes: ['image-text-panel', 'image-text-overlay'],
    ...BLOG,
    collage: { layoutId: 'single', region: { x: 0, y: 0, width: 1, height: 0.72 } },
    layers: ({ W, H }) => [
      rect(0, H * 0.72, W, H * 0.235, '#1E1E1E'),
      L(W, H * 0.03, H * 0.08, 'I Lost', { fontFamily: 'Poppins', fontWeight: 800, fill: '#4F8A3C', textTransform: 'none', ...outline('#173A14', 6), wordCount: 2 }),
      L(W, H * 0.11, H * 0.08, 'My Dog', { fontFamily: 'Poppins', fontWeight: 800, fill: '#4F8A3C', textTransform: 'none', ...outline('#173A14', 6), wordCount: 2 }),
      S(W * 0.06, H * 0.735, W * 0.88, H * 0.045, 'and everyone said', { fontFamily: 'Poppins', fontWeight: 700, fill: '#8FB4D9' }),
      L(W, H * 0.785, H * 0.09, 'Just Get Another One', { fontFamily: 'Poppins', fontWeight: 800, fill: '#8FB4D9', textTransform: 'none' }),
      S(W * 0.06, H * 0.885, W * 0.88, H * 0.045, 'Here’s why that’s wrong', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#8FB4D9', textTransform: 'uppercase' }),
      ...bar(W, H, '#1E1E1E', '#8FB4D9'),
    ],
  }),
  tpl({
    id: 'cv-blobs-corners',
    name: 'Soft Colour Blobs + Rust Badge',
    description: 'One light photo with soft pink and coral blobs in the corners, a rust circle number, steel-blue words and big rust caps.',
    family: 6,
    categories: ['Lifestyle', 'Relationship'],
    designTypes: ['single-image', 'image-text-overlay', 'number-badge'],
    ...BLOG,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      oval(W * 0.62, -H * 0.06, W * 0.55, H * 0.22, '#E07A7A', { opacity: 0.85 }),
      oval(-W * 0.25, H * 0.36, W * 0.45, H * 0.16, '#F2B6A0', { opacity: 0.85 }),
      badge(W / 2 - W * 0.12, H * 0.04, W * 0.24, '3', 'circle', '#B5532F', '#5B7FA6', { fontFamily: 'Montserrat', fontWeight: 800 }),
      L(W, H * 0.21, H * 0.06, 'Zodiacs', { fontFamily: 'Poppins', fontWeight: 800, fill: '#5B7FA6', textTransform: 'none', wordCount: 1 }),
      L(W, H * 0.28, H * 0.08, 'Gaining', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#B5532F', wordCount: 1 }),
      L(W, H * 0.36, H * 0.08, 'Confidence', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#B5532F' }),
      S(W * 0.08, H * 0.45, W * 0.84, H * 0.045, 'in a new season', { fontFamily: 'Poppins', fontWeight: 700, italic: true, fill: '#5B7FA6' }),
      web(W, H, { fill: '#5B7FA6', shadow: { enabled: false, color: '#000', blur: 0, offsetX: 0, offsetY: 0, opacity: 0 } }),
    ],
  }),
  tpl({
    id: 'cv-red-bg-big-number',
    name: 'Crimson Panel, Giant Number',
    description: 'Deep crimson background, a giant white number with a hard shadow beside stacked condensed caps, a cream outlined keyword; photo below.',
    family: 4,
    categories: ['Beauty', 'Food / Recipe', 'Listicle'],
    designTypes: ['image-text-panel', 'number-badge'],
    ...BLOG,
    bg: '#A3141E',
    collage: { layoutId: 'single', region: { x: 0, y: 0.6, width: 1, height: 0.4 } },
    layers: ({ W, H }) => [
      N(W * 0.03, H * 0.02, W * 0.32, H * 0.2, '8', { fontFamily: 'Archivo Black', fill: '#FFFFFF', shadow: hard('#111111', 6, 6) }),
      L(W, H * 0.04, H * 0.075, 'Collagen', { fontFamily: 'Oswald', fontWeight: 700, fill: '#F2E6E6', x: W * 0.37, width: W * 0.58, align: 'left', wordCount: 1 }),
      L(W, H * 0.12, H * 0.075, 'Packed', { fontFamily: 'Oswald', fontWeight: 700, fill: '#F2E6E6', x: W * 0.37, width: W * 0.58, align: 'left', wordCount: 1 }),
      L(W, H * 0.24, H * 0.1, 'Foods', { fontFamily: 'Archivo Black', fill: '#F7E2C9', ...outline('#111111', 8), wordCount: 1 }),
      L(W, H * 0.36, H * 0.08, 'for Skin & Hair', { fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', textTransform: 'none' }),
      S(W * 0.08, H * 0.46, W * 0.84, H * 0.05, '(#2 is surprising)', { fontFamily: 'Poppins', fontWeight: 500, fill: '#FFFFFF' }),
      web(W, H),
    ],
  }),
  tpl({
    id: 'cv-badge-side-lines',
    name: 'Circle Badge with Side Lines',
    description: 'Warm cream background, a coral circle number flanked by fine lines, coral caps, a small black line and an outlined blue word; photo below.',
    family: 4,
    categories: ['Relationship', 'Lifestyle'],
    designTypes: ['image-text-panel', 'number-badge'],
    ...BLOG,
    bg: '#F6EEE7',
    collage: { layoutId: 'single', region: { x: 0, y: 0.62, width: 1, height: 0.335 } },
    layers: ({ W, H }) => [
      rect(0, H * 0.098, W * 0.33, 3, '#5A3A2A'),
      rect(W * 0.67, H * 0.098, W * 0.33, 3, '#5A3A2A'),
      badge(W / 2 - W * 0.13, H * 0.03, W * 0.26, '3', 'circle', '#E58B76', '#4F78A8', { fontFamily: 'Montserrat', fontWeight: 800 }),
      L(W, H * 0.21, H * 0.075, 'Zodiac Signs', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#E58B76', wordCount: 2 }),
      L(W, H * 0.295, H * 0.05, 'That Demand', { fontFamily: 'Poppins', fontWeight: 700, fill: '#2B1A10', textTransform: 'none', wordCount: 2 }),
      L(W, H * 0.355, H * 0.07, 'Loyalty', { fontFamily: 'Poppins', fontWeight: 800, fill: '#4F78A8', textTransform: 'none', shadow: hard('#E58B76', 3, 3), wordCount: 1 }),
      L(W, H * 0.43, H * 0.045, 'in', { fontFamily: 'Poppins', fontWeight: 700, fill: '#2B1A10', textTransform: 'none' }),
      L(W, H * 0.48, H * 0.1, 'Friendship', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#E58B76', wordCount: 1 }),
      ...bar(W, H, '#E58B76', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-staggered-align',
    name: 'Zig-Zag Aligned Caps Panel',
    description: 'A soft grey top panel with steel-blue caps alternating left and right alignment for a lively zig-zag; photo below.',
    family: 7,
    categories: ['How-To', 'Home Decor', 'Lifestyle'],
    designTypes: ['image-text-panel'],
    ...BLOG,
    collage: { layoutId: 'single', region: { x: 0, y: 0.48, width: 1, height: 0.475 } },
    layers: ({ W, H }) => {
      const p = (align: 'left' | 'right' | 'center', wordCount?: number): TP => ({ fontFamily: 'Montserrat', fontWeight: 800, fill: '#4F6F9F', shadow: hard('#FFFFFF', 2, 2), align, x: W * 0.05, width: W * 0.9, wordCount });
      return [
        rect(0, 0, W, H * 0.48, '#CFCFCF'),
        L(W, H * 0.04, H * 0.07, 'How to Prevent', p('left', 3)),
        L(W, H * 0.12, H * 0.07, 'and Remove', p('right', 2)),
        L(W, H * 0.2, H * 0.07, 'Gophers From', p('left', 2)),
        L(W, H * 0.28, H * 0.07, 'Yards', p('center', 1)),
        L(W, H * 0.36, H * 0.07, 'and Gardens', p('right')),
        ...bar(W, H, '#4F6F9F', '#FFFFFF'),
      ];
    },
  }),
  tpl({
    id: 'cv-mosaic-circle',
    name: 'Photo Mosaic + Big Colour Circle',
    description: 'Six-photo mosaic with a big raspberry circle in the middle holding an outlined number and steel-blue caps.',
    family: 3,
    categories: ['Home Decor', 'Living Room', 'Listicle'],
    designTypes: ['collage-4', 'number-badge'],
    ...BLOG,
    collage: { layoutId: 'grid-2x3', gap: 6 },
    layers: ({ W, H }) => {
      const d = W * 0.92;
      const top = H * 0.5 - d / 2;
      return [
        oval(W / 2 - d / 2, top, d, d, '#B23A55', { stroke: '#FFFFFF', strokeWidth: 4 }),
        N(W * 0.3, top + d * 0.1, W * 0.4, d * 0.18, '40', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#5B7FA6', ...outline('#111111', 6) }),
        L(W, top + d * 0.31, d * 0.1, 'Stunning', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#5B7FA6', x: W * 0.14, width: W * 0.72, wordCount: 1 }),
        L(W, top + d * 0.43, d * 0.12, 'TV Unit', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#5B7FA6', ...outline('#111111', 5), x: W * 0.12, width: W * 0.76, wordCount: 2 }),
        L(W, top + d * 0.57, d * 0.12, 'Modern', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#5B7FA6', ...outline('#111111', 5), x: W * 0.12, width: W * 0.76, wordCount: 1 }),
        L(W, top + d * 0.71, d * 0.1, 'Designs', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#5B7FA6', x: W * 0.16, width: W * 0.68 }),
        web(W, H, { fill: '#9DB7D5' }),
      ];
    },
  }),
  tpl({
    id: 'cv-mosaic-framed-card',
    name: 'Photo Mosaic + Neon-Framed Card',
    description: 'Six-photo mosaic with a navy card framed in neon lime and a matching circle number, neon caps and a soft-blue closing word.',
    family: 3,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['collage-4', 'number-badge'],
    ...BLOG,
    collage: { layoutId: 'grid-2x3', gap: 6 },
    layers: ({ W, H }) => [
      rect(W * 0.06, H * 0.38, W * 0.88, H * 0.26, '#2F3A5E', { stroke: '#D7F542', strokeWidth: 8 }),
      badge(W / 2 - W * 0.13, H * 0.295, W * 0.26, '25', 'circle', '#2F3A5E', '#D7F542', {
        fontFamily: 'Montserrat', fontWeight: 900, background: bgOn('#2F3A5E', { hug: false, shape: 'circle', paddingX: 8, paddingY: 8, borderWidth: 6, borderColor: '#D7F542' }),
      }),
      L(W, H * 0.44, H * 0.06, 'Coastal', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#D7F542', x: W * 0.1, width: W * 0.8, wordCount: 1 }),
      L(W, H * 0.505, H * 0.06, 'Bedroom', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#D7F542', x: W * 0.1, width: W * 0.8, wordCount: 1 }),
      L(W, H * 0.57, H * 0.05, 'Ideas', { fontFamily: 'Pacifico', fill: '#8FB4D9', textTransform: 'none', x: W * 0.1, width: W * 0.8 }),
      web(W, H),
    ],
  }),
  tpl({
    id: 'cv-vertical-column',
    name: 'Tall Navy Column + Pink Label',
    description: 'One photo with a tall navy column: thin script lines in soft blue around a tilted pink label holding the keyword.',
    family: 6,
    categories: ['Lifestyle', 'How-To', 'Custom Blog Pin'],
    designTypes: ['single-image', 'image-text-panel', 'script-bold'],
    ...BLOG,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      rect(W * 0.1, 0, W * 0.8, H * 0.82, '#173A63', { opacity: 0.92 }),
      L(W, H * 0.08, H * 0.1, 'Pinterest', { fontFamily: 'Sacramento', fill: '#8FB4D9', textTransform: 'none', x: W * 0.12, width: W * 0.76, wordCount: 1 }),
      L(W, H * 0.19, H * 0.1, 'Marketing', { fontFamily: 'Oswald', fontWeight: 700, fill: '#173A63', rotation: -3, x: W * 0.02, width: W * 0.96, background: bgOn('#F2B8C6', { hug: true, paddingX: 20, paddingY: 4 }), wordCount: 1 }),
      L(W, H * 0.31, H * 0.1, 'Is Simple!', { fontFamily: 'Sacramento', fill: '#8FB4D9', textTransform: 'none', x: W * 0.12, width: W * 0.76 }),
      S(W * 0.15, H * 0.5, W * 0.7, H * 0.05, 'With lovely Pin designs', { fontFamily: 'Oswald', fontWeight: 600, fill: '#8FB4D9', textTransform: 'uppercase' }),
      S(W * 0.15, H * 0.55, W * 0.7, H * 0.05, 'like these!', { fontFamily: 'Sacramento', fill: '#8FB4D9' }),
      footer(W, H, 'plain-light', { y: H * 0.76, height: H * 0.035, fill: '#8FB4D9', fontSize: H * 0.016 }),
    ],
  }),
  tpl({
    id: 'cv-white-card-bottom',
    name: 'White Caption Card at the Bottom',
    description: 'One photo with a crisp white card near the bottom holding heavy black caps, and a fresh green website bar.',
    family: 7,
    categories: ['Home Decor', 'Lifestyle'],
    designTypes: ['single-image', 'image-text-panel'],
    ...BLOG,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      rect(W * 0.07, H * 0.66, W * 0.86, H * 0.28, '#FFFFFF'),
      L(W, H * 0.68, H * 0.06, 'Cities Where', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#2A1A1A', x: W * 0.1, width: W * 0.8, wordCount: 2 }),
      L(W, H * 0.745, H * 0.06, 'Your Tiny Home', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#2A1A1A', x: W * 0.1, width: W * 0.8, wordCount: 3 }),
      L(W, H * 0.81, H * 0.06, 'Is Secretly', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#2A1A1A', x: W * 0.1, width: W * 0.8, wordCount: 2 }),
      L(W, H * 0.875, H * 0.06, 'Illegal', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#2A1A1A', x: W * 0.1, width: W * 0.8 }),
      ...bar(W, H, '#7FAE5C', '#111111'),
    ],
  }),
  tpl({
    id: 'cv-side-number-band',
    name: 'Band with Side Number Column',
    description: '2 top + 2 bottom photos, a mauve band with a dark number column on the left and left-aligned outlined caps beside it.',
    family: 1,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.22 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      const p = (wordCount?: number): TP => ({ fontFamily: 'Montserrat', fontWeight: 900, fill: '#5B7FA6', ...outline('#1F1F3A', 3), x: W * 0.3, width: W * 0.67, align: 'left', wordCount });
      return [
        bandShape('#A88A98'),
        badge(W * 0.03, b.y(0.08), b.h(0.84), '39', 'square', '#3A1F2B', '#5B7FA6', { fontFamily: 'Archivo Black', width: W * 0.24 }),
        L(W, b.y(0.06), b.h(0.21), 'Dressing Table', p(2)),
        L(W, b.y(0.29), b.h(0.21), 'Ideas That Will', p(3)),
        L(W, b.y(0.52), b.h(0.21), 'Redesign Your', p(2)),
        L(W, b.y(0.75), b.h(0.21), 'Whole Bedroom', p()),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-giant-ghost-number',
    name: 'Giant Faded Number Behind Text',
    description: 'One photo with a huge faded steel-blue number behind amber caps, a thin line and a bold payoff with a script word.',
    family: 6,
    categories: ['Lifestyle', 'Listicle'],
    designTypes: ['single-image', 'image-text-overlay', 'number-badge'],
    ...BLOG,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      N(W * 0.05, H * 0.01, W * 0.9, H * 0.2, '50', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#5B86B8', opacity: 0.8 }),
      L(W, H * 0.09, H * 0.08, 'Side', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#F0B060', wordCount: 1 }),
      L(W, H * 0.17, H * 0.08, 'Hustle', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#F0B060', wordCount: 1 }),
      S(W * 0.08, H * 0.26, W * 0.84, H * 0.045, 'ideas that can make', { fontFamily: 'Poppins', fontWeight: 300, fill: '#8FB4D9' }),
      L(W, H * 0.31, H * 0.08, '$100,000', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#5B86B8' }),
      S(W * 0.4, H * 0.39, W * 0.55, H * 0.05, 'monthly', { fontFamily: 'Great Vibes', fill: '#8FB4D9', align: 'right' }),
      web(W, H, { fill: '#8FB4D9' }),
    ],
  }),
  tpl({
    id: 'cv-polaroid',
    name: 'Polaroid Photo on Mint',
    description: 'Mint background with bold navy serif caps, a soft subtitle and the photo set in a white polaroid frame.',
    family: 7,
    categories: ['Lifestyle', 'Quote', 'Relationship'],
    designTypes: ['image-text-panel'],
    ...BLOG,
    bg: '#9CCBAA',
    collage: { layoutId: 'single', region: { x: 0.15, y: 0.45, width: 0.7, height: 0.3 } },
    layers: ({ W, H }) => [
      turned(W * 0.52, H * 0.62, W * 0.78, H * 0.38, 4, '#E9E6DE'),
      rect(W * 0.11, H * 0.425, W * 0.78, H * 0.025, '#F7F5F0'),
      rect(W * 0.11, H * 0.425, W * 0.04, H * 0.38, '#F7F5F0'),
      rect(W * 0.85, H * 0.425, W * 0.04, H * 0.38, '#F7F5F0'),
      rect(W * 0.11, H * 0.75, W * 0.78, H * 0.055, '#F7F5F0'),
      L(W, H * 0.05, H * 0.075, 'Want Your', { fontFamily: 'DM Serif Display', fill: '#0F3B63', wordCount: 2 }),
      L(W, H * 0.125, H * 0.075, 'Puppy to Love', { fontFamily: 'DM Serif Display', fill: '#0F3B63', wordCount: 3 }),
      L(W, H * 0.2, H * 0.075, 'You?', { fontFamily: 'DM Serif Display', fill: '#0F3B63' }),
      S(W * 0.1, H * 0.3, W * 0.8, H * 0.05, 'Here’s how', { fontFamily: 'Poppins', fill: '#4F78A8' }),
      footer(W, H, 'plain-dark', { y: H * 0.86, fill: '#0F3B63', fontFamily: 'DM Serif Display', fontWeight: 400 }),
    ],
  }),
  tpl({
    id: 'cv-tilted-script-label',
    name: 'Outlined Caps + Tilted Script Label',
    description: 'One photo with steel-blue caps outlined in white at the top and a tilted white label with a script line near the bottom.',
    family: 6,
    categories: ['Lifestyle', 'Relationship'],
    designTypes: ['single-image', 'image-text-overlay', 'script-bold'],
    ...BLOG,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => [
      L(W, H * 0.03, H * 0.075, 'The Scariest', { fontFamily: 'Poppins', fontWeight: 800, fill: '#5B7FA6', ...outline('#FFFFFF', 6), wordCount: 2 }),
      L(W, H * 0.11, H * 0.075, 'Mountain', { fontFamily: 'Poppins', fontWeight: 800, fill: '#5B7FA6', ...outline('#FFFFFF', 6), wordCount: 1 }),
      L(W, H * 0.19, H * 0.075, 'Pass We Have', { fontFamily: 'Poppins', fontWeight: 800, fill: '#5B7FA6', ...outline('#FFFFFF', 6), wordCount: 3 }),
      L(W, H * 0.27, H * 0.075, 'Ever Driven', { fontFamily: 'Poppins', fontWeight: 800, fill: '#5B7FA6', ...outline('#FFFFFF', 6) }),
      turned(W * 0.55, H * 0.84, W * 0.8, H * 0.085, -8, '#FFFFFF'),
      S(W * 0.15, H * 0.8, W * 0.8, H * 0.07, 'And why you should too', { fontFamily: 'Great Vibes', fill: '#4F6F9F', rotation: -8 }),
      ...bar(W, H, '#3A3A3A', '#9DB7D5'),
    ],
  }),
  tpl({
    id: 'cv-green-pill-subtitle',
    name: 'Olive Panel + Big Green Pill',
    description: 'Olive top panel with white caps and a big green pill for the subtitle, two photos side by side underneath.',
    family: 8,
    categories: ['Hair', 'Beauty', 'Fashion'],
    designTypes: ['image-text-panel', 'two-image'],
    ...BLOG,
    collage: { layoutId: 'two-side', gap: 6, region: { x: 0, y: 0.5, width: 1, height: 0.5 } },
    layers: ({ W, H }) => [
      rect(0, 0, W, H * 0.5, '#6E6F52'),
      L(W, H * 0.06, H * 0.075, '32 Stylish', { fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', wordCount: 2 }),
      L(W, H * 0.15, H * 0.075, 'Girl Hairstyles', { fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF' }),
      S(W * 0.06, H * 0.29, W * 0.88, H * 0.13, 'For medium to long hair', {
        fontFamily: 'Poppins', fontWeight: 800, fill: '#FFFFFF', textTransform: 'uppercase', lineHeight: 1.15, fontSize: H * 0.04,
        background: bgOn('#66B15C', { hug: false, shape: 'pill', paddingX: 30, paddingY: 10 }),
      }),
      web(W, H),
    ],
  }),
];

// ---------------------------------------------------------------- more band designs (736 × 1472)


const BANDS = [
  tpl({
    id: 'cv-pp-huge-outlined-keyword',
    name: 'Huge Outlined Keyword, Orange Circle',
    description: '2 top + 2 bottom photos, an orange circle number and a sticker script word, one huge orange outlined keyword and black outlined caps.',
    family: 5,
    categories: ['Lifestyle', 'How-To', 'Listicle'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.3 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#F4F4F2'),
        badge(W * 0.06, b.y(-0.58), b.h(0.76), '20', 'circle', '#F6B04B', '#111111', { fontFamily: 'Anton', ...outline('#FFFFFF', 8) }),
        accent(W * 0.44, b.y(-0.48), W * 0.5, b.h(0.5), 'Fun', sticker()),
        L(W, b.y(0.06), b.h(0.5), 'Crafts', { fontFamily: 'Anton', fill: '#F28C3F', ...outline('#111111', 10), wordCount: 1 }),
        L(W, b.y(0.6), b.h(0.34), 'For Teenagers', { fontFamily: 'Anton', fill: '#111111', ...outline('#FFFFFF', 8) }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-pp-white-circle-outlined-caps',
    name: 'White Circle Number, Outlined Orange Caps',
    description: '2 top + 2 bottom photos, a white circle number and a sticker script word, orange caps outlined in black and a big black last line.',
    family: 5,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.28 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#F4F4F2'),
        badge(W * 0.02, b.y(-0.58), b.h(0.76), '15', 'circle', '#FFFFFF', '#111111', { fontFamily: 'Oswald', fontWeight: 700 }),
        accent(W * 0.4, b.y(-0.48), W * 0.56, b.h(0.5), 'Chic', sticker()),
        L(W, b.y(0.06), b.h(0.44), 'Home Decor', { fontFamily: 'Bebas Neue', fill: '#F28C3F', letterSpacing: 6, ...outline('#111111', 6), wordCount: 2 }),
        L(W, b.y(0.52), b.h(0.46), 'Hacks', { fontFamily: 'Bebas Neue', fill: '#111111', letterSpacing: 6 }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-pp-amber-band-orange-outline',
    name: 'Amber Band, Orange Outlined Caps',
    description: '2 top + 2 bottom photos, an amber band with a matching circle number, a sticker script word, orange outlined caps and a black outlined last word.',
    family: 5,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.3 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#F6B94F'),
        badge(0, b.y(-0.58), b.h(0.76), '15', 'circle', '#F6B94F', '#111111', { fontFamily: 'Anton', ...outline('#FFFFFF', 8) }),
        accent(W * 0.42, b.y(-0.48), W * 0.52, b.h(0.5), 'Stylish', sticker()),
        L(W, b.y(0.12), b.h(0.36), 'Indoor Plant', { fontFamily: 'Anton', fill: '#F28C3F', ...outline('#111111', 8), wordCount: 2 }),
        L(W, b.y(0.54), b.h(0.38), 'Tips', { fontFamily: 'Anton', fill: '#111111', ...outline('#FFFFFF', 8) }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-pp-two-tone-line',
    name: 'One Photo Top & Bottom, Two-Tone Line',
    description: 'A photo above and one below an amber band; black circle number, sticker script word, one line in white then black, and a big black last line.',
    family: 5,
    categories: ['Lifestyle', 'Listicle'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...BLOG,
    collage: { layoutId: 'band-1-1', gap: 6, band: 0.28 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#F6B94F'),
        badge(W * 0.03, b.y(-0.58), b.h(0.76), '15', 'circle', '#111111', '#FFFFFF', { fontFamily: 'Oswald', fontWeight: 700 }),
        accent(W * 0.4, b.y(-0.48), W * 0.56, b.h(0.5), 'Compact', sticker()),
        L(W, b.y(0.14), b.h(0.36), 'Home', { fontFamily: 'Bebas Neue', fill: '#FFFFFF', x: W * 0.02, width: W * 0.4, align: 'right', wordCount: 1 }),
        L(W, b.y(0.14), b.h(0.36), 'Fitness', { fontFamily: 'Bebas Neue', fill: '#111111', x: W * 0.44, width: W * 0.54, align: 'left', wordCount: 1 }),
        L(W, b.y(0.55), b.h(0.4), 'Solutions', { fontFamily: 'Bebas Neue', fill: '#111111' }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-pp-one-top-two-bottom',
    name: 'Wide Photo Top, Amber Band, Two Below',
    description: 'One wide photo on top and two below an amber band; black circle number, sticker script word, white caps over black caps.',
    family: 5,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...BLOG,
    collage: { layoutId: 'band-1-2', gap: 6, band: 0.28 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#F6B94F'),
        badge(W * 0.02, b.y(-0.58), b.h(0.76), '30', 'circle', '#111111', '#FFFFFF', { fontFamily: 'Montserrat', fontWeight: 800 }),
        accent(W * 0.44, b.y(-0.48), W * 0.54, b.h(0.5), 'Gorgeous', sticker()),
        L(W, b.y(0.1), b.h(0.4), 'Baby Breath', { fontFamily: 'Bebas Neue', fill: '#FFFFFF', wordCount: 2 }),
        L(W, b.y(0.56), b.h(0.34), 'Centerpiece Ideas', { fontFamily: 'Bebas Neue', fill: '#111111' }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-pp-outlined-number-white-band',
    name: 'Outlined Number, Clean White Band',
    description: 'One photo on top and two below a white band; an outlined number in a white circle, sticker script word and two big black lines.',
    family: 5,
    categories: ['Lifestyle', 'Listicle', 'Custom Blog Pin'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...BLOG,
    collage: { layoutId: 'band-1-2', gap: 6, band: 0.28 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#FFFFFF'),
        badge(0, b.y(-0.58), b.h(0.76), '15', 'circle', '#FFFFFF', '#FFFFFF', { fontFamily: 'Oswald', fontWeight: 700, ...outline('#111111', 6) }),
        accent(W * 0.4, b.y(-0.48), W * 0.52, b.h(0.5), 'Simple', sticker()),
        L(W, b.y(0.1), b.h(0.4), 'Money Making', { fontFamily: 'Bebas Neue', fill: '#111111', wordCount: 2 }),
        L(W, b.y(0.54), b.h(0.4), 'Side Hustles', { fontFamily: 'Bebas Neue', fill: '#111111' }),
        web(W, H),
      ];
    },
  }),
  tpl({
    id: 'cv-pp-olive-band-outlined',
    name: 'Olive Band with Black Edges, Outlined Caps',
    description: '2 top + 2 bottom photos, an olive band edged in black with three lines of white caps outlined in black.',
    family: 1,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['split'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.27 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#5E6B2E'),
        rect(0, b.y(0) - 4, W, 8, '#111111', { name: 'Band edge' }),
        rect(0, b.y(1) - 4, W, 8, '#111111', { name: 'Band edge' }),
        L(W, b.y(0.06), b.h(0.27), '15 Creative', { fontFamily: 'Archivo Black', fill: '#FFFFFF', ...outline('#111111', 6), wordCount: 2 }),
        L(W, b.y(0.37), b.h(0.27), 'Vertical Garden', { fontFamily: 'Archivo Black', fill: '#FFFFFF', ...outline('#111111', 6), wordCount: 2 }),
        L(W, b.y(0.68), b.h(0.27), 'Grocery List', { fontFamily: 'Archivo Black', fill: '#FFFFFF', ...outline('#111111', 6) }),
        web(W, H),
      ];
    },
  }),
];

// ---------------------------------------------------------------- photo-overlay & panel designs (736 × 1472)

const BLUE = '#5B86A8';
const RUST = '#C0563B';
const BROWN_BAR = '#5A4A3A';
/** Bold rounded caps outlined in a contrasting colour — the go-to look for text straight on a photo. */
const bold = (fill: string, ring: string, p: TP = {}): TP => ({ fontFamily: 'Montserrat', fontWeight: 900, fill, ...outline(ring, 7), ...p });
const FULL = { layoutId: 'single' } as const;

const OVERLAYS = [
  tpl({
    id: 'cv-ov-big-number-money',
    name: 'Huge Number, Amber Caps & Big Money Line',
    description: 'One photo: a giant blue number, two huge amber lines, a thin lowercase connector, a giant blue money figure and an italic last word.',
    family: 6,
    categories: ['Lifestyle', 'Listicle', 'Custom Blog Pin'],
    designTypes: ['single-image', 'image-text-overlay'],
    ...BLOG,
    collage: FULL,
    layers: ({ W, H }) => [
      N(W * 0.2, H * 0.01, W * 0.6, H * 0.15, '50', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#5B7FA6' }),
      L(W, H * 0.17, H * 0.11, 'Side', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#F2AE55', wordCount: 1 }),
      L(W, H * 0.27, H * 0.11, 'Hustle', { fontFamily: 'Montserrat', fontWeight: 900, fill: '#F2AE55', wordCount: 1 }),
      L(W, H * 0.375, H * 0.05, 'ideas that can make', { fontFamily: 'Raleway', fontWeight: 300, fill: '#5B7FA6', textTransform: 'lowercase', wordCount: 4 }),
      L(W, H * 0.43, H * 0.1, '$100,000', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#5B7FA6', wordCount: 1 }),
      L(W, H * 0.525, H * 0.05, 'monthly', { fontFamily: 'Raleway', fontWeight: 300, italic: true, fill: '#5B7FA6', textTransform: 'lowercase', x: W * 0.4, width: W * 0.56, align: 'right' }),
      ...bar(W, H, BROWN_BAR, '#7DA3C7'),
    ],
  }),
  tpl({
    id: 'cv-ov-white-top-yellow',
    name: 'White Top, Yellow Outlined Caps',
    description: 'A white top with a yellow outlined line and one huge yellow outlined keyword, one big photo below and the website on the photo.',
    family: 7,
    categories: ['Lifestyle', 'How-To', 'Relationship'],
    designTypes: ['image-text-panel'],
    ...BLOG,
    collage: { layoutId: 'single', region: { x: 0, y: 0.32, width: 1, height: 0.68 } },
    layers: ({ W, H }) => [
      L(W, H * 0.04, H * 0.06, 'How to Build', { fontFamily: 'Archivo Black', fill: '#F7D23E', ...outline('#111111', 5), wordCount: 3 }),
      L(W, H * 0.11, H * 0.1, 'Confidence', { fontFamily: 'Archivo Black', fill: '#F7E23E', ...outline('#111111', 6) }),
      web(W, H, { fontFamily: 'Archivo Black', fill: '#2F4F7A', ...outline('#FFFFFF', 5), fontSize: H * 0.03, letterSpacing: 1, textTransform: 'none' }),
    ],
  }),
  tpl({
    id: 'cv-ov-two-colour-outline-stack',
    name: 'Two-Colour Outlined Stack on Photo',
    description: 'One photo with a tall stack: rust caps outlined in black on top, big blue caps outlined in white below, a smaller serif pair and a huge last word.',
    family: 6,
    categories: ['Home Decor', 'How-To', 'Listicle'],
    designTypes: ['single-image', 'image-text-overlay'],
    ...BLOG,
    collage: FULL,
    layers: ({ W, H }) => [
      N(W * 0.3, H * 0.02, W * 0.4, H * 0.12, '9', bold(RUST, '#111111', { strokeWidth: 9 })),
      L(W, H * 0.15, H * 0.1, 'Ways', bold(RUST, '#111111', { wordCount: 1 })),
      L(W, H * 0.33, H * 0.12, 'Your', bold(BLUE, '#FFFFFF', { strokeWidth: 9, wordCount: 1 })),
      L(W, H * 0.48, H * 0.12, 'DIY', bold(BLUE, '#FFFFFF', { strokeWidth: 9, wordCount: 1 })),
      L(W, H * 0.68, H * 0.06, 'Tiny Home', { fontFamily: 'DM Serif Display', fill: BLUE, ...outline('#FFFFFF', 5), wordCount: 2 }),
      L(W, H * 0.76, H * 0.06, 'Could Fail', bold(BLUE, '#FFFFFF', { wordCount: 2 })),
      L(W, H * 0.84, H * 0.09, 'Inspection', bold(BLUE, '#FFFFFF', { strokeWidth: 8 })),
      ...bar(W, H, BROWN_BAR, '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-ov-black-caps-white-ring',
    name: 'Black Caps with White Outline, Top & Bottom',
    description: 'One photo with heavy black caps outlined in white: four lines at the top, two at the bottom, a dark footer.',
    family: 6,
    categories: ['Home Decor', 'Lifestyle'],
    designTypes: ['single-image', 'image-text-overlay'],
    ...BLOG,
    collage: FULL,
    layers: ({ W, H }) => [
      L(W, H * 0.01, H * 0.1, 'This', bold('#111111', '#FFFFFF', { wordCount: 1 })),
      L(W, H * 0.105, H * 0.1, 'Ultra', bold('#111111', '#FFFFFF', { wordCount: 1 })),
      L(W, H * 0.2, H * 0.08, 'Modern', bold('#111111', '#FFFFFF', { wordCount: 1 })),
      L(W, H * 0.28, H * 0.08, 'Tiny House', bold('#111111', '#FFFFFF', { wordCount: 2 })),
      L(W, H * 0.8, H * 0.075, 'Will Blow', bold('#111111', '#FFFFFF', { wordCount: 2 })),
      L(W, H * 0.875, H * 0.075, 'Your Minds', bold('#111111', '#FFFFFF')),
      ...bar(W, H, '#2A2A2A', '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'cv-ov-orange-caps-stack',
    name: 'Orange Outlined Caps Stack',
    description: 'One photo with six lines of orange caps outlined in black across the top half.',
    family: 6,
    categories: ['Home Decor', 'How-To', 'Lifestyle'],
    designTypes: ['single-image', 'image-text-overlay'],
    ...BLOG,
    collage: FULL,
    layers: ({ W, H }) => [
      L(W, H * 0.01, H * 0.07, 'This Common', bold('#F7931E', '#111111', { wordCount: 2 })),
      L(W, H * 0.085, H * 0.07, 'Watering', bold('#F7931E', '#111111', { wordCount: 1 })),
      L(W, H * 0.16, H * 0.07, 'Habit', bold('#F7931E', '#111111', { wordCount: 1 })),
      L(W, H * 0.24, H * 0.065, 'Is Why All', bold('#F7931E', '#111111', { wordCount: 3 })),
      L(W, H * 0.31, H * 0.065, 'Your Plants', bold('#F7931E', '#111111', { wordCount: 2 })),
      L(W, H * 0.38, H * 0.065, 'Keep Dying', bold('#F7931E', '#111111')),
      ...bar(W, H, BROWN_BAR, '#7DA3C7'),
    ],
  }),
  tpl({
    id: 'cv-ov-rust-panel-six-grid',
    name: 'Rust Panel Between a Wide Photo and Six Tiles',
    description: 'A wide photo on top, a rust panel with five lines of blue caps outlined in black, then six small photos in a 3×2 grid.',
    family: 1,
    categories: ['Home Decor', 'How-To', 'Listicle'],
    designTypes: ['image-text-panel'],
    ...BLOG,
    collage: { layoutId: 'hero-top-grid-6', gap: 6 },
    layers: ({ W, H }) => [
      rect(0, H * 0.265, W, H * 0.37, '#B5452F', { name: 'Panel' }),
      L(W, H * 0.28, H * 0.065, 'The Devastating', bold(BLUE, '#111111', { strokeWidth: 5, wordCount: 2 })),
      L(W, H * 0.35, H * 0.065, 'Truth About', bold(BLUE, '#111111', { strokeWidth: 5, wordCount: 2 })),
      L(W, H * 0.42, H * 0.065, 'Tiny Home', bold(BLUE, '#111111', { strokeWidth: 5, wordCount: 2 })),
      L(W, H * 0.49, H * 0.065, 'Plumbing Nobody', bold(BLUE, '#111111', { strokeWidth: 5, wordCount: 2 })),
      L(W, H * 0.56, H * 0.065, 'Warns You About', bold(BLUE, '#111111', { strokeWidth: 5 })),
      ...bar(W, H, BROWN_BAR, '#7DA3C7'),
    ],
  }),
  tpl({
    id: 'cv-ov-orange-card-grid',
    name: 'Orange Card on a Grid, Marker Number',
    description: '2×2 photos with a framed orange card: a white circle with a marker number, a spaced marker word, blue caps with a black highlight and outlined lines.',
    family: 3,
    categories: ['Fashion', 'Lifestyle', 'Listicle'],
    designTypes: ['collage-4', 'number-badge'],
    ...BLOG,
    collage: { layoutId: 'grid-2x2', gap: 6 },
    layers: ({ W, H }) => [
      rect(W * 0.1, H * 0.33, W * 0.8, H * 0.33, '#F2B35A', { cornerRadius: 18, stroke: '#7A3B2A', strokeWidth: 5 }),
      badge(W * 0.12, H * 0.27, W * 0.26, '15', 'circle', '#FFFFFF', BLUE, { fontFamily: 'Permanent Marker' }),
      accent(W * 0.42, H * 0.37, W * 0.46, H * 0.05, 'Stunning', { fontFamily: 'Permanent Marker', fill: BLUE, textTransform: 'uppercase', letterSpacing: 4 }),
      L(W, H * 0.44, H * 0.07, '80s Party', { fontFamily: 'Bebas Neue', fill: BLUE, x: W * 0.14, width: W * 0.72, background: bgOn('#111111', { hug: true, paddingX: 10, paddingY: 0 }), wordCount: 2 }),
      L(W, H * 0.515, H * 0.065, 'Outfit Ideas For', { fontFamily: 'Bebas Neue', fill: BLUE, ...outline('#FFFFFF', 5), x: W * 0.14, width: W * 0.72, wordCount: 3 }),
      L(W, H * 0.58, H * 0.065, 'Plus-Size', { fontFamily: 'Bebas Neue', fill: BLUE, ...outline('#FFFFFF', 5), x: W * 0.14, width: W * 0.72 }),
      ...bar(W, H, BROWN_BAR, BLUE, { textTransform: 'none', fontFamily: 'Archivo Black' }),
    ],
  }),
  tpl({
    id: 'cv-ov-caption-card-script',
    name: 'Outlined Caps + Tilted Script Card',
    description: 'One photo with five lines of rounded blue caps outlined in white and a tilted white card holding a script subtitle.',
    family: 6,
    categories: ['Lifestyle', 'Custom Blog Pin'],
    designTypes: ['single-image', 'image-text-overlay', 'script-bold'],
    ...BLOG,
    collage: FULL,
    layers: ({ W, H }) => [
      L(W, H * 0.02, H * 0.07, 'The Scariest', bold(BLUE, '#FFFFFF', { wordCount: 2 })),
      L(W, H * 0.095, H * 0.07, 'Mountain', bold(BLUE, '#FFFFFF', { wordCount: 1 })),
      L(W, H * 0.17, H * 0.07, 'Pass We', bold(BLUE, '#FFFFFF', { wordCount: 2 })),
      L(W, H * 0.245, H * 0.07, 'Have Ever', bold(BLUE, '#FFFFFF', { wordCount: 2 })),
      L(W, H * 0.32, H * 0.07, 'Driven', bold(BLUE, '#FFFFFF')),
      turned(W * 0.5, H * 0.84, W * 0.84, H * 0.11, -8, '#FFFFFF', { name: 'Note card' }),
      S(...turnedBox(W * 0.5, H * 0.84, W * 0.76, H * 0.09, -8), 'And Why You Should Too', { fontFamily: 'Allura', fill: BLUE, rotation: -8, fontSize: H * 0.045, lineHeight: 1.1 }),
      ...bar(W, H, BROWN_BAR, '#7DA3C7'),
    ],
  }),
  tpl({
    id: 'cv-ov-taupe-band-purple',
    name: 'Taupe Band, Purple & Red Outlined Caps',
    description: 'A photo above and below a taupe band: a huge purple number on the photo edge, red and purple caps outlined in white.',
    family: 5,
    categories: ['Lifestyle', 'How-To', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    ...BLOG,
    collage: { layoutId: 'band-1-1', gap: 6, band: 0.27 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#A89580'),
        N(W * 0.02, b.y(-0.32), W * 0.36, b.h(0.5), '31', bold('#6B3F75', '#FFFFFF', { strokeWidth: 9 })),
        L(W, b.y(0.03), b.h(0.24), 'Screen-Free', bold('#F0453A', '#FFFFFF', { x: W * 0.36, width: W * 0.6, wordCount: 1 })),
        L(W, b.y(0.36), b.h(0.26), 'Toddler Fun', bold('#6B3F75', '#FFFFFF', { wordCount: 2 })),
        L(W, b.y(0.66), b.h(0.26), 'Activities', bold('#6B3F75', '#FFFFFF')),
        web(W, H, { fontFamily: 'Archivo Black', fill: '#FFFFFF', ...outline('#111111', 5), fontSize: H * 0.026 }),
      ];
    },
  }),
  tpl({
    id: 'cv-ov-green-box-collage',
    name: 'Framed Green Box over a Collage',
    description: 'A photo collage with a green box in a white frame: a big blue number, a blue script word and blue caps with a dark drop shadow.',
    family: 3,
    categories: ['Home Decor', 'Fall Decor', 'Listicle'],
    designTypes: ['collage-4', 'script-bold'],
    ...BLOG,
    collage: { layoutId: 'grid-2x2', gap: 6 },
    layers: ({ W, H }) => [
      rect(W * 0.08, H * 0.165, W * 0.84, H * 0.25, '#557D4E', { stroke: '#FFFFFF', strokeWidth: 10 }),
      N(W * 0.12, H * 0.18, W * 0.28, H * 0.09, '41', { fontFamily: 'Montserrat', fontWeight: 900, fill: BLUE, shadow: hard('#2A3A2A', 3, 3) }),
      L(W, H * 0.19, H * 0.07, 'Farmhouse', { fontFamily: 'Allura', fill: BLUE, textTransform: 'none', x: W * 0.42, width: W * 0.48, wordCount: 1 }),
      L(W, H * 0.28, H * 0.065, 'Christmas', { fontFamily: 'Archivo Black', fill: BLUE, shadow: hard('#2A3A2A', 3, 3), x: W * 0.1, width: W * 0.8, wordCount: 1 }),
      L(W, H * 0.345, H * 0.055, 'Decor Ideas', { fontFamily: 'Archivo Black', fill: BLUE, shadow: hard('#2A3A2A', 3, 3), x: W * 0.1, width: W * 0.8 }),
      ...bar(W, H, BROWN_BAR, BLUE, { textTransform: 'none' }),
    ],
  }),
  tpl({
    id: 'cv-ov-two-tone-why',
    name: 'Two-Tone Outlined Question, Top & Bottom',
    description: 'One photo: a big brown word outlined in black, blue caps outlined in white at the top and brown outlined caps at the bottom.',
    family: 6,
    categories: ['Lifestyle', 'Custom Blog Pin'],
    designTypes: ['single-image', 'image-text-overlay'],
    ...BLOG,
    collage: FULL,
    layers: ({ W, H }) => [
      L(W, H * 0.005, H * 0.09, 'Why', bold('#8A6A5A', '#111111', { x: W * 0.02, width: W * 0.42, align: 'left', strokeWidth: 8, wordCount: 1 })),
      L(W, H * 0.02, H * 0.06, '58% of', bold(BLUE, '#FFFFFF', { x: W * 0.46, width: W * 0.52, align: 'left', wordCount: 2 })),
      L(W, H * 0.1, H * 0.06, "Americans Can't", bold(BLUE, '#FFFFFF', { wordCount: 2 })),
      L(W, H * 0.165, H * 0.06, 'Afford To', bold(BLUE, '#FFFFFF', { wordCount: 2 })),
      L(W, H * 0.23, H * 0.06, 'Travel Anymore:', bold(BLUE, '#FFFFFF', { wordCount: 2 })),
      L(W, H * 0.78, H * 0.055, 'The Shocking Math', bold('#8A6A5A', '#111111', { strokeWidth: 5, wordCount: 3 })),
      L(W, H * 0.835, H * 0.055, "Behind 2025's", bold('#8A6A5A', '#111111', { strokeWidth: 5, wordCount: 2 })),
      L(W, H * 0.89, H * 0.055, 'Travel Price Crisis', bold('#8A6A5A', '#111111', { strokeWidth: 5 })),
      ...bar(W, H, '#2A2A2A', '#7DA3C7'),
    ],
  }),
  tpl({
    id: 'cv-ov-brown-panel-tab',
    name: 'Brown Panel with Number Tab',
    description: 'A photo above and below a brown panel with a raised tab holding a blue number, and four lines of blue caps outlined in black.',
    family: 5,
    categories: ['Home Decor', 'Listicle'],
    designTypes: ['split', 'number-badge'],
    ...BLOG,
    collage: { layoutId: 'band-1-1', gap: 0, band: 0.36 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#5E4B3C'),
        rect(0, b.y(-0.12), W * 0.3, b.h(0.14), '#5E4B3C', { cornerRadius: 24, name: 'Tab' }),
        N(W * 0.04, b.y(-0.1), W * 0.24, b.h(0.24), '15', bold(BLUE, '#111111', { strokeWidth: 6 })),
        L(W, b.y(0.2), b.h(0.18), 'Tiny House', bold(BLUE, '#111111', { strokeWidth: 5, wordCount: 2 })),
        L(W, b.y(0.39), b.h(0.18), 'Minimalist Decor', bold(BLUE, '#111111', { strokeWidth: 5, wordCount: 2 })),
        L(W, b.y(0.58), b.h(0.18), 'Ideas Everyone', bold(BLUE, '#111111', { strokeWidth: 5, wordCount: 2 })),
        L(W, b.y(0.77), b.h(0.18), 'Gets Wrong', bold(BLUE, '#111111', { strokeWidth: 5 })),
        ...bar(W, H, BROWN_BAR, BLUE),
      ];
    },
  }),
  tpl({
    id: 'cv-ov-script-red-mix',
    name: 'Chunky Blue Caps + Red Script, Side Website',
    description: 'One photo with chunky blue words outlined in black, a thin red script word and a red sans line, and the website running up the left edge.',
    family: 6,
    categories: ['Lifestyle', 'Relationship'],
    designTypes: ['single-image', 'image-text-overlay', 'script-bold'],
    ...BLOG,
    collage: FULL,
    layers: ({ W, H }) => [
      L(W, H * 0.03, H * 0.08, 'How', { fontFamily: 'Archivo Black', fill: BLUE, ...outline('#111111', 7), textTransform: 'none', x: W * 0.04, width: W * 0.5, align: 'left', wordCount: 1 }),
      L(W, H * 0.045, H * 0.09, 'To', { fontFamily: 'Great Vibes', fill: '#E3262E', textTransform: 'none', ...outline('#FFFFFF', 4), x: W * 0.52, width: W * 0.3, align: 'left', wordCount: 1 }),
      L(W, H * 0.12, H * 0.08, 'Say', { fontFamily: 'Archivo Black', fill: BLUE, ...outline('#111111', 7), wordCount: 1 }),
      L(W, H * 0.2, H * 0.08, 'Goodbye', { fontFamily: 'Archivo Black', fill: BLUE, ...outline('#111111', 7), wordCount: 1 }),
      L(W, H * 0.29, H * 0.05, 'to Your Pet Without', { fontFamily: 'Poppins', fontWeight: 600, fill: '#E3262E', ...outline('#FFFFFF', 5), textTransform: 'none', wordCount: 4 }),
      L(W, H * 0.35, H * 0.09, 'Falling', { fontFamily: 'Archivo Black', fill: BLUE, ...outline('#111111', 8), wordCount: 1 }),
      L(W, H * 0.44, H * 0.09, 'Apart', { fontFamily: 'Archivo Black', fill: BLUE, ...outline('#111111', 8) }),
      footer(W, H, 'over-image', {
        rotation: -90, x: W * 0.015, y: H * 0.94, width: H * 0.24, height: W * 0.05,
        fontFamily: 'Archivo Black', fill: '#2F4F7A', fontSize: W * 0.032, letterSpacing: 1, align: 'center',
      }),
    ],
  }),
  tpl({
    id: 'cv-ov-olive-mixed-case',
    name: 'Olive Mixed-Case Stack Outlined in White',
    description: 'One photo: an olive number, two mixed-case words, olive caps outlined in white above and below the subject.',
    family: 6,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['single-image', 'image-text-overlay'],
    ...BLOG,
    collage: FULL,
    layers: ({ W, H }) => [
      N(W * 0.3, H * 0.01, W * 0.4, H * 0.1, '13', bold('#8A8A2E', '#FFFFFF', { strokeWidth: 8 })),
      L(W, H * 0.11, H * 0.06, 'Brutal', { fontFamily: 'Poppins', fontWeight: 600, fill: '#8A8A2E', ...outline('#FFFFFF', 6), textTransform: 'none', wordCount: 1 }),
      L(W, H * 0.17, H * 0.06, 'Reasons', { fontFamily: 'Poppins', fontWeight: 600, fill: '#8A8A2E', ...outline('#FFFFFF', 6), textTransform: 'none', wordCount: 1 }),
      L(W, H * 0.23, H * 0.065, 'Why You', bold('#8A8A2E', '#FFFFFF', { wordCount: 2 })),
      L(W, H * 0.3, H * 0.065, 'Should', bold('#8A8A2E', '#FFFFFF', { wordCount: 1 })),
      L(W, H * 0.76, H * 0.06, 'Retire In A Tiny', bold('#8A8A2E', '#FFFFFF', { wordCount: 4 })),
      L(W, H * 0.825, H * 0.06, 'House', bold('#8A8A2E', '#FFFFFF')),
      web(W, H, { fontFamily: 'Archivo Black', fill: '#2F2F6A', ...outline('#FFFFFF', 5), fontSize: H * 0.026 }),
    ],
  }),
  tpl({
    id: 'cv-ov-mixed-sizes-blue',
    name: 'Blue Mixed-Size Lines Outlined in Black',
    description: 'One photo with blue lines outlined in black: a tall condensed first word, big mixed-case lines, smaller middle lines and a big closing line.',
    family: 6,
    categories: ['Lifestyle', 'How-To'],
    designTypes: ['single-image', 'image-text-overlay'],
    ...BLOG,
    collage: FULL,
    layers: ({ W, H }) => [
      L(W, H * 0.01, H * 0.09, 'Your', { fontFamily: 'Anton', fill: BLUE, ...outline('#111111', 7), textTransform: 'none', wordCount: 1 }),
      L(W, H * 0.11, H * 0.07, 'Dog Needs', bold(BLUE, '#111111', { textTransform: 'none', wordCount: 2 })),
      L(W, H * 0.18, H * 0.07, 'More', bold(BLUE, '#111111', { textTransform: 'none', wordCount: 1 })),
      L(W, H * 0.27, H * 0.05, 'Exercise Than', bold(BLUE, '#111111', { textTransform: 'none', strokeWidth: 5, wordCount: 2 })),
      L(W, H * 0.325, H * 0.05, 'You Have Time', bold(BLUE, '#111111', { textTransform: 'none', strokeWidth: 5, wordCount: 3 })),
      L(W, H * 0.38, H * 0.05, 'For', bold(BLUE, '#111111', { textTransform: 'none', strokeWidth: 5, wordCount: 1 })),
      L(W, H * 0.86, H * 0.07, "Here's the Fix", bold(BLUE, '#111111', { textTransform: 'none' })),
      ...bar(W, H, '#2A2A2A', '#7DA3C7'),
    ],
  }),
  tpl({
    id: 'cv-ov-slate-band-script',
    name: 'Slate Band, Big Number + Script on Photos',
    description: '2 top + 2 bottom photos: a big blue number and a white script word on the photos, a slate band with outlined blue caps and a big closing line.',
    family: 5,
    categories: ['Home Decor', 'Living Room', 'Listicle'],
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...BLOG,
    collage: { ...BAND_PP, band: 0.24 },
    layers: ({ W, H, band }) => {
      const b = inBand(band);
      return [
        bandShape('#3E4A5E'),
        N(W * 0.06, b.y(-0.5), W * 0.4, b.h(0.46), '12', bold(BLUE, '#FFFFFF', { strokeWidth: 8 })),
        L(W, b.y(-0.62), b.h(0.6), 'Paint', { fontFamily: 'Allura', fill: '#FFFFFF', textTransform: 'none', ...outline('#5A4A5A', 4), x: W * 0.48, width: W * 0.48, wordCount: 1 }),
        L(W, b.y(0.04), b.h(0.18), 'Color Mistakes', bold(BLUE, '#111111', { strokeWidth: 4, wordCount: 2 })),
        L(W, b.y(0.23), b.h(0.18), "That're Making Your", bold(BLUE, '#111111', { strokeWidth: 4, wordCount: 3 })),
        L(W, b.y(0.42), b.h(0.18), 'Home Look', bold(BLUE, '#111111', { strokeWidth: 4, wordCount: 2 })),
        L(W, b.y(0.64), b.h(0.32), '10 Years Older', { fontFamily: 'Archivo Black', fill: BLUE, ...outline('#FFFFFF', 6), textTransform: 'none' }),
        web(W, H, { fontFamily: 'Archivo Black', fill: '#FFFFFF', ...outline('#111111', 5), fontSize: H * 0.026, textTransform: 'none' }),
      ];
    },
  }),
];

export const PACK_STYLE_TEMPLATES = [...TWO_THIRDS, ...HALF, ...BANDS, ...OVERLAYS];
