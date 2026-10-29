/**
 * Auto Design — type an article title (or just a primary keyword), press Enter
 * and get finished Pin designs: the headline is split over each template's
 * lines, the subtitle is derived from the title, and every text box auto-fits.
 * Templates whose text would end up too small or leave lines empty are ranked
 * down, so the first results are the ones where the title reads best.
 */
import { BLANK_TEMPLATE_ID } from '../templates/builtins';
import { assignImages, instantiateTemplate, isText } from '../model/docOps';
import type { AssetMeta, Id, PinDocument, Rect, Template, TextLayer } from '../model/types';
import { applyCta, ctaOptions } from './autoCta';
import { parseTitle, suggestSubtitles, titleCase } from './headlines';
import { designTraits, researchBoost, type ResearchReport } from './pinResearch';
import { recommendTemplates } from './recommend';

export interface AutoInput {
  /** Article title or a primary keyword ("lob haircut"). */
  title: string;
  keyword?: string;
  website?: string;
  /** Render every design at this size instead of each template's own size. */
  size?: { width: number; height: number; presetId: string };
  /** Real photos (e.g. from the blog post) to put in every design's frames. */
  assetIds?: Id[];
  assetMetas?: Record<Id, AssetMeta>;
  /** Add a call to action to every Pin (default on), worded differently per Pin. */
  cta?: boolean;
  /** Shifts the CTA wording (Bulk Design: each post starts at a different one). */
  ctaOffset?: number;
  /** Pinterest research for the keyword: designs that match the winning styles rank higher. */
  research?: ResearchReport | null;
}

/**
 * Fills a design's frames with the photos, best aspect match first. Each design
 * starts the list at a different photo so the results don't all lead with the
 * same image; photos repeat only when a layout has more frames than photos.
 */
export function withPhotos(doc: PinDocument, ids: Id[], metas: Record<Id, AssetMeta>, offset: number): PinDocument {
  if (!ids.length) return doc;
  const k = offset % ids.length;
  return assignImages(doc, [...ids.slice(k), ...ids.slice(0, k)], metas, { smart: true, allowDuplicates: true });
}

export interface AutoText {
  headline: string;
  subtitle: string;
}

export interface AutoDesignResult {
  template: Template;
  doc: PinDocument;
  /** 0..1 — how well the title fits (1 = every line at its designed size, nothing empty). */
  fit: number;
}

/** Headline + subtitle from what the user typed. A bare keyword becomes "<Keyword> Ideas". */
export function autoText(title: string, keyword = ''): AutoText {
  const raw = title.trim() || keyword.trim();
  if (!raw) return { headline: '', subtitle: '' };
  const p = parseTitle(raw);
  let headline = titleCase(p.core || raw);
  if (!p.number && !p.listNoun && !p.tail && headline.split(' ').length <= 3) headline = `${headline} Ideas`;
  const subtitle = suggestSubtitles({ articleTitle: raw, keyword }, 1)[0] ?? '';
  return { headline, subtitle };
}

/**
 * Rendered size / designed size for a text layer (1 when it fits as designed).
 * The browser passes one built on the canvas text layout (see measureWithCanvas);
 * without a canvas every layer is assumed to fit.
 */
export type FitMeasure = (l: TextLayer) => number;
const measureFit: FitMeasure = () => 1;

const HEADLINE_ROLES = new Set(['title', 'title-line', 'badge', 'accent', 'subtitle']);

/** How well the text sits in a design: the smallest shrink of any headline layer, minus empty lines. */
export function fitScore(doc: PinDocument, measure: FitMeasure = measureFit): number {
  const texts = doc.layers.filter((l): l is TextLayer => isText(l) && l.visible && HEADLINE_ROLES.has(l.role));
  const lines = texts.filter((l) => l.role === 'title-line');
  const empty = lines.filter((l) => !l.text.trim()).length;
  const filled = texts.filter((l) => l.text.trim());
  if (!filled.some((l) => l.role === 'title-line' || l.role === 'title')) return 0;
  const shrink = Math.min(1, ...filled.map(measure));
  return Math.max(0, shrink - empty * 0.2);
}

