import { describe, expect, it, vi } from 'vitest';
import { designPins } from '../../server/aiDesign.mjs';
import { handleAi } from '../../server/aiRoutes.mjs';
import { COLLAGE_LAYOUTS } from '../collage/layouts';
import { FONT_LIBRARY } from '../config/fonts';
import { canvasForRatio } from '../services/aiReference';
import { specToTemplate, type AiDesignSpec } from '../services/aiDesign';
import { useLibrary } from '../store/libraryStore';
import { allTemplates, findTemplate } from '../store/projectActions';
import { instantiateTemplate, readHeadline } from '../model/docOps';

const layouts = COLLAGE_LAYOUTS.map((l) => ({ id: l.id, count: l.count, band: !!l.bandable }));
const fonts = FONT_LIBRARY.map((f) => f.family);
const image = { mediaType: 'image/jpeg', data: 'A'.repeat(400) };
const text = (p: Partial<AiDesignSpec['lines'][number]> = {}) => ({
  x: 0.1, y: 0.4, w: 0.8, h: 0.08, font: 'Anton', weight: 400, color: '#111111', size: 0.07, uppercase: true, italic: false, letterSpacing: 0,
  align: 'center' as const, background: 'none' as const, backgroundColor: '#FFFFFF', outlineWidth: 0, outlineColor: '#111111', shadow: false, ...p,
});
const SPEC: AiDesignSpec & { headline: string } = {
  name: 'Magenta Band',
  headline: '20 Trendy Fall Hair Color Ideas',
  background: '#FFFFFF',
  photos: { layout: 'band-2-2', top: 0, height: 1, gap: 8 },
  panels: [],
  rules: [],
  badge: { show: true, x: 0.05, y: 0.38, size: 0.25, shape: 'plain', color: '#FFFFFF', textColor: '#E0168C', font: 'Montserrat', outlineWidth: 0.05, outlineColor: '#111111' },
  lines: [{ ...text({ y: 0.4 }), words: 1 }, { ...text({ y: 0.48, color: '#E0168C' }), words: 4 }, { ...text({ y: 0.56 }), words: 0 }],
  subtitle: { ...text({ y: 0.65 }), show: false },
  cta: { ...text({ y: 0.7 }), show: false },
  website: { ...text({ y: 0.95, h: 0.03 }), show: true },
};
const fake = (reply: object) => {
  const create = vi.fn(async (_p: Record<string, unknown>) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(reply) }] }));
  return { client: { beta: { messages: { create } } }, create };
};

describe('template from a Pin image (server)', () => {
  it('sends the reference image with the recreate brief and asks for the headline it shows', async () => {
    const { client, create } = fake({ designs: [SPEC] });
    const out = await designPins(client, { reference: image, layouts, fonts, width: 736, height: 1472 });
    expect(out.designs).toHaveLength(1);
    const p = create.mock.calls[0][0] as { messages: { content: { type: string; text?: string }[] }[] };
    const content = p.messages[0].content;
    expect(content[0]).toMatchObject({ type: 'image' });
    expect(content[1].text).toContain('Recreate ITS design');
    expect(content[1].text).toContain('use the one on the reference Pin');
  });

  it('rejects bad images, and the reference route needs one', async () => {
    const { client } = fake({ designs: [SPEC] });
    await expect(designPins(client, { reference: { mediaType: 'image/gif', data: 'A'.repeat(400) }, layouts, fonts })).rejects.toMatchObject({ status: 400 });
    expect((await handleAi('ai-reference', { layouts, fonts }, undefined, { client, env: {}, onError: () => {} })).status).toBe(400);
    expect((await handleAi('ai-reference', { reference: image, layouts, fonts }, undefined, { client, env: {} })).status).toBe(200);
  });

  it('counts as an AI design in the daily allowance', async () => {
    const { client } = fake({ designs: [SPEC] });
    const http = vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () => (url.includes('/auth/') ? { id: 'u' } : 1) }));
    await handleAi('ai-reference', { reference: image, layouts, fonts }, 'Bearer t', { client, env: { VERCEL: '1', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k' }, fetch: http });
    const rpc = http.mock.calls.find(([u]) => String(u).includes('record_ai_use')) as unknown as [string, { body: string }];
    expect(JSON.parse(rpc[1].body)).toEqual({ kind: 'ai-design' });
  });
});

describe('template from a Pin image (browser)', () => {
  it('picks the canvas closest to the reference shape', () => {
    expect(canvasForRatio(1500 / 1000).presetId).toBe('pin-standard');
    expect(canvasForRatio(1920 / 1080).presetId).toBe('pin-full-vertical');
    expect(canvasForRatio(1472 / 736).presetId).toBe('custom-blog-736');
  });

  it('turns the recreated design into a template carrying the headline it read', () => {
    const t = specToTemplate(SPEC, 736, 1472)!;
    const doc = instantiateTemplate(t, { width: 736, height: 1472, presetId: 'custom-blog-736', headline: SPEC.headline, brand: null });
    expect(readHeadline(doc)).toContain('Fall Hair Color Ideas');
    expect(t.imageCount).toBe(4);
  });
});

describe('removing built-in templates', () => {
  it('takes them out of the library and Auto Design, keeps old projects working, and restores them', () => {
    const id = allTemplates().find((t) => t.source === 'builtin')!.id;
    const before = allTemplates().length;
    useLibrary.getState().hideTemplate(id);
    expect(allTemplates().some((t) => t.id === id)).toBe(false);
    expect(allTemplates()).toHaveLength(before - 1);
    expect(findTemplate(id)?.id).toBe(id);
    useLibrary.getState().restoreHiddenTemplates();
    expect(allTemplates()).toHaveLength(before);
  });
});
