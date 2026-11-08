/**
 * "Luxe Hair Collection" — nine 1:2 hair listicle Pins recreated as closely as possible from
 * the user's reference Pins (LuxeHairstyles.com style): a 2×2 photo grid with thin white
 * gutters, and a centred, stepped stack of fixed text boxes — a huge Didone "50", condensed
 * serif caps, italic Playfair lines, beige / brown / black / crimson boxes and, on some, a
 * cream footer with gold rules. Boxes are fixed shapes, so the layout never shifts; longer
 * text shrinks inside its box. Measurements were taken on the 887 × 1774 originals (the
 * "Trendy" Pin on 736 × 1472) and scaled to 736 × 1472.
 */
import { createShape, createText } from '../model/factory';
import type { Layer, Template, TextLayer } from '../model/types';
import { bgOff, tpl } from './kit';

const W = 736;
const H = 1472;
const GOLD = '#C9A45C';
const BEIGE = '#F3EBDD';
const BROWN = '#7B4A20';
const INK = '#111111';
const WHITE = '#FFFFFF';
export const LUXE_HAIR_COLLECTION = 'Luxe Hair Collection';

type Line = {
  /** Box in source pixels (x, y, w, h). */
  box: [number, number, number, number];
  text: string;
  font: string;
  weight?: number;
  italic?: boolean;
  size: number;
  fill?: string;
  role?: TextLayer['role'];
  wordCount?: number;
  caps?: boolean;
  spacing?: number;
};
type Box = { box: [number, number, number, number]; fill: string; border?: string };
type Rule = [number, number, number, number, string];

interface Spec {
  id: string;
  name: string;
  /** Source width: 887 for most references, 736 for the "Trendy" one. */
  src?: number;
  /** Cream footer with gold frame and rules ("bar"), a small pill ("pill") or none. */
  footer?: 'bar' | 'pill';
  /** Gold outline around the stepped white boxes. */
  outline?: boolean;
  boxes: Box[];
  rules?: Rule[];
  lines: Line[];
}

function build(s: Spec): Template {
  const k = W / (s.src ?? 887);
  const P = (v: number) => Math.round(v * k * 100) / 100;
  const footerH = s.footer === 'bar' ? 0.068 : 0;
  return tpl({
    id: s.id,
    name: s.name,
    description: `${LUXE_HAIR_COLLECTION}: a 2×2 photo grid with a centred, stepped stack of serif text boxes — recreated from a top-performing LuxeHairstyles Pin.`,
    family: 8,
    categories: ['Hair', 'Beauty', 'Listicle'],
    designTypes: ['collage-4', 'number-badge', 'listicle', 'editorial'],
    w: W,
    h: H,
    collage: { layoutId: 'grid-2x2', gap: P(8), region: { x: 0, y: 0, width: 1, height: 1 - footerH } },
    layers: () => {
      const out: Layer[] = [];
      const rect = (x: number, y: number, w: number, h: number, fill: string, name = 'Text box', extra: Record<string, unknown> = {}) =>
        createShape({ name, role: 'decor', x: P(x), y: P(y), width: P(w), height: P(h), fill, ...extra });
      // Gold outline: a slightly larger gold box behind each white box; the white boxes drawn
      // afterwards cover the seams, so only the outer stepped edge stays gold.
      if (s.outline) for (const b of s.boxes) out.push(rect(b.box[0] - 3, b.box[1] - 3, b.box[2] + 6, b.box[3] + 6, GOLD, 'Gold outline'));
      for (const b of s.boxes) {
        out.push(rect(b.box[0], b.box[1], b.box[2], b.box[3], b.fill));
        if (b.border) out.push(rect(b.box[0] + 4, b.box[1] + 4, b.box[2] - 8, b.box[3] - 8, 'transparent', 'Box border', { stroke: b.border, strokeWidth: 2 }));
      }
      for (const [x, y, w, h, fill] of s.rules ?? []) out.push(rect(x, y, w, h, fill, 'Rule'));
      for (const l of s.lines) {
        // The text frame is centred on its box and tall enough for the font, so big type (the
        // "50") isn't shrunk by the box height; the box shape itself stays fixed.
        const th = Math.max(l.box[3], l.size * 1.12);
        const ty = l.box[1] + l.box[3] / 2 - th / 2;
        out.push(
          createText({
            name: l.role === 'badge' ? 'Number' : l.role === 'subtitle' ? 'Subtitle line' : 'Title line',
            role: l.role ?? 'title-line',
            x: P(l.box[0]), y: P(ty), width: P(l.box[2]), height: P(th),
            text: l.text, fontFamily: l.font, fontWeight: l.weight ?? 400, italic: !!l.italic,
            fontSize: P(l.size), minFontSize: 12, fill: l.fill ?? INK, align: 'center', verticalAlign: 'middle',
            lineHeight: 1, letterSpacing: l.spacing ?? 0, textTransform: l.caps ? 'uppercase' : 'none', autoFit: true,
            background: bgOff(), ...(l.wordCount ? { wordCount: l.wordCount } : {}),
          }),
        );
      }
      if (s.footer === 'bar') {
        out.push(rect(0, 1655, 887, 119, '#FBF7EF', 'Footer'));
        out.push(rect(9, 1663, 869, 103, 'transparent', 'Footer frame', { stroke: GOLD, strokeWidth: 2 }));
        out.push(rect(40, 1713, 150, 2, GOLD, 'Rule'), rect(697, 1713, 150, 2, GOLD, 'Rule'));
        out.push(createText({ name: 'Website footer', role: 'website', x: P(200), y: P(1675), width: P(487), height: P(78), text: 'LuxeHairstyles.com', fontFamily: 'Playfair Display', fontWeight: 600, fontSize: P(58), minFontSize: 12, fill: INK, align: 'center', verticalAlign: 'middle', lineHeight: 1, background: bgOff() }));
      }
      if (s.footer === 'pill') {
        out.push(rect(160, 1719, 100, 2, '#3A2A1E', 'Rule'), rect(627, 1719, 100, 2, '#3A2A1E', 'Rule'));
        out.push(rect(268, 1690, 352, 60, '#F4F0E8', 'Footer'));
        out.push(createText({ name: 'Website footer', role: 'website', x: P(268), y: P(1690), width: P(352), height: P(60), text: 'LuxeHairstyles.com', fontFamily: 'Playfair Display', fontWeight: 500, italic: true, fontSize: P(36), minFontSize: 10, fill: INK, align: 'center', verticalAlign: 'middle', lineHeight: 1, background: bgOff() }));
      }
      return out;
    },
  });
}

