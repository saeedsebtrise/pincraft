// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

// Runs in its own Vitest process (see "test" in package.json): a test process that has
// loaded sharp's native libvips could crash later while running another file.
// @ts-expect-error The worker runs as native Node ESM.
import { runAutopilot } from '../../autopilot/run.mjs';
// @ts-expect-error The worker runs as native Node ESM.
import { generateCopy, geminiModel, StageError } from '../../autopilot/core.mjs';
// @ts-expect-error The renderer runs as native Node ESM.
import { chooseTemplate, contrast, ctaFor, designCopy, designPin, fontFor, paletteFrom, pickTemplate, readableOn, renderPin, sizeFor, templateFor, verticalMap, PHOTO_LAYOUTS, PHOTOS_NEEDED, SIZES } from '../../autopilot/design.mjs';

const boards = JSON.stringify([{ id: '123456789012345678', name: 'Ideas' }]);
const metadata = { title: '12 Room Ideas', cta: 'See the ideas', image_base64: 'cG5n' };

describe('Autopilot runner isolation', () => {
  it('previews without any Sheet or Make credentials, requests, or queue writes', async () => {
    const fetch = vi.fn();
    const prepare = vi.fn().mockResolvedValue(metadata);
    const savePreview = vi.fn();
    const result = await runAutopilot({ AUTOPILOT_BOARDS_JSON: boards, AUTOPILOT_PREVIEW_URL: 'https://example.com/article' }, { fetch, prepare, savePreview });
    expect(result.status).toBe('preview');
    expect(fetch).not.toHaveBeenCalled();
    expect(prepare).toHaveBeenCalledWith('https://example.com/article');
    expect(savePreview).toHaveBeenCalledWith(metadata, 1);
  });

  it('refuses publishing before contacting anything when the switch is disabled', async () => {
    const fetch = vi.fn();
    await expect(runAutopilot({ AUTOPILOT_BOARDS_JSON: boards, AUTOPILOT_MODE: 'publish' }, { fetch })).rejects.toThrow('Publishing disabled');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects invalid modes and preview without a URL without preparing content', async () => {
    const prepare = vi.fn();
    await expect(runAutopilot({ AUTOPILOT_MODE: 'publsih' }, { prepare })).rejects.toThrow('must be preview or publish');
    await expect(runAutopilot({ AUTOPILOT_BOARDS_JSON: boards }, { prepare })).rejects.toThrow('PREVIEW_URL');
    expect(prepare).not.toHaveBeenCalled();
  });

  it('previews several different Pins of one article, all linking to the plain article URL', async () => {
    const prepare = vi.fn(async (url: string) => ({ link: url.replace(/#.*$/, ''), image_base64: '', design: { pin: url }, title: 't' }));
    const savePreview = vi.fn(async () => {});
    const result = await runAutopilot({ AUTOPILOT_BOARDS_JSON: boards, AUTOPILOT_PREVIEW_URL: 'https://example.com/article', AUTOPILOT_PREVIEW_PINS: '3' }, { prepare, savePreview });
    expect(result).toEqual({ status: 'preview', pins: 3 });
    expect(prepare.mock.calls.map((c) => c[0])).toEqual(['https://example.com/article', 'https://example.com/article#pin-2', 'https://example.com/article#pin-3']);
    expect(savePreview.mock.calls.map((c) => (c as unknown[])[1])).toEqual([1, 2, 3]);
    await runAutopilot({ AUTOPILOT_BOARDS_JSON: boards, AUTOPILOT_PREVIEW_URL: 'https://example.com/article', AUTOPILOT_PREVIEW_PINS: '99' }, { prepare, savePreview });
    expect(prepare).toHaveBeenCalledTimes(3 + 5);
  });

  it('names the failing stage without leaking provider bodies or secrets', async () => {
    expect(geminiModel(' models/gemini-2.5-flash ')).toBe('gemini-2.5-flash');
    expect(geminiModel('')).toBe('gemini-2.5-flash-lite');
    const article = { url: 'https://example.com/a', title: 'Wedding Hair', text: 'Some text', images: [] };
    const secretBody = 'quota exceeded for key AIzaSECRET';
    const fetchMock = vi.fn(async () => new Response(secretBody, { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const error = await generateCopy(article, JSON.parse(boards), '', { GEMINI_API_KEY: 'AIzaSECRET' }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(StageError);
      expect((error as Error).message).toMatch(/^gemini: .*429/);
      expect((error as Error).message).not.toMatch(/AIza|quota/);
    } finally {
      vi.unstubAllGlobals();
    }
    const makeFails = vi.fn(async (url: URL | string) =>
      String(url).includes('make.com') ? new Response('hook https://hook.eu1.make.com/SECRET broke', { status: 500 }) : new Response(JSON.stringify({ ok: true, job: { article_url: 'https://example.com/a', board_id: '123', row: 2 } })),
    );
    const prepare = vi.fn(async () => ({ article_url: 'https://example.com/a' }));
    const failure = await runAutopilot({ AUTOPILOT_BOARDS_JSON: boards, AUTOPILOT_MODE: 'publish', AUTOPILOT_ENABLED: 'true', AUTOPILOT_SHEET_URL: 'https://script.google.com/macros/s/deployment-id/exec', AUTOPILOT_SHEET_SECRET: 'x'.repeat(32), MAKE_WEBHOOK_URL: 'https://hook.eu1.make.com/test' }, { fetch: makeFails, prepare }).catch((e: unknown) => e);
    expect(String((failure as Error)?.message)).not.toContain('SECRET');
  });

  it('rejects lookalike Sheet endpoints before sending its shared secret', async () => {
    const fetch = vi.fn();
    await expect(runAutopilot({ AUTOPILOT_BOARDS_JSON: boards, AUTOPILOT_MODE: 'publish', AUTOPILOT_ENABLED: 'true', AUTOPILOT_SHEET_URL: 'https://script.google.com.evil.example/macros/s/id/exec' }, { fetch })).rejects.toThrow('Apps Script');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not generate or publish when the Sheet has no due work', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, job: null }) });
    const prepare = vi.fn();
    const result = await runAutopilot({ AUTOPILOT_BOARDS_JSON: boards, AUTOPILOT_MODE: 'publish', AUTOPILOT_ENABLED: 'true', AUTOPILOT_SHEET_URL: 'https://script.google.com/macros/s/deployment-id/exec', AUTOPILOT_SHEET_SECRET: 'x'.repeat(32), MAKE_WEBHOOK_URL: 'https://hook.eu1.make.com/test' }, { fetch, prepare });
    expect(result.status).toBe('idle');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(prepare).not.toHaveBeenCalled();
  });
});

describe('Autopilot real image renderer', () => {
  const photo = (color: string, w = 600, h = 800) => sharp({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer();
  const six = () => Promise.all(['#c58b5a', '#7d5a44', '#d9b48f', '#a86f4c', '#6b4b3a', '#e2c4a4'].map(c => photo(c)));
  // Every overlay field at its maximum length, with wide letters.
  const maxCopy = {
    title: '25 Wedding Ideas', number: '888', hook: 'W'.repeat(12), headline_line1: 'W'.repeat(14), headline_line2: 'M'.repeat(14),
    category: 'W'.repeat(22), script_word: 'W'.repeat(10), script_line: 'W'.repeat(22), banner: 'W'.repeat(16), tagline: 'W'.repeat(28),
  };
  type Box = { name: string; left: number; top: number; width: number; height: number; region: [number, number] };

  it.each(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'])('template %s renders 1000×1500 with every text inside its region at max lengths', async template => {
    const r = await renderPin(await six(), maxCopy, 'https://luxehairstyles.com/post', { template });
    expect(r.template).toBe(template);
    expect(await sharp(r.png).metadata()).toMatchObject({ width: 1000, height: 1500, format: 'png' });
    const boxes = r.boxes as Box[];
    expect(boxes.map(b => b.name)).toEqual(expect.arrayContaining(['headline1', 'headline2', 'number', 'cta', 'domain']));
    for (const b of boxes) {
      expect(b.left, b.name).toBeGreaterThanOrEqual(0);
      expect(b.left + b.width, b.name).toBeLessThanOrEqual(1000);
      expect(b.top, b.name).toBeGreaterThanOrEqual(b.region[0]);
      expect(b.top + b.height, b.name).toBeLessThanOrEqual(b.region[1]);
    }
    // Headlines fill at most ~88% of the width.
    for (const b of boxes.filter(x => x.name.startsWith('headline'))) expect(b.width).toBeLessThanOrEqual(880);
  });

  it('moves on to the next template when a required field is empty', async () => {
    const photos = await six();
    // D and G need a banner and a script line, F and H a script line.
    expect(pickTemplate('D', 6, { ...maxCopy, banner: '' })).toBe('E');
    expect(pickTemplate('G', 6, { ...maxCopy, script_line: '' })).toBe('A');
    expect(pickTemplate('F', 6, { ...maxCopy, script_line: '' })).toBe('A');
    expect(pickTemplate('G', 6, { ...maxCopy, banner: '' })).toBe('H');
    expect(pickTemplate('C', 4, maxCopy)).toBe('A');
    const r = await renderPin(photos, { ...maxCopy, banner: '', script_line: '' }, 'https://a.com/x', { template: 'D' });
    expect(r.template).toBe('E');
    expect((r.boxes as Box[]).some(b => b.name === 'banner')).toBe(false);
  });

  it('puts the list count in "see all" calls to action', () => {
    expect(ctaFor('A', '19')).toBe('SEE ALL 19 IDEAS');
    expect(ctaFor('E', '')).toBe('SEE ALL IDEAS');
    expect(ctaFor('B', '19')).toBe('GET THE IDEAS');
  });

  it('hides the number badge when number is empty', async () => {
    const r = await renderPin(await six(), { ...maxCopy, number: '' }, 'https://luxehairstyles.com/post', { template: 'A' });
    expect((r.boxes as Box[]).some(b => b.name === 'number')).toBe(false);
  });

  it('falls back to template A when there are too few usable photos, skipping small ones', async () => {
    const tiny = await photo('#111111', 200, 900);
    const four = await Promise.all(['#c58b5a', '#7d5a44', '#d9b48f', '#a86f4c'].map(c => photo(c)));
    expect((await renderPin(four, maxCopy, 'https://a.com/x', { template: 'C' })).template).toBe('A');
    const two = await renderPin([tiny, four[0], tiny, four[1]], maxCopy, 'https://a.com/x', { template: 'B' });
    expect(two).toMatchObject({ template: 'A', photos: 2 });
    expect(await sharp(two.png).metadata()).toMatchObject({ width: 1000, height: 1500 });
  });

  it('picks the same template for the same key and rotates through all of them; the override wins', () => {
    expect(chooseTemplate('job-123')).toBe(chooseTemplate('job-123'));
    const seen = new Set(Array.from({ length: 40 }, (_, i) => chooseTemplate(`https://a.com/post-${i}`)));
    expect([...seen].sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);
    expect(chooseTemplate('job-123', 'd')).toBe('D');
    expect(chooseTemplate('job-123', 'rotate')).toBe(chooseTemplate('job-123'));
  });

  it('chooses templates by "photos per Pin" and what the article has', () => {
    expect(PHOTO_LAYOUTS['8']).toEqual(['I', 'J']);
    for (let i = 0; i < 20; i++) {
      expect(PHOTOS_NEEDED[templateFor(`https://a.com/${i}`, { photoCount: 8, layout: '8' })]).toBe(8);
      expect(PHOTOS_NEEDED[templateFor(`https://a.com/${i}`, { photoCount: 8, layout: '4' })]).toBe(4);
      // Only five photos: an 8-photo choice falls back to a template the article can fill.
      expect(PHOTOS_NEEDED[templateFor(`https://a.com/${i}`, { photoCount: 5, layout: '8' })]).toBeLessThanOrEqual(5);
    }
    expect(templateFor('k', { override: 'c', layout: '8' })).toBe('C');
    expect(new Set([1, 2, 3, 4].map((v) => templateFor('https://a.com/x', { variant: v, photoCount: 8 }))).size).toBe(4);
  });

  it('rotates sizes and headline fonts per article and Pin', () => {
    expect(sizeFor('k', ['1:2'], 3)).toBe('1:2');
    expect(new Set([1, 2, 3].map((v) => sizeFor('k', ['2:3', '1:2', '9:16'], v))).size).toBe(3);
    expect(sizeFor('k', 'nonsense')).toBe('2:3');
    expect(new Set([1, 2, 3, 4].map((v) => fontFor('k', v))).size).toBe(4);
  });

  it('stretches only the photo areas for other sizes', () => {
    const map = verticalMap([[0, 450], [1050, 1500]], 1500, 2000);
    expect(map(0)).toBe(0);
    expect(map(450)).toBeCloseTo(700);
    expect(map(1050) - map(450)).toBeCloseTo(600); // the text panel keeps its size
    expect(map(1500)).toBeCloseTo(2000);
    expect(verticalMap([], 1500, 2000)(700)).toBe(700);
  });

  it.each(Object.keys(SIZES))('renders a %s Pin at its real size with text inside the Pin', async (size) => {
    const photos = await Promise.all(['#c0603a', '#3a6a8a', '#e8d9c4', '#5a7a4a', '#c08040', '#806090', '#40a0a0', '#a04060'].map((c) => photo(c)));
    const pin = await renderPin(photos, { title: '19 Cozy Living Room Decor Ideas', number: '19', headline_line1: 'LIVING ROOM', headline_line2: 'DECOR IDEAS', tagline: 'WARM AND INVITING LOOKS' }, 'https://example.com/p', { size, layout: '8', font: 'mix' });
    const meta = await sharp(pin.png).metadata();
    expect([meta.width, meta.height]).toEqual([1000, SIZES[size]]);
    expect(PHOTOS_NEEDED[pin.template]).toBe(8);
    for (const b of pin.boxes) {
      expect(b.top, b.name).toBeGreaterThanOrEqual(0);
      expect(b.top + b.height, b.name).toBeLessThanOrEqual(SIZES[size]);
    }
  }, 30000);

  it('takes colors from the photos, keeps text readable, and falls back for grey photos', async () => {
    const warm = await paletteFrom([await photo('#c0603a'), await photo('#3a2a20')], 'k');
    expect(warm.accent).not.toBe('#B8862F');
    expect(contrast(readableOn(warm.accent, '#F6F1E7'), '#F6F1E7')).toBeGreaterThanOrEqual(4.5);
    const grey = await paletteFrom([await photo('#808080')], 'k');
    expect(grey.accent).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('fills missing overlay fields from the title', () => {
    expect(designCopy({ title: '25 Stunning Wedding Hairstyles' })).toMatchObject({ number: '25', headline_line1: 'STUNNING WEDDING', headline_line2: 'HAIRSTYLES', script_word: 'Ideas' });
    expect(designCopy({ title: '25 Ideas', number: '' }).number).toBe('');
  });

  it('fails before publishing when no photo is decodable', async () => {
    await expect(designPin([Buffer.from('invalid')], metadata, 'https://example.com/article')).rejects.toThrow('No decodable photos');
  });
});
