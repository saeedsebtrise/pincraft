import { MAX_CONTROL_BODY, handleAutopilotControl } from '../../server/autopilotControl.mjs';

/** /api/autopilot/<op> — the Autopilot page's control panel (see server/autopilotControl.mjs). */
export default async function autopilot(req, res) {
  const op = String(req.query?.op ?? new URL(req.url, 'http://x').pathname.split('/').pop());
  res.setHeader('Cache-Control', 'no-store');
  if (Number(req.headers['content-length'] || 0) > MAX_CONTROL_BODY) return res.status(413).json({ error: 'Request too large' });
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const out = await handleAutopilotControl(op, req, body ?? {});
  res.status(out.status).json(out.body);
}
