/** Helpers for Bulk Design (many blog posts at once). */
import { looksLikeUrl, normalizeUrl } from './blogImport';

/** Every link in the pasted text (one per line, or separated by spaces/commas), de-duplicated. */
export function parseLinks(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\s,]+/)) {
    const t = raw.replace(/[).;]+$/, '');
    if (!looksLikeUrl(t)) continue;
    const url = normalizeUrl(t);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/**
 * The Pins for one post: the best `count` designs, shifted a little per post so a
 * batch of similar posts doesn't get the exact same set of templates. The top
 * half is the same strong core for every post; the rest rotates.
 */
export function pickForPost<T>(ranked: T[], count: number, postIndex: number): T[] {
  if (ranked.length <= count) return ranked;
  const head = Math.ceil(count / 2);
  const rest = ranked.slice(head);
  const shift = (postIndex * (count - head)) % rest.length;
  return [...ranked.slice(0, head), ...[...rest.slice(shift), ...rest.slice(0, shift)].slice(0, count - head)];
}
