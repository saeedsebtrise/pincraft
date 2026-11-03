/**
 * Pinterest connection (Pinterest API v5), shared by the local proxy and the
 * Vercel function (api/pinterest/[op].mjs).
 *
 *   GET  /api/pinterest/connect     → redirects to Pinterest to approve access
 *   GET  /api/pinterest/callback    → Pinterest sends the user back here
 *   GET  /api/pinterest/status      → { configured, connected, account }
 *   POST /api/pinterest/disconnect
 *   GET  /api/pinterest/boards      → the user's boards
 *   POST /api/pinterest/boards      → { name, description, privacy } creates a board
 *   POST /api/pinterest/pins        → { boardId, title, description, link, altText, image: { mediaType, data } }
 *   GET  /api/pinterest/analytics?days=30
 *   GET  /api/pinterest/trends?region=US&type=growing
 *
 * The Pinterest tokens never reach browser JavaScript: they live in an
 * encrypted, httpOnly cookie (AES-256-GCM with PINTEREST_TOKEN_SECRET) that
 * only these routes read. Needs PINTEREST_APP_ID, PINTEREST_APP_SECRET and
 * PINTEREST_TOKEN_SECRET on the server; PINTEREST_REDIRECT_URI is optional
 * (default: <this site>/api/pinterest/callback, which must be registered in
 * the Pinterest app).
 */
import crypto from 'node:crypto';

const API = 'https://api.pinterest.com/v5';
const AUTHORIZE = 'https://www.pinterest.com/oauth/';
const SCOPES = 'boards:read,boards:write,pins:read,pins:write,user_accounts:read';
const COOKIE = 'pc_pinterest';
const STATE_COOKIE = 'pc_pinterest_state';
export const MAX_PIN_BODY = 4.4 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

const fail = (status, message) => Object.assign(new Error(message), { status });

export function pinterestConfigured(env = process.env) {
  return !!(env.PINTEREST_APP_ID && env.PINTEREST_APP_SECRET && env.PINTEREST_TOKEN_SECRET);
}

// ---------------------------------------------------------------- encrypted cookie

const key = (env) => crypto.createHash('sha256').update(String(env.PINTEREST_TOKEN_SECRET)).digest();

