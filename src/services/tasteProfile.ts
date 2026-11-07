/**
 * The user's design taste, learned from the templates they marked as favorites and the
 * designs they saved themselves. Each favorite is broken into the same traits Pinterest
 * research uses (photo layout, headline treatment, font style, number badge) plus its
 * family, photo count and topics; Auto Design then ranks look-alikes higher.
 */
import type { Template } from '../model/types';
import { designTraits } from './pinResearch';

export interface Taste {
  /** Trait → share of favorites that have it (0..1). */
  traits: Map<string, number>;
  favoriteIds: Set<string>;
  count: number;
}

const traitCache = new WeakMap<Template, string[]>();

/** What a template looks like, as short trait keys ("layout:single-photo", "font:serif", …). */
export function tasteTraits(t: Template): string[] {
  const cached = traitCache.get(t);
  if (cached) return cached;
  const d = designTraits(t, t.doc);
  const out = [
    ...[...d.layouts].map((x) => `layout:${x}`),
    ...[...d.textStyles].map((x) => `text:${x}`),
    d.font ? `font:${d.font}` : '',
    d.badge ? 'badge' : 'no-badge',
    `family:${t.family}`,
    `photos:${Math.min(t.imageCount, 5)}`,
    ...t.categories.filter((c) => c !== 'My Templates').map((c) => `topic:${c}`),
  ].filter(Boolean);
  traitCache.set(t, out);
  return out;
}

/** The taste behind a set of favorites; null when there are none yet. */
export function buildTaste(favorites: Template[]): Taste | null {
  if (!favorites.length) return null;
  const counts = new Map<string, number>();
  for (const t of favorites) for (const k of new Set(tasteTraits(t))) counts.set(k, (counts.get(k) ?? 0) + 1);
  const traits = new Map([...counts].map(([k, n]) => [k, n / favorites.length]));
  return { traits, favoriteIds: new Set(favorites.map((t) => t.id)), count: favorites.length };
}

/**
 * 0..1: how much a template looks like the user's favorites. A favorite itself scores 1;
 * any other template scores the average share of its traits among the favorites.
 */
export function tasteBoost(t: Template, taste: Taste | null | undefined): number {
  if (!taste) return 0;
  if (taste.favoriteIds.has(t.id)) return 1;
  const keys = tasteTraits(t);
  if (!keys.length) return 0;
  return keys.reduce((s, k) => s + (taste.traits.get(k) ?? 0), 0) / keys.length;
}

const LABELS: Record<string, string> = {
  'layout:single-photo': 'one big photo',
  'layout:two-photos': 'two-photo layouts',
  'layout:collage-3-4': '3–4 photo collages',
  'layout:collage-5-plus': 'big collages',
  'layout:band-between-photos': 'a headline band between photos',
  'layout:text-panel': 'a text panel',
  'layout:text-only': 'text-only Pins',
  'text:solid-band': 'bold headline bands',
  'text:white-blocks': 'white text blocks',
  'text:pill-labels': 'pill labels',
  'text:outlined-sticker': 'outlined sticker text',
  'text:overlay-no-box': 'text right on the photo',
  'text:serif-editorial': 'editorial serif headlines',
  'text:script-accent': 'script accents',
  'text:distressed': 'distressed type',
  'font:condensed-sans': 'tall condensed fonts',
  'font:rounded-sans': 'rounded fonts',
  'font:bold-sans': 'bold sans fonts',
  'font:serif': 'serif fonts',
  'font:script': 'script fonts',
  badge: 'number badges',
};

/** The few traits that most define the taste, in plain words, for the UI. */
export function tasteSummary(taste: Taste | null | undefined, max = 3): string[] {
  if (!taste) return [];
  return [...taste.traits]
    .filter(([k, share]) => LABELS[k] && share >= 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => LABELS[k]);
}
