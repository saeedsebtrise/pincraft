import { describe, expect, it, vi } from 'vitest';
import { designPins } from '../../server/aiDesign.mjs';
import { COLLAGE_LAYOUTS } from '../collage/layouts';
import { FONT_LIBRARY } from '../config/fonts';
import { frames } from '../model/docOps';
import type { TextLayer } from '../model/types';
import { specToTemplate, type AiDesignSpec } from '../services/aiDesign';
import { autoDesign } from '../services/autoDesign';

const text = (over: Partial<AiDesignSpec['lines'][number]> = {}): AiDesignSpec['lines'][number] => ({
  x: 0.08, y: 0.4, w: 0.84, h: 0.08, font: 'Anton', weight: 400, color: '#111111', size: 0.07, uppercase: true, italic: false, letterSpacing: 0,
  align: 'center', background: 'block', backgroundColor: '#FFFFFF', outlineWidth: 0, outlineColor: '#000000', shadow: false, words: 0, ...over,
});

const SPEC: AiDesignSpec = {
  name: 'Blush band',
  background: '#F7E8E4',
  photos: { layout: 'band-2-2', top: 0, height: 1, gap: 8 },
  panels: [{ x: 0, y: 0.34, w: 1, h: 0.32, color: '#F7E8E4', opacity: 1, radius: 0 }],
  rules: [{ x: 0.1, y: 0.35, w: 0.8, h: 0.004, color: '#B5651D' }],
  badge: { show: true, x: 0.42, y: 0.28, size: 0.16, shape: 'circle', color: '#B5651D', textColor: '#FFFFFF', font: 'Anton', outlineWidth: 0, outlineColor: '#000000' },
  lines: [text({ y: 0.4, words: 1, font: 'Great Vibes', uppercase: false, background: 'none' }), text({ y: 0.49, words: 0 })],
  subtitle: { ...text({ y: 0.58, h: 0.05, size: 0.03, background: 'none' }), show: true },
  cta: { ...text({ y: 0.9, h: 0.04, size: 0.02, background: 'pill', backgroundColor: '#B5651D', color: '#FFFFFF' }), show: true },
  website: { ...text({ y: 0.95, h: 0.03, size: 0.018, background: 'none' }), show: true },
};

const texts = (layers: { type: string }[]) => layers.filter((l): l is TextLayer => l.type === 'text');

describe('AI designs (browser side)', () => {
  it('turns an AI spec into an editable design that carries the real headline', () => {
    const t = specToTemplate(SPEC, 1000, 1500)!;
    expect(t.name).toBe('AI — Blush band');
    expect(t.id.startsWith('ai-')).toBe(true);
    expect(t.doc.collage?.layoutId).toBe('band-2-2');
    expect(frames(t.doc)).toHaveLength(4);

    const [r] = autoDesign({ title: '50 Lob Haircut Ideas to Take to Your Next Salon Appointment' }, [t], { measure: () => 1 });
    const byRole = (role: string) => texts(r.doc.layers).filter((l) => l.role === role).sort((a, b) => a.y - b.y).map((l) => l.text);
    expect(byRole('badge')).toEqual(['50']);
    expect(byRole('title-line')).toEqual(['Lob', 'Haircut Ideas']);
    expect(byRole('subtitle').join(' ')).toBe('To Take to Your Next Salon Appointment');
    expect(byRole('cta')).toHaveLength(1);
    expect(byRole('cta')[0]).not.toBe('');
  });

  it('never trusts the AI’s numbers: positions, colours, fonts and layouts are checked', () => {
    const bad = {
      ...SPEC,
      background: 'red',
      photos: { layout: 'does-not-exist', top: -3, height: 9, gap: 500 },
      badge: { ...SPEC.badge, x: 7, y: -2, size: 3, font: 'Comic Sans' },
      lines: [text({ x: -1, y: 2, w: 5, h: -1, size: 9, color: 'javascript:alert(1)', font: 'Wingdings', weight: 5000 })],
    } as AiDesignSpec;
    const t = specToTemplate(bad, 1000, 1500)!;
    expect(t.doc.collage?.layoutId).toBe('single');
    expect(t.doc.background.color).toBe('#FFFFFF');
    for (const l of t.doc.layers) {
      expect(l.x, l.name).toBeGreaterThanOrEqual(0);
      expect(l.y, l.name).toBeGreaterThanOrEqual(0);
      expect(l.x + l.width, l.name).toBeLessThanOrEqual(1000 + 1);
      expect(l.y + l.height, l.name).toBeLessThanOrEqual(1500 + 1);
    }
    const line = texts(t.doc.layers).find((l) => l.role === 'title-line')!;
    expect(line.fill).toBe('#111111');
    expect(line.fontFamily).toBe('Montserrat');
    expect(line.fontWeight).toBeLessThanOrEqual(900);
    expect(texts(t.doc.layers).find((l) => l.role === 'badge')!.fontFamily).toBe('Montserrat');
  });

  it('skips a spec without headline lines', () => {
    expect(specToTemplate({ ...SPEC, lines: [] }, 1000, 1500)).toBeNull();
  });
});

describe('AI designs (server)', () => {
  const body = {
    headline: '50 Lob Haircut Ideas',
    subtitle: 'For Your Next Salon Appointment',
    width: 1000,
    height: 1500,
    count: 2,
    layouts: COLLAGE_LAYOUTS.map((l) => ({ id: l.id, count: l.count, band: !!l.bandable })),
    fonts: FONT_LIBRARY.map((f) => f.family),
    palette: ['#b5651d', 'not-a-colour'],
    photoRatios: [1.5, 1.33],
  };
  const fakeClient = (reply: object, stop = 'end_turn') => {
    const create = vi.fn(async (_params: Record<string, unknown>) => ({ stop_reason: stop, content: [{ type: 'text', text: JSON.stringify(reply) }] }));
    return { client: { beta: { messages: { create } } }, create };
  };

  it('asks Claude Opus 5.5 for structured designs with refusal fallback, sending text only', async () => {
    const { client, create } = fakeClient({ designs: [SPEC, { ...SPEC, name: 'Second' }] });
    const out = await designPins(client, body);
    expect(out.designs).toHaveLength(2);
    const params = create.mock.calls[0][0] as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(params.model).toBe('claude-opus-5-5');
    expect(params.fallbacks).toBe('default');
    expect(params.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(params.output_config.format).toBeTruthy();
    const brief = params.messages[0].content as string;
    expect(brief).toContain('Headline: 50 Lob Haircut Ideas');
    expect(brief).toContain('#b5651d');
    expect(brief).not.toContain('not-a-colour');
    expect(brief).toContain('band-2-2');
  });

  it('rejects bad requests and reports refusals and malformed answers', async () => {
    const { client } = fakeClient({ designs: [] });
    await expect(designPins(client, { ...body, headline: '' })).rejects.toMatchObject({ status: 400 });
    await expect(designPins(client, { ...body, fonts: [] })).rejects.toMatchObject({ status: 400 });
    await expect(designPins(fakeClient({}, 'refusal').client, body)).rejects.toMatchObject({ status: 422 });
    await expect(designPins(fakeClient({ designs: [{ name: 'x' }] }).client, body)).rejects.toMatchObject({ status: 502 });
  });
});
