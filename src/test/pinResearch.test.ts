import { describe, expect, it, vi } from 'vitest';
import { designPins } from '../../server/aiDesign.mjs';
import { researchPins } from '../../server/pinResearch.mjs';
import { COLLAGE_LAYOUTS } from '../collage/layouts';
import { FONT_LIBRARY } from '../config/fonts';
import { autoDesign } from '../services/autoDesign';
import { designTraits, pinterestSearchUrl, researchBoost, type ResearchReport } from '../services/pinResearch';
import { BUILTIN_TEMPLATES } from '../templates/builtins';

const REPORT: ResearchReport = {
  pinsAnalyzed: 48,
  summary: 'Most top Pins put white outlined caps straight on one big photo.',
  layouts: [{ type: 'single-photo', share: 0.7 }, { type: 'collage-3-4', share: 0.2 }],
  textStyles: [{ type: 'outlined-sticker', share: 0.6 }, { type: 'overlay-no-box', share: 0.3 }],
  fonts: [{ type: 'bold-sans', share: 0.7 }],
  palette: ['#FFFFFF', '#111111', '#E8A0BF'],
  numberBadgeShare: 0.8,
  ctaShare: 0.1,
  websiteShare: 0.6,
  headlinePatterns: ['Number + adjective + keyword + Ideas'],
  commonWords: ['short', 'hairstyles'],
  gaps: ['Nobody uses a coloured band — a bold pink band would stand out'],
  designBrief: 'Keep the big number and outlined caps; add a contrasting band.',
};

const tpl = (id: string) => BUILTIN_TEMPLATES.find((t) => t.id === id)!;

describe('Pinterest research (browser side)', () => {
  it('opens Pinterest’s own search page for the keyword', () => {
    expect(pinterestSearchUrl(' short hairstyles ')).toBe('https://www.pinterest.com/search/pins/?q=short%20hairstyles');
  });

  it('describes each design in the report’s words', () => {
    const outline = designTraits(tpl('hb-outline-white-black'), tpl('hb-outline-white-black').doc);
    expect(outline.layouts.has('single-photo')).toBe(true);
    expect(outline.textStyles.has('outlined-sticker')).toBe(true);
    expect(outline.badge).toBe(true);
    const blocks = designTraits(tpl('hb-bronde-blocks'), tpl('hb-bronde-blocks').doc);
    expect(blocks.textStyles.has('white-blocks')).toBe(true);
    expect(blocks.font).toBe('condensed-sans');
    const band = designTraits(tpl('ps-patio-tan-script'), tpl('ps-patio-tan-script').doc);
    expect(band.layouts.has('band-between-photos')).toBe(true);
  });

  it('boosts designs that match what wins', () => {
    const match = researchBoost(designTraits(tpl('hb-outline-white-black'), tpl('hb-outline-white-black').doc), REPORT);
    const other = researchBoost(designTraits(tpl('ps-patio-tan-script'), tpl('ps-patio-tan-script').doc), REPORT);
    expect(match).toBeGreaterThan(other + 0.5);
  });

  it('ranks Auto Design by the research', () => {
    const top = (research?: ResearchReport) =>
      autoDesign({ title: '27 Short Hairstyles for Fine Hair', research }, BUILTIN_TEMPLATES, { measure: () => 1, limit: 6 }).map((r) => r.template.id);
    const match = (ids: string[]) => ids.reduce((s, id) => s + researchBoost(designTraits(tpl(id), tpl(id).doc), REPORT), 0) / ids.length;
    // The top designs match what wins far better once the research is in…
    expect(match(top(REPORT))).toBeGreaterThan(match(top()) + 0.15);
    // …and a matching design (one photo, outlined type) moves up.
    expect(top(REPORT).indexOf('hb-shaggy-lavender')).toBeLessThanOrEqual(Math.max(0, top().indexOf('hb-shaggy-lavender')));
  });
});

describe('Pinterest research (server)', () => {
  const shot = { mediaType: 'image/jpeg', data: 'A'.repeat(400) };
  const fake = (reply: object, stop = 'end_turn') => {
    const create = vi.fn(async (_p: Record<string, unknown>) => ({ stop_reason: stop, content: [{ type: 'text', text: JSON.stringify(reply) }] }));
    return { client: { beta: { messages: { create } } }, create };
  };

  it('sends the screenshots to Claude Opus 5.5 as images and returns the report', async () => {
    const { client, create } = fake(REPORT);
    const out = await researchPins(client, { keyword: 'short hairstyles', images: [shot, shot] });
    expect(out.report.pinsAnalyzed).toBe(48);
    const p = create.mock.calls[0][0] as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(p.model).toBe('claude-opus-5-5');
    expect(p.fallbacks).toBe('default');
    const content = p.messages[0].content as { type: string }[];
    expect(content.filter((b) => b.type === 'image')).toHaveLength(2);
    expect(content[content.length - 1]).toMatchObject({ type: 'text' });
  });

  it('works without a keyword: the AI reads it off the screenshots', async () => {
    const { client, create } = fake(REPORT);
    const out = await researchPins(client, { keyword: '', images: [shot] });
    expect(out.report.pinsAnalyzed).toBe(48);
    const content = (create.mock.calls[0][0] as { messages: { content: { type: string; text?: string }[] }[] }).messages[0].content;
    expect(content[content.length - 1].text).toContain('work out the keyword');
  });

  it('rejects missing or bad screenshots, refusals and malformed answers', async () => {
    const { client } = fake(REPORT);
    await expect(researchPins(client, { keyword: 'x', images: [] })).rejects.toMatchObject({ status: 400 });
    await expect(researchPins(client, { keyword: 'x', images: [{ mediaType: 'image/svg+xml', data: 'A'.repeat(400) }] })).rejects.toMatchObject({ status: 400 });
    await expect(researchPins(fake({}, 'refusal').client, { keyword: 'x', images: [shot] })).rejects.toMatchObject({ status: 422 });
    await expect(researchPins(fake({ summary: 'x' }).client, { keyword: 'x', images: [shot] })).rejects.toMatchObject({ status: 502 });
  });

  it('briefs the AI designer with the research', async () => {
    const { client, create } = fake({ designs: [] });
    await designPins(client, {
      headline: '27 Short Hairstyles',
      layouts: COLLAGE_LAYOUTS.map((l) => ({ id: l.id, count: l.count })),
      fonts: FONT_LIBRARY.map((f) => f.family),
      research: REPORT,
    });
    const brief = (create.mock.calls[0][0] as { messages: { content: string }[] }).messages[0].content;
    expect(brief).toContain('Most top Pins put white outlined caps');
    expect(brief).toContain('a bold pink band would stand out');
    expect(brief).toContain('Keep the big number');
  });
});
