import { nanoid } from 'nanoid';
import type {
  Background,
  FrameLayer,
  ImageAdjustments,
  PinDocument,
  Project,
  ShapeLayer,
  TextLayer,
} from './types';

export const newId = (prefix = ''): string => prefix + nanoid(10);

export const DEFAULT_ADJUST: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  blur: 0,
  grayscale: false,
};

export function createFrame(p: Partial<FrameLayer> = {}): FrameLayer {
  return {
    id: newId('f_'),
    type: 'frame',
    name: 'Image',
    x: 0,
    y: 0,
    width: 400,
    height: 400,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    role: 'none',
    assetId: null,
    fit: 'cover',
    crop: { zoom: 1, fx: 0.5, fy: 0.5 },
    flipX: false,
    flipY: false,
    adjust: { ...DEFAULT_ADJUST },
    cornerRadius: 0,
    strokeWidth: 0,
    stroke: '#FFFFFF',
    placeholderFill: '#E7E3DE',
    slot: null,
    ...p,
  };
}

export function createText(p: Partial<TextLayer> = {}): TextLayer {
  return {
    id: newId('t_'),
    type: 'text',
    name: 'Text',
    x: 0,
    y: 0,
    width: 600,
    height: 120,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    role: 'none',
    text: 'Your text',
    fontFamily: 'Inter',
    fontSize: 56,
    fontWeight: 600,
    italic: false,
    underline: false,
    fill: '#111111',
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.1,
    letterSpacing: 0,
    textTransform: 'none',
    autoFit: true,
    minFontSize: 18,
    background: {
      enabled: false,
      shape: 'rect',
      color: '#FFFFFF',
      opacity: 1,
      paddingX: 24,
      paddingY: 14,
      radius: 0,
      borderWidth: 0,
      borderColor: '#111111',
      hug: false,
    },
    shadow: { enabled: false, color: '#000000', blur: 12, offsetX: 0, offsetY: 4, opacity: 0.4 },
    strokeWidth: 0,
    stroke: '#000000',
    ...p,
  };
}

export function createShape(p: Partial<ShapeLayer> = {}): ShapeLayer {
  return {
    id: newId('s_'),
    type: 'shape',
    name: 'Shape',
    x: 0,
    y: 0,
    width: 300,
    height: 200,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    role: 'decor',
    shape: 'rect',
    fill: '#111111',
    stroke: '#111111',
    strokeWidth: 0,
    cornerRadius: 0,
    ...p,
  };
}

export function defaultBackground(color = '#FFFFFF'): Background {
  return { type: 'solid', color, gradientFrom: '#F6F1EB', gradientTo: '#E9DFD3', gradientAngle: 90, assetId: null };
}

export function createDocument(width: number, height: number, presetId: string): PinDocument {
  return { width, height, presetId, background: defaultBackground(), collage: null, layers: [] };
}

export function createProject(doc: PinDocument, name = 'Untitled Pin'): Project {
  const now = Date.now();
  return {
    id: newId('p_'),
    name,
    schemaVersion: 1,
    doc,
    assetIds: [],
    meta: {
      articleTitle: '',
      headline: '',
      keyword: '',
      templateId: null,
      brandKitId: null,
      createdAt: now,
      updatedAt: now,
    },
  };
}

/** Deep clone a JSON-serializable value (documents never hold functions or DOM objects). */
export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