/**
 * Script accents keep a template's own word ("Perfect", "best!") when the headline has none —
 * fine when you pick a template by hand, but Auto Design must only show the words you typed.
 */
export function keepOwnWords(doc: PinDocument, headline: string): PinDocument {
  const words = new Set(headline.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9+]/g, '')));
  return {
    ...doc,
    layers: doc.layers.map((l) =>
      isText(l) && l.role === 'accent' && l.text.trim() && !words.has(l.text.trim().toLowerCase().replace(/[^a-z0-9+]/g, '')) ? { ...l, text: '' } : l,
    ),
  };
}

/** Where a text layer's letters actually sit on the Pin (canvas units), or null when unknown. */
export type InkMeasure = (l: TextLayer) => Rect | null;

const area = (r: Rect) => Math.max(0, r.width) * Math.max(0, r.height);
const overlap = (a: Rect, b: Rect) =>
  area({ x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), width: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x), height: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) });

const HEAD_TEXT = new Set(['title', 'title-line', 'accent', 'subtitle']);

/**
 * A short title grows to fill a text box built for a longer one and can slide
 * under the number badge or past the Pin's edge — the keyword gets cut off.
 * Shrink each such headline layer step by step (it stays centred, so its edges
 * pull back) until it is clear. Returns the fixed document and how many layers
 * could not be cleared.
 */
export function clearCutText(doc: PinDocument, ink: InkMeasure): { doc: PinDocument; blocked: number } {
  // A faded number (opacity < 0.9) is a backdrop the text sits on by design, not something to keep clear of.
  const badges = doc.layers.filter((l): l is TextLayer => isText(l) && l.visible && l.role === 'badge' && !!l.text.trim() && l.opacity >= 0.9);
  const badgeInk = badges.map((b) => ink(b)).filter((r): r is Rect => !!r);
  const isCut = (l: TextLayer) => {
    const r = ink(l);
    if (!r || !area(r)) return false;
    const off = r.x < -1 || r.y < -1 || r.x + r.width > doc.width + 1 || r.y + r.height > doc.height + 1;
    return off || badgeInk.some((b) => overlap(r, b) > area(r) * 0.001);
  };
  let blocked = 0;
  const layers = doc.layers.map((l) => {
    if (!isText(l) || !l.visible || !HEAD_TEXT.has(l.role) || !l.text.trim() || !isCut(l)) return l;
    let cur = l;
    for (let i = 0; i < 8 && isCut(cur); i++) cur = { ...cur, fontSize: cur.fontSize * 0.9, minFontSize: Math.min(cur.minFontSize, cur.fontSize * 0.9) };
    if (isCut(cur)) blocked++;
    return cur;
  });
  return { doc: { ...doc, layers }, blocked };
}

const MAIN_HEADLINE = new Set(['title', 'title-line', 'badge', 'accent']);

/**
 * 0..1 — how much of the Pin the headline letters cover. Pins that win on
 * Pinterest have a big, bold headline; ~10% of the canvas or more counts as full.
 */
export function headlineImpact(doc: PinDocument, ink: InkMeasure): number {
  let area = 0;
  for (const l of doc.layers) {
    if (!isText(l) || !l.visible || !MAIN_HEADLINE.has(l.role) || !l.text.trim()) continue;
    const r = ink(l);
    if (r) area += Math.max(0, r.width) * Math.max(0, r.height);
  }
  return Math.min(1, area / (doc.width * doc.height * 0.1));
}

/**
 * What a design looks like at a glance: photo layout + the main headline line's
 * font, colour and block colour + whether it has a badge. Two designs with the
 * same key read as the same template to a viewer.
 */
export function lookKey(doc: PinDocument): string {
  const heads = doc.layers.filter((l): l is TextLayer => isText(l) && (l.role === 'title-line' || l.role === 'title') && !!l.text.trim());
  const main = heads.sort((a, b) => b.fontSize * b.width - a.fontSize * a.width)[0];
  const badge = doc.layers.some((l) => isText(l) && l.role === 'badge' && l.text.trim());
  return [
    doc.collage?.layoutId ?? 'none',
    main?.fontFamily ?? '',
    main?.fill.toLowerCase() ?? '',
    main?.background.enabled ? main.background.color.toLowerCase() : 'none',
    badge ? 'badge' : '',
  ].join('|');
}

