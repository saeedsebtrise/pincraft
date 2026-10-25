import { describe, expect, it } from 'vitest';
import { distributeLines, instantiateTemplate, readHeadline } from '../model/docOps';
import type { TextLayer } from '../model/types';
import { BUILTIN_TEMPLATES } from '../templates/builtins';
import { HAIR_TEMPLATES } from '../templates/hairStyles';
import { PIN_STYLE_TEMPLATES } from '../templates/pinStyles';

const make = (id: string, headline: string, subtitle?: string) => {
  const t = BUILTIN_TEMPLATES.find((x) => x.id === id)!;
  const doc = instantiateTemplate(t, { width: t.doc.width, height: t.doc.height, presetId: t.doc.presetId, headline, subtitle });
  const texts = doc.layers.filter((l): l is TextLayer => l.type === 'text');
  const byRole = (role: string) => texts.filter((l) => l.role === role).sort((a, b) => a.y - b.y).map((l) => l.text);
  return { doc, byRole };
};

describe('per-line word counts', () => {
  it('fixed lines take their words, flexible lines share the rest', () => {
    expect(distributeLines('Small Balcony Decor Ideas', [{ wordCount: 1 }, { wordCount: 1 }, {}])).toEqual(['Small', 'Balcony', 'Decor Ideas']);
    expect(distributeLines('Clever Cool Ideas For Small Patios', [{ wordCount: 1 }, {}, { wordCount: 2 }])).toEqual(['Clever', 'Cool Ideas For', 'Small Patios']);
    expect(distributeLines('Lob Haircut Ideas', [{ wordCount: 1 }, {}])).toEqual(['Lob', 'Haircut Ideas']);
    expect(distributeLines('Ideas', [{ wordCount: 1 }, { wordCount: 1 }, {}])).toEqual(['Ideas', '', '']);
  });
});

describe('pin-style templates reproduce the reference headlines', () => {
  it('balcony: badge, script accent, keyword lines', () => {
    const { byRole, doc } = make('ps-balcony-maroon-best', '28 Best Small Balcony Decor Ideas');
    expect(byRole('badge')).toEqual(['28']);
    expect(byRole('accent')).toEqual(['Best']);
    expect(byRole('title-line')).toEqual(['Small', 'Balcony', 'Decor Ideas']);
    expect(readHeadline(doc)).toBe('28 Best Small Balcony Decor Ideas');
  });
  it('keeps a punctuated script accent like “best!” when the headline has none', () => {
    const { byRole } = make('ps-balcony-maroon-best', '28 Small Balcony Decor Ideas');
    expect(byRole('accent')).toEqual(['best!']);
  });
  it('patio: script keyword line, distressed line, bold rest', () => {
    expect(make('ps-patio-tan-script', '16 Patio Decorating Ideas to Copy').byRole('title-line')).toEqual(['Patio', 'Decorating', 'Ideas to Copy']);
  });
  it('apartment and bohemian splits', () => {
    expect(make('ps-apartment-big-caps', '19 Small Apartment Patios to Maximize Space').byRole('title-line')).toEqual(['Small', 'Apartment', 'Patios to Maximize Space']);
    expect(make('ps-bohemian-maroon-ribbon', '24 Charming Bohemian Balcony Ideas').byRole('title-line')).toEqual(['Charming', 'Bohemian', 'Balcony Ideas']);
    expect(make('ps-clever-olive', '21 Clever Cool Ideas For Small Patios').byRole('title-line')).toEqual(['Clever', 'Cool Ideas For', 'Small Patios']);
  });
  it('hair ribbons: keyword alone, subtitle split over cream and brown ribbons', () => {
    const { byRole } = make('ps-hair-brown-ribbons', '50 Lob Haircut Ideas', 'to Take to Your Next Salon Appointment');
    expect(byRole('badge')).toEqual(['50']);
    expect(byRole('title-line')).toEqual(['Lob', 'Haircut Ideas']);
    expect(byRole('subtitle')).toEqual(['to Take to Your', 'Next Salon Appointment']);
  });
  it('hair big caps with ornaments', () => {
    const { byRole } = make('ps-hair-trendy-lines', '50 Trendy Short Hairstyles Ideas', 'For Every Woman');
    expect(byRole('title-line')).toEqual(['Trendy', 'Short', 'Hairstyles', 'Ideas']);
    expect(byRole('subtitle')).toEqual(['For Every Woman']);
  });
  it('every pin-style template has headline lines; most carry a website footer', () => {
    for (const t of PIN_STYLE_TEMPLATES) expect(t.doc.layers.some((l) => l.role === 'title-line'), t.id).toBe(true);
    // Some reference designs (e.g. the LOB pyramid) have no footer, so it stays optional.
    expect(PIN_STYLE_TEMPLATES.filter((t) => t.doc.layers.some((l) => l.role === 'website')).length).toBeGreaterThan(PIN_STYLE_TEMPLATES.length - 3);
  });
});

