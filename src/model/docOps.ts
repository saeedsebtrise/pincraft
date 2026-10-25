/**
 * Pure document operations. No React, no DOM — everything here is unit-tested
 * and reused by the editor, templates, variations and batch generation.
 */
import { bandRect, computeCells, getLayout } from '../collage/layouts';
import { clone, createFrame, newId } from './factory';
import type {
  AssetMeta,
  BrandKit,
  CollageSettings,
  FrameLayer,
  Id,
  Layer,
  PinDocument,
  Template,
  TextLayer,
} from './types';

export const isFrame = (l: Layer): l is FrameLayer => l.type === 'frame';
export const isText = (l: Layer): l is TextLayer => l.type === 'text';

export function frames(doc: PinDocument): FrameLayer[] {
  return doc.layers.filter(isFrame);
}

export function slotFrames(doc: PinDocument): FrameLayer[] {
  return frames(doc)
    .filter((f) => f.slot !== null)
    .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
}

/**
 * Re-flows collage frames from the collage settings. If the layout needs more
 * cells than there are slot frames, new frames are inserted just above the
 * lowest existing frame; surplus slot frames are removed (their images stay in
 * the project's asset library, so nothing is lost).
 */
export function applyCollage(doc: PinDocument, settings: CollageSettings | null): PinDocument {
  const next: PinDocument = { ...doc, collage: settings, layers: [...doc.layers] };
  if (!settings) {
    next.layers = next.layers.map((l) => (isFrame(l) && l.slot !== null ? { ...l, slot: null } : l));
    return next;
  }
  const layout = getLayout(settings.layoutId);
  if (!layout) return next;
  const cells = computeCells(layout, doc.width, doc.height, settings.region, settings.gap, settings.margin, settings.band ?? 0);
  const existing = slotFrames(next);
  const removeIds = new Set(existing.slice(layout.count).map((f) => f.id));
  next.layers = next.layers.filter((l) => !removeIds.has(l.id));

  const firstFrameIdx = next.layers.findIndex((l) => isFrame(l) && l.slot !== null);
  const insertAt = firstFrameIdx === -1 ? 0 : firstFrameIdx;
  const created: FrameLayer[] = [];
  cells.forEach((cell, i) => {
    const patch = {
      ...cell,
      rotation: 0,
      slot: i,
      cornerRadius: settings.cornerRadius,
      strokeWidth: settings.borderWidth,
      stroke: settings.borderColor,
    };
    const f = existing[i];
    if (f) {
      next.layers = next.layers.map((l) => (l.id === f.id ? { ...f, ...patch } : l));
    } else {
      created.push(createFrame({ ...patch, name: `Image ${i + 1}` }));
    }
  });
  next.layers.splice(insertAt + existing.slice(0, layout.count).length, 0, ...created);
  // Band shapes follow the open band, so changing band height keeps the text section filled.
  const band = bandRect(layout, doc.width, doc.height, settings.region, settings.margin, settings.band ?? 0);
  if (band) {
    next.layers = next.layers.map((l) => (l.role === 'band' && l.type === 'shape' ? { ...l, ...band, rotation: 0 } : l));
  }
  return next;
}

/** Scales a document to a new canvas size. Collage frames are re-flowed, everything else scales. */
export function scaleDoc(doc: PinDocument, width: number, height: number, presetId: string): PinDocument {
  const sx = width / doc.width;
  const sy = height / doc.height;
  const s = Math.min(sx, sy);
  const k = sx; // typography and strokes follow width so text sizing stays proportional to the column
  const layers = doc.layers.map((l): Layer => {
    const base = { ...l, x: l.x * sx, y: l.y * sy, width: l.width * sx, height: l.height * sy };
    if (l.type === 'text') {
      const t = base as TextLayer;
      return {
        ...t,
        fontSize: round(l.fontSize * k),
        minFontSize: round(l.minFontSize * k),
        letterSpacing: l.letterSpacing * k,
        strokeWidth: l.strokeWidth * k,
        background: {
          ...l.background,
          paddingX: l.background.paddingX * k,
          paddingY: l.background.paddingY * k,
          radius: l.background.radius * s,
          borderWidth: l.background.borderWidth * k,
        },
        shadow: { ...l.shadow, blur: l.shadow.blur * k, offsetX: l.shadow.offsetX * k, offsetY: l.shadow.offsetY * k },
      };
    }
    if (l.type === 'frame') {
      return { ...(base as FrameLayer), cornerRadius: l.cornerRadius * s, strokeWidth: l.strokeWidth * k };
    }
    return { ...base, cornerRadius: l.cornerRadius * s, strokeWidth: l.strokeWidth * k } as Layer;
  });
  const collage = doc.collage
    ? {
        ...doc.collage,
        gap: doc.collage.gap * k,
        margin: doc.collage.margin * k,
        cornerRadius: doc.collage.cornerRadius * s,
        borderWidth: doc.collage.borderWidth * k,
      }
    : null;
  const scaled: PinDocument = { ...doc, width, height, presetId, layers };
  return collage ? applyCollage(scaled, collage) : scaled;
}

