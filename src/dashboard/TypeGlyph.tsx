import type { DesignType } from '../config/designTypes';

const I = '#c9c3bb'; // image
const T = '#1c1b19'; // text
const B = '#fff'; // band

/** Tiny structural diagram for each design type. */
export function TypeGlyph({ type }: { type: DesignType }) {
  const r = (x: number, y: number, w: number, h: number, f: string, k?: number) => <rect key={k ?? `${x}${y}${w}${h}${f}`} x={x} y={y} width={w} height={h} rx="1.5" fill={f} />;
  const line = (y: number, w = 20, k?: number) => r(20 - w / 2, y, w, 3, T, k);
  const shapes: Record<DesignType, JSX.Element[]> = {
    'single-image': [r(2, 2, 36, 56, I)],
    'image-text-overlay': [r(2, 2, 36, 56, I), line(24, 24), line(30, 18)],
    'image-text-panel': [r(2, 2, 36, 36, I), line(44, 24), line(50, 16)],
    split: [r(2, 2, 36, 20, I), line(28, 24), r(2, 38, 36, 20, I)],
    'two-image': [r(2, 2, 17, 56, I), r(21, 2, 17, 56, I)],
    'three-image': [r(2, 2, 36, 30, I), r(2, 34, 17, 24, I), r(21, 34, 17, 24, I)],
    'collage-4': [r(2, 2, 17, 27, I), r(21, 2, 17, 27, I), r(2, 31, 17, 27, I), r(21, 31, 17, 27, I)],
    'collage-5': [r(2, 2, 17, 22, I), r(21, 2, 17, 22, I), r(2, 36, 11, 22, I), r(14.5, 36, 11, 22, I), r(27, 36, 11, 22, I), line(29, 26)],
    editorial: [r(2, 2, 17, 27, I), r(21, 2, 17, 27, I), r(2, 31, 17, 27, I), r(21, 31, 17, 27, I), r(9, 22, 22, 6, B), r(7, 30, 26, 6, B)],
    listicle: [r(14, 3, 12, 12, T), line(20, 28), line(26, 22), r(2, 33, 36, 25, I)],
    'number-badge': [r(2, 2, 36, 56, I), <circle key="c" cx="20" cy="22" r="8" fill={T} />, line(36, 26)],
    'script-bold': [r(2, 2, 36, 56, I), r(2, 20, 36, 20, B), <path key="s" d="M10 27 q5 -6 10 0 t10 0" stroke="#b5651d" strokeWidth="2" fill="none" />, line(33, 24)],
    'quote-advice': [r(2, 2, 36, 56, '#f3e6e0'), <text key="q" x="20" y="24" fontSize="16" textAnchor="middle" fill="#c7797d">“</text>, line(30, 26), line(36, 20)],
    'home-decor': [r(2, 2, 17, 22, '#cfb79a'), r(21, 2, 17, 22, '#cfb79a'), r(2, 36, 11, 22, '#cfb79a'), r(14.5, 36, 11, 22, '#cfb79a'), r(27, 36, 11, 22, '#cfb79a'), r(2, 25, 36, 10, '#f3ebdd'), line(28.5, 22)],
    'hair-beauty': [r(2, 2, 17, 56, '#e8c4c4'), r(21, 2, 17, 56, '#e8c4c4'), <circle key="c" cx="20" cy="22" r="6" fill={T} />, r(8, 32, 24, 6, B)],
    blank: [r(2, 2, 36, 56, '#fff'), <rect key="d" x="3" y="3" width="34" height="54" fill="none" stroke="#bbb" strokeDasharray="3 2" />],
  };
  return (
    <svg viewBox="0 0 40 60" width="40" height="60" aria-hidden>
      {shapes[type]}
    </svg>
  );
}
