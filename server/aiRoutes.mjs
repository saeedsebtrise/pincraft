/**
 * The AI routes, shared by the local proxy (server/ai-proxy.mjs) and the
 * Vercel functions (api/*.mjs):
 *
 *   POST /api/ai            → headline / subtitle / CTA suggestions
 *   POST /api/ai-design     → AI-made Pin designs (aiDesign.mjs)
 *   POST /api/pin-research  → Pinterest screenshot analysis (pinResearch.mjs)
 *
 * Every request costs Claude credits, so online the routes only serve
 * signed-in users: the browser sends its Supabase access token, we check it
 * with Supabase and record the call with record_ai_use() — Postgres enforces
 * the daily limit per plan (supabase/migrations/0002_ai_usage.sql).
 *
 * Login is required on Vercel (or when AI_REQUIRE_LOGIN=true) and optional
 * when you run the proxy on your own computer.
 */
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { designPins } from './aiDesign.mjs';
import { researchPins } from './pinResearch.mjs';

export const AI_TEXT_MODEL = process.env.AI_MODEL || 'claude-opus-5-5';

const PinText = z.object({
  headlines: z.array(z.string()),
  subtitles: z.array(z.string()),
  ctas: z.array(z.string()),
  variations: z.array(z.string()),
});

const SYSTEM = `You write Pinterest Pin overlay text for bloggers.
Return 8 short headline options (max 45 characters each), 6 short subtitles (max 45 characters, a supporting line under the headline),
5 short calls to action, and 6 longer sentence-style headline variations (max 70 characters).
Keep the article's number and main keyword when it has them. Use Title Case. No emojis, no hashtags, no quotation marks.
Never promise virality, rankings or guaranteed traffic.`;

const clean = (value, max) => (typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');

export async function suggestText(client, input) {
  const articleTitle = clean(input.articleTitle, 300);
  if (!articleTitle) throw Object.assign(new Error('articleTitle is required'), { status: 400 });
  const details = [
    `Article title: ${articleTitle}`,
    input.keyword && `Primary keyword: ${clean(input.keyword, 80)}`,
    input.audience && `Audience: ${clean(input.audience, 120)}`,
    input.website && `Website: ${clean(input.website, 80)}`,
  ].filter(Boolean);

  const response = await client.beta.messages.create({
    model: AI_TEXT_MODEL,
    max_tokens: 2000,
    // If Claude declines, the API re-runs the request on a fallback model automatically.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low', format: zodOutputFormat(PinText) },
    system: SYSTEM,
    messages: [{ role: 'user', content: details.join('\n') }],
  });

  if (response.stop_reason === 'refusal') throw Object.assign(new Error('The AI declined this request'), { status: 422 });
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  const parsed = PinText.safeParse(JSON.parse(text));
  if (!parsed.success) throw Object.assign(new Error('Unexpected AI response'), { status: 502 });
  return parsed.data;
}

export const AI_ROUTES = {
  ai: (client, input) => suggestText(client, input),
  'ai-design': (client, input) => designPins(client, { ...input, reference: undefined }),
  // A Pin the user likes → the same design as an editable template (one reference image).
  'ai-reference': (client, input) => {
    if (!input.reference) throw Object.assign(new Error('Add an image of the Pin you want to recreate.'), { status: 400 });
    return designPins(client, input);
  },
  'pin-research': (client, input) => researchPins(client, input),
};

/** Largest request each route accepts. Vercel caps request bodies at 4.5 MB, so images are shrunk in the browser to fit. */
export const MAX_BODY = { ai: 32 * 1024, 'ai-design': 32 * 1024, 'ai-reference': 4.4 * 1024 * 1024, 'pin-research': 4.4 * 1024 * 1024 };

/** What each route counts as in the daily allowance (record_ai_use kinds). */
const USAGE_KIND = { ai: 'ai', 'ai-design': 'ai-design', 'ai-reference': 'ai-design', 'pin-research': 'pin-research' };

// ---------------------------------------------------------------- sign-in & daily limits

const supabaseEnv = (env) => ({
  url: (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, ''),
  key: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '',
});

export const loginRequired = (env = process.env) => (env.AI_REQUIRE_LOGIN ? env.AI_REQUIRE_LOGIN === 'true' : !!env.VERCEL);

const fail = (status, message) => Object.assign(new Error(message), { status });

/**
 * Checks the caller's Supabase session and records one AI call against their
 * daily allowance. Resolves when the call may go ahead; throws with a status
 * (401 not signed in, 429 limit reached, 503 not set up) otherwise.
 */
export async function authorizeAi(route, authorization, { env = process.env, fetch: http = fetch } = {}) {
  if (!loginRequired(env)) return;
  const { url, key } = supabaseEnv(env);
  if (!url || !key) throw fail(503, 'The AI features need accounts. Set SUPABASE_URL and SUPABASE_ANON_KEY on the server.');
  const token = /^Bearer\s+(\S+)$/i.exec(authorization || '')?.[1];
  if (!token) throw fail(401, 'Sign in to use the AI features.');
  const headers = { apikey: key, Authorization: `Bearer ${token}` };

  const who = await http(`${url}/auth/v1/user`, { headers });
  if (!who.ok) throw fail(401, 'Your session has ended. Sign in again to use the AI features.');

  // Runs as the user (their token), so Postgres knows who is calling and which plan they're on.
  const rec = await http(`${url}/rest/v1/rpc/record_ai_use`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: USAGE_KIND[route] ?? route }),
  });
  if (rec.ok) return;
  let message = '';
  try {
    message = (await rec.json()).message ?? '';
  } catch {
    /* not JSON */
  }
  if (message.startsWith('ai_limit')) throw fail(429, "You've used today's AI requests for your plan. They reset at midnight UTC — or upgrade to Pro for more.");
  console.error('[ai] record_ai_use failed', rec.status, message);
  throw fail(503, 'The AI usage check is not set up yet (run supabase/migrations/0002_ai_usage.sql).');
}

/**
 * One AI request, start to finish. Returns { status, body } for the caller to
 * send — the same answer from the local proxy and from Vercel.
 */
export async function handleAi(route, input, authorization, { client, env, fetch: http, onError = console.error } = {}) {
  if (!Object.hasOwn(AI_ROUTES, route)) return { status: 404, body: { error: 'Not found' } };
  try {
    await authorizeAi(route, authorization, { env, fetch: http });
    return { status: 200, body: await AI_ROUTES[route](client, input && typeof input === 'object' ? input : {}) };
  } catch (e) {
    const status = e.status && e.status < 600 ? e.status : 500;
    // SDK errors carry the API's status (e.g. 529 overloaded); report those as a generic service error.
    const ours = e.status && !e.headers;
    if (!ours || status >= 500) onError('[ai]', route, e.message);
    return ours && status < 500 ? { status, body: { error: e.message } } : { status: ours ? status : 502, body: { error: ours ? e.message : 'AI service error' } };
  }
}
