import { describe, expect, it } from 'vitest';
import { applyCollage } from '../model/docOps';
import { createDocument, createProject, createText } from '../model/factory';
import type { AssetMeta, FrameLayer, PinDocument, TextLayer } from '../model/types';
import { sniffImageType, validateImageFile } from '../services/fileValidation';
import { exportFilename, sanitizeFilename, slugify } from '../services/filename';
import { parseTitle, suggestHeadlines } from '../services/headlines';
import { checkDocument } from '../services/qualityCheck';
import { recommendTemplates } from '../services/recommend';
import { useEditor } from '../store/editorStore';
import { repos } from '../storage/repositories';
import { BUILTIN_TEMPLATES } from '../templates/builtins';

describe('headline suggestions (local, no AI required)', () => {
  const title = '50 Lob Haircut Ideas to Take to Your Next Salon Appointment';
  it('parses number, subject and list noun', () => {
    expect(parseTitle(title)).toMatchObject({ number: '50', subject: 'Lob Haircut', listNoun: 'Ideas', core: '50 Lob Haircut Ideas' });
  });
  it('produces short, distinct overlay headlines like the spec examples', () => {
    const s = suggestHeadlines({ articleTitle: title });
    expect(s[0]).toBe('50 Lob Haircut Ideas');
    expect(s).toContain('50 Chic Lob Haircuts');
    expect(s).toContain("Lob Haircut Ideas You'll Love");
    expect(new Set(s.map((x) => x.toLowerCase())).size).toBe(s.length);
    expect(s.every((x) => x.length <= 60)).toBe(true);
  });
  it('returns nothing for an empty title', () => {
    expect(suggestHeadlines({ articleTitle: '  ' })).toEqual([]);
  });
});

describe('design recommendation', () => {
  it('suggests number-badge and home-decor designs for a balcony listicle', () => {
    const recs = recommendTemplates('32 Minimalist Balcony Decor Ideas', BUILTIN_TEMPLATES, { limit: 6 });
    expect(recs.length).toBeGreaterThanOrEqual(4);
    expect(recs.some((r) => r.template.categories.includes('Balcony'))).toBe(true);
    expect(recs.some((r) => r.template.doc.layers.some((l) => l.role === 'badge'))).toBe(true);
    expect(new Set(recs.slice(0, 4).map((r) => r.template.family)).size).toBe(4); // variety
  });
  it('suggests hair templates for hair titles', () => {
    const recs = recommendTemplates('52 Perfect Bronde Hair Color Ideas', BUILTIN_TEMPLATES);
    expect(recs[0].template.categories).toContain('Hair');
  });
});

describe('file validation trusts bytes, not extensions', () => {
  it('sniffs JPEG, PNG, WEBP', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp');
  });
  it('rejects a script renamed to .png and empty files', async () => {
    const fake = Object.assign(new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), { name: 'evil.png' });
    expect((await validateImageFile(fake)).ok).toBe(false);
    expect((await validateImageFile(Object.assign(new Blob([]), { name: 'e.jpg' }))).ok).toBe(false);
  });
});

describe('export filenames', () => {
  it('builds clean slugs', () => {
    expect(exportFilename('50 Lob Haircut Ideas', 1, 'png')).toBe('50-lob-haircut-ideas-pin-01.png');
    expect(exportFilename("Lob Haircut Ideas You'll Love!", 12, 'jpeg')).toBe('lob-haircut-ideas-youll-love-pin-12.jpg');
    expect(slugify('Café Décor')).toBe('cafe-decor');
  });
  it('sanitizes overrides and forces the extension', () => {
    expect(sanitizeFilename('my pin/../x.png', 'jpeg')).toBe('my-pin-..-x.jpg');
  });
});

