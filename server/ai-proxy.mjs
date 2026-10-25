/**
 * Local AI server for PinCraft (on Vercel the same routes run as functions in api/).
 *
 * The browser never sees an API key: it POSTs to /api/ai, /api/ai-design and
 * /api/pin-research (proxied here by Vite in dev), and this server calls
 * Claude with the key from the server environment. See server/aiRoutes.mjs.
 *
 *   ANTHROPIC_API_KEY=... npm run ai-proxy        (port 8787)
 *   VITE_AI_PROXY_URL=/api/ai npm run dev
 *
 * Login isn't required on your own computer; set AI_REQUIRE_LOGIN=true to test it.
 */
import http from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { AI_TEXT_MODEL, MAX_BODY, handleAi } from './aiRoutes.mjs';
import { pageMiddleware } from './pageFetch.mjs';

const PORT = Number(process.env.AI_PROXY_PORT || 8787);

const client = new Anthropic(); // reads ANTHROPIC_API_KEY (or an `ant auth login` profile) from the server env
const readPages = pageMiddleware();

const server = http.createServer((req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  // Blog URL → Pins (GET /api/page, /api/image) for production builds served behind this proxy.
  if (req.method === 'GET') return void readPages(req, res, () => send(404, { error: 'Not found' }));
  const route = (req.url || '').replace(/^\/api\//, '');
  if (req.method !== 'POST' || !Object.hasOwn(MAX_BODY, route)) return send(404, { error: 'Not found' });

  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (raw.length > MAX_BODY[route]) {
      send(413, { error: 'Request too large' });
      req.destroy();
    }
  });
  req.on('end', async () => {
    let input;
    try {
      input = JSON.parse(raw || '{}');
    } catch {
      return send(400, { error: 'Invalid JSON' });
    }
    const out = await handleAi(route, input, req.headers.authorization, { client });
    send(out.status, out.body);
  });
});

server.listen(PORT, () => console.log(`PinCraft AI proxy on http://localhost:${PORT}/api/ai (model ${AI_TEXT_MODEL})`));
