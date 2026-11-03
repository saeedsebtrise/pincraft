/**
 * Font picker: "Document fonts" (faces already used in this design) first,
 * then the whole library by category. Each family opens to its weights, each
 * shown in its own face, so picking "Poppins ExtraBold" is one click.
 */
import { Check, ChevronDown, ChevronRight, Clock, FileText, Palette, Search, TrendingUp, UploadCloud } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cssFontFamily, FONT_CATEGORIES, FONT_LIBRARY, FONT_LOOKALIKES, getFont, nearestWeight, POPULAR_FONTS, type FontDef } from '../../config/fonts';
import { pushRecentFont, recentFonts, requestFamily, uploadFont } from '../../services/fonts';
import { useLibrary } from '../../store/libraryStore';
import { useUi } from '../../store/uiStore';
import { isText } from '../../model/docOps';
import type { PinDocument } from '../../model/types';

export const WEIGHT_NAMES: Record<number, string> = { 100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black' };
export const weightName = (w: number) => WEIGHT_NAMES[w] ?? String(w);

/** Families used by the design's text layers, in layer order (unknown families are skipped). */
export function documentFonts(doc: PinDocument): FontDef[] {
  const seen: FontDef[] = [];
  for (const l of doc.layers) {
    if (!isText(l)) continue;
    const f = FONT_LIBRARY.find((x) => x.family === l.fontFamily);
    if (f && !seen.includes(f)) seen.push(f);
  }
  return seen;
}

function Family({ font, family, weight, open, onToggle, onPick }: { font: FontDef; family: string; weight: number; open: boolean; onToggle: () => void; onPick: (family: string, weight: number) => void }) {
  const current = font.family === family;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return void requestFamily(font.family);
    const io = new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting)) {
        void requestFamily(font.family);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [font.family]);
  return (
    <div className="fp-family" ref={ref}>
      <button type="button" className="fp-family-head" onClick={onToggle} aria-expanded={open}>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        <span style={{ fontFamily: cssFontFamily(font.family) }}>{font.family}</span>
        {current && !open && <Check size={15} className="fp-check" />}
        {font.weights.length > 1 && <span className="fp-count">{font.weights.length}</span>}
      </button>
      {open &&
        font.weights.map((w) => {
          const on = current && w === weight;
          return (
            <button key={w} type="button" className={`fp-weight ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => onPick(font.family, w)} style={{ fontFamily: cssFontFamily(font.family), fontWeight: w }}>
              {weightName(w)}
              {on && <Check size={16} />}
            </button>
          );
        })}
    </div>
  );
}

export function FontPicker({ doc, family, weight, onChange }: { doc: PinDocument; family: string; weight: number; onChange: (family: string, weight: number) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);
  const docFonts = useMemo(() => documentFonts(doc), [doc]);

  useEffect(() => {
    if (!open) return;
    // The current font opens where it is listed first: in Document fonts when the design uses it.
    setExpanded((s) => new Set([...s, docFonts.some((f) => f.family === family) ? `doc:${family}` : family]));
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const toggle = (key: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  const kit = useLibrary((st) => st.activeKit());
  const [, bump] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const pick = (f: string, w: number) => {
    pushRecentFont(f);
    void requestFamily(f);
    onChange(f, w);
    setOpen(false);
  };
  const query = q.trim().toLowerCase();
  const match = (f: FontDef) => !query || f.family.toLowerCase().includes(query) || f.category.toLowerCase().includes(query);
  const lookalikes = query ? Object.entries(FONT_LOOKALIKES).filter(([paid]) => paid.toLowerCase().includes(query)) : [];
  const defs = (names: string[]) => [...new Set(names)].map((n) => getFont(n)).filter((x): x is FontDef => !!x);
  const section = (key: string, icon: React.ReactNode, title: string, list: FontDef[]) =>
    list.length ? (
      <div key={key}>
        <span className="fp-section">
          {icon} {title}
        </span>
        {list.map((x) => row(x, `${key}:${x.family}`))}
      </div>
    ) : null;
  const row = (f: FontDef, key: string) => (
    <Family key={key} font={f} family={family} weight={weight} open={!!query || expanded.has(key)} onToggle={() => toggle(key)} onPick={pick} />
  );

  return (
    <div className="field fp" ref={ref}>
      <span className="field-label">Font</span>
      <button type="button" className="input fp-trigger" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox">
        <span style={{ fontFamily: cssFontFamily(family), fontWeight: nearestWeight(family, weight) }}>{family}</span>
        <span className="subtle">{weightName(nearestWeight(family, weight))}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="fp-pop" role="listbox" aria-label="Fonts">
          <label className="fp-search">
            <Search size={15} />
            <input autoFocus placeholder="Search fonts" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search fonts" />
          </label>
          <div className="fp-list">
            {!query && docFonts.length > 0 && (
              <>
                <span className="fp-section">
                  <FileText size={15} /> Document fonts
                </span>
                {docFonts.map((f) => row(f, `doc:${f.family}`))}
              </>
            )}
            {!query && section('recent', <Clock size={15} />, 'Recently used', defs(recentFonts()))}
            {!query && section('brand', <Palette size={15} />, 'Brand Kit', defs([kit.headingFont, kit.bodyFont]))}
            {!query && section('popular', <TrendingUp size={15} />, 'Popular fonts', defs(POPULAR_FONTS))}
            {lookalikes.length > 0 && (
              <div>
                <span className="fp-section">Free look-alikes</span>
                {lookalikes.map(([paid, free]) => (
                  <div key={paid} className="fp-alike">
                    <span className="subtle">{paid} is a paid font — closest free match:</span>
                    {getFont(free) && row(getFont(free)!, `alike:${paid}`)}
                  </div>
                ))}
              </div>
            )}
            {FONT_CATEGORIES.map((c) => {
              const list = FONT_LIBRARY.filter((f) => f.category === c && match(f));
              if (!list.length) return null;
              return (
                <div key={c}>
                  <span className="fp-section">
                    {c} <span className="fp-count">{list.length}</span>
                  </span>
                  {list.map((f) => row(f, f.family))}
                </div>
              );
            })}
            {query && !FONT_LIBRARY.some(match) && !lookalikes.length && <span className="subtle fp-empty">No fonts match “{q}”.</span>}
          </div>
          <button type="button" className="btn fp-upload" onClick={() => fileRef.current?.click()}>
            <UploadCloud size={16} /> Upload a font
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                const def = await uploadFont(file);
                useUi.getState().toast(`“${def.family}” added to My fonts`, 'success');
                bump((n) => n + 1);
                pick(def.family, def.weights[0] ?? 400);
              } catch (err) {
                useUi.getState().toast((err as Error).message, 'error');
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
