import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { boardsSchema, readArticle, generateCopy, loadPhotos, validateWebhook, runJob, StageError, pinVariant, MAX_PINS_PER_ARTICLE } from './core.mjs';
import { renderPin, sizeFor, SIZES, PHOTO_LAYOUTS } from './design.mjs';

/** Runs one step; any failure that isn't already categorised becomes `stage` with a safe detail. */
async function step(stage, work, detail = () => '') {
  try {
    return await work();
  } catch (error) {
    if (error instanceof StageError) throw error;
    throw new StageError(stage, detail(error));
  }
}
/** Our own error text (short); anything else reports only its type. */
const ownMessage = error => (typeof error?.status === 'number' || error?.name === 'FetchError' ? String(error.message).slice(0, 160) : String(error?.name || 'error'));

export async function runAutopilot(env = process.env, dependencies = {}) {
  const mode = env.AUTOPILOT_MODE || 'preview';
  if (!['preview', 'publish'].includes(mode)) throw new StageError('config', 'AUTOPILOT_MODE must be preview or publish');
  const boards = await step('config', () => boardsSchema.parse(JSON.parse(env.AUTOPILOT_BOARDS_JSON || '[]')), () => 'AUTOPILOT_BOARDS_JSON is missing or invalid');
  const request = dependencies.fetch || fetch;
  // Pin design settings (from the Autopilot page via the Sheet, or the workflow inputs).
  const layout = PHOTO_LAYOUTS[String(env.AUTOPILOT_PHOTOS || 'random').trim()] ? String(env.AUTOPILOT_PHOTOS || 'random').trim() : 'random';
  const sizes = String(env.AUTOPILOT_SIZES || '2:3').split(',').map(x => x.trim()).filter(x => SIZES[x]);
  const font = String(env.AUTOPILOT_FONTS || 'mix').trim();
  // One article read and one photo download serve every Pin of it in this run.
  const articles = new Map();
  const prepare = dependencies.prepare || (async (queued, boardId = '') => {
    // "…/post#pin-2" is Pin 2 of …/post: its own template, lead photo and copy angle.
    const { url: articleUrl, variant } = pinVariant(queued);
    if (!articles.has(articleUrl)) {
      const article = await step('article fetch', () => readArticle(articleUrl), ownMessage);
      articles.set(articleUrl, { article, photos: await step('photos', () => loadPhotos(article), ownMessage) });
    }
    const { article, photos } = articles.get(articleUrl);
    const copy = await step('gemini', () => generateCopy(article, boards, boardId, env, variant), ownMessage);
    // The template follows the article URL and Pin number, so a preview and the later publish look the same.
    const pin = await step('render', () => renderPin(photos, copy, articleUrl, { template: env.AUTOPILOT_TEMPLATE || 'rotate', variant, layout, font, size: sizeFor(articleUrl, sizes.length ? sizes : ['2:3'], variant) }), e => String(e?.message || e?.name || 'error').slice(0, 160));
    return {
      ...copy,
      link: articleUrl,
      image_base64: pin.png.toString('base64'),
      image_mime: pin.mime || 'image/png',
      filename: pin.mime === 'image/jpeg' ? 'pincraft-pin.jpg' : 'pincraft-pin.png',
      // For preview.json only; the worker strips it before calling Make.
      design: { pin: variant, template: pin.template, size: pin.size, font: pin.font || 'template', palette: pin.palette, photos: pin.photos },
    };
  });
  const savePreview = dependencies.savePreview || (async (payload, n = 1) => {
    await mkdir('output/autopilot', { recursive: true });
    // Pin 1 keeps the original names; Pins 2+ are preview-2.png, preview-2.json, …
    const name = n > 1 ? `preview-${n}` : 'preview';
    await writeFile(`output/autopilot/${name}.${payload.image_mime === 'image/jpeg' ? 'jpg' : 'png'}`, Buffer.from(payload.image_base64, 'base64'));
    const { image_base64: _image, ...metadata } = payload;
    await writeFile(`output/autopilot/${name}.json`, JSON.stringify(metadata, null, 2));
  });
  // Preview never claims a Sheet row, changes quotas, or contacts Make.
  if (mode === 'preview') {
    if (!env.AUTOPILOT_PREVIEW_URL) throw new StageError('config', 'set AUTOPILOT_PREVIEW_URL for a preview');
    // AUTOPILOT_PREVIEW_PINS (1-5) shows how each Pin of the article will look.
    const pins = Math.min(MAX_PINS_PER_ARTICLE, Math.max(1, Number.parseInt(env.AUTOPILOT_PREVIEW_PINS || '1', 10) || 1));
    const base = pinVariant(env.AUTOPILOT_PREVIEW_URL).url;
    for (let n = 1; n <= pins; n++) {
      const payload = await prepare(n > 1 ? `${base}#pin-${n}` : base);
      await step('save preview', () => savePreview(payload, n), e => String(e?.code || e?.name || 'error'));
    }
    return { status: 'preview', pins };
  }
  if (env.AUTOPILOT_ENABLED !== 'true') throw new StageError('config', 'Publishing disabled: set AUTOPILOT_ENABLED=true after preview review');
  const sheetUrl = await step('config', () => new URL(env.AUTOPILOT_SHEET_URL || ''), () => 'AUTOPILOT_SHEET_URL is missing or invalid');
  if (sheetUrl.origin !== 'https://script.google.com' || sheetUrl.username || sheetUrl.password || sheetUrl.search || sheetUrl.hash || !/^\/macros\/s\/[\w-]+\/exec$/.test(sheetUrl.pathname)) throw new StageError('config', 'AUTOPILOT_SHEET_URL must be a deployed Apps Script /exec URL');
  if ((env.AUTOPILOT_SHEET_SECRET || '').length < 32) throw new StageError('config', 'AUTOPILOT_SHEET_SECRET must have at least 32 characters');
  const webhook = await step('config', () => validateWebhook(env.MAKE_WEBHOOK_URL), () => 'MAKE_WEBHOOK_URL must be an HTTPS Make.com webhook URL');
  const sheet = async (action, fields = {}) => {
    const response = await step('sheet', () => request(sheetUrl, { method: 'POST', signal: AbortSignal.timeout(45000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, secret: env.AUTOPILOT_SHEET_SECRET, ...fields }) }), e => (e?.name === 'TimeoutError' ? `${action}: no answer` : `${action}: network error`));
    if (!response.ok) throw new StageError('sheet', `${action}: HTTP ${response.status}`);
    const result = await step('sheet', () => response.json(), () => `${action}: answer was not JSON`);
    if (!result.ok) throw new StageError('sheet', `${action}: refused (check deployment, secret and lease)`);
    return result;
  };
  const result = await runJob({ sheet, prepare, publish: async payload => {
    // Never echo Make's error text or the webhook URL: only the status code.
    const response = await step('make', () => request(webhook, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(190000), headers: { 'Content-Type': 'application/json', ...(env.MAKE_WEBHOOK_API_KEY ? { 'x-make-apikey': env.MAKE_WEBHOOK_API_KEY } : {}) }, body: JSON.stringify(payload) }), e => (e?.name === 'TimeoutError' ? 'no answer within 190 s' : 'network error'));
    if (!response.ok) throw new StageError('make', `HTTP ${response.status}`);
    return step('make', () => response.json(), () => 'answer was not JSON');
  } });
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runAutopilot().then(result => {
  console.log(result.status === 'preview' ? `Preview of ${result.pins} Pin(s) saved to output/autopilot. Nothing was published.` : `Autopilot: ${result.status}.`);
}).catch(error => {
  // Provider errors may contain webhook URLs or tokens: only a safe category is printed.
  const where = error instanceof StageError ? error.message : `unexpected (${String(error?.name || 'error')})`;
  console.error(`Autopilot failed at ${where}.`);
  console.error('Check Sheet status, required secrets, article accessibility, Gemini model, and Make execution history. No automatic publish retry was attempted.');
  process.exitCode = 1;
});
