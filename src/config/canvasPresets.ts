/**
 * CANVAS_PRESET_CONFIG — the single registry of Pin sizes.
 *
 * Nothing else in the app hard-codes Pinterest dimensions. To add or retire a
 * format, edit this list (or let users save custom presets at runtime).
 *
 * Status classification verified against Pinterest Help Center / Business docs
 * (see PRESET_SOURCES). Re-verify periodically; Pinterest specs change.
 */

export type PresetStatus = 'official-recommended' | 'official-supported' | 'custom';
export type PresetCategory = 'pinterest' | 'blog' | 'user';

export interface CanvasPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  category: PresetCategory;
  status: PresetStatus;
  recommended: boolean;
  description: string;
}

export const PRESET_VERIFIED_ON = '2026-10-24';
export const PRESET_SOURCES = [
  'https://help.pinterest.com/en/business/article/pinterest-product-specs',
  'https://help.pinterest.com/en/article/design-a-pin',
];

export const CANVAS_PRESET_CONFIG: CanvasPreset[] = [
  {
    id: 'pin-standard',
    name: 'Pinterest Standard — Recommended',
    width: 1000,
    height: 1500,
    aspectRatio: '2:3',
    category: 'pinterest',
    status: 'official-recommended',
    recommended: true,
    description: "Pinterest's recommended 2:3 Pin. Displays fully in the home feed.",
  },
  {
    id: 'pin-portrait-3-4',
    name: 'Pinterest Portrait 3:4',
    width: 900,
    height: 1200,
    aspectRatio: '3:4',
    category: 'pinterest',
    status: 'official-supported',
    recommended: false,
    description: 'Supported Pin builder ratio. Slightly shorter than standard.',
  },
  {
    id: 'pin-portrait-4-5',
    name: 'Pinterest Portrait 4:5',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    category: 'pinterest',
    status: 'official-supported',
    recommended: false,
    description: 'Supported Pin builder ratio. Shares well with other platforms.',
  },
  {
    id: 'pin-full-vertical',
    name: 'Pinterest Full Vertical 9:16',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    category: 'pinterest',
    status: 'official-supported',
    recommended: false,
    description: 'Supported tall format. Taller than 2:3, so it may be cut off in some feed placements.',
  },
  {
    id: 'pin-square',
    name: 'Pinterest Square',
    width: 1000,
    height: 1000,
    aspectRatio: '1:1',
    category: 'pinterest',
    status: 'official-supported',
    recommended: false,
    description: 'Supported square format.',
  },
  {
    id: 'custom-blog-736',
    name: 'Custom Blog Pin — 736×1472',
    width: 736,
    height: 1472,
    aspectRatio: '1:2',
    category: 'blog',
    status: 'custom',
    recommended: false,
    description: 'Your long blog Pin. Not a Pinterest-recommended size; taller than 2:3 may be truncated in the feed.',
  },
];

export const DEFAULT_PRESET_ID = 'pin-standard';

export const STATUS_LABEL: Record<PresetStatus, string> = {
  'official-recommended': 'Official · Recommended',
  'official-supported': 'Official · Supported',
  custom: 'Custom',
};

export const CANVAS_LIMITS = { min: 100, max: 4000 };

export function simplifyRatio(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(Math.round(w), Math.round(h));
  const rw = w / g;
  const rh = h / g;
  if (rw <= 32 && rh <= 32) return `${rw}:${rh}`;
  return `1:${(h / w).toFixed(2)}`;
}

export function makeCustomPreset(id: string, name: string, width: number, height: number): CanvasPreset {
  return {
    id,
    name,
    width,
    height,
    aspectRatio: simplifyRatio(width, height),
    category: 'user',
    status: 'custom',
    recommended: false,
    description: 'Saved custom size.',
  };
}

export function findPreset(id: string, extra: CanvasPreset[] = []): CanvasPreset | undefined {
  return [...CANVAS_PRESET_CONFIG, ...extra].find((p) => p.id === id);
}

/** Matches a document size back to a preset (used after template/size changes). */
export function presetForSize(width: number, height: number, extra: CanvasPreset[] = []): CanvasPreset | undefined {
  return [...CANVAS_PRESET_CONFIG, ...extra].find((p) => p.width === width && p.height === height);
}
