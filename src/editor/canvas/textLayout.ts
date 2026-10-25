/**
 * Text measurement and auto-fit, shared by the editor, export and the design
 * checker so all three agree on wrapping and overflow.
 */
import Konva from 'konva';
import { nearestWeight } from '../../config/fonts';
import type { TextLayer, TextTransform } from '../../model/types';
import { fontEpoch } from '../../services/fonts';

export function applyTransform(text: string, t: TextTransform): string {
  switch (t) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
    default:
      return text;
  }
}

export function konvaFontStyle(l: Pick<TextLayer, 'italic' | 'fontWeight' | 'fontFamily'>): string {
  return `${l.italic ? 'italic ' : ''}${nearestWeight(l.fontFamily, l.fontWeight)}`;
}

export interface TextLayout {
  fontSize: number;
  text: string;
  textWidth: number;
  textHeight: number;
  innerX: number;
  innerY: number;
  innerW: number;
  innerH: number;
  overflow: boolean;
  /** Background box (layer-local) — hugging the text or filling the layer. */
  bg: { x: number; y: number; width: number; height: number } | null;
  textY: number;
}

let measurer: Konva.Text | null = null;
const cache = new Map<string, TextLayout>();

function measure(l: TextLayer, text: string, fontSize: number, width: number) {
  measurer ??= new Konva.Text({ wrap: 'word' });
  measurer.setAttrs({
    text,
    fontFamily: l.fontFamily,
    fontStyle: konvaFontStyle(l),
    fontSize,
    lineHeight: l.lineHeight,
    letterSpacing: l.letterSpacing,
    width: Math.max(1, width),
    padding: 0,
    height: undefined,
    wrap: 'word',
  });
  const lines = (measurer as unknown as { textArr: { text: string; width: number }[] }).textArr;
  const maxLine = lines.reduce((m, ln) => Math.max(m, ln.width), 0);
  // A single word wider than the box gets broken mid-word by Konva — treat as overflow.
  measurer.setAttrs({ width: undefined, wrap: 'none' });
  const words = text.split(/\s+/).filter(Boolean);
  let widest = 0;
  for (const w of words) {
    measurer.text(w);
    widest = Math.max(widest, measurer.width());
  }
  return { height: lines.length * fontSize * l.lineHeight, maxLine, widest };
}

export function layoutText(l: TextLayer): TextLayout {
  const key = JSON.stringify([
    l.text, l.textTransform, l.fontFamily, l.fontWeight, l.italic, l.fontSize, l.minFontSize, l.autoFit, l.lineHeight,
    l.letterSpacing, l.width, l.height, l.background, l.align, l.verticalAlign, fontEpoch(),
  ]);
  const hit = cache.get(key);
  if (hit) return hit;

  const text = applyTransform(l.text, l.textTransform);
  const pad = l.background.enabled ? l.background : { paddingX: 0, paddingY: 0 };
  const innerW = Math.max(1, l.width - pad.paddingX * 2);
  const innerH = Math.max(1, l.height - pad.paddingY * 2);

  const fits = (size: number) => {
    const m = measure(l, text, size, innerW);
    return { ok: m.height <= innerH + 0.5 && m.widest <= innerW + 0.5, m };
  };

  let fontSize = l.fontSize;
  let result = fits(fontSize);
  if (l.autoFit && !result.ok && text.trim()) {
    let lo = Math.max(1, l.minFontSize);
    let hi = l.fontSize;
    const low = fits(lo);
    if (!low.ok) {
      fontSize = lo;
      result = low;
    } else {
      while (hi - lo > 0.5) {
        const mid = (lo + hi) / 2;
        if (fits(mid).ok) lo = mid;
        else hi = mid;
      }
      fontSize = Math.floor(lo * 2) / 2;
      result = fits(fontSize);
    }
  }
  const textHeight = text ? result.m.height : 0;
  const textWidth = Math.min(innerW, result.m.maxLine);
  const vy = l.verticalAlign === 'top' ? 0 : l.verticalAlign === 'bottom' ? 1 : 0.5;
  const textY = pad.paddingY + Math.max(0, innerH - textHeight) * vy;

  let bg: TextLayout['bg'] = null;
  if (l.background.enabled && text.trim()) {
    if (l.background.hug) {
      const bw = Math.min(l.width, textWidth + pad.paddingX * 2);
      const ax = l.align === 'left' ? 0 : l.align === 'right' ? 1 : 0.5;
      if (l.background.hugHeight === false) {
        // Width hugs the text, height fills the line: stacked blocks touch like a pyramid.
        bg = { x: (l.width - bw) * ax, y: 0, width: bw, height: l.height };
      } else {
        const bh = Math.min(l.height, textHeight + pad.paddingY * 2);
        bg = { x: (l.width - bw) * ax, y: textY - pad.paddingY, width: bw, height: bh };
      }
    } else {
      bg = { x: 0, y: 0, width: l.width, height: l.height };
    }
  }

  const out: TextLayout = {
    fontSize,
    text,
    textWidth,
    textHeight,
    innerX: pad.paddingX,
    innerY: pad.paddingY,
    innerW,
    innerH,
    overflow: !!text.trim() && !result.ok,
    bg,
    textY,
  };
  if (cache.size > 800) cache.clear();
  cache.set(key, out);
  return out;
}