// Abril's digits are ~70% of the font size; the references fill ~87% of the box, hence × 1.22.
const NUM = (box: Line['box'], size: number, fill = INK): Line => ({ box, text: '50', font: 'Abril Fatface', size: size * 1.22, fill, role: 'badge' });
const CAPS = 'Bodoni Moda';

export const LUXE_HAIR_TEMPLATES: Template[] = [
  build({
    id: 'luxe-bixie-gold-steps', name: 'Luxe Hair — Gold-Outlined Steps & Cream Footer', footer: 'bar', outline: true,
    boxes: [
      { box: [307, 518, 272, 172], fill: WHITE },
      { box: [145, 688, 597, 150], fill: WHITE },
      { box: [100, 836, 687, 180], fill: WHITE },
      { box: [158, 1014, 570, 102], fill: '#F6EFDF', border: GOLD },
    ],
    rules: [[115, 985, 75, 2, GOLD], [697, 985, 75, 2, GOLD]],
    lines: [
      NUM([307, 522, 272, 166], 175),
      { box: [150, 693, 587, 140], text: 'Bixie Cut', font: 'Abril Fatface', size: 150, wordCount: 2 },
      { box: [105, 840, 677, 118], text: 'Inspirations', font: 'Abril Fatface', size: 140 },
      { box: [200, 956, 487, 58], text: 'for Women Ready to Try', font: 'Playfair Display', weight: 500, italic: true, size: 50, role: 'subtitle' },
      { box: [168, 1020, 550, 90], text: 'Something New', font: 'Playfair Display', weight: 700, size: 78, role: 'subtitle' },
    ],
  }),
  build({
    id: 'luxe-bob-black-band', name: 'Luxe Hair — Beige, White & Black Bands, Cream Footer', footer: 'bar',
    boxes: [
      { box: [333, 497, 222, 150], fill: WHITE },
      { box: [235, 645, 418, 108], fill: BEIGE },
      { box: [55, 705, 777, 210], fill: WHITE },
      { box: [150, 905, 588, 82], fill: INK },
      { box: [127, 985, 633, 88], fill: BEIGE },
    ],
    rules: [[130, 722, 90, 2, GOLD], [667, 722, 90, 2, GOLD]],
    lines: [
      NUM([333, 499, 222, 146], 165),
      { box: [240, 648, 408, 102], text: 'Bob Cut', font: 'Playfair Display', weight: 600, size: 100, wordCount: 2 },
      { box: [60, 745, 767, 160], text: 'Variations', font: 'Abril Fatface', size: 175 },
      { box: [158, 909, 572, 74], text: 'That Look Amazing', font: 'Playfair Display', weight: 600, size: 64, fill: WHITE, role: 'subtitle' },
      { box: [135, 989, 617, 80], text: 'on Every Face Shape', font: 'Playfair Display', weight: 600, size: 64, role: 'subtitle' },
    ],
  }),
  build({
    id: 'luxe-lob-brown', name: 'Luxe Hair — Brown Keyword & Brown Italic Bar',
    boxes: [
      { box: [320, 540, 247, 150], fill: WHITE },
      { box: [245, 680, 397, 145], fill: WHITE },
      { box: [108, 815, 670, 127], fill: WHITE },
      { box: [233, 935, 420, 74], fill: '#F1E8DD' },
      { box: [172, 1007, 542, 70], fill: BROWN },
    ],
    lines: [
      NUM([320, 543, 247, 145], 165),
      { box: [250, 683, 387, 140], text: 'Lob', font: CAPS, weight: 800, size: 160, fill: BROWN, caps: true, wordCount: 1 },
      { box: [113, 820, 660, 118], text: 'Haircut Ideas', font: CAPS, weight: 800, size: 108, caps: true },
      { box: [238, 938, 410, 68], text: 'to Take to Your', font: 'Playfair Display', weight: 600, italic: true, size: 58, role: 'subtitle' },
      { box: [177, 1010, 532, 64], text: 'Next Salon Appointment', font: 'Playfair Display', weight: 500, italic: true, size: 48, fill: WHITE, role: 'subtitle' },
    ],
  }),
  build({
    id: 'luxe-medium-two-line', name: 'Luxe Hair — Two-Line Caps & Beige Italic Boxes',
    boxes: [
      { box: [315, 538, 257, 178], fill: WHITE },
      { box: [60, 715, 768, 227], fill: WHITE },
      { box: [228, 940, 432, 76], fill: '#EFE6DB' },
      { box: [172, 1015, 545, 96], fill: '#EFE6DB' },
    ],
    lines: [
      NUM([315, 541, 257, 172], 185),
      { box: [65, 722, 758, 106], text: 'Medium Length', font: CAPS, weight: 800, size: 100, caps: true, wordCount: 2 },
      { box: [65, 830, 758, 106], text: 'Hairstyle Ideas', font: CAPS, weight: 800, size: 100, caps: true },
      { box: [233, 943, 422, 70], text: 'That Work for', font: 'Playfair Display', weight: 700, italic: true, size: 60, role: 'subtitle' },
      { box: [177, 1019, 535, 88], text: 'Every Hair Type', font: 'Playfair Display', weight: 600, size: 76, role: 'subtitle' },
    ],
  }),
  build({
    id: 'luxe-short-over-50', name: 'Luxe Hair — Stacked Caps, Italic Lines & Beige "Over 50"',
    boxes: [
      { box: [345, 512, 210, 138], fill: WHITE },
      { box: [300, 648, 287, 70], fill: WHITE },
      { box: [112, 712, 663, 120], fill: WHITE },
      { box: [245, 828, 400, 68], fill: WHITE },
      { box: [205, 893, 477, 104], fill: '#E8DCCB' },
      { box: [315, 995, 260, 62], fill: WHITE },
      { box: [243, 1052, 402, 137], fill: WHITE },
    ],
    lines: [
      NUM([345, 514, 210, 134], 160),
      { box: [305, 651, 277, 64], text: 'Short', font: CAPS, weight: 700, size: 62, caps: true, wordCount: 1 },
      { box: [117, 716, 653, 112], text: 'Hairstyles', font: 'Playfair Display', weight: 900, size: 120, caps: true, wordCount: 1 },
      { box: [250, 830, 390, 64], text: 'for Women', font: 'Playfair Display', weight: 600, italic: true, size: 62, wordCount: 2 },
      { box: [210, 897, 467, 96], text: 'Over 50', font: 'Playfair Display', weight: 700, size: 96, caps: true },
      { box: [320, 997, 250, 58], text: 'That Look', font: 'Playfair Display', weight: 600, italic: true, size: 52, role: 'subtitle' },
      { box: [248, 1056, 392, 64], text: 'Absolutely', font: 'Playfair Display', weight: 800, size: 62, caps: true, role: 'subtitle' },
      { box: [248, 1120, 392, 64], text: 'Modern', font: 'Playfair Display', weight: 800, size: 64, caps: true, role: 'subtitle' },
    ],
  }),
  build({
    id: 'luxe-trendy-black-boxes', name: 'Luxe Hair — Black Number Box, Huge Caps & Black "Ideas"', src: 736,
    boxes: [
      { box: [280, 365, 186, 148], fill: INK },
      { box: [215, 512, 330, 60], fill: WHITE },
      { box: [40, 570, 666, 160], fill: WHITE },
      { box: [155, 728, 430, 76], fill: WHITE },
      { box: [245, 830, 250, 78], fill: INK },
      { box: [165, 908, 420, 60], fill: WHITE },
    ],
    rules: [[225, 543, 16, 3, INK], [519, 543, 16, 3, INK], [75, 765, 45, 3, INK], [620, 765, 45, 3, INK]],
    lines: [
      NUM([280, 368, 186, 142], 140, WHITE),
      { box: [245, 515, 270, 54], text: 'Trendy', font: CAPS, weight: 800, size: 50, caps: true, spacing: 2, wordCount: 1 },
      { box: [45, 575, 656, 150], text: 'Short', font: 'Abril Fatface', size: 160, caps: true, wordCount: 1 },
      { box: [160, 731, 420, 70], text: 'Hairstyles', font: CAPS, weight: 800, size: 60, caps: true, spacing: 2, wordCount: 1 },
      { box: [250, 834, 240, 70], text: 'Ideas', font: CAPS, weight: 800, size: 64, caps: true, fill: WHITE },
      { box: [170, 911, 410, 54], text: 'For Every Woman', font: CAPS, weight: 800, size: 36, caps: true, spacing: 1, role: 'subtitle' },
    ],
  }),
  build({
    id: 'luxe-modern-stylist', name: 'Luxe Hair — Brown "Modern", Brown "Stylist" & Pill Footer', footer: 'pill',
    boxes: [
      { box: [335, 515, 225, 148], fill: WHITE },
      { box: [245, 660, 400, 110], fill: WHITE },
      { box: [103, 768, 680, 147], fill: WHITE },
      { box: [210, 913, 475, 80], fill: '#F2ECE4' },
      { box: [272, 990, 355, 112], fill: '#8B5A2B' },
    ],
    lines: [
      NUM([335, 517, 225, 144], 165),
      { box: [250, 663, 390, 104], text: 'Modern', font: CAPS, weight: 800, size: 96, caps: true, fill: BROWN, wordCount: 1 },
      { box: [108, 772, 670, 138], text: 'Hair Ideas', font: CAPS, weight: 800, size: 135, caps: true },
      { box: [215, 916, 465, 74], text: 'to Show Your', font: 'Playfair Display', weight: 600, italic: true, size: 64, role: 'subtitle' },
      { box: [277, 994, 345, 104], text: 'Stylist', font: 'Playfair Display', weight: 600, italic: true, size: 96, fill: WHITE, role: 'subtitle' },
    ],
  }),
  build({
    id: 'luxe-long-brown-caps', name: 'Luxe Hair — Brown Caps Keyword & Beige Italic Box',
    boxes: [
      { box: [330, 497, 225, 160], fill: WHITE },
      { box: [290, 655, 315, 112], fill: WHITE },
      { box: [108, 765, 700, 102], fill: WHITE },
      { box: [237, 860, 420, 86], fill: '#EFE6D8' },
      { box: [185, 943, 520, 70], fill: WHITE },
    ],
    lines: [
      NUM([330, 499, 225, 156], 170),
      { box: [295, 658, 305, 106], text: 'Long', font: CAPS, weight: 800, size: 100, caps: true, wordCount: 1 },
      { box: [113, 768, 690, 96], text: 'Hairstyle Ideas', font: CAPS, weight: 800, size: 100, caps: true, fill: '#7B3F1A' },
      { box: [242, 863, 410, 80], text: 'for Women', font: 'Playfair Display', weight: 700, italic: true, size: 80, role: 'subtitle' },
      { box: [190, 946, 510, 64], text: 'That Are Pure Inspiration', font: 'Playfair Display', weight: 600, italic: true, size: 50, role: 'subtitle' },
    ],
  }),
  build({
    id: 'luxe-spring-crimson', name: 'Luxe Hair — Crimson & Black Caps, Pink Italic Box',
    boxes: [
      { box: [325, 580, 245, 152], fill: WHITE },
      { box: [78, 730, 732, 205], fill: WHITE },
      { box: [255, 930, 375, 86], fill: '#FBE3E1' },
      { box: [158, 1015, 570, 76], fill: WHITE },
    ],
    lines: [
      NUM([325, 582, 245, 148], 165),
      { box: [83, 735, 722, 96], text: 'Medium Length', font: CAPS, weight: 800, size: 96, caps: true, fill: '#C0394B', wordCount: 2 },
      { box: [83, 834, 722, 96], text: 'Spring Hairstyles', font: CAPS, weight: 800, size: 96, caps: true },
      { box: [260, 933, 365, 80], text: 'for 2026', font: 'Playfair Display', weight: 700, italic: true, size: 76, role: 'subtitle' },
      { box: [163, 1018, 560, 70], text: 'That Feel Light and Fresh', font: 'Playfair Display', weight: 600, italic: true, size: 52, role: 'subtitle' },
    ],
  }),
].map((t) => ({ ...t, collection: LUXE_HAIR_COLLECTION, highCtr: true }));
