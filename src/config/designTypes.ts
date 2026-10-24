import type { Template, TemplateCategory } from '../model/types';

/**
 * "Choose a Design Type" — the first creative decision in the New Pin flow,
 * and the primary axis of the template gallery. Collage is one option among many.
 */
export type DesignType =
  | 'single-image'
  | 'image-text-overlay'
  | 'image-text-panel'
  | 'split'
  | 'two-image'
  | 'three-image'
  | 'collage-4'
  | 'collage-5'
  | 'editorial'
  | 'listicle'
  | 'number-badge'
  | 'script-bold'
  | 'quote-advice'
  | 'home-decor'
  | 'hair-beauty'
  | 'blank';

export interface DesignTypeDef {
  id: DesignType;
  label: string;
  hint: string;
}

export const DESIGN_TYPES: DesignTypeDef[] = [
  { id: 'single-image', label: 'Single Image Pin', hint: 'One photo carries the Pin' },
  { id: 'image-text-overlay', label: 'Single Image + Text Overlay', hint: 'Big headline on the photo' },
  { id: 'image-text-panel', label: 'Single Image + Text Panel', hint: 'Photo plus a readable text panel' },
  { id: 'split', label: 'Split Layout Pin', hint: 'Images split by a headline band' },
  { id: 'two-image', label: '2-Image Pin', hint: 'Two photos' },
  { id: 'three-image', label: '3-Image Pin', hint: 'Three photos' },
  { id: 'collage-4', label: '4-Image Collage Pin', hint: '2 top + 2 bottom, hero + 3…' },
  { id: 'collage-5', label: '5-Image Collage Pin', hint: '2 top + band + 3 bottom, hero + 4…' },
  { id: 'editorial', label: 'Editorial Blog Pin', hint: 'Magazine blocks, thin dividers' },
  { id: 'listicle', label: 'Listicle Pin', hint: 'Text-first “ideas” headlines' },
  { id: 'number-badge', label: 'Number Badge Pin', hint: 'Large 24 / 32 / 50 badge' },
  { id: 'script-bold', label: 'Script + Bold Typography', hint: 'Script accent word + bold caps' },
  { id: 'quote-advice', label: 'Quote / Advice Pin', hint: 'Text-led advice or quotes' },
  { id: 'home-decor', label: 'Home Decor Style Pin', hint: 'Balcony, patio, room, fall decor' },
  { id: 'hair-beauty', label: 'Hair / Beauty Style Pin', hint: 'Hairstyles, color, makeup' },
  { id: 'blank', label: 'Blank Custom Canvas', hint: 'Build your own layout' },
];

export type TemplateFamilyId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export const TEMPLATE_FAMILIES: Record<TemplateFamilyId, { name: string; summary: string }> = {
  1: { name: '2 Top + 2 Bottom + Center Text', summary: 'Four photos split by a large center text section.' },
  2: { name: '2 Top + Headline + 3 Bottom', summary: 'Five photos with a headline band — great for decor and balcony ideas.' },
  3: { name: '4-Image Editorial Collage', summary: 'Thin dividers, bold center or stacked title, optional script accent.' },
  4: { name: 'Number Badge Listicle', summary: 'Large number badge with a big keyword headline.' },
  5: { name: 'Script + Bold Mixed Font', summary: 'One script word with bold uppercase words.' },
  6: { name: 'Single Image + Bold Overlay', summary: 'Large background photo with a big title.' },
  7: { name: 'Single Image + Text Panel', summary: 'One photo and a separate readable text panel.' },
  8: { name: 'Hair / Beauty Style', summary: 'Image-driven, number badge, clean white text blocks.' },
  9: { name: 'Home Decor / Balcony / Patio', summary: 'Warm lifestyle collages with a central text section.' },
  10: { name: 'Blank Editorial Canvas', summary: 'Empty canvas — add your own frames and text.' },
};

const HOME_CATS: TemplateCategory[] = ['Home Decor', 'Balcony', 'Patio', 'Living Room', 'Fall Decor'];
const HAIR_CATS: TemplateCategory[] = ['Hair', 'Beauty'];

/**
 * Design types for a template. Structural types (image count, badge, script
 * accent, category) are derived from the document, so user-saved templates are
 * classified automatically; stylistic types (overlay, panel, editorial…) are explicit.
 */
export function templateDesignTypes(t: Template): DesignType[] {
  const set = new Set<DesignType>(t.designTypes ?? []);
  const n = t.imageCount;
  if (n === 0) set.add('blank');
  if (n === 1) set.add('single-image');
  if (n === 2) set.add('two-image');
  if (n === 3) set.add('three-image');
  if (n === 4) set.add('collage-4');
  if (n === 5) set.add('collage-5');
  const roles = new Set(t.doc.layers.map((l) => l.role));
  if (roles.has('badge')) set.add('number-badge');
  if (roles.has('accent')) set.add('script-bold');
  if (t.categories.some((c) => HOME_CATS.includes(c))) set.add('home-decor');
  if (t.categories.some((c) => HAIR_CATS.includes(c))) set.add('hair-beauty');
  if (t.categories.includes('Listicle')) set.add('listicle');
  if (t.categories.includes('Quote') || t.categories.includes('Relationship')) set.add('quote-advice');
  return [...set];
}
