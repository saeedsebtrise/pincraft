/**
 * "Pin style" templates modelled on high-performing blog Pins:
 *  - decor/balcony/patio headline bands (round number badge, script accent,
 *    distressed keyword, bold caps, rules above and below the band),
 *  - hair "serif stack" Pins (boxed number, stacked serif blocks, italic
 *    subtitle ribbons, line ornaments),
 *  - sticker-outline headlines straight on the photos.
 * Headline words flow into the lines via wordCount (see distributeLines), and
 * subtitle lines fill from the rest of the article title.
 */
import { createShape } from '../model/factory';
import type { Layer, TextLayer } from '../model/types';
import { accent, badge, bandShape, bgOff, bgOn, footer, titleLine, tpl } from './kit';

type TP = Partial<TextLayer>;

const hard = (color: string, dx: number, dy: number): TextLayer['shadow'] => ({ enabled: true, color, blur: 0, offsetX: dx, offsetY: dy, opacity: 1 });
const soft = (opacity = 0.45): TextLayer['shadow'] => ({ enabled: true, color: '#000000', blur: 12, offsetX: 0, offsetY: 3, opacity });

/** Headline line without a background block. */
const line = (W: number, y: number, h: number, text: string, p: TP = {}) =>
  titleLine(W, y, h, text, { background: bgOff(), letterSpacing: 0, fontWeight: 400, ...p });

/** Full-width rule (the thick black lines framing decor bands). */
const rule = (W: number, y: number, h = 8, color = '#111111'): Layer =>
  createShape({ name: 'Rule', role: 'decor', x: 0, y, width: W, height: h, fill: color });

const ornament = (x: number, y: number, w: number, color = '#111111', h = 3): Layer =>
  createShape({ name: 'Ornament line', role: 'decor', x, y, width: w, height: h, fill: color });

const subtitleLine = (x: number, y: number, w: number, h: number, text: string, p: TP = {}): TextLayer =>
  titleLine(1000, y, h, text, { name: 'Subtitle line', role: 'subtitle', x, width: w, textTransform: 'none', ...p });

const DIST = 'Rubik Distressed';
const BLOCK = 'Archivo Black';
const SERIF = 'Abril Fatface';

