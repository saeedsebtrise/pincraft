/**
 * Premium Pin designs — the looks Auto Design leads with:
 *
 *  - Clean & minimal: lots of white space, one photo or a calm grid, thin
 *    letter-spaced caps paired with an elegant serif, hairline rules.
 *  - Bold magazine: cover-style mastheads, giant numbers, solid colour
 *    blocks and tight heavy type set flush left.
 *  - Luxury / aesthetic: cream, blush, emerald and black with gold,
 *    serif and italic type, framed and arched photos.
 *
 * No sticker outlines or crowded badges: hierarchy comes from size, weight,
 * spacing and colour. Every line carries words of the user's headline.
 */
import { createShape } from '../model/factory';
import type { Layer, TextLayer } from '../model/types';
import { badge, bgOff, bgOn, footer, SHADOW, titleLine, tpl } from './kit';

type TP = Partial<TextLayer>;

const W0 = 1000;

const rect = (x: number, y: number, w: number, h: number, fill: string, p: Parameters<typeof createShape>[0] = {}): Layer =>
  createShape({ name: 'Shape', role: 'decor', x, y, width: w, height: h, fill, ...p });
const oval = (x: number, y: number, w: number, h: number, fill: string): Layer =>
  createShape({ name: 'Circle', role: 'decor', shape: 'ellipse', x, y, width: w, height: h, fill });
/** Hairline rule. */
const rule = (x: number, y: number, w: number, color: string, h = 2): Layer => rect(x, y, w, h, color, { name: 'Rule' });
/** Thin outline frame (no fill). */
const frame = (x: number, y: number, w: number, h: number, color: string, width = 2): Layer =>
  rect(x, y, w, h, 'transparent', { name: 'Frame', stroke: color, strokeWidth: width });

/** A soft black fade from transparent to `max` opacity, top→bottom (down) or bottom→top (up), built from strips. */
function fade(y: number, h: number, max: number, dir: 'down' | 'up'): Layer[] {
  const n = 32;
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / n;
    const k = dir === 'down' ? t : 1 - t + 1 / n;
    return rect(0, y + (h * i) / n, W0, h / n + 1, '#000000', { name: 'Fade', opacity: max * k * k });
  });
}

/** Headline line set at (x, w): no box, tight leading. */
const line = (x: number, y: number, w: number, h: number, text: string, p: TP = {}) =>
  titleLine(W0, y, h, text, { x, width: w, background: bgOff(), letterSpacing: 0, lineHeight: 1, fontWeight: 400, fontSize: h * 0.9, minFontSize: 16, ...p });
/** Supporting line, filled from the subtitle Auto Design writes for the post. */
const sub = (x: number, y: number, w: number, h: number, text: string, p: TP = {}) =>
  titleLine(W0, y, h, text, {
    name: 'Subtitle line', role: 'subtitle', x, width: w, background: bgOff(), letterSpacing: 3, lineHeight: 1, fontFamily: 'Inter', fontWeight: 400,
    fontSize: h * 0.8, minFontSize: 12, ...p,
  });
/** The list number, set as type (no badge shape). */
const num = (x: number, y: number, w: number, h: number, text: string, p: TP = {}) =>
  badge(x, y, h, text, 'square', '#FFFFFF', '#111111', { x, width: w, height: h, background: bgOff(), lineHeight: 1, fontSize: h * 0.9, ...p });
/** Website line, quiet and letter-spaced. */
const web = (H: number, fill: string, p: TP = {}) =>
  footer(W0, H, 'plain-dark', { y: H * 0.952, height: H * 0.03, fontFamily: 'Inter', fontWeight: 500, fontSize: H * 0.0125, letterSpacing: 5, fill, ...p });

const X = W0 * 0.1; // text column for centred designs
const CW = W0 * 0.8;
const LX = W0 * 0.07; // flush-left column
const LW = W0 * 0.86;

// ---------------------------------------------------------------- clean & minimal

