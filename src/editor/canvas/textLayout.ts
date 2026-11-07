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
  /** Line height to draw with — opened up to at least 1 when the text wraps, so lines never overlap. */
  lineHeight: number;
}

const cache = new Map<string, TextLayout>();

// ---------------------------------------------------------------- word wrap
//
// The same wrapping as Konva.Text (wrap: 'word', no fixed height, no ellipsis), so
// layouts match what the editor and export draw. Konva re-splits the whole line into
// characters with a regex on every step of its search, which made Auto Design (thousands
// of lines) take seconds; here each line is split once and text widths are cached.

let ctx: CanvasRenderingContext2D | null = null;
let ctxFont = '';
const widths = new Map<string, number>();
let widthsEpoch = -1;

/** A font for measuring: Konva's font string pieces without the size. */
interface MeasureFont {
  style: string;
  family: string;
  size: number;
}

/** Konva's font string: style, variant, size, quoted family. */
function contextFont(fontStyle: string, fontSize: number, family: string): MeasureFont {
  const fam = family
    .split(',')
    .map((f) => {
      const t = f.trim();
      return t.indexOf(' ') >= 0 && t.indexOf('"') < 0 && t.indexOf("'") < 0 ? `"${t}"` : t;
    })
    .join(', ');
  return { style: fontStyle, family: fam, size: fontSize };
}

/** Strings are measured once at this size; canvas text width scales linearly with the font size. */
const REF_SIZE = 100;

/**
 * Canvas width of a string in a font plus Konva's letter spacing. Measuring is the slow
 * part (each new string needs shaping), and auto-fit tries many sizes of the same text,
 * so widths are measured once at REF_SIZE and scaled; the cache resets when fonts load.
 */
function textWidth(font: MeasureFont, s: string, letterSpacing: number): number {
  if (widthsEpoch !== fontEpoch() || widths.size > 200000) {
    widths.clear();
    widthsEpoch = fontEpoch();
  }
  const ref = `${font.style} normal ${REF_SIZE}px ${font.family}`;
  const key = `${ref}\u0000${s}`;
  let w = widths.get(key);
  if (w === undefined) {
    ctx ??= Konva.Util.createCanvasElement().getContext('2d');
    if (!ctx) return s.length * 0.5 * font.size + letterSpacing * s.length;
    if (ctxFont !== ref) {
      ctx.font = ref;
      ctxFont = ref;
    }
    w = ctx.measureText(s).width;
    widths.set(key, w);
  }
  return (w * font.size) / REF_SIZE + letterSpacing * s.length;
}

/** Konva's stringToArray: characters, keeping an emoji with its modifier / zero-width joiner. */
function toChars(s: string): string[] {
  const arr = [...s];
  const out: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    const c = arr[i];
    const next = arr[i + 1];
    if (/\p{Emoji}/u.test(c) && next && /\p{Emoji_Modifier}|‍/u.test(next)) {
      out.push(c + next);
      i++;
    } else out.push(c);
  }
  return out;
}

/** Konva.Text's word wrap: the widths of the lines it would draw in a box maxWidth wide. */
function wrapWidths(text: string, font: MeasureFont, ls: number, maxWidth: number): number[] {
  const out: number[] = [];
  const push = (line: string) => out.push(textWidth(font, line, ls));
  for (let line of text.split('\n')) {
    let lineWidth = textWidth(font, line, ls);
    if (lineWidth <= maxWidth) {
      push(line);
      continue;
    }
    while (line.length > 0) {
      const chars = toChars(line);
      let low = 0;
      let high = chars.length;
      let match = '';
      let matchWidth = 0;
      while (low < high) {
        const mid = (low + high) >>> 1;
        const sub = chars.slice(0, mid + 1).join('');
        const w = textWidth(font, sub, ls);
        if (w <= maxWidth) {
          low = mid + 1;
          match = sub;
          matchWidth = w;
        } else high = mid;
      }
      if (!match) break;
      const matchChars = toChars(match);
      const nextChar = chars[matchChars.length];
      const wrapIndex = (nextChar === ' ' || nextChar === '-') && matchWidth <= maxWidth ? matchChars.length : Math.max(matchChars.lastIndexOf(' '), matchChars.lastIndexOf('-')) + 1;
      if (wrapIndex > 0) {
        low = wrapIndex;
        match = chars.slice(0, low).join('');
      }
      push(match.trimEnd());
      line = chars.slice(low).join('').trimStart();
      if (line.length > 0) {
        lineWidth = textWidth(font, line, ls);
        if (lineWidth <= maxWidth) {
          push(line);
          break;
        }
      }
    }
  }
  return out;
}

