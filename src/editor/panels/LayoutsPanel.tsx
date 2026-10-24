import { COLLAGE_LAYOUTS, type CollageLayout } from '../../collage/layouts';
import { applyCollage, frames } from '../../model/docOps';
import type { CollageSettings } from '../../model/types';
import { useEditor } from '../../store/editorStore';
import { ColorField, RangeField, Toggle } from '../../ui/controls';

function LayoutIcon({ layout, band }: { layout: CollageLayout; band: number }) {
  const b = layout.bandable ? band || 0.28 : 0;
  return (
    <svg viewBox="0 0 40 60" aria-hidden>
      <rect x="0" y="0" width="40" height="60" fill="#fff" />
      {layout.cells.map((c, i) => {
        const y = c.y * (1 - b) + (c.y >= 0.5 - 1e-6 ? b : 0);
        const h = c.height * (1 - b);
        return <rect key={i} x={c.x * 40 + 1} y={y * 60 + 1} width={c.width * 40 - 2} height={h * 60 - 2} rx="1.5" fill="#c9c3bb" />;
      })}
      {b > 0 && <rect x="4" y={60 * 0.5 * (1 - b) + 6} width="32" height={60 * b - 12} rx="1" fill="#1c1b19" opacity=".75" />}
    </svg>
  );
}

const DEFAULT_SETTINGS: Omit<CollageSettings, 'layoutId'> = {
  region: { x: 0, y: 0, width: 1, height: 1 },
  gap: 8,
  margin: 0,
  band: 0,
  cornerRadius: 0,
  borderWidth: 0,
  borderColor: '#FFFFFF',
};

export function LayoutsPanel() {
  const doc = useEditor((s) => s.project!.doc);
  const c = doc.collage;
  const set = (patch: Partial<CollageSettings>, key?: string) => {
    const next = { ...DEFAULT_SETTINGS, ...(c ?? { layoutId: 'grid-2x2' }), ...patch } as CollageSettings;
    useEditor.getState().setDoc(applyCollage(doc, next), key);
  };
  const free = frames(doc).filter((f) => f.slot === null).length;
  const counts = [...new Set(COLLAGE_LAYOUTS.map((l) => l.count))];
  const current = COLLAGE_LAYOUTS.find((l) => l.id === c?.layoutId);

  return (
    <div>
      <div className="panel-head">
        <h2>Collage layouts</h2>
      </div>
      <div className="panel-section">
        <span className="subtle">
          Pick a grid. Images in existing frames are kept in order; extra images stay in your library. Text and other layers aren’t touched.
        </span>
        {counts.map((n) => (
          <div key={n} className="stack-sm">
            <span className="section-title">
              {n} image{n > 1 ? 's' : ''}
            </span>
            <div className="layout-grid">
              {COLLAGE_LAYOUTS.filter((l) => l.count === n).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className="layout-btn"
                  aria-pressed={c?.layoutId === l.id}
                  onClick={() => set({ layoutId: l.id, band: l.bandable ? (c?.band || 0.28) : 0 })}
                  title={l.name}
                >
                  <LayoutIcon layout={l} band={c?.layoutId === l.id ? c.band : 0} />
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {c && (
        <div className="panel-section">
          <span className="section-title">Collage settings</span>
          <RangeField label="Gap" min={0} max={80} value={c.gap} onChange={(v) => set({ gap: v }, 'collage-gap')} format={(v) => `${Math.round(v)}px`} />
          <RangeField label="Canvas margin" min={0} max={120} value={c.margin} onChange={(v) => set({ margin: v }, 'collage-margin')} format={(v) => `${Math.round(v)}px`} />
          {current?.bandable && (
            <RangeField label="Center text band height" min={0} max={0.6} step={0.01} value={c.band} onChange={(v) => set({ band: v }, 'collage-band')} format={(v) => `${Math.round(v * 100)}%`} />
          )}
          <RangeField label="Corner radius" min={0} max={120} value={c.cornerRadius} onChange={(v) => set({ cornerRadius: v }, 'collage-radius')} format={(v) => `${Math.round(v)}px`} />
          <RangeField label="Border thickness" min={0} max={30} value={c.borderWidth} onChange={(v) => set({ borderWidth: v }, 'collage-border')} format={(v) => `${Math.round(v)}px`} />
          {c.borderWidth > 0 && <ColorField label="Border color" value={c.borderColor} onChange={(v) => set({ borderColor: v }, 'collage-border-color')} />}
          <span className="field-label">Collage area (image frame ratio)</span>
          <RangeField label="Top" min={0} max={0.6} step={0.01} value={c.region.y} onChange={(v) => set({ region: { ...c.region, y: v, height: Math.min(c.region.height, 1 - v) } }, 'collage-region')} format={(v) => `${Math.round(v * 100)}%`} />
          <RangeField label="Height" min={0.2} max={1} step={0.01} value={c.region.height} onChange={(v) => set({ region: { ...c.region, height: Math.min(v, 1 - c.region.y) } }, 'collage-region')} format={(v) => `${Math.round(v * 100)}%`} />
          <span className="subtle">Background color between images is set in Background.</span>
          <Toggle label="Use collage grid" checked onChange={(on) => !on && useEditor.getState().setDoc(applyCollage(doc, null))} />
        </div>
      )}
      {free > 0 && (
        <div className="panel-section">
          <span className="subtle">
            {free} free-form frame{free > 1 ? 's are' : ' is'} outside the grid and won’t move with layout changes.
          </span>
        </div>
      )}
    </div>
  );
}
