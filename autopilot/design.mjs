import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/**
 * Autopilot Pin designs (1000 × 1500), drawn with Sharp from the article's own photos:
 *   split   — photos · title panel · photos, with a number badge (list posts)
 *   framed  — a photo collage behind a framed title card (list posts)
 *   guide   — title panel on top, one or two big photos below (how-to posts)
 * Fonts are bundled open-licensed files (autopilot/fonts), so the cloud worker
 * renders the same as a local preview. Colors come from the photos.
 */
const W = 1000;
const H = 1500;
const fontFile = name => fileURLToPath(new URL(`./fonts/${name}`, import.meta.url));
export const FONTS = {
  display: { font: 'Anton', fontfile: fontFile('Anton-Regular.ttf') },
  bold: { font: 'Archivo Black', fontfile: fontFile('ArchivoBlack-Regular.ttf') },
  script: { font: 'Lobster', fontfile: fontFile('Lobster-Regular.ttf') },
};

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);

/**
 * Text as a transparent PNG that fits inside width × height. With wrap (the default)
 * long titles break over lines; without it the text stays on one line and scales down.
 */
export async function fittedText(text, { width, height, size, color, bold = false, font, wrap = true, spacing = 0 }) {
  const face = font ? FONTS[font] : bold ? FONTS.bold : null;
  const span = `<span foreground="${color}"${spacing ? ` letter_spacing="${Math.round(spacing * 1024)}"` : ''}>${escape(text)}</span>`;
  const rendered = await sharp({ text: {
    text: span,
    font: `${face ? face.font : 'DejaVu Sans'} ${size}`,
    ...(face ? { fontfile: face.fontfile } : {}),
    ...(wrap ? { width, wrap: 'word-char' } : {}),
    align: 'center', rgba: true,
  } }).png().toBuffer();
  return sharp(rendered).resize({ width, height, fit: 'inside', withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
}

// ---------------------------------------------------------------- title & colors

const SCRIPT_WORDS = ['Ideas', 'Looks', 'Tips', 'Ways', 'Hacks', 'Designs', 'Inspo', 'Styles', 'Recipes', 'Projects', 'Outfits', 'Tricks', 'Steps'];

/**
 * "19 Cozy Fall Kitchen Counter Decor Ideas" → number 19, lines ["Cozy Fall Kitchen", "Counter Decor"],
 * script word "Ideas". Titles without a leading number are guides.
 */
export function splitTitle(title) {
  let words = String(title).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const number = /^\d{1,3}$/.test(words[0] ?? '') && words.length > 1 ? words.shift() : null;
  let script = '';
  const last = words[words.length - 1]?.replace(/[^\w]/g, '');
  const match = SCRIPT_WORDS.find(w => w.toLowerCase() === last?.toLowerCase());
  if (match && words.length > 2) {
    words = words.slice(0, -1);
    script = match;
  }
  // Short titles take two lines; long ones up to four, so the words stay big.
  const n = words.length <= 2 ? 1 : clamp(Math.ceil(words.join(' ').length / LINE_CHARS), 2, Math.min(4, words.length));
  return { number, lines: balanceLines(words, n), script };
}

/** About this many characters of Anton fit one 860px line at a readable size. */
const LINE_CHARS = 17;

/** Small words a headline line shouldn't end on ("…for / Long Hair"). */
const DANGLING = new Set(['a', 'an', 'the', 'to', 'for', 'and', 'or', 'of', 'in', 'on', 'with', 'your', 'my', 'that', 'by', 'at', '&']);

/** Splits words into n evenly sized lines, avoiding lines that end on a small word. */
export function balanceLines(words, n) {
  const cost = (a, b) => {
    const len = words.slice(a, b).join(' ').length;
    return len * len + (b < words.length && DANGLING.has(words[b - 1].toLowerCase()) ? 400 : 0);
  };
  // best[k][i]: lowest cost when the first i words make k lines (sum of squared lengths keeps lines even).
  const best = Array.from({ length: n + 1 }, () => Array(words.length + 1).fill(Infinity));
  const cut = Array.from({ length: n + 1 }, () => Array(words.length + 1).fill(0));
  best[0][0] = 0;
  for (let k = 1; k <= n; k++) {
    for (let i = k; i <= words.length; i++) {
      for (let j = k - 1; j < i; j++) {
        const v = best[k - 1][j] + cost(j, i);
        if (v < best[k][i]) [best[k][i], cut[k][i]] = [v, j];
      }
    }
  }
  const lines = [];
  for (let k = n, i = words.length; k > 0; i = cut[k][i], k--) lines.unshift(words.slice(cut[k][i], i).join(' '));
  return lines;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function hsl(r, g, b) {
  [r, g, b] = [r / 255, g / 255, b / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function toHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Accent, panel and ink colors taken from the photos' dominant color (warm brown when the photos are grey). */
export async function paletteFrom(photos) {
  const hues = [];
  for (const p of photos.slice(0, 3)) {
    const { dominant } = await sharp(p).stats();
    const [h, s, l] = hsl(dominant.r, dominant.g, dominant.b);
    if (s > 0.12 && l > 0.08 && l < 0.92) hues.push(h);
  }
  const h = hues.length ? hues[0] : 28;
  return { accent: toHex(h, clamp(0.55, 0.45, 0.7), 0.34), panel: toHex(h, 0.4, 0.95), ink: '#1d1714', soft: toHex(h, 0.25, 0.86) };
}

// ---------------------------------------------------------------- building blocks

const svg = body => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`);

async function photoTile(photo, width, height) {
  return sharp(photo).resize(width, height, { fit: 'cover', position: 'attention' }).png().toBuffer();
}

/** Places rendered text centered horizontally at y. */
const at = (rendered, y, x = null) => ({ input: rendered.data, left: x ?? Math.round((W - rendered.info.width) / 2), top: Math.round(y) });

/** Renders the stacked title block and returns its layers and height, ready to center in a panel. */
async function titleBlock(title, colors, opts) {
  const { number, lines, script } = title;
  const { width, subtitle, scriptStyle, numberStyle, maxHeight, scale = 1 } = opts;
  const z = v => Math.round(v * scale);
  const parts = [];
  if (number && numberStyle === 'inline') parts.push({ kind: 'text', r: await fittedText(number, { width: 260, height: z(150), size: 160, color: colors.ink, font: 'display', wrap: false }), gap: 6 });
  // Line heights shrink a little as lines are added; the second half of the lines takes the accent color.
  const sizes = { 1: [170], 2: [150, 132], 3: [128, 128, 128], 4: [112, 112, 112, 112] }[lines.length].map(z);
  const accentFrom = Math.max(1, Math.ceil(lines.length / 2));
  for (const [i, line] of lines.entries()) {
    parts.push({ kind: 'text', r: await fittedText(line.toUpperCase(), { width, height: sizes[i], size: 200, color: i >= accentFrom ? colors.accent : colors.ink, font: 'display', wrap: false }), gap: 10 });
  }
  if (script) {
    if (scriptStyle === 'ribbon') {
      const r = await fittedText(script, { width: 420, height: z(74), size: 84, color: '#ffffff', font: 'script', wrap: false });
      parts.push({ kind: 'ribbon', r, gap: 12, height: z(96) });
    } else {
      parts.push({ kind: 'text', r: await fittedText(script, { width: 520, height: z(96), size: 110, color: colors.ink, font: 'script', wrap: false }), gap: 8 });
    }
  }
  if (subtitle) parts.push({ kind: 'text', r: await fittedText(subtitle.toUpperCase(), { width: width - 40, height: z(40), size: 34, color: colors.ink, font: 'bold', wrap: false, spacing: 0.5 }), gap: 14 });
  const height = parts.reduce((n, p, i) => n + (p.height ?? p.r.info.height) + (i ? p.gap : 0), 0);
  // Too tall for its panel (long titles): render once more with everything scaled to fit.
  if (maxHeight && height > maxHeight && scale === 1) return titleBlock(title, colors, { ...opts, scale: (maxHeight / height) * 0.97 });
  return { parts, height };
}

function placeBlock(block, top, colors) {
  const layers = [];
  let y = top;
  for (const [i, p] of block.parts.entries()) {
    if (i) y += p.gap;
    if (p.kind === 'ribbon') {
      const w = p.r.info.width + 130;
      const x = (W - w) / 2;
      const h = p.height;
      const tail = 34;
      // Notched ribbon: darker tails behind a band.
      layers.push({
        input: svg(`<polygon points="${x - tail},${y + 14} ${x + 20},${y + 14} ${x + 20},${y + h + 10} ${x - tail},${y + h + 10} ${x - tail + 18},${y + h / 2 + 12}" fill="${colors.ink}" opacity="0.85"/>
          <polygon points="${x + w + tail},${y + 14} ${x + w - 20},${y + 14} ${x + w - 20},${y + h + 10} ${x + w + tail},${y + h + 10} ${x + w + tail - 18},${y + h / 2 + 12}" fill="${colors.ink}" opacity="0.85"/>
          <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colors.accent}"/>`),
        left: 0,
        top: 0,
      });
      layers.push(at(p.r, y + (h - p.r.info.height) / 2));
      y += h;
    } else {
      layers.push(at(p.r, y));
      y += p.r.info.height;
    }
  }
  return layers;
}

