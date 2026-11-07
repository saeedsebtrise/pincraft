/**
 * Autopilot control panel API: /api/autopilot/<op>.
 *
 * The browser never holds the Sheet secret or the GitHub token. It sends the
 * owner's admin key; this server checks it and forwards a small, validated
 * request to the Google Sheet web app (which also starts GitHub runs with the
 * token kept in its Script Properties).
 *
 *   status      GET   → { configured, missing }              (no key needed)
 *   overview    POST  → queue rows, settings, next slot
 *   add         POST  { urls: string[], boardId? }
 *   settings    POST  { enabled?: boolean, dailyLimit?: 1-10 }
 *   row         POST  { row: number, status: 'Retry' | 'Skip' | 'Pending' }
 *   preview     POST  { articleUrl }
 *   publish     POST  → start a publish run now (the Sheet still applies the limit and interval)
 *   runs        POST  → the last ten worker runs
 *
 * Environment: AUTOPILOT_SHEET_URL, AUTOPILOT_SHEET_SECRET (same as the worker's), AUTOPILOT_ADMIN_KEY (16+ characters).
 */
import { createHash, timingSafeEqual } from 'node:crypto';

export const MAX_CONTROL_BODY = 64 * 1024;
const URL_RE = /^https?:\/\/[^/?#@\s]+(?:[/?#][^\s]*)?$/i;

export function controlConfig(env = process.env) {
  const missing = [];
  let sheetUrl = null;
  try {
    const u = new URL(env.AUTOPILOT_SHEET_URL || '');
    if (u.origin === 'https://script.google.com' && !u.username && !u.password && !u.search && !u.hash && /^\/macros\/s\/[\w-]+\/exec$/.test(u.pathname)) sheetUrl = u.toString();
  } catch {
    /* reported below */
  }
  if (!sheetUrl) missing.push('AUTOPILOT_SHEET_URL');
  if ((env.AUTOPILOT_SHEET_SECRET || '').length < 32) missing.push('AUTOPILOT_SHEET_SECRET');
  if ((env.AUTOPILOT_ADMIN_KEY || '').length < 16) missing.push('AUTOPILOT_ADMIN_KEY');
  return { sheetUrl, missing };
}

const digest = (v) => createHash('sha256').update(String(v)).digest();
/** Constant-time check of the admin key from the x-autopilot-key header. */
export function keyMatches(given, expected) {
  if (!given || !expected) return false;
  return timingSafeEqual(digest(given), digest(expected));
}

/** Builds the Sheet request for an op, or an error message when the input is not acceptable. */
export function sheetRequest(op, body = {}) {
  switch (op) {
    case 'overview':
      return { action: 'overview' };
    case 'runs':
      return { action: 'runs' };
    case 'publish':
      return { action: 'dispatch', mode: 'publish' };
    case 'preview': {
      const url = String(body.articleUrl ?? '').trim();
      if (!URL_RE.test(url) || url.length > 2000) return { error: 'Enter a public article URL (https://…).' };
      return { action: 'dispatch', mode: 'preview', articleUrl: url };
    }
    case 'add': {
      const urls = (Array.isArray(body.urls) ? body.urls : []).map((u) => String(u).trim()).filter(Boolean);
      if (!urls.length) return { error: 'Paste at least one article link.' };
      if (urls.length > 200) return { error: 'Add up to 200 links at a time.' };
      const boardId = String(body.boardId ?? '').trim();
      if (boardId && !/^\d{1,40}$/.test(boardId)) return { error: 'Board ID must be digits only.' };
      return { action: 'add', urls: urls.map((u) => u.slice(0, 4096)), boardId };
    }
    case 'settings': {
      const out = { action: 'settings' };
      if (typeof body.enabled === 'boolean') out.enabled = body.enabled;
      if (body.dailyLimit !== undefined) {
        const n = Number(body.dailyLimit);
        if (!Number.isInteger(n) || n < 1 || n > 10) return { error: 'Daily limit must be between 1 and 10.' };
        out.dailyLimit = n;
      }
      return out;
    }
    case 'row': {
      const row = Number(body.row);
      if (!Number.isInteger(row) || row < 2) return { error: 'Unknown row.' };
      if (!['Retry', 'Skip', 'Pending'].includes(body.status)) return { error: 'Unknown status.' };
      return { action: 'setStatus', row, status: body.status };
    }
    default:
      return null;
  }
}

/** Handles one control-panel request; returns { status, body }. */
export async function handleAutopilotControl(op, req, body = {}, { env = process.env, fetch: fetcher = fetch } = {}) {
  const { sheetUrl, missing } = controlConfig(env);
  if (op === 'status') return { status: 200, body: { configured: !missing.length, missing } };
  if (req.method !== 'POST') return { status: 405, body: { error: 'Use POST.' } };
  if (missing.length) return { status: 503, body: { error: 'Autopilot control is not set up on this server yet.', missing } };
  if (!keyMatches(req.headers['x-autopilot-key'], env.AUTOPILOT_ADMIN_KEY)) return { status: 401, body: { error: 'Wrong admin key.' } };
  const request = sheetRequest(op, body);
  if (!request) return { status: 404, body: { error: 'Not found' } };
  if (request.error) return { status: 400, body: { error: request.error } };
  let result;
  try {
    const res = await fetcher(sheetUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(45000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, secret: env.AUTOPILOT_SHEET_SECRET }),
    });
    if (!res.ok) return { status: 502, body: { error: `The Google Sheet did not answer (${res.status}).` } };
    result = await res.json();
  } catch {
    return { status: 502, body: { error: 'The Google Sheet could not be reached. Check AUTOPILOT_SHEET_URL and its deployment.' } };
  }
  if (!result || result.ok !== true) {
    // The Sheet's own messages never include secrets; anything else stays generic.
    const msg = typeof result?.error === 'string' && result.error.length < 200 ? result.error : 'The Sheet refused the request. Make sure the latest Apps Script is deployed and the secret matches.';
    return { status: 502, body: { error: msg } };
  }
  const { ok: _ok, ...data } = result;
  return { status: 200, body: data };
}
