/**
 * Font library. The original set is loaded from Google Fonts in index.html;
 * the larger catalog (fontCatalog.ts) loads on demand (services/fonts.ts),
 * and fonts the user uploads are registered at runtime.
 */
import { EXTRA_FONTS } from './fontCatalog';
export type FontCategory = 'Editorial Serif' | 'Modern Serif' | 'Sans Serif' | 'Bold Display' | 'Distressed' | 'Script' | 'Elegant' | 'Minimal' | 'Fun & Retro' | 'Handwritten' | 'My fonts';

export interface FontDef {
  family: string;
  category: FontCategory;
  weights: number[];
  italic: boolean;
  fallback: 'serif' | 'sans-serif' | 'cursive';
  /** Uploaded by the user (loaded from their own file, not Google Fonts). */
  custom?: boolean;
}

const BASE_FONTS: FontDef[] = [
  { family: 'Playfair Display', category: 'Editorial Serif', weights: [400, 500, 600, 700, 800, 900], italic: true, fallback: 'serif' },
  { family: 'DM Serif Display', category: 'Editorial Serif', weights: [400], italic: true, fallback: 'serif' },
  { family: 'Cormorant Garamond', category: 'Editorial Serif', weights: [400, 500, 600, 700], italic: true, fallback: 'serif' },
  { family: 'Libre Baskerville', category: 'Modern Serif', weights: [400, 700], italic: true, fallback: 'serif' },
  { family: 'Lora', category: 'Modern Serif', weights: [400, 500, 600, 700], italic: true, fallback: 'serif' },
  { family: 'Inter', category: 'Sans Serif', weights: [300, 400, 500, 600, 700, 800], italic: false, fallback: 'sans-serif' },
  { family: 'Montserrat', category: 'Sans Serif', weights: [300, 400, 500, 600, 700, 800, 900], italic: true, fallback: 'sans-serif' },
  { family: 'Poppins', category: 'Sans Serif', weights: [300, 400, 500, 600, 700, 800], italic: true, fallback: 'sans-serif' },
  { family: 'Bebas Neue', category: 'Bold Display', weights: [400], italic: false, fallback: 'sans-serif' },
  { family: 'Anton', category: 'Bold Display', weights: [400], italic: false, fallback: 'sans-serif' },
  { family: 'Abril Fatface', category: 'Bold Display', weights: [400], italic: false, fallback: 'serif' },
  { family: 'Oswald', category: 'Bold Display', weights: [400, 500, 600, 700], italic: false, fallback: 'sans-serif' },
  { family: 'Archivo Black', category: 'Bold Display', weights: [400], italic: false, fallback: 'sans-serif' },
  { family: 'Rubik Distressed', category: 'Distressed', weights: [400], italic: false, fallback: 'sans-serif' },
  { family: 'Rubik Dirt', category: 'Distressed', weights: [400], italic: false, fallback: 'sans-serif' },
  { family: 'Pacifico', category: 'Script', weights: [400], italic: false, fallback: 'cursive' },
  { family: 'Sacramento', category: 'Script', weights: [400], italic: false, fallback: 'cursive' },
  { family: 'Allura', category: 'Script', weights: [400], italic: false, fallback: 'cursive' },
  { family: 'Permanent Marker', category: 'Script', weights: [400], italic: false, fallback: 'cursive' },
  { family: 'Great Vibes', category: 'Script', weights: [400], italic: false, fallback: 'cursive' },
  { family: 'Italiana', category: 'Elegant', weights: [400], italic: false, fallback: 'serif' },
  { family: 'Josefin Sans', category: 'Minimal', weights: [300, 400, 600, 700], italic: true, fallback: 'sans-serif' },
  { family: 'Raleway', category: 'Minimal', weights: [300, 400, 500, 600, 700, 800], italic: true, fallback: 'sans-serif' },
];

/** Families index.html already loads; everything else is fetched when first needed. */
export const PRELOADED = new Set(BASE_FONTS.map((f) => f.family));

/** Every font: the original set, the on-demand catalog, then the user's uploads (added at runtime). */
export const FONT_LIBRARY: FontDef[] = [...BASE_FONTS, ...EXTRA_FONTS];

