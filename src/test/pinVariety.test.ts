import { describe, expect, it } from 'vitest';
import { isText, readHeadline } from '../model/docOps';
import type { TextLayer } from '../model/types';
import { ctaOptions } from '../services/autoCta';
import { autoDesign } from '../services/autoDesign';
import { blocksReadable, contrastRatio, PIN_PALETTES, recolorDoc, titleVariants, tone } from '../services/pinVariety';
import { BUILTIN_TEMPLATES } from '../templates/builtins';

const ctaText = (layers: TextLayer[]) => layers.find((l) => l.role === 'cta')?.text ?? '';

describe('50 different titles for one article', () => {
  it.each([
    '25 Stunning Wedding Hairstyles for Long Hair',
    '19 Cozy Fall Kitchen Counter Decor Ideas',
    'How to Hang Garland on Stairs',
    'Easy Chicken Dinner Recipes',
    'lob haircut',
  ])('“%s” gives 50 distinct, on-topic titles without inventing numbers', (title) => {
    const titles = titleVariants(title, '', 50);
    expect(titles).toHaveLength(50);
    expect(new Set(titles.map((t) => t.toLowerCase())).size).toBe(50);
    const ownNumbers = title.match(/\d+/g) ?? [];
    for (const t of titles) {
      expect(t.length).toBeLessThanOrEqual(60);
      for (const n of t.match(/\d+/g) ?? []) expect(ownNumbers).toContain(n);
    }
  });

  it('keeps the subject in every title and never puts an adjective before "How to"', () => {
    const titles = titleVariants('How to Hang Garland on Stairs', '', 50);
    expect(titles.every((t) => /hang garland on stairs/i.test(t))).toBe(true);
    // "Learn How to …" and "Here's How to …" are fine; "Stunning How to …" is not.
    expect(titles.some((t) => /^(stunning|gorgeous|easy|chic|elegant|pretty|dreamy|cozy) how to/i.test(t))).toBe(false);
    expect(titleVariants('25 Stunning Wedding Hairstyles for Long Hair').every((t) => /wedding hairstyles/i.test(t))).toBe(true);
  });

  it('suits the topic (no "Romantic" recipes) and pluralizes a bare keyword', () => {
    expect(titleVariants('Easy Chicken Dinner Recipes').some((t) => /romantic|jaw-dropping/i.test(t))).toBe(false);
    expect(titleVariants('lob haircut').slice(1).every((t) => /lob haircut ideas/i.test(t))).toBe(true);
  });
});

describe('color schemes', () => {
  it('has distinct, readable palettes', () => {
    expect(new Set(PIN_PALETTES.map((p) => p.name)).size).toBe(PIN_PALETTES.length);
    for (const p of PIN_PALETTES) {
      expect(contrastRatio(p.ink, p.light), p.name).toBeGreaterThanOrEqual(7);
      expect(Math.max(contrastRatio('#FFFFFF', p.accent), contrastRatio(p.ink, p.accent)), p.name).toBeGreaterThanOrEqual(3);
      expect(contrastRatio(p.accent, p.light), p.name).toBeGreaterThanOrEqual(3);
    }
  });

  it('recolors blocks and text but keeps text blocks readable and photos untouched', () => {
    for (const t of BUILTIN_TEMPLATES.slice(0, 40)) {
      for (const p of PIN_PALETTES.slice(0, 6)) {
        const doc = recolorDoc(t.doc, p);
        expect(blocksReadable(doc), `${t.id} / ${p.name}`).toBe(true);
        expect(doc.layers.filter((l) => l.type === 'frame').map((l) => l.id)).toEqual(t.doc.layers.filter((l) => l.type === 'frame').map((l) => l.id));
      }
    }
    expect(tone('#FFFFFF')).toBe('light');
    expect(tone('#111111')).toBe('dark');
    expect(tone('#C0476B')).toBe('color');
  });
});

describe('one click, 50 different Pins', () => {
  it('gives each Pin its own headline, CTA and color scheme', () => {
    const out = autoDesign({ title: '25 Stunning Wedding Hairstyles for Long Hair', vary: true }, BUILTIN_TEMPLATES, { measure: () => 1, limit: 50 });
    expect(out).toHaveLength(50);
    expect(new Set(out.map((r) => r.headline)).size).toBe(50);
    expect(out[0].palette).toBe('Original');
    expect(new Set(out.slice(1, 25).map((r) => r.palette)).size).toBe(24);
    const ctas = out.map((r) => ctaText(r.doc.layers.filter(isText)));
    expect(new Set(ctas.filter(Boolean)).size).toBe(ctas.filter(Boolean).length);
    // The Pin's headline is really on it.
    for (const r of out.slice(0, 10)) expect(readHeadline(r.doc).toLowerCase()).toContain('wedding');
  });

  it('has 50+ CTA wordings for any topic', () => {
    for (const topic of ['wedding hairstyles', 'kitchen decor', 'chicken recipes', 'how to hang garland', 'money saving']) expect(ctaOptions(topic).length).toBeGreaterThanOrEqual(50);
  });

  it('leaves designs as they were without vary', () => {
    const out = autoDesign({ title: '25 Stunning Wedding Hairstyles for Long Hair' }, BUILTIN_TEMPLATES, { measure: () => 1, limit: 5 });
    expect(out.every((r) => r.headline === undefined && r.palette === undefined)).toBe(true);
  });
});

it('keeps a list number at the start of every title (badges show it)', () => {
  for (const t of titleVariants('25 Stunning Wedding Hairstyles for Long Hair', '', 50)) {
    if (/\d/.test(t)) expect(t).toMatch(/^25 /);
  }
});

it('adds twelve high-click listicle templates, each with a number, a CTA and photos', async () => {
  const { LUXE_CTR_TEMPLATES } = await import('../templates/luxeCtrPack');
  expect(LUXE_CTR_TEMPLATES).toHaveLength(12);
  for (const t of LUXE_CTR_TEMPLATES) {
    expect(t.highCtr, t.id).toBe(true);
    expect(t.doc.layers.some((l) => l.role === 'badge'), t.id).toBe(true);
    expect(t.doc.layers.some((l) => l.role === 'cta'), t.id).toBe(true);
    expect(t.imageCount, t.id).toBeGreaterThanOrEqual(1);
    expect(BUILTIN_TEMPLATES.some((b) => b.id === t.id)).toBe(true);
  }
  const out = autoDesign({ title: '61 Modern Hairstyles for Women Over 50', cta: false }, BUILTIN_TEMPLATES, { measure: () => 1, limit: 5 });
  expect(out.some((r) => r.template.id.startsWith('lx-'))).toBe(true);
  for (const r of out.filter((x) => x.template.id.startsWith('lx-'))) expect(readHeadline(r.doc).toLowerCase()).toContain('hairstyles');
});

it('puts an arrow on every CTA and uses different button styles', () => {
  const out = autoDesign({ title: '25 Stunning Wedding Hairstyles for Long Hair', vary: true }, BUILTIN_TEMPLATES, { measure: () => 1, limit: 20 });
  const ctas = out.map((r) => r.doc.layers.filter(isText).find((l) => l.role === 'cta')).filter((l): l is TextLayer => !!l);
  expect(ctas.length).toBeGreaterThan(10);
  for (const c of ctas) expect(c.text).toMatch(/[→➜»›⟶]$/u);
});