const round = (v: number) => Math.round(v * 10) / 10;

/** Fresh ids for every layer (templates are instantiated many times). */
export function reId(doc: PinDocument): PinDocument {
  return {
    ...doc,
    layers: doc.layers.map((l) => ({ ...l, id: newId(l.type === 'frame' ? 'f_' : l.type === 'text' ? 't_' : 's_') })),
  };
}

const NUMBER_PREFIX = /^\s*(\d+[+]?)\s+(.*)$/;

/** Descriptive words that read well as a script accent ("Stunning", "Perfect"…). */
export const ACCENT_WORDS =
  /^(best|stunning|perfect|charming|cozy|chic|gorgeous|beautiful|cute|easy|modern|dreamy|elegant|minimalist|simple|bohemian|boho|trendy|fresh|stylish|amazing|lovely|pretty|classic|timeless|new|clever|genius)$/i;

/** Splits words into n lines with balanced character counts. */
export function balanceLines(text: string, n: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (n <= 1 || words.length <= 1) return [words.join(' '), ...Array(Math.max(0, n - 1)).fill('')];
  if (words.length <= n) return [...words, ...Array(n - words.length).fill('')];
  // Dynamic programming: minimise the squared deviation from the ideal line length.
  const total = words.join(' ').length;
  const ideal = total / n;
  const memo = new Map<string, { cost: number; breaks: number[] }>();
  const solve = (start: number, lines: number): { cost: number; breaks: number[] } => {
    const key = `${start}:${lines}`;
    const hit = memo.get(key);
    if (hit) return hit;
    let best = { cost: Infinity, breaks: [] as number[] };
    if (lines === 1) {
      const len = words.slice(start).join(' ').length;
      best = { cost: (len - ideal) ** 2, breaks: [] };
    } else {
      for (let end = start + 1; end <= words.length - (lines - 1); end++) {
        const len = words.slice(start, end).join(' ').length;
        const rest = solve(end, lines - 1);
        const cost = (len - ideal) ** 2 + rest.cost;
        if (cost < best.cost) best = { cost, breaks: [end, ...rest.breaks] };
      }
    }
    memo.set(key, best);
    return best;
  };
  const { breaks } = solve(0, n);
  const out: string[] = [];
  let s = 0;
  for (const b of [...breaks, words.length]) {
    out.push(words.slice(s, b).join(' '));
    s = b;
  }
  return out;
}

/**
 * Puts a headline into the template's text slots:
 * - a leading number goes into the badge (if the design has one),
 * - stacked "title-line" blocks get balanced lines,
 * - a single "title" layer gets the whole (remaining) headline.
 */