const MINIMAL = [
  tpl({
    id: 'pm-min-cream-frame',
    name: 'Premium — Cream Frame, Thin Caps + Serif',
    description: 'One inset photo on warm cream, a small italic number, thin spaced caps over a large italic serif, hairline rule and a quiet subtitle.',
    family: 7,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['image-text-panel'],
    bg: '#F7F3EE',
    collage: { layoutId: 'single', region: { x: 0.07, y: 0.045, width: 0.86, height: 0.57 } },
    layers: ({ H }) => [
      num(X, H * 0.64, CW, H * 0.045, '25', { fontFamily: 'Cormorant Garamond', fontWeight: 500, italic: true, fill: '#8A7B6A' }),
      line(X, H * 0.695, CW, H * 0.06, 'Cozy Bedroom', { fontFamily: 'Josefin Sans', fontWeight: 300, letterSpacing: 14, fill: '#1C1C1C', wordCount: 2 }),
      line(X, H * 0.765, CW, H * 0.095, 'Decor Ideas', { fontFamily: 'Cormorant Garamond', fontWeight: 600, italic: true, textTransform: 'none', fill: '#1C1C1C' }),
      rule(W0 * 0.45, H * 0.872, W0 * 0.1, '#1C1C1C'),
      sub(X, H * 0.888, CW, H * 0.028, 'For a calm, beautiful space', { textTransform: 'uppercase', fill: '#6B625A' }),
      web(H, '#6B625A'),
    ],
  }),
  tpl({
    id: 'pm-min-left-editorial',
    name: 'Premium — Editorial, Flush Left',
    description: 'A full-width photo over a white panel with a light grey number, a tight heavy sans headline set flush left, a grey subtitle and a short black rule.',
    family: 7,
    categories: ['Lifestyle', 'Home Decor', 'How-To'],
    designTypes: ['image-text-panel'],
    collage: { layoutId: 'single', region: { x: 0, y: 0, width: 1, height: 0.6 } },
    layers: ({ H }) => [
      num(LX, H * 0.63, LW * 0.4, H * 0.055, '25', { fontFamily: 'Inter', fontWeight: 300, fill: '#9A9A9A', align: 'left' }),
      line(LX, H * 0.69, LW, H * 0.085, 'Minimalist Living', { fontFamily: 'Inter', fontWeight: 800, textTransform: 'none', letterSpacing: -1, fill: '#111111', align: 'left', wordCount: 2 }),
      line(LX, H * 0.775, LW, H * 0.085, 'Room Ideas', { fontFamily: 'Inter', fontWeight: 800, textTransform: 'none', letterSpacing: -1, fill: '#111111', align: 'left' }),
      sub(LX, H * 0.872, LW, H * 0.032, 'Simple ways to make it feel calm', { textTransform: 'none', letterSpacing: 0, fill: '#777777', align: 'left' }),
      rule(LX, H * 0.93, W0 * 0.07, '#111111', 4),
      web(H, '#111111', { x: W0 * 0.2, width: W0 * 0.73, align: 'right', y: H * 0.918 }),
    ],
  }),
  tpl({
    id: 'pm-min-two-photos',
    name: 'Premium — Two Photos, Gold Number + Serif',
    description: 'Two photos side by side with white margins, a small gold spaced number, a two-line display serif headline (second line italic) and a spaced subtitle.',
    family: 7,
    categories: ['Hair', 'Beauty', 'Fashion', 'Lifestyle'],
    designTypes: ['image-text-panel', 'two-image'],
    collage: { layoutId: 'two-side', gap: 14, region: { x: 0.06, y: 0.04, width: 0.88, height: 0.56 } },
    layers: ({ H }) => [
      num(X, H * 0.632, CW, H * 0.042, '25', { fontFamily: 'Josefin Sans', fontWeight: 600, letterSpacing: 10, fill: '#B08D57' }),
      line(X, H * 0.685, CW, H * 0.1, 'Spring Outfit', { fontFamily: 'DM Serif Display', textTransform: 'none', fill: '#111111', wordCount: 2 }),
      line(X, H * 0.785, CW, H * 0.1, 'Ideas', { fontFamily: 'DM Serif Display', italic: true, textTransform: 'none', fill: '#111111' }),
      sub(X, H * 0.9, CW, H * 0.026, 'Effortless looks for every day', { fontFamily: 'Josefin Sans', textTransform: 'uppercase', letterSpacing: 6, fill: '#777777' }),
      web(H, '#999999'),
    ],
  }),
  tpl({
    id: 'pm-min-white-card',
    name: 'Premium — White Card with Hairline Frame',
    description: 'A full photo with a white card holding a hairline inner frame: italic number, thin and bold spaced caps and an italic serif subtitle.',
    family: 6,
    categories: ['Home Decor', 'Living Room', 'Lifestyle'],
    designTypes: ['single-image', 'image-text-overlay'],
    collage: { layoutId: 'single' },
    layers: ({ H }) => [
      rect(W0 * 0.1, H * 0.555, W0 * 0.8, H * 0.33, '#FFFFFF', { name: 'Card' }),
      frame(W0 * 0.12, H * 0.57, W0 * 0.76, H * 0.3, '#111111', 1.5),
      num(W0 * 0.14, H * 0.59, W0 * 0.72, H * 0.05, '25', { fontFamily: 'Cormorant Garamond', fontWeight: 500, italic: true, fill: '#111111' }),
      line(W0 * 0.14, H * 0.648, W0 * 0.72, H * 0.07, 'Living Room', { fontFamily: 'Josefin Sans', fontWeight: 300, letterSpacing: 12, fill: '#111111', wordCount: 2 }),
      line(W0 * 0.14, H * 0.722, W0 * 0.72, H * 0.07, 'Decor Ideas', { fontFamily: 'Josefin Sans', fontWeight: 700, letterSpacing: 12, fill: '#111111' }),
      sub(W0 * 0.14, H * 0.81, W0 * 0.72, H * 0.034, 'To make your home feel finished', { fontFamily: 'Cormorant Garamond', fontWeight: 500, italic: true, textTransform: 'none', letterSpacing: 0, fill: '#555555' }),
      web(H, '#FFFFFF', { shadow: SHADOW }),
    ],
  }),
  tpl({
    id: 'pm-min-airy-grid',
    name: 'Premium — Airy Grid, Black Dot Number',
    description: 'Four photos with wide white gutters, a small black circle number at the centre, and a bold-over-light sans headline underneath.',
    family: 3,
    categories: ['Home Decor', 'Food / Recipe', 'Listicle'],
    designTypes: ['collage-4', 'number-badge'],
    collage: { layoutId: 'grid-2x2', gap: 16, margin: 40, region: { x: 0, y: 0, width: 1, height: 0.73 } },
    layers: ({ H }) => [
      badge(W0 / 2 - 60, H * 0.365 - 60, 120, '25', 'circle', '#111111', '#FFFFFF', { fontFamily: 'Inter', fontWeight: 700, fontSize: 52 }),
      line(X, H * 0.745, CW, H * 0.075, 'Kitchen Organization', { fontFamily: 'Inter', fontWeight: 700, textTransform: 'none', letterSpacing: -1, fill: '#111111', wordCount: 2 }),
      line(X, H * 0.82, CW, H * 0.06, 'Ideas That Work', { fontFamily: 'Inter', fontWeight: 300, textTransform: 'none', fill: '#111111' }),
      sub(X, H * 0.895, CW, H * 0.024, 'Tidy, simple and beautiful', { textTransform: 'uppercase', letterSpacing: 4, fill: '#888888' }),
      web(H, '#AAAAAA'),
    ],
  }),
  tpl({
    id: 'pm-min-black-gallery',
    name: 'Premium — Black Gallery Wall',
    description: 'A black page with one inset photo like a gallery print: thin spaced caps above, a large white italic serif below, hairline rule and subtitle.',
    family: 7,
    categories: ['Lifestyle', 'Home Decor', 'Fashion'],
    designTypes: ['image-text-panel'],
    bg: '#111111',
    collage: { layoutId: 'single', region: { x: 0.08, y: 0.2, width: 0.84, height: 0.5 } },
    layers: ({ H }) => [
      num(X, H * 0.045, CW, H * 0.045, '25', { fontFamily: 'Josefin Sans', fontWeight: 300, letterSpacing: 8, fill: '#BBBBBB' }),
      line(X, H * 0.105, CW, H * 0.06, 'The Art of', { fontFamily: 'Josefin Sans', fontWeight: 300, letterSpacing: 12, fill: '#FFFFFF', wordCount: 2 }),
      line(X, H * 0.715, CW, H * 0.1, 'Slow Living', { fontFamily: 'Cormorant Garamond', fontWeight: 500, italic: true, textTransform: 'none', fill: '#FFFFFF' }),
      rule(W0 * 0.46, H * 0.835, W0 * 0.08, '#FFFFFF'),
      sub(X, H * 0.855, CW, H * 0.026, 'Small rituals for a softer life', { textTransform: 'uppercase', letterSpacing: 5, fill: '#BBBBBB' }),
      web(H, '#888888'),
    ],
  }),
];

