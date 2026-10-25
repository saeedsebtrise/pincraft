import { describe, expect, it } from 'vitest';
import { COLLAGE_LAYOUTS, bandRect, computeCells, getLayout } from '../collage/layouts';
import { CANVAS_PRESET_CONFIG, DEFAULT_PRESET_ID, findPreset } from '../config/canvasPresets';
import { DESIGN_TYPES, templateDesignTypes } from '../config/designTypes';
import {
  applyCollage, applyHeadline, assignImages, balanceLines, frames, instantiateTemplate, invertBlocks, readHeadline,
  scaleDoc, slotFrames, swapFrameImages, switchTemplate,
} from '../model/docOps';
import { clone, createDocument, createText } from '../model/factory';
import { focalFromPosition, placeImage, rotatedBounds } from '../model/geometry';
import type { AssetMeta, FrameLayer, TextLayer } from '../model/types';
import { BUILTIN_TEMPLATES } from '../templates/builtins';

const meta = (id: string, w: number, h: number): AssetMeta => ({ id, name: id, mime: 'image/jpeg', width: w, height: h, size: 1, createdAt: 0 });

describe('canvas preset registry', () => {
  it('defaults to the 1000×1500 recommended standard Pin', () => {
    const p = findPreset(DEFAULT_PRESET_ID)!;
    expect([p.width, p.height, p.aspectRatio, p.recommended, p.status]).toEqual([1000, 1500, '2:3', true, 'official-recommended']);
  });
  it('labels 736×1472 as a custom blog Pin, not recommended', () => {
    const p = findPreset('custom-blog-736')!;
    expect(p.width).toBe(736);
    expect(p.height).toBe(1472);
    expect(p.status).toBe('custom');
    expect(p.recommended).toBe(false);
    expect(p.name).toContain('Custom Blog Pin');
  });
  it('has exactly one recommended preset and unique ids', () => {
    expect(CANVAS_PRESET_CONFIG.filter((p) => p.recommended)).toHaveLength(1);
    expect(new Set(CANVAS_PRESET_CONFIG.map((p) => p.id)).size).toBe(CANVAS_PRESET_CONFIG.length);
  });
});

describe('collage engine', () => {
  it('computes a 2×2 grid with interior gaps only', () => {
    const cells = computeCells(getLayout('grid-2x2')!, 1000, 1500, { x: 0, y: 0, width: 1, height: 1 }, 10, 0);
    expect(cells[0]).toEqual({ x: 0, y: 0, width: 495, height: 745 });
    expect(cells[3]).toEqual({ x: 505, y: 755, width: 495, height: 745 });
  });
  it('supports 0px gap with exact coverage', () => {
    const cells = computeCells(getLayout('grid-2x2')!, 736, 1472, { x: 0, y: 0, width: 1, height: 1 }, 0, 0);
    const area = cells.reduce((s, c) => s + c.width * c.height, 0);
    expect(area).toBeCloseTo(736 * 1472, 0);
  });
  it('opens a center band between image rows', () => {
    const layout = getLayout('band-2-3')!;
    const cells = computeCells(layout, 1000, 1500, { x: 0, y: 0, width: 1, height: 1 }, 0, 0, 0.3);
    const band = bandRect(layout, 1000, 1500, { x: 0, y: 0, width: 1, height: 1 }, 0, 0.3)!;
    expect(band.y).toBeCloseTo(525);
    expect(band.height).toBeCloseTo(450);
    expect(cells[0].y + cells[0].height).toBeCloseTo(band.y);
    expect(cells[2].y).toBeCloseTo(band.y + band.height);
    expect(cells).toHaveLength(5);
  });
  it('keeps every layout cell inside the canvas', () => {
    for (const l of COLLAGE_LAYOUTS) {
      expect(l.cells).toHaveLength(l.count);
      for (const c of computeCells(l, 1000, 1500, { x: 0, y: 0, width: 1, height: 1 }, 12, 20, 0.3)) {
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.x + c.width).toBeLessThanOrEqual(1000.01);
        expect(c.y + c.height).toBeLessThanOrEqual(1500.01);
      }
    }
  });
  it('applyCollage adds and removes slot frames when the count changes', () => {
    let doc = createDocument(1000, 1500, 'pin-standard');
    const base = { region: { x: 0, y: 0, width: 1, height: 1 }, gap: 8, margin: 0, band: 0, cornerRadius: 0, borderWidth: 0, borderColor: '#fff' };
    doc = applyCollage(doc, { ...base, layoutId: 'hero-4' });
    expect(slotFrames(doc)).toHaveLength(5);
    doc = { ...doc, layers: doc.layers.map((l, i) => (l.type === 'frame' ? { ...l, assetId: `a${i}` } : l)) };
    doc = applyCollage(doc, { ...base, layoutId: 'grid-2x2' });
    expect(slotFrames(doc)).toHaveLength(4);
    expect(slotFrames(doc).map((f) => f.assetId)).toEqual(['a0', 'a1', 'a2', 'a3']);
  });
});

