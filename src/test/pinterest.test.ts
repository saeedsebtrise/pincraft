import { describe, expect, it, vi } from 'vitest';
import { handlePinterest, readCookies, seal, unseal } from '../../server/pinterest.mjs';

const ENV = { PINTEREST_APP_ID: 'app1', PINTEREST_APP_SECRET: 'secret', PINTEREST_TOKEN_SECRET: 'token-key' };
const req = (url: string, cookie = '', method = 'GET') => ({ method, url, headers: { host: 'pincraft.app', 'x-forwarded-proto': 'https', cookie } });
const reply = (status: number, body: unknown) => ({ ok: status < 400, status, json: async () => body });
const jarFrom = (cookies: string[]) => cookies.map((c) => c.split(';')[0]).join('; ');
const session = (extra = {}) => `pc_pinterest=${encodeURIComponent(seal({ access: 'AT', refresh: 'RT', expires: Date.now() + 86_400_000, ...extra }, ENV))}`;

describe('Pinterest connection (server)', () => {
  it('reports when the server has no Pinterest app yet', async () => {
    expect((await handlePinterest('status', req('/api/pinterest/status'), {}, { env: {} })).body).toEqual({ configured: false, connected: false });
    expect((await handlePinterest('boards', req('/api/pinterest/boards'), {}, { env: {} })).status).toBe(503);
  });

  it('keeps tokens in an encrypted cookie that only the server can read', () => {
    const t = seal({ access: 'secret-token' }, ENV);
    expect(t).not.toContain('secret-token');
    expect(unseal(t, ENV)).toEqual({ access: 'secret-token' });
    expect(unseal(t, { PINTEREST_TOKEN_SECRET: 'other' })).toBeNull();
    expect(readCookies('a=1; b=x%20y')).toEqual({ a: '1', b: 'x y' });
  });

  it('sends the user to Pinterest with the right scopes and a state cookie', async () => {
    const out = await handlePinterest('connect', req('/api/pinterest/connect'), {}, { env: ENV });
    expect(out.status).toBe(302);
    const u = new URL(out.redirect!);
    expect(u.origin + u.pathname).toBe('https://www.pinterest.com/oauth/');
    expect(u.searchParams.get('redirect_uri')).toBe('https://pincraft.app/api/pinterest/callback');
    expect(u.searchParams.get('scope')).toContain('pins:write');
    const state = readCookies(jarFrom(out.cookies)).pc_pinterest_state;
    expect(state).toBe(u.searchParams.get('state'));
    expect(out.cookies[0]).toMatch(/HttpOnly/);
    expect(out.cookies[0]).toMatch(/Secure/);
  });

  it('refuses a callback whose state does not match (CSRF)', async () => {
    const http = vi.fn();
    const out = await handlePinterest('callback', req('/api/pinterest/callback?code=c&state=evil', 'pc_pinterest_state=good'), {}, { env: ENV, fetch: http });
    expect(out.redirect).toMatch(/pinterest=failed/);
    expect(http).not.toHaveBeenCalled();
  });

  it('exchanges the code for tokens and stores them sealed', async () => {
    const http = vi.fn(async (_u: string, _i?: Record<string, unknown>) => reply(200, { access_token: 'AT1', refresh_token: 'RT1', expires_in: 2592000 }));
    const out = await handlePinterest('callback', req('/api/pinterest/callback?code=abc&state=s1', 'pc_pinterest_state=s1'), {}, { env: ENV, fetch: http });
    expect(out.redirect).toMatch(/#\/settings\?tab=pinterest&pinterest=connected/);
    const [, init] = http.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('app1:secret').toString('base64')}`);
    expect(init.body).toContain('grant_type=authorization_code');
    const stored = unseal(readCookies(jarFrom(out.cookies)).pc_pinterest, ENV);
    expect(stored).toMatchObject({ access: 'AT1', refresh: 'RT1' });
  });

  it('lists boards and publishes a Pin with the token', async () => {
    const calls: [string, Record<string, unknown> | undefined][] = [];
    const http = vi.fn(async (u: string, i?: Record<string, unknown>) => {
      calls.push([u, i]);
      if (u.includes('/boards')) return reply(200, { items: [{ id: 'b1', name: 'Hair', privacy: 'PUBLIC', pin_count: 4 }], bookmark: null });
      return reply(200, { id: 'p9' });
    });
    const boards = await handlePinterest('boards', req('/api/pinterest/boards', session()), {}, { env: ENV, fetch: http });
    expect(boards.body.boards).toEqual([{ id: 'b1', name: 'Hair', description: '', privacy: 'PUBLIC', pinCount: 4, cover: null }]);
    const pin = await handlePinterest(
      'pins',
      req('/api/pinterest/pins', session(), 'POST'),
      { boardId: 'b1', title: 'Lob Ideas', description: 'd', link: 'https://blog.com/lob', altText: 'a', image: { mediaType: 'image/jpeg', data: 'A'.repeat(200) } },
      { env: ENV, fetch: http },
    );
    expect(pin.body.pin.url).toBe('https://www.pinterest.com/pin/p9/');
    const [, init] = calls[calls.length - 1] as [string, { headers: Record<string, string>; body: string }];
    expect(init.headers.Authorization).toBe('Bearer AT');
    expect(JSON.parse(init.body)).toMatchObject({ board_id: 'b1', link: 'https://blog.com/lob', media_source: { source_type: 'image_base64', content_type: 'image/jpeg' } });
  });

  it('checks Pin input before calling Pinterest', async () => {
    const http = vi.fn();
    const go = (b: Record<string, unknown>) => handlePinterest('pins', req('/api/pinterest/pins', session(), 'POST'), b, { env: ENV, fetch: http });
    expect((await go({ title: 'x', image: { mediaType: 'image/jpeg', data: 'A'.repeat(200) } })).status).toBe(400);
    expect((await go({ boardId: 'b', image: { mediaType: 'image/gif', data: 'A'.repeat(200) } })).status).toBe(400);
    expect((await go({ boardId: 'b', link: 'javascript:alert(1)', image: { mediaType: 'image/jpeg', data: 'A'.repeat(200) } })).status).toBe(400);
    expect(http).not.toHaveBeenCalled();
  });

  it('refreshes an expired token and saves the new one', async () => {
    const http = vi.fn(async (u: string) => (u.includes('/oauth/token') ? reply(200, { access_token: 'NEW', expires_in: 100 }) : reply(200, { username: 'saeed', account_type: 'BUSINESS' })));
    const out = await handlePinterest('status', req('/api/pinterest/status', session({ expires: Date.now() - 1000 })), {}, { env: ENV, fetch: http });
    expect(out.body).toMatchObject({ connected: true, account: { username: 'saeed' } });
    expect(unseal(readCookies(jarFrom(out.cookies)).pc_pinterest, ENV)).toMatchObject({ access: 'NEW', refresh: 'RT' });
  });

  it('clears a revoked connection', async () => {
    const http = vi.fn(async () => reply(401, { message: 'Authentication failed' }));
    const out = await handlePinterest('boards', req('/api/pinterest/boards', session()), {}, { env: ENV, fetch: http });
    expect(out.status).toBe(401);
    expect(out.cookies.some((c) => c.startsWith('pc_pinterest=;') && c.includes('Max-Age=0'))).toBe(true);
  });

  it('asks Pinterest for analytics and trends with safe parameters', async () => {
    const urls: string[] = [];
    const http = vi.fn(async (u: string) => {
      urls.push(u);
      return reply(
        200,
        u.includes('analytics')
          ? { all: { daily_metrics: [{ date: '2026-11-01', data_status: 'READY', metrics: { IMPRESSION: 5 } }], summary_metrics: { IMPRESSION: 5 } } }
          : { trends: [{ keyword: 'fall nails', pct_growth_wow: 12 }] },
      );
    });
    const a = await handlePinterest('analytics', req('/api/pinterest/analytics?days=7', session()), {}, { env: ENV, fetch: http });
    expect(a.body.daily[0]).toMatchObject({ IMPRESSION: 5, SAVE: 0 });
    const t = await handlePinterest('trends', req('/api/pinterest/trends?region=../../x&type=evil', session()), {}, { env: ENV, fetch: http });
    expect(t.body.trends[0]).toMatchObject({ keyword: 'fall nails', weekly: 12 });
    expect(urls[1]).toContain('/trends/keywords/US/top/growing');
  });
});
