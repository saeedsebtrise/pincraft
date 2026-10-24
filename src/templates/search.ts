import { DESIGN_TYPES, TEMPLATE_FAMILIES, templateDesignTypes } from '../config/designTypes';
import type { Template } from '../model/types';

/** Case-insensitive search over name, description, categories, design types and family. */
export function matchesQuery(t: Template, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = [
    t.name,
    t.description,
    ...t.categories,
    TEMPLATE_FAMILIES[t.family]?.name ?? '',
    ...templateDesignTypes(t).map((d) => DESIGN_TYPES.find((x) => x.id === d)?.label ?? ''),
  ]
    .join(' ')
    .toLowerCase();
  return words.every((w) => hay.includes(w));
}