describe('non-destructive crop geometry', () => {
  it('cover placement always fills the frame', () => {
    const frame = { width: 400, height: 600, fit: 'cover' as const, crop: { zoom: 1.4, fx: 0.9, fy: 0.1 } };
    const p = placeImage(frame, 3000, 2000);
    expect(p.x).toBeLessThanOrEqual(0);
    expect(p.y).toBeLessThanOrEqual(0);
    expect(p.x + p.width).toBeGreaterThanOrEqual(400 - 1e-6);
    expect(p.y + p.height).toBeGreaterThanOrEqual(600 - 1e-6);
  });
  it('focalFromPosition inverts placeImage', () => {
    const frame = { width: 500, height: 500, fit: 'cover' as const, crop: { zoom: 2, fx: 0.3, fy: 0.6 } };
    const p = placeImage(frame, 1200, 900);
    const f = focalFromPosition(frame, p);
    expect(f.fx).toBeCloseTo(0.3, 5);
    expect(f.fy).toBeCloseTo(0.6, 5);
  });
  it('rotated bounds grow for rotated layers', () => {
    const b = rotatedBounds({ x: 0, y: 0, width: 100, height: 100, rotation: 45 });
    expect(b.width).toBeCloseTo(141.42, 1);
  });
});

describe('headline application', () => {
  it('splits number to badge, script accent and balanced title lines', () => {
    const tpl = BUILTIN_TEMPLATES.find((t) => t.id === 'f3-editorial-white-blocks')!;
    const doc = applyHeadline(clone(tpl.doc), '50 Lob Haircut Ideas');
    const texts = doc.layers.filter((l): l is TextLayer => l.type === 'text');
    expect(texts.find((t) => t.role === 'badge')!.text).toBe('50');
    expect(texts.filter((t) => t.role === 'title-line').sort((a, b) => a.y - b.y).map((t) => t.text)).toEqual(['Lob', 'Haircut', 'Ideas']);
    expect(readHeadline(doc)).toBe('50 Lob Haircut Ideas');
  });
  it('fills script + bold compositions', () => {
    const tpl = BUILTIN_TEMPLATES.find((t) => t.id === 'f5-script-bold-white-band')!;
    const doc = applyHeadline(clone(tpl.doc), '52 Perfect Bronde Hair Color Ideas');
    const texts = doc.layers.filter((l): l is TextLayer => l.type === 'text');
    expect(texts.find((t) => t.role === 'badge')!.text).toBe('52');
    expect(texts.find((t) => t.role === 'accent')!.text).toBe('Perfect');
    expect(texts.find((t) => t.role === 'title')!.text).toBe('Bronde Hair Color Ideas');
  });
  it('keeps a descriptive accent when the headline has none', () => {
    const tpl = BUILTIN_TEMPLATES.find((t) => t.id === 'f5-script-bold-white-band')!;
    const doc = applyHeadline(clone(tpl.doc), '50 Lob Haircut Ideas');
    const texts = doc.layers.filter((l): l is TextLayer => l.type === 'text');
    expect(texts.find((t) => t.role === 'accent')!.text).toBe('Perfect');
    expect(texts.find((t) => t.role === 'title')!.text).toBe('Lob Haircut Ideas');
  });
  it('balances lines by length', () => {
    expect(balanceLines('Charming Bohemian Balcony Ideas', 2)).toEqual(['Charming Bohemian', 'Balcony Ideas']);
    expect(balanceLines('Ideas', 3)).toEqual(['Ideas', '', '']);
  });
});

