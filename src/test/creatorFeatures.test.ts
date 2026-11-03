import { describe, expect, it, vi } from 'vitest';
import { handlePinterest, seal } from '../../server/pinterest.mjs';
import { siteColors } from '../../server/pageFetch.mjs';
import { basicShape, BASIC_SHAPES, element, ELEMENTS, nextImageNumber, READY_BLOCKS, readyBlock } from '../editor/studioBlocks';
import { createDocument } from '../model/factory';
import { isFrame, isText } from '../model/docOps';
import type { PinDocument, TextLayer } from '../model/types';
import { readCsvPins, schedulePins } from '../services/csvImport';
import { csvRecords, fillAsPage, fillVariables, findVariables, frameVariable, parseCsv } from '../services/studioVars';
import { matchFormat, storyPoints, storySlides } from '../services/videoMaker';
import { DEFAULT_BRAND_KIT } from '../store/libraryStore';

const blank = (): PinDocument => createDocument(1000, 1500, 'pin-standard');
const texts = (d: PinDocument) => d.layers.filter(isText).map((l) => l.text);

describe('Design Studio variables', () => {
  it('finds {{variables}} in text and image placeholders, and fills them', () => {
    let doc = blank();
    doc = { ...doc, layers: [...readyBlock(doc, 'recipe', DEFAULT_BRAND_KIT)] };
    expect(findVariables(doc)).toEqual(['title', 'cta', 'website', 'image_1']);
    const filled = fillVariables(doc, { title: 'Easy Chicken Recipe', cta: 'Save Recipe', website: '' }, { image_1: 'asset1' });
    expect(texts(filled)).toContain('Easy Chicken Recipe');
    expect(texts(filled)).toContain('{{website}}'); // empty values leave the variable in place
    expect(filled.layers.find(isFrame)?.assetId).toBe('asset1');
    expect(doc.layers.find(isFrame)?.assetId).toBeNull(); // the design itself is untouched
    const page = fillAsPage(doc, { title: 'x' });
    expect(page.layers[0].id).not.toBe(doc.layers[0].id);
  });

  it('numbers new image placeholders after the existing ones', () => {
    let doc = blank();
    doc = { ...doc, layers: readyBlock(doc, 'grid4', DEFAULT_BRAND_KIT) };
    expect(doc.layers.filter(isFrame).map((l) => frameVariable(l.name))).toEqual(['image_1', 'image_2', 'image_3', 'image_4']);
    expect(nextImageNumber(doc)).toBe(5);
  });

  it('every block, element and shape makes layers inside the canvas', () => {
    const doc = blank();
    const all = [...READY_BLOCKS.flatMap((b) => readyBlock(doc, b.id, DEFAULT_BRAND_KIT)), ...ELEMENTS.flatMap((e) => element(doc, e.id, DEFAULT_BRAND_KIT)), ...BASIC_SHAPES.flatMap((s) => basicShape(doc, s.id, DEFAULT_BRAND_KIT))];
    expect(all.length).toBeGreaterThan(20);
    for (const l of all) {
      expect(l.width).toBeGreaterThan(0);
      expect(l.y).toBeGreaterThanOrEqual(0);
      expect(l.y + l.height).toBeLessThanOrEqual(doc.height + 1);
    }
  });

  it('parses CSV with quotes, commas, newlines and {{ }} headers', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n\n"multi\nline",2')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['multi\nline', '2'],
    ]);
    const { headers, records } = csvRecords('{{title}},Image 1\nLob Ideas,https://x.com/a.jpg');
    expect(headers).toEqual(['title', 'image_1']);
    expect(records[0]).toEqual({ title: 'Lob Ideas', image_1: 'https://x.com/a.jpg' });
  });
});

describe('CSV Import', () => {
  const csv = [
    'title,description,link,image_url,image_2,board,publish_date,publish_time',
    '"Easy Chicken Recipe",Quick dinner,https://b.com/c,https://b.com/1.jpg,https://b.com/1.jpg,Dinner,,',
    ',no title,,,,,,',
    'Balcony Ideas,,,not-a-url,https://b.com/2.jpg,,2026-11-10,09:30',
  ].join('\n');

  it('reads one Pin per titled row, de-duplicates image URLs and keeps fixed times', () => {
    const { pins, skipped } = readCsvPins(csv);
    expect(pins.map((p) => p.title)).toEqual(['Easy Chicken Recipe', 'Balcony Ideas']);
    expect(skipped).toEqual([3]);
    expect(pins[0].images).toEqual(['https://b.com/1.jpg']);
    expect(pins[0].board).toBe('Dinner');
    expect(pins[1].images).toEqual(['https://b.com/2.jpg']);
    expect(new Date(pins[1].fixedAt!).getHours()).toBe(9);
  });

  it('spreads unscheduled Pins inside the daily window at the chosen pace', () => {
    const from = new Date(2026, 10, 4);
    const pins = [...Array(10)].map(() => ({ fixedAt: null as number | null }));
    pins[3].fixedAt = 123;
    const t = schedulePins(pins, { minPerDay: 4, maxPerDay: 50, startHour: 8, endHour: 20, from });
    expect(t[3]).toBe(123);
    const open = t.filter((_, i) => i !== 3).map((x) => new Date(x));
    expect(open.every((d) => d.getHours() >= 8 && d.getHours() < 20)).toBe(true);
    expect(open.filter((d) => d.getDate() === 4)).toHaveLength(4); // 9 Pins, at least 4 a day
    expect(new Set(open.map((d) => d.getDate())).size).toBe(3);
    expect([...t].filter((_, i) => i !== 3)).toEqual([...open.map((d) => d.getTime())].sort((a, b) => a - b));
  });
});