export function seal(data, env = process.env) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(env), iv);
  const body = Buffer.concat([c.update(JSON.stringify(data), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64url');
}

export function unseal(token, env = process.env) {
  try {
    const raw = Buffer.from(String(token), 'base64url');
    const d = crypto.createDecipheriv('aes-256-gcm', key(env), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8'));
  } catch {
    return null;
  }
}

export function readCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const cookie = (name, value, { secure, maxAge }) =>
  `${name}=${encodeURIComponent(value)}; Path=/api/pinterest; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;

// ---------------------------------------------------------------- Pinterest calls

function origin(req, env) {
  if (env.PINTEREST_REDIRECT_URI) return new URL(env.PINTEREST_REDIRECT_URI).origin;
  const proto = String(req.headers['x-forwarded-proto'] || (req.headers.host?.startsWith('localhost') ? 'http' : 'https')).split(',')[0];
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
}
const redirectUri = (req, env) => env.PINTEREST_REDIRECT_URI || `${origin(req, env)}/api/pinterest/callback`;

async function tokenRequest(params, env, http) {
  const res = await http(`${API}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.PINTEREST_APP_ID}:${env.PINTEREST_APP_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw fail(502, data.message || 'Pinterest did not accept the sign-in. Try connecting again.');
  return {
    access: data.access_token,
    refresh: data.refresh_token ?? params.refresh_token,
    expires: Date.now() + (Number(data.expires_in) || 2_592_000) * 1000,
  };
}

/** One call to the Pinterest API with the session's token; refreshes it once when it has expired. */
async function api(session, path, init, ctx) {
  if (session.expires < Date.now() + 60_000 && session.refresh) {
    Object.assign(session, await tokenRequest({ grant_type: 'refresh_token', refresh_token: session.refresh }, ctx.env, ctx.http));
    ctx.refreshed = true;
  }
  const res = await ctx.http(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${session.access}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw fail(401, 'Your Pinterest connection has expired. Connect Pinterest again.');
  if (!res.ok) throw fail(res.status === 429 ? 429 : 502, data.message || `Pinterest returned an error (${res.status}).`);
  return data;
}

const day = (d) => d.toISOString().slice(0, 10);
const METRICS = ['IMPRESSION', 'ENGAGEMENT', 'OUTBOUND_CLICK', 'PIN_CLICK', 'SAVE'];
const TREND_TYPES = new Set(['growing', 'monthly', 'yearly', 'seasonal']);
const REGIONS = new Set(['US', 'CA', 'DE', 'FR', 'ES', 'IT', 'DE+AT+CH', 'GB+IE', 'IT+ES+PT+GR+MT', 'PL+RO+HU+SK+CZ', 'SE+DK+FI+NO', 'NL+BE+LU', 'AR', 'BR', 'CO', 'MX', 'MX+AR+CO+CL', 'AU+NZ']);

/**
 * Handles one /api/pinterest/<op> request. Returns { status, body?, redirect?, cookies[] }
 * for the caller (local proxy or Vercel) to send.
 */
export async function handlePinterest(op, req, body, { env = process.env, fetch: http = fetch } = {}) {
  const secure = !String(req.headers.host || '').startsWith('localhost') && !String(req.headers.host || '').startsWith('127.');
  const cookies = [];
  const jar = readCookies(req.headers.cookie);
  const ctx = { env, http, refreshed: false };
  const configured = pinterestConfigured(env);
  const back = (q) => `${origin(req, env)}/#/settings?tab=pinterest&${q}`;

  if (op === 'status' && !configured) return { status: 200, body: { configured: false, connected: false }, cookies };
  if (!configured) return { status: 503, body: { error: 'Pinterest is not set up on this server yet (PINTEREST_APP_ID, PINTEREST_APP_SECRET, PINTEREST_TOKEN_SECRET).' }, cookies };

  // ---- sign-in
  if (op === 'connect') {
    const state = crypto.randomBytes(16).toString('hex');
    cookies.push(cookie(STATE_COOKIE, state, { secure, maxAge: 600 }));
    const q = new URLSearchParams({ client_id: env.PINTEREST_APP_ID, redirect_uri: redirectUri(req, env), response_type: 'code', scope: SCOPES, state });
    return { status: 302, redirect: `${AUTHORIZE}?${q}`, cookies };
  }
  if (op === 'callback') {
    const url = new URL(req.url, 'http://x');
    cookies.push(cookie(STATE_COOKIE, '', { secure, maxAge: 0 }));
    if (url.searchParams.get('error')) return { status: 302, redirect: back('pinterest=denied'), cookies };
    const state = url.searchParams.get('state');
    if (!state || state !== jar[STATE_COOKIE]) return { status: 302, redirect: back('pinterest=failed'), cookies };
    try {
      const session = await tokenRequest({ grant_type: 'authorization_code', code: url.searchParams.get('code') ?? '', redirect_uri: redirectUri(req, env) }, env, http);
      cookies.push(cookie(COOKIE, seal(session, env), { secure, maxAge: 365 * 86400 }));
      return { status: 302, redirect: back('pinterest=connected'), cookies };
    } catch {
      return { status: 302, redirect: back('pinterest=failed'), cookies };
    }
  }
  if (op === 'disconnect') {
    cookies.push(cookie(COOKIE, '', { secure, maxAge: 0 }));
    return { status: 200, body: { connected: false }, cookies };
  }

  // ---- everything else needs a connection
  const session = jar[COOKIE] ? unseal(jar[COOKIE], env) : null;
  if (!session?.access) {
    if (op === 'status') return { status: 200, body: { configured: true, connected: false }, cookies };
    return { status: 401, body: { error: 'Connect your Pinterest account first.' }, cookies };
  }
  const done = (status, data) => {
    if (ctx.refreshed) cookies.push(cookie(COOKIE, seal(session, env), { secure, maxAge: 365 * 86400 }));
    return { status, body: data, cookies };
  };

  try {
    const url = new URL(req.url, 'http://x');
    if (op === 'status') {
      const a = await api(session, '/user_account', undefined, ctx);
      return done(200, {
        configured: true,
        connected: true,
        account: { username: a.username, name: a.business_name || a.username, image: a.profile_image, type: a.account_type, followers: a.follower_count, monthlyViews: a.monthly_views },
      });
    }
    if (op === 'boards' && req.method === 'GET') {
      const items = [];
      let bookmark = '';
      for (let i = 0; i < 10; i++) {
        const page = await api(session, `/boards?page_size=100${bookmark ? `&bookmark=${encodeURIComponent(bookmark)}` : ''}`, undefined, ctx);
        items.push(...(page.items ?? []));
        bookmark = page.bookmark;
        if (!bookmark) break;
      }
      return done(200, {
        boards: items.map((b) => ({ id: b.id, name: b.name, description: b.description ?? '', privacy: b.privacy, pinCount: b.pin_count ?? 0, cover: b.media?.image_cover_url ?? null })),
      });
    }
    if (op === 'boards' && req.method === 'POST') {
      const name = String(body?.name ?? '').trim().slice(0, 180);
      if (!name) throw fail(400, 'Give the board a name.');
      const privacy = body?.privacy === 'SECRET' ? 'SECRET' : 'PUBLIC';
      const b = await api(session, '/boards', { method: 'POST', body: JSON.stringify({ name, description: String(body?.description ?? '').slice(0, 500), privacy }) }, ctx);
      return done(200, { board: { id: b.id, name: b.name, description: b.description ?? '', privacy: b.privacy, pinCount: 0, cover: null } });
    }
    if (op === 'pins' && req.method === 'POST') {
      const img = body?.image;
      if (!body?.boardId) throw fail(400, 'Choose a board.');
      if (!img || !IMAGE_TYPES.has(img.mediaType) || typeof img.data !== 'string' || img.data.length < 100) throw fail(400, 'The Pin image is missing.');
      const link = String(body.link ?? '').trim();
      if (link && !/^https?:\/\//i.test(link)) throw fail(400, 'The link must start with http:// or https://');
      const pin = await api(
        session,
        '/pins',
        {
          method: 'POST',
          body: JSON.stringify({
            board_id: String(body.boardId),
            title: String(body.title ?? '').slice(0, 100),
            description: String(body.description ?? '').slice(0, 800),
            alt_text: String(body.altText ?? '').slice(0, 500) || undefined,
            link: link || undefined,
            media_source: { source_type: 'image_base64', content_type: img.mediaType, data: img.data },
          }),
        },
        ctx,
      );
      return done(200, { pin: { id: pin.id, url: `https://www.pinterest.com/pin/${pin.id}/` } });
    }
    // Video Pins: register an upload (the browser then sends the file straight to Pinterest's
    // upload URL), check its processing status, then create the Pin from the media id.
    if (op === 'media' && req.method === 'POST') {
      const m = await api(session, '/media', { method: 'POST', body: JSON.stringify({ media_type: 'video' }) }, ctx);
      return done(200, { mediaId: m.media_id, uploadUrl: m.upload_url, uploadParameters: m.upload_parameters ?? {} });
    }
    if (op === 'media' && req.method === 'GET') {
      const id = url.searchParams.get('id') ?? '';
      if (!/^\d+$/.test(id)) throw fail(400, 'Unknown upload.');
      const m = await api(session, `/media/${id}`, undefined, ctx);
      return done(200, { status: m.status });
    }
    if (op === 'videopin' && req.method === 'POST') {
      if (!body?.boardId) throw fail(400, 'Choose a board.');
      if (!/^\d+$/.test(String(body?.mediaId ?? ''))) throw fail(400, 'The video upload is missing.');
      const link = String(body.link ?? '').trim();
      if (link && !/^https?:\/\//i.test(link)) throw fail(400, 'The link must start with http:// or https://');
      const pin = await api(
        session,
        '/pins',
        {
          method: 'POST',
          body: JSON.stringify({
            board_id: String(body.boardId),
            title: String(body.title ?? '').slice(0, 100),
            description: String(body.description ?? '').slice(0, 800),
            alt_text: String(body.altText ?? '').slice(0, 500) || undefined,
            link: link || undefined,
            media_source: { source_type: 'video_id', media_id: String(body.mediaId), cover_image_key_frame_time: 0 },
          }),
        },
        ctx,
      );
      return done(200, { pin: { id: pin.id, url: `https://www.pinterest.com/pin/${pin.id}/` } });
    }
    if (op === 'analytics') {
      const days = [7, 30, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30;
      const end = new Date(Date.now() - 86_400_000);
      const start = new Date(end.getTime() - (days - 1) * 86_400_000);
      const a = await api(session, `/user_account/analytics?start_date=${day(start)}&end_date=${day(end)}&metric_types=${METRICS.join(',')}`, undefined, ctx);
      const all = a.all ?? {};
      return done(200, {
        days,
        summary: all.summary_metrics ?? {},
        daily: (all.daily_metrics ?? []).map((d) => ({ date: d.date, status: d.data_status, ...Object.fromEntries(METRICS.map((m) => [m, d.metrics?.[m] ?? 0])) })),
      });
    }
    if (op === 'trends') {
      const region = REGIONS.has(url.searchParams.get('region') ?? '') ? url.searchParams.get('region') : 'US';
      const type = TREND_TYPES.has(url.searchParams.get('type') ?? '') ? url.searchParams.get('type') : 'growing';
      const t = await api(session, `/trends/keywords/${encodeURIComponent(region)}/top/${type}?limit=50`, undefined, ctx);
      return done(200, {
        region,
        type,
        trends: (t.trends ?? []).map((x) => ({ keyword: x.keyword, weekly: x.pct_growth_wow ?? null, monthly: x.pct_growth_mom ?? null, yearly: x.pct_growth_yoy ?? null, series: x.time_series ?? {} })),
      });
    }
    return { status: 404, body: { error: 'Not found' }, cookies };
  } catch (e) {
    const status = e.status && e.status < 600 ? e.status : 502;
    if (status === 401) cookies.push(cookie(COOKIE, '', { secure, maxAge: 0 }));
    return { status, body: { error: e.message || 'Pinterest request failed.' }, cookies };
  }
}

/** Sends a handlePinterest() result on a Node response (local proxy and Vercel both use this). */
export function sendPinterest(res, out) {
  if (out.cookies.length) res.setHeader('Set-Cookie', out.cookies);
  res.setHeader('Cache-Control', 'no-store');
  if (out.redirect) {
    res.statusCode = 302;
    res.setHeader('Location', out.redirect);
    return res.end();
  }
  res.statusCode = out.status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(out.body ?? {}));
}
