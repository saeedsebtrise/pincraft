import { describe, expect, it } from 'vitest';
import { readHeadline } from '../model/docOps';
import type { TextLayer } from '../model/types';
import { autoDesign, autoText, fitScore } from '../services/autoDesign';
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
    const out = autoDesign({ title: '50 Lob Haircut Ideas to Take to Your Next Salon Appointment' }, BUILTIN_TEMPLATES, { measure: fits });
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
  it('returns nothing for an empty title', () => {
    expect(autoDesign({ title: '  ' }, BUILTIN_TEMPLATES, { measure: fits })).toEqual([]);
  });
});
