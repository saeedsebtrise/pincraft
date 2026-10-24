export const PRESET_COLORS = [
  '#000000', '#1F1F1F', '#4A4A4A', '#8C8C8C', '#D9D9D9', '#FFFFFF',
  '#F6F1EB', '#E9DFD3', '#C8B6A6', '#8B6F5A', '#5B4636', '#2E2420',
  '#F9E5E5', '#E8B4B8', '#C7797D', '#A4161A', '#E60023', '#7A1E2C',
  '#EAF2E3', '#A3B18A', '#588157', '#344E41', '#DCE8F5', '#5B7DB1',
  '#1D3557', '#FFF3C4', '#F4C430', '#E9A23B', '#F2E8FF', '#7B5EA7',
];

/** Safe-area insets as fractions of canvas width/height. Guides only — never exported. */
export const SAFE_AREA = { left: 0.06, right: 0.06, top: 0.05, bottom: 0.08 };

/** Typical Pinterest home-feed column width on mobile, in CSS px. */
export const FEED_PREVIEW_WIDTH = 180;

/** Text rendered smaller than this fraction of canvas width is flagged as hard to read in the feed. */
export const MIN_READABLE_TEXT_RATIO = 0.026;

/** Images displayed above this upscale factor are flagged as low resolution. */
export const LOW_RES_UPSCALE = 1.35;

export const UPLOAD_LIMITS = {
  maxFileBytes: 30 * 1024 * 1024,
  maxDimension: 12000,
  maxImagesPerProject: 10,
  previewMaxDimension: 2560,
};
