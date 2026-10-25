/**
 * Document model. Every editable property lives here and serializes to JSON,
 * so a project reopens exactly as saved and a template is just a document.
 *
 * Project
 * ├ doc: PinDocument (canvas size, background, collage settings, layers)
 * ├ assetIds → AssetMeta (+ original blobs in the asset repository)
 * └ meta (article title, headline, template, brand kit, timestamps)
 */

export type Id = string;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LayerType = 'frame' | 'text' | 'shape';

/** Semantic role lets templates, headline application and brand kits find layers. */
export type LayerRole =
  | 'title'
  | 'title-line'
  | 'subtitle'
  | 'body'
  | 'website'
  | 'cta'
  | 'badge'
  | 'accent'
  | 'band'
  | 'logo'
  | 'decor'
  | 'none';

export interface LayerBase extends Rect {
  id: Id;
  type: LayerType;
  name: string;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  role: LayerRole;
}

export interface ImageAdjustments {
  brightness: number; // -1..1
  contrast: number; // -100..100
  saturation: number; // -2..2
  warmth: number; // -1..1
  blur: number; // 0..40
  grayscale: boolean;
}

/** Non-destructive crop: focal point (0..1) of the source shown at frame center, plus zoom ≥ 1. */
export interface FrameCrop {
  zoom: number;
  fx: number;
  fy: number;
}

export interface FrameLayer extends LayerBase {
  type: 'frame';
  assetId: Id | null;
  fit: 'cover' | 'contain';
  crop: FrameCrop;
  flipX: boolean;
  flipY: boolean;
  adjust: ImageAdjustments;
  cornerRadius: number;
  strokeWidth: number;
  stroke: string;
  placeholderFill: string;
  /** Index in the collage layout; null when the frame is free-form. */
  slot: number | null;
}

export interface TextBackground {
  enabled: boolean;
  /** rect + radius covers square and rounded square. */
  shape: 'rect' | 'circle' | 'pill';
  color: string;
  opacity: number;
  paddingX: number;
  paddingY: number;
  radius: number;
  borderWidth: number;
  borderColor: string;
  /** Background hugs the text instead of filling the layer box. */
  hug: boolean;
}

export interface TextShadow {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}

export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

export interface TextLayer extends LayerBase {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic: boolean;
  underline: boolean;
  fill: string;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  lineHeight: number;
  letterSpacing: number;
  textTransform: TextTransform;
  /** When on, fontSize is the maximum and the rendered size shrinks to fit the box. */
  autoFit: boolean;
  minFontSize: number;
  /**
   * For stacked headline lines (title-line / subtitle): how many words of the
   * headline this line takes, e.g. 1 for a keyword line like "BALCONY".
   * Lines without it share the remaining words evenly.
   */
  wordCount?: number;
  background: TextBackground;
  shadow: TextShadow;
  strokeWidth: number;
  stroke: string;
}

export interface ShapeLayer extends LayerBase {
  type: 'shape';
  shape: 'rect' | 'ellipse' | 'line';
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export type Layer = FrameLayer | TextLayer | ShapeLayer;

export interface Background {
  type: 'solid' | 'gradient' | 'image' | 'transparent';
  color: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  assetId: Id | null;
}

/** Fractional rect (0..1) of the canvas. */
export type Rect01 = Rect;

export interface CollageSettings {
  layoutId: string;
  region: Rect01;
  /** For band layouts: height (fraction of region) of the open text band between image rows. */
  band: number;
  gap: number;
  margin: number;
  cornerRadius: number;
  borderWidth: number;
  borderColor: string;
}

export interface PinDocument {
  width: number;
  height: number;
  presetId: string;
  background: Background;
  collage: CollageSettings | null;
  /** Index 0 is the bottom of the stack. */
  layers: Layer[];
}

export interface ProjectMeta {
  articleTitle: string;
  headline: string;
  keyword: string;
  templateId: string | null;
  brandKitId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: Id;
  name: string;
  schemaVersion: 1;
  /** The page being edited. Mirrors pages[activePage] (kept in sync on save). */
  doc: PinDocument;
  /** All Pins (pages) in this project — e.g. several designs for one article. */
  pages: PinDocument[];
  activePage: number;
  assetIds: Id[];
  meta: ProjectMeta;
  thumbnail?: string;
}

export interface AssetMeta {
  id: Id;
  name: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  createdAt: number;
}

export type TemplateCategory =
  | 'Hair'
  | 'Beauty'
  | 'Home Decor'
  | 'Balcony'
  | 'Patio'
  | 'Living Room'
  | 'Fall Decor'
  | 'Fashion'
  | 'Lifestyle'
  | 'Relationship'
  | 'Quote'
  | 'Listicle'
  | 'Food / Recipe'
  | 'How-To'
  | 'Custom Blog Pin'
  | 'My Templates';

export interface Template {
  id: Id;
  name: string;
  description: string;
  categories: TemplateCategory[];
  /** Explicit design types; image-count types are derived (see config/designTypes). */
  designTypes?: import('../config/designTypes').DesignType[];
  /** Template family (1–10) used to group the gallery. */
  family: import('../config/designTypes').TemplateFamilyId;
  imageCount: number;
  /** Document authored at its native size; instantiation scales it to any canvas. */
  doc: PinDocument;
  source: 'builtin' | 'user';
  createdAt: number;
}

export interface BrandKit {
  id: Id;
  name: string;
  brandName: string;
  website: string;
  logoAssetId: Id | null;
  primary: string;
  secondary: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
  ctaStyle: 'dark-block' | 'light-block' | 'outline' | 'text';
}
