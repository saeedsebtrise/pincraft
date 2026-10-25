/**
 * Pieces shared by Auto Design (one post or title) and Bulk Design (many blog
 * posts): Pin sizes, the canvas text measurers and saving designs as a project.
 */
import { cssFontFamily } from '../config/fonts';
import { konvaFontStyle, layoutText } from '../editor/canvas/textLayout';
import { createProject } from '../model/factory';
import type { Id, PinDocument, Project, Rect, TextLayer } from '../model/types';
import { ensureCanCreateProject, handleLimitError } from '../saas/gates';
import type { AutoInput } from '../services/autoDesign';
import { repos } from '../storage/repositories';
import { useLibrary } from '../store/libraryStore';

export const SIZES: { id: string; label: string; size?: AutoInput['size'] }[] = [
  { id: 'native', label: 'Each design’s own size' },
  { id: 'pin-standard', label: '2:3 · 1000 × 1500', size: { width: 1000, height: 1500, presetId: 'pin-standard' } },
  { id: 'custom-blog-736', label: '1:2 · 736 × 1472', size: { width: 736, height: 1472, presetId: 'custom-blog-736' } },
  { id: 'pin-full-vertical', label: '9:16 · 1080 × 1920', size: { width: 1080, height: 1920, presetId: 'pin-full-vertical' } },
];

/** How far auto-fit shrank a text layer, measured with the same layout the editor and export use. */
export const measureWithCanvas = (l: TextLayer) => Math.min(1, layoutText(l).fontSize / l.fontSize);

/**
 * Where the letters sit on the Pin. Badges count their whole shape. Other text
 * is measured the way Konva draws it: each line on a "middle" baseline at the
 * line's centre, so the real glyph top/bottom come from the canvas text metrics.
 */
let metricsCtx: CanvasRenderingContext2D | null = null;
export const inkWithCanvas = (l: TextLayer): Rect => {
  const t = layoutText(l);
  if (l.role === 'badge' && t.bg) return { x: l.x + t.bg.x, y: l.y + t.bg.y, width: t.bg.width, height: t.bg.height };
  metricsCtx ??= document.createElement('canvas').getContext('2d');
  const lh = t.fontSize * l.lineHeight;
  const lines = Math.max(1, Math.round(t.textHeight / lh));
  let above = t.fontSize * 0.5;
  let below = t.fontSize * 0.5;
  if (metricsCtx) {
    metricsCtx.font = `${konvaFontStyle(l)} ${t.fontSize}px ${cssFontFamily(l.fontFamily)}`;
    metricsCtx.textBaseline = 'middle';
    const m = metricsCtx.measureText(t.text);
    above = m.actualBoundingBoxAscent;
    below = m.actualBoundingBoxDescent;
  }
  const ax = l.align === 'left' ? 0 : l.align === 'right' ? 1 : 0.5;
  const sw = l.strokeWidth / 2; // outlines grow the letters on every side
  const top = l.y + t.textY + lh / 2 - above - sw;
  const bottom = l.y + t.textY + (lines - 0.5) * lh + below + sw;
  return { x: l.x + t.innerX + (t.innerW - t.textWidth) * ax - sw, y: top, width: t.textWidth + 2 * sw, height: bottom - top };
};

export interface ProjectInfo {
  name: string;
  articleTitle: string;
  articleUrl?: string;
  headline: string;
  templateId: string;
  assetIds?: Id[];
}

/**
 * Saves designs as one project, one Pin per page. Returns null when the plan's
 * project limit stops it (the upgrade prompt is already shown).
 */
export async function saveAsProject(docs: PinDocument[], info: ProjectInfo): Promise<Project | null> {
  if (!(await ensureCanCreateProject())) return null;
  const p = createProject(docs[0], info.name);
  p.pages = docs;
  p.assetIds = info.assetIds ?? [];
  p.meta = {
    ...p.meta,
    articleTitle: info.articleTitle,
    articleUrl: info.articleUrl,
    headline: info.headline,
    templateId: info.templateId,
    brandKitId: useLibrary.getState().activeKit().id,
  };
  try {
    await repos.projects.put(p);
  } catch (e) {
    if (handleLimitError(e)) return null;
    throw e;
  }
  return p;
}
