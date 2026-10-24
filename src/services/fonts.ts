import { nearestWeight } from '../config/fonts';
import type { PinDocument, TextLayer } from '../model/types';

const ready = new Set<string>();
const failed = new Set<string>();
let epoch = 0;

/** Increments whenever a new font face finishes loading; text measurement caches key on it. */
export const fontEpoch = () => epoch;

const fontKey = (family: string, weight: number, italic: boolean) => `${italic ? 'italic ' : ''}${nearestWeight(family, weight)} 40px "${family}"`;

/** Loads the faces a document needs. Returns the families that failed (fallback fonts will be used). */
export async function ensureFonts(layers: Pick<TextLayer, 'fontFamily' | 'fontWeight' | 'italic'>[]): Promise<string[]> {
  if (typeof document === 'undefined' || !document.fonts) return [];
  const keys = [...new Set(layers.map((l) => fontKey(l.fontFamily, l.fontWeight, l.italic)))].filter((k) => !ready.has(k));
  await Promise.all(
    keys.map(async (k) => {
      try {
        const faces = await document.fonts.load(k);
        if (faces.length) {
          ready.add(k);
          epoch++;
        }
        else failed.add(k);
      } catch {
        failed.add(k);
      }
    }),
  );
  return [...new Set(layers.filter((l) => failed.has(fontKey(l.fontFamily, l.fontWeight, l.italic))).map((l) => l.fontFamily))];
}

export function docTextLayers(doc: PinDocument): TextLayer[] {
  return doc.layers.filter((l): l is TextLayer => l.type === 'text');
}

export function isFontReady(l: Pick<TextLayer, 'fontFamily' | 'fontWeight' | 'italic'>): boolean {
  return ready.has(fontKey(l.fontFamily, l.fontWeight, l.italic));
}
