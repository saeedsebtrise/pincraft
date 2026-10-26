import { Crop, FlipHorizontal, FlipVertical, Repeat, RotateCcw, Sparkles, Unlink, Upload } from 'lucide-react';
import { useMemo } from 'react';
import { LOW_RES_UPSCALE } from '../../config/colors';
import { DEFAULT_ADJUST } from '../../model/factory';
import { placeImage } from '../../model/geometry';
import type { FrameLayer, ImageAdjustments } from '../../model/types';
import { useAssets } from '../../store/assetStore';
import { useEditor } from '../../store/editorStore';
import { useLibrary } from '../../store/libraryStore';
import { useUi } from '../../store/uiStore';
import { ColorField, RangeField, Seg, Toggle } from '../../ui/controls';
import { thumbUrl } from '../../ui/imageUrl';
import { importAndPlace } from '../importImages';

function LibraryPick({ id, selected, onPick }: { id: string; selected: boolean; onPick: () => void }) {
  const img = useAssets((s) => s.previews[id]);
  const url = useMemo(() => (img ? thumbUrl(img, 120) : ''), [img]);
  return (
    <button type="button" className="asset" onClick={onPick} aria-pressed={selected} aria-label="Use this image" style={{ padding: 0, borderColor: selected ? 'var(--text)' : undefined }}>
      {url && <img src={url} alt="" />}
    </button>
  );
}