function measure(l: TextLayer, text: string, fontSize: number, width: number, lineHeight = l.lineHeight) {
  const font = contextFont(konvaFontStyle(l), fontSize, l.fontFamily);
  const lines = wrapWidths(text, font, l.letterSpacing, Math.max(1, width));
  const maxLine = lines.reduce((m, w) => Math.max(m, w), 0);
  // A single word wider than the box gets broken mid-word by Konva — treat as overflow.
  let widest = 0;
  for (const w of text.split(/\s+/).filter(Boolean)) widest = Math.max(widest, textWidth(font, w, l.letterSpacing));
  return { height: lines.length * fontSize * lineHeight, maxLine, widest, lines: lines.length };
}

export function layoutText(l: TextLayer): TextLayout {
  const key = JSON.stringify([
    l.text, l.role, l.textTransform, l.fontFamily, l.fontWeight, l.italic, l.fontSize, l.minFontSize, l.autoFit, l.lineHeight,
    l.letterSpacing, l.width, l.height, l.background, l.align, l.verticalAlign, fontEpoch(),
  ]);
  const hit = cache.get(key);
  if (hit) return hit;

  const text = applyTransform(l.text, l.textTransform);
  const pad = l.background.enabled ? l.background : { paddingX: 0, paddingY: 0 };
  const innerW = Math.max(1, l.width - pad.paddingX * 2);
  const innerH = Math.max(1, l.height - pad.paddingY * 2);

  // Tight line heights (0.8–0.9) are designed for one line per box; once the
  // text wraps, those lines would sit on top of each other — open them up.
  const wrapLH = Math.max(l.lineHeight, 1);
  const fits = (size: number) => {
    let m = measure(l, text, size, innerW);
    let lh = l.lineHeight;
    if (m.lines > 1 && lh < wrapLH) {
      m = measure(l, text, size, innerW, wrapLH);
      lh = wrapLH;
    }
    return { ok: m.height <= innerH + 0.5 && m.widest <= innerW + 0.5, m, lh };
  };
  /** Largest size from minFontSize up to the designed size that passes the test, or null. */
  const search = (ok: (size: number) => boolean): number | null => {
    let lo = Math.max(1, l.minFontSize);
    let hi = l.fontSize;
    if (ok(hi)) return hi;
    if (!ok(lo)) return null;
    while (hi - lo > 0.5) {
      const mid = (lo + hi) / 2;
      if (ok(mid)) lo = mid;
      else hi = mid;
    }
    return Math.floor(lo * 2) / 2;
  };

  let fontSize = l.fontSize;
  let result = fits(fontSize);
  if (l.autoFit && text.trim() && (!result.ok || (l.role === 'title-line' && result.m.lines > 1))) {
    // A headline line reads best on one line: keep it whole while that still leaves it big.
    const one = l.role === 'title-line' ? search((sz) => { const r = fits(sz); return r.ok && r.m.lines === 1; }) : null;
    const best = result.ok ? l.fontSize : search((sz) => fits(sz).ok);
    if (one !== null && (best === null || one >= l.fontSize * 0.6 || one >= best * 0.85)) fontSize = one;
    else fontSize = best ?? Math.max(1, l.minFontSize);
    result = fits(fontSize);
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
    lineHeight: result.lh,
  };
  if (cache.size > 800) cache.clear();
  cache.set(key, out);
  return out;
}
