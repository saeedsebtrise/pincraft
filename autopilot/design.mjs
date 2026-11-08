import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/**
 * Autopilot Pin designs: 1000 × 1500 PNGs drawn with Sharp from the article's own photos.
 *   A "sandwich"     2 photos · cream panel · 2 photos (octagon number badge)
 *   B "top-card"     panel with a stamp-framed headline · 2×2 photo grid
 *   C "pastel-band"  3 photos · pastel panel · 3 photos (round badge)
 *   D "bold-banner"  3 photos · white panel with an accent banner · 3 photos
 * Every text line is fitted to its box (never overflows); fonts are bundled
 * OFL files in autopilot/fonts, so cloud runs render like local previews.
 */
export const W = 1000;
export const H = 1500;
const GUTTER = 4;
const INK = '#2B1D16';
export const TEMPLATES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const PHOTOS_NEEDED = { A: 4, B: 4, C: 6, D: 6, E: 6, F: 4, G: 6, H: 4 };
/** Copy fields a template can't do without; when one is empty the next template in rotation is used. */
export const REQUIRED_FIELDS = { A: [], B: [], C: [], D: ['banner', 'script_line'], E: [], F: ['script_line'], G: ['banner', 'script_line'], H: ['script_line'] };
export const TEMPLATE_CTA = { A: 'SEE ALL IDEAS', B: 'GET THE IDEAS', C: 'SAVE FOR LATER', D: 'READ MORE', E: 'SEE ALL IDEAS', F: 'GET THE IDEAS', G: 'READ MORE', H: 'SAVE FOR LATER' };
/** "SEE ALL IDEAS" becomes "SEE ALL 19 IDEAS" when the Pin shows a list count. */
export const ctaFor = (template, number) => (TEMPLATE_CTA[template] === 'SEE ALL IDEAS' && number ? `SEE ALL ${number} IDEAS` : TEMPLATE_CTA[template]);
const MIN_PHOTO_SIDE = 300;

const fontPath = file => fileURLToPath(new URL(`./fonts/${file}`, import.meta.url));
const FONTS = {
  lilita: { name: 'Lilita One', file: fontPath('LilitaOne-Regular.ttf') },
  archivo: { name: 'Archivo Black', file: fontPath('ArchivoBlack-Regular.ttf') },
  montserrat: { name: 'Montserrat Ultra-Bold', file: fontPath('Montserrat-ExtraBold.ttf') },
  kalam: { name: 'Kalam Bold', file: fontPath('Kalam-Bold.ttf') },
  anton: { name: 'Anton', file: fontPath('Anton-Regular.ttf') },
};

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------- text

/** Text at an exact pixel size (dpi 72: 1pt = 1px), as a transparent PNG cropped to the text. */
async function textAt(text, font, size, color, { spacing = 0, opacity = 1 } = {}) {
  const f = FONTS[font];
  const attrs = [`foreground="${color}"`, spacing ? `letter_spacing="${Math.round(spacing * 1024)}"` : '', opacity < 1 ? `fgalpha="${Math.round(opacity * 100)}%"` : ''].filter(Boolean).join(' ');
  return sharp({ text: { text: `<span ${attrs}>${escape(text)}</span>`, font: `${f.name} ${Math.round(size)}`, fontfile: f.file, dpi: 72, rgba: true } })
    .png()
    .toBuffer({ resolveWithObject: true });
}

