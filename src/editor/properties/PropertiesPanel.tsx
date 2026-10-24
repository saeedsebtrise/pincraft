import {
  AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignHorizontalDistributeCenter,
  AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter, AlertTriangle, ArrowDown, ArrowDownToLine,
  ArrowUp, ArrowUpToLine, CheckCircle2, Copy, Lock, Trash2, Unlock,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { CANVAS_LIMITS, CANVAS_PRESET_CONFIG, STATUS_LABEL } from '../../config/canvasPresets';
import { scaleDoc } from '../../model/docOps';
import { rotatedBounds, unionRect } from '../../model/geometry';
import type { Layer, PinDocument } from '../../model/types';
import { checkDocument, ISSUE_LABEL, type Issue } from '../../services/qualityCheck';
import { useAssets } from '../../store/assetStore';
import { useEditor } from '../../store/editorStore';
import { useLibrary } from '../../store/libraryStore';
import { findTemplate } from '../../store/projectActions';
import { useUi } from '../../store/uiStore';
import { IconButton, NumberField, RangeField, Toggle } from '../../ui/controls';
import { layoutText } from '../canvas/textLayout';
import { FrameProps } from './FrameProps';
import { ShapeProps, TextProps } from './TextProps';

export function useDesignIssues(doc: PinDocument, extra?: { sampled?: Record<string, string>; failedFonts?: string[] }): Issue[] {
  const metas = useAssets((s) => s.metas);
  const missing = useAssets((s) => s.missing);
  const templateId = useEditor((s) => s.project?.meta.templateId);
  useUi((s) => s.fontsVersion);
  return useMemo(() => {
    const tpl = findTemplate(templateId);
    return checkDocument(doc, {
      metas,
      missingAssets: missing,
      measure: (l) => {
        const t = layoutText(l);
        const ax = l.align === 'left' ? 0 : l.align === 'right' ? 1 : 0.5;
        const ink = t.bg ?? { x: t.innerX + (t.innerW - t.textWidth) * ax, y: t.textY, width: t.textWidth, height: t.textHeight };
        return { fontSize: t.fontSize, overflow: t.overflow, ink };
      },
      sampledBackground: extra?.sampled,
      failedFonts: extra?.failedFonts,
      expectWebsite: !!tpl?.doc.layers.some((l) => l.role === 'website'),
    });
  }, [doc, metas, missing, templateId, extra?.sampled, extra?.failedFonts]);
}

export function IssueList({ issues, onPick }: { issues: Issue[]; onPick?: (i: Issue) => void }) {
  if (!issues.length) {
    return (
      <div className="ok-box">
        <CheckCircle2 size={14} /> No issues found
      </div>
    );
  }
  return (
    <div className="stack-sm">
      {issues.map((i, n) => (
        <button key={n} type="button" className="issue" onClick={() => onPick?.(i)}>
          <AlertTriangle size={14} style={{ flex: 'none', marginTop: 1 }} />
          <span>
            <strong>{ISSUE_LABEL[i.code]}</strong>
            {i.message}
          </span>
        </button>
      ))}
    </div>
  );
}

export function PropertiesPanel() {
  const project = useEditor((s) => s.project!);
  const selection = useEditor((s) => s.selection);
  const layers = project.doc.layers.filter((l) => selection.includes(l.id));
  if (layers.length === 0) return <CanvasProps />;
  if (layers.length > 1) return <MultiProps layers={layers} />;
  const l = layers[0];
  return (
    <div>
      <LayerHeader layer={l} />
      {l.type === 'frame' && <FrameProps layer={l} />}
      {l.type === 'text' && <TextProps layer={l} />}
      {l.type === 'shape' && <ShapeProps layer={l} />}
      <GeometrySection layer={l} />
    </div>
  );
}

function LayerHeader({ layer }: { layer: Layer }) {
  const ed = useEditor.getState();
  const type = layer.type === 'frame' ? 'Image' : layer.type === 'text' ? (layer.role === 'badge' ? 'Number badge' : layer.role === 'website' ? 'Website footer' : 'Text') : 'Shape';
  return (
    <div className="panel-head" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div className="row-between">
        <h2>{type}</h2>
        <div className="row" style={{ gap: 0 }}>
          <IconButton label={layer.locked ? 'Unlock' : 'Lock'} pressed={layer.locked} onClick={() => ed.updateLayer(layer.id, { locked: !layer.locked })}>
            {layer.locked ? <Lock size={15} /> : <Unlock size={15} />}
          </IconButton>
          <IconButton label="Duplicate (Ctrl+D)" onClick={() => ed.duplicate([layer.id])}>
            <Copy size={15} />
          </IconButton>
          <IconButton label="Delete (Del)" onClick={() => ed.removeLayers([layer.id])}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>
      <div className="row" style={{ gap: 0 }}>
        <IconButton label="Bring forward" onClick={() => ed.reorder(layer.id, 'forward')}>
          <ArrowUp size={15} />
        </IconButton>
        <IconButton label="Send backward" onClick={() => ed.reorder(layer.id, 'backward')}>
          <ArrowDown size={15} />
        </IconButton>
        <IconButton label="Bring to front" onClick={() => ed.reorder(layer.id, 'front')}>
          <ArrowUpToLine size={15} />
        </IconButton>
        <IconButton label="Send to back" onClick={() => ed.reorder(layer.id, 'back')}>
          <ArrowDownToLine size={15} />
        </IconButton>
        <span className="tb-sep" />
        <AlignButtons ids={[layer.id]} />
      </div>
    </div>
  );
}

type AlignKind = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';

function align(doc: PinDocument, ids: string[], kind: AlignKind): PinDocument {
  const sel = doc.layers.filter((l) => ids.includes(l.id));
  const ref = sel.length > 1 ? unionRect(sel.map(rotatedBounds)) : { x: 0, y: 0, width: doc.width, height: doc.height };
  return {
    ...doc,
    layers: doc.layers.map((l) => {
      if (!ids.includes(l.id) || l.locked) return l;
      const b = rotatedBounds(l);
      const dx = { left: ref.x - b.x, hcenter: ref.x + ref.width / 2 - (b.x + b.width / 2), right: ref.x + ref.width - (b.x + b.width), top: 0, vcenter: 0, bottom: 0 }[kind];
      const dy = { top: ref.y - b.y, vcenter: ref.y + ref.height / 2 - (b.y + b.height / 2), bottom: ref.y + ref.height - (b.y + b.height), left: 0, hcenter: 0, right: 0 }[kind];
      return { ...l, x: l.x + dx, y: l.y + dy, ...(l.type === 'frame' && (dx || dy) ? { slot: null } : {}) } as Layer;
    }),
  };
}

function distribute(doc: PinDocument, ids: string[], axis: 'x' | 'y'): PinDocument {
  const sel = doc.layers.filter((l) => ids.includes(l.id) && !l.locked).sort((a, b) => a[axis] - b[axis]);
  if (sel.length < 3) return doc;
  const size = axis === 'x' ? 'width' : 'height';
  const first = sel[0];
  const last = sel[sel.length - 1];
  const total = last[axis] + last[size] - first[axis];
  const sum = sel.reduce((s, l) => s + l[size], 0);
  const gap = (total - sum) / (sel.length - 1);
  const pos = new Map<string, number>();
  let cur = first[axis];
  for (const l of sel) {
    pos.set(l.id, cur);
    cur += l[size] + gap;
  }
  return { ...doc, layers: doc.layers.map((l) => (pos.has(l.id) ? ({ ...l, [axis]: pos.get(l.id)! } as Layer) : l)) };
}

function AlignButtons({ ids }: { ids: string[] }) {
  const doc = useEditor((s) => s.project!.doc);
  const run = (k: AlignKind) => useEditor.getState().setDoc(align(doc, ids, k));
  const target = ids.length > 1 ? 'selection' : 'page';
  return (
    <>
      <IconButton label={`Align left (${target})`} onClick={() => run('left')}>
        <AlignStartVertical size={15} />
      </IconButton>
      <IconButton label={`Align center (${target})`} onClick={() => run('hcenter')}>
        <AlignCenterVertical size={15} />
      </IconButton>
      <IconButton label={`Align right (${target})`} onClick={() => run('right')}>
        <AlignEndVertical size={15} />
      </IconButton>
      <IconButton label={`Align top (${target})`} onClick={() => run('top')}>
        <AlignStartHorizontal size={15} />
      </IconButton>
      <IconButton label={`Align middle (${target})`} onClick={() => run('vcenter')}>
        <AlignCenterHorizontal size={15} />
      </IconButton>
      <IconButton label={`Align bottom (${target})`} onClick={() => run('bottom')}>
        <AlignEndHorizontal size={15} />
      </IconButton>
    </>
  );
}

function GeometrySection({ layer }: { layer: Layer }) {
  const set = (p: Partial<Layer>, key: string) =>
    useEditor.getState().updateLayer(layer.id, { ...p, ...(layer.type === 'frame' && ('x' in p || 'y' in p || 'width' in p || 'height' in p || 'rotation' in p) ? { slot: null } : {}) } as Partial<Layer>, key);
  return (
    <div className="panel-section">
      <span className="section-title">Position & size</span>
      <div className="grid-2">
        <NumberField label="X" value={layer.x} onChange={(v) => set({ x: v }, 'geo')} unit="px" />
        <NumberField label="Y" value={layer.y} onChange={(v) => set({ y: v }, 'geo')} unit="px" />
        <NumberField label="Width" value={layer.width} min={4} onChange={(v) => set({ width: v }, 'geo')} unit="px" />
        <NumberField label="Height" value={layer.height} min={4} onChange={(v) => set({ height: v }, 'geo')} unit="px" />
        <NumberField label="Rotation" value={layer.rotation} min={-360} max={360} onChange={(v) => set({ rotation: v }, 'geo')} unit="°" />
      </div>
      <RangeField label="Opacity" min={0} max={1} step={0.01} value={layer.opacity} onChange={(v) => set({ opacity: v }, 'opacity-' + layer.id)} format={(v) => `${Math.round(v * 100)}%`} />
    </div>
  );
}

function MultiProps({ layers }: { layers: Layer[] }) {
  const ids = layers.map((l) => l.id);
  const ed = useEditor.getState();
  const doc = useEditor((s) => s.project!.doc);
  return (
    <div>
      <div className="panel-head">
        <h2>{layers.length} layers</h2>
      </div>
      <div className="panel-section">
        <span className="section-title">Align to selection</span>
        <div className="row" style={{ gap: 0, flexWrap: 'wrap' }}>
          <AlignButtons ids={ids} />
        </div>
        <span className="section-title">Distribute</span>
        <div className="row">
          <IconButton label="Distribute horizontally" disabled={layers.length < 3} onClick={() => ed.setDoc(distribute(doc, ids, 'x'))}>
            <AlignHorizontalDistributeCenter size={16} />
          </IconButton>
          <IconButton label="Distribute vertically" disabled={layers.length < 3} onClick={() => ed.setDoc(distribute(doc, ids, 'y'))}>
            <AlignVerticalDistributeCenter size={16} />
          </IconButton>
          {layers.length < 3 && <span className="subtle">Select 3+ to distribute</span>}
        </div>
      </div>
      <div className="panel-section">
        <div className="grid-2">
          <button className="btn btn-sm" onClick={() => ed.duplicate(ids)}>
            <Copy size={14} /> Duplicate
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => ed.removeLayers(ids.filter((id) => !layers.find((l) => l.id === id)?.locked))}>
            <Trash2 size={14} /> Delete
          </button>
          <button className="btn btn-sm" onClick={() => ed.updateLayers(ids, (l) => ({ ...l, locked: true }))}>
            <Lock size={14} /> Lock all
          </button>
          <button className="btn btn-sm" onClick={() => ed.updateLayers(ids, (l) => ({ ...l, locked: false }))}>
            <Unlock size={14} /> Unlock all
          </button>
        </div>
      </div>
    </div>
  );
}

