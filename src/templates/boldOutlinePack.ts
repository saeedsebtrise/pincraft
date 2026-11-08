/**
 * "Bold outline" listicle Pins, recreated from top-performing hair Pins: one photo
 * fills the Pin, a giant list number sits on top, and the title runs in huge, heavy
 * type with a thick black outline — white lines alternating with a bright keyword
 * colour — so it reads on any photo with no box behind it. The website sits at the
 * bottom in the same outlined style. Twelve fonts × colour combinations.
 */
import type { TextLayer } from '../model/types';
import { badge, bgOff, footer, titleLine, tpl } from './kit';

type TP = Partial<TextLayer>;
const W = 1000;
const H = 1500;

interface Look {
  font: string;
  weight: number;
  /** Uppercase like "SHORT HAIRSTYLES", or the title's own case like "Hairstyles for Short Hair". */
  caps: boolean;
  accent: string;
  /** Text colour of the plain lines (and the outline drawn around everything). */
  ink?: string;
  outline?: string;
  /** Number colour; white by default. */
  number?: string;
}

/** Outlined type: the stroke sits behind the fill, so `strokeWidth / 2` shows as the outline. */
const outlined = (look: Look, fill: string, fontSize: number, p: TP = {}): TP => ({
  fontFamily: look.font,
  fontWeight: look.weight,
  textTransform: look.caps ? 'uppercase' : 'none',
  fill,
  stroke: look.outline ?? '#000000',
  strokeWidth: Math.round(fontSize * 0.16),
  background: bgOff(),
  letterSpacing: 0,
  lineHeight: 1,
  fontSize,
  minFontSize: 28,
  shadow: { enabled: true, color: '#000000', blur: 0, offsetX: 0, offsetY: Math.round(fontSize * 0.04), opacity: 0.9 },
  ...p,
});

/** One headline line across the Pin (Auto Design puts the title's words in). */
const line = (look: Look, y: number, h: number, fill: string, p: TP = {}) =>
  titleLine(W, y, h, 'Title', { x: W * 0.03, width: W * 0.94, align: 'center', ...outlined(look, fill, h * 0.9), ...p });

/** The giant list number. */
const number = (look: Look, y: number, h: number) =>
  badge(W * 0.1, y, h, '22', 'square', '#FFFFFF', look.number ?? '#FFFFFF', {
    x: W * 0.1,
    width: W * 0.8,
    height: h,
    ...outlined(look, look.number ?? '#FFFFFF', h * 0.95),
    strokeWidth: Math.round(h * 0.11),
  });

/** Website in white outlined type at the bottom. */
const site = (look: Look) =>
  footer(W, H, 'plain-light', {
    y: H * 0.925,
    height: H * 0.04,
    ...outlined({ ...look, caps: false }, look.ink ?? '#FFFFFF', H * 0.03, { fontFamily: 'Poppins', fontWeight: 800, strokeWidth: 9, minFontSize: 18 }),
  });

/** Number on top, then four lines: keyword colour, plain, plain, keyword colour. */
function stackedLayers(look: Look) {
  const ink = look.ink ?? '#FFFFFF';
  return () => [
    number(look, H * 0.07, H * 0.27),
    line(look, H * 0.37, H * 0.115, look.accent, { wordCount: 1 }),
    line(look, H * 0.495, H * 0.115, ink, { wordCount: 1 }),
    line(look, H * 0.62, H * 0.115, ink),
    line(look, H * 0.745, H * 0.115, look.accent),
    site(look),
  ];
}

/** Number on top, then three lines: plain, keyword colour, keyword colour ("Hairstyles / for Short / Hair"). */
function titleCaseLayers(look: Look) {
  const ink = look.ink ?? '#FFFFFF';
  return () => [
    number(look, H * 0.08, H * 0.28),
    line(look, H * 0.4, H * 0.13, ink, { wordCount: 1 }),
    line(look, H * 0.55, H * 0.13, look.accent),
    line(look, H * 0.7, H * 0.13, look.accent),
    site(look),
  ];
}

/** For photos with the face up top: the number and title sit in the lower half. */
function lowLayers(look: Look) {
  const ink = look.ink ?? '#FFFFFF';
  return () => [
    number(look, H * 0.33, H * 0.2),
    line(look, H * 0.54, H * 0.092, look.accent, { wordCount: 1 }),
    line(look, H * 0.636, H * 0.092, ink),
    line(look, H * 0.732, H * 0.092, ink),
    line(look, H * 0.828, H * 0.092, look.accent),
    site(look),
  ];
}

