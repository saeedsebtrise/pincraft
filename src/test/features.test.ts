import { describe, expect, it } from 'vitest';
import { frames, instantiateTemplate, readHeadline, switchTemplate } from '../model/docOps';
import { createDocument, createProject, createText, normalizeProject } from '../model/factory';
import type { AssetMeta, TextLayer } from '../model/types';
import { fillPhotos } from '../editor/importImages';
import { useAssets } from '../store/assetStore';
import { useUi } from '../store/uiStore';
import { parseTitle, suggestSubtitles, suggestVariations } from '../services/headlines';
import { useEditor } from '../store/editorStore';
import { BUILTIN_TEMPLATES } from '../templates/builtins';
import { matchesQuery } from '../templates/search';

const meta = (id: string): AssetMeta => ({ id, name: id, mime: 'image/jpeg', width: 800, height: 1200, size: 1, createdAt: 0 });
const tpl = (id: string) => BUILTIN_TEMPLATES.find((t) => t.id === id)!;
const text = (d: { layers: unknown[] }, role: string) => (d.layers as TextLayer[]).find((l) => l.type === 'text' && l.role === role)?.text;

describe('pages (several Pins per project)', () => {
  it('upgrades old single-page projects', () => {
    const p = createProject(createDocument(1000, 1500, 'pin-standard'));
    const legacy = { ...p, pages: undefined, activePage: undefined } as unknown as typeof p;
    const n = normalizeProject(legacy);
    expect(n.pages).toHaveLength(1);
    expect(n.pages[0]).toBe(n.doc);
    expect(n.activePage).toBe(0);
  });

  it('adds, switches, duplicates, moves and deletes pages without losing edits', () => {
    const ed = useEditor.getState();
    ed.load(createProject(createDocument(1000, 1500, 'pin-standard')));
    ed.addLayers([createText({ name: 'on page 1' })]);
    ed.addPage(createDocument(736, 1472, 'custom-blog-736'));
    let s = useEditor.getState();
    expect(s.project!.activePage).toBe(1);
    expect(s.project!.doc.width).toBe(736);
    expect(s.past).toHaveLength(0); // history is per page

    ed.goToPage(0);
    s = useEditor.getState();
    expect(s.project!.doc.layers.map((l) => l.name)).toEqual(['on page 1']);

    ed.duplicatePage(0);
    s = useEditor.getState();
    expect(s.project!.pages).toHaveLength(3);
    expect(s.project!.activePage).toBe(1);
    expect(s.project!.doc.layers[0].id).not.toBe(s.project!.pages[0].layers[0].id); // fresh ids

    ed.movePage(2, 0);
    s = useEditor.getState();
    expect(s.project!.pages[0].width).toBe(736);
    expect(s.project!.doc.layers[0].name).toBe('on page 1');

    ed.deletePage(0);
    s = useEditor.getState();
    expect(s.project!.pages).toHaveLength(2);
    expect(normalizeProject(s.project!).pages.every((p) => p.width === 1000)).toBe(true);
  });
});

