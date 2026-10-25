import { describe, expect, it } from 'vitest';
import { isText } from '../model/docOps';
import type { Rect, TextLayer } from '../model/types';
import { accentColor, applyCta, ctaOptions } from '../services/autoCta';
import { autoDesign } from '../services/autoDesign';
import { BUILTIN_TEMPLATES } from '../templates/builtins';

const ctaOf = (layers: { type: string; role: string }[]) => layers.find((l): l is TextLayer => l.type === 'text' && l.role === 'cta');
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('auto call to action', () => {
  it('words CTAs for the topic, then general ones, without repeats', () => {
    const hair = ctaOptions('50 Lob Haircut Ideas');
    expect(hair[0]).toBe('See All the Looks');
    expect(hair).toContain('Read More');
    expect(new Set(hair.map((s) => s.toLowerCase())).size).toBe(hair.length);
    expect(ctaOptions('Easy Chicken Pasta Recipe')[0]).toBe('Get the Recipe');
  });

  it('rewords a design’s own CTA button', () => {
    const t = BUILTIN_TEMPLATES.find((x) => x.id === 'hb-howto-label-panel')!;
    const out = applyCta(t.doc, 'Learn How');
    expect(ctaOf(out.layers)?.text).toBe('Learn How');
    expect(out.layers.filter((l) => l.role === 'cta')).toHaveLength(1);
  });

  it('adds a pill button in free space, never over the headline, badge or website', () => {
    for (const id of ['hb-bronde-blocks', 'ps-hair-brown-ribbons', 'hb-sticker-serif-curly', 'f6-white-box-badge']) {
      const t = BUILTIN_TEMPLATES.find((x) => x.id === id)!;
      const out = applyCta(t.doc, 'Read More');
      const cta = ctaOf(out.layers);
      if (!cta) continue; // no free spot: the design stays as it is
      expect(cta.background.shape, id).toBe('pill');
      for (const l of out.layers.filter(isText)) {
        if (l === cta || !l.text.trim()) continue;
        expect(overlaps(cta, l), `${id}: CTA over ${l.role}`).toBe(false);
      }
      expect(cta.y + cta.height).toBeLessThanOrEqual(t.doc.height);
    }
  });

  it('uses the design’s accent colour', () => {
    const pink = BUILTIN_TEMPLATES.find((x) => x.id === 'hb-bronde-blocks')!;
    expect(accentColor(pink.doc).toUpperCase()).toBe('#EE1A5B');
  });

  it('gives every Auto Design Pin a CTA, different from the Pin before', () => {
    const out = autoDesign({ title: '50 Lob Haircut Ideas' }, BUILTIN_TEMPLATES, { measure: () => 1, limit: 12 });
    const words = out.map((r) => ctaOf(r.doc.layers)?.text).filter(Boolean) as string[];
    expect(words.length).toBeGreaterThan(8);
    for (let i = 1; i < words.length; i++) expect(words[i]).not.toBe(words[i - 1]);
    expect(autoDesign({ title: '50 Lob Haircut Ideas', cta: false }, BUILTIN_TEMPLATES, { measure: () => 1, limit: 12 }).every((r) => !ctaOf(r.doc.layers) || r.template.doc.layers.some((l) => l.role === 'cta'))).toBe(true);
  });
});
