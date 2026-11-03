import { MAX_PIN_BODY, handlePinterest, sendPinterest } from '../../server/pinterest.mjs';

/** /api/pinterest/<op> — Pinterest connection, boards, publishing, analytics and trends (see server/pinterest.mjs). */
export default async function pinterest(req, res) {
  const op = String(req.query?.op ?? new URL(req.url, 'http://x').pathname.split('/').pop());
  if (Number(req.headers['content-length'] || 0) > MAX_PIN_BODY) return sendPinterest(res, { status: 413, body: { error: 'The Pin image is too large.' }, cookies: [] });
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  sendPinterest(res, await handlePinterest(op, req, body ?? {}));
}