async function footer(cta, site, colors) {
  const pill = await fittedText(cta, { width: 560, height: 30, size: 30, color: colors.ink, font: 'bold', wrap: false, spacing: 0.6 });
  const pw = pill.info.width + 70;
  const host = await fittedText(site.toUpperCase(), { width: 600, height: 26, size: 26, color: '#ffffff', font: 'bold', wrap: false, spacing: 2 });
  return [
    { input: svg(`<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.62"/></linearGradient></defs>
      <rect x="0" y="${H - 230}" width="${W}" height="230" fill="url(#f)"/>
      <rect x="${(W - pw) / 2}" y="${H - 168}" width="${pw}" height="62" rx="31" fill="#ffffff"/>`), left: 0, top: 0 },
    at(pill, H - 168 + (62 - pill.info.height) / 2),
    at(host, H - 74),
  ];
}

// ---------------------------------------------------------------- layouts

async function splitLayout(photos, title, copy, site, colors) {
  const top = photos.slice(0, 3);
  const bottom = photos.length >= 6 ? photos.slice(3, 6) : photos.length >= 4 ? photos.slice(2, 4) : photos.slice(0, 3);
  const layers = [];
  const row = async (list, y, h) => {
    const w = Math.ceil(W / list.length);
    for (const [i, p] of list.entries()) layers.push({ input: await photoTile(p, i === list.length - 1 ? W - w * i : w, h), left: w * i, top: y });
  };
  await row(top, 0, 440);
  await row(bottom, 1060, 440);
  layers.push({ input: svg(`<rect x="0" y="440" width="${W}" height="620" fill="${colors.panel}"/><rect x="0" y="440" width="${W}" height="6" fill="${colors.accent}"/><rect x="0" y="1054" width="${W}" height="6" fill="${colors.accent}"/>`), left: 0, top: 0 });
  const block = await titleBlock(title, colors, { width: 860, subtitle: copy.subtitle, scriptStyle: 'ribbon', numberStyle: 'none', maxHeight: 480 });
  const panelTop = title.number ? 540 : 470;
  layers.push(...placeBlock(block, panelTop + Math.max(0, (1040 - panelTop - block.height) / 2), colors));
  if (title.number) {
    const n = await fittedText(title.number, { width: 150, height: 130, size: 150, color: colors.ink, font: 'display', wrap: false });
    layers.push({ input: svg(`<rect x="${W / 2 - 95}" y="360" width="190" height="170" rx="22" fill="#ffffff" stroke="${colors.ink}" stroke-width="5"/>`), left: 0, top: 0 });
    layers.push(at(n, 360 + (170 - n.info.height) / 2));
  }
  return layers;
}

