/**
 * Optional AI text-assistant proxy for PinCraft.
 *
 * The browser never sees an API key: it POSTs { articleTitle, keyword, audience, website }
 * to /api/ai (and POST /api/ai-design for AI-made Pin designs, see aiDesign.mjs;
 * proxied here by Vite in dev), and this server calls Claude with
 * the key from the server environment. Only text is sent — never images.
 *
 *   ANTHROPIC_API_KEY=... npm run ai-proxy        (port 8787)
 *   VITE_AI_PROXY_URL=/api/ai npm run dev
 */
import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { designPins } from './aiDesign.mjs';
import { pageMiddleware } from './pageFetch.mjs';

const PORT = Number(process.env.AI_PROXY_PORT || 8787);
const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
const MAX_BODY = 32 * 1024; // AI designs send the layout and font lists

const client = new Anthropic(); // reads ANTHROPIC_API_KEY (or an `ant auth login` profile) from the server env

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

function clean(value, max) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '';
}

async function suggest(input) {
  const articleTitle = clean(input.articleTitle, 300);
  if (!articleTitle) throw Object.assign(new Error('articleTitle is required'), { status: 400 });
  const details = [
    `Article title: ${articleTitle}`,
    input.keyword && `Primary keyword: ${clean(input.keyword, 80)}`,
    input.audience && `Audience: ${clean(input.audience, 120)}`,
    input.website && `Website: ${clean(input.website, 80)}`,
  ].filter(Boolean);

  const response = await client.beta.messages.create({
    model: MODEL,
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

const readPages = pageMiddleware();

const server = http.createServer((req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  // Blog URL → Pins (GET /api/page, /api/image) for production builds served behind this proxy.
  if (req.method === 'GET') return void readPages(req, res, () => send(404, { error: 'Not found' }));
  const route = req.url === '/api/ai' ? suggest : req.url === '/api/ai-design' ? (input) => designPins(client, input) : null;
  if (req.method !== 'POST' || !route) return send(404, { error: 'Not found' });

  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > MAX_BODY) {
      send(413, { error: 'Request too large' });
      req.destroy();
    }
  });
  req.on('end', async () => {
    try {
      send(200, await route(JSON.parse(raw || '{}')));
    } catch (e) {
      const status = e instanceof Anthropic.APIError ? 502 : e.status || 500;
      if (status >= 500) console.error('[ai-proxy]', e.message);
      send(status, { error: status >= 500 ? 'AI service error' : e.message });
    }
  });
});

server.listen(PORT, () => console.log(`PinCraft AI proxy on http://localhost:${PORT}/api/ai (model ${MODEL})`));