describe('hair templates reproduce the reference headlines', () => {
  const cases: [string, string, string[], string?][] = [
    ['hb-bronde-blocks', '20+ Most Gorgeous Bronde Hair Color Ideas', ['20+ Most', 'Gorgeous', 'Bronde Hair Color', 'Ideas']],
    ['hb-fall-blocks', 'Biggest Fall Hair Color Trends 2026', ['Biggest', 'Fall Hair Color', 'Trends 2026']],
    ['hb-hottest-left-blocks', '12 Hottest Hair Color 2026 Trends', ['12 Hottest', 'Hair Color', '2026', 'Trends']],
    ['hb-modern-white-caps', '22 Modern Short Hairstyles For Women Over 50', ['Modern', 'Short', 'Hairstyles', 'For Women', 'Over 50'], '22'],
    ['hb-half-up-yellow', '21 Short Half Up Half Down Hairstyles', ['Short', 'Half Up', 'Half Down', 'Hairstyles'], '21'],
    ['hb-huge-number-for-lines', '20 Short Haircut Ideas For Women', ['Short', 'Haircut', 'Ideas', 'For', 'Women'], '20'],
    ['hb-outline-white-black', '27+ Short Hairstyles Ideas For Fine Thin Hair', ['Short', 'Hairstyles', 'Ideas For', 'Fine Thin', 'Hair'], '27+'],
    ['hb-shaggy-lavender', '22 Short Shaggy Hairstyles', ['Short', 'Shaggy', 'Hairstyles'], '22'],
    ['hb-chic-teal-brush', '31 Chic Short Haircuts', ['Chic', 'Short', 'Haircuts'], '31'],
    ['hb-sticker-serif-spring', '50+ Medium Length Spring Hairstyles 2026', ['Medium', 'Length', 'Spring', 'Hairstyles', '2026'], '50+'],
    ['hb-sticker-serif-curly', '50 Gorgeous Curly Hairstyle Ideas For Women', ['Gorgeous', 'Curly', 'Hairstyle', 'Ideas', 'For Women'], '50'],
    ['hb-sticker-serif-pixie', '50 Pixie Cut Ideas For Women', ['Pixie Cut', 'Ideas', 'For Women'], '50'],
    ['hb-sticker-serif-over-50', '50 Short Hair Styles For Women Over 50', ['Short', 'Hair Styles', 'For Women', 'Over 50'], '50'],
  ];
  it('how-to label panel: circle, caps, pill and split subtitle', () => {
    const { byRole } = make('hb-howto-label-panel', 'How to Style a Bob Cut at Home', 'Without a Blow Dryer');
    expect(byRole('title-line')).toEqual(['How to', 'Style a', 'Bob Cut', 'at Home']);
    expect(byRole('subtitle')).toEqual(['Without a', 'Blow Dryer']);
  });
  it.each(cases)('%s', (id, headline, lines, num) => {
    const { byRole, doc } = make(id, headline);
    expect(byRole('title-line')).toEqual(lines);
    if (num) expect(byRole('badge')).toEqual([num]);
    expect(readHeadline(doc)).toBe(headline);
  });
  it('every hair template is listed once in the library', () => {
    expect(HAIR_TEMPLATES).toHaveLength(14);
    for (const t of HAIR_TEMPLATES) expect(BUILTIN_TEMPLATES.filter((b) => b.id === t.id)).toHaveLength(1);
  });
});
