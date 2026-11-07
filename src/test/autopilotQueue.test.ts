// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error Node-only worker modules are not part of the browser TypeScript build.
import { boardsSchema, generateCopy, runJob, validateCopy, validatePinResponse, validateWebhook } from '../../autopilot/core.mjs';

const boards = [{ id: '123456789012345678', name: 'Home ideas' }];
const copy = { keyword: 'cozy rooms', title: '12 Cozy Room Ideas', description: 'Discover the rooms from this article.', alt_text: 'Room photos with the title 12 Cozy Room Ideas.', cta: 'See the ideas', board_id: boards[0].id };
const claim = { id: 'job-1', lease: 'lease-1', articleUrl: 'https://example.com/rooms', boardId: '' };
const secret = 'test-only-shared-secret-32-characters';
const now = Date.UTC(2026, 10, 7, 12);
const headers = ['Article URL', 'Board ID', 'Status', 'Pin URL', 'Error', 'Job ID', 'Lease', 'Updated At'];
type Row = (string | number)[];
function row(status = 'Pending', url = claim.articleUrl): Row { return [url, '', status, '', '', '', '', '']; }

/** Runs the actual deployable Apps Script with in-memory Google service adapters. */
function sheetHarness(initialRows: Row[] = [row()], initialProps: Record<string, string> = {}) {
  const values: Row[] = [headers.slice(), ...initialRows.map(r => [...r])];
  const properties: Record<string, string> = { SHEET_ID: 'sheet', SHARED_SECRET: secret, ENABLED: 'true', ...initialProps };
  let sequence = 0;
  const lock = { tryLock: vi.fn(() => true), releaseLock: vi.fn() };
  const range = (at: number, col: number, rows = 1, cols = 1) => ({
    getValues: () => values.slice(at - 1, at - 1 + rows).map(r => r.slice(col - 1, col - 1 + cols)),
    setValues: (data: Row[]) => { data.forEach((r, i) => r.forEach((v, j) => { values[at - 1 + i][col - 1 + j] = v; })); },
    setValue: (value: string) => { values[at - 1][col - 1] = value; },
    setNumberFormat: vi.fn(),
  });
  const sheet = {
    getLastRow: () => values.length,
    getRange: range,
    appendRow: (r: Row) => values.push(r),
    setFrozenRows: vi.fn(),
  };
  const props = {
    getProperty: (key: string) => properties[key] ?? null,
    setProperty: (key: string, value: string) => { properties[key] = value; },
  };
  const dispatch = vi.fn(() => ({ getResponseCode: () => 204 }));
  class FixedDate extends Date { constructor(...args: [] | [string | number]) { super(args.length ? args[0] : now); } static now() { return now; } }
  const context = createContext({
    Date: FixedDate,
    PropertiesService: { getScriptProperties: () => props },
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush: vi.fn() },
    LockService: { getScriptLock: () => lock },
    Utilities: { getUuid: () => `uuid-${++sequence}` },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (text: string) => ({ setMimeType: () => text }) },
    UrlFetchApp: { fetch: dispatch },
  });
  runInContext(readFileSync(resolve('autopilot/google-sheet-script.gs'), 'utf8'), context);
  return {
    values, properties, lock, dispatch,
    post: (action: string, fields: Record<string, unknown> = {}) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify({ action, secret, ...fields }) } })),
    tick: () => context.tick(),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('Autopilot input and AI boundaries', () => {
  it('requires distinct configured boards and limits copy to the requested board', () => {
    expect(boardsSchema.parse(boards)).toEqual(boards);
    expect(() => boardsSchema.parse([...boards, ...boards])).toThrow();
    expect(() => boardsSchema.parse([{ id: 123, name: 'Bad numeric ID' }])).toThrow();
    expect(validateCopy(copy, boards)).toEqual(copy);
    expect(() => validateCopy({ ...copy, board_id: '999' }, boards)).toThrow();
    expect(() => validateCopy(copy, boards, '999')).toThrow();
    expect(() => validateCopy({ ...copy, title: 'a'.repeat(101) }, boards)).toThrow();
  });

  it('keeps large Pin IDs exact and rejects accepted-but-not-completed Make responses', () => {
    expect(validatePinResponse({ id: '1234567890123456789' }).pinUrl).toBe('https://www.pinterest.com/pin/1234567890123456789/');
    for (const id of [Number('1234567890123456789'), 'Accepted', '../bad', '', null]) expect(() => validatePinResponse({ id })).toThrow();
    expect(() => validatePinResponse({ status: 'accepted' })).toThrow();
  });

  it('only permits exact HTTPS Make webhook hosts and routes', () => {
    expect(validateWebhook('https://hook.make.com/demo_hook')).toBe('https://hook.make.com/demo_hook');
    expect(validateWebhook('https://hook.eu2.make.com/demo')).toBe('https://hook.eu2.make.com/demo');
    for (const url of ['http://hook.eu2.make.com/demo', 'https://hook.eu2.make.com.evil.test/demo', 'https://user:pass@hook.make.com/demo', 'https://hook.make.com:444/demo', 'https://hook.make.com/', 'https://hook.make.com/demo?token=x', 'https://hook.make.com/demo#fragment']) expect(() => validateWebhook(url)).toThrow();
  });

  it('validates Gemini JSON and sends article text as untrusted data without photos or credentials in the body', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ thought: true, text: 'hidden thought' }, { text: JSON.stringify(copy) }] } }] }) }));
    vi.stubGlobal('fetch', fetcher);
    const result = await generateCopy({ title: copy.title, text: 'Article content', images: [{ alt: 'Room', url: 'https://example.com/photo.jpg' }] }, boards, '', { GEMINI_API_KEY: 'test-secret', GEMINI_MODEL: 'test-model' });
    expect(result).toEqual(copy);
    const options = fetcher.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: string }];
    expect(options[1].headers['x-goog-api-key']).toBe('test-secret');
    expect(options[1].body).not.toContain('test-secret');
    expect(options[1].body).not.toContain('photo.jpg');
    expect(options[1].body).toContain('untrusted data');
    await expect(generateCopy({}, boards, '999', { GEMINI_API_KEY: 'test-secret', GEMINI_MODEL: 'test-model' })).rejects.toThrow('not configured');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('Autopilot publishing state machine', () => {
  function worker(failAt = '') {
    const sheet = vi.fn(async (action: string) => {
      if (action === failAt) throw new Error(`failed-${action}`);
      return action === 'claim' ? { job: claim } : { ok: true };
    });
    const prepare = vi.fn(async () => ({ ...copy, image_base64: 'image' }));
    const publish = vi.fn(async () => ({ id: '1234567890123456789' }));
    return { sheet, prepare, publish };
  }

  it('does no work for an empty queue', async () => {
    const dependencies = worker();
    dependencies.sheet.mockResolvedValueOnce({ job: null } as never);
    expect(await runJob(dependencies)).toEqual({ status: 'idle' });
    expect(dependencies.prepare).not.toHaveBeenCalled();
    expect(dependencies.publish).not.toHaveBeenCalled();
  });

  it('records publishing intent before one publish and completes with the verified Pin URL', async () => {
    const dependencies = worker();
    expect(await runJob(dependencies)).toEqual({ status: 'posted' });
    expect(dependencies.sheet.mock.calls.map(args => args[0])).toEqual(['claim', 'publishing', 'complete']);
    expect(dependencies.publish).toHaveBeenCalledTimes(1);
    expect(dependencies.publish).toHaveBeenCalledWith(expect.objectContaining({ job_id: claim.id }));
    expect(dependencies.sheet).toHaveBeenLastCalledWith('complete', { id: claim.id, lease: claim.lease, pinUrl: 'https://www.pinterest.com/pin/1234567890123456789/' });
  });

  it('never publishes when preparation or publishing authorization fails', async () => {
    for (const failure of ['prepare', 'publishing']) {
      const dependencies = worker(failure);
      if (failure === 'prepare') dependencies.prepare.mockRejectedValueOnce(new Error('prepare failed'));
      await expect(runJob(dependencies)).rejects.toThrow();
      expect(dependencies.publish).not.toHaveBeenCalled();
      expect(dependencies.sheet).toHaveBeenLastCalledWith('fail', expect.objectContaining({ uncertain: false }));
    }
  });

  it('rejects a payload above Make’s byte limit before consuming a publishing attempt', async () => {
    const dependencies = worker();
    dependencies.prepare.mockResolvedValueOnce({ ...copy, image_base64: 'a'.repeat(5 * 1024 * 1024) });
    await expect(runJob(dependencies)).rejects.toThrow('webhook limit');
    expect(dependencies.publish).not.toHaveBeenCalled();
    expect(dependencies.sheet.mock.calls.map(args => args[0])).toEqual(['claim', 'fail']);
  });

  it('requires review for an ambiguous publish, invalid response, or failed completion without republishing', async () => {
    for (const failure of ['publish', 'response', 'complete']) {
      const dependencies = worker(failure);
      if (failure === 'publish') dependencies.publish.mockRejectedValueOnce(new Error('network timeout'));
      if (failure === 'response') dependencies.publish.mockResolvedValueOnce({ id: '' });
      await expect(runJob(dependencies)).rejects.toThrow();
      expect(dependencies.publish).toHaveBeenCalledTimes(1);
      expect(dependencies.sheet).toHaveBeenLastCalledWith('fail', expect.objectContaining({ uncertain: true }));
    }
  });

  it('retains the original failure if recording failure also fails', async () => {
    const dependencies = worker('fail');
    dependencies.publish.mockRejectedValueOnce(new Error('original timeout'));
    await expect(runJob(dependencies)).rejects.toThrow('original timeout');
    expect(dependencies.publish).toHaveBeenCalledTimes(1);
  });

  it('rejects private article URLs before invoking preparation', async () => {
    const dependencies = worker();
    dependencies.sheet.mockResolvedValueOnce({ job: { ...claim, articleUrl: 'http://127.0.0.1/private' } } as never);
    await expect(runJob(dependencies)).rejects.toThrow('not allowed');
    expect(dependencies.prepare).not.toHaveBeenCalled();
    expect(dependencies.publish).not.toHaveBeenCalled();
  });
});

