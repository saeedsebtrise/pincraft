// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { controlConfig, handleAutopilotControl, keyMatches, sheetRequest } from '../../server/autopilotControl.mjs';
import { parseArticleLinks } from '../services/autopilotControl';

const ENV = {
  AUTOPILOT_SHEET_URL: 'https://script.google.com/macros/s/deploy-id/exec',
  AUTOPILOT_SHEET_SECRET: 's'.repeat(32),
  AUTOPILOT_ADMIN_KEY: 'k'.repeat(20),
};
const req = (key = ENV.AUTOPILOT_ADMIN_KEY, method = 'POST') => ({ method, headers: { 'x-autopilot-key': key } });
// The mock records (url, init) so tests can check what reached the Sheet.
const sheetReply = (body: unknown, ok = true, status = 200) => vi.fn(async (url: string, init?: Record<string, unknown>) => ({ ok, status, url, init, json: async () => body }));

describe('Autopilot control panel (server)', () => {
  it('reports what is missing without needing the key', async () => {
    expect((await handleAutopilotControl('status', req(''), {}, { env: {} })).body).toEqual({ configured: false, missing: ['AUTOPILOT_SHEET_URL', 'AUTOPILOT_SHEET_SECRET', 'AUTOPILOT_ADMIN_KEY'] });
    expect((await handleAutopilotControl('status', req(''), {}, { env: ENV })).body).toEqual({ configured: true, missing: [] });
    expect(controlConfig({ ...ENV, AUTOPILOT_SHEET_URL: 'https://evil.example/macros/s/x/exec' }).missing).toContain('AUTOPILOT_SHEET_URL');
    expect(controlConfig({ ...ENV, AUTOPILOT_ADMIN_KEY: 'short' }).missing).toContain('AUTOPILOT_ADMIN_KEY');
  });

  it('refuses a wrong or missing admin key and never calls the Sheet', async () => {
    const fetch = sheetReply({ ok: true });
    expect((await handleAutopilotControl('overview', req('nope'), {}, { env: ENV, fetch })).status).toBe(401);
    expect((await handleAutopilotControl('overview', req(''), {}, { env: ENV, fetch })).status).toBe(401);
    expect((await handleAutopilotControl('overview', req(ENV.AUTOPILOT_ADMIN_KEY, 'GET'), {}, { env: ENV, fetch })).status).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
    expect(keyMatches('abc', 'abc')).toBe(true);
    expect(keyMatches('abc', 'abd')).toBe(false);
  });

  it('forwards a validated request with the Sheet secret and returns its data', async () => {
    const fetch = sheetReply({ ok: true, added: 2, skipped: 1 });
    const out = await handleAutopilotControl('add', req(), { urls: ['https://a.com/1', 'https://a.com/2', ' '], boardId: '123' }, { env: ENV, fetch });
    expect(out).toEqual({ status: 200, body: { added: 2, skipped: 1 } });
    const [url, init] = fetch.mock.calls[0] as [string, { body: string }];
    expect(url).toBe(ENV.AUTOPILOT_SHEET_URL);
    expect(JSON.parse(init.body)).toEqual({ action: 'add', urls: ['https://a.com/1', 'https://a.com/2'], boardId: '123', pinsPerArticle: 1, secret: ENV.AUTOPILOT_SHEET_SECRET });
  });

  it('validates every op before contacting the Sheet', () => {
    expect(sheetRequest('preview', { articleUrl: 'javascript:alert(1)' })).toHaveProperty('error');
    expect(sheetRequest('preview', { articleUrl: 'https://a.com/x' })).toEqual({ action: 'dispatch', mode: 'preview', articleUrl: 'https://a.com/x', pins: 1 });
    expect(sheetRequest('preview', { articleUrl: 'https://a.com/x', pins: 3 })).toMatchObject({ pins: 3 });
    expect(sheetRequest('preview', { articleUrl: 'https://a.com/x', pins: 9 })).toHaveProperty('error');
    expect(sheetRequest('add', { urls: ['https://a.com/1'], pinsPerArticle: 4 })).toMatchObject({ pinsPerArticle: 4 });
    expect(sheetRequest('add', { urls: ['https://a.com/1'], pinsPerArticle: 0 })).toHaveProperty('error');
    expect(sheetRequest('publish')).toEqual({ action: 'dispatch', mode: 'publish' });
    expect(sheetRequest('settings', { dailyLimit: 11 })).toHaveProperty('error');
    expect(sheetRequest('settings', { enabled: true, dailyLimit: 3 })).toEqual({ action: 'settings', enabled: true, dailyLimit: 3 });
    expect(sheetRequest('row', { row: 5, status: 'Posted' })).toHaveProperty('error');
    expect(sheetRequest('row', { row: 5, status: 'Retry' })).toEqual({ action: 'setStatus', row: 5, status: 'Retry' });
    expect(sheetRequest('add', { urls: Array(201).fill('https://a.com') })).toHaveProperty('error');
    expect(sheetRequest('add', { urls: ['https://a.com'], boardId: 'x1' })).toHaveProperty('error');
    expect(sheetRequest('delete-everything')).toBeNull();
  });

  it('turns Sheet refusals and outages into clear errors without leaking the secret', async () => {
    const refused = await handleAutopilotControl('settings', req(), { enabled: true }, { env: ENV, fetch: sheetReply({ ok: false }) });
    expect(refused.status).toBe(502);
    expect(JSON.stringify(refused.body)).not.toContain(ENV.AUTOPILOT_SHEET_SECRET);
    const explained = await handleAutopilotControl('publish', req(), {}, { env: ENV, fetch: sheetReply({ ok: false, error: 'Set GITHUB_REPO in Script Properties.' }) });
    expect(explained.body.error).toBe('Set GITHUB_REPO in Script Properties.');
    const down = await handleAutopilotControl('overview', req(), {}, { env: ENV, fetch: vi.fn(async () => { throw new Error('ECONNRESET'); }) });
    expect(down.status).toBe(502);
  });

  it('pulls article links out of pasted text', () => {
    expect(parseArticleLinks('https://a.com/1\nhttps://a.com/2, https://a.com/1  not-a-link')).toEqual(['https://a.com/1', 'https://a.com/2']);
  });
});
