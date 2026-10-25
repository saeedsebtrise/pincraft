/**
 * Auto CTA: every Auto/Bulk Design Pin gets a call to action, worded
 * differently from Pin to Pin and suited to the post's topic. Designs that
 * already have a CTA button get the new wording; the others get a small pill
 * button placed in free space — never over the headline, badge or website —
 * in the design's own accent colour.
 */
import { isText } from '../model/docOps';
import { createText } from '../model/factory';
import type { PinDocument, Rect, TextLayer } from '../model/types';

/**
 * Wordings that get clicked on Pinterest: a clear action verb, a concrete
 * payoff ("the full list", "every look") and a reason to act now or save.
 * Each topic has enough of its own that a 50-Pin batch rarely repeats one.
 */
const TOPIC_CTAS: [RegExp, string[]][] = [
  [/hair|haircut|bob\b|lob\b|braid|bangs|balayage|blonde|bronde|brunette|pixie|curl|shag|auburn|copper|burgundy|highlights/i, [
    'See All the Looks', 'Find Your Next Cut', 'Show Your Stylist', 'Save These Looks', 'Get the Full List', 'Try This Look',
    'Screenshot for Your Stylist', 'Find Your Perfect Look', 'See Which Suits You', 'Steal These Looks', 'Tap to See Every Look',
    'Pick Your Favorite', 'Save for Your Salon Visit', 'Get Salon-Ready', 'Your Next Look Is Here', 'See Them All',
    'Book-Worthy Looks Inside', 'Find Your Shade', 'Get the Hair Inspo', 'See Every Style', 'Get Your Dream Hair', 'Save Your Favorites',
  ]],
  [/decor|room|balcon|patio|porch|home|kitchen|bedroom|living|garden|apartment/i, [
    'See All the Ideas', 'Get the Look', 'Save for Your Next Project', 'Steal These Ideas', 'Shop the Look', 'See the Full Room Tour',
    'Get the Decor Ideas', 'Copy This Look', 'Transform Your Space', 'See Every Room', 'Save for Your Makeover', 'Find Your Style',
    'Get Inspired Now', 'See the Before & After', 'Shop Every Piece',
  ]],
  [/outfit|fashion|wear|wardrobe|dress|style\b/i, [
    'Shop the Look', 'See All Outfits', 'Get the Outfit Ideas', 'Save for Later', 'Copy These Outfits', 'Find Your Style',
    'Shop Every Piece', 'See What to Wear', 'Steal the Look', 'Save for Your Next Trip',
  ]],
  [/recipe|dinner|meal|food|bake|chicken|pasta|salad|dessert|breakfast/i, [
    'Get the Recipe', 'Save This Recipe', 'Cook It Tonight', 'See All Recipes', 'Make It Tonight', 'Get the Easy Recipe',
    'Save for Dinner', 'See the Steps', 'Try It This Week', 'Get All the Recipes',
  ]],
  [/makeup|nail|skin|beauty|lip|lashes/i, [
    'See All the Looks', 'Get the Look', 'Save for Later', 'Try It Today', 'Steal These Looks', 'Show Your Nail Tech',
    'See Every Look', 'Get the Tutorial', 'Pick Your Favorite', 'Save for Your Next Appointment',
  ]],
  [/how to|guide|tips|tutorial|diy|step/i, [
    'Read the Guide', 'Learn How', 'Get the Steps', 'See the Tutorial', 'Start Today', 'Get the Free Guide', 'Learn the Trick',
    "See How It's Done", 'Save the Steps',
  ]],
];
const GENERAL_CTAS = [
  'Read More', 'Get the Full List', 'Save for Later', 'See All Ideas', 'Tap for More', 'Click for More', 'Get Inspired', 'Read the Post',
  'Tap to Read', 'See the Full Post', 'Keep Reading', 'Save This Pin', 'See the List', 'Get the Details', 'Discover More', "Don't Miss These",
  'Find Out Now', 'Start Here', 'Learn More', 'See Why', 'Get the Ideas', 'Open the Full List', 'See More Ideas', 'Save It for Later',
];
/** List-post CTAs with the title's own number: "See All 25 Looks" tells the reader exactly what they get. */
const numberCtas = (n: string, noun: string): string[] => [
  `See All ${n} ${noun}`, `Tap for All ${n} Ideas`, `Get All ${n} ${noun}`, `See the Full ${n}`, `Save All ${n} Ideas`, `View All ${n} ${noun}`,
];

/**
 * CTA wordings for a topic, mixed so neighbouring Pins don't sound alike:
 * topic-specific, numbered (for list posts) and general ones taken in turn, no repeats.
 */