export function applyHeadline(doc: PinDocument, headline: string): PinDocument {
  const text = headline.trim();
  if (!text) return doc;
  const badge = doc.layers.find((l): l is TextLayer => isText(l) && l.role === 'badge');
  const lines = doc.layers
    .filter((l): l is TextLayer => isText(l) && l.role === 'title-line')
    .sort((a, b) => a.y - b.y);
  const title = doc.layers.find((l): l is TextLayer => isText(l) && l.role === 'title');
  const accent = doc.layers.find((l): l is TextLayer => isText(l) && l.role === 'accent');

  let rest = text;
  const updates = new Map<Id, string>();
  if (badge) {
    const m = text.match(NUMBER_PREFIX);
    if (m) {
      updates.set(badge.id, m[1]);
      rest = m[2];
    } else {
      updates.set(badge.id, '');
    }
  }
  if (accent) {
    // Script + bold: a leading descriptive word ("Stunning", "Perfect") becomes the script accent.
    // Otherwise the design keeps its accent if that is descriptive, so the Pin still reads naturally.
    const words = rest.split(/\s+/).filter(Boolean);
    if (words.length > 1 && ACCENT_WORDS.test(words[0])) {
      updates.set(accent.id, words[0]);
      rest = words.slice(1).join(' ');
    } else {
      // Keep the design's own accent ("best!") when it is a descriptive word, ignoring punctuation.
      updates.set(accent.id, ACCENT_WORDS.test(accent.text.trim().replace(/[^a-z]/gi, '')) ? accent.text.trim() : '');
    }
  }
  if (lines.length) {
    distributeLines(rest, lines).forEach((line, i) => updates.set(lines[i].id, line));
    if (title) updates.set(title.id, rest);
  } else if (title) {
    updates.set(title.id, rest);
  }
  return {
    ...doc,
    layers: doc.layers.map((l) => (updates.has(l.id) ? { ...(l as TextLayer), text: updates.get(l.id)! } : l)),
  };
}

/** Reads the headline currently shown in a document (inverse of applyHeadline, best effort). */
export function readHeadline(doc: PinDocument): string {
  const texts = doc.layers.filter(isText);
  const badge = texts.find((t) => t.role === 'badge')?.text ?? '';
  const lines = texts.filter((t) => t.role === 'title-line').sort((a, b) => a.y - b.y);
  const title = texts.find((t) => t.role === 'title')?.text ?? '';
  const accent = texts.find((t) => t.role === 'accent')?.text ?? '';
  const main = lines.length ? lines.map((l) => l.text).filter(Boolean).join(' ') : title;
  return [badge, accent, main].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Splits text over stacked lines (top to bottom). Lines with a wordCount take
 * exactly that many words; the others share what's left, balanced by length.
 */
export function distributeLines(text: string, lines: Pick<TextLayer, 'wordCount'>[]): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = Array(lines.length).fill('');
  let w = 0;
  let i = 0;
  while (i < lines.length) {
    const fixed = lines[i].wordCount;
    if (fixed && fixed > 0) {
      out[i] = words.slice(w, w + fixed).join(' ');
      w += fixed;
      i++;
      continue;
    }
    // A run of flexible lines gets the words not reserved by later fixed lines.
    let j = i;
    while (j < lines.length && !(lines[j].wordCount && lines[j].wordCount! > 0)) j++;
    const reservedLater = lines.slice(j).reduce((s, l) => s + (l.wordCount ?? 0), 0);
    const take = Math.max(0, words.length - w - reservedLater);
    balanceLines(words.slice(w, w + take).join(' '), j - i).forEach((t, k) => (out[i + k] = t));
    w += take;
    i = j;
  }
  return out;
}

const DETERMINERS = /^(your|the|a|an|my|our|this|every|their|his|her)$/i;

/**
 * Two-line phrase split as editorial Pins do it: break after the last
 * determiner ("to Take to Your / Next Salon Appointment"), else balance.
 */
export function splitPhrase(text: string): [string, string] {
  const words = text.split(/\s+/).filter(Boolean);
  for (let i = words.length - 2; i >= 1; i--) {
    if (DETERMINERS.test(words[i])) return [words.slice(0, i + 1).join(' '), words.slice(i + 1).join(' ')];
  }
  const [a = '', b = ''] = balanceLines(words.join(' '), 2);
  return [a, b];
}

/** Sets text on every layer with this role; several subtitle lines share the text top to bottom. */
export function setRoleText(doc: PinDocument, role: TextLayer['role'], text: string): PinDocument {
  const targets = doc.layers.filter((l): l is TextLayer => isText(l) && l.role === role).sort((a, b) => a.y - b.y);
  if (targets.length < 2 || role !== 'subtitle') {
    return { ...doc, layers: doc.layers.map((l) => (isText(l) && l.role === role ? { ...l, text } : l)) };
  }
  const parts = targets.length === 2 && !targets.some((t) => t.wordCount) ? splitPhrase(text) : distributeLines(text, targets);
  const byId = new Map(targets.map((t, k) => [t.id, parts[k]]));
  return { ...doc, layers: doc.layers.map((l) => (byId.has(l.id) ? { ...(l as TextLayer), text: byId.get(l.id)! } : l)) };
}

