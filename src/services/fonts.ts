import { createStore, del, set as idbSet, values } from 'idb-keyval';
import { FONT_LIBRARY, getFont, googleFontUrl, nearestWeight, PRELOADED, type FontDef } from '../config/fonts';
import type { PinDocument, TextLayer } from '../model/types';

const ready = new Set<string>();
const failed = new Set<string>();
let epoch = 0;

/** Increments whenever a new font face finishes loading; text measurement caches key on it. */
export const fontEpoch = () => epoch;

const fontKey = (family: string, weight: number, italic: boolean) => `${italic ? 'italic ' : ''}${nearestWeight(family, weight)} 40px "${family}"`;

// ---------------------------------------------------------------- on-demand Google Fonts

const sheets = new Map<string, Promise<void>>();

/**
 * Adds the family's Google Fonts stylesheet (once) and resolves when it has
 * loaded, so its @font-face rules exist. Preloaded and uploaded fonts need nothing.
 */
export function requestFamily(family: string): Promise<void> {
  const f = getFont(family);
  if (typeof document === 'undefined' || !f || f.custom || PRELOADED.has(family)) return Promise.resolve();
  let p = sheets.get(family);
  if (!p) {
    p = new Promise<void>((resolve) => {
      const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: googleFontUrl(f) });
      link.dataset.font = family;
      link.onload = () => resolve();
      link.onerror = () => resolve(); // offline: the fallback font is used and reported by ensureFonts
      document.head.appendChild(link);
    });
    sheets.set(family, p);
  }
  return p;
}

/** Loads the faces a document needs. Returns the families that failed (fallback fonts will be used). */
export async function ensureFonts(layers: Pick<TextLayer, 'fontFamily' | 'fontWeight' | 'italic'>[]): Promise<string[]> {
  if (typeof document === 'undefined' || !document.fonts) return [];
  await Promise.all([...new Set(layers.map((l) => l.fontFamily))].map(requestFamily));
  const keys = [...new Set(layers.map((l) => fontKey(l.fontFamily, l.fontWeight, l.italic)))].filter((k) => !ready.has(k));
  await Promise.all(
    keys.map(async (k) => {
      try {
        const faces = await document.fonts.load(k);
        if (faces.length) {
          ready.add(k);
          failed.delete(k);
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

// ---------------------------------------------------------------- recently used

const RECENT_KEY = 'pinforge.recentFonts';

export function recentFonts(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[];
    return list.filter((f) => getFont(f));
  } catch {
    return [];
  }
}

export function pushRecentFont(family: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([family, ...recentFonts().filter((f) => f !== family)].slice(0, 8)));
  } catch {
    /* storage unavailable */
  }
}

// ---------------------------------------------------------------- uploaded fonts

interface StoredFont {
  family: string;
  weight: number;
  italic: boolean;
  blob: Blob;
  fileName: string;
}

const fontStore = (() => {
  let s: ReturnType<typeof createStore> | undefined;
  return () => (s ??= createStore('pinforge-fonts', 'fonts'));
})();

export const FONT_FILE_TYPES = /\.(ttf|otf|woff2?)$/i;
export const MAX_FONT_BYTES = 10 * 1024 * 1024;

/** "MyFont-BoldItalic.otf" → family "MyFont", weight 700, italic. */
export function parseFontFileName(name: string): { family: string; weight: number; italic: boolean } {
  const base = name.replace(FONT_FILE_TYPES, '');
  const [rawFamily, rawStyle = ''] = base.split(/[-_](?=[^-_]*$)/);
  const style = rawStyle.toLowerCase();
  const weights: [RegExp, number][] = [
    [/thin|hairline/, 100],
    [/extra ?light|ultra ?light/, 200],
    [/light/, 300],
    [/medium/, 500],
    [/semi ?bold|demi ?bold/, 600],
    [/extra ?bold|ultra ?bold/, 800],
    [/black|heavy/, 900],
    [/bold/, 700],
  ];
  const known = /thin|light|regular|book|normal|medium|bold|black|heavy|italic|oblique/.test(style);
  const family = (known ? rawFamily : base).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]+/g, ' ').trim() || 'My Font';
  return { family, weight: known ? (weights.find(([re]) => re.test(style))?.[1] ?? 400) : 400, italic: /italic|oblique/.test(style) };
}

function register(f: StoredFont) {
  const face = new FontFace(f.family, `url(${URL.createObjectURL(f.blob)})`, { weight: String(f.weight), style: f.italic ? 'italic' : 'normal' });
  document.fonts.add(face);
  let def = FONT_LIBRARY.find((x) => x.family === f.family);
  if (!def) {
    def = { family: f.family, category: 'My fonts', weights: [], italic: false, fallback: 'sans-serif', custom: true };
    FONT_LIBRARY.push(def);
  }
  if (!def.weights.includes(f.weight)) def.weights = [...def.weights, f.weight].sort((a, b) => a - b);
  if (f.italic) def.italic = true;
  return face.load().then(() => {
    epoch++;
  });
}

let customLoaded: Promise<void> | null = null;

/** Registers the user's uploaded fonts (once per session). */
export function loadCustomFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts || typeof indexedDB === 'undefined') return Promise.resolve();
  customLoaded ??= values<StoredFont>(fontStore())
    .then((list) => Promise.all(list.map((f) => register(f).catch(() => undefined))))
    .then(() => undefined)
    .catch(() => undefined);
  return customLoaded;
}

/** Saves and registers a font file the user uploaded. Returns its family name. */
export async function uploadFont(file: File): Promise<FontDef> {
  if (!FONT_FILE_TYPES.test(file.name)) throw new Error('Choose a TTF, OTF, WOFF or WOFF2 font file.');
  if (file.size > MAX_FONT_BYTES) throw new Error('That font file is over 10 MB.');
  const meta = parseFontFileName(file.name);
  const stored: StoredFont = { ...meta, blob: file, fileName: file.name };
  try {
    await register(stored);
  } catch {
    throw new Error('That file isn’t a font this browser can read.');
  }
  await idbSet(`${meta.family}|${meta.weight}|${meta.italic}`, stored, fontStore());
  return getFont(meta.family)!;
}

/** Removes an uploaded font family (designs using it fall back to a system font). */
export async function removeUploadedFont(family: string) {
  const list = await values<StoredFont>(fontStore());
  await Promise.all(list.filter((f) => f.family === family).map((f) => del(`${f.family}|${f.weight}|${f.italic}`, fontStore())));
  const i = FONT_LIBRARY.findIndex((f) => f.family === family && f.custom);
  if (i >= 0) FONT_LIBRARY.splice(i, 1);
}
