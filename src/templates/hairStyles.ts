/**
 * Hair & beauty Pins modelled on real high-performing blog Pins:
 *  - separate white text blocks over one photo (black + hot pink lines),
 *  - big white numbers and stacked caps straight on the photo,
 *  - outlined "sticker" headlines (white on black outline, black serif on white outline)
 *    over a 2×2 grid.
 * Coordinates are measured on each reference Pin and scaled with s(), so the
 * numbers in this file can be checked against the original directly.
 */
import { createShape } from '../model/factory';
import type { Layer, TextLayer } from '../model/types';
import { badge, bgOff, bgOn, footer, titleLine, tpl } from './kit';

type TP = Partial<TextLayer>;

/** Scale from a reference Pin of width refW to the template width W. */
const scaler = (W: number, refW: number) => (v: number) => (v * W) / refW;

/** White block that hugs the text width and fills the line height (blocks keep a gap only where the lines do). */
const block = (color: string, padX: number) => bgOn(color, { hug: true, hugHeight: false, paddingX: padX, paddingY: 0 });
const outline = (color: string, width: number): TP => ({ stroke: color, strokeWidth: width });
const soft = (opacity = 0.45, blur = 12): TextLayer['shadow'] => ({ enabled: true, color: '#000000', blur, offsetX: 0, offsetY: 3, opacity });
const glow = (color: string, blur: number): TextLayer['shadow'] => ({ enabled: true, color, blur, offsetX: 0, offsetY: 0, opacity: 0.9 });

/** Headline line with no background. */
const line = (W: number, y: number, h: number, text: string, p: TP = {}) =>
  titleLine(W, y, h, text, { background: bgOff(), letterSpacing: 0, fontWeight: 400, lineHeight: 0.8, ...p });

const subtitleLine = (x: number, y: number, w: number, h: number, text: string, p: TP = {}): TextLayer =>
  titleLine(1000, y, h, text, { name: 'Subtitle line', role: 'subtitle', x, width: w, background: bgOff(), letterSpacing: 0, ...p });

const number = (W: number, y: number, h: number, text: string, p: TP = {}) =>
  badge(W * 0.1, y, h, text, 'square', '#FFFFFF', '#FFFFFF', { x: W * 0.1, width: W * 0.8, height: h, background: bgOff(), lineHeight: 0.74, ...p });

const bar = (x: number, y: number, w: number, h: number, color: string, rotation = 0): Layer =>
  createShape({ name: 'Ornament', role: 'decor', x, y, width: w, height: h, fill: color, rotation, cornerRadius: h / 2 });

const PINK = '#EE1A5B';
const ABRIL = 'Abril Fatface';
const PLAYFAIR = 'Playfair Display';