describe('design quality checks', () => {
  const measure = (l: TextLayer) => ({ fontSize: l.fontSize, overflow: l.text.length > 200 });
  const docWith = (p: Partial<TextLayer>): PinDocument => {
    const d = createDocument(1000, 1500, 'pin-standard');
    d.layers.push(createText({ x: 200, y: 600, width: 600, height: 200, text: 'Headline', fontSize: 80, ...p }));
    return d;
  };
  it('flags text near the edge only as a safe-area warning (TEST 6)', () => {
    const near = checkDocument(docWith({ x: 5 }), { metas: {}, measure });
    expect(near.map((i) => i.code)).toContain('outside-safe-area');
    expect(checkDocument(docWith({}), { metas: {}, measure }).map((i) => i.code)).not.toContain('outside-safe-area');
  });
  it('flags small text, low contrast and overflow', () => {
    const codes = (p: Partial<TextLayer>) => checkDocument(docWith(p), { metas: {}, measure }).map((i) => i.code);
    expect(codes({ fontSize: 20 })).toContain('text-small');
    expect(codes({ fill: '#EEEEEE', background: { ...createText().background, enabled: true, color: '#FFFFFF' } })).toContain('low-contrast');
    expect(codes({ text: 'x'.repeat(300) })).toContain('overflow');
  });
  it('flags empty frames and low-resolution images (TEST 7)', () => {
    let d = createDocument(1000, 1500, 'pin-standard');
    d = applyCollage(d, { layoutId: 'grid-2x2', region: { x: 0, y: 0, width: 1, height: 1 }, gap: 0, margin: 0, band: 0, cornerRadius: 0, borderWidth: 0, borderColor: '#fff' });
    const metas: Record<string, AssetMeta> = { tiny: { id: 'tiny', name: 't', mime: 'image/jpeg', width: 120, height: 160, size: 1, createdAt: 0 } };
    d.layers = d.layers.map((l, i) => (i === 0 ? { ...(l as FrameLayer), assetId: 'tiny' } : l));
    const issues = checkDocument(d, { metas, measure });
    expect(issues.filter((i) => i.code === 'low-res')).toHaveLength(1);
    expect(issues.find((i) => i.code === 'empty-frame' && !i.layerId)?.message).toBe('3 image slots still need an image.');
  });
  it('warns when a template expects a website footer', () => {
    expect(checkDocument(createDocument(1000, 1500, 'x'), { metas: {}, measure, expectWebsite: true }).map((i) => i.code)).toContain('missing-website');
  });
});

describe('undo / redo history', () => {
  it('records, coalesces and replays document changes', () => {
    const p = createProject(createDocument(1000, 1500, 'pin-standard'));
    const ed = useEditor.getState();
    ed.load(p);
    const t = createText({ text: 'A' });
    ed.addLayers([t]);
    ed.updateLayer<TextLayer>(t.id, { x: 100 });
    ed.updateLayer<TextLayer>(t.id, { text: 'AB' }, 'typing');
    ed.updateLayer<TextLayer>(t.id, { text: 'ABC' }, 'typing'); // coalesced with the previous edit
    expect(useEditor.getState().past).toHaveLength(3);
    ed.undo();
    expect((useEditor.getState().project!.doc.layers[0] as TextLayer).text).toBe('A');
    ed.undo();
    expect(useEditor.getState().project!.doc.layers[0].x).toBe(0);
    ed.redo();
    ed.redo();
    expect((useEditor.getState().project!.doc.layers[0] as TextLayer).text).toBe('ABC');
    ed.undo();
    ed.undo();
    ed.undo();
    expect(useEditor.getState().project!.doc.layers).toHaveLength(0);
  });
  it('duplicate, reorder and delete are undoable layer operations', () => {
    const ed = useEditor.getState();
    ed.load(createProject(createDocument(1000, 1500, 'pin-standard')));
    const a = createText({ name: 'A' });
    const b = createText({ name: 'B' });
    ed.addLayers([a, b]);
    ed.reorder(a.id, 'front');
    expect(useEditor.getState().project!.doc.layers.map((l) => l.name)).toEqual(['B', 'A']);
    ed.duplicate([a.id]);
    expect(useEditor.getState().project!.doc.layers).toHaveLength(3);
    ed.removeLayers([b.id]);
    ed.undo();
    ed.undo();
    ed.undo();
    expect(useEditor.getState().project!.doc.layers.map((l) => l.name)).toEqual(['A', 'B']);
  });
});

describe('project storage (IndexedDB)', () => {
  it('saves and reopens a project exactly', async () => {
    const t = BUILTIN_TEMPLATES[0];
    const p = createProject(structuredClone(t.doc), 'Round trip');
    await repos.projects.put(p);
    const back = await repos.projects.get(p.id);
    expect(back).toEqual(p);
    expect((await repos.projects.list()).some((x) => x.id === p.id)).toBe(true);
    await repos.projects.remove(p.id);
    expect(await repos.projects.get(p.id)).toBeUndefined();
  });
});
