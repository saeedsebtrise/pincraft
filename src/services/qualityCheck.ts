/**
 * Design quality assistant: warnings, never restrictions.
 * Pure — text measurement is injected so the checks are unit-testable.
 */
import { LOW_RES_UPSCALE, MIN_READABLE_TEXT_RATIO, SAFE_AREA } from '../config/colors';
import { contrastRatio, hexToRgb, isFrame, isText } from '../model/docOps';
import { placeImage, rotatedBounds } from '../model/geometry';
import type { AssetMeta, Id, PinDocument, Rect, TextLayer } from '../model/types';

export type IssueCode =
  | 'overflow'
  | 'text-small'
  | 'low-contrast'
  | 'outside-safe-area'
  | 'outside-canvas'
  | 'empty-frame'
  | 'low-res'
  | 'missing-asset'
  | 'missing-website'
  | 'font-failed';

export interface Issue {
  code: IssueCode;
  message: string;
  layerId?: Id;
}

export interface CheckContext {
  metas: Record<Id, AssetMeta>;
  missingAssets?: Record<Id, true>;
  /** Rendered size, overflow and (optionally) the visible text/block rect in layer-local coordinates. */
  measure: (l: TextLayer) => { fontSize: number; overflow: boolean; ink?: Rect };
  /** Average background color under each text layer, when known (from a render). */
  sampledBackground?: Record<Id, string>;
  failedFonts?: string[];
  expectWebsite?: boolean;
}

export const ISSUE_LABEL: Record<IssueCode, string> = {
  overflow: 'Text overflow',
  'text-small': 'Text too small',
  'low-contrast': 'Low contrast',
  'outside-safe-area': 'Outside safe area',
  'outside-canvas': 'Outside canvas',
  'empty-frame': 'Empty frame',
  'low-res': 'Low resolution image',
  'missing-asset': 'Missing image',
  'missing-website': 'No website',
  'font-failed': 'Font unavailable',
};

export function safeAreaRect(doc: Pick<PinDocument, 'width' | 'height'>) {
  return {
    x: doc.width * SAFE_AREA.left,
    y: doc.height * SAFE_AREA.top,
    width: doc.width * (1 - SAFE_AREA.left - SAFE_AREA.right),
    height: doc.height * (1 - SAFE_AREA.top - SAFE_AREA.bottom),
  };
}

export function checkDocument(doc: PinDocument, ctx: CheckContext): Issue[] {
  const issues: Issue[] = [];
  const safe = safeAreaRect(doc);
  const tol = 1;

  for (const l of doc.layers) {
    if (!l.visible) continue;
    const b = rotatedBounds(l);

    if (isText(l)) {
      if (!l.text.trim()) continue;
      const m = ctx.measure(l);
      if (m.overflow) issues.push({ code: 'overflow', layerId: l.id, message: `“${short(l.text)}” doesn't fit its box even at ${m.fontSize}px. Enlarge the box or shorten the text.` });
      if (m.fontSize < doc.width * MIN_READABLE_TEXT_RATIO && l.role !== 'website' && l.role !== 'decor') {
        issues.push({ code: 'text-small', layerId: l.id, message: `“${short(l.text)}” renders at ${Math.round(m.fontSize)}px — likely hard to read in the mobile feed.` });
      }
      const bgColor = l.background.enabled && l.background.opacity >= 0.7 ? l.background.color : ctx.sampledBackground?.[l.id];
      if (bgColor) {
        const ratio = contrastRatio(hexToRgb(l.fill), hexToRgb(bgColor));
        const helped = (l.shadow.enabled && l.shadow.opacity > 0.3) || l.strokeWidth >= 2;
        if (ratio < 3 && !helped) {
          issues.push({ code: 'low-contrast', layerId: l.id, message: `“${short(l.text)}” has low contrast (${ratio.toFixed(1)}:1). Try a text box, shadow or different color.` });
        }
      }
      // Use what is actually visible (text or its block), not the editable box, for unrotated text.
      const vb = m.ink && !l.rotation ? { x: l.x + m.ink.x, y: l.y + m.ink.y, width: m.ink.width, height: m.ink.height } : b;
      const outsideSafe = vb.x < safe.x - tol || vb.y < safe.y - tol || vb.x + vb.width > safe.x + safe.width + tol || vb.y + vb.height > safe.y + safe.height + tol;
      if (outsideSafe && l.role !== 'website') {
        issues.push({ code: 'outside-safe-area', layerId: l.id, message: `“${short(l.text)}” is close to the edge and may be covered by Pinterest UI.` });
      }
    }

    const outside = b.x < -tol || b.y < -tol || b.x + b.width > doc.width + tol || b.y + b.height > doc.height + tol;
    const fullyOut = b.x >= doc.width || b.y >= doc.height || b.x + b.width <= 0 || b.y + b.height <= 0;
    if (outside && l.role !== 'decor' && l.role !== 'band') {
      issues.push({ code: 'outside-canvas', layerId: l.id, message: `${l.name} ${fullyOut ? 'is completely' : 'extends'} outside the canvas.` });
    }

    if (isFrame(l)) {
      if (!l.assetId) {
        issues.push({ code: 'empty-frame', layerId: l.id, message: `${l.name} has no image yet.` });
      } else if (ctx.missingAssets?.[l.assetId]) {
        issues.push({ code: 'missing-asset', layerId: l.id, message: `${l.name}'s image can't be found. Replace it.` });
      } else {
        const meta = ctx.metas[l.assetId];
        if (meta) {
          const p = placeImage(l, meta.width, meta.height);
          if (p.scale > LOW_RES_UPSCALE) {
            issues.push({ code: 'low-res', layerId: l.id, message: `${l.name} is upscaled ${Math.round(p.scale * 100)}% (${meta.width}×${meta.height} source) and may look blurry.` });
          }
        }
      }
    }
  }

  const emptyCount = issues.filter((i) => i.code === 'empty-frame').length;
  if (emptyCount > 1) {
    const first = issues.findIndex((i) => i.code === 'empty-frame');
    issues.splice(first, 0, { code: 'empty-frame', message: `${emptyCount} image slots still need an image.` });
  }

  if (ctx.expectWebsite) {
    const site = doc.layers.find((l): l is TextLayer => isText(l) && l.role === 'website' && l.visible);
    if (!site || !site.text.trim()) issues.push({ code: 'missing-website', message: 'No website footer — add one so readers know where the Pin leads.' });
  }
  for (const f of ctx.failedFonts ?? []) {
    issues.push({ code: 'font-failed', message: `${f} couldn't load; a fallback font is being used.` });
  }
  return issues;
}

const short = (s: string) => (s.length > 28 ? s.slice(0, 26).trim() + '…' : s);