describe('subtitles & variations', () => {
  it('turns the rest of the article title into a subtitle', () => {
    expect(parseTitle('50 Lob Haircut Ideas to Take to Your Next Salon Appointment').tail).toBe('to Take to Your Next Salon Appointment');
    const subs = suggestSubtitles({ articleTitle: '50 Lob Haircut Ideas to Take to Your Next Salon Appointment' });
    expect(subs[0]).toBe('To Take to Your Next Salon Appointment');
    expect(subs.length).toBeGreaterThan(2);
  });

  it('keeps descriptive words out of the subject and writes full variations', () => {
    const p = parseTitle('28 Stunning Balcony Decor Ideas to Transform Your Space');
    expect(p).toMatchObject({ number: '28', descriptor: 'Stunning', subject: 'Balcony Decor', listNoun: 'Ideas' });
    const v = suggestVariations({ articleTitle: '28 Stunning Balcony Decor Ideas to Transform Your Space' });
    expect(v[0]).toBe('28 Stunning Balcony Decor Ideas to Transform Your Space');
    expect(v).toContain('28 Beautiful Balcony Decor Ideas to Transform Your Space');
  });

  it('fills a template subtitle on creation and keeps it when switching between templates that have one', () => {
    const doc = instantiateTemplate(tpl('m2-lob-subtitle-band'), {
      width: 1000,
      height: 1500,
      presetId: 'pin-standard',
      headline: '50 Lob Haircut Ideas',
      subtitle: 'To Take to Your Next Salon Appointment',
    });
    expect(text(doc, 'subtitle')).toBe('To Take to Your Next Salon Appointment');
    expect(text(doc, 'badge')).toBe('50');
    const again = switchTemplate(doc, tpl('m2-lob-subtitle-band'), [], {}, null);
    expect(text(again, 'subtitle')).toBe('To Take to Your Next Salon Appointment');
    expect(readHeadline(again)).toBe('50 Lob Haircut Ideas');
  });

  it('builds the balcony mockup layout from a headline', () => {
    const doc = instantiateTemplate(tpl('m3-balcony-stunning'), { width: 1000, height: 1500, presetId: 'pin-standard', headline: '28 Stunning Balcony Decor Ideas' });
    expect(text(doc, 'badge')).toBe('28');
    expect(text(doc, 'accent')).toBe('Stunning');
    const lines = (doc.layers as TextLayer[]).filter((l) => l.role === 'title-line').sort((a, b) => a.y - b.y).map((l) => l.text);
    expect(lines).toEqual(['Balcony', 'Decor Ideas']);
    expect(readHeadline(doc)).toBe('28 Stunning Balcony Decor Ideas');
  });
});

describe('template search', () => {
  it('matches names, categories and design types', () => {
    expect(matchesQuery(tpl('m3-balcony-stunning'), 'balcony')).toBe(true);
    expect(matchesQuery(tpl('m3-balcony-stunning'), 'script listicle')).toBe(true);
    expect(matchesQuery(tpl('m1-lob-pink-blocks'), 'balcony')).toBe(false);
    expect(BUILTIN_TEMPLATES.filter((t) => matchesQuery(t, 'hair')).length).toBeGreaterThan(4);
  });
});

describe('photos on every page', () => {
  const tplDoc = (id: string) => instantiateTemplate(tpl(id), { width: tpl(id).doc.width, height: tpl(id).doc.height, presetId: tpl(id).doc.presetId, brand: null });
  const setup = () => {
    const pages = [tplDoc('hb-bronde-blocks'), tplDoc('hb-sticker-serif-spring'), tplDoc('hb-bronde-blocks')];
    useEditor.getState().load({ ...createProject(pages[0]), pages, assetIds: ['a1', 'a2'] });
    useAssets.setState({ metas: { a1: meta('a1'), a2: meta('a2') } });
  };
  const filled = () => useEditor.getState().project!.pages.map((d) => frames(d).filter((f) => f.assetId).length);

  it('fills the frames of all pages when Apply to all is on', () => {
    setup();
    useUi.getState().set({ fillAllPages: true });
    expect(fillPhotos(['a1', 'a2'], { allowDuplicates: true })).toBe(3);
    const p = useEditor.getState().project!;
    p.pages.forEach((d, i) => expect(filled()[i]).toBe(frames(d).length));
    // Each page starts the photos at a different one.
    expect(frames(p.pages[0])[0].assetId).not.toBe(frames(p.pages[1])[0].assetId);
  });

  it('fills only the open page when it is off', () => {
    setup();
    useUi.getState().set({ fillAllPages: false });
    expect(fillPhotos(['a1', 'a2'], { allowDuplicates: true })).toBe(1);
    const p = useEditor.getState().project!;
    expect(frames(p.doc).every((f) => f.assetId)).toBe(true);
    expect(filled()[1]).toBe(0);
    useUi.getState().set({ fillAllPages: true });
  });
});