describe('Brand Kit: website colors', () => {
  it('puts theme-color first, then the most used colorful CSS colors', () => {
    const html = '<style>.a{color:#ff6600}.b{color:#fff}.c{background:#F60}.d{color:#123abc}.e{color:#333}</style><p style="color:#123abc">x</p>';
    expect(siteColors(html, { 'theme-color': '#E60023' })).toEqual(['#e60023', '#ff6600', '#123abc']);
  });
});

describe('Video Pins', () => {
  it('matches a story format to the content', () => {
    expect(matchFormat({ url: 'https://shop.com/products/mug', title: 'Mug', description: '' })).toBe('product');
    expect(matchFormat({ url: 'https://blog.com/post', title: '10 Ways to Style a Shelf', description: '' })).toBe('tips');
    expect(matchFormat({ url: 'https://blog.com/post', title: 'Our autumn porch', description: 'Photos.' })).toBe('slideshow');
  });

  it('turns a description into short points and an opening + CTA story', () => {
    expect(storyPoints('Use warm lights. Add two plants! Ok. Layer a rug — it adds texture and comfort')).toEqual(['Use warm lights', 'Add two plants', 'Layer a rug', 'it adds texture and comfort']);
    const img = { width: 10, height: 10 } as unknown as HTMLCanvasElement;
    const slides = storySlides({ title: 'Cozy Porch', description: 'Use warm lights. Add two plants.', url: 'https://blog.com/p', photos: [img, img], format: 'tips' });
    expect(slides.map((s) => s.text)).toEqual(['Cozy Porch', 'Use warm lights', 'Add two plants', 'Read the full post']);
    expect(slides[1].sub).toBe('Tip 1');
    expect(slides[slides.length - 1].sub).toBe('blog.com');
    expect(storySlides({ title: 't', description: '', url: '', photos: [], format: 'slideshow' })).toEqual([]);
  });

  it('publishes a video Pin through the media upload flow', async () => {
    const ENV = { PINTEREST_APP_ID: 'app1', PINTEREST_APP_SECRET: 'secret', PINTEREST_TOKEN_SECRET: 'token-key' };
    const cookie = `pc_pinterest=${encodeURIComponent(seal({ access: 'AT', refresh: 'RT', expires: Date.now() + 86_400_000 }, ENV))}`;
    const req = (url: string, method = 'GET') => ({ method, url, headers: { host: 'pincraft.app', 'x-forwarded-proto': 'https', cookie } });
    const bodies: unknown[] = [];
    const http = vi.fn(async (u: string, i?: { body?: string }) => {
      if (i?.body) bodies.push(JSON.parse(i.body));
      const body = u.endsWith('/media') ? { media_id: '42', upload_url: 'https://upload', upload_parameters: { key: 'k' } } : u.includes('/media/42') ? { status: 'succeeded' } : { id: 'p7' };
      return { ok: true, status: 200, json: async () => body };
    });
    const reg = await handlePinterest('media', req('/api/pinterest/media', 'POST'), {}, { env: ENV, fetch: http });
    expect(reg.body).toEqual({ mediaId: '42', uploadUrl: 'https://upload', uploadParameters: { key: 'k' } });
    expect((await handlePinterest('media', req('/api/pinterest/media?id=42'), {}, { env: ENV, fetch: http })).body).toEqual({ status: 'succeeded' });
    expect((await handlePinterest('media', req('/api/pinterest/media?id=../x'), {}, { env: ENV, fetch: http })).status).toBe(400);
    const pin = await handlePinterest('videopin', req('/api/pinterest/videopin', 'POST'), { boardId: 'b1', title: 'Porch', mediaId: '42', link: 'https://blog.com/p' }, { env: ENV, fetch: http });
    expect(pin.body.pin.url).toBe('https://www.pinterest.com/pin/p7/');
    expect(bodies[bodies.length - 1]).toMatchObject({ board_id: 'b1', media_source: { source_type: 'video_id', media_id: '42' } });
    expect((await handlePinterest('videopin', req('/api/pinterest/videopin', 'POST'), { boardId: 'b1', mediaId: '42', link: 'javascript:x' }, { env: ENV, fetch: http })).status).toBe(400);
  });
});

it('studio text layers use the brand kit fonts', () => {
  const l = readyBlock(blank(), 'hero', DEFAULT_BRAND_KIT).find((x): x is TextLayer => isText(x) && x.role === 'title')!;
  expect(l.fontFamily).toBe(DEFAULT_BRAND_KIT.headingFont);
  expect(l.text).toBe('{{title}}');
});
