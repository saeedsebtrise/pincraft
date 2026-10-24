/**
 * "Recommend a design" — ranks templates for an article title using local
 * keyword rules. Suggestions only; the user can always pick any design.
 */
import { templateDesignTypes } from '../config/designTypes';
import { ACCENT_WORDS } from '../model/docOps';
import type { Template, TemplateCategory } from '../model/types';

const TOPIC_RULES: [RegExp, TemplateCategory[], string][] = [
  [/balcon/i, ['Balcony', 'Home Decor'], 'balcony topic'],
  [/patio|porch|backyard|garden|outdoor|deck\b/i, ['Patio', 'Home Decor'], 'outdoor living topic'],
  [/living room|lounge|family room/i, ['Living Room', 'Home Decor'], 'living room topic'],
  [/\bfall\b|autumn|halloween|thanksgiving|harvest/i, ['Fall Decor', 'Home Decor'], 'seasonal decor topic'],
  [/decor|room|bedroom|kitchen|bathroom|home|apartment|interior|entryway|shelf|shelves/i, ['Home Decor'], 'home decor topic'],
  [/hair|haircut|bob\b|lob\b|braid|bangs|balayage|bronde|blonde|brunette|curl|updo|ponytail/i, ['Hair', 'Beauty'], 'hair topic'],
  [/makeup|nail|skin|beauty|lip|eyeshadow|lashes|glam/i, ['Beauty'], 'beauty topic'],
  [/outfit|fashion|wear|dress|capsule|wardrobe|jeans|boots/i, ['Fashion'], 'fashion topic'],
  [/recipe|dinner|cook|bake|meal|food|chicken|pasta|salad|dessert|breakfast/i, ['Food / Recipe'], 'recipe topic'],
  [/relationship|love|marriage|boyfriend|girlfriend|husband|wife|dating|couple/i, ['Relationship'], 'relationship topic'],
  [/quote|saying|affirmation|mantra/i, ['Quote'], 'quote topic'],
  [/how to|step[- ]by[- ]step|guide|diy|tutorial/i, ['How-To'], 'how-to topic'],
];


export interface Recommendation {
  template: Template;
  score: number;
  reasons: string[];
}

export function recommendTemplates(
  articleTitle: string,
  templates: Template[],
  opts: { presetId?: string; imageCount?: number; limit?: number } = {},
): Recommendation[] {
  const t = articleTitle.trim();
  if (!t) return [];
  const hasNumber = /^\s*\d+/.test(t);
  const firstWord = t.replace(/^\s*\d+\+?\s+/, '').split(/\s+/)[0] ?? '';
  const scriptable = ACCENT_WORDS.test(firstWord);
  const cats = new Map<TemplateCategory, string>();
  for (const [re, list, why] of TOPIC_RULES) if (re.test(t)) list.forEach((c) => cats.set(c, why));

  const scored = templates
    .filter((tp) => tp.imageCount > 0)
    .map((tp): Recommendation => {
      const reasons: string[] = [];
      let score = 0;
      const types = templateDesignTypes(tp);
      const matched = tp.categories.filter((c) => cats.has(c));
      if (matched.length) {
        score += 3 + matched.length;
        reasons.push(`Fits your ${cats.get(matched[0])}`);
      }
      if (hasNumber && types.includes('number-badge')) {
        score += 3;
        reasons.push('Number badge for your list count');
      } else if (hasNumber && types.includes('listicle')) {
        score += 2;
        reasons.push('Listicle layout');
      }
      if (scriptable && types.includes('script-bold')) {
        score += 2;
        reasons.push(`“${firstWord}” works as a script accent`);
      }
      if (opts.imageCount && tp.imageCount <= opts.imageCount) {
        score += 1;
        if (tp.imageCount === opts.imageCount) reasons.push(`Uses all ${opts.imageCount} of your images`);
      }
      const nativeBlog = tp.doc.width === 736 && tp.doc.height === 1472;
      if (opts.presetId === 'custom-blog-736' ? nativeBlog : !nativeBlog) score += 0.5;
      return { template: tp, score, reasons };
    })
    .filter((r) => r.score > 1)
    .sort((a, b) => b.score - a.score);

  // Prefer variety: one per family first, then fill.
  const limit = opts.limit ?? 6;
  const out: Recommendation[] = [];
  const families = new Set<number>();
  for (const r of scored) {
    if (out.length >= limit) break;
    if (!families.has(r.template.family)) {
      out.push(r);
      families.add(r.template.family);
    }
  }
  for (const r of scored) {
    if (out.length >= limit) break;
    if (!out.includes(r)) out.push(r);
  }
  return out;
}