export const HAIR_TEMPLATES = [
  // ---------------------------------------------------------------- white blocks on one photo
  tpl({
    id: 'hb-bronde-blocks',
    name: 'Hair — White Blocks, Pink Keyword (4 lines)',
    description: 'One photo with four separate white blocks: black lines and a hot-pink keyword line (“20+ Most / Gorgeous / Bronde Hair Color / Ideas”).',
    family: 8,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['single-image', 'image-text-overlay', 'hair-beauty'],
    w: 1080,
    h: 1920,
    collage: { layoutId: 'single' },
    layers: ({ W }) => {
      const s = scaler(W, 736);
      const p = (fill: string): TP => ({
        fontFamily: 'Anton', textTransform: 'none', fill, fontSize: s(104), x: s(20), width: s(696), background: block('#FFFFFF', s(22)),
      });
      return [
        line(W, s(627), s(136), '20+ Most', { ...p('#111111'), wordCount: 2 }),
        line(W, s(780), s(136), 'Gorgeous', { ...p('#111111'), wordCount: 1 }),
        line(W, s(932), s(136), 'Bronde Hair Color', { ...p(PINK), wordCount: 3 }),
        line(W, s(1081), s(136), 'Ideas', p('#111111')),
      ];
    },
  }),
  tpl({
    id: 'hb-fall-blocks',
    name: 'Hair — White Blocks, Pink Keyword (3 lines)',
    description: 'One photo with three white blocks — black, hot pink, black (“Biggest / Fall Hair Color / Trends 2026”).',
    family: 8,
    categories: ['Hair', 'Beauty', 'Fall Decor'],
    designTypes: ['single-image', 'image-text-overlay', 'hair-beauty'],
    w: 1080,
    h: 1920,
    collage: { layoutId: 'single' },
    layers: ({ W }) => {
      const s = scaler(W, 736);
      const p = (fill: string): TP => ({
        fontFamily: 'Anton', textTransform: 'none', fill, fontSize: s(118), x: s(20), width: s(696), background: block('#FFFFFF', s(24)),
      });
      return [
        line(W, s(648), s(154), 'Biggest', { ...p('#111111'), wordCount: 1 }),
        line(W, s(817), s(156), 'Fall Hair Color', { ...p(PINK), wordCount: 3 }),
        line(W, s(990), s(154), 'Trends 2026', p('#111111')),
      ];
    },
  }),
  tpl({
    id: 'hb-hottest-left-blocks',
    name: 'Hair — Left Blocks, Black & Pink + Pink Bar',
    description: 'Left-aligned white blocks alternating black and hot-pink caps, a small caps line and a full-width pink website bar.',
    family: 8,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['single-image', 'image-text-overlay', 'hair-beauty'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'single' },
    layers: ({ W }) => {
      const s = scaler(W, 564);
      const p = (fill: string): TP => ({
        fontFamily: 'Anton', fill, fontSize: s(104), align: 'left', x: s(33), width: s(500), background: block('#FFFFFF', s(8)),
      });
      return [
        line(W, s(500), s(125), '12 Hottest', { ...p('#111111'), wordCount: 2 }),
        line(W, s(633), s(125), 'Hair Color', { ...p(PINK), wordCount: 2 }),
        line(W, s(766), s(125), '2026', { ...p('#111111'), wordCount: 1 }),
        line(W, s(899), s(125), 'Trends', p(PINK)),
        subtitleLine(s(33), s(1033), s(500), s(37), 'Stylists are legit obsessed with', {
          fontFamily: 'Anton', fontWeight: 400, textTransform: 'uppercase', fontSize: s(26), align: 'left', fill: '#111111', background: block('#FFFFFF', s(5)),
        }),
        footer(W, s(1128), 'plain-light', {
          x: 0, width: W, y: s(1098), height: s(30), fontSize: s(19), letterSpacing: s(3), fontWeight: 600,
          background: bgOn('#F0286E', { hug: false, paddingX: 0, paddingY: 0 }),
        }),
      ];
    },
  }),

  // ---------------------------------------------------------------- big white text on one photo
  tpl({
    id: 'hb-modern-white-caps',
    name: 'Hair — Huge White Number & Caps',
    description: 'Huge white number with stacked bold white caps straight on the photo, faint website at the top and a pink pill footer.',
    family: 6,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['single-image', 'image-text-overlay', 'number-badge', 'hair-beauty'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => {
      const p = (wordCount?: number): TP => ({
        fontFamily: 'Montserrat', fontWeight: 800, fill: '#FFFDF6', fontSize: 100, lineHeight: 0.78, x: W * 0.02, width: W * 0.96, shadow: soft(0.35, 16), wordCount,
      });
      return [
        footer(W, H, 'plain-light', { name: 'Website watermark', y: 70, height: 46, fontSize: 30, letterSpacing: 2, opacity: 0.35 }),
        number(W, 596, 210, '22', { fontFamily: 'Montserrat', fontWeight: 800, fontSize: 295, fill: '#FFFDF6', shadow: soft(0.35, 16) }),
        line(W, 822, 90, 'Modern', p(1)),
        line(W, 904, 90, 'Short', p(1)),
        line(W, 986, 90, 'Hairstyles', p(1)),
        line(W, 1068, 90, 'For Women', p(2)),
        line(W, 1150, 90, 'Over 50', p()),
        footer(W, H, 'plain-dark', {
          x: W * 0.2, width: W * 0.6, y: 1368, height: 58, fontSize: 32, fontWeight: 800, letterSpacing: 1,
          background: bgOn('#F9C6E0', { shape: 'rect', radius: 16, paddingX: 22, paddingY: 6 }),
        }),
      ];
    },
  }),
  tpl({
    id: 'hb-half-up-yellow',
    name: 'Hair — White & Yellow Rounded Sans',
    description: 'Big white number, rounded bold sans lines in white and soft yellow, small website at the bottom.',
    family: 6,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['single-image', 'image-text-overlay', 'number-badge', 'hair-beauty'],
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => {
      const s = scaler(W, 236);
      const p = (fill: string, wordCount?: number): TP => ({
        fontFamily: 'Poppins', fontWeight: 700, textTransform: 'none', fill, fontSize: s(37), x: W * 0.04, width: W * 0.92, shadow: soft(0.5, 14), wordCount,
      });
      return [
        number(W, s(12), s(90), '21', { fontFamily: 'Poppins', fontWeight: 700, fontSize: s(112), shadow: soft(0.5, 14) }),
        line(W, s(103), s(38), 'Short', p('#FFFFFF', 1)),
        line(W, s(141), s(38), 'Half Up', p('#F7E45A', 2)),
        line(W, s(179), s(38), 'Half Down', p('#F7E45A', 2)),
        line(W, s(217), s(40), 'Hairstyles', p('#FFFFFF')),
        footer(W, H, 'over-image', { textTransform: 'lowercase', fontFamily: 'Poppins', fontWeight: 500, letterSpacing: 0, fontSize: s(12), y: s(327), height: s(20) }),
      ];
    },
  }),
  tpl({
    id: 'hb-huge-number-for-lines',
    name: 'Hair — Giant Number, “— FOR —” Lines',
    description: 'Giant white number and geometric caps on the photo, a small FOR between two rules, and a black website block.',
    family: 6,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['single-image', 'image-text-overlay', 'number-badge', 'hair-beauty'],
    w: 1080,
    h: 1920,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => {
      const s = scaler(W, 736);
      const p = (wordCount?: number): TP => ({
        fontFamily: 'Montserrat', fontWeight: 700, fill: '#FFFFFF', fontSize: s(178), lineHeight: 0.74, x: W * 0.04, width: W * 0.92, wordCount,
      });
      return [
        number(W, s(52), s(290), '20', { fontFamily: 'Montserrat', fontWeight: 700, fontSize: s(385), lineHeight: 0.72 }),
        line(W, s(345), s(130), 'Short', p(1)),
        line(W, s(477), s(130), 'Haircut', p(1)),
        line(W, s(609), s(130), 'Ideas', p(1)),
        bar(s(122), s(811), s(205), s(4), '#FFFFFF'),
        bar(s(409), s(811), s(205), s(4), '#FFFFFF'),
        line(W, s(786), s(56), 'For', { ...p(1), fontSize: s(56), x: s(318), width: s(100) }),
        line(W, s(858), s(130), 'Women', p()),
        footer(W, H, 'plain-light', {
          x: s(200), width: s(336), y: s(1232), height: s(40), fontSize: s(26), fontWeight: 800, letterSpacing: 0,
          background: bgOn('#111111', { paddingX: s(10), paddingY: s(4) }),
        }),
      ];
    },
  }),
  tpl({
    id: 'hb-outline-white-black',
    name: 'Hair — White Caps, Thick Black Outline',
    description: 'White bold caps with a thick black outline straight on the photo, serif letter-spaced website at the bottom.',
    family: 6,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['single-image', 'image-text-overlay', 'number-badge', 'hair-beauty'],
    w: 1080,
    h: 1920,
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => {
      const s = scaler(W, 736);
      const p = (wordCount?: number): TP => ({
        fontFamily: 'Montserrat', fontWeight: 800, fill: '#FFFFFF', fontSize: s(118), lineHeight: 0.78, x: W * 0.01, width: W * 0.98, ...outline('#111111', s(14)), wordCount,
      });
      return [
        number(W, s(62), s(180), '27+', { fontFamily: 'Montserrat', fontWeight: 800, fontSize: s(230), ...outline('#111111', s(16)) }),
        line(W, s(312), s(108), 'Short', p(1)),
        line(W, s(427), s(108), 'Hairstyles', p(1)),
        line(W, s(542), s(108), 'Ideas For', p(2)),
        line(W, s(657), s(108), 'Fine Thin', p(2)),
        line(W, s(772), s(108), 'Hair', p()),
        footer(W, H, 'plain-light', {
          fontFamily: 'Libre Baskerville', fontWeight: 400, letterSpacing: s(3), fontSize: s(27), y: s(1250), height: s(40), shadow: soft(0.5, 10),
        }),
      ];
    },
  }),
  tpl({
    id: 'hb-shaggy-lavender',
    name: 'Hair — Outlined Rounded Sans, Lavender Keyword',
    description: 'Huge outlined white number, rounded sans lines with a black outline and a lavender keyword, small outlined website.',
    family: 6,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['single-image', 'image-text-overlay', 'number-badge', 'hair-beauty'],
    collage: { layoutId: 'single' },
    layers: ({ W, H }) => {
      const s = scaler(W, 736);
      const p = (fill: string, wordCount?: number): TP => ({
        fontFamily: 'Poppins', fontWeight: 700, textTransform: 'none', fill, fontSize: s(132), lineHeight: 1, x: W * 0.03, width: W * 0.94, ...outline('#111111', s(16)), wordCount,
      });
      return [
        number(W, s(125), s(260), '22', { fontFamily: 'Poppins', fontWeight: 600, fontSize: s(320), ...outline('#111111', s(18)) }),
        line(W, s(452), s(140), 'Short', p('#FFFFFF', 1)),
        line(W, s(605), s(140), 'Shaggy', p('#DDA3F0', 1)),
        line(W, s(758), s(140), 'Hairstyles', p('#FFFFFF')),
        footer(W, H, 'plain-light', {
          textTransform: 'lowercase', fontFamily: 'Poppins', fontWeight: 700, letterSpacing: 0, fontSize: s(26), y: s(1028), height: s(40), ...outline('#111111', s(6)),
        }),
      ];
    },
  }),

  // ---------------------------------------------------------------- 2×2 grid, glowing outline
  tpl({
    id: 'hb-chic-teal-brush',
    name: 'Hair — Teal Glow & Brush Banner',
    description: '2×2 photos, white outlined caps with a teal glow, teal keyword and sparkles, white brush banner with a handwritten line.',
    family: 6,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['collage-4', 'image-text-overlay', 'number-badge', 'hair-beauty'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'grid-2x2', gap: 6 },
    layers: ({ W }) => {
      const TEAL = '#17899A';
      const p = (fill: string, wordCount?: number): TP => ({
        fontFamily: 'Montserrat', fontWeight: 900, fill, fontSize: 132, lineHeight: 0.78, x: W * 0.06, width: W * 0.88,
        ...outline('#111111', 16), shadow: glow('#21B5C6', 22), wordCount,
      });
      return [
        number(W, 322, 156, '31', { fontFamily: 'Montserrat', fontWeight: 900, fontSize: 180, ...outline('#111111', 18), shadow: glow('#21B5C6', 22) }),
        // Sparkles beside the number.
        bar(192, 370, 34, 10, '#1AA6B7', 30), bar(186, 402, 38, 10, '#1AA6B7', 0), bar(192, 434, 34, 10, '#1AA6B7', -30),
        bar(510, 370, 34, 10, '#1AA6B7', -30), bar(512, 402, 38, 10, '#1AA6B7', 0), bar(510, 434, 34, 10, '#1AA6B7', 30),
        line(W, 482, 116, 'Chic', p(TEAL, 1)),
        line(W, 598, 114, 'Short', p('#FFFFFF', 1)),
        line(W, 712, 116, 'Haircuts', p('#FFFFFF')),
        createShape({ name: 'Brush banner', role: 'decor', x: 70, y: 856, width: 596, height: 146, fill: '#FFFFFF', rotation: -1 }),
        bar(140, 902, 44, 7, TEAL, 12), bar(140, 932, 44, 7, TEAL, -12),
        bar(552, 902, 44, 7, TEAL, -12), bar(552, 932, 44, 7, TEAL, 12),
        subtitleLine(W * 0.2, 866, W * 0.6, 54, 'That are trending', {
          fontFamily: 'Montserrat', fontWeight: 800, textTransform: 'uppercase', fontSize: 46, fill: '#111111',
        }),
        subtitleLine(W * 0.2, 922, W * 0.6, 62, 'Right now', { fontFamily: 'Permanent Marker', fontWeight: 400, textTransform: 'uppercase', fontSize: 52, fill: '#111111' }),
        bar(250, 984, 240, 4, TEAL),
      ];
    },
  }),

  // ---------------------------------------------------------------- 2×2 grid, black serif sticker
  tpl({
    id: 'hb-sticker-serif-spring',
    name: 'Hair — Black Serif Sticker, Huge Keyword',
    description: '2×2 photos with a black serif headline outlined in white: small lines around one huge keyword (“SPRING”).',
    family: 6,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['collage-4', 'image-text-overlay', 'hair-beauty'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'grid-2x2', gap: 6 },
    layers: ({ W }) => {
      const p = (font: string, size: number, wordCount?: number): TP => ({
        fontFamily: font, fontWeight: font === PLAYFAIR ? 900 : 400, fill: '#111111', fontSize: size, lineHeight: 0.78, x: W * 0.02, width: W * 0.96, ...outline('#FFFFFF', 22), wordCount,
      });
      return [
        number(W, 392, 84, '50+', { fontFamily: ABRIL, fill: '#111111', fontSize: 96, ...outline('#FFFFFF', 22) }),
        line(W, 480, 66, 'Medium', p(PLAYFAIR, 78, 1)),
        line(W, 548, 62, 'Length', p(PLAYFAIR, 70, 1)),
        line(W, 632, 142, 'Spring', p(ABRIL, 180, 1)),
        line(W, 784, 70, 'Hairstyles', p(PLAYFAIR, 80, 1)),
        line(W, 856, 74, '2026', p(ABRIL, 86)),
      ];
    },
  }),
  tpl({
    id: 'hb-sticker-serif-curly',
    name: 'Hair — Black Serif Sticker, Two Big Words',
    description: '2×2 photos, outlined black serif stack with two big words (“CURLY”, “IDEAS”) between smaller lines.',
    family: 6,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['collage-4', 'image-text-overlay', 'hair-beauty'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'grid-2x2', gap: 6 },
    layers: ({ W }) => {
      const p = (font: string, size: number, wordCount?: number): TP => ({
        fontFamily: font, fontWeight: font === PLAYFAIR ? 900 : 400, fill: '#111111', fontSize: size, lineHeight: 0.78, x: W * 0.06, width: W * 0.88, ...outline('#FFFFFF', 22), wordCount,
      });
      return [
        number(W, 386, 126, '50', { fontFamily: ABRIL, fill: '#111111', fontSize: 150, ...outline('#FFFFFF', 22) }),
        line(W, 516, 68, 'Gorgeous', p(PLAYFAIR, 76, 1)),
        line(W, 586, 142, 'Curly', p(ABRIL, 176, 1)),
        line(W, 730, 80, 'Hairstyle', p(ABRIL, 92, 1)),
        line(W, 808, 110, 'Ideas', p(ABRIL, 132, 1)),
        line(W, 916, 58, 'For Women', p(PLAYFAIR, 62)),
      ];
    },
  }),
  tpl({
    id: 'hb-sticker-serif-pixie',
    name: 'Hair — Giant Serif Number Sticker',
    description: '2×2 photos with a giant outlined serif number, then the headline in black serif on a thick white outline.',
    family: 6,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['collage-4', 'image-text-overlay', 'number-badge', 'hair-beauty'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'grid-2x2', gap: 6 },
    layers: ({ W }) => {
      const p = (font: string, size: number, wordCount?: number): TP => ({
        fontFamily: font, fontWeight: font === PLAYFAIR ? 900 : 400, fill: '#111111', fontSize: size, lineHeight: 0.78, x: W * 0.06, width: W * 0.88, ...outline('#FFFFFF', 26), wordCount,
      });
      return [
        number(W, 390, 212, '50', { fontFamily: ABRIL, fill: '#111111', fontSize: 260, ...outline('#FFFFFF', 30) }),
        line(W, 604, 92, 'Pixie Cut', p(ABRIL, 106, 2)),
        line(W, 698, 142, 'Ideas', p(ABRIL, 172, 1)),
        line(W, 848, 68, 'For Women', p(PLAYFAIR, 72)),
      ];
    },
  }),
  tpl({
    id: 'hb-sticker-serif-over-50',
    name: 'Hair — Serif Sticker, Big Keyword & Small Lines',
    description: '2×2 photos: outlined serif number, one big keyword (“SHORT”) and three even smaller lines.',
    family: 6,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['collage-4', 'image-text-overlay', 'hair-beauty'],
    w: 736,
    h: 1472,
    collage: { layoutId: 'grid-2x2', gap: 6 },
    layers: ({ W }) => {
      const p = (font: string, size: number, wordCount?: number): TP => ({
        fontFamily: font, fontWeight: font === PLAYFAIR ? 900 : 400, fill: '#111111', fontSize: size, lineHeight: 0.78, x: W * 0.06, width: W * 0.88, ...outline('#FFFFFF', 22), wordCount,
      });
      return [
        number(W, 388, 120, '50', { fontFamily: ABRIL, fill: '#111111', fontSize: 144, ...outline('#FFFFFF', 22) }),
        line(W, 504, 122, 'Short', p(ABRIL, 152, 1)),
        line(W, 626, 70, 'Hair Styles', p(ABRIL, 80, 2)),
        line(W, 696, 70, 'For Women', p(ABRIL, 80, 2)),
        line(W, 766, 70, 'Over 50', p(ABRIL, 80)),
      ];
    },
  }),
];