// ---------------------------------------------------------------- bold magazine

const MAGAZINE = [
  tpl({
    id: 'pm-mag-cover',
    name: 'Premium — Magazine Cover',
    description: 'A full photo styled as a magazine cover: huge condensed masthead and spaced caps at the top, a giant number and heavy flush-left lines over a soft fade at the bottom.',
    family: 6,
    categories: ['Hair', 'Fashion', 'Beauty', 'Lifestyle'],
    designTypes: ['single-image', 'image-text-overlay', 'number-badge'],
    collage: { layoutId: 'single' },
    layers: ({ H }) => [
      ...fade(0, H * 0.3, 0.55, 'up'),
      ...fade(H * 0.55, H * 0.45, 0.75, 'down'),
      line(LX, H * 0.025, LW, H * 0.14, 'Summer', { fontFamily: 'Bebas Neue', letterSpacing: 6, fill: '#FFFFFF', wordCount: 1 }),
      line(LX, H * 0.165, LW, H * 0.04, 'Outfit Ideas', { fontFamily: 'Montserrat', fontWeight: 700, letterSpacing: 10, fill: '#FFFFFF', wordCount: 2 }),
      num(LX, H * 0.64, LW * 0.6, H * 0.18, '25', { fontFamily: 'Bebas Neue', fill: '#FFFFFF', align: 'left' }),
      line(LX, H * 0.815, LW, H * 0.075, 'You Need to Try', { fontFamily: 'Montserrat', fontWeight: 900, textTransform: 'uppercase', fill: '#FFFFFF', align: 'left' }),
      sub(LX, H * 0.895, LW, H * 0.03, 'The looks everyone is saving', { textTransform: 'none', letterSpacing: 0, fontWeight: 500, fill: '#FFFFFF', align: 'left' }),
      web(H, '#FFFFFF', { x: LX, width: LW, align: 'left' }),
    ],
  }),
  tpl({
    id: 'pm-mag-red-block',
    name: 'Premium — Photo + Red Block',
    description: 'A photo over a solid red block with a big white condensed number, heavy white flush-left headline, a thick white rule and the website.',
    family: 7,
    categories: ['Food / Recipe', 'How-To', 'Lifestyle'],
    designTypes: ['image-text-panel', 'number-badge'],
    collage: { layoutId: 'single', region: { x: 0, y: 0, width: 1, height: 0.58 } },
    layers: ({ H }) => [
      rect(0, H * 0.58, W0, H * 0.42, '#D7263D', { name: 'Colour block' }),
      num(LX, H * 0.6, LW * 0.5, H * 0.13, '25', { fontFamily: 'Bebas Neue', fill: '#FFFFFF', align: 'left' }),
      line(LX, H * 0.725, LW, H * 0.08, 'Kitchen Hacks', { fontFamily: 'Archivo Black', fill: '#FFFFFF', align: 'left', wordCount: 2 }),
      line(LX, H * 0.805, LW, H * 0.08, "You'll Love", { fontFamily: 'Archivo Black', fill: '#FFFFFF', align: 'left' }),
      rule(LX, H * 0.905, W0 * 0.14, '#FFFFFF', 7),
      web(H, '#FFFFFF', { x: W0 * 0.3, width: W0 * 0.63, align: 'right', y: H * 0.893 }),
    ],
  }),
  tpl({
    id: 'pm-mag-type-first',
    name: 'Premium — Type First, Giant Words',
    description: 'White top with a red giant number and huge black condensed words set flush left, the last line in red, and two photos underneath.',
    family: 7,
    categories: ['Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['image-text-panel', 'two-image', 'number-badge'],
    collage: { layoutId: 'two-side', gap: 8, region: { x: 0, y: 0.47, width: 1, height: 0.53 } },
    layers: ({ H }) => [
      num(LX, H * 0.03, LW * 0.5, H * 0.14, '25', { fontFamily: 'Anton', fill: '#E63946', align: 'left' }),
      line(LX, H * 0.175, LW, H * 0.135, 'Bold Bedroom', { fontFamily: 'Anton', fill: '#111111', align: 'left', wordCount: 2 }),
      line(LX, H * 0.315, LW, H * 0.135, 'Ideas', { fontFamily: 'Anton', fill: '#E63946', align: 'left' }),
      web(H, '#FFFFFF', { shadow: SHADOW }),
    ],
  }),
  tpl({
    id: 'pm-mag-giant-number',
    name: 'Premium — Giant Yellow Number',
    description: 'A full photo, gently dimmed, with a giant yellow condensed number and two big condensed lines in white and yellow.',
    family: 4,
    categories: ['Hair', 'Lifestyle', 'Listicle', 'Fashion'],
    designTypes: ['single-image', 'image-text-overlay', 'number-badge'],
    collage: { layoutId: 'single' },
    layers: ({ H }) => [
      rect(0, 0, W0, H, '#000000', { name: 'Dim', opacity: 0.22 }),
      ...fade(H * 0.2, H * 0.5, 0.35, 'down'),
      num(LX - 10, H * 0.06, LW * 0.75, H * 0.38, '25', { fontFamily: 'Bebas Neue', fill: '#FFD23F', align: 'left', shadow: SHADOW }),
      line(LX, H * 0.45, LW, H * 0.11, 'Weekend Trips', { fontFamily: 'Bebas Neue', fill: '#FFFFFF', align: 'left', shadow: SHADOW, wordCount: 2 }),
      line(LX, H * 0.56, LW, H * 0.11, 'Worth Taking', { fontFamily: 'Bebas Neue', fill: '#FFD23F', align: 'left', shadow: SHADOW }),
      sub(LX, H * 0.68, LW, H * 0.032, 'Save this for your next escape', { textTransform: 'uppercase', letterSpacing: 4, fontWeight: 600, fill: '#FFFFFF', align: 'left', shadow: SHADOW }),
      web(H, '#FFFFFF', { shadow: SHADOW }),
    ],
  }),
  tpl({
    id: 'pm-mag-cobalt-split',
    name: 'Premium — Cobalt Block, Number Tag',
    description: 'A cobalt top block with a white number tag, two heavy white lines and a light blue closing line, one photo below.',
    family: 7,
    categories: ['Lifestyle', 'How-To', 'Custom Blog Pin'],
    designTypes: ['image-text-panel', 'number-badge'],
    collage: { layoutId: 'single', region: { x: 0, y: 0.47, width: 1, height: 0.53 } },
    layers: ({ H }) => [
      rect(0, 0, W0, H * 0.47, '#1F3FBF', { name: 'Colour block' }),
      badge(LX, H * 0.055, H * 0.065, '25', 'pill', '#FFFFFF', '#1F3FBF', { fontFamily: 'Montserrat', fontWeight: 800, fontSize: H * 0.04 }),
      line(LX, H * 0.15, LW, H * 0.095, 'Morning Habits', { fontFamily: 'Montserrat', fontWeight: 900, textTransform: 'none', letterSpacing: -1, fill: '#FFFFFF', align: 'left', wordCount: 2 }),
      line(LX, H * 0.245, LW, H * 0.095, 'That Change', { fontFamily: 'Montserrat', fontWeight: 900, textTransform: 'none', letterSpacing: -1, fill: '#FFFFFF', align: 'left', wordCount: 2 }),
      line(LX, H * 0.345, LW, H * 0.07, 'Everything', { fontFamily: 'Montserrat', fontWeight: 500, textTransform: 'none', fill: '#C7D2FF', align: 'left' }),
      web(H, '#FFFFFF', { shadow: SHADOW }),
    ],
  }),
  tpl({
    id: 'pm-mag-dark-highlight',
    name: 'Premium — Black Page, Yellow Highlight',
    description: 'A black page with a yellow number, big white condensed caps and the last line on a yellow highlight, three photos below.',
    family: 7,
    categories: ['Lifestyle', 'Fashion', 'Listicle'],
    designTypes: ['image-text-panel', 'three-image', 'number-badge'],
    bg: '#0E0E0E',
    collage: { layoutId: 'three-hero-top', gap: 8, region: { x: 0, y: 0.4, width: 1, height: 0.6 } },
    layers: ({ H }) => [
      num(LX, H * 0.035, LW * 0.5, H * 0.1, '25', { fontFamily: 'Bebas Neue', fill: '#FFE600', align: 'left' }),
      line(LX, H * 0.135, LW, H * 0.11, 'Street Style', { fontFamily: 'Bebas Neue', letterSpacing: 2, fill: '#FFFFFF', align: 'left', wordCount: 2 }),
      line(LX, H * 0.255, LW, H * 0.1, 'Outfit Ideas', {
        fontFamily: 'Bebas Neue', letterSpacing: 2, fill: '#0E0E0E', align: 'left', background: bgOn('#FFE600', { hug: true, paddingX: 14, paddingY: 0 }),
      }),
      web(H, '#FFFFFF', { shadow: SHADOW }),
    ],
  }),
];

// ---------------------------------------------------------------- luxury / aesthetic

const LUXURY = [
  tpl({
    id: 'pm-lux-arch',
    name: 'Premium — Arched Photo on Linen',
    description: 'A rounded arch-shaped photo on linen beige, an italic number, spaced elegant caps over an italic serif line, in warm brown.',
    family: 7,
    categories: ['Hair', 'Beauty', 'Home Decor', 'Lifestyle'],
    designTypes: ['image-text-panel'],
    bg: '#EFE6DA',
    collage: { layoutId: 'single', cornerRadius: 360, region: { x: 0.14, y: 0.045, width: 0.72, height: 0.585 } },
    layers: ({ H }) => [
      num(X, H * 0.65, CW, H * 0.045, '25', { fontFamily: 'Cormorant Garamond', fontWeight: 500, italic: true, fill: '#8C7462' }),
      line(X, H * 0.705, CW, H * 0.065, 'Neutral Home', { fontFamily: 'Italiana', letterSpacing: 10, fill: '#5B4636', wordCount: 2 }),
      line(X, H * 0.775, CW, H * 0.09, 'Decor Ideas', { fontFamily: 'Cormorant Garamond', fontWeight: 600, italic: true, textTransform: 'none', fill: '#5B4636' }),
      sub(X, H * 0.885, CW, H * 0.026, 'Warm, calm and timeless', { fontFamily: 'Italiana', textTransform: 'uppercase', letterSpacing: 5, fill: '#8C7462' }),
      web(H, '#8C7462'),
    ],
  }),
  tpl({
    id: 'pm-lux-emerald-gold',
    name: 'Premium — Emerald & Gold Frame',
    description: 'Deep emerald with an inset photo in a thin gold frame, a gold italic number between hairlines, ivory spaced caps and a gold italic serif.',
    family: 7,
    categories: ['Home Decor', 'Lifestyle', 'Fall Decor'],
    designTypes: ['image-text-panel'],
    bg: '#1E3A32',
    collage: { layoutId: 'single', region: { x: 0.1, y: 0.07, width: 0.8, height: 0.52 } },
    layers: ({ H }) => [
      frame(W0 * 0.083, H * 0.059, W0 * 0.834, H * 0.542, '#C9A96E', 2),
      rule(W0 * 0.3, H * 0.667, W0 * 0.13, '#C9A96E', 1.5),
      rule(W0 * 0.57, H * 0.667, W0 * 0.13, '#C9A96E', 1.5),
      num(W0 * 0.43, H * 0.64, W0 * 0.14, H * 0.055, '25', { fontFamily: 'Cormorant Garamond', fontWeight: 500, italic: true, fill: '#C9A96E' }),
      line(X, H * 0.71, CW, H * 0.065, 'Elegant Dining', { fontFamily: 'Italiana', letterSpacing: 12, fill: '#F3E9D7', wordCount: 2 }),
      line(X, H * 0.78, CW, H * 0.085, 'Room Ideas', { fontFamily: 'Cormorant Garamond', fontWeight: 500, italic: true, textTransform: 'none', fill: '#C9A96E' }),
      sub(X, H * 0.885, CW, H * 0.025, 'For unforgettable evenings', { fontFamily: 'Josefin Sans', fontWeight: 300, textTransform: 'uppercase', letterSpacing: 6, fill: '#F3E9D7' }),
      web(H, '#C9A96E'),
    ],
  }),
  tpl({
    id: 'pm-lux-serif-overlay',
    name: 'Premium — Italic Serif over Photo',
    description: 'A full photo with a soft dark fade, an italic number, a large white italic display serif, hairline rule and spaced subtitle.',
    family: 6,
    categories: ['Hair', 'Beauty', 'Fashion', 'Lifestyle'],
    designTypes: ['single-image', 'image-text-overlay'],
    collage: { layoutId: 'single' },
    layers: ({ H }) => [
      ...fade(H * 0.45, H * 0.55, 0.7, 'down'),
      num(X, H * 0.575, CW, H * 0.05, '25', { fontFamily: 'Cormorant Garamond', fontWeight: 500, italic: true, fill: '#FFFFFF' }),
      line(X, H * 0.635, CW, H * 0.1, 'Soft Glam', { fontFamily: 'Playfair Display', fontWeight: 500, italic: true, textTransform: 'none', fill: '#FFFFFF', wordCount: 2 }),
      line(X, H * 0.735, CW, H * 0.1, 'Makeup Looks', { fontFamily: 'Playfair Display', fontWeight: 500, italic: true, textTransform: 'none', fill: '#FFFFFF' }),
      rule(W0 * 0.46, H * 0.855, W0 * 0.08, '#FFFFFF'),
      sub(X, H * 0.872, CW, H * 0.026, 'Effortless and elegant', { fontFamily: 'Josefin Sans', fontWeight: 300, textTransform: 'uppercase', letterSpacing: 6, fill: '#FFFFFF' }),
      web(H, '#FFFFFF'),
    ],
  }),
  tpl({
    id: 'pm-lux-cream-trio',
    name: 'Premium — Cream Trio, Script + Serif Caps',
    description: 'Three photos with cream margins, a cream circle number on the photo edge, a taupe script word, spaced serif caps and an italic line.',
    family: 5,
    categories: ['Home Decor', 'Living Room', 'Fall Decor'],
    designTypes: ['image-text-panel', 'three-image', 'script-bold'],
    bg: '#F4EDE4',
    collage: { layoutId: 'three-hero-top', gap: 12, region: { x: 0.06, y: 0.04, width: 0.88, height: 0.59 } },
    layers: ({ H }) => [
      badge(W0 / 2 - 58, H * 0.59, 116, '25', 'circle', '#F4EDE4', '#9C7B5F', { fontFamily: 'Cormorant Garamond', fontWeight: 600, italic: true, fontSize: 56 }),
      line(X, H * 0.675, CW, H * 0.075, 'Cozy', { fontFamily: 'Allura', textTransform: 'none', fill: '#9C7B5F', wordCount: 1 }),
      line(X, H * 0.75, CW, H * 0.075, 'Fall Living Room', { fontFamily: 'Cormorant Garamond', fontWeight: 600, letterSpacing: 6, fill: '#3E3128', wordCount: 3 }),
      line(X, H * 0.825, CW, H * 0.06, 'Ideas', { fontFamily: 'Cormorant Garamond', fontWeight: 500, italic: true, textTransform: 'none', fill: '#3E3128' }),
      sub(X, H * 0.9, CW, H * 0.024, 'Warm textures and soft light', { fontFamily: 'Josefin Sans', textTransform: 'uppercase', letterSpacing: 5, fill: '#9C7B5F' }),
      web(H, '#9C7B5F'),
    ],
  }),
  tpl({
    id: 'pm-lux-blush-grid',
    name: 'Premium — Blush Grid, Centre Medallion',
    description: 'Four photos on blush with a cream medallion at the centre holding an italic number, spaced caps and an italic serif line.',
    family: 3,
    categories: ['Hair', 'Beauty', 'Fashion', 'Lifestyle'],
    designTypes: ['collage-4'],
    bg: '#F3E1DC',
    collage: { layoutId: 'grid-2x2', gap: 14, margin: 36 },
    layers: ({ H }) => [
      oval(W0 * 0.24, H * 0.5 - W0 * 0.26, W0 * 0.52, W0 * 0.52, '#F8F1EC'),
      num(W0 * 0.3, H * 0.385, W0 * 0.4, H * 0.06, '25', { fontFamily: 'Cormorant Garamond', fontWeight: 500, italic: true, fill: '#8E5A52' }),
      line(W0 * 0.3, H * 0.452, W0 * 0.4, H * 0.045, 'Romantic Nail', { fontFamily: 'Italiana', letterSpacing: 6, fill: '#4A2F2B', wordCount: 2 }),
      line(W0 * 0.3, H * 0.505, W0 * 0.4, H * 0.08, 'Ideas', { fontFamily: 'DM Serif Display', italic: true, textTransform: 'none', fill: '#4A2F2B' }),
      rule(W0 * 0.46, H * 0.6, W0 * 0.08, '#8E5A52', 1.5),
      web(H, '#FFFFFF', { shadow: SHADOW }),
    ],
  }),
  tpl({
    id: 'pm-lux-noir-gold',
    name: 'Premium — Noir & Gold',
    description: 'A black page with a gold italic number between hairlines, gold spaced caps, an ivory italic serif and a framed photo below.',
    family: 7,
    categories: ['Fashion', 'Home Decor', 'Lifestyle'],
    designTypes: ['image-text-panel'],
    bg: '#0F0F0F',
    collage: { layoutId: 'single', region: { x: 0.08, y: 0.33, width: 0.84, height: 0.575 } },
    layers: ({ H }) => [
      rule(W0 * 0.3, H * 0.065, W0 * 0.13, '#D4B483', 1.5),
      rule(W0 * 0.57, H * 0.065, W0 * 0.13, '#D4B483', 1.5),
      num(W0 * 0.43, H * 0.04, W0 * 0.14, H * 0.05, '25', { fontFamily: 'Cormorant Garamond', fontWeight: 500, italic: true, fill: '#D4B483' }),
      line(X, H * 0.105, CW, H * 0.065, 'Timeless Wardrobe', { fontFamily: 'Italiana', letterSpacing: 12, fill: '#D4B483', wordCount: 2 }),
      line(X, H * 0.175, CW, H * 0.09, 'Essentials', { fontFamily: 'Cormorant Garamond', fontWeight: 500, italic: true, textTransform: 'none', fill: '#F5EFE6' }),
      sub(X, H * 0.275, CW, H * 0.025, 'Pieces you will wear for years', { fontFamily: 'Josefin Sans', fontWeight: 300, textTransform: 'uppercase', letterSpacing: 6, fill: '#BFB5A8' }),
      frame(W0 * 0.065, H * 0.32, W0 * 0.87, H * 0.595, '#D4B483', 1.5),
      web(H, '#D4B483', { y: H * 0.94 }),
    ],
  }),
];

export const PREMIUM_TEMPLATES = [...MINIMAL, ...MAGAZINE, ...LUXURY].map((t) => ({ ...t, premium: true }));
