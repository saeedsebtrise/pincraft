import sharp from 'sharp';
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
/** Use measured glyphs and word/character wrapping, including wide or unbroken titles. */
export async function fittedText(text, { width, height, size, color, bold = false }) {
  const rendered = await sharp({ text: {
    text: `<span foreground="${color}">${escape(text)}</span>`,
    font: `DejaVu Sans ${bold ? 'Bold ' : ''}${size}`,
    width, align: 'center', wrap: 'word-char', rgba: true,
  } }).png().toBuffer();
  return sharp(rendered).resize({ width, height, fit: 'inside', withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
}
export async function designPin(photos, copy, articleUrl) {
  const valid = [];
  for (const photo of photos.slice(0, 10)) {
    try {
      const normalized = await sharp(photo, { limitInputPixels: 40000000 }).rotate().toBuffer();
      valid.push(normalized);
      if (valid.length === 4) break;
    } catch { /* Ignore malformed or oversized images. */ }
  }
  if (!valid.length) throw new Error('No decodable photos.');
  const list = /^\d+\b/.test(copy.title);
  const count = list && valid.length >= 4 ? 4 : Math.min(2, valid.length);
  const layers = [];
  const regions = count === 4 ? [[0,0,500,500],[500,0,500,500],[0,1000,500,500],[500,1000,500,500]] : count === 2 ? [[0,0,1000,500],[0,1000,1000,500]] : [[0,0,1000,1500]];
  for (let i = 0; i < regions.length; i++) {
    const [left, top, width, height] = regions[i];
    layers.push({ input: await sharp(valid[i]).resize(width, height, { fit: 'cover' }).png().toBuffer(), left, top });
  }
  const svg = '<svg width="1000" height="1500"><rect x="28" y="500" width="944" height="500" rx="24" fill="#fffaf2"/><rect x="80" y="544" width="84" height="8" fill="#bd2345"/><rect y="1442" width="1000" height="58" fill="#241c20"/></svg>';
  layers.push({ input: Buffer.from(svg), left: 0, top: 0 });
  for (const [text, box] of [
    [copy.title, { width: 840, height: 285, size: 66, color: '#241c20', bold: true, y: 580 }],
    [copy.cta, { width: 840, height: 60, size: 28, color: '#a32140', y: 890 }],
    [new URL(articleUrl).hostname, { width: 880, height: 36, size: 24, color: '#ffffff', y: 1453 }],
  ]) {
    const { data, info } = await fittedText(text, box);
    layers.push({ input: data, left: Math.round((1000 - info.width) / 2), top: box.y + Math.round((box.height - info.height) / 2) });
  }
  return sharp({ create: { width: 1000, height: 1500, channels: 3, background: '#fffaf2' } }).composite(layers).png({ compressionLevel: 9 }).toBuffer();
}
