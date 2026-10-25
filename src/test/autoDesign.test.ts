import { describe, expect, it } from 'vitest';
import { readHeadline } from '../model/docOps';
import type { TextLayer } from '../model/types';
import { autoDesign, autoText, clearCutText, fitScore, headlineImpact, lookKey } from '../services/autoDesign';
import { BUILTIN_TEMPLATES } from '../templates/builtins';

const fits = () => 1;

describe('auto design text', () => {
  it('splits a full article title into headline and subtitle', () => {
    expect(autoText('50 Lob Haircut Ideas to Take to Your Next Salon Appointment')).toEqual({
      headline: '50 Lob Haircut Ideas',
      subtitle: 'To Take to Your Next Salon Appointment',
    });
  });
  it('turns a bare keyword into a headline', () => {
    expect(autoText('bronde hair color').headline).toBe('Bronde Hair Color Ideas');
    expect(autoText('', 'lob haircut').headline).toBe('Lob Haircut Ideas');
  });
  it('keeps “How to …” in the headline and moves the rest to the subtitle', () => {
    expect(autoText('How to Style a Bob Cut at Home Without a Blow Dryer')).toEqual({ headline: 'How to Style a Bob Cut at Home', subtitle: 'Without a Blow Dryer' });
  });
  it('gives a topic subtitle when the title has none', () => {
    expect(autoText('20 Bronde Hair Color Ideas').subtitle).toBe('For Your Next Salon Appointment');
  });
});

describe('auto design results', () => {
  it('designs a dozen distinct on-topic Pins carrying the headline', () => {
    const out = autoDesign({ title: '50 Lob Haircut Ideas to Take to Your Next Salon Appointment' }, BUILTIN_TEMPLATES, { measure: fits, limit: 12 });
    expect(out).toHaveLength(12);
    expect(new Set(out.map((r) => r.template.id)).size).toBe(12);
    expect(out.filter((r) => r.template.categories.includes('Hair')).length).toBeGreaterThanOrEqual(6);
    for (const r of out) {
      expect(readHeadline(r.doc).toLowerCase(), r.template.id).toContain('lob haircut');
      expect(r.doc.width).toBe(r.template.doc.width);
    }
  });
  it('renders every design at a chosen size', () => {
    const out = autoDesign({ title: 'cozy balcony decor', size: { width: 1000, height: 1500, presetId: 'pin-standard' } }, BUILTIN_TEMPLATES, { measure: fits, limit: 6 });
    expect(out.every((r) => r.doc.width === 1000 && r.doc.height === 1500)).toBe(true);
  });
  it('ranks down designs whose text shrinks too far or leaves lines empty', () => {
    const t = BUILTIN_TEMPLATES.find((x) => x.id === 'hb-bronde-blocks')!;
    expect(fitScore(t.doc, fits)).toBe(1);
    expect(fitScore(t.doc, (l: TextLayer) => (l.role === 'title-line' ? 0.4 : 1))).toBeCloseTo(0.4);
    const oneWord = { ...t.doc, layers: t.doc.layers.map((l, i) => (l.type === 'text' && l.role === 'title-line' && i > 1 ? { ...l, text: '' } : l)) };
    expect(fitScore(oneWord, fits)).toBeLessThan(0.7);
  });
  it('never adds words the user did not type (template script accents are cleared)', () => {
    const [r] = autoDesign({ title: '50 Lob Haircut Ideas' }, BUILTIN_TEMPLATES.filter((t) => t.id === 'f5-script-bold-white-band'), { measure: fits });
    expect(readHeadline(r.doc)).toBe('50 Lob Haircut Ideas');
    const [s] = autoDesign({ title: '21 Stunning Balcony Ideas' }, BUILTIN_TEMPLATES.filter((t) => t.id === 'f5-script-bold-white-band'), { measure: fits });
    expect(readHeadline(s.doc)).toBe('21 Stunning Balcony Ideas');
  });
  it('shrinks headline text that would slide under the number badge', () => {
    const t = BUILTIN_TEMPLATES.find((x) => x.id === 'hb-bronde-blocks')!;
    const badge = { ...t.doc.layers.find((l) => l.type === 'text')!, role: 'badge' as const, text: '50', x: 0, y: 0, width: 200, height: 200 };
    const line = t.doc.layers.find((l): l is TextLayer => l.type === 'text' && l.role === 'title-line')!;
    const doc = { ...t.doc, layers: [badge, { ...line, x: 0, y: 150, width: 600, height: 200 }] };
    // Fake ink: text sits in the top part of its box, more of it as the font grows.
    const ink = (l: TextLayer) => (l.role === 'badge' ? { x: 0, y: 0, width: 200, height: 200 } : { x: l.x, y: l.y + 200 - l.fontSize * 1.5, width: 400, height: 40 });
    const { doc: fixed, blocked } = clearCutText(doc, ink);
    expect(blocked).toBe(0);
    const out = fixed.layers[1] as TextLayer;
    expect(out.fontSize).toBeLessThan(line.fontSize);
    expect(ink(out).y).toBeGreaterThan(199); // a hairline touch is allowed
    // Text that can never clear is reported, so the design is ranked last.
    expect(clearCutText(doc, () => ({ x: 0, y: 0, width: 300, height: 300 })).blocked).toBe(1);
  });
  it('shows up to 50 designs by default', () => {
    expect(autoDesign({ title: '50 Short Hairstyles' }, BUILTIN_TEMPLATES, { measure: fits })).toHaveLength(50);
  });
  it('puts designs recreated from real Pins first and never shows two look-alikes up top', () => {
    const out = autoDesign({ title: '20 Burgundy Hair Color Ideas' }, BUILTIN_TEMPLATES, { measure: fits, limit: 10 });
    expect(out.slice(0, 5).every((r) => r.template.reference), out.slice(0, 5).map((r) => r.template.id).join()).toBe(true);
    const keys = out.slice(0, 10).map((r) => lookKey(r.doc));
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('scores big headlines above small ones', () => {
    const t = BUILTIN_TEMPLATES.find((x) => x.id === 'hb-bronde-blocks')!;
    const big = (l: TextLayer) => ({ x: l.x, y: l.y, width: l.width, height: l.height });
    const small = (l: TextLayer) => ({ x: l.x, y: l.y, width: l.width / 4, height: l.height / 4 });
    expect(headlineImpact(t.doc, big)).toBeGreaterThan(headlineImpact(t.doc, small));
    expect(headlineImpact(t.doc, big)).toBeLessThanOrEqual(1);
  });
  it('returns nothing for an empty title', () => {
    expect(autoDesign({ title: '  ' }, BUILTIN_TEMPLATES, { measure: fits })).toEqual([]);
  });
});
