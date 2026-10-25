import { describe, expect, it, vi } from 'vitest';
import { MAX_BODY, handleAi, loginRequired } from '../../server/aiRoutes.mjs';
import { RESEARCH_BUDGET, fitScreenshots } from '../services/pinResearch';

const TEXT = { headlines: ['A'], subtitles: ['B'], ctas: ['C'], variations: ['D'] };
const fakeClient = () => ({ beta: { messages: { create: vi.fn(async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(TEXT) }] })) } } });
const ONLINE = { VERCEL: '1', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon' };
const reply = (ok: boolean, body: unknown = {}, status = ok ? 200 : 400) => ({ ok, status, json: async () => body });

describe('AI routes online (Vercel)', () => {
  it('require login on Vercel, not on your own computer', () => {
    expect(loginRequired({ VERCEL: '1' })).toBe(true);
    expect(loginRequired({})).toBe(false);
    expect(loginRequired({ AI_REQUIRE_LOGIN: 'true' })).toBe(true);
    expect(loginRequired({ VERCEL: '1', AI_REQUIRE_LOGIN: 'false' })).toBe(false);
  });

  it('turn away callers who are not signed in, without calling Claude', async () => {
    const client = fakeClient();
    const out = await handleAi('ai', { articleTitle: 'Lob Haircuts' }, undefined, { client, env: ONLINE, fetch: vi.fn() });
    expect(out.status).toBe(401);
    expect(client.beta.messages.create).not.toHaveBeenCalled();
    const expired = await handleAi('ai', { articleTitle: 'x' }, 'Bearer old', { client, env: ONLINE, fetch: vi.fn(async () => reply(false, {}, 401)) });
    expect(expired.status).toBe(401);
  });

  it('check the session, record the call, then answer', async () => {
    const client = fakeClient();
    const http = vi.fn(async (url: string) => (url.includes('/auth/v1/user') ? reply(true, { id: 'u1' }) : reply(true, 1)));
    const out = await handleAi('ai', { articleTitle: 'Lob Haircuts' }, 'Bearer tok', { client, env: ONLINE, fetch: http });
    expect(out).toEqual({ status: 200, body: TEXT });
    const [, rpc] = http.mock.calls as unknown as [string, { headers: Record<string, string>; body: string }][];
    expect(rpc[0]).toBe('https://x.supabase.co/rest/v1/rpc/record_ai_use');
    expect(rpc[1].headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(rpc[1].body)).toEqual({ kind: 'ai' });
  });

  it("stop at the plan's daily limit", async () => {
    const client = fakeClient();
    const http = vi.fn(async (url: string) => (url.includes('/auth/v1/user') ? reply(true) : reply(false, { message: 'ai_limit: 10 of 10 AI requests used today' })));
    const out = await handleAi('ai-design', {}, 'Bearer tok', { client, env: ONLINE, fetch: http });
    expect(out.status).toBe(429);
    expect(String(out.body.error)).toMatch(/today/);
    expect(client.beta.messages.create).not.toHaveBeenCalled();
  });

  it('say clearly when accounts are not set up, and hide AI service details', async () => {
    expect((await handleAi('ai', {}, 'Bearer t', { client: fakeClient(), env: { VERCEL: '1' }, fetch: vi.fn() })).status).toBe(503);
    const broken = { beta: { messages: { create: vi.fn(async () => { throw Object.assign(new Error('overloaded secret detail'), { status: 529, headers: {} }); }) } } };
    const out = await handleAi('ai', { articleTitle: 'x' }, undefined, { client: broken, env: {}, onError: () => {} });
    expect(out).toEqual({ status: 502, body: { error: 'AI service error' } });
    expect((await handleAi('nope', {}, undefined, { env: {} })).status).toBe(404);
  });

  it('keep research requests under the 4.5 MB hosting limit', async () => {
    expect(MAX_BODY['pin-research']).toBeLessThan(4.5 * 1024 * 1024);
    const big = Array.from({ length: 12 }, () => ({ mediaType: 'image/jpeg', data: 'A'.repeat(900_000) }));
    // A stand-in encoder: the output shrinks with the area (k²), like a real JPEG.
    const shrink = vi.fn(async (data: string, k: number) => 'A'.repeat(Math.floor(data.length * k * k)));
    const out = await fitScreenshots(big, RESEARCH_BUDGET, shrink);
    const total = out.reduce((n, im) => n + im.data.length, 0);
    expect(total).toBeLessThanOrEqual(RESEARCH_BUDGET);
    expect(JSON.stringify({ keyword: 'x', images: out }).length).toBeLessThan(MAX_BODY['pin-research']);
    // Small screenshots go as they are.
    const small = [{ mediaType: 'image/jpeg', data: 'A'.repeat(1000) }];
    expect(await fitScreenshots(small, RESEARCH_BUDGET, shrink)).toEqual(small);
  });
});