async function framedLayout(photos, title, copy, site, colors) {
  const layers = [];
  const tiles = [0, 1, 2, 3, 4, 5].map(i => photos[i % photos.length]);
  for (const [i, p] of tiles.entries()) layers.push({ input: await photoTile(p, 500, 500), left: (i % 2) * 500, top: Math.floor(i / 2) * 500 });
  const block = await titleBlock(title, colors, { width: 720, subtitle: copy.subtitle, scriptStyle: 'plain', numberStyle: 'none', maxHeight: 700 });
  const boxH = Math.max(560, block.height + 200);
  const boxY = (H - boxH) / 2 - 40;
  layers.push({ input: svg(`<rect x="80" y="${boxY}" width="840" height="${boxH}" fill="${colors.panel}"/>
    <rect x="80" y="${boxY}" width="840" height="${boxH}" fill="none" stroke="#ffffff" stroke-width="14"/>
    <rect x="104" y="${boxY + 24}" width="792" height="${boxH - 48}" fill="none" stroke="${colors.ink}" stroke-width="4"/>`), left: 0, top: 0 });
  if (title.number) {
    const n = await fittedText(title.number, { width: 130, height: 110, size: 130, color: '#ffffff', font: 'display', wrap: false });
    layers.push({ input: svg(`<rect x="${W / 2 - 80}" y="${boxY - 80}" width="160" height="150" fill="${colors.ink}"/>`), left: 0, top: 0 });
    layers.push(at(n, boxY - 80 + (150 - n.info.height) / 2));
  }
  layers.push(...placeBlock(block, boxY + (boxH - block.height) / 2 + (title.number ? 30 : 0), colors));
  return layers;
}

