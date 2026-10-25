/**
 * Pinterest research, browser side. PinCraft opens the Pinterest search for the
 * focus keyword in a new tab (it never scrapes Pinterest); the user drops
 * screenshots of the top Pins here, the AI server analyses them
 * (server/pinResearch.mjs) and returns a "what's winning" report. Auto Design
 * then boosts templates whose look matches the winning styles, and the AI
 * designer is briefed to beat them.
 */
import { getLayout } from '../collage/layouts';
import { getFont } from '../config/fonts';
import { isText } from '../model/docOps';
import type { PinDocument, Template, TextLayer } from '../model/types';

export type LayoutStyle = 'single-photo' | 'two-photos' | 'collage-3-4' | 'collage-5-plus' | 'band-between-photos' | 'text-panel' | 'text-only';
export type TextStyle = 'white-blocks' | 'solid-band' | 'overlay-no-box' | 'outlined-sticker' | 'script-accent' | 'serif-editorial' | 'distressed' | 'pill-labels';
export type FontStyle = 'bold-sans' | 'condensed-sans' | 'rounded-sans' | 'serif' | 'script' | 'distressed';

export interface ResearchReport {
  pinsAnalyzed: number;
  summary: string;
  layouts: { type: LayoutStyle; share: number }[];
  textStyles: { type: TextStyle; share: number }[];
  fonts: { type: FontStyle; share: number }[];
  palette: string[];
  numberBadgeShare: number;
  ctaShare: number;
  websiteShare: number;
  headlinePatterns: string[];
  commonWords: string[];
  gaps: string[];
  designBrief: string;
}

export const LAYOUT_LABEL: Record<LayoutStyle, string> = {
  'single-photo': 'One photo',
  'two-photos': 'Two photos',
  'collage-3-4': '3–4 photo collage',
  'collage-5-plus': '5+ photo collage',
  'band-between-photos': 'Text band between photos',
  'text-panel': 'Photo + text panel',
  'text-only': 'Text only',
};
export const TEXT_LABEL: Record<TextStyle, string> = {
  'white-blocks': 'Text in white blocks',
  'solid-band': 'Solid colour band',
  'overlay-no-box': 'Text straight on the photo',
  'outlined-sticker': 'Outlined "sticker" text',
  'script-accent': 'Script accent word',
  'serif-editorial': 'Serif / editorial',
  distressed: 'Distressed type',
  'pill-labels': 'Pill labels',
};
export const FONT_LABEL: Record<FontStyle, string> = {
  'bold-sans': 'Bold sans',
  'condensed-sans': 'Condensed sans',
  'rounded-sans': 'Rounded sans',
  serif: 'Serif',
  script: 'Script',
  distressed: 'Distressed',
};