/** Templates to try for this title: best topic matches first, then everything else. */
function candidates(title: string, templates: Template[]): { template: Template; rank: number }[] {
  const usable = templates.filter((t) => t.id !== BLANK_TEMPLATE_ID && t.imageCount > 0);
  const recs = recommendTemplates(title, usable, { limit: usable.length });
  const max = recs[0]?.score || 1;
  const rank = new Map(recs.map((r) => [r.template.id, r.score / max]));
  return usable.map((template) => ({ template, rank: rank.get(template.id) ?? 0 }));
}

export function autoDesign(
  input: AutoInput,
  templates: Template[],
  opts: { limit?: number; measure?: FitMeasure; ink?: InkMeasure } = {},
): AutoDesignResult[] {
  const { headline, subtitle } = autoText(input.title, input.keyword);
  if (!headline) return [];
  const topic = `${input.title} ${input.keyword ?? ''}`.trim();
  const photos = input.assetIds ?? [];
  // Premium looks lead — unless Pinterest research says what wins for this keyword, which then matters more.
  const premiumBoost = input.research ? 0.2 : 1.6;
  const scored = candidates(topic, templates).map(({ template, rank }, i) => {
    const size = input.size ?? { width: template.doc.width, height: template.doc.height, presetId: template.doc.presetId };
    let doc = keepOwnWords(instantiateTemplate(template, { ...size, headline, subtitle: subtitle || undefined, website: input.website || undefined, brand: null }), headline);
    doc = withPhotos(doc, photos, input.assetMetas ?? {}, i);
    // With real photos, layouts needing more photos than the post has (repeats) rank lower.
    if (photos.length && template.imageCount > photos.length) rank -= 0.3;
    let blocked = 0;
    if (opts.ink) ({ doc, blocked } = clearCutText(doc, opts.ink));
    // A design that still cuts the keyword goes to the very end.
    const fit = blocked ? 0 : fitScore(doc, opts.measure);
    // Fit matters most, then the premium looks, a big readable headline and designs
    // recreated from real high-performing Pins; the topic match keeps the results on-theme.
    const impact = opts.ink ? headlineImpact(doc, opts.ink) : 0.5;
    const matches = input.research ? researchBoost(designTraits(template, doc), input.research) : 0;
    return { template, doc, fit, score: fit * 2 + impact * 1.2 + (template.premium || template.highCtr ? premiumBoost : 0) + (template.reference ? 0.8 : 0) + matches + rank };
  });
  const pool = scored.sort((a, b) => b.score - a.score);
  // Variety: no two look-alike designs, and no more than three from one family, in the first results.
  const limit = opts.limit ?? 50;
  const perFamily = new Map<number, number>();
  const looks = new Set<string>();
  const out: AutoDesignResult[] = [];
  // The variety rules shape the first screen of results; after that it's purely by score.
  const firstScreen = Math.min(limit, 12);
  const familyCap = input.research ? 4 : 3;
  for (const r of pool) {
    if (out.length >= firstScreen) break;
    const n = perFamily.get(r.template.family) ?? 0;
    const look = lookKey(r.doc);
    if (n >= familyCap || looks.has(look)) continue;
    perFamily.set(r.template.family, n + 1);
    looks.add(look);
    out.push({ template: r.template, doc: r.doc, fit: r.fit });
  }
  for (const r of pool) {
    if (out.length >= limit) break;
    if (!out.some((o) => o.template.id === r.template.id)) out.push({ template: r.template, doc: r.doc, fit: r.fit });
  }
  if (input.cta === false) return out;
  // A call to action on every Pin, worded differently from one Pin to the next.
  const ctas = ctaOptions(topic);
  const offset = input.ctaOffset ?? 0;
  return out.map((r, k) => ({ ...r, doc: applyCta(r.doc, ctas[(k + offset) % ctas.length], opts.ink ?? undefined) }));
}