export function ctaOptions(topic: string): string[] {
  const topical: string[] = [];
  for (const [re, list] of TOPIC_CTAS) if (re.test(topic)) topical.push(...list);
  const n = topic.match(/(?:^|\s)(\d{1,3})\+?\s+[a-z]/i)?.[1];
  const noun = TOPIC_CTAS[0][0].test(topic) || /makeup|nail|outfit/i.test(topic) ? 'Looks' : 'Ideas';
  const numbered = n && Number(n) > 1 ? numberCtas(n, noun) : [];
  const out: string[] = [];
  const add = (s: string | undefined) => s && !out.some((o) => o.toLowerCase() === s.toLowerCase()) && out.push(s);
  const lists = [topical, numbered, GENERAL_CTAS];
  for (let i = 0; lists.some((l) => i < l.length); i++) lists.forEach((l) => add(l[i]));
  return out;
}

const hex = (c: string) => {
  const m = c.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (x) => x + x) : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const luminance = (c: string) => {
  const rgb = hex(c);
  return rgb ? (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 : 0.5;
};
const saturation = (c: string) => {
  const rgb = hex(c);
  if (!rgb) return 0;
  const max = Math.max(...rgb);
  const min = Math.min(...rgb);
  return max ? (max - min) / max : 0;
};

/** The design's accent: the first clearly coloured headline text or block, else near-black. */
export function accentColor(doc: PinDocument): string {
  const heads = doc.layers.filter((l): l is TextLayer => isText(l) && ['title', 'title-line', 'badge', 'accent', 'subtitle'].includes(l.role) && !!l.text.trim());
  for (const l of heads) {
    if (saturation(l.fill) > 0.35 && luminance(l.fill) < 0.8) return l.fill;
    if (l.background.enabled && saturation(l.background.color) > 0.35 && luminance(l.background.color) < 0.8) return l.background.color;
  }
  return '#111111';
}

const grow = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, width: r.width + 2 * by, height: r.height + 2 * by });
const hits = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Fallback when no canvas is available: the text layer's own box. */
const boxInk = (l: TextLayer): Rect => ({ x: l.x, y: l.y, width: l.width, height: l.height });

/**
 * Sets the design's CTA to `text`: an existing CTA layer is reworded; otherwise a
 * pill button is added in the first free spot (above the website footer, below
 * the headline, or near the bottom). Returns the design unchanged when there is
 * no free spot, so a CTA never covers the text.
 */
export function applyCta(doc: PinDocument, text: string, ink: (l: TextLayer) => Rect | null = boxInk): PinDocument {
  const existing = doc.layers.find((l): l is TextLayer => isText(l) && l.role === 'cta');
  if (existing) return { ...doc, layers: doc.layers.map((l) => (l === existing ? { ...existing, text } : l)) };

  const W = doc.width;
  const H = doc.height;
  // Big enough to read on a phone in the feed (a Pin shows ~240px wide there).
  const w = Math.round(W * 0.52);
  const h = Math.round(H * 0.052);
  const x = Math.round((W - w) / 2);
  const texts = doc.layers.filter((l): l is TextLayer => isText(l) && l.visible && !!l.text.trim());
  const blocked = texts.map((l) => ink(l)).filter((r): r is Rect => !!r).map((r) => grow(r, H * 0.008));
  const footer = texts.find((l) => l.role === 'website');
  const heads = texts.filter((l) => l.role !== 'website');
  const headBottom = Math.max(0, ...heads.map((l) => {
    const r = ink(l);
    return r ? r.y + r.height : 0;
  }));

  const candidates = [
    footer ? (ink(footer)?.y ?? footer.y) - h - H * 0.018 : null,
    headBottom ? headBottom + H * 0.022 : null,
    H * 0.86,
    H * 0.8,
    H * 0.06,
  ].filter((y): y is number => y !== null);
  const spot = candidates.map((y) => ({ x, y: Math.round(y), width: w, height: h })).find((r) => r.y >= H * 0.02 && r.y + r.height <= H * 0.98 && !blocked.some((b) => hits(r, b)));
  if (!spot) return doc;

  const bg = accentColor(doc);
  const cta = createText({
    name: 'Call to action',
    role: 'cta',
    ...spot,
    text,
    fontFamily: 'Montserrat',
    fontWeight: 800,
    fontSize: Math.round(h * 0.5),
    minFontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fill: luminance(bg) > 0.6 ? '#111111' : '#FFFFFF',
    background: {
      enabled: true,
      shape: 'pill',
      color: bg,
      opacity: 1,
      paddingX: Math.round(h * 0.6),
      paddingY: Math.round(h * 0.18),
      radius: 0,
      borderWidth: 0,
      borderColor: '#111111',
      hug: true,
    },
  });
  return { ...doc, layers: [...doc.layers, cta] };
}
