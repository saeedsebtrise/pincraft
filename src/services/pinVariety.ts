/**
 * "Every Pin different": for one article, a batch of Pins where each Pin has
 * its own headline, its own call to action and its own color scheme. Titles
 * are built from the article's real title (its number, subject and promise),
 * never inventing a count; color schemes recolor a design's blocks and text
 * while keeping light-on-dark / dark-on-light contrast.
 */
import { isText } from '../model/docOps';
import type { Layer, PinDocument, TextLayer } from '../model/types';
import { parseTitle, titleCase } from './headlines';

// ---------------------------------------------------------------- titles

const GENERAL_ADJECTIVES = [
  'Stunning', 'Gorgeous', 'Easy', 'Chic', 'Elegant', 'Pretty', 'Dreamy', 'Timeless', 'Effortless', 'Trendy', 'Beautiful', 'Simple',
  'Unique', 'Classy', 'Breathtaking', 'Must-Try', 'Show-Stopping', 'Jaw-Dropping', 'Cute', 'Modern', 'Charming', 'Fresh', 'Creative', 'Clever',
];
/** Adjectives that suit the topic ("Romantic Chicken Recipes" doesn't). */
const TOPIC_ADJECTIVES: [RegExp, string[]][] = [
  [/recipe|dinner|meal|food|bake|chicken|pasta|salad|dessert|breakfast|lunch|soup|cookie|cake/i, [
    'Easy', 'Cozy', 'Simple', 'Tasty', 'Delicious', 'Comforting', 'Family-Friendly', 'Crowd-Pleasing', 'Quick', 'Flavorful', 'Irresistible', 'Homemade',
    'Weeknight', 'Mouthwatering', 'Hearty', 'Fresh', 'Must-Try', 'Classic', 'Budget-Friendly', 'Kid-Approved', 'Savory', 'Satisfying', 'Effortless', 'Favorite',
  ]],
  [/decor|room|balcon|patio|porch|home|kitchen|bedroom|living|garden|apartment|entryway|bathroom/i, [
    'Cozy', 'Stunning', 'Chic', 'Modern', 'Charming', 'Dreamy', 'Gorgeous', 'Easy', 'Simple', 'Elegant', 'Inviting', 'Stylish',
    'Timeless', 'Rustic', 'Beautiful', 'Clever', 'Creative', 'Warm', 'Fresh', 'Pretty', 'Minimal', 'Unique', 'Must-Try', 'Effortless',
  ]],
];
const adjectivesFor = (topic: string) => TOPIC_ADJECTIVES.find(([re]) => re.test(topic))?.[1] ?? GENERAL_ADJECTIVES;

/** "How to …" titles get their own sentence shapes (an adjective in front of "How to" reads wrong). */
const HOWTO_PREFIXES = ['How to', 'The Easy Way to', 'Easy Ways to', 'Simple Ways to', 'Smart Ways to', 'Clever Tricks to', 'Genius Tips to', 'Learn How to', "Here's How to", 'The Best Way to', 'Quick Tips to', 'Pro Tips to'];
const HOWTO_SUFFIXES = ['', 'the Easy Way', 'Like a Pro', 'Step by Step', 'for Beginners', 'Without the Stress', 'Beautifully', 'Every Time', 'in a Few Steps'];
const HOOKS = [
  "You'll Love", 'to Try Now', 'to Save for Later', 'That Look Expensive', 'Worth Saving', 'Everyone Is Pinning', 'You Need to See',
  'to Copy Right Now', 'for Every Style', 'That Never Go Out of Style', 'to Inspire You', 'You Can Recreate', 'That Wow', 'to Fall in Love With',
  'Worth Trying', 'for Instant Inspiration',
];
const LIST_WORDS = ['Ideas', 'Looks', 'Styles', 'Inspo', 'Picks', 'Favorites'];
const MAX_TITLE = 60;

/**
 * `count` different Pin headlines for an article title, the article's own wording first.
 * All keep its subject (the keyword); only the title's own number is ever used.
 */
