import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { boardsSchema, readArticle, generateCopy, loadPhotos, validateWebhook, runJob } from './core.mjs';
import { renderPin } from './design.mjs';

export async function runAutopilot(env = process.env, dependencies = {}) {
  const mode = env.AUTOPILOT_MODE || 'preview';
  if (!['preview', 'publish'].includes(mode)) throw new Error('AUTOPILOT_MODE must be preview or publish.');
  const boards = boardsSchema.parse(JSON.parse(env.AUTOPILOT_BOARDS_JSON || '[]'));
  const request = dependencies.fetch || fetch;
  const prepare = dependencies.prepare || (async (articleUrl, boardId = '') => {
    const article = await readArticle(articleUrl);
    const copy = await generateCopy(article, boards, boardId, env);
    // The template follows the article URL, so a preview and the later publish look the same.
    const pin = await renderPin(await loadPhotos(article), copy, articleUrl, { template: env.AUTOPILOT_TEMPLATE || 'rotate' });
    return {
      ...copy,
      link: articleUrl,
      image_base64: pin.png.toString('base64'),
      image_mime: 'image/png',
      filename: 'pincraft-pin.png',
      // For preview.json only; the worker strips it before calling Make.
      design: { template: pin.template, palette: pin.palette, photos: pin.photos },
    };
  });
  const savePreview = dependencies.savePreview || (async payload => {
    await mkdir('output/autopilot', { recursive: true });
    await writeFile('output/autopilot/preview.png', Buffer.from(payload.image_base64, 'base64'));
    const { image_base64: _image, ...metadata } = payload;
    await writeFile('output/autopilot/preview.json', JSON.stringify(metadata, null, 2));
  });
  // Preview never claims a Sheet row, changes quotas, or contacts Make.
  if (mode === 'preview') {
    if (!env.AUTOPILOT_PREVIEW_URL) throw new Error('Set AUTOPILOT_PREVIEW_URL for a preview.');
    const payload = await prepare(env.AUTOPILOT_PREVIEW_URL);
    await savePreview(payload);
    return { status: 'preview' };
  }
  if (env.AUTOPILOT_ENABLED !== 'true') throw new Error('Publishing disabled: set AUTOPILOT_ENABLED=true after preview review.');
  const sheetUrl = new URL(env.AUTOPILOT_SHEET_URL || '');
  if (sheetUrl.origin !== 'https://script.google.com' || sheetUrl.username || sheetUrl.password || sheetUrl.search || sheetUrl.hash || !/^\/macros\/s\/[\w-]+\/exec$/.test(sheetUrl.pathname)) throw new Error('Use a deployed Apps Script /exec URL.');
  if ((env.AUTOPILOT_SHEET_SECRET || '').length < 32) throw new Error('Sheet secret must have at least 32 characters.');
  const webhook = validateWebhook(env.MAKE_WEBHOOK_URL);
  const sheet = async (action, fields = {}) => {
    const response = await request(sheetUrl, { method: 'POST', signal: AbortSignal.timeout(45000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, secret: env.AUTOPILOT_SHEET_SECRET, ...fields }) });
    if (!response.ok) throw new Error(`Sheet request failed (${response.status}).`);
    const result = await response.json();
    if (!result.ok) throw new Error('Sheet rejected operation. Check deployment, lease, and configuration.');
    return result;
  };
  const result = await runJob({ sheet, prepare, publish: async payload => {
    const response = await request(webhook, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(190000), headers: { 'Content-Type': 'application/json', ...(env.MAKE_WEBHOOK_API_KEY ? { 'x-make-apikey': env.MAKE_WEBHOOK_API_KEY } : {}) }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`Make request failed (${response.status}).`);
    return response.json();
  } });
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runAutopilot().then(result => {
  console.log(result.status === 'preview' ? 'Preview saved to output/autopilot. Nothing was published.' : `Autopilot: ${result.status}.`);
}).catch(() => {
  // Provider errors may contain webhook URLs or tokens. Do not print raw errors.
  console.error('Autopilot failed. Check Sheet status, required secrets, article accessibility, Gemini model, and Make execution history. No automatic publish retry was attempted.');
  process.exitCode = 1;
});