export const FONT_CATEGORIES: FontCategory[] = ['My fonts', 'Editorial Serif', 'Modern Serif', 'Sans Serif', 'Bold Display', 'Fun & Retro', 'Script', 'Handwritten', 'Distressed', 'Elegant', 'Minimal'];

/** Shown under "Popular fonts" in the picker. */
export const POPULAR_FONTS = ['Montserrat', 'Open Sans', 'Poppins', 'League Spartan', 'Anton', 'DM Sans', 'Archivo Black', 'Roboto', 'Playfair Display', 'Bebas Neue', 'Lora', 'Oswald', 'Cinzel', 'Abril Fatface', 'Great Vibes', 'Lobster', 'Fredoka', 'Shrikhand', 'Arvo', 'Libre Baskerville'];

/**
 * Free look-alikes for well-known paid fonts (Canva Pro, Adobe and system fonts):
 * searching the paid name offers the closest open font instead.
 */
export const FONT_LOOKALIKES: Record<string, string> = {
  'Canva Sans': 'DM Sans',
  'Open Sauce': 'Plus Jakarta Sans',
  'Glacial Indifference': 'Questrial',
  'Proxima Nova': 'Montserrat',
  'Arial': 'Arimo',
  'Arial MT Pro': 'Arimo',
  'Helvetica': 'Arimo',
  'Times New Roman': 'Tinos',
  'Times New Roman MT': 'Tinos',
  'Comic Sans': 'Comic Neue',
  'Bodoni FLF': 'Bodoni Moda',
  'Telegraf': 'Space Grotesk',
  'Garet': 'Kumbh Sans',
  'Agrandir': 'Familjen Grotesk',
  'Horizon': 'Syncopate',
  'Knockout': 'League Gothic',
  'Impact': 'Anton',
  'Norwester': 'Oswald',
  'Copperplate Gothic': 'Marcellus SC',
  'London': 'Cinzel',
  'Alta': 'Cinzel',
  'Lovelo': 'Montserrat',
  'TAN Nimbus': 'Rammetto One',
  'TAN Headline': 'Alfa Slab One',
  'TAN Tangkiwood': 'Limelight',
  'TAN St. Canard': 'Ultra',
  'Recoleta': 'Fraunces',
  'Aprila': 'Fraunces',
  'The Seasons': 'Playfair Display',
  'Pierson': 'Cormorant',
  'Oilvare': 'Ultra',
  'PL Barnum Block': 'Rye',
  'Boldoa': 'Bowlby One',
  'Brick Sans': 'Rubik Mono One',
  'Gagalin': 'Luckiest Guy',
  'Biski': 'Fredoka',
  'Etna': 'Bebas Neue',
  'Brittany': 'Mrs Saint Delafield',
  'Madelyn': 'Monsieur La Doulaise',
  'Moontime': 'Ms Madi',
  'Majesty': 'Corinthia',
  'Slopes': 'Kaushan Script',
  'Magnolia Script': 'Courgette',
  'Adlery Pro': 'Yellowtail',
  'Apricots': 'Lobster Two',
  'Juana': 'Fraunces',
  'Greycliff': 'Plus Jakarta Sans',
  'Lazydog': 'Luckiest Guy',
  'Brittany Signature': 'Mrs Saint Delafield',
};

/** Google Fonts stylesheet for one family with all its weights (and italics when it has them). */
export function googleFontUrl(f: FontDef): string {
  const name = f.family.replace(/ /g, '+');
  const ws = f.weights.length ? f.weights : [400];
  const axis = f.italic ? `:ital,wght@${[...ws.map((w) => `0,${w}`), ...ws.map((w) => `1,${w}`)].join(';')}` : ws.length > 1 || ws[0] !== 400 ? `:wght@${ws.join(';')}` : '';
  return `https://fonts.googleapis.com/css2?family=${name}${axis}&display=swap`;
}

export function getFont(family: string): FontDef | undefined {
  return FONT_LIBRARY.find((f) => f.family === family);
}

/** Closest available weight for a family (Konva can't synthesize missing weights reliably). */
export function nearestWeight(family: string, weight: number): number {
  const f = getFont(family);
  if (!f) return weight;
  return f.weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), f.weights[0]);
}

export function cssFontFamily(family: string): string {
  const f = getFont(family);
  return `"${family}", ${f?.fallback ?? 'sans-serif'}`;
}