describe('template library', () => {
  const sizes = CANVAS_PRESET_CONFIG.map((p) => [p.width, p.height, p.id] as const);
  it('covers every template family and every design type', () => {
    expect(new Set(BUILTIN_TEMPLATES.map((t) => t.family))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    const covered = new Set(BUILTIN_TEMPLATES.flatMap(templateDesignTypes));
    for (const d of DESIGN_TYPES) expect(covered.has(d.id), d.id).toBe(true);
  });
  it('includes a 736×1472 family with 4-image, 5-image, single, overlay and editorial designs', () => {
    const blog = BUILTIN_TEMPLATES.filter((t) => t.doc.width === 736 && t.doc.height === 1472);
    expect(blog.map((t) => t.imageCount).sort()).toEqual(expect.arrayContaining([1, 4, 5]));
    expect(blog.some((t) => templateDesignTypes(t).includes('image-text-overlay'))).toBe(true);
    expect(blog.some((t) => t.doc.layers.some((l) => l.role === 'website'))).toBe(true);
  });
  it('instantiates every template at every preset with all frames inside the canvas', () => {
    for (const t of BUILTIN_TEMPLATES) {
      for (const [w, h, id] of sizes) {
        const doc = instantiateTemplate(t, { width: w, height: h, presetId: id, headline: '24 Charming Bohemian Balcony Ideas' });
        expect(doc.width).toBe(w);
        expect(frames(doc).filter((f) => f.role !== 'logo')).toHaveLength(t.imageCount);
        for (const f of frames(doc)) {
          expect(f.x + f.width).toBeLessThanOrEqual(w + 0.5);
          expect(f.y + f.height).toBeLessThanOrEqual(h + 0.5);
        }
        expect(new Set(doc.layers.map((l) => l.id)).size).toBe(doc.layers.length);
        expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
      }
    }
  });
  it('new instances get fresh layer ids', () => {
    const t = BUILTIN_TEMPLATES[0];
    const a = instantiateTemplate(t, { width: 1000, height: 1500, presetId: 'pin-standard' });
    const b = instantiateTemplate(t, { width: 1000, height: 1500, presetId: 'pin-standard' });
    expect(a.layers[0].id).not.toBe(b.layers[0].id);
  });
});

describe('image assignment & template switching (acceptance TEST 4)', () => {
  const metas = { a: meta('a', 800, 1200), b: meta('b', 1200, 800), c: meta('c', 1000, 1000), d: meta('d', 900, 1600), e: meta('e', 2000, 1000) };
  const ids = Object.keys(metas);
  const t4a = BUILTIN_TEMPLATES.find((t) => t.id === 'f3-editorial-white-blocks')!;
  const t4b = BUILTIN_TEMPLATES.find((t) => t.id === 'f1-center-white-badge')!;

  it('auto-fill never duplicates images unless allowed', () => {
    const doc = assignImages(instantiateTemplate(t4a, { width: 1000, height: 1500, presetId: 'pin-standard' }), ['a', 'b'], metas);
    const used = frames(doc).map((f) => f.assetId).filter(Boolean);
    expect(used).toEqual(['a', 'b']);
    const dup = assignImages(doc, ['a', 'b'], metas, { allowDuplicates: true });
    expect(frames(dup).every((f) => f.assetId)).toBe(true);
  });
  it('smart assignment gives the largest frame the closest aspect ratio', () => {
    const t = BUILTIN_TEMPLATES.find((x) => x.id === 'f9-decor-hero4-band')!; // hero is 4:3 landscape
    const doc = assignImages(instantiateTemplate(t, { width: 1000, height: 1500, presetId: 'pin-standard' }), ids, metas, { smart: true });
    const hero = slotFrames(doc)[0];
    expect(hero.assetId).toBe('b'); // 3:2 source is the closest match to a 4:3 hero
  });
  it('switching between 4-image templates keeps images in order and the headline', () => {
    let doc = instantiateTemplate(t4a, { width: 1000, height: 1500, presetId: 'pin-standard', assetIds: ['a', 'b', 'c', 'd'], assetMetas: metas, headline: '50 Lob Haircut Ideas' });
    const before = slotFrames(doc).map((f) => f.assetId);
    doc = switchTemplate(doc, t4b, ids, metas, null);
    expect(slotFrames(doc).map((f) => f.assetId)).toEqual(before);
    expect(readHeadline(doc)).toBe('50 Lob Haircut Ideas');
    expect(doc.layers.every((l) => l.id && l.type)).toBe(true);
  });
  it('swaps images (with crops) between frames', () => {
    let doc = instantiateTemplate(t4a, { width: 1000, height: 1500, presetId: 'pin-standard', assetIds: ['a', 'b', 'c', 'd'], assetMetas: metas });
    const [f1, f2] = slotFrames(doc);
    doc = { ...doc, layers: doc.layers.map((l) => (l.id === f1.id ? { ...(l as FrameLayer), crop: { zoom: 2, fx: 0.1, fy: 0.2 } } : l)) };
    doc = swapFrameImages(doc, f1.id, f2.id);
    const [g1, g2] = slotFrames(doc);
    expect([g1.assetId, g2.assetId]).toEqual(['b', 'a']);
    expect(g2.crop).toEqual({ zoom: 2, fx: 0.1, fy: 0.2 });
  });
});

describe('resizing & variations', () => {
  it('scaleDoc re-flows the collage and scales text to the new size', () => {
    const t = BUILTIN_TEMPLATES.find((x) => x.id === 'f2-balcony-white')!;
    const doc = scaleDoc(clone(t.doc), 736, 1472, 'custom-blog-736');
    const fr = slotFrames(doc);
    expect(fr).toHaveLength(5);
    expect(Math.max(...fr.map((f) => f.x + f.width))).toBeCloseTo(736, 0);
    const band = doc.layers.find((l) => l.role === 'band')!;
    expect(band.width).toBeCloseTo(736, 0);
  });
  it('invertBlocks swaps black and white blocks', () => {
    const d = createDocument(1000, 1500, 'pin-standard');
    d.layers.push(createText({ fill: '#FFFFFF', background: { ...createText().background, enabled: true, color: '#111111' } }));
    const inv = invertBlocks(d).layers[0] as TextLayer;
    expect(inv.fill).toBe('#111111');
    expect(inv.background.color).toBe('#FFFFFF');
  });
});

describe('template accent words', () => {
  it('never leak into the headline when switching templates', () => {
    const withAccent = BUILTIN_TEMPLATES.filter((t) => t.doc.layers.some((l) => l.type === 'text' && (l as TextLayer).role === 'accent' && (l as TextLayer).text.trim()));
    expect(withAccent.length).toBeGreaterThan(0);
    const headline = '25 Stunning Auburn Hair Color Ideas';
    for (const t of withAccent) {
      const doc = instantiateTemplate(t, { width: t.doc.width, height: t.doc.height, presetId: t.doc.presetId, headline, brand: null });
      const read = readHeadline(doc).toLowerCase().split(/\s+/);
      for (const w of read) expect(headline.toLowerCase().split(/\s+/), `${t.id}: "${w}"`).toContain(w);
    }
  });
});
