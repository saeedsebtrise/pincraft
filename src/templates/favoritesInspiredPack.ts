/**
 * Twelve designs inspired by the user's two favorite templates:
 *  - "Orange Circle, Script & Outlined Keyword": a light panel between the photos, a circle
 *    number, a script word, a huge condensed keyword with a dark outline and hard shadow,
 *    a condensed benefit line and a CTA pill.
 *  - "Big Outlined Number over the Photo Edge": a white band whose big outlined number breaks
 *    up over the top photos, condensed caps beside it, a coloured keyword and a closing line.
 * Each keeps what was liked (headline band between photos, bold bands, tall condensed type)
 * in new colours, scripts, condensed fonts, photo counts and Pin sizes.
 */
import { createShape, createText } from '../model/factory';
import type { Layer, Template, TextLayer } from '../model/types';
import { badge, bandShape, bgOff, bgOn, footer, titleLine, tpl } from './kit';

type TP = Partial<TextLayer>;
type Size = { w: number; h: number };
const BLOG: Size = { w: 736, h: 1472 };
const STANDARD: Size = { w: 1000, h: 1500 };
const TALL: Size = { w: 1080, h: 1920 };
const INK = '#141414';

const ln = (W: number, x: number, y: number, w: number, h: number, text: string, p: TP = {}) =>
  titleLine(W, y, h, text, { x, width: w, background: bgOff(), letterSpacing: 0, lineHeight: 1, fontWeight: 400, fontSize: h * 0.92, minFontSize: 18, ...p });
/** Huge condensed keyword with a dark outline and a hard drop shadow (favorite 1). */
const outlinedKeyword = (font: string, fill: string, outline: string, h: number, p: TP = {}): TP => ({
  fontFamily: font, fill, stroke: outline, strokeWidth: Math.max(3, h * 0.035),
  shadow: { enabled: true, color: outline, blur: 0, offsetX: Math.max(3, h * 0.03), offsetY: Math.max(3, h * 0.03), opacity: 0.9 }, ...p,
});
const cta = (W: number, H: number, y: number, color: string, fill: string, text: string) => {
  const w = W * 0.44;
  const h = H * 0.027;
  return createText({
    name: 'Call to action', role: 'cta', x: (W - w) / 2, y, width: w, height: h, text,
    fontFamily: 'Montserrat', fontWeight: 800, fontSize: h * 0.5, minFontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fill,
    background: bgOn(color, { hug: true, shape: 'pill', paddingX: h * 0.6, paddingY: h * 0.2 }),
  });
};
const web = (W: number, H: number, fill = '#FFFFFF') =>
  footer(W, H, 'plain-light', {
    x: 0, width: W, y: H * 0.958, height: H * 0.026, fontFamily: 'Montserrat', fontWeight: 800, fontSize: H * 0.012, letterSpacing: 3, fill,
    shadow: { enabled: true, color: '#000000', blur: 8, offsetX: 0, offsetY: 1, opacity: 0.55 },
  });
const footerBar = (W: number, H: number, color: string, text = '#FFFFFF'): Layer[] => [
  createShape({ name: 'Footer bar', role: 'decor', x: 0, y: H * 0.958, width: W, height: H * 0.042, fill: color }),
  footer(W, H, 'plain-light', { x: 0, width: W, y: H * 0.961, height: H * 0.036, fontFamily: 'Montserrat', fontWeight: 700, fontSize: H * 0.016, letterSpacing: 5, fill: text }),
];

// ---------------------------------------------------------------- archetype 1: circle + script + outlined keyword

interface ScriptLook {
  id: string;
  name: string;
  size: Size;
  layout: 'band-2-2' | 'band-2-3' | 'band-3-3';
  panel: string;
  accent: string;
  /** Number circle colour and digit colour. */
  circle: [string, string];
  script: { font: string; color: string; word: string };
  keyword: { font: string; word: string };
  benefit: { font: string; color: string; weight: number; text: string };
  outline: string;
  ctaColors: [string, string];
  ctaText: string;
  categories: Template['categories'];
}

