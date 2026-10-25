/**
 * Vercel function plumbing for the AI routes (files starting with "_" are not
 * routes). The Anthropic key comes from the ANTHROPIC_API_KEY environment
 * variable in the Vercel project settings — it never reaches the browser.
 */
import Anthropic from '@anthropic-ai/sdk';
import { MAX_BODY, handleAi } from '../server/aiRoutes.mjs';

let client;

export function aiFunction(route) {
  return async (req, res) => {
    const send = (status, body) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(body));
    };
    if (req.method !== 'POST') return send(405, { error: 'Use POST' });
    if (Number(req.headers['content-length'] || 0) > MAX_BODY[route]) return send(413, { error: 'Request too large' });
    let input = req.body;
    if (typeof input === 'string') {
      try {
        input = JSON.parse(input);
      } catch {
        return send(400, { error: 'Invalid JSON' });
      }
    }
    if (!process.env.ANTHROPIC_API_KEY) return send(503, { error: 'The AI features are not set up yet (ANTHROPIC_API_KEY is missing).' });
    client ??= new Anthropic();
    const out = await handleAi(route, input ?? {}, req.headers.authorization, { client });
    send(out.status, out.body);
  };
}