const YELLOW = '#FFB84D';
const LIME = '#C8FF6E';
const PINK = '#FF6FB5';
const CYAN = '#5CE1FF';
const CORAL = '#FF8A5B';
const GOLD = '#FFD23F';
const LILAC = '#C9A7FF';
const RED = '#FF3B3B';

const pack: { id: string; name: string; look: Look; layout: (l: Look) => () => ReturnType<ReturnType<typeof stackedLayers>>; note: string }[] = [
  { id: 'ob-yellow-caps', name: 'Bold Outline — Yellow Keyword, Caps', look: { font: 'League Spartan', weight: 800, caps: true, accent: YELLOW }, layout: stackedLayers, note: 'white and warm-yellow capitals' },
  { id: 'ob-lime-title', name: 'Bold Outline — Lime Keyword, Title Case', look: { font: 'Poppins', weight: 800, caps: false, accent: LIME }, layout: titleCaseLayers, note: 'white and lime title-case words' },
  { id: 'ob-pink-caps', name: 'Bold Outline — Pink Keyword, Heavy Caps', look: { font: 'Montserrat', weight: 900, caps: true, accent: PINK }, layout: stackedLayers, note: 'white and hot-pink heavy capitals' },
  { id: 'ob-cyan-title', name: 'Bold Outline — Cyan Keyword, Title Case', look: { font: 'Poppins', weight: 800, caps: false, accent: CYAN }, layout: titleCaseLayers, note: 'white and bright-cyan title-case words' },
  { id: 'ob-coral-block', name: 'Bold Outline — Coral Keyword, Block Caps', look: { font: 'Archivo Black', weight: 400, caps: true, accent: CORAL }, layout: stackedLayers, note: 'white and coral block capitals' },
  { id: 'ob-gold-number', name: 'Bold Outline — Gold Number & Keyword', look: { font: 'League Spartan', weight: 800, caps: true, accent: GOLD, number: GOLD }, layout: stackedLayers, note: 'a gold number with white and gold capitals' },
  { id: 'ob-fun-gold', name: 'Bold Outline — Fun Rounded, Gold', look: { font: 'Luckiest Guy', weight: 400, caps: true, accent: GOLD }, layout: stackedLayers, note: 'playful rounded white and gold capitals' },
  { id: 'ob-candy-pink', name: 'Bold Outline — Candy Pink, Soft Title', look: { font: 'Lilita One', weight: 400, caps: false, accent: PINK }, layout: titleCaseLayers, note: 'soft rounded white and pink words' },
  { id: 'ob-tall-lime', name: 'Bold Outline — Tall Condensed, Lime', look: { font: 'Anton', weight: 400, caps: true, accent: LIME }, layout: stackedLayers, note: 'tall condensed white and lime capitals' },
  { id: 'ob-low-yellow', name: 'Bold Outline — Low Title, Yellow', look: { font: 'League Spartan', weight: 800, caps: true, accent: YELLOW }, layout: lowLayers, note: 'the number and title in the lower half, leaving the face clear' },
  { id: 'ob-black-white-red', name: 'Bold Outline — Black Type, White Outline, Red', look: { font: 'Kanit', weight: 800, caps: true, accent: RED, ink: '#111111', outline: '#FFFFFF', number: '#111111' }, layout: stackedLayers, note: 'black capitals with a white outline and a red keyword, for dark photos' },
  { id: 'ob-lilac-round', name: 'Bold Outline — Lilac Rounded, Title Case', look: { font: 'Fredoka', weight: 700, caps: false, accent: LILAC }, layout: titleCaseLayers, note: 'rounded white and lilac title-case words' },
];

export const BOLD_OUTLINE_TEMPLATES = pack.map(({ id, name, look, layout, note }) =>
  ({
    ...tpl({
      id,
      name,
      description: `One full photo with a giant outlined list number and the title in huge outlined type — ${note}. Reads on any photo with no box.`,
      family: 6,
      categories: ['Hair', 'Beauty', 'Listicle', 'Fashion', 'Lifestyle'],
      designTypes: ['single-image', 'image-text-overlay', 'number-badge', 'listicle'],
      collage: { layoutId: 'single' },
      layers: layout(look),
    }),
    highCtr: true,
  }),
);
