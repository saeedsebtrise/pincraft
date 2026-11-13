/**
 * "Script & Bar Collection" — the user's reference outfit Pin ("20 Trendy Combat Boot
 * Outfits", carolineathouse.com) recreated, plus seven variations in other colours, scripts
 * and photo counts. Two photos above and two below a white band: a big rounded number in
 * the accent colour with a black outline and an offset accent shadow, a script word beside
 * it, a full-width accent bar with white condensed caps, a black condensed closing line, and
 * the website in spaced white caps over the bottom photos.
 * Measured on the 736 × 1321 original; the band keeps its pixel size at 736 × 1472.
 */
import { createShape } from '../model/factory';
import type { Layer, Template, TextLayer } from '../model/types';
import { badge, bandShape, bgOff, footer, titleLine, tpl } from './kit';

export const SCRIPT_BAR_COLLECTION = 'Script & Bar Collection';
const INK = '#111111';

type TP = Partial<TextLayer>;
const ln = (W: number, x: number, y: number, w: number, h: number, text: string, p: TP = {}) =>
  titleLine(W, y, h, text, { x, width: w, background: bgOff(), letterSpacing: 0, lineHeight: 1, fontWeight: 400, fontSize: h * 0.92, minFontSize: 14, align: 'center', ...p });

interface Look {
  id: string;
  name: string;
  w?: number;
  h?: number;
  layout?: 'band-2-2' | 'band-2-3' | 'band-3-3';
  /** Number, bar colour and the number's shadow. */
  accent: string;
  /** Number colour when it shouldn't be the accent (e.g. yellow on a black-bar design). */
  numberColor?: string;
  /** Bar text colour (white unless the bar is light). */
  barText?: string;
  numberFont?: { family: string; weight: number };
  script: { font: string; word: string };
  bar: string;
  closing: string;
  barFont?: string;
  closingFont?: { family: string; weight: number };
  site?: string;
  categories: Template['categories'];
}