export function setWebsite(doc: PinDocument, website: string): PinDocument {
  if (!website) return doc;
  return {
    ...doc,
    layers: doc.layers.map((l) => (isText(l) && l.role === 'website' ? { ...l, text: website } : l)),
  };
}

export interface InstantiateOptions {
  width: number;
  height: number;
  presetId: string;
  assetIds?: Id[];
  assetMetas?: Record<Id, AssetMeta>;
  headline?: string;
  /** Supporting line for layers with role "subtitle" (e.g. the rest of the article title). */
  subtitle?: string;
  website?: string;
  brand?: BrandKit | null;
}

/** Turns a template into a fresh document at the requested size, filled with the user's content. */
export function instantiateTemplate(template: Template, o: InstantiateOptions): PinDocument {
  let doc = reId(clone(template.doc));
  doc = scaleDoc(doc, o.width, o.height, o.presetId);
  doc = { ...doc, layers: doc.layers.map((l) => (isFrame(l) ? { ...l, assetId: null } : l)) };
  if (o.brand) doc = applyBrandFonts(doc, o.brand);
  if (o.headline) doc = applyHeadline(doc, o.headline);
  const site = o.website || o.brand?.website;
  if (site) doc = setWebsite(doc, site);
  if (o.subtitle) doc = setRoleText(doc, 'subtitle', o.subtitle);
  if (o.assetIds?.length) doc = assignImages(doc, o.assetIds, o.assetMetas ?? {}, { onlyEmpty: true });
  return doc;
}

/**
 * Switches a project to another template while keeping its content:
 * images in their current order, the headline and the website.
 */
export function switchTemplate(
  current: PinDocument,
  template: Template,
  projectAssetIds: Id[],
  metas: Record<Id, AssetMeta>,
  brand: BrandKit | null,
): PinDocument {
  const used = slotFrames(current)
    .concat(frames(current).filter((f) => f.slot === null))
    .map((f) => f.assetId)
    .filter((a): a is Id => !!a);
  const ordered = [...new Set([...used, ...projectAssetIds])];
  const headline = readHeadline(current);
  const website = current.layers.find((l): l is TextLayer => isText(l) && l.role === 'website')?.text;
  const subtitle =
    current.layers
      .filter((l): l is TextLayer => isText(l) && l.role === 'subtitle')
      .sort((a, b) => a.y - b.y)
      .map((l) => l.text.trim())
      .filter(Boolean)
      .join(' ') || undefined;
  return instantiateTemplate(template, {
    width: current.width,
    height: current.height,
    presetId: current.presetId,
    assetIds: ordered,
    assetMetas: metas,
    headline,
    subtitle,
    website,
    brand,
  });
}

/**
 * Fills frames with images. Larger frames are filled first and get the image
 * whose aspect ratio fits best ("smart assignment"); without metadata the
 * upload order is kept. Images aren't reused unless allowDuplicates is set.
 */
export function assignImages(
  doc: PinDocument,
  assetIds: Id[],
  metas: Record<Id, AssetMeta>,
  opts: { onlyEmpty?: boolean; allowDuplicates?: boolean; smart?: boolean } = {},
): PinDocument {
  const { onlyEmpty = true, allowDuplicates = false, smart = false } = opts;
  const targets = frames(doc)
    .filter((f) => f.role !== 'logo' && (!onlyEmpty || !f.assetId))
    .sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));
  const inUse = new Set(frames(doc).map((f) => f.assetId).filter(Boolean) as Id[]);
  let pool = assetIds.filter((id) => allowDuplicates || !inUse.has(id));
  const result = new Map<Id, Id>();

  const order = smart ? [...targets].sort((a, b) => b.width * b.height - a.width * a.height) : targets;
  for (const f of order) {
    if (!pool.length) {
      if (!allowDuplicates || !assetIds.length) break;
      pool = [...assetIds];
    }
    let pick = pool[0];
    if (smart) {
      const want = f.width / f.height;
      pick = pool.reduce((best, id) => {
        const m = metas[id];
        const bm = metas[best];
        if (!m || !bm) return best;
        const d = Math.abs(Math.log(m.width / m.height / want));
        const bd = Math.abs(Math.log(bm.width / bm.height / want));
        return d < bd ? id : best;
      }, pool[0]);
    }
    result.set(f.id, pick);
    pool = pool.filter((id) => id !== pick);
  }
  return {
    ...doc,
    layers: doc.layers.map((l) =>
      result.has(l.id) ? { ...(l as FrameLayer), assetId: result.get(l.id)!, crop: { zoom: 1, fx: 0.5, fy: 0.5 } } : l,
    ),
  };
}

