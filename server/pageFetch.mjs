/**
 * Blog post reader for "Blog URL → Pins".
 *
 * Browsers can't read other websites (CORS), so the dev server (vite.config.ts)
 * and the optional proxy server (server/ai-proxy.mjs) expose two GET routes:
 *
 *   /api/page?url=…   → { url, title, description, siteName, images: [{ url, alt }] }
 *   /api/image?url=…  → the image bytes (so the browser can store and draw them)
 *
 * Safety: only http(s) URLs on public addresses are fetched. Every hostname —
 * including each redirect — is resolved at connect time and private, loopback
 * and link-local addresses are refused, so the server can't be pointed at your
 * own machine or network. Pages are capped at 3 MB, images at 15 MB, 15 s each.
 */
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import zlib from 'node:zlib';

const PAGE_MAX = 3 * 1024 * 1024;
const IMAGE_MAX = 15 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
const MAX_IMAGES = 30;
const UA = 'Mozilla/5.0 (compatible; PinCraftBot/1.0; +https://pincraft.app) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

export class FetchError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------- address safety

/** True for addresses that must never be fetched: loopback, private, link-local, CGNAT, multicast, etc. */
export function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb') || v.startsWith('ff');
  }
  return true;
}

/** DNS lookup used for every connection: refuses names that resolve to a private address. */
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = Array.isArray(addresses) ? addresses : [{ address: addresses, family: options.family || 4 }];
    const bad = list.find((a) => isPrivateAddress(a.address));
    if (bad || !list.length) return callback(new FetchError('That address is not allowed.', 400));
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

export function parsePublicUrl(raw) {
  let u;
  try {
    u = new URL(String(raw || '').trim());
  } catch {
    throw new FetchError('That is not a valid link.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new FetchError('Only http and https links can be read.');
  if (u.username || u.password) throw new FetchError('Links with a username or password are not allowed.');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new FetchError('That address is not allowed.');
  }
  if (net.isIP(host) && isPrivateAddress(host)) throw new FetchError('That address is not allowed.');
  return u;
}

// ---------------------------------------------------------------- fetching

function getOnce(url, accept) {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.get(
      url,
      { lookup: safeLookup, timeout: TIMEOUT_MS, headers: { 'User-Agent': UA, Accept: accept, 'Accept-Encoding': 'gzip, deflate, br', 'Accept-Language': 'en' } },
      resolve,
    );
    req.on('timeout', () => req.destroy(new FetchError('The site took too long to answer.', 504)));
    req.on('error', (e) => reject(e instanceof FetchError ? e : new FetchError(`Couldn't reach that site (${e.code || e.message}).`, 502)));
  });
}

function readBody(res, max) {
  return new Promise((resolve, reject) => {
    const enc = String(res.headers['content-encoding'] || '').toLowerCase();
    const stream =
      enc === 'gzip' ? res.pipe(zlib.createGunzip()) : enc === 'deflate' ? res.pipe(zlib.createInflate()) : enc === 'br' ? res.pipe(zlib.createBrotliDecompress()) : res;
    const chunks = [];
    let size = 0;
    stream.on('data', (c) => {
      size += c.length;
      if (size > max) {
        res.destroy();
        reject(new FetchError('That file is too large.', 413));
      } else chunks.push(c);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', () => reject(new FetchError('The download was interrupted.', 502)));
  });
}

/** GET with redirects (each one re-checked), size cap and timeout. */
export async function safeGet(raw, { accept, max }) {
  let url = parsePublicUrl(raw);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await getOnce(url, accept);
    const status = res.statusCode || 0;
    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume();
      url = parsePublicUrl(new URL(res.headers.location, url).toString());
      continue;
    }
    if (status === 401 || status === 403) {
      res.resume();
      throw new FetchError('That site blocks automatic readers. Type the title instead and upload your photos.', 502);
    }
    if (status < 200 || status >= 300) {
      res.resume();
      throw new FetchError(`The site answered with an error (${status}).`, 502);
    }
    return { url, type: String(res.headers['content-type'] || '').toLowerCase(), body: await readBody(res, max) };
  }
  throw new FetchError('Too many redirects.', 502);
}

// ---------------------------------------------------------------- HTML parsing (no DOM on the server)

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

export function decodeEntities(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

const clean = (s) => decodeEntities(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? '');
  }
  return out;
}

/** Largest candidate in a srcset ("a.jpg 300w, b.jpg 1024w"). */
function largestFromSrcset(srcset) {
  let best = null;
  let bestW = -1;
  for (const part of String(srcset).split(',')) {
    const [u, d] = part.trim().split(/\s+/);
    if (!u) continue;
    const w = d ? parseFloat(d) * (d.endsWith('x') ? 1000 : 1) : 0;
    if (w > bestW) {
      best = u;
      bestW = w;
    }
  }
  return best;
}