function build(l: Look): Template {
  const W = l.w ?? 736;
  const H = l.h ?? 1472;
  // The reference band is 345 px tall on a 736-wide Pin; keep that height at any Pin height.
  const bandShare = (345 * (W / 736)) / H;
  return tpl({
    id: l.id,
    name: l.name,
    description: `${SCRIPT_BAR_COLLECTION}: photos above and below a white band with a big outlined number, a script word, a full-width colour bar of condensed caps and a bold closing line.`,
    family: 5,
    categories: l.categories,
    designTypes: ['split', 'script-bold', 'number-badge', 'listicle'],
    w: W,
    h: H,
    collage: { layoutId: l.layout ?? 'band-2-2', gap: W * 0.012, band: bandShare },
    layers: ({ band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      const nf = l.numberFont ?? { family: 'Fredoka', weight: 700 };
      const numH = h(0.38);
      const out: Layer[] = [
        bandShape('#FFFFFF'),
        // The big number: accent fill, black outline, accent copy offset down-right.
        // Rounded digits are ~70% of the font size: × 1.32 makes them fill the reference's height.
        badge(W * 0.045, y(0.02) - numH * 0.18, numH * 1.36, '20', 'square', '#FFFFFF', l.numberColor ?? l.accent, {
          x: W * 0.045, width: W * 0.32, height: numH * 1.36, background: bgOff(), fontFamily: nf.family, fontWeight: nf.weight,
          fontSize: numH * 1.32, lineHeight: 1, stroke: INK, strokeWidth: numH * 0.06,
          shadow: { enabled: true, color: l.accent, blur: 0, offsetX: numH * 0.06, offsetY: numH * 0.05, opacity: 1 },
        }),
        // Script fonts have tall ascenders; a taller frame lets the word reach the reference's size.
        ln(W, W * 0.37, y(-0.06), W * 0.6, h(0.5), l.script.word, { fontFamily: l.script.font, fill: INK, textTransform: 'none', fontSize: h(0.5), wordCount: 1 }),
        createShape({ name: 'Keyword bar', role: 'decor', x: 0, y: y(0.42), width: W, height: h(0.335), fill: l.accent }),
        ln(W, W * 0.03, y(0.445), W * 0.94, h(0.29), l.bar, { fontFamily: l.barFont ?? 'Bebas Neue', fill: l.barText ?? '#FFFFFF', textTransform: 'uppercase', wordCount: 3 }),
        ln(W, W * 0.03, y(0.79), W * 0.94, h(0.18), l.closing, { fontFamily: (l.closingFont ?? { family: 'Oswald', weight: 600 }).family, fontWeight: (l.closingFont ?? { family: 'Oswald', weight: 600 }).weight, fill: INK, textTransform: 'uppercase' }),
        footer(W, H, 'plain-light', {
          x: 0, width: W, y: H - W * 0.05, height: W * 0.035, text: l.site ?? 'yourwebsite.com', fontFamily: 'Montserrat', fontWeight: 600,
          fontSize: W * 0.021, letterSpacing: W * 0.009, textTransform: 'uppercase', fill: '#FFFFFF',
          shadow: { enabled: true, color: '#000000', blur: 6, offsetX: 0, offsetY: 1, opacity: 0.5 },
        }),
      ];
      return out;
    },
  });
}

const STYLE: Template['categories'] = ['Fashion', 'Lifestyle', 'Listicle'];

export const SCRIPT_BAR_TEMPLATES: Template[] = [
  build({
    id: 'sb-pink-combat-boots', name: 'Script & Bar — Pink Number, "Trendy" & Pink Bar (reference)',
    accent: '#F0428F', script: { font: 'Kaushan Script', word: 'Trendy' }, bar: 'Combat Boot Outfits', closing: "You Can't Get Around Right Now",
    site: 'carolineathouse.com', categories: STYLE,
  }),
  build({
    id: 'sb-teal-easy-6', name: 'Script & Bar — Teal Bar, "Easy", 6 Photos',
    layout: 'band-3-3', accent: '#14A3A0', script: { font: 'Pacifico', word: 'Easy' }, bar: 'Fall Nail Designs', closing: 'You Will Want to Try This Week', categories: ['Beauty', 'Listicle'],
  }),
  build({
    id: 'sb-orange-cozy', name: 'Script & Bar — Orange Bar, "Cozy", 5 Photos',
    layout: 'band-2-3', accent: '#F27A1A', script: { font: 'Yellowtail', word: 'Cozy' }, bar: 'Fall Outfit Ideas', closing: 'To Wear on Repeat This Season', categories: STYLE,
  }),
  build({
    id: 'sb-purple-chic-23', name: 'Script & Bar — Purple Bar, "Chic", 2:3',
    w: 1000, h: 1500, accent: '#8B4FD8', script: { font: 'Satisfy', word: 'Chic' }, bar: 'Winter Outfits', closing: 'That Look Expensive on a Budget', categories: STYLE,
  }),
  build({
    id: 'sb-red-recipes-6', name: 'Script & Bar — Red Bar, "Easy", Recipes, 6 Photos',
    layout: 'band-3-3', accent: '#E3262E', numberFont: { family: 'Poppins', weight: 800 }, script: { font: 'Lobster', word: 'Easy' }, bar: 'Dinner Recipes',
    closing: 'Your Family Will Ask for Again', categories: ['Food / Recipe', 'Listicle'],
  }),
  build({
    id: 'sb-black-yellow-bold', name: 'Script & Bar — Black Bar, Yellow Caps & Number',
    accent: '#111111', numberColor: '#FFD21F', barText: '#FFD21F', script: { font: 'Kaushan Script', word: 'Bold' }, bar: 'Street Style Looks', closing: 'Everyone Is Copying Right Now', categories: STYLE,
  }),
  build({
    id: 'sb-green-fresh-decor', name: 'Script & Bar — Green Bar, "Fresh", Home Decor',
    accent: '#2F9E5B', script: { font: 'Dancing Script', word: 'Fresh' }, bar: 'Spring Decor Ideas', closing: 'To Brighten Up Every Room', categories: ['Home Decor', 'Living Room', 'Listicle'],
  }),
  build({
    id: 'sb-blue-dreamy-hair', name: 'Script & Bar — Blue Bar, "Dreamy", Hairstyles',
    accent: '#2F6FE4', numberFont: { family: 'Poppins', weight: 800 }, script: { font: 'Sacramento', word: 'Dreamy' }, bar: 'Wedding Hairstyles',
    closing: 'For Every Hair Length', categories: ['Hair', 'Beauty', 'Listicle'],
  }),
].map((t) => ({ ...t, collection: SCRIPT_BAR_COLLECTION, highCtr: true }));
