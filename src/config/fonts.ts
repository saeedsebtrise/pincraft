/**
 * Curated font library. Loaded from Google Fonts in index.html.
 * To add a font: add it here and to the stylesheet URL in index.html.
 */
export type FontCategory = 'Editorial Serif' | 'Modern Serif' | 'Sans Serif' | 'Bold Display' | 'Distressed' | 'Script' | 'Elegant' | 'Minimal';

export interface FontDef {
  family: string;
  category: FontCategory;
  weights: number[];
  italic: boolean;
  fallback: 'serif' | 'sans-serif' | 'cursive';
}

export const FONT_LIBRARY: FontDef[] = [
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

export const FONT_CATEGORIES: FontCategory[] = ['Editorial Serif', 'Modern Serif', 'Sans Serif', 'Bold Display', 'Distressed', 'Script', 'Elegant', 'Minimal'];

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