const SKIP_IMAGE = /(logo|icon|favicon|avatar|gravatar|emoji|sprite|spinner|loader|placeholder|pixel|badge|button|banner-ad|\/ads?\/|doubleclick|facebook\.com\/tr|pinit|share|widget|blank\.gif)/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|avif)(\?|#|$)/i;

/** Key that treats WordPress size variants (photo-300x200.jpg) and query strings as the same image. */
const imageKey = (u) => u.replace(/[?#].*$/, '').replace(/-\d{2,5}x\d{2,5}(?=\.[a-z]{3,4}$)/i, '').replace(/-scaled(?=\.[a-z]{3,4}$)/i, '').toLowerCase();

/**
 * Title, description and photos of an article page. The featured image
 * (og:image) comes first, then photos inside the article in reading order.
 */
export function parsePage(html, pageUrl) {
  const metas = {};
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const key = (a.property || a.name || a.itemprop || '').toLowerCase();
    if (key && a.content && !(key in metas)) metas[key] = a.content;
  }
  const ogImages = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((m) => attrs(m[0]))
    .filter((a) => /^(og:image(:secure_url)?|og:image:url|twitter:image(:src)?)$/i.test(a.property || a.name || ''))
    .map((a) => a.content);

  const baseHref = attrs(html.match(/<base\b[^>]*>/i)?.[0] ?? '').href;
  const base = (() => {
    try {
      return new URL(baseHref || pageUrl, pageUrl);
    } catch {
      return new URL(pageUrl);
    }
  })();
  const abs = (u) => {
    try {
      const x = new URL(u.trim(), base);
      return x.protocol === 'http:' || x.protocol === 'https:' ? x.toString() : null;
    } catch {
      return null;
    }
  };

  const siteName = clean(metas['og:site_name'] || metas['application-name'] || '');
  const h1 = clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? '');
  let docTitle = clean(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  // "Post Title | Site Name" / "Post Title - Site Name"
  if (siteName && docTitle.toLowerCase().endsWith(siteName.toLowerCase())) docTitle = docTitle.slice(0, -siteName.length).replace(/[\s|–—:-]+$/, '');
  else docTitle = docTitle.replace(/\s+[|–—]\s+[^|–—]+$/, '');
  const title = clean(metas['og:title'] || metas['twitter:title'] || '') || h1 || docTitle;
  const description = clean(metas['og:description'] || metas['twitter:description'] || metas.description || '');

  // Prefer the article body when the page marks one.
  const body =
    html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ||
    html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ||
    html.match(/<div\b[^>]*class="[^"]*(entry-content|post-content|article-content|post-body)[^"]*"[\s\S]*$/i)?.[0] ||
    html;

  const seen = new Set();
  const images = [];
  const add = (u, alt = '') => {
    const url = u && abs(u);
    if (!url || images.length >= MAX_IMAGES) return;
    if (/^data:/i.test(url) || /\.(svg|gif)(\?|#|$)/i.test(url) || SKIP_IMAGE.test(url)) return;
    const key = imageKey(url);
    if (seen.has(key)) return;
    seen.add(key);
    images.push({ url, alt: clean(alt).slice(0, 200) });
  };

  ogImages.forEach((u) => add(u, title));
  for (const m of body.matchAll(/<img\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const w = Number(a.width) || 0;
    const h = Number(a.height) || 0;
    if ((w && w < 200) || (h && h < 200)) continue;
    const src =
      a['data-orig-file'] ||
      largestFromSrcset(a['data-srcset'] || a['data-lazy-srcset'] || a.srcset || '') ||
      a['data-lazy-src'] || a['data-src'] || a['data-original'] || a.src;
    if (!src) continue;
    if (!IMAGE_EXT.test(src) && !/\/(wp-content|uploads|images?|media|cdn)\//i.test(src)) continue;
    add(src, a.alt || '');
  }

  return { url: String(pageUrl), title, description, siteName, images };
}

// ---------------------------------------------------------------- routes

export async function readPage(raw) {
  const { url, type, body } = await safeGet(raw, { accept: 'text/html,application/xhtml+xml', max: PAGE_MAX });
  if (type && !/html|xml/.test(type)) throw new FetchError('That link is not a web page.', 415);
  const page = parsePage(body.toString('utf8'), url.toString());
  if (!page.title && !page.images.length) throw new FetchError("Couldn't find a title or photos on that page.", 422);
  return page;
}

export async function readImage(raw) {
  const { type, body } = await safeGet(raw, { accept: 'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8', max: IMAGE_MAX });
  if (!type.startsWith('image/') || type.includes('svg')) throw new FetchError('That link is not a photo.', 415);
  return { type: type.split(';')[0], body };
}

/** Connect-style middleware for GET /api/page and GET /api/image (used by Vite and the proxy server). */
export function pageMiddleware() {
  return async (req, res, next) => {
    const u = new URL(req.url || '/', 'http://localhost');
    if (req.method !== 'GET' || (u.pathname !== '/api/page' && u.pathname !== '/api/image')) return next?.();
    const target = u.searchParams.get('url');
    try {
      if (u.pathname === '/api/page') {
        const page = await readPage(target);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(page));
      } else {
        const img = await readImage(target);
        res.writeHead(200, { 'Content-Type': img.type, 'Content-Length': img.body.length, 'Cache-Control': 'private, max-age=3600' });
        res.end(img.body);
      }
    } catch (e) {
      const status = e instanceof FetchError ? e.status : 500;
      if (status >= 500 && !(e instanceof FetchError)) console.error('[page-fetch]', e);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e instanceof FetchError ? e.message : 'Something went wrong reading that page.' }));
    }
  };
}