/** A text outline: the dark copy stamped around a ring, the fill on top. */
async function outlined(text, font, size, fill, stroke, radius, spacing) {
  const front = await textAt(text, font, size, fill, { spacing });
  const back = await textAt(text, font, size, stroke, { spacing });
  const steps = [];
  for (const r of [radius, radius * 0.55]) for (let k = 0; k < 16; k++) steps.push([r * Math.cos((k * Math.PI) / 8), r * Math.sin((k * Math.PI) / 8)]);
  const pad = Math.ceil(radius);
  return sharp({ create: { width: front.info.width + pad * 2, height: front.info.height + pad * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([...steps.map(([dx, dy]) => ({ input: back.data, left: Math.round(pad + dx), top: Math.round(pad + dy) })), { input: front.data, left: pad, top: pad }])
    .png()
    .toBuffer({ resolveWithObject: true });
}

/**
 * One line sized to fill maxWidth, between min and max px. If it is still too wide at
 * the minimum size, the image is scaled down: text never overflows its box.
 */
export async function fitLine(text, { font, color, maxWidth, min, max, spacing = 0, outline = 0, outlineColor = INK, opacity = 1 }) {
  const probe = await textAt(text, font, 100, color, { spacing });
  const size = clamp(Math.floor((100 * (maxWidth - outline * 2)) / Math.max(1, probe.info.width)), min, max);
  let out = outline ? await outlined(text, font, size, color, outlineColor, outline, spacing) : await textAt(text, font, size, color, { spacing, opacity });
  if (out.info.width > maxWidth) out = await sharp(out.data).resize({ width: maxWidth }).png().toBuffer({ resolveWithObject: true });
  return { ...out, size };
}

// ---------------------------------------------------------------- color

const hexRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const rgbHex = rgb => `#${rgb.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`;
function toHsl([r, g, b]) {
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
function fromHsl(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return rgbHex([f(0), f(8), f(4)]);
}
function luminance(hex) {
  const [r, g, b] = hexRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** Darkens a color (same hue) until it reaches the contrast ratio against bg. */
export function readableOn(color, bg, ratio = 4.5) {
  let [h, s, l] = toHsl(hexRgb(color));
  let out = color;
  while (contrast(out, bg) < ratio && l > 0.04) {
    l -= 0.02;
    out = fromHsl(h, s, l);
  }
  return out;
}
const mix = (a, b, t) => rgbHex(hexRgb(a).map((v, i) => v * (1 - t) + hexRgb(b)[i] * t));

const FALLBACK_PALETTES = [
  { accent: '#B8862F', secondary: '#4A3226' },
  { accent: '#C2577A', secondary: '#4B2233' },
  { accent: '#6E8B5E', secondary: '#2F3B28' },
  { accent: '#2F6E9E', secondary: '#1C2E42' },
  { accent: '#C0603A', secondary: '#4A2A1E' },
  { accent: '#2E8B83', secondary: '#1F3B39' },
  { accent: '#8A4F8F', secondary: '#3A2340' },
];

/** Small k-means over downsampled photo pixels: returns cluster colors, biggest first. */
async function dominantColors(photos, k = 3) {
  const pixels = [];
  for (const p of photos.slice(0, 4)) {
    const { data } = await sharp(p).resize(24, 24, { fit: 'cover' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 3) pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (!pixels.length) return [];
  const byLight = [...pixels].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  let centers = Array.from({ length: k }, (_, i) => byLight[Math.floor(((i + 0.5) / k) * byLight.length)]);
  let groups = [];
  for (let iter = 0; iter < 8; iter++) {
    groups = centers.map(() => []);
    for (const px of pixels) {
      let best = 0;
      let bestD = Infinity;
      centers.forEach((c, j) => {
        const d = (px[0] - c[0]) ** 2 + (px[1] - c[1]) ** 2 + (px[2] - c[2]) ** 2;
        if (d < bestD) [best, bestD] = [j, d];
      });
      groups[best].push(px);
    }
    centers = groups.map((g, j) => (g.length ? [0, 1, 2].map(c => g.reduce((n, px) => n + px[c], 0) / g.length) : centers[j]));
  }
  return centers.map((c, j) => ({ hex: rgbHex(c), size: groups[j].length })).sort((a, b) => b.size - a.size);
}

/**
 * Accent = the most saturated photo color, secondary = a darker one; both fall back to a
 * brand-safe palette when the photos are grey. Text colors are darkened to 4.5:1 on the panel.
 */
/** Pin `variant` of an article takes the next photo colour along, so its Pins differ in colour too. */
export async function paletteFrom(photos, key = '', variant = 1) {
  let accent;
  let secondary;
  try {
    const colors = await dominantColors(photos, variant > 1 ? 5 : 3);
    const usable = colors.map(c => ({ ...c, hsl: toHsl(hexRgb(c.hex)) })).filter(c => c.hsl[1] > 0.18 && c.hsl[2] > 0.18 && c.hsl[2] < 0.82);
    if (usable.length) {
      const ranked = [...usable].sort((x, y) => y.hsl[1] - x.hsl[1]);
      const a = ranked[(variant - 1) % ranked.length];
      // Push the accent to a confident, print-like tone.
      accent = fromHsl(a.hsl[0], clamp(a.hsl[1], 0.45, 0.75), clamp(a.hsl[2], 0.38, 0.5));
      const darker = colors.map(c => ({ ...c, hsl: toHsl(hexRgb(c.hex)) })).filter(c => c.hex !== a.hex).sort((x, y) => x.hsl[2] - y.hsl[2])[0];
      secondary = darker ? fromHsl(darker.hsl[1] > 0.12 ? darker.hsl[0] : a.hsl[0], clamp(darker.hsl[1], 0.25, 0.6), clamp(darker.hsl[2], 0.16, 0.3)) : fromHsl(a.hsl[0], 0.45, 0.22);
    }
  } catch {
    /* fall back below */
  }
  // Pin 1 keeps its colour (the first three entries); later Pins step through the list.
  if (!accent) ({ accent, secondary } = FALLBACK_PALETTES[((hash(key) % 3) + variant - 1) % FALLBACK_PALETTES.length]);
  return { accent, secondary };
}

// ---------------------------------------------------------------- shapes

const svg = (body, w = W, h = H) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);

function octagon(cx, cy, size) {
  const r = size / 2 / Math.cos(Math.PI / 8);
  return Array.from({ length: 8 }, (_, k) => {
    const a = Math.PI / 8 + (k * Math.PI) / 4;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
}

/** A rectangle with scalloped (stamp) edges. */
function stampPath(x, y, w, h, bump = 11) {
  const nx = Math.max(4, Math.round(w / (2 * bump)));
  const ny = Math.max(4, Math.round(h / (2 * bump)));
  const rx = w / (2 * nx);
  const ry = h / (2 * ny);
  let d = `M${x},${y}`;
  for (let i = 0; i < nx; i++) d += ` a${rx},${rx} 0 0 1 ${2 * rx},0`;
  for (let i = 0; i < ny; i++) d += ` a${ry},${ry} 0 0 1 0,${2 * ry}`;
  for (let i = 0; i < nx; i++) d += ` a${rx},${rx} 0 0 1 ${-2 * rx},0`;
  for (let i = 0; i < ny; i++) d += ` a${ry},${ry} 0 0 1 0,${-2 * ry}`;
  return `${d} Z`;
}

/** A small hand-drawn squiggle doodle for a panel corner. */
function squiggle(x, y, color) {
  return `<path d="M${x},${y + 20} q12,-26 24,0 t24,0 t24,0 t24,0" fill="none" stroke="${color}" stroke-opacity="0.6" stroke-width="3" stroke-linecap="round"/>
    <path d="M${x + 14},${y + 44} q10,-18 20,0 t20,0 t20,0" fill="none" stroke="${color}" stroke-opacity="0.6" stroke-width="3" stroke-linecap="round"/>`;
}

/** A swallowtail ribbon band from x to x + w at y (height h). */
function swallowtail(x, y, w, h, fill) {
  const n = h * 0.45;
  return `<polygon points="${x - 34},${y + 10} ${x + 10},${y + 10} ${x + 10},${y + h + 12} ${x - 34},${y + h + 12} ${x - 34 + n * 0.55},${y + h / 2 + 11}" fill="${fill}" opacity="0.75"/>
    <polygon points="${x + w + 34},${y + 10} ${x + w - 10},${y + 10} ${x + w - 10},${y + h + 12} ${x + w + 34},${y + h + 12} ${x + w + 34 - n * 0.55},${y + h / 2 + 11}" fill="${fill}" opacity="0.75"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
}

/** A hand-drawn style curved arrow from (x1, y1) to (x2, y2). */
function arrow(x1, y1, x2, y2, color, bend = -60) {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 + bend;
  const ang = Math.atan2(y2 - cy, x2 - cx);
  const head = a => `${(x2 - 26 * Math.cos(ang + a)).toFixed(1)},${(y2 - 26 * Math.sin(ang + a)).toFixed(1)}`;
  return `<path d="M${x1},${y1} Q${cx},${cy} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
    <path d="M${head(0.5)} L${x2},${y2} L${head(-0.5)}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// ---------------------------------------------------------------- canvas helper

/** Collects layers plus the box of every text element (used by tests to check fitting). */
class Canvas {
  constructor() {
    this.layers = [];
    this.boxes = [];
  }
  shape(body) {
    this.layers.push({ input: svg(body), left: 0, top: 0 });
  }
  image(input, left, top) {
    this.layers.push({ input, left: Math.round(left), top: Math.round(top) });
  }
  text(name, r, left, top, region) {
    this.image(r.data, left, top);
    this.boxes.push({ name, left: Math.round(left), top: Math.round(top), width: r.info.width, height: r.info.height, region });
  }
}

async function photoCell(photo, w, h) {
  return sharp(photo).resize(Math.round(w), Math.round(h), { fit: 'cover', position: 'attention' }).png().toBuffer();
}

/** A row of photos with white gutters between cells. */
async function photoRow(c, photos, top, height) {
  const n = photos.length;
  const w = (W - GUTTER * (n - 1)) / n;
  c.shape(`<rect x="0" y="${top}" width="${W}" height="${height}" fill="#ffffff"/>`);
  for (const [i, p] of photos.entries()) c.image(await photoCell(p, i === n - 1 ? W - Math.round((w + GUTTER) * i) : w, height), Math.round((w + GUTTER) * i), top);
}

/** Stacks rendered items in a panel region, centered vertically and horizontally. */
function stack(c, items, top, bottom, region) {
  const total = items.reduce((n, it, i) => n + it.h + (i ? it.gap : 0), 0);
  let y = top + Math.max(0, (bottom - top - total) / 2);
  for (const [i, it] of items.entries()) {
    if (i) y += it.gap;
    it.draw(c, y, region);
    y += it.h;
  }
  return total;
}
const textItem = (name, r, gap = 14) => ({ h: r.info.height, gap, draw: (c, y, region) => c.text(name, r, (W - r.info.width) / 2, y, region) });

async function ctaAndDomain(c, cta, site) {
  c.shape(`<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient></defs>
    <rect x="0" y="${H - 200}" width="${W}" height="200" fill="url(#fade)"/>`);
  const label = await fitLine(`${cta} →`, { font: 'montserrat', color: INK, maxWidth: 520, min: 18, max: 24, spacing: 1 });
  const pw = label.info.width + 64;
  const top = H - 70 - 52;
  c.shape(`<rect x="${(W - pw) / 2}" y="${top}" width="${pw}" height="52" rx="26" fill="#ffffff"/>`);
  c.text('cta', label, (W - label.info.width) / 2, top + (52 - label.info.height) / 2, [top, top + 52]);
  const domain = await fitLine(site.toUpperCase(), { font: 'montserrat', color: '#ffffff', maxWidth: 600, min: 14, max: 18, spacing: 2, opacity: 0.7 });
  c.text('domain', domain, (W - domain.info.width) / 2, top + 52 + 12, [top + 52, H]);
}

/** The headline's two lines, shrinking the size cap until the whole block fits the panel. */
async function fitBlock(build, avail) {
  for (let max = 130; max >= 70; max -= 10) {
    const items = await build(max);
    const total = items.reduce((n, it, i) => n + it.h + (i ? it.gap : 0), 0);
    if (total <= avail) return items;
  }
  // Still too tall at the minimum size: tighten the gaps.
  const items = await build(70);
  return items.map((it, i) => ({ ...it, gap: i ? Math.round(it.gap / 2) : 0 }));
}

// ---------------------------------------------------------------- templates

async function templateA(c, photos, copy, pal) {
  const panel = '#F6F1E7';
  const [top, bottom] = photos.length >= 4 ? [photos.slice(0, 2), photos.slice(2, 4)] : [[photos[0]], [photos[1] ?? photos[0]]];
  await photoRow(c, top, 0, 450);
  c.shape(`<rect x="0" y="450" width="${W}" height="600" fill="${panel}"/>`);
  c.shape(squiggle(840, 474, INK));
  await photoRow(c, bottom, 1050, 450);
  const accentText = readableOn(pal.accent, panel);
  const secondary = readableOn(pal.secondary, panel);
  const hasBadge = !!copy.number;
  const items = await fitBlock(async max => {
    const out = [];
    if (copy.hook) out.push(textItem('hook', await fitLine(copy.hook, { font: 'montserrat', color: accentText, maxWidth: 880, min: 28, max: 40, spacing: 2 }), 0));
    for (const [i, line] of [copy.headline_line1, copy.headline_line2].filter(Boolean).entries()) {
      out.push(textItem(`headline${i + 1}`, await fitLine(line, { font: 'lilita', color: pal.accent, maxWidth: 880, min: 70, max, outline: 6, outlineColor: INK }), i ? 2 : 12));
    }
    if (copy.category) out.push(textItem('category', await fitLine(copy.category, { font: 'montserrat', color: secondary, maxWidth: 880, min: 30, max: 48 })));
    if (copy.script_word) out.push(textItem('script', await fitLine(copy.script_word, { font: 'kalam', color: INK, maxWidth: 600, min: 54, max: 64 }), 6));
    if (copy.tagline) {
      const t = await fitLine(copy.tagline, { font: 'montserrat', color: '#ffffff', maxWidth: 760, min: 22, max: 26, spacing: 1 });
      const pw = t.info.width + 56;
      const ph = t.info.height + 28;
      out.push({ h: ph, gap: 14, draw: (cv, y, region) => {
        cv.shape(`<rect x="${(W - pw) / 2}" y="${y}" width="${pw}" height="${ph}" rx="${ph / 2}" fill="${INK}"/>`);
        cv.text('tagline', t, (W - t.info.width) / 2, y + 14, region);
      } });
    }
    return out;
  }, 600 - (hasBadge ? 136 : 40));
  stack(c, items, 450 + (hasBadge ? 118 : 20), 1050 - 16, [450, 1050]);
  if (hasBadge) {
    c.shape(`<polygon points="${octagon(500, 450, 210)}" fill="#3A2418" stroke="#ffffff" stroke-width="6"/>${arrow(230, 580, 380, 480, INK, -70)}`);
    const n = await fitLine(copy.number, { font: 'lilita', color: '#ffffff', maxWidth: 150, min: 40, max: 128 });
    c.text('number', n, 500 - n.info.width / 2, 450 - n.info.height / 2, [345, 555]);
  }
}

async function templateB(c, photos, copy, pal) {
  const panel = '#FBF7F2';
  c.shape(`<rect x="0" y="0" width="${W}" height="620" fill="${panel}"/>`);
  c.shape(squiggle(840, 30, INK));
  // 2×2 grid below the panel.
  const cw = (W - GUTTER) / 2;
  const ch = (880 - GUTTER) / 2;
  c.shape(`<rect x="0" y="620" width="${W}" height="880" fill="#ffffff"/>`);
  for (let i = 0; i < 4; i++) c.image(await photoCell(photos[i % photos.length], cw, ch), (i % 2) * (cw + GUTTER), 620 + Math.floor(i / 2) * (ch + GUTTER));
  const accentText = readableOn(pal.accent, '#ffffff');
  const secondary = readableOn(pal.secondary, '#ffffff');
  const hasBadge = !!copy.number;
  const frameTop = hasBadge ? 196 : 50;
  // Frame content (headline + category), shrinking until the whole panel fits.
  let frame;
  let below;
  for (let max = 130; max >= 70; max -= 10) {
    frame = [];
    for (const [i, line] of [copy.headline_line1, copy.headline_line2].filter(Boolean).entries()) frame.push(textItem(`headline${i + 1}`, await fitLine(line, { font: 'lilita', color: accentText, maxWidth: 760, min: 70, max }), i ? 2 : 0));
    if (copy.category) frame.push(textItem('category', await fitLine(copy.category, { font: 'montserrat', color: secondary, maxWidth: 760, min: 26, max: 44 }), 12));
    below = [];
    if (copy.script_word) below.push(textItem('script', await fitLine(copy.script_word, { font: 'kalam', color: INK, maxWidth: 600, min: 54, max: 64 }), 0));
    if (copy.tagline) below.push(textItem('tagline', await fitLine(copy.tagline, { font: 'montserrat', color: INK, maxWidth: 860, min: 22, max: 26, spacing: 1 }), 8));
    const frameH = frame.reduce((n, it, i) => n + it.h + (i ? it.gap : 0), 0) + 64;
    const belowH = below.reduce((n, it, i) => n + it.h + (i ? it.gap : 0), 0);
    if (frameTop + frameH + 18 + belowH <= 600 || max === 70) break;
  }
  const frameH = frame.reduce((n, it, i) => n + it.h + (i ? it.gap : 0), 0) + 64;
  c.shape(`<path d="${stampPath(70, frameTop, 860, frameH)}" fill="#ffffff" stroke="${INK}" stroke-width="4"/>`);
  stack(c, frame, frameTop + 32, frameTop + frameH - 32, [frameTop, frameTop + frameH]);
  stack(c, below, frameTop + frameH + 18, 610, [frameTop + frameH, 620]);
  if (hasBadge) {
    c.shape(`<rect x="420" y="24" width="160" height="160" fill="#111111"/>${arrow(180, 44, 400, 108, INK, -50)}`);
    const n = await fitLine(copy.number, { font: 'lilita', color: '#ffffff', maxWidth: 124, min: 40, max: 112 });
    c.text('number', n, 500 - n.info.width / 2, 104 - n.info.height / 2, [24, 184]);
  }
}

async function templateC(c, photos, copy, pal) {
  const panel = mix(pal.accent, '#ffffff', 0.85);
  await photoRow(c, photos.slice(0, 3), 0, 430);
  c.shape(`<rect x="0" y="430" width="${W}" height="560" fill="${panel}"/>`);
  c.shape(squiggle(840, 452, INK));
  await photoRow(c, photos.slice(3, 6), 990, 510);
  const darkAccent = fromHsl(toHsl(hexRgb(pal.accent))[0], 0.5, 0.2);
  const ink = readableOn(INK, panel);
  const hasBadge = !!copy.number;
  const items = await fitBlock(async max => {
    const out = [];
    for (const [i, line] of [copy.headline_line1, copy.headline_line2].filter(Boolean).entries()) {
      out.push(textItem(`headline${i + 1}`, await fitLine(line, { font: 'lilita', color: pal.accent, maxWidth: 880, min: 70, max, outline: 5, outlineColor: darkAccent }), i ? 2 : 0));
    }
    if (copy.category) {
      const t = await fitLine(copy.category, { font: 'montserrat', color: readableOn(pal.secondary, panel), maxWidth: 840, min: 26, max: 40 });
      const sh = t.info.height + 22;
      out.push({ h: sh, gap: 14, draw: (cv, y, region) => {
        cv.shape(`<rect x="${(W - t.info.width) / 2 - 40}" y="${y}" width="${t.info.width + 80}" height="${sh}" fill="${pal.accent}" fill-opacity="0.35"/>`);
        cv.text('category', t, (W - t.info.width) / 2, y + 11, region);
      } });
    }
    out.push(textItem('script', copy.script_word
      ? await fitLine(copy.script_word, { font: 'kalam', color: ink, maxWidth: 600, min: 54, max: 64 })
      : await fitLine('IDEAS', { font: 'montserrat', color: ink, maxWidth: 600, min: 34, max: 44, spacing: 3 }), 6));
    if (copy.tagline) out.push(textItem('tagline', await fitLine(copy.tagline, { font: 'montserrat', color: ink, maxWidth: 860, min: 22, max: 24, spacing: 1 }), 6));
    return out;
  }, 560 - (hasBadge ? 126 : 40));
  stack(c, items, 430 + (hasBadge ? 110 : 20), 990 - 16, [430, 990]);
  if (hasBadge) {
    c.shape(`<circle cx="500" cy="430" r="95" fill="${pal.accent}" stroke="#ffffff" stroke-width="7"/>${arrow(240, 560, 395, 465, ink, -70)}`);
    const n = await fitLine(copy.number, { font: 'lilita', color: '#ffffff', maxWidth: 130, min: 40, max: 116 });
    c.text('number', n, 500 - n.info.width / 2, 430 - n.info.height / 2, [335, 525]);
  }
}

async function templateD(c, photos, copy, pal) {
  await photoRow(c, photos.slice(0, 3), 0, 430);
  c.shape(`<rect x="0" y="430" width="${W}" height="600" fill="#ffffff"/>`);
  c.shape(squiggle(840, 452, INK));
  await photoRow(c, photos.slice(3, 6), 1030, 470);
  const band = readableOn(pal.accent, '#ffffff');
  const hasBadge = !!copy.number;
  const bannerText = copy.banner || copy.category;
  const items = await fitBlock(async max => {
    const out = [];
    for (const [i, line] of [copy.headline_line1, copy.headline_line2].filter(Boolean).entries()) {
      out.push(textItem(`headline${i + 1}`, await fitLine(line, { font: 'archivo', color: '#111111', maxWidth: 880, min: 70, max }), i ? 4 : 0));
    }
    if (bannerText) {
      const t = await fitLine(bannerText, { font: 'montserrat', color: '#ffffff', maxWidth: 920, min: 28, max: 48, spacing: 1 });
      out.push({ h: 80, gap: 18, draw: (cv, y, region) => {
        cv.shape(`<rect x="0" y="${y}" width="${W}" height="80" fill="${band}"/>`);
        cv.text('banner', t, (W - t.info.width) / 2, y + (80 - t.info.height) / 2, region);
      } });
    }
    const script = copy.script_line || copy.script_word;
    if (script) out.push(textItem('script', await fitLine(script, { font: 'kalam', color: INK, maxWidth: 860, min: 54, max: 64 }), 12));
    if (copy.tagline) out.push(textItem('tagline', await fitLine(copy.tagline, { font: 'montserrat', color: INK, maxWidth: 860, min: 22, max: 24, spacing: 1 }), 6));
    return out;
  }, 600 - (hasBadge ? 124 : 40));
  stack(c, items, 430 + (hasBadge ? 108 : 20), 1030 - 16, [430, 1030]);
  if (hasBadge) {
    c.shape(`<rect x="412" y="342" width="176" height="176" fill="#111111" stroke="#ffffff" stroke-width="6"/>${arrow(230, 565, 395, 465, INK, -70)}`);
    const n = await fitLine(copy.number, { font: 'archivo', color: '#ffffff', maxWidth: 140, min: 40, max: 108 });
    c.text('number', n, 500 - n.info.width / 2, 430 - n.info.height / 2, [342, 518]);
  }
}

async function templateE(c, photos, copy, pal) {
  await photoRow(c, photos.slice(0, 3), 0, 420);
  c.shape(`<rect x="0" y="420" width="${W}" height="640" fill="#ffffff"/>`);
  c.shape(squiggle(840, 444, INK));
  await photoRow(c, photos.slice(3, 6), 1060, 440);
  const accentText = readableOn(pal.accent, '#ffffff');
  const ribbonFill = readableOn(pal.accent, '#ffffff');
  const items = await fitBlock(async max => {
    const out = [];
    if (copy.number) {
      const n = await fitLine(copy.number, { font: 'archivo', color: '#2B2B2B', maxWidth: 360, min: 90, max: 150 });
      out.push({ h: n.info.height, gap: 0, draw: (cv, y, region) => {
        cv.text('number', n, (W - n.info.width) / 2, y, region);
        cv.shape(arrow((W - n.info.width) / 2 - 190, y + n.info.height + 6, (W - n.info.width) / 2 - 24, y + n.info.height / 2, INK, -60));
      } });
    }
    if (copy.hook) out.push(textItem('hook', await fitLine(copy.hook, { font: 'montserrat', color: INK, maxWidth: 880, min: 24, max: 32, spacing: 3 }), 10));
    if (copy.headline_line1) out.push(textItem('headline1', await fitLine(copy.headline_line1, { font: 'anton', color: '#2B2B2B', maxWidth: 880, min: 70, max }), 12));
    if (copy.headline_line2) out.push(textItem('headline2', await fitLine(copy.headline_line2, { font: 'anton', color: accentText, maxWidth: 880, min: 70, max }), 4));
    if (copy.script_word) {
      const t = await fitLine(copy.script_word, { font: 'kalam', color: '#ffffff', maxWidth: 480, min: 54, max: 64 });
      const rw = 550;
      const rh = t.info.height + 24;
      out.push({ h: rh + 12, gap: 14, draw: (cv, y, region) => {
        cv.shape(swallowtail((W - rw) / 2, y, rw, rh, ribbonFill));
        cv.text('script', t, (W - t.info.width) / 2, y + 12, region);
      } });
    }
    if (copy.tagline) out.push(textItem('tagline', await fitLine(copy.tagline, { font: 'montserrat', color: INK, maxWidth: 860, min: 22, max: 24, spacing: 1 }), 10));
    return out;
  }, 600);
  stack(c, items, 440, 1060 - 18, [420, 1060]);
}

async function templateF(c, photos, copy, pal) {
  const panel = '#FBF7F2';
  const three = photos.length >= 6;
  await photoRow(c, three ? photos.slice(0, 3) : photos.slice(0, 2), 0, 460);
  c.shape(`<rect x="0" y="460" width="${W}" height="600" fill="${panel}"/>`);
  c.shape(squiggle(840, 484, INK));
  await photoRow(c, three ? photos.slice(3, 6) : photos.slice(2, 4), 1060, 440);
  const accentText = readableOn(pal.accent, panel);
  const secondary = readableOn(pal.secondary, panel);
  const hasBadge = !!copy.number;
  const items = await fitBlock(async max => {
    const box = [];
    for (const [i, line] of [copy.headline_line1, copy.headline_line2].filter(Boolean).entries()) box.push(textItem(`headline${i + 1}`, await fitLine(line, { font: 'lilita', color: accentText, maxWidth: 780, min: 70, max }), i ? 2 : 0));
    if (copy.category) box.push(textItem('category', await fitLine(copy.category, { font: 'montserrat', color: secondary, maxWidth: 780, min: 26, max: 40 }), 10));
    const boxH = box.reduce((n, it, i) => n + it.h + (i ? it.gap : 0), 0) + 40;
    const out = [{ h: boxH, gap: 0, draw: (cv, y) => {
      cv.shape(`<rect x="90" y="${y}" width="820" height="${boxH}" fill="none" stroke="${INK}" stroke-width="3"/>`);
      stack(cv, box, y + 20, y + boxH - 20, [y, y + boxH]);
    } }];
    if (copy.script_line) out.push(textItem('script', await fitLine(copy.script_line, { font: 'kalam', color: INK, maxWidth: 820, min: 54, max: 64 }), 14));
    if (copy.tagline) out.push(textItem('tagline', await fitLine(copy.tagline, { font: 'montserrat', color: INK, maxWidth: 860, min: 22, max: 24, spacing: 1 }), 8));
    return out;
  }, 600 - (hasBadge ? 124 : 40));
  stack(c, items, 460 + (hasBadge ? 108 : 20), 1060 - 16, [460, 1060]);
  if (hasBadge) {
    c.shape(`<rect x="418" y="378" width="164" height="164" fill="#111111" stroke="#ffffff" stroke-width="6"/>${arrow(240, 585, 400, 480, INK, -70)}`);
    const n = await fitLine(copy.number, { font: 'lilita', color: '#ffffff', maxWidth: 128, min: 40, max: 112 });
    c.text('number', n, 500 - n.info.width / 2, 460 - n.info.height / 2, [378, 542]);
  }
}

async function templateG(c, photos, copy, pal) {
  await photoRow(c, photos.slice(0, 3), 0, 430);
  c.shape(`<rect x="0" y="430" width="${W}" height="600" fill="#ffffff"/>`);
  c.shape(squiggle(840, 452, INK));
  await photoRow(c, photos.slice(3, 6), 1030, 470);
  const band = readableOn(pal.accent, '#ffffff');
  const items = await fitBlock(async max => {
    const out = [];
    if (copy.hook) out.push(textItem('hook', await fitLine(copy.hook, { font: 'montserrat', color: band, maxWidth: 880, min: 30, max: 44, spacing: 2 }), 0));
    for (const [i, line] of [copy.headline_line1, copy.headline_line2].filter(Boolean).entries()) out.push(textItem(`headline${i + 1}`, await fitLine(line, { font: 'archivo', color: '#111111', maxWidth: 880, min: 70, max }), i ? 4 : 10));
    if (copy.banner) {
      const t = await fitLine(copy.banner, { font: 'montserrat', color: '#ffffff', maxWidth: 920, min: 28, max: 48, spacing: 1 });
      out.push({ h: 80, gap: 18, draw: (cv, y, region) => {
        cv.shape(`<rect x="0" y="${y}" width="${W}" height="80" fill="${band}"/>`);
        cv.text('banner', t, (W - t.info.width) / 2, y + (80 - t.info.height) / 2, region);
      } });
    }
    if (copy.script_line) out.push(textItem('script', await fitLine(copy.script_line, { font: 'kalam', color: INK, maxWidth: 860, min: 54, max: 64 }), 12));
    if (copy.tagline) out.push(textItem('tagline', await fitLine(copy.tagline, { font: 'montserrat', color: INK, maxWidth: 860, min: 22, max: 24, spacing: 1 }), 6));
    return out;
  }, 600 - 48);
  stack(c, items, 430 + 28, 1030 - 16, [430, 1030]);
  // The number is optional here: small, top-left of the panel, with its arrow.
  if (copy.number) {
    const n = await fitLine(`#${copy.number}`, { font: 'archivo', color: '#111111', maxWidth: 190, min: 40, max: 72 });
    c.text('number', n, 30, 442, [430, 1030]);
    c.shape(arrow(50 + n.info.width + 80, 540, 40 + n.info.width + 12, 482, INK, 30));
  }
}

async function templateH(c, photos, copy, pal) {
  const panel = mix(pal.accent, '#ffffff', 0.88);
  c.shape(`<rect x="0" y="0" width="${W}" height="640" fill="${panel}"/>`);
  c.shape(squiggle(40, 34, INK));
  // Two rows of photos below: 2 + 2, or 3 + 2 with five or more.
  const rh = (860 - GUTTER) / 2;
  c.shape(`<rect x="0" y="640" width="${W}" height="860" fill="#ffffff"/>`);
  await photoRow(c, photos.length >= 5 ? photos.slice(0, 3) : photos.slice(0, 2), 640, rh);
  await photoRow(c, photos.length >= 5 ? photos.slice(3, 5) : photos.slice(2, 4), 640 + rh + GUTTER, 860 - rh - GUTTER);
  const bannerFill = readableOn(pal.accent, '#ffffff');
  const ink = readableOn(INK, panel);
  const hasBadge = !!copy.number;
  const items = await fitBlock(async max => {
    const out = [];
    if (copy.hook) {
      const t = await fitLine(copy.hook, { font: 'montserrat', color: '#ffffff', maxWidth: 600, min: 22, max: 28, spacing: 2 });
      const pw = t.info.width + 50;
      const ph = t.info.height + 22;
      out.push({ h: ph, gap: 0, draw: (cv, y, region) => {
        cv.shape(`<rect x="${(W - pw) / 2}" y="${y}" width="${pw}" height="${ph}" rx="${ph / 2}" fill="${INK}"/>`);
        cv.text('hook', t, (W - t.info.width) / 2, y + 11, region);
      } });
    }
    for (const [i, line] of [copy.headline_line1, copy.headline_line2].filter(Boolean).entries()) out.push(textItem(`headline${i + 1}`, await fitLine(line, { font: 'lilita', color: pal.accent, maxWidth: 880, min: 70, max, outline: 5, outlineColor: INK }), i ? 2 : 12));
    if (copy.category) out.push(textItem('category', await fitLine(copy.category, { font: 'montserrat', color: readableOn(pal.secondary, panel), maxWidth: 860, min: 26, max: 40 }), 10));
    if (copy.script_line) out.push(textItem('script', await fitLine(copy.script_line, { font: 'kalam', color: ink, maxWidth: 820, min: 54, max: 64 }), 12));
    if (copy.tagline) {
      const t = await fitLine(copy.tagline, { font: 'montserrat', color: '#ffffff', maxWidth: 800, min: 22, max: 24, spacing: 1 });
      const bw = t.info.width + 80;
      const bh = t.info.height + 22;
      out.push({ h: bh, gap: 10, draw: (cv, y, region) => {
        cv.shape(`<rect x="${(W - bw) / 2}" y="${y}" width="${bw}" height="${bh}" fill="${bannerFill}"/>`);
        cv.text('tagline', t, (W - t.info.width) / 2, y + 11, region);
      } });
    }
    return out;
  }, 640 - (hasBadge ? 204 : 50));
  stack(c, items, hasBadge ? 190 : 40, 640 - 16, [0, 640]);
  if (hasBadge) {
    c.shape(`<circle cx="500" cy="96" r="80" fill="${pal.accent}" stroke="#ffffff" stroke-width="6"/>${arrow(200, 66, 405, 104, INK, -40)}`);
    const n = await fitLine(copy.number, { font: 'lilita', color: '#ffffff', maxWidth: 112, min: 40, max: 100 });
    c.text('number', n, 500 - n.info.width / 2, 96 - n.info.height / 2, [16, 176]);
  }
}

const RENDER = { A: templateA, B: templateB, C: templateC, D: templateD, E: templateE, F: templateF, G: templateG, H: templateH };

// ---------------------------------------------------------------- choosing & rendering

function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** A → H by a stable hash of the key (the article URL); AUTOPILOT_TEMPLATE "A".."H" overrides it ("rotate" or empty = rotate). */
export function chooseTemplate(key, override = '') {
  const o = String(override).trim().toUpperCase();
  if (TEMPLATES.includes(o)) return o;
  return TEMPLATES[hash(key) % TEMPLATES.length];
}

/** Copy fields the templates need, filled in from the title when the AI left them out. */
export function designCopy(copy) {
  const title = String(copy.title ?? '').trim();
  const m = /^(\d{1,3})\s+(.*)$/.exec(title);
  const words = (m ? m[2] : title).replace(/\s+/g, ' ').split(' ').filter(Boolean);
  const half = Math.ceil(words.length / 2);
  const caps = v => String(v ?? '').trim().toUpperCase();
  return {
    number: /^\d{1,3}$/.test(String(copy.number ?? '')) ? String(copy.number) : copy.number === undefined && m ? m[1] : '',
    hook: caps(copy.hook),
    headline_line1: caps(copy.headline_line1) || caps(words.slice(0, half).join(' ')),
    headline_line2: copy.headline_line1 ? caps(copy.headline_line2) : caps(words.slice(half).join(' ')),
    category: caps(copy.category),
    script_word: copy.script_word === undefined ? 'Ideas' : String(copy.script_word).trim(),
    script_line: String(copy.script_line ?? '').trim(),
    banner: caps(copy.banner),
    tagline: caps(copy.tagline ?? copy.subtitle),
  };
}

/** Decodable photos with a short side of at least 300px, at most 6. */
async function usablePhotos(photos) {
  const out = [];
  for (const photo of photos.slice(0, 12)) {
    try {
      const img = sharp(photo, { limitInputPixels: 40000000 }).rotate();
      const { width = 0, height = 0, orientation = 1 } = await img.metadata();
      const short = orientation >= 5 ? Math.min(height, width) : Math.min(width, height);
      if (short < MIN_PHOTO_SIDE) continue;
      out.push(await img.toBuffer());
      if (out.length === 6) break;
    } catch { /* Ignore malformed or oversized images. */ }
  }
  return out;
}

/**
 * Renders a Pin and reports how: { png, template, palette, photos, boxes }.
 * Too few photos for the chosen template falls back to A (4 photos, or 1 top + 1 bottom).
 */
/**
 * The template actually used: too few photos for the chosen one falls back to A; a missing
 * required field (banner, script_line) moves on to the next template in rotation that has
 * everything it needs, so no template ever renders a blank element.
 */
export function pickTemplate(chosen, photoCount, fields) {
  const ready = t => photoCount >= PHOTOS_NEEDED[t] && REQUIRED_FIELDS[t].every(k => String(fields[k] ?? '').trim());
  if (photoCount < PHOTOS_NEEDED[chosen]) return 'A';
  const start = TEMPLATES.indexOf(chosen);
  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[(start + i) % TEMPLATES.length];
    if (ready(t)) return t;
  }
  return 'A';
}

/**
 * The template for Pin `variant` of an article: Pin 1 is the article's own template, later
 * Pins step 3 places along A–H (3 and 8 share no factor, so up to 8 Pins never repeat one).
 */
export function variantTemplate(key, override = '', variant = 1) {
  const first = chooseTemplate(key, override);
  if (variant <= 1 || TEMPLATES.includes(String(override).trim().toUpperCase())) return first;
  return TEMPLATES[(TEMPLATES.indexOf(first) + (variant - 1) * 3) % TEMPLATES.length];
}

/** Later Pins of an article lead with a different photo. */
export function rotatePhotos(list, variant = 1) {
  if (variant <= 1 || list.length < 2) return list;
  const k = (variant - 1) % list.length;
  return [...list.slice(k), ...list.slice(0, k)];
}

export async function renderPin(photos, copy, articleUrl, { template: override = '', key = articleUrl, variant = 1 } = {}) {
  const valid = rotatePhotos(await usablePhotos(photos), variant);
  if (!valid.length) throw new Error('No decodable photos.');
  const fields = designCopy(copy);
  const template = pickTemplate(variantTemplate(key, override, variant), valid.length, fields);
  const palette = await paletteFrom(valid, key, variant);
  const c = new Canvas();
  await RENDER[template](c, valid, fields, palette);
  const site = new URL(articleUrl).hostname.replace(/^www\./, '');
  await ctaAndDomain(c, ctaFor(template, fields.number), site);
  const png = await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } }).composite(c.layers).png({ compressionLevel: 9 }).toBuffer();
  return { png, template, palette, photos: Math.min(valid.length, template === 'A' && valid.length < 4 ? 2 : PHOTOS_NEEDED[template]), boxes: c.boxes };
}

export async function designPin(photos, copy, articleUrl, options = {}) {
  return (await renderPin(photos, copy, articleUrl, options)).png;
}