async function guideLayout(photos, title, copy, site, colors) {
  const layers = [];
  const panelH = 690;
  layers.push({ input: svg(`<rect x="0" y="0" width="${W}" height="${panelH}" fill="${colors.panel}"/><rect x="0" y="${panelH - 6}" width="${W}" height="6" fill="${colors.accent}"/>`), left: 0, top: 0 });
  const tagText = (copy.keyword ? 'Step-by-step guide' : 'Guide').toUpperCase();
  const tag = await fittedText(tagText, { width: 420, height: 26, size: 26, color: '#ffffff', font: 'bold', wrap: false, spacing: 1.5 });
  layers.push({ input: svg(`<rect x="${(W - tag.info.width - 50) / 2}" y="52" width="${tag.info.width + 50}" height="48" rx="6" fill="${colors.ink}"/>`), left: 0, top: 0 });
  layers.push(at(tag, 52 + (48 - tag.info.height) / 2));
  const block = await titleBlock(title, colors, { width: 880, subtitle: copy.subtitle, scriptStyle: 'ribbon', numberStyle: 'inline', maxHeight: 520 });
  layers.push(...placeBlock(block, 120 + Math.max(0, (panelH - 150 - block.height) / 2), colors));
  const list = photos.slice(0, 2);
  const h = Math.floor((H - panelH) / list.length);
  for (const [i, p] of list.entries()) layers.push({ input: await photoTile(p, W, i === list.length - 1 ? H - panelH - h * i : h), left: 0, top: panelH + h * i });
  if (list.length === 2) layers.push({ input: svg(`<rect x="0" y="${panelH + h - 3}" width="${W}" height="6" fill="${colors.panel}"/>`), left: 0, top: 0 });
  return layers;
}

/** Which layout an article gets: list posts alternate split/framed (stable per URL); the rest are guides. */
export function chooseLayout(title, photoCount, articleUrl) {
  const { number } = splitTitle(title);
  if (!number || photoCount < 3) return 'guide';
  let hash = 0;
  for (const c of articleUrl) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return hash % 2 ? 'framed' : 'split';
}

export async function designPin(photos, copy, articleUrl) {
  const valid = [];
  for (const photo of photos.slice(0, 10)) {
    try {
      const normalized = await sharp(photo, { limitInputPixels: 40000000 }).rotate().toBuffer();
      valid.push(normalized);
      if (valid.length === 6) break;
    } catch { /* Ignore malformed or oversized images. */ }
  }
  if (!valid.length) throw new Error('No decodable photos.');
  const title = splitTitle(copy.title);
  const colors = await paletteFrom(valid);
  const site = new URL(articleUrl).hostname.replace(/^www\./, '');
  const layout = chooseLayout(copy.title, valid.length, articleUrl);
  const noun = (title.script || 'Ideas').toUpperCase();
  const cta = title.number && layout !== 'guide' ? `SEE ALL ${title.number} ${noun} →` : `${String(copy.cta || 'Get the tips').toUpperCase()} →`;
  const body = layout === 'split' ? await splitLayout(valid, title, copy, site, colors) : layout === 'framed' ? await framedLayout(valid, title, copy, site, colors) : await guideLayout(valid, title, copy, site, colors);
  return sharp({ create: { width: W, height: H, channels: 3, background: colors.panel } })
    .composite([...body, ...(await footer(cta, site, colors))])
    .png({ compressionLevel: 9 })
    .toBuffer();
}
