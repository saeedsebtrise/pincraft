/**
 * Auto Design — type an article title (or just a primary keyword), press Enter
 * and get finished Pin designs: the headline is split over each template's
 * lines, the subtitle is derived from the title, and every text box auto-fits.
 * Templates whose text would end up too small or leave lines empty are ranked
 * down, so the first results are the ones where the title reads best.
 */
import { BLANK_TEMPLATE_ID } from '../templates/builtins';
import { instantiateTemplate, isText } from '../model/docOps';
import type { PinDocument, Template, TextLayer } from '../model/types';
import { parseTitle, suggestSubtitles, titleCase } from './headlines';
import { recommendTemplates } from './recommend';

export interface AutoInput {
  /** Article title or a primary keyword ("lob haircut"). */
  title: string;
  keyword?: string;
  website?: string;
  /** Render every design at this size instead of each template's own size. */
  size?: { width: number; height: number; presetId: string };
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

/** Templates to try for this title: best topic matches first, then everything else. */
function candidates(title: string, templates: Template[]): { template: Template; rank: number }[] {
  const usable = templates.filter((t) => t.id !== BLANK_TEMPLATE_ID && t.imageCount > 0);
  const recs = recommendTemplates(title, usable, { limit: usable.length });
  const max = recs[0]?.score || 1;
  const rank = new Map(recs.map((r) => [r.template.id, r.score / max]));
  return usable.map((template) => ({ template, rank: rank.get(template.id) ?? 0 }));
}

export function autoDesign(input: AutoInput, templates: Template[], opts: { limit?: number; measure?: FitMeasure } = {}): AutoDesignResult[] {
  const { headline, subtitle } = autoText(input.title, input.keyword);
  if (!headline) return [];
  const topic = `${input.title} ${input.keyword ?? ''}`.trim();
  const scored = candidates(topic, templates).map(({ template, rank }) => {
    const size = input.size ?? { width: template.doc.width, height: template.doc.height, presetId: template.doc.presetId };
    const doc = keepOwnWords(instantiateTemplate(template, { ...size, headline, subtitle: subtitle || undefined, website: input.website || undefined, brand: null }), headline);
    const fit = fitScore(doc, opts.measure);
    // Fit matters most; the topic match breaks ties and keeps the results on-theme.
    return { template, doc, fit, score: fit * 2 + rank };
  });
  const good = scored.filter((r) => r.fit >= 0.5);
  const pool = (good.length >= 6 ? good : scored).sort((a, b) => b.score - a.score);
  // Variety: no more than three designs from one family in a row of results.
  const limit = opts.limit ?? 12;
  const perFamily = new Map<number, number>();
  const out: AutoDesignResult[] = [];
  for (const r of pool) {
    if (out.length >= limit) break;
    const n = perFamily.get(r.template.family) ?? 0;
    if (n >= 3) continue;
    perFamily.set(r.template.family, n + 1);
    out.push({ template: r.template, doc: r.doc, fit: r.fit });
  }
  for (const r of pool) {
    if (out.length >= limit) break;
    if (!out.some((o) => o.template.id === r.template.id)) out.push({ template: r.template, doc: r.doc, fit: r.fit });
  }
  return out;
}
