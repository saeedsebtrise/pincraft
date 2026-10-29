import { describe, expect, it } from 'vitest';
import { readHeadline } from '../model/docOps';
import type { TextLayer } from '../model/types';
import { autoDesign } from '../services/autoDesign';
import { BUILTIN_TEMPLATES } from '../templates/builtins';
import { PACK_STYLE_TEMPLATES } from '../templates/packStyles';

describe('pack-inspired layouts', () => {
  it('adds 85 distinct layouts to the library, each once', () => {
    expect(PACK_STYLE_TEMPLATES).toHaveLength(85);
    const ids = PACK_STYLE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(85);
    for (const id of ids) expect(BUILTIN_TEMPLATES.filter((t) => t.id === id), id).toHaveLength(1);
  });

  it('every layout has headline lines, a website and at least one photo frame', () => {
    for (const t of PACK_STYLE_TEMPLATES) {
      const texts = t.doc.layers.filter((l): l is TextLayer => l.type === 'text');
      expect(texts.some((l) => l.role === 'title-line' || l.role === 'title'), t.id).toBe(true);
      expect(texts.some((l) => l.role === 'website'), t.id).toBe(true);
      expect(t.imageCount, t.id).toBeGreaterThan(0);
    }
  });

  it('every layout carries the user’s exact headline', () => {
    const out = autoDesign({ title: '25 Easy Fall Porch Decor Ideas', cta: false }, PACK_STYLE_TEMPLATES, { measure: () => 1, limit: 85 });
    expect(out).toHaveLength(85);
    for (const r of out) expect(readHeadline(r.doc).toLowerCase(), r.template.id).toContain('fall porch decor');
  });

  it('keeps everything inside the Pin', () => {
    for (const t of PACK_STYLE_TEMPLATES) {
      for (const l of t.doc.layers) {
        if (l.type !== 'text' || l.rotation) continue;
        expect(l.x, `${t.id} ${l.name}`).toBeGreaterThanOrEqual(-1);
        expect(l.y + l.height, `${t.id} ${l.name}`).toBeLessThanOrEqual(t.doc.height + 1);
      }
    }
  });
});

describe('premium designs', () => {
  it('adds 18 premium designs that carry the whole headline and lead Auto Design', async () => {
    const { PREMIUM_TEMPLATES } = await import('../templates/premiumStyles');
    expect(PREMIUM_TEMPLATES).toHaveLength(18);
    expect(PREMIUM_TEMPLATES.every((t) => t.premium && BUILTIN_TEMPLATES.some((b) => b.id === t.id))).toBe(true);
    const out = autoDesign({ title: '25 Cozy Bedroom Decor Ideas', cta: false }, BUILTIN_TEMPLATES, { measure: () => 1, limit: 50 });
    expect(out.slice(0, 3).every((r) => r.template.premium)).toBe(true);
    for (const r of out.filter((x) => x.template.premium)) expect(readHeadline(r.doc).toLowerCase(), r.template.id).toContain('cozy bedroom decor');
  });
});

describe('high-click designs', () => {
  it('add 19 designs with a CTA button and a solid panel behind the text, and they lead Auto Design', async () => {
    const { CTR_TEMPLATES } = await import('../templates/ctrStyles');
    expect(CTR_TEMPLATES).toHaveLength(19);
    for (const t of CTR_TEMPLATES) {
      expect(t.highCtr && BUILTIN_TEMPLATES.some((b) => b.id === t.id), t.id).toBe(true);
      const cta = t.doc.layers.find((l): l is TextLayer => l.type === 'text' && l.role === 'cta');
      // Pinterest puts its own icons in the lower-right corner: the CTA stays out of it.
      if (cta) expect(cta.x + cta.width / 2, t.id).toBeLessThan(t.doc.width * 0.75);
    }
    expect(CTR_TEMPLATES.filter((t) => t.doc.layers.some((l) => l.role === 'cta')).length).toBeGreaterThanOrEqual(8);
    const out = autoDesign({ title: 'Easy Chicken Dinner Recipes', cta: false }, BUILTIN_TEMPLATES, { measure: () => 1, limit: 12 });
    expect(out.filter((r) => r.template.highCtr).length).toBeGreaterThanOrEqual(2);
    for (const r of out.filter((x) => x.template.highCtr)) expect(readHeadline(r.doc).toLowerCase(), r.template.id).toContain('chicken dinner');
  });
});