/** Pinterest's own search page for the keyword (opened for the user in a new tab). */
export const pinterestSearchUrl = (keyword: string) => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword.trim())}`;

export const MAX_SCREENSHOTS = 12;
const MAX_SIDE = 1568; // larger images are downscaled by the API anyway

/** Screenshot → JPEG base64 (long side ≤ 1568px) for the analysis request. */
export async function prepareScreenshot(file: Blob): Promise<{ mediaType: 'image/jpeg'; data: string; preview: string }> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const url = c.toDataURL('image/jpeg', 0.85);
  return { mediaType: 'image/jpeg', data: url.slice(url.indexOf(',') + 1), preview: url };
}

export async function requestResearch(keyword: string, images: { mediaType: string; data: string }[]): Promise<ResearchReport> {
  let res: Response;
  try {
    res = await fetch('/api/pin-research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, images: images.map(({ mediaType, data }) => ({ mediaType, data })) }),
    });
  } catch {
    throw new Error(RESEARCH_OFFLINE);
  }
  if (!res.ok) {
    let msg = '';
    try {
      msg = ((await res.json()) as { error?: string }).error ?? '';
    } catch {
      /* not JSON: the AI server isn't running behind the dev proxy */
    }
    throw new Error(res.status === 404 || (res.status >= 500 && !msg) ? RESEARCH_OFFLINE : msg || `Analysis failed (${res.status})`);
  }
  return ((await res.json()) as { report: ResearchReport }).report;
}

export const RESEARCH_OFFLINE = 'Pinterest research needs the AI server. Start it with your Anthropic API key (npm run ai-proxy — see README).';

// ---------------------------------------------------------------- matching templates to the winners

export interface DesignTraits {
  layouts: Set<LayoutStyle>;
  textStyles: Set<TextStyle>;
  font: FontStyle | null;
  badge: boolean;
}

const fontStyle = (family: string): FontStyle | null => {
  const cat = getFont(family)?.category;
  if (/Anton|Oswald|Bebas/i.test(family)) return 'condensed-sans';
  if (/Poppins/i.test(family)) return 'rounded-sans';
  if (cat === 'Script') return 'script';
  if (cat === 'Distressed') return 'distressed';
  if (cat === 'Editorial Serif' || cat === 'Modern Serif' || cat === 'Elegant' || /Abril|Playfair|Serif/i.test(family)) return 'serif';
  return cat ? 'bold-sans' : null;
};

const isLight = (hex: string) => {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 215;
};

/** What a design looks like, in the report's vocabulary. */
export function designTraits(t: Template, doc: PinDocument): DesignTraits {
  const layouts = new Set<LayoutStyle>();
  const layout = doc.collage ? getLayout(doc.collage.layoutId) : undefined;
  const photos = layout?.count ?? t.imageCount;
  if (!photos) layouts.add('text-only');
  else if (layout?.bandable) layouts.add('band-between-photos');
  else if (photos === 1) layouts.add('single-photo');
  else if (photos === 2) layouts.add('two-photos');
  else if (photos <= 4) layouts.add('collage-3-4');
  else layouts.add('collage-5-plus');
  if (t.designTypes?.includes('image-text-panel') || (doc.collage && doc.collage.region.height < 0.75)) layouts.add('text-panel');

  const heads = doc.layers.filter((l): l is TextLayer => isText(l) && (l.role === 'title-line' || l.role === 'title') && !!l.text.trim());
  const textStyles = new Set<TextStyle>();
  for (const l of heads) {
    const bg = l.background;
    if (l.strokeWidth > 0) textStyles.add('outlined-sticker');
    if (bg.enabled && bg.shape === 'pill') textStyles.add('pill-labels');
    else if (bg.enabled && bg.hug && isLight(bg.color)) textStyles.add('white-blocks');
    else if (bg.enabled) textStyles.add('solid-band');
    if (!bg.enabled && !l.strokeWidth) textStyles.add('overlay-no-box');
    const f = fontStyle(l.fontFamily);
    if (f === 'serif') textStyles.add('serif-editorial');
    if (f === 'distressed') textStyles.add('distressed');
    if (f === 'script') textStyles.add('script-accent');
  }
  if (doc.layers.some((l) => l.type === 'shape' && l.role === 'band')) {
    textStyles.add('solid-band');
    textStyles.delete('overlay-no-box');
  }
  if (doc.layers.some((l) => isText(l) && l.role === 'accent' && l.text.trim())) textStyles.add('script-accent');

  const main = [...heads].sort((a, b) => b.fontSize * b.width - a.fontSize * a.width)[0];
  return {
    layouts,
    textStyles,
    font: main ? fontStyle(main.fontFamily) : null,
    badge: doc.layers.some((l) => isText(l) && l.role === 'badge' && !!l.text.trim()),
  };
}

const shareOf = <T extends string>(list: { type: T; share: number }[] | undefined, match: (t: T) => boolean) =>
  Math.min(1, (list ?? []).filter((x) => match(x.type)).reduce((s, x) => s + (Number.isFinite(x.share) ? Math.max(0, x.share) : 0), 0));

/**
 * 0..~1.5 — how closely a design matches what wins for this keyword: its photo
 * layout, headline treatment, font style and number badge, each weighted by
 * how common it is among the top Pins.
 */
export function researchBoost(traits: DesignTraits, r: ResearchReport): number {
  const layout = shareOf(r.layouts, (t) => traits.layouts.has(t));
  const text = shareOf(r.textStyles, (t) => traits.textStyles.has(t));
  const font = shareOf(r.fonts, (t) => t === traits.font);
  const badgeShare = Math.min(1, Math.max(0, r.numberBadgeShare ?? 0.5));
  const badge = traits.badge ? badgeShare : 1 - badgeShare;
  return 0.5 * layout + 0.5 * text + 0.3 * font + 0.2 * badge;
}