export function FrameProps({ layer }: { layer: FrameLayer }) {
  const ed = useEditor.getState();
  const assetIds = useEditor((s) => s.project!.assetIds);
  const meta = useAssets((s) => (layer.assetId ? s.metas[layer.assetId] : undefined));
  const cropId = useUi((s) => s.cropId);
  const swapSourceId = useUi((s) => s.swapSourceId);
  const kit = useLibrary((s) => s.activeKit());
  const set = (p: Partial<FrameLayer>, key?: string) => ed.updateLayer<FrameLayer>(layer.id, p, key);
  const adj = (p: Partial<ImageAdjustments>, key: string) => set({ adjust: { ...layer.adjust, ...p } }, key);
  const upscale = meta ? placeImage(layer, meta.width, meta.height).scale : 0;
  const cropping = cropId === layer.id;

  return (
    <>
      <div className="panel-section">
        {meta && (
          <span className="subtle">
            Source {meta.width}×{meta.height}px · shown at {Math.round(upscale * 100)}%
          </span>
        )}
        {upscale > LOW_RES_UPSCALE && <span className="chip chip-warn">Low resolution — may look blurry</span>}
        {!layer.assetId && <span className="subtle">This frame is empty. Pick an image below or drag one from Uploads.</span>}
        <div className="grid-2">
          <button className="btn btn-sm" disabled={!layer.assetId} aria-pressed={cropping} onClick={() => useUi.getState().set({ cropId: cropping ? null : layer.id })}>
            <Crop size={14} /> {cropping ? 'Done cropping' : 'Crop / reposition'}
          </button>
          <button
            className="btn btn-sm"
            aria-pressed={swapSourceId === layer.id}
            data-tip="Then click another frame"
            onClick={() => useUi.getState().set({ swapSourceId: swapSourceId === layer.id ? null : layer.id })}
          >
            <Repeat size={14} /> Swap image
          </button>
        </div>
        {layer.slot !== null && (
          <span className="subtle">
            Collage cell {layer.slot + 1}. Drag it onto another cell to swap images.{' '}
            <button className="btn btn-ghost btn-sm" onClick={() => set({ slot: null })}>
              <Unlink size={13} /> Detach from grid
            </button>
          </span>
        )}
      </div>

      <div className="panel-section">
        <span className="section-title">Replace image</span>
        <div className="asset-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {assetIds.map((id) => (
            <LibraryPick key={id} id={id} selected={layer.assetId === id} onPick={() => set({ assetId: id, crop: { zoom: 1, fx: 0.5, fy: 0.5 } })} />
          ))}
        </div>
        <label className="btn btn-sm">
          <Upload size={14} /> Upload new image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])];
              e.target.value = '';
              const ids = await importAndPlace(files, null, false);
              if (ids[0]) set({ assetId: ids[0], crop: { zoom: 1, fx: 0.5, fy: 0.5 } });
            }}
          />
        </label>
      </div>

      {layer.assetId && (
        <div className="panel-section">
          <div className="row-between" style={{ marginBottom: 6 }}>
            <span className="section-title">Crop & position</span>
            <button
              type="button"
              className="btn btn-sm btn-pink"
              style={{ fontSize: 11, height: 26, padding: '0 8px' }}
              onClick={() => {
                const doc = useEditor.getState().project!.doc;
                set({ x: 0, y: 0, width: doc.width, height: doc.height, rotation: 0, slot: 0, fit: 'cover' });
                useUi.getState().toast('Image auto-fitted to cover full canvas!', 'success');
              }}
              title="Expand image to cover the entire Pin canvas"
            >
              <Sparkles size={12} /> Auto-Fit Canvas
            </button>
          </div>
          <Seg
            label="Fit"
            value={layer.fit}
            onChange={(fit) => set({ fit })}
            options={[
              { value: 'cover', label: 'Fill', title: 'Fill frame (crop)' },
              { value: 'contain', label: 'Fit', title: 'Fit whole image' },
            ]}
          />
          <RangeField label="Zoom" min={1} max={5} step={0.01} value={layer.crop.zoom} onChange={(v) => set({ crop: { ...layer.crop, zoom: v } }, 'zoom-' + layer.id)} format={(v) => `${Math.round(v * 100)}%`} />
          <RangeField label="Horizontal position" min={0} max={1} step={0.005} value={layer.crop.fx} onChange={(v) => set({ crop: { ...layer.crop, fx: v } }, 'fx-' + layer.id)} format={(v) => `${Math.round(v * 100)}%`} />
          <RangeField label="Vertical position" min={0} max={1} step={0.005} value={layer.crop.fy} onChange={(v) => set({ crop: { ...layer.crop, fy: v } }, 'fy-' + layer.id)} format={(v) => `${Math.round(v * 100)}%`} />
          <div className="row">
            <button className="btn btn-sm" aria-pressed={layer.flipX} onClick={() => set({ flipX: !layer.flipX })}>
              <FlipHorizontal size={14} /> Flip H
            </button>
            <button className="btn btn-sm" aria-pressed={layer.flipY} onClick={() => set({ flipY: !layer.flipY })}>
              <FlipVertical size={14} /> Flip V
            </button>
            <button className="btn btn-sm" onClick={() => set({ crop: { zoom: 1, fx: 0.5, fy: 0.5 }, flipX: false, flipY: false })} data-tip="Reset crop">
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      )}

      {layer.assetId && (
        <div className="panel-section">
          <div className="row-between">
            <span className="section-title">Adjust</span>
            <button className="btn btn-ghost btn-sm" onClick={() => set({ adjust: { ...DEFAULT_ADJUST } })}>
              Reset
            </button>
          </div>
          <RangeField label="Brightness" min={-0.5} max={0.5} step={0.01} value={layer.adjust.brightness} onChange={(v) => adj({ brightness: v }, 'adj-b-' + layer.id)} format={(v) => `${Math.round(v * 200)}`} />
          <RangeField label="Contrast" min={-50} max={50} step={1} value={layer.adjust.contrast} onChange={(v) => adj({ contrast: v }, 'adj-c-' + layer.id)} format={(v) => `${Math.round(v * 2)}`} />
          <RangeField label="Saturation" min={-2} max={2} step={0.05} value={layer.adjust.saturation} onChange={(v) => adj({ saturation: v }, 'adj-s-' + layer.id)} format={(v) => `${Math.round(v * 50)}`} />
          <RangeField label="Warmth" min={-1} max={1} step={0.02} value={layer.adjust.warmth} onChange={(v) => adj({ warmth: v }, 'adj-w-' + layer.id)} format={(v) => `${Math.round(v * 100)}`} />
          <RangeField label="Blur" min={0} max={30} step={1} value={layer.adjust.blur} onChange={(v) => adj({ blur: v }, 'adj-bl-' + layer.id)} />
          <Toggle label="Grayscale" checked={layer.adjust.grayscale} onChange={(v) => adj({ grayscale: v }, 'adj-g')} />
          <span className="subtle">Edits are non-destructive — your original image is never changed.</span>
        </div>
      )}

      <div className="panel-section">
        <span className="section-title">Frame</span>
        <RangeField label="Corner radius" min={0} max={Math.round(Math.min(layer.width, layer.height) / 2)} value={layer.cornerRadius} onChange={(v) => set({ cornerRadius: v }, 'radius-' + layer.id)} format={(v) => `${Math.round(v)}px`} />
        <RangeField label="Border" min={0} max={40} value={layer.strokeWidth} onChange={(v) => set({ strokeWidth: v }, 'stroke-' + layer.id)} format={(v) => `${Math.round(v)}px`} />
        {layer.strokeWidth > 0 && <ColorField label="Border color" value={layer.stroke} onChange={(v) => set({ stroke: v }, 'stroke-c-' + layer.id)} brandColors={[kit.primary, kit.secondary, kit.accent]} />}
      </div>
    </>
  );
}
