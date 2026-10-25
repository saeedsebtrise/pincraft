import { describe, expect, it } from 'vitest';
import { distributeLines, instantiateTemplate, readHeadline } from '../model/docOps';
import type { TextLayer } from '../model/types';
import { BUILTIN_TEMPLATES } from '../templates/builtins';
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
  it('every pin-style template has a number badge or headline lines and a website footer', () => {
    for (const t of PIN_STYLE_TEMPLATES) {
      const roles = new Set(t.doc.layers.map((l) => l.role));
      expect(roles.has('title-line'), t.id).toBe(true);
      expect(roles.has('website'), t.id).toBe(true);
    }
  });
});
