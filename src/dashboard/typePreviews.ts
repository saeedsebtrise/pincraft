import type { DesignType } from '../config/designTypes';

/** The template shown as the picture on each design-type card. */
export const TYPE_PREVIEW_TEMPLATE: Partial<Record<DesignType, string>> = {
  'single-image': 'f6-magazine',
  'image-text-overlay': 'f6-white-box-badge',
  'image-text-panel': 'f7-bottom-panel',
  split: 'f1-center-white-badge',
  'two-image': 'f8-hair-two-image',
  'three-image': 'f3-fashion-hero-left',
  'collage-4': 'f3-editorial-white-blocks',
  'collage-5': 'f2-balcony-white',
  editorial: 'f3-editorial-black-blocks',
  listicle: 'f4-text-first-number',
  'number-badge': 'f4-badge-grid',
  'script-bold': 'f5-script-bold-white-band',
  'quote-advice': 'f7-relationship-quote',
  'home-decor': 'f9-decor-hero4-band',
  'hair-beauty': 'f8-beauty-band',
};