export const PIN_STYLE_TEMPLATES = [
  // ---------------------------------------------------------------- decor bands
  tpl({
    id: 'ps-patio-tan-script',
    name: 'Patio — Tan Badge, Script & Distressed',
    description: '2 top + 2 bottom photos, framed white band, tan number badge, script keyword, distressed caps with a tan offset shadow.',
    family: 1,
    categories: ['Patio', 'Home Decor', 'Balcony', 'Listicle'],
    designTypes: ['split', 'script-bold', 'listicle'],
    collage: { layoutId: 'band-2-2', gap: 10, band: 0.42 },
    layers: ({ W, H, band }) => [
      bandShape('#FFFFFF'),
      rule(W, band.y, 9),
      rule(W, band.y + band.height - 9, 9),
      badge(24, band.y + 26, 300, '16', 'circle', '#C9A27E', '#FFFFFF', { fontFamily: BLOCK, fontSize: 200, stroke: '#111111', strokeWidth: 14 }),
      line(W, band.y + 20, 240, 'Patio', {
        fontFamily: 'Pacifico', fill: '#111111', textTransform: 'lowercase', x: 330, width: 650, align: 'left', fontSize: 200,
        shadow: hard('#C9A27E', 7, 7), rotation: -3, wordCount: 1,
      }),
      line(W, band.y + 285, 175, 'Decorating', { fontFamily: DIST, fill: '#111111', x: W * 0.03, width: W * 0.94, fontSize: 168, shadow: hard('#C9A27E', 8, 8), wordCount: 1 }),
      line(W, band.y + 465, 140, 'Ideas to Copy', { fontFamily: BLOCK, fill: '#111111', x: W * 0.03, width: W * 0.94, fontSize: 124 }),
      footer(W, H, 'over-image', { fontFamily: 'Playfair Display', fontWeight: 700, letterSpacing: 8, fontSize: 34 }),
    ],
  }),
  tpl({
    id: 'ps-apartment-big-caps',
    name: 'Small Apartment — Big Caps Band',
    description: 'White number box overlapping the photos, letter-spaced kicker, huge condensed keyword with a soft offset, small caps line.',
    family: 1,
    categories: ['Patio', 'Balcony', 'Home Decor', 'Listicle'],
    designTypes: ['split', 'listicle'],
    collage: { layoutId: 'band-2-2', gap: 10, band: 0.3 },
    layers: ({ W, H, band }) => [
      bandShape('#FFFFFF'),
      badge(0, band.y - 120, 300, '19', 'rounded', '#FFFFFF', '#111111', { width: 300, height: 260, fontSize: 230 }),
      line(W, band.y + 22, 90, 'Small', { fontFamily: BLOCK, letterSpacing: 22, x: 310, width: 660, fontSize: 70, wordCount: 1 }),
      line(W, band.y + 118, 210, 'Apartment', { fontFamily: 'Anton', x: W * 0.03, width: W * 0.94, fontSize: 210, shadow: hard('#CFC8BF', 9, 9), wordCount: 1 }),
      line(W, band.y + 340, 90, 'Patios to Maximize Space', { fontFamily: BLOCK, letterSpacing: 6, x: W * 0.05, width: W * 0.9, fontSize: 54 }),
      footer(W, H, 'light-pill', { fontSize: 30, letterSpacing: 6 }),
    ],
  }),
  tpl({
    id: 'ps-clever-olive',
    name: 'Small Patios — Olive Badge & Distressed',
    description: 'Olive number badge overlapping the photos, bold keyword, olive and black distressed lines between thin rules.',
    family: 1,
    categories: ['Patio', 'Home Decor', 'Listicle'],
    designTypes: ['split', 'listicle'],
    collage: { layoutId: 'band-2-2', gap: 12, band: 0.36 },
    layers: ({ W, H, band }) => [
      bandShape('#FFFFFF'),
      rule(W, band.y, 6),
      rule(W, band.y + band.height - 6, 6),
      badge(20, band.y - 110, 330, '21', 'circle', '#6E7F3A', '#FFFFFF', { fontFamily: BLOCK, fontSize: 210 }),
      line(W, band.y + 34, 150, 'Clever', { fontFamily: BLOCK, x: 360, width: 610, fontSize: 140, wordCount: 1 }),
      line(W, band.y + 190, 165, 'Cool Ideas For', { fontFamily: DIST, fill: '#6E7F3A', x: W * 0.03, width: W * 0.94, fontSize: 150 }),
      line(W, band.y + 368, 120, 'Small Patios', { fontFamily: DIST, x: W * 0.1, width: W * 0.8, fontSize: 110, wordCount: 2 }),
      footer(W, H, 'light-pill', { fontSize: 30, letterSpacing: 6 }),
    ],
  }),
  tpl({
    id: 'ps-balcony-maroon-best',
    name: 'Balcony — Maroon Badge, best! Script',
    description: '2 photos on top, 4 below; maroon badge, script accent, distressed SMALL / BALCONY / DECOR IDEAS.',
    family: 2,
    categories: ['Balcony', 'Home Decor', 'Listicle'],
    designTypes: ['split', 'script-bold', 'listicle'],
    collage: { layoutId: 'band-2-4', gap: 8, band: 0.4 },
    layers: ({ W, H, band }) => [
      bandShape('#FFFFFF'),
      rule(W, band.y, 8),
      rule(W, band.y + band.height - 8, 8),
      badge(18, band.y - 80, 290, '28', 'circle', '#8E2A2A', '#FFFFFF', { fontFamily: BLOCK, fontSize: 190, stroke: '#111111', strokeWidth: 10 }),
      accent(300, band.y + 20, 330, 170, 'best!', { fontFamily: 'Pacifico', fill: '#111111', fontSize: 130, align: 'left', rotation: -7, textTransform: 'lowercase' }),
      line(W, band.y + 40, 140, 'Small', { fontFamily: DIST, x: 600, width: 380, align: 'left', fontSize: 130, wordCount: 1 }),
      line(W, band.y + 195, 210, 'Balcony', { fontFamily: DIST, fill: '#8E2A2A', x: W * 0.03, width: W * 0.94, fontSize: 210, wordCount: 1 }),
      line(W, band.y + 410, 150, 'Decor Ideas', { fontFamily: DIST, x: W * 0.03, width: W * 0.94, fontSize: 140 }),
      footer(W, H, 'light-pill', { fontSize: 30, letterSpacing: 6 }),
    ],
  }),
  tpl({
    id: 'ps-balcony-slate-stunning',
    name: 'Balcony — Big Number & Stunning Script',
    description: 'Oversized number, monoline script over a slate distressed keyword, bold DECOR IDEAS; 2 photos above, 4 below.',
    family: 5,
    categories: ['Balcony', 'Home Decor', 'Listicle'],
    designTypes: ['split', 'script-bold', 'listicle'],
    collage: { layoutId: 'band-2-4', gap: 8, band: 0.38 },
    layers: ({ W, H, band }) => [
      bandShape('#FFFFFF'),
      rule(W, band.y, 8),
      rule(W, band.y + band.height - 8, 8),
      badge(20, band.y + 20, 300, '28', 'square', '#FFFFFF', '#2B1E16', { width: 330, height: 260, fontSize: 250, fontFamily: BLOCK, background: bgOff() }),
      accent(330, band.y + 4, 650, 220, 'Stunning', { fontFamily: 'Sacramento', fill: '#111111', fontSize: 230, align: 'left', rotation: -5 }),
      line(W, band.y + 210, 220, 'Balcony', { fontFamily: DIST, fill: '#4F6275', x: W * 0.03, width: W * 0.94, fontSize: 220, wordCount: 1 }),
      line(W, band.y + 435, 150, 'Decor Ideas', { fontFamily: BLOCK, fill: '#2B1E16', x: W * 0.04, width: W * 0.92, fontSize: 132 }),
      footer(W, H, 'over-image', { letterSpacing: 8, fontSize: 32 }),
    ],
  }),
  tpl({
    id: 'ps-bohemian-maroon-ribbon',
    name: 'Bohemian — Badge & Maroon Ribbon',
    description: 'Dark badge, distressed and bold caps, a maroon ribbon with white distressed keyword; 2 photos above, 3 below.',
    family: 2,
    categories: ['Balcony', 'Home Decor', 'Patio', 'Listicle'],
    designTypes: ['split', 'listicle'],
    collage: { layoutId: 'band-2-3', gap: 8, band: 0.4 },
    layers: ({ W, H, band }) => [
      bandShape('#FFFFFF'),
      badge(28, band.y + 22, 270, '24', 'circle', '#2E2420', '#FFFFFF', { fontFamily: BLOCK, fontSize: 170 }),
      line(W, band.y + 50, 150, 'Charming', { fontFamily: DIST, x: 320, width: 650, fontSize: 140, wordCount: 1 }),
      line(W, band.y + 225, 190, 'Bohemian', { fontFamily: BLOCK, x: W * 0.03, width: W * 0.94, fontSize: 185, wordCount: 1 }),
      createShape({ name: 'Ribbon', role: 'decor', x: 0, y: band.y + 435, width: W, height: 150, fill: '#6B2A2E' }),
      line(W, band.y + 447, 126, 'Balcony Ideas', { fontFamily: DIST, fill: '#FFFFFF', x: W * 0.04, width: W * 0.92, fontSize: 118 }),
      footer(W, H, 'light-pill', { fontSize: 30, letterSpacing: 6 }),
    ],
  }),
  tpl({
    id: 'ps-dark-band-best',
    name: 'Dark Band — Script & White Caps',
    description: 'Charcoal headline band with white number tab, white script accent and bold white caps.',
    family: 5,
    categories: ['Balcony', 'Home Decor', 'Patio'],
    designTypes: ['split', 'script-bold', 'listicle'],
    collage: { layoutId: 'band-2-2', gap: 8, band: 0.34 },
    bg: '#252A29',
    layers: ({ W, H, band }) => [
      bandShape('#252A29'),
      badge(W / 2 - 150, band.y - 150, 300, '24', 'rounded', '#FFFFFF', '#111111', { width: 300, height: 190, fontSize: 170, fontFamily: BLOCK }),
      accent(14, band.y + 50, 340, 190, 'Best!', { fontFamily: 'Sacramento', fill: '#FFFFFF', fontSize: 170, align: 'left', rotation: -6 }),
      line(W, band.y + 70, 140, 'Bohemian', { fontFamily: BLOCK, fill: '#FFFFFF', x: 340, width: 640, align: 'left', fontSize: 120, wordCount: 1 }),
      line(W, band.y + 215, 180, 'Balcony', { fontFamily: BLOCK, fill: '#FFFFFF', x: W * 0.03, width: W * 0.94, fontSize: 190, wordCount: 1 }),
      line(W, band.y + 395, 115, 'Decor Ideas', { fontFamily: DIST, fill: '#FFFFFF', x: W * 0.05, width: W * 0.9, fontSize: 110 }),
      footer(W, H, 'light-pill', { fontSize: 30, letterSpacing: 6 }),
    ],
  }),
  tpl({
    id: 'ps-minimalist-black',
    name: 'Minimalist — Black Badge & Script',
    description: 'Black number badge, flowing script keyword and distressed black caps between bold rules.',
    family: 5,
    categories: ['Balcony', 'Home Decor', 'Living Room'],
    designTypes: ['split', 'script-bold', 'listicle'],
    collage: { layoutId: 'band-2-2', gap: 10, band: 0.37 },
    layers: ({ W, H, band }) => [
      bandShape('#FFFFFF'),
      rule(W, band.y, 9),
      rule(W, band.y + band.height - 9, 9),
      badge(20, band.y + 26, 250, '32', 'circle', '#111111', '#FFFFFF', { fontFamily: BLOCK, fontSize: 160, background: bgOn('#111111', { shape: 'circle', hug: false, paddingX: 8, paddingY: 8, borderWidth: 8, borderColor: '#FFFFFF' }) }),
      accent(285, band.y + 10, 700, 220, 'Minimalist', { fontFamily: 'Sacramento', fill: '#111111', fontSize: 200, align: 'left' }),
      line(W, band.y + 225, 205, 'Balcony', { fontFamily: DIST, x: W * 0.03, width: W * 0.94, fontSize: 210, wordCount: 1 }),
      line(W, band.y + 425, 125, 'Decor Ideas', { fontFamily: DIST, x: W * 0.05, width: W * 0.9, fontSize: 120 }),
      footer(W, H, 'over-image', { letterSpacing: 8, fontSize: 32 }),
    ],
  }),
  tpl({
    id: 'ps-fall-rust-panel',
    name: 'Fall Room — Rust Badge & Cream Panel',
    description: '2×2 cozy photos with a rounded cream panel: rust badge, script accent, sticker-outlined rust keyword, bold DECOR IDEAS.',
    family: 9,
    categories: ['Fall Decor', 'Home Decor', 'Living Room', 'Listicle'],
    designTypes: ['image-text-overlay', 'script-bold', 'listicle'],
    collage: { layoutId: 'grid-2x2', gap: 8 },
    layers: ({ W, H }) => [
      createShape({ name: 'Cream panel', role: 'decor', x: 24, y: 470, width: W - 48, height: 560, fill: '#F8EEDF', cornerRadius: 64, stroke: '#FFFFFF', strokeWidth: 8 }),
      badge(50, 420, 250, '40', 'circle', '#A23E1A', '#FFFFFF', { fontFamily: BLOCK, fontSize: 160, background: bgOn('#A23E1A', { shape: 'circle', hug: false, paddingX: 8, paddingY: 8, borderWidth: 10, borderColor: '#FFFFFF' }) }),
      accent(320, 470, 640, 180, 'New', { fontFamily: 'Pacifico', fill: '#111111', fontSize: 130, align: 'left', rotation: -4 }),
      line(W, 650, 200, 'Fall Room', { fontFamily: DIST, fill: '#A23E1A', x: W * 0.05, width: W * 0.9, fontSize: 190, stroke: '#FFFFFF', strokeWidth: 18, wordCount: 2 }),
      line(W, 860, 135, 'Decor Ideas', { fontFamily: BLOCK, x: W * 0.06, width: W * 0.88, fontSize: 124 }),
      footer(W, H, 'over-image', { letterSpacing: 8, fontSize: 32 }),
    ],
  }),
  tpl({
    id: 'ps-mirrors-olive-panel',
    name: 'Home Tips — Olive Script & Boxed Subtitle',
    description: 'Cream band with olive badge, script accent, big keyword, olive ribbon and a boxed two-style subtitle.',
    family: 5,
    categories: ['Home Decor', 'Living Room', 'Lifestyle', 'Listicle'],
    designTypes: ['split', 'script-bold', 'listicle'],
    w: 736,
    h: 1472,
    bg: '#F6F1E7',
    collage: { layoutId: 'band-2-2', gap: 8, band: 0.46 },
    layers: ({ W, H, band }) => [
      bandShape('#F6F1E7'),
      badge(24, band.y + 26, 210, '30', 'circle', '#5E6B3A', '#FFFFFF', { fontFamily: BLOCK, fontSize: 130 }),
      accent(250, band.y + 20, 460, 170, 'Best', { fontFamily: 'Allura', fill: '#5E6B3A', fontSize: 160, align: 'left' }),
      line(W, band.y + 215, 140, 'Mirrors', { fontFamily: BLOCK, x: W * 0.04, width: W * 0.92, fontSize: 135, wordCount: 1 }),
      line(W, band.y + 365, 80, 'For Small Spaces', {
        fontFamily: 'Montserrat', fontWeight: 800, fill: '#FFFFFF', x: W * 0.04, width: W * 0.92, fontSize: 56,
        background: bgOn('#5E6B3A', { hug: false, paddingX: 20, paddingY: 10, radius: 4 }),
      }),
      ornament(W * 0.2, band.y + 470, W * 0.6, '#5E6B3A', 2),
      subtitleLine(W * 0.08, band.y + 495, W * 0.84, 70, 'That make rooms', {
        fontFamily: 'Montserrat', fontWeight: 800, fill: '#3B2E25', textTransform: 'uppercase', fontSize: 44,
        background: bgOn('#EFE4D2', { hug: false, paddingX: 18, paddingY: 8, borderWidth: 2, borderColor: '#B9A88C' }),
      }),
      subtitleLine(W * 0.08, band.y + 565, W * 0.84, 90, 'Look Bigger', { fontFamily: 'Allura', fill: '#111111', fontSize: 84, background: bgOff() }),
      footer(W, H, 'light-pill', { fontSize: 24, letterSpacing: 5 }),
    ],
  }),

  // ---------------------------------------------------------------- photo stickers
  tpl({
    id: 'ps-sticker-pink',
    name: 'Sticker Headline — Pink & Sage',
    description: 'Two photos with a big sticker-outlined headline straight on top: black number, sage, hot pink and black distressed words.',
    family: 6,
    categories: ['Balcony', 'Home Decor', 'Lifestyle', 'Listicle'],
    designTypes: ['image-text-overlay', 'listicle'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'two-stack', gap: 0 },
    layers: ({ W, H }) => [
      badge(W / 2 - 150, 300, 300, '28', 'square', '#FFFFFF', '#111111', { width: 300, height: 260, fontSize: 250, fontFamily: BLOCK, background: bgOff(), stroke: '#FFFFFF', strokeWidth: 26 }),
      line(W, 560, 190, 'Small', { fontFamily: DIST, fill: '#6F8F7E', x: W * 0.04, width: W * 0.92, fontSize: 190, stroke: '#FFFFFF', strokeWidth: 26, wordCount: 1 }),
      line(W, 760, 200, 'Balcony', { fontFamily: DIST, fill: '#FF1493', x: W * 0.03, width: W * 0.94, fontSize: 200, stroke: '#FFFFFF', strokeWidth: 26, wordCount: 1 }),
      line(W, 965, 180, 'Ideas', { fontFamily: DIST, fill: '#111111', x: W * 0.04, width: W * 0.92, fontSize: 180, stroke: '#FFFFFF', strokeWidth: 26 }),
      footer(W, H, 'over-image', { letterSpacing: 7, fontSize: 30 }),
    ],
  }),
  tpl({
    id: 'ps-sticker-black-outline',
    name: 'Sticker Headline — White on Black Outline',
    description: '2×2 photos with white distressed headline lines outlined in thick black, no band.',
    family: 6,
    categories: ['Balcony', 'Patio', 'Home Decor', 'Listicle'],
    designTypes: ['image-text-overlay', 'listicle'],
    collage: { layoutId: 'grid-2x2', gap: 6 },
    layers: ({ W, H }) => [
      badge(30, 470, 260, '24', 'square', '#FFFFFF', '#FFFFFF', { width: 260, height: 200, fontSize: 190, fontFamily: BLOCK, background: bgOff(), stroke: '#111111', strokeWidth: 24 }),
      line(W, 480, 190, 'Genius', { fontFamily: DIST, fill: '#FFFFFF', x: 320, width: 660, align: 'left', fontSize: 180, stroke: '#111111', strokeWidth: 24, wordCount: 1 }),
      line(W, 680, 190, 'Bohemian', { fontFamily: DIST, fill: '#FFFFFF', x: W * 0.03, width: W * 0.94, fontSize: 190, stroke: '#111111', strokeWidth: 24, wordCount: 1 }),
      line(W, 880, 150, 'Balcony Ideas', { fontFamily: DIST, fill: '#FFFFFF', x: W * 0.03, width: W * 0.94, fontSize: 140, stroke: '#111111', strokeWidth: 22 }),
      footer(W, H, 'light-pill', { fontSize: 30, letterSpacing: 6 }),
    ],
  }),

  // ---------------------------------------------------------------- hair serif stacks (736 × 1472)
  tpl({
    id: 'ps-hair-serif-stack',
    name: 'Hair — Serif Stack with Black Number',
    description: '2×2 photos, black number box and stacked white serif blocks with line ornaments; framed website footer.',
    family: 8,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['editorial', 'listicle'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'grid-2x2', gap: 8, region: { x: 0, y: 0, width: 1, height: 0.94 } },
    layers: ({ W, H }) => [
      // Ornaments first so the white text blocks sit on top and the lines only show beside them.
      ornament(28, 860, W - 56),
      badge(W / 2 - 100, 520, 200, '28', 'square', '#111111', '#FFFFFF', { width: 200, height: 140, fontSize: 120, fontFamily: SERIF }),
      titleLine(W, 664, 136, 'Hair', { fontFamily: SERIF, fontWeight: 400, x: W * 0.06, width: W * 0.88, fontSize: 128, background: bgOn('#FFFFFF', { paddingX: 22, paddingY: 4 }) }),
      titleLine(W, 800, 120, 'Makeover', { fontFamily: SERIF, fontWeight: 400, x: W * 0.17, width: W * 0.66, fontSize: 92, background: bgOn('#FFFFFF', { paddingX: 22, paddingY: 4 }) }),
      titleLine(W, 920, 116, 'Ideas', { fontFamily: SERIF, fontWeight: 400, x: W * 0.12, width: W * 0.76, fontSize: 108, background: bgOn('#FFFFFF', { paddingX: 22, paddingY: 4 }) }),
      createShape({ name: 'Footer panel', role: 'decor', x: 0, y: H * 0.94, width: W, height: H * 0.06, fill: '#FFFFFF' }),
      ornament(40, H * 0.97 - 1, 110),
      ornament(W - 150, H * 0.97 - 1, 110),
      footer(W, H, 'plain-dark', { fontFamily: 'Playfair Display', fontWeight: 700, letterSpacing: 5, fontSize: 26, x: W * 0.24, width: W * 0.52, y: H * 0.947, height: H * 0.046 }),
    ],
  }),
  tpl({
    id: 'ps-hair-brown-ribbons',
    name: 'Hair — Brown Keyword & Italic Ribbons',
    description: 'Serif number and brown keyword, bold serif headline, italic subtitle on cream and brown ribbons (filled from your article title).',
    family: 8,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['editorial', 'listicle'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'grid-2x2', gap: 8 },
    layers: ({ W, H }) => [
      badge(W / 2 - 110, 470, 220, '50', 'square', '#FFFFFF', '#111111', { width: 220, height: 150, fontSize: 135, fontFamily: SERIF }),
      titleLine(W, 618, 150, 'Lob', { fontFamily: SERIF, fontWeight: 400, fill: '#7A4A22', x: W * 0.15, width: W * 0.7, fontSize: 150, background: bgOn('#FFFFFF', { paddingX: 26, paddingY: 0 }), wordCount: 1 }),
      titleLine(W, 766, 104, 'Haircut Ideas', { fontFamily: SERIF, fontWeight: 400, x: W * 0.03, width: W * 0.94, fontSize: 96, background: bgOn('#FFFFFF', { paddingX: 18, paddingY: 4 }) }),
      subtitleLine(W * 0.14, 876, W * 0.72, 80, 'to Take to Your', { fontFamily: 'Playfair Display', fontWeight: 700, italic: true, fontSize: 60, fill: '#111111', background: bgOn('#F3E7DA', { paddingX: 18, paddingY: 4 }) }),
      subtitleLine(W * 0.08, 958, W * 0.84, 80, 'Next Salon Appointment', { fontFamily: 'Playfair Display', fontWeight: 600, italic: true, fontSize: 56, fill: '#FFFFFF', background: bgOn('#7A4A22', { paddingX: 18, paddingY: 6 }) }),
      footer(W, H, 'plain-dark', { fontFamily: 'Playfair Display', fontWeight: 400, italic: true, textTransform: 'none', letterSpacing: 1, fontSize: 30, background: bgOn('#F7F1EA', { shape: 'rect', paddingX: 24, paddingY: 8 }) }),
    ],
  }),
  tpl({
    id: 'ps-hair-italic-mix',
    name: 'Hair — Italic & Bold Serif Mix',
    description: 'Mixed italic and bold serif blocks (“Short Shag / Haircut Ideas / That Are / Effortlessly Cool”) with a framed serif footer.',
    family: 8,
    categories: ['Hair', 'Beauty'],
    designTypes: ['editorial'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'grid-2x2', gap: 8, region: { x: 0, y: 0, width: 1, height: 0.93 } },
    layers: ({ W, H }) => [
      badge(W / 2 - 100, 430, 200, '50', 'square', '#FFFFFF', '#111111', { width: 200, height: 150, fontSize: 140, fontFamily: SERIF }),
      titleLine(W, 580, 96, 'Short Shag', { fontFamily: 'Playfair Display', fontWeight: 700, italic: true, textTransform: 'none', x: W * 0.12, width: W * 0.76, fontSize: 80, background: bgOn('#FFFFFF', { paddingX: 18, paddingY: 4 }), wordCount: 2 }),
      titleLine(W, 676, 120, 'Haircut Ideas', { fontFamily: SERIF, fontWeight: 400, textTransform: 'none', x: W * 0.03, width: W * 0.94, fontSize: 110, background: bgOn('#FFFFFF', { paddingX: 18, paddingY: 4 }) }),
      subtitleLine(W * 0.24, 796, W * 0.52, 80, 'That Are', { fontFamily: 'Playfair Display', fontWeight: 600, italic: true, fontSize: 64, fill: '#111111', background: bgOn('#FFFFFF', { paddingX: 16, paddingY: 2 }) }),
      subtitleLine(W * 0.05, 876, W * 0.9, 110, 'Effortlessly Cool', { fontFamily: SERIF, fontWeight: 400, fontSize: 92, fill: '#111111', background: bgOn('#F3E7DA', { paddingX: 18, paddingY: 4 }) }),
      createShape({ name: 'Footer panel', role: 'decor', x: 0, y: H * 0.93, width: W, height: H * 0.07, fill: '#F7F1EA' }),
      footer(W, H, 'plain-dark', {
        fontFamily: 'Playfair Display', fontWeight: 600, textTransform: 'none', letterSpacing: 1, fontSize: 40,
        x: W * 0.05, width: W * 0.9, y: H * 0.94, height: H * 0.05,
        background: bgOn('#F7F1EA', { hug: false, paddingX: 20, paddingY: 6, borderWidth: 2, borderColor: '#B08B5E' }),
      }),
    ],
  }),
  tpl({
    id: 'ps-hair-trendy-lines',
    name: 'Hair — Big Caps with Line Ornaments',
    description: 'Black number box, TRENDY with side lines, huge SHORT, HAIRSTYLES, black IDEAS box and a small subtitle line.',
    family: 8,
    categories: ['Hair', 'Beauty', 'Fashion', 'Listicle'],
    designTypes: ['editorial', 'listicle'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'grid-2x2', gap: 8 },
    layers: ({ W, H }) => [
      badge(W / 2 - 100, 360, 200, '50', 'square', '#111111', '#FFFFFF', { width: 200, height: 150, fontSize: 130, fontFamily: SERIF }),
      titleLine(W, 512, 70, 'Trendy', { fontFamily: SERIF, fontWeight: 400, letterSpacing: 6, x: W * 0.28, width: W * 0.44, fontSize: 56, background: bgOn('#FFFFFF', { paddingX: 14, paddingY: 4 }), wordCount: 1 }),
      ornament(W * 0.12, 546, W * 0.13),
      ornament(W * 0.75, 546, W * 0.13),
      titleLine(W, 584, 170, 'Short', { fontFamily: SERIF, fontWeight: 400, x: W * 0.03, width: W * 0.94, fontSize: 170, background: bgOn('#FFFFFF', { paddingX: 20, paddingY: 0 }), wordCount: 1 }),
      titleLine(W, 756, 80, 'Hairstyles', { fontFamily: SERIF, fontWeight: 400, letterSpacing: 3, x: W * 0.2, width: W * 0.6, fontSize: 64, background: bgOn('#FFFFFF', { paddingX: 14, paddingY: 4 }), wordCount: 1 }),
      ornament(W * 0.06, 795, W * 0.12),
      ornament(W * 0.82, 795, W * 0.12),
      titleLine(W, 838, 100, 'Ideas', { fontFamily: SERIF, fontWeight: 400, fill: '#FFFFFF', x: W * 0.25, width: W * 0.5, fontSize: 88, background: bgOn('#111111', { paddingX: 22, paddingY: 4 }) }),
      subtitleLine(W * 0.15, 940, W * 0.7, 66, 'For every woman', { fontFamily: SERIF, fontWeight: 400, textTransform: 'uppercase', letterSpacing: 2, fontSize: 44, fill: '#111111', background: bgOn('#FFFFFF', { paddingX: 16, paddingY: 4 }) }),
      footer(W, H, 'light-pill', { fontSize: 22, letterSpacing: 4 }),
    ],
  }),
  tpl({
    id: 'ps-hair-pink-bronde',
    name: 'Hair — Pink Badge & Spaced Caps',
    description: 'White band with a pink number badge overlapping the photos, PERFECT / pink keyword / letter-spaced caps.',
    family: 8,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['split', 'listicle'],
    collage: { layoutId: 'band-2-2', gap: 10, band: 0.3 },
    layers: ({ W, H, band }) => [
      bandShape('#FFFFFF'),
      badge(28, band.y - 160, 320, '52', 'circle', '#E85BA8', '#FFFFFF', { fontFamily: 'Montserrat', fontWeight: 800, fontSize: 190 }),
      line(W, band.y + 22, 120, 'Perfect', { fontFamily: 'Montserrat', fontWeight: 800, x: 370, width: 610, fontSize: 112, wordCount: 1 }),
      line(W, band.y + 145, 200, 'Bronde', { fontFamily: 'Montserrat', fontWeight: 800, fill: '#E85BA8', letterSpacing: 18, x: W * 0.03, width: W * 0.94, fontSize: 200, wordCount: 1 }),
      line(W, band.y + 350, 90, 'Hair Color Ideas', { fontFamily: 'Montserrat', fontWeight: 700, letterSpacing: 16, x: W * 0.04, width: W * 0.92, fontSize: 64 }),
      footer(W, H, 'over-image', { letterSpacing: 9, fontSize: 30, shadow: soft() }),
    ],
  }),
];
