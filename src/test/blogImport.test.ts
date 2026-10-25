import { describe, expect, it } from 'vitest';
import { FetchError, isPrivateAddress, parsePage, parsePublicUrl } from '../../server/pageFetch.mjs';
import { frames } from '../model/docOps';
import type { AssetMeta } from '../model/types';
import { autoDesign, withPhotos } from '../services/autoDesign';
import { looksLikeUrl, normalizeUrl, siteHost } from '../services/blogImport';
import { BUILTIN_TEMPLATES } from '../templates/builtins';

const POST = `<!doctype html><html><head>
<title>50 Lob Haircut Ideas to Take to Your Next Salon Appointment | Luxe Hairstyles</title>
<meta property="og:site_name" content="Luxe Hairstyles">
<meta property="og:title" content="50 Lob Haircut Ideas to Take to Your Next Salon Appointment">
<meta property="og:description" content="Fresh lob cuts &amp; colors.">
<meta property="og:image" content="https://cdn.luxe.com/wp-content/uploads/2026/10/lob-featured.jpg">
</head><body>
<header><img src="/wp-content/uploads/logo.png" width="180" height="60"></header>
<article class="post">
  <h1>50 Lob Haircut Ideas</h1>
  <img src="/wp-content/uploads/2026/10/lob-1-300x200.jpg" srcset="/wp-content/uploads/2026/10/lob-1-300x200.jpg 300w, /wp-content/uploads/2026/10/lob-1-1024x1536.jpg 1024w" alt="Choppy lob">
  <img data-src="https://cdn.luxe.com/wp-content/uploads/2026/10/lob-2.webp" src="data:image/gif;base64,R0lGOD" alt="Soft waves">
  <img src="https://cdn.luxe.com/wp-content/uploads/2026/10/lob-featured-1024x683.jpg" alt="dupe of featured">
  <img src="https://secure.gravatar.com/avatar/abc.jpg" alt="author">
  <img src="/icons/share-pin.png" alt="pin it">
  <img src="/wp-content/uploads/2026/10/tiny.jpg" width="80" height="80">
</article></body></html>`;

describe('blog page reader (server)', () => {
  it('reads the post title, description and photos in reading order', () => {
    const page = parsePage(POST, 'https://www.luxe.com/lob-haircuts/');
    expect(page.title).toBe('50 Lob Haircut Ideas to Take to Your Next Salon Appointment');
    expect(page.description).toBe('Fresh lob cuts & colors.');
    expect(page.siteName).toBe('Luxe Hairstyles');
    expect(page.images.map((i) => i.url)).toEqual([
      'https://cdn.luxe.com/wp-content/uploads/2026/10/lob-featured.jpg',
      'https://www.luxe.com/wp-content/uploads/2026/10/lob-1-1024x1536.jpg', // largest srcset entry, made absolute
      'https://cdn.luxe.com/wp-content/uploads/2026/10/lob-2.webp', // lazy-loaded data-src
    ]);
  });
  it('falls back to <h1> and the <title> without the site name', () => {
    expect(parsePage('<title>Cozy Fall Porch Ideas | My Blog</title>', 'https://a.com/x').title).toBe('Cozy Fall Porch Ideas');
    expect(parsePage('<h1>Easy &amp; Cheap Patio Ideas</h1>', 'https://a.com/x').title).toBe('Easy & Cheap Patio Ideas');
  });
  it('refuses private, local and non-web addresses', () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.10', '172.20.0.1', '169.254.169.254', '100.64.0.1', '::1', 'fd00::1', '::ffff:127.0.0.1']) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    expect(isPrivateAddress('93.184.216.34')).toBe(false);
    for (const bad of ['http://localhost:5173/', 'http://127.0.0.1/', 'http://[::1]/', 'file:///etc/passwd', 'ftp://a.com/x', 'http://user:pw@a.com/', 'not a url']) {
      expect(() => parsePublicUrl(bad), bad).toThrow(FetchError);
    }
    expect(parsePublicUrl('https://www.luxe.com/post').hostname).toBe('www.luxe.com');
  });
});

describe('blog link in Auto Design', () => {
  it('tells links from titles', () => {
    expect(looksLikeUrl('https://luxe.com/lob-haircuts/')).toBe(true);
    expect(looksLikeUrl('luxe.com/lob-haircuts')).toBe(true);
    expect(looksLikeUrl('50 Lob Haircut Ideas')).toBe(false);
    expect(looksLikeUrl('lob haircut')).toBe(false);
    expect(normalizeUrl('luxe.com/x')).toBe('https://luxe.com/x');
    expect(siteHost('https://www.luxehairstyles.com/post')).toBe('luxehairstyles.com');
  });
  it('fills every frame with the post photos, starting each design at a different photo', () => {
    const metas: Record<string, AssetMeta> = Object.fromEntries(
      ['a1', 'a2', 'a3'].map((id) => [id, { id, name: id, mime: 'image/jpeg', width: 1000, height: 1500, size: 1, createdAt: 0 }]),
    );
    const t = BUILTIN_TEMPLATES.find((x) => x.id === 'hb-sticker-serif-curly')!; // 4 frames
    const d0 = withPhotos(t.doc, ['a1', 'a2', 'a3'], metas, 0);
    const d1 = withPhotos(t.doc, ['a1', 'a2', 'a3'], metas, 1);
    expect(frames(d0).every((f) => f.assetId)).toBe(true);
    expect(new Set(frames(d0).map((f) => f.assetId))).toEqual(new Set(['a1', 'a2', 'a3']));
    expect(frames(d0).map((f) => f.assetId)).not.toEqual(frames(d1).map((f) => f.assetId));

    const out = autoDesign({ title: '50 Lob Haircut Ideas', assetIds: ['a1', 'a2', 'a3'], assetMetas: metas }, BUILTIN_TEMPLATES, { measure: () => 1, limit: 10 });
    for (const r of out) expect(frames(r.doc).filter((f) => f.role !== 'logo').every((f) => f.assetId), r.template.id).toBe(true);
  });
});