describe('Google Sheets queue, leases and quotas', () => {
  it('authenticates before acquiring the lock, and fails closed if the lock is busy', () => {
    const queue = sheetHarness();
    expect(queue.post('claim', { secret: 'wrong' })).toEqual({ ok: false });
    expect(queue.lock.tryLock).not.toHaveBeenCalled();
    queue.lock.tryLock.mockReturnValue(false);
    expect(queue.post('claim')).toEqual({ ok: false });
    expect(queue.values[1][2]).toBe('Pending');
    expect(queue.lock.releaseLock).not.toHaveBeenCalled();
  });

  it('claims only one row, rejects another worker, and requires the exact active lease', () => {
    const queue = sheetHarness([row(), row('Pending', 'https://example.com/other')]);
    const job = queue.post('claim').job;
    expect(job.articleUrl).toBe(claim.articleUrl);
    expect(queue.values[1][2]).toBe('Processing');
    expect(queue.post('claim').job).toBeNull();
    expect(queue.post('publishing', { id: job.id, lease: 'wrong' })).toEqual({ ok: false });
    expect(queue.post('publishing', job)).toEqual({ ok: true });
    expect(queue.values[1][2]).toBe('Publishing');
    expect(JSON.parse(queue.properties.ATTEMPTS)).toEqual([now]);
    expect(queue.post('publishing', job)).toEqual({ ok: false });
    expect(queue.post('complete', { ...job, pinUrl: 'https://www.pinterest.com/pin/123/' })).toEqual({ ok: true });
    expect(queue.values[1][2]).toBe('Posted');
    expect(queue.post('claim').job).toBeNull(); // interval still applies
  });

  it('counts uncertain outcomes against quotas and pauses the entire queue', () => {
    const queue = sheetHarness([row(), row('Pending', 'https://example.com/next')]);
    const job = queue.post('claim').job;
    queue.post('publishing', job);
    queue.post('fail', { ...job, uncertain: false }); // Sheet's Publishing state wins.
    expect(queue.values[1][2]).toBe('Needs review');
    expect(JSON.parse(queue.properties.ATTEMPTS)).toHaveLength(1);
    expect(queue.post('claim').job).toBeNull();
  });

  it('does not consume a publish attempt for a preparation failure', () => {
    const queue = sheetHarness();
    const job = queue.post('claim').job;
    queue.post('fail', { ...job, uncertain: false });
    expect(queue.values[1][2]).toBe('Error');
    expect(queue.properties.ATTEMPTS).toBeUndefined();
    queue.values[1][2] = 'Retry';
    const retried = queue.post('claim').job;
    expect(retried.id).toBe(job.id);
    expect(retried.lease).not.toBe(job.lease);
    expect(queue.post('publishing', job)).toEqual({ ok: false });
  });

  it('rechecks the enable switch immediately before authorizing publishing', () => {
    const queue = sheetHarness();
    const job = queue.post('claim').job;
    queue.properties.ENABLED = 'false';
    expect(queue.post('publishing', job)).toEqual({ ok: false });
    expect(queue.properties.ATTEMPTS).toBeUndefined();
  });

  it('enforces the rolling daily cap, gap, and settings bounds', () => {
    for (const properties of [
      { ENABLED: 'false' },
      { ATTEMPTS: JSON.stringify([now - 119 * 60000]) },
      { DAILY_LIMIT: '2', ATTEMPTS: JSON.stringify([now - 4 * 3600000, now - 3 * 3600000]) },
    ] as Record<string, string>[]) expect(sheetHarness([row()], properties).post('claim').job).toBeNull();
    for (const properties of [{ DAILY_LIMIT: '11' }, { INTERVAL_MINUTES: '119' }, { ATTEMPTS: '["not-a-time"]' }] as Record<string, string>[]) expect(sheetHarness([row()], properties).post('claim')).toEqual({ ok: false });
    const expired = sheetHarness([row()], { DAILY_LIMIT: '1', ATTEMPTS: JSON.stringify([now - 86400000]) });
    expect(expired.post('claim').job).toBeTruthy();
    const longInterval = sheetHarness([row()], { INTERVAL_MINUTES: '2880', ATTEMPTS: JSON.stringify([now - 25 * 3600000]) });
    expect(longInterval.post('claim').job).toBeNull();
  });

  it('skips equivalent already-posted URLs while preserving case-sensitive paths and queries', () => {
    const queue = sheetHarness([row('Posted', 'https://EXAMPLE.com:443/rooms/#intro'), row()]);
    expect(queue.post('claim').job).toBeNull();
    expect(queue.values[2][2]).toBe('Skip');
    const other = sheetHarness([row('Posted', claim.articleUrl), row('Pending', `${claim.articleUrl}?page=2`)]);
    expect(other.post('claim').job).toBeTruthy();
  });

  it('isolates malformed rows instead of repeatedly blocking following queue entries', () => {
    for (const invalid of [row('Pending', 'not a URL'), [claim.articleUrl, Number('1234567890123456789'), 'Pending', '', '', '', '', '']]) {
      const queue = sheetHarness([invalid, row('Pending', 'https://example.com/valid')]);
      expect(queue.post('claim').job).toBeNull();
      expect(queue.values[1][2]).toBe('Error');
      expect(queue.post('claim').job.articleUrl).toBe('https://example.com/valid');
    }
  });

  it('never reuses a copied Job ID from another row', () => {
    const a = row('Posted'), b = row('Pending', 'https://example.com/new');
    a[5] = b[5] = 'copied-id';
    const queue = sheetHarness([a, b]);
    expect(queue.post('claim').job).toBeNull();
    expect(queue.values[2][2]).toBe('Error');
  });

  it('expires interrupted preparations to Error and interrupted publishing to Needs review, without retrying', () => {
    for (const status of ['Processing', 'Publishing']) {
      const interrupted = row(status);
      interrupted[5] = 'old-job'; interrupted[6] = 'old-lease'; interrupted[7] = new Date(now - 20 * 60000).toISOString();
      const queue = sheetHarness([interrupted]);
      expect(queue.post('claim').job).toBeNull();
      expect(queue.values[1][2]).toBe(status === 'Processing' ? 'Error' : 'Needs review');
      expect(queue.post('publishing', { id: 'old-job', lease: 'old-lease' })).toEqual({ ok: false });
    }
  });

  it('dispatches at most once per timer window and never dispatches a paused queue', () => {
    const config = { GITHUB_REPO: 'owner/repository', GITHUB_TOKEN: 'test-token', GITHUB_REF: 'main' };
    const queue = sheetHarness([row()], config);
    queue.tick(); queue.tick();
    expect(queue.dispatch).toHaveBeenCalledTimes(1);
    expect(queue.properties.LAST_DISPATCH).toBe(String(now));
    const paused = sheetHarness([row('Needs review'), row('Pending', 'https://example.com/next')], config);
    paused.tick();
    expect(paused.dispatch).not.toHaveBeenCalled();
  });
});