export function titleVariants(title: string, keyword = '', count = 50): string[] {
  const source = title.trim() || keyword.trim();
  const parsed = parseTitle(source);
  const out: string[] = [];
  const add = (s: string) => {
    const v = s.replace(/\s+/g, ' ').trim();
    if (v && v.length <= MAX_TITLE && !out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v);
  };
  add(titleCase(source).replace(/[.!?]+$/, ''));

  const howTo = /^how\s+to\s+(.+)$/i.exec(parsed.subject || source.replace(/[.!?]+$/, ''));
  if (howTo) {
    const action = titleCase(`${howTo[1]}${parsed.tail ? ` ${parsed.tail}` : ''}`);
    for (let i = 0; out.length < count && i < HOWTO_PREFIXES.length * HOWTO_SUFFIXES.length; i++) {
      const prefix = HOWTO_PREFIXES[i % HOWTO_PREFIXES.length];
      const suffix = HOWTO_SUFFIXES[(i * 5 + Math.floor(i / HOWTO_PREFIXES.length)) % HOWTO_SUFFIXES.length];
      // "Easy Ways to … the Easy Way" says it twice.
      const echo = suffix && suffix.toLowerCase().split(' ').some((w) => w.length > 3 && prefix.toLowerCase().includes(w));
      if (!echo) add(`${prefix} ${action} ${suffix}`);
    }
    return out.slice(0, count);
  }

  const n = parsed.number ? `${parsed.number} ` : '';
  const subject = titleCase(parsed.subject || keyword || source);
  // The phrase the Pin is about: "Wedding Hairstyles" or "Balcony Decor Ideas"; a bare singular keyword becomes "Lob Haircut Ideas".
  const phrase = parsed.listNoun ? `${subject} ${titleCase(parsed.listNoun)}` : !parsed.number && !/s$/i.test(subject) ? `${subject} Ideas` : subject;
  // "for Long Hair", keeping the small first word lower-case inside a title.
  const tail = parsed.tail ? titleCase(parsed.tail).replace(/^(For|To|With|In|On|That|From|Without|Using)\b/, (w) => w.toLowerCase()) : '';
  const ADJECTIVES = adjectivesFor(source);
  if (tail) add(`${n}${phrase} ${tail}`);
  // Different sentence shapes take turns, each with its own adjective / hook, so neighbours never sound alike.
  for (let i = 0; out.length < count && i < ADJECTIVES.length * 4; i++) {
    const adj = ADJECTIVES[i % ADJECTIVES.length];
    const hook = HOOKS[(i * 5) % HOOKS.length];
    const word = LIST_WORDS[i % LIST_WORDS.length];
    const shapes = [
      `${n}${adj} ${phrase}${tail ? ` ${tail}` : ''}`,
      `${n}${phrase} ${hook}`,
      `${n}${adj} ${phrase}`,
      `${adj} ${phrase} ${hook}`,
      // The number always leads (a mid-title number clashes with number badges).
      parsed.number ? `${n}${adj} ${phrase} ${word === 'Ideas' || word === 'Inspo' ? 'to Save' : 'Worth Saving'}` : `${adj} ${phrase} to Save`,
      `${n}${adj} ${phrase} ${hook}`,
    ];
    add(shapes[i % shapes.length]);
    add(shapes[(i + 3) % shapes.length]);
  }
  // Short subjects can run out of distinct shapes: fill up with numbered / plain combinations.
  for (let i = 0; out.length < count && i < ADJECTIVES.length * HOOKS.length; i++) add(`${ADJECTIVES[i % ADJECTIVES.length]} ${phrase} ${HOOKS[Math.floor(i / ADJECTIVES.length) % HOOKS.length]}`);
  return out.slice(0, count);
}

// ---------------------------------------------------------------- color schemes

export interface PinPalette {
  name: string;
  /** Light panels and backgrounds. */
  light: string;
  /** Dark text and dark blocks. */
  ink: string;
  /** Colored blocks, badges and colored text. */
  accent: string;
  /** Dark blocks (bands, footers). */
  dark: string;
}

export const PIN_PALETTES: PinPalette[] = [
  { name: 'Terracotta', light: '#F7EFE6', ink: '#2B1B14', accent: '#B4532A', dark: '#3A2418' },
  { name: 'Blush', light: '#FBEFF1', ink: '#3B1E28', accent: '#C0476B', dark: '#4A1F31' },
  { name: 'Sage', light: '#EEF2EA', ink: '#1F2A1E', accent: '#56774A', dark: '#2C3B27' },
  { name: 'Navy & Gold', light: '#F4F1EA', ink: '#14213D', accent: '#A8781F', dark: '#14213D' },
  { name: 'Black & Red', light: '#FFFFFF', ink: '#111111', accent: '#C81E1E', dark: '#111111' },
  { name: 'Mustard', light: '#FFF6DC', ink: '#2A2112', accent: '#A86E05', dark: '#33270F' },
  { name: 'Teal', light: '#E8F4F3', ink: '#10302E', accent: '#0F7C78', dark: '#0F3533' },
  { name: 'Plum', light: '#F5EEF6', ink: '#2A1530', accent: '#7E3A8E', dark: '#2E1535' },
  { name: 'Coral', light: '#FFF1EC', ink: '#33170F', accent: '#D24A2C', dark: '#3A1A12' },
  { name: 'Olive', light: '#F3F2E6', ink: '#23240F', accent: '#5F6D22', dark: '#2B2E12' },
  { name: 'Cocoa', light: '#F6EFE8', ink: '#2A1C14', accent: '#7A4E36', dark: '#2E1F16' },
  { name: 'Royal', light: '#EEF1FB', ink: '#0F1A3D', accent: '#2742B8', dark: '#121C45' },
  { name: 'Rose Gold', light: '#FBF1EE', ink: '#3A2420', accent: '#A65E4E', dark: '#3D2520' },
  { name: 'Forest', light: '#ECF4EF', ink: '#0F2418', accent: '#1E6B43', dark: '#0F2A1B' },
  { name: 'Berry', light: '#FBEEF2', ink: '#2E0F1C', accent: '#A3224E', dark: '#36101F' },
  { name: 'Peach & Charcoal', light: '#FFF4EE', ink: '#1E1E1E', accent: '#C9603F', dark: '#222222' },
  { name: 'Lavender', light: '#F4F1FB', ink: '#261F3A', accent: '#6E56B8', dark: '#2A2240' },
  { name: 'Ocean', light: '#EAF4F8', ink: '#0B2537', accent: '#0E6F95', dark: '#0B2A3D' },
  { name: 'Wine', light: '#F8EEF0', ink: '#2E0F16', accent: '#8E1F35', dark: '#33111A' },
  { name: 'Caramel', light: '#FBF3E8', ink: '#2D1E10', accent: '#A4651F', dark: '#33220F' },
  { name: 'Mint', light: '#ECFAF5', ink: '#10302A', accent: '#11806A', dark: '#0F2F28' },
  { name: 'Hot Pink', light: '#FFF0F6', ink: '#2B0F1D', accent: '#D12A6E', dark: '#2E0F1F' },
  { name: 'Denim', light: '#EEF2F7', ink: '#1B2838', accent: '#3D5A80', dark: '#1B2838' },
  { name: 'Sunset', light: '#FFF3E6', ink: '#2E1A0A', accent: '#C95F12', dark: '#33200D' },
];