function scriptTemplate(l: ScriptLook): Template {
  return tpl({
    id: l.id,
    name: l.name,
    description: `Photos above and below a ${l.panel.toLowerCase() === '#141414' ? 'black' : 'light'} panel: a circle number, a ${l.script.font} script word, a huge outlined ${l.keyword.font} keyword and a bold condensed benefit line, with a CTA pill. Inspired by your favorite circle-and-script design.`,
    family: 5,
    categories: l.categories,
    designTypes: ['split', 'script-bold', 'number-badge'],
    ...l.size,
    collage: { layoutId: l.layout, gap: 6, band: 0.3 },
    layers: ({ W, H, band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      const d = h(0.34);
      return [
        bandShape(l.panel),
        badge(W * 0.2 - d / 2, y(0.19) - d / 2, d, '25', 'circle', l.circle[0], l.circle[1], { fontFamily: 'Anton', fontSize: d * 0.6 }),
        ln(W, W * 0.38, y(0.03), W * 0.58, h(0.32), l.script.word, { fontFamily: l.script.font, textTransform: 'none', fill: l.script.color, wordCount: 1 }),
        ln(W, W * 0.03, y(0.37), W * 0.94, h(0.3), l.keyword.word, outlinedKeyword(l.keyword.font, l.accent, l.outline, h(0.3), { textTransform: 'uppercase', wordCount: 2 })),
        ln(W, W * 0.06, y(0.71), W * 0.88, h(0.26), l.benefit.text, { fontFamily: l.benefit.font, fontWeight: l.benefit.weight, fill: l.benefit.color, textTransform: 'uppercase', lineHeight: 1.02, fontSize: h(0.12) }),
        cta(W, H, H * 0.9, l.ctaColors[0], l.ctaColors[1], l.ctaText),
        web(W, H),
      ];
    },
  });
}

// ---------------------------------------------------------------- archetype 2: big outlined number over the photo edge

interface EdgeLook {
  id: string;
  name: string;
  size: Size;
  layout: 'band-2-2' | 'band-2-3' | 'band-3-3';
  band: string;
  accent: string;
  /** Text colour of the plain lines on the band. */
  ink: string;
  numberOutline: string;
  font: string;
  lead: string;
  keyword: string;
  closing: { font: string; weight: number; text: string };
  bar?: string;
  categories: Template['categories'];
}

function edgeTemplate(l: EdgeLook): Template {
  return tpl({
    id: l.id,
    name: l.name,
    description: `Photos above and below a ${l.band.toLowerCase() === '#141414' ? 'black' : 'light'} band: a big outlined number breaking up over the top photos, ${l.font} caps beside it, a huge coloured keyword and a bold closing line. Inspired by your favorite big-number design.`,
    family: 2,
    categories: l.categories,
    designTypes: ['split', 'number-badge', 'listicle'],
    ...l.size,
    collage: { layoutId: l.layout, gap: 8, band: 0.28, ...(l.bar ? { region: { x: 0, y: 0, width: 1, height: 0.958 } } : {}) },
    layers: ({ W, H, band }) => {
      const y = (f: number) => band.y + band.height * f;
      const h = (f: number) => band.height * f;
      return [
        bandShape(l.band),
        badge(W * 0.03, y(-0.3), h(0.62), '20', 'square', '#FFFFFF', l.accent, {
          x: W * 0.03, width: W * 0.38, height: h(0.62), background: bgOff(), fontFamily: 'Archivo Black', fontSize: h(0.62) * 0.92, lineHeight: 1,
          stroke: l.numberOutline, strokeWidth: h(0.62) * 0.045,
        }),
        ln(W, W * 0.42, y(0.05), W * 0.55, h(0.27), l.lead, { fontFamily: l.font, fill: l.ink, textTransform: 'uppercase', wordCount: 2 }),
        ln(W, W * 0.03, y(0.36), W * 0.94, h(0.33), l.keyword, { fontFamily: l.font, fill: l.accent, textTransform: 'uppercase' }),
        // The closing line is the Pin's subtitle, so a short title never leaves it empty.
        createText({
          name: 'Subtitle line', role: 'subtitle', x: W * 0.03, y: y(0.74), width: W * 0.94, height: h(0.18), text: l.closing.text,
          fontFamily: l.closing.font, fontWeight: l.closing.weight, fill: l.ink, textTransform: 'uppercase', fontSize: h(0.18) * 0.85, minFontSize: 16, lineHeight: 1, letterSpacing: 0, background: bgOff(),
        }),
        ...(l.bar ? footerBar(W, H, l.bar) : [web(W, H)]),
      ];
    },
  });
}

const BEAUTY: Template['categories'] = ['Hair', 'Beauty', 'Listicle'];
const STYLE: Template['categories'] = ['Fashion', 'Lifestyle', 'Listicle'];
const HOME: Template['categories'] = ['Home Decor', 'Living Room', 'Listicle'];

export const FAVORITES_INSPIRED_TEMPLATES: Template[] = [
  scriptTemplate({
    id: 'fav-teal-circle-gorgeous', name: 'Inspired — Teal Circle, Script & Outlined Teal Keyword', size: BLOG, layout: 'band-2-2',
    panel: '#F2FAF8', accent: '#14A3A0', circle: ['#14A3A0', '#FFFFFF'], outline: '#0E3B3A',
    script: { font: 'Pacifico', color: INK, word: 'Gorgeous' }, keyword: { font: 'Anton', word: 'Bob Haircuts' },
    benefit: { font: 'Anton', color: INK, weight: 400, text: 'for Fine Hair That Add Instant Volume' }, ctaColors: ['#14A3A0', '#FFFFFF'], ctaText: 'See the Looks', categories: BEAUTY,
  }),
  scriptTemplate({
    id: 'fav-coral-circle-chic', name: 'Inspired — Coral Circle, Lobster Script & Outlined Coral Keyword', size: STANDARD, layout: 'band-2-3',
    panel: '#FFF4EE', accent: '#F2643C', circle: ['#F2643C', '#FFFFFF'], outline: '#4A1F12',
    script: { font: 'Lobster', color: '#4A1F12', word: 'Chic' }, keyword: { font: 'Bebas Neue', word: 'Fall Outfits' },
    benefit: { font: 'Oswald', color: INK, weight: 700, text: 'You Will Want to Wear on Repeat' }, ctaColors: ['#F2643C', '#FFFFFF'], ctaText: 'Get the Outfits', categories: STYLE,
  }),
  scriptTemplate({
    id: 'fav-purple-circle-dreamy', name: 'Inspired — Purple Circle, Kaushan Script & Outlined Purple Keyword, 6 Photos', size: TALL, layout: 'band-3-3',
    panel: '#F7F2FC', accent: '#8B4FD8', circle: ['#8B4FD8', '#FFFFFF'], outline: '#2B1647',
    script: { font: 'Kaushan Script', color: INK, word: 'Dreamy' }, keyword: { font: 'Anton', word: 'Nail Designs' },
    benefit: { font: 'Anton', color: INK, weight: 400, text: 'to Try Before the Season Ends' }, ctaColors: ['#8B4FD8', '#FFFFFF'], ctaText: 'See All the Ideas', categories: BEAUTY,
  }),
  scriptTemplate({
    id: 'fav-gold-black-luxe', name: 'Inspired — Black Panel, Gold Circle & Outlined Gold Keyword', size: BLOG, layout: 'band-2-2',
    panel: '#141414', accent: '#F5B82E', circle: ['#F5B82E', INK], outline: '#000000',
    script: { font: 'Yellowtail', color: '#FFFFFF', word: 'Luxe' }, keyword: { font: 'Anton', word: 'Living Rooms' },
    benefit: { font: 'Oswald', color: '#FFFFFF', weight: 700, text: 'That Look Expensive on a Budget' }, ctaColors: ['#F5B82E', INK], ctaText: 'Get the Ideas', categories: HOME,
  }),
  scriptTemplate({
    id: 'fav-pink-circle-cute', name: 'Inspired — Hot Pink Circle, Satisfy Script & Outlined Pink Keyword', size: STANDARD, layout: 'band-2-2',
    panel: '#FFF0F6', accent: '#F0168C', circle: [INK, '#FFFFFF'], outline: INK,
    script: { font: 'Satisfy', color: '#F0168C', word: 'Cute' }, keyword: { font: 'League Gothic', word: 'Summer Nails' },
    benefit: { font: 'Anton', color: INK, weight: 400, text: 'Everyone Will Ask You About' }, ctaColors: ['#F0168C', '#FFFFFF'], ctaText: 'Save These Ideas', categories: BEAUTY,
  }),
  scriptTemplate({
    id: 'fav-green-circle-cozy', name: 'Inspired — Green Circle, Pacifico Script & Outlined Green Keyword, 5 Photos', size: BLOG, layout: 'band-2-3',
    panel: '#FBF6EC', accent: '#3E8E5A', circle: ['#3E8E5A', '#FFFFFF'], outline: '#1E3A27',
    script: { font: 'Pacifico', color: '#B5653A', word: 'Cozy' }, keyword: { font: 'Fjalla One', word: 'Patio Ideas' },
    benefit: { font: 'Oswald', color: INK, weight: 700, text: 'for Small Spaces on a Budget' }, ctaColors: ['#3E8E5A', '#FFFFFF'], ctaText: 'See All the Ideas', categories: ['Patio', 'Balcony', 'Home Decor', 'Listicle'],
  }),
  edgeTemplate({
    id: 'fav-edge-orange', name: 'Inspired — Big Orange Number over the Photo Edge', size: TALL, layout: 'band-2-3',
    band: '#FFFFFF', accent: '#F27A1A', ink: INK, numberOutline: INK, font: 'Anton',
    lead: 'Easy Fall', keyword: 'Dinner Recipes', closing: { font: 'Oswald', weight: 700, text: 'Your Family Will Ask for Again' }, categories: ['Food / Recipe', 'Listicle'],
  }),
  edgeTemplate({
    id: 'fav-edge-teal', name: 'Inspired — Big Teal Number over the Photo Edge, 4 Photos', size: BLOG, layout: 'band-2-2',
    band: '#FFFFFF', accent: '#0FA3A3', ink: INK, numberOutline: INK, font: 'Bebas Neue',
    lead: 'Short Layered', keyword: 'Haircuts', closing: { font: 'Oswald', weight: 700, text: 'That Look Good on Everyone' }, categories: BEAUTY,
  }),
  edgeTemplate({
    id: 'fav-edge-red-bar', name: 'Inspired — Big Red Number, 6 Photos & Red Website Bar', size: STANDARD, layout: 'band-3-3',
    band: '#FFFFFF', accent: '#E3262E', ink: INK, numberOutline: INK, font: 'Anton',
    lead: 'Christmas', keyword: 'Decor Ideas', closing: { font: 'Oswald', weight: 700, text: 'To Make Your Home Feel Magical' }, bar: '#E3262E', categories: HOME,
  }),
  edgeTemplate({
    id: 'fav-edge-purple-cream', name: 'Inspired — Big Purple Number on a Cream Band', size: BLOG, layout: 'band-2-3',
    band: '#FBF4E8', accent: '#7B3FC4', ink: INK, numberOutline: INK, font: 'League Gothic',
    lead: 'Old Money', keyword: 'Outfit Ideas', closing: { font: 'Oswald', weight: 700, text: 'Everyone Will Be Copying' }, categories: STYLE,
  }),
  edgeTemplate({
    id: 'fav-edge-gold-black', name: 'Inspired — Big Gold Number on a Black Band', size: TALL, layout: 'band-2-2',
    band: '#141414', accent: '#F5B82E', ink: '#FFFFFF', numberOutline: '#FFFFFF', font: 'Anton',
    lead: 'Winter Date', keyword: 'Night Outfits', closing: { font: 'Oswald', weight: 700, text: 'That Feel Effortlessly Classy' }, categories: STYLE,
  }),
  edgeTemplate({
    id: 'fav-edge-blue-bar', name: 'Inspired — Big Blue Number & Blue Website Bar, 5 Photos', size: STANDARD, layout: 'band-2-3',
    band: '#FFFFFF', accent: '#2563C9', ink: INK, numberOutline: INK, font: 'Bebas Neue',
    lead: 'Small Bedroom', keyword: 'Ideas', closing: { font: 'Oswald', weight: 700, text: 'That Make It Feel Twice as Big' }, bar: '#2563C9', categories: HOME,
  }),
].map((t) => ({ ...t, highCtr: true }));