export function swapFrameImages(doc: PinDocument, aId: Id, bId: Id): PinDocument {
  const a = doc.layers.find((l) => l.id === aId);
  const b = doc.layers.find((l) => l.id === bId);
  if (!a || !b || !isFrame(a) || !isFrame(b)) return doc;
  return {
    ...doc,
    layers: doc.layers.map((l) => {
      if (l.id === aId) return { ...a, assetId: b.assetId, crop: b.crop, flipX: b.flipX, flipY: b.flipY, adjust: b.adjust };
      if (l.id === bId) return { ...b, assetId: a.assetId, crop: a.crop, flipX: a.flipX, flipY: a.flipY, adjust: a.adjust };
      return l;
    }),
  };
}

const HEADING_ROLES = new Set(['title', 'title-line', 'badge']);
const KEEP_FONT_ROLES = new Set(['accent', 'decor']); // script accents keep their script face

export function applyBrandFonts(doc: PinDocument, brand: BrandKit): PinDocument {
  return {
    ...doc,
    layers: doc.layers.map((l) => {
      if (!isText(l) || KEEP_FONT_ROLES.has(l.role)) return l;
      return { ...l, fontFamily: HEADING_ROLES.has(l.role) ? brand.headingFont : brand.bodyFont };
    }),
  };
}

/** Applies brand fonts, website and colors (accent → badges/CTA blocks, primary → dark blocks). */
export function applyBrand(doc: PinDocument, brand: BrandKit): PinDocument {
  let next = applyBrandFonts(doc, brand);
  next = setWebsite(next, brand.website);
  next = {
    ...next,
    layers: next.layers.map((l) => {
      if (!isText(l) || !l.background.enabled) return l;
      if (l.role === 'badge' || l.role === 'cta') return { ...l, background: { ...l.background, color: brand.accent } };
      if (isDark(l.background.color)) return { ...l, background: { ...l.background, color: brand.primary } };
      return l;
    }),
  };
  return next;
}

/** "Swap black/white blocks" — the quickest fresh variation of an editorial Pin. */
export function invertBlocks(doc: PinDocument): PinDocument {
  const swap = (c: string) => (isDark(c) ? '#FFFFFF' : isLight(c) ? '#111111' : c);
  return {
    ...doc,
    layers: doc.layers.map((l) => {
      if (isText(l)) {
        return {
          ...l,
          fill: swap(l.fill),
          background: { ...l.background, color: swap(l.background.color), borderColor: swap(l.background.borderColor) },
        };
      }
      if (l.type === 'shape') return { ...l, fill: swap(l.fill), stroke: swap(l.stroke) };
      if (isFrame(l)) return { ...l, stroke: swap(l.stroke) };
      return l;
    }),
    collage: doc.collage ? { ...doc.collage, borderColor: swap(doc.collage.borderColor) } : null,
    background: { ...doc.background, color: swap(doc.background.color) },
  };
}

export function documentColors(doc: PinDocument): string[] {
  const set = new Set<string>();
  if (doc.background.type === 'solid') set.add(doc.background.color.toUpperCase());
  for (const l of doc.layers) {
    if (isText(l)) {
      set.add(l.fill.toUpperCase());
      if (l.background.enabled) set.add(l.background.color.toUpperCase());
    } else if (l.type === 'shape') set.add(l.fill.toUpperCase());
    else if (l.strokeWidth > 0) set.add(l.stroke.toUpperCase());
  }
  return [...set].slice(0, 12);
}

// ---- color helpers ----
export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function luminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const isDark = (hex: string) => luminance(hexToRgb(hex)) < 0.08;
export const isLight = (hex: string) => luminance(hexToRgb(hex)) > 0.85;

export function isValidHex(v: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

export function normalizeHex(v: string): string {
  let h = v.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('');
  return ('#' + h).toUpperCase();
}