const rgb = (c: string): [number, number, number] | null => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c).trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (x) => x + x) : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
};
const lum = (c: string) => {
  const v = rgb(c);
  if (!v) return 0;
  const [r, g, b] = v.map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrastRatio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const saturation = (c: string) => {
  const v = rgb(c);
  if (!v) return 0;
  const max = Math.max(...v);
  return max ? (max - Math.min(...v)) / max : 0;
};

type Tone = 'light' | 'dark' | 'color' | 'neutral' | 'none';
/** What part a color plays: light panel, dark ink/block, a colored accent, or a mid grey we leave alone. */
export function tone(c: string): Tone {
  if (!rgb(c)) return 'none';
  const l = lum(c);
  if (l > 0.6) return 'light';
  if (l < 0.04) return 'dark';
  return saturation(c) > 0.25 ? 'color' : l < 0.12 ? 'dark' : 'neutral';
}

const swap = (c: string, p: PinPalette, darkAs: 'ink' | 'dark' = 'dark'): string => {
  const t = tone(c);
  if (t === 'light') return /^#?(fff|ffffff)$/i.test(c.trim()) ? '#FFFFFF' : p.light;
  if (t === 'dark') return p[darkAs];
  if (t === 'color') return p.accent;
  return c;
};
/** White or the palette's ink, whichever reads better on a background. */
const textOn = (bg: string, p: PinPalette) => (contrastRatio('#FFFFFF', bg) >= contrastRatio(p.ink, bg) ? '#FFFFFF' : p.ink);

/** The same design in another color scheme: panels, blocks and text change, photos don't. */
export function recolorDoc(doc: PinDocument, p: PinPalette): PinDocument {
  const bg = doc.background;
  const layers = doc.layers.map((l): Layer => {
    if (l.type === 'shape') return { ...l, fill: swap(l.fill, p), stroke: l.stroke ? swap(l.stroke, p) : l.stroke };
    if (l.type === 'frame') return { ...l, stroke: l.stroke ? swap(l.stroke, p) : l.stroke };
    const t = l as TextLayer;
    if (t.background.enabled) {
      const block = swap(t.background.color, p);
      return { ...t, fill: tone(t.fill) === 'none' ? t.fill : textOn(block, p), background: { ...t.background, color: block, borderColor: swap(t.background.borderColor, p) }, stroke: t.stroke ? swap(t.stroke, p, 'ink') : t.stroke };
    }
    return { ...t, fill: swap(t.fill, p, 'ink'), stroke: t.stroke ? swap(t.stroke, p, 'ink') : t.stroke };
  });
  return {
    ...doc,
    background: { ...bg, color: swap(bg.color, p), gradientFrom: swap(bg.gradientFrom, p), gradientTo: swap(bg.gradientTo, p) },
    collage: doc.collage ? { ...doc.collage, borderColor: swap(doc.collage.borderColor, p) } : null,
    layers,
  };
}

/** Palette for the k-th Pin of a batch (Pin 0 keeps its designed colors); `seed` varies the order per article. */
export function paletteFor(k: number, seed = ''): PinPalette | null {
  if (k === 0) return null;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PIN_PALETTES[(k - 1 + h) % PIN_PALETTES.length];
}

/** True when a recolored text block stays readable (used by tests). */
export function blocksReadable(doc: PinDocument, min = 3): boolean {
  return doc.layers.every((l) => !isText(l) || !l.background.enabled || tone(l.fill) === 'none' || contrastRatio(l.fill, l.background.color) >= min);
}