function CanvasProps() {
  const project = useEditor((s) => s.project!);
  const doc = project.doc;
  const showSafe = useUi((s) => s.showSafeArea);
  const custom = useLibrary((s) => s.customPresets);
  const issues = useDesignIssues(doc);
  const [w, setW] = useState(doc.width);
  const [h, setH] = useState(doc.height);
  const presets = [...CANVAS_PRESET_CONFIG, ...custom];

  const resize = (width: number, height: number, presetId: string) => {
    if (width === doc.width && height === doc.height) return;
    useEditor.getState().setDoc(scaleDoc(doc, width, height, presetId));
    setW(width);
    setH(height);
  };

  return (
    <div>
      <div className="panel-head">
        <h2>Pin</h2>
      </div>
      <div className="panel-section">
        <span className="section-title">Canvas size</span>
        <select
          className="select input-sm"
          aria-label="Canvas preset"
          value={presets.find((p) => p.id === doc.presetId) ? doc.presetId : 'custom'}
          onChange={(e) => {
            const p = presets.find((x) => x.id === e.target.value);
            if (p) resize(p.width, p.height, p.id);
          }}
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.width}×{p.height} ({STATUS_LABEL[p.status]})
            </option>
          ))}
          <option value="custom" disabled>
            Custom size
          </option>
        </select>
        <div className="grid-2">
          <NumberField label="Width" value={w} min={CANVAS_LIMITS.min} max={CANVAS_LIMITS.max} onChange={setW} unit="px" />
          <NumberField label="Height" value={h} min={CANVAS_LIMITS.min} max={CANVAS_LIMITS.max} onChange={setH} unit="px" />
        </div>
        <button className="btn btn-sm" disabled={w === doc.width && h === doc.height} onClick={() => resize(Math.round(w), Math.round(h), 'custom')}>
          Resize canvas
        </button>
        <span className="subtle">Resizing re-flows the collage and scales other layers. Undo to revert.</span>
      </div>
      <div className="panel-section">
        <Toggle label="Show safe-area guides" checked={showSafe} onChange={(v) => useUi.getState().set({ showSafeArea: v })} />
        <span className="subtle">Guides are never exported.</span>
      </div>
      <div className="panel-section">
        <div className="row-between">
          <span className="section-title">Design check</span>
          {issues.length > 0 && <span className="chip chip-warn">{issues.length}</span>}
        </div>
        <IssueList
          issues={showSafe ? issues : issues.filter((i) => i.code !== 'outside-safe-area')}
          onPick={(i) => i.layerId && useEditor.getState().select([i.layerId])}
        />
        <span className="subtle">Warnings only — you can always export.</span>
      </div>
    </div>
  );
}
