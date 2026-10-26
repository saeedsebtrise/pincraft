import { ImagePlus, Plus, Trash2, Wand2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { thumbUrl } from '../../ui/imageUrl';
import { UPLOAD_LIMITS } from '../../config/colors';
import { frames } from '../../model/docOps';
import { useAssets } from '../../store/assetStore';
import { useEditor } from '../../store/editorStore';
import { useUi } from '../../store/uiStore';
import { IconButton, Toggle } from '../../ui/controls';
import { newFrame } from '../blocks';
import { ASSET_MIME } from '../canvas/EditorCanvas';
import { fillPhotos, importAndPlace } from '../importImages';

function Thumb({ id }: { id: string }) {
  const img = useAssets((s) => s.previews[id]);
  const url = useMemo(() => (img ? thumbUrl(img) : ''), [img]);
  return url ? <img src={url} alt="" draggable={false} /> : null;
}

export function UploadsPanel() {
  const project = useEditor((s) => s.project!);
  const metas = useAssets((s) => s.metas);
  const previews = useAssets((s) => s.previews);
  const missing = useAssets((s) => s.missing);
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [allowDup, setAllowDup] = useState(false);
  const [smart, setSmart] = useState(true);
  const used = new Set(frames(project.doc).map((f) => f.assetId));
  const empty = frames(project.doc).filter((f) => !f.assetId).length;
  const ed = useEditor.getState();
  const allPages = useUi((s) => s.fillAllPages);
  const pageCount = project.pages.length;
  const emptyAnywhere = allPages && pageCount > 1 ? project.pages.some((d, i) => frames(i === project.activePage ? project.doc : d).some((f) => !f.assetId)) : empty > 0;

  const autoFill = (refill: boolean) => {
    const n = fillPhotos(project.assetIds.filter((id) => !missing[id]), { refill, allowDuplicates: allowDup, smart });
    if (n > 1) useUi.getState().toast(`Photos ${refill ? 'refilled' : 'added'} on all ${n} pages`, 'success');
  };

  return (
    <div>
      <div className="panel-head">
        <h2>Uploads</h2>
        <span className="subtle">
          {project.assetIds.length}/{UPLOAD_LIMITS.maxImagesPerProject}
        </span>
      </div>
      <div className="panel-section">
        <div
          className={`dropzone ${over ? 'is-over' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            importAndPlace([...e.dataTransfer.files]);
          }}
        >
          <ImagePlus size={26} />
          <strong>Upload images</strong>
          <span className="subtle">Drag & drop or click · JPEG, PNG, WEBP · up to {UPLOAD_LIMITS.maxFileBytes / 1048576} MB each</span>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            importAndPlace([...(e.target.files ?? [])]);
            e.target.value = '';
          }}
        />
        <span className="subtle">Images stay on this device. Nothing is uploaded to a server.</span>
      </div>

      <div className="panel-section">
        <div className="row-between">
          <span className="section-title">Auto-fill frames</span>
          {empty > 0 && <span className="chip chip-warn">{empty} empty</span>}
        </div>
        {empty > 0 && project.assetIds.length === 0 && <span className="subtle">Upload images to start designing.</span>}
        {empty > 0 && project.assetIds.length > 0 && (
          <span className="subtle">
            {empty} image slot{empty > 1 ? 's' : ''} still need{empty > 1 ? '' : 's'} an image.
          </span>
        )}
        {pageCount > 1 && (
          <Toggle label={`Apply to all ${pageCount} pages`} checked={allPages} onChange={(v) => useUi.getState().set({ fillAllPages: v })} />
        )}
        <Toggle label="Smart match (best fit for each frame)" checked={smart} onChange={setSmart} />
        <Toggle label="Allow the same image twice" checked={allowDup} onChange={setAllowDup} />
        <div className="grid-2">
          <button className="btn btn-sm" disabled={!project.assetIds.length || !emptyAnywhere} onClick={() => autoFill(false)}>
            <Wand2 size={14} /> Fill empty
          </button>
          <button className="btn btn-sm" disabled={!project.assetIds.length} onClick={() => autoFill(true)}>
            <Wand2 size={14} /> Refill all
          </button>
        </div>
      </div>

      <div className="panel-section">
        <span className="section-title">Image library</span>
        {project.assetIds.length === 0 && <span className="subtle">Upload images to start designing.</span>}
        <span className="subtle">Drag an image onto a frame to fill it, or onto the canvas to add it.</span>
        <div className="asset-grid">
          {project.assetIds.map((id, i) => {
            const m = metas[id];
            return (
              <div
                key={id}
                className="asset"
                draggable
                tabIndex={0}
                aria-label={`Image ${i + 1}${m ? `, ${m.width}×${m.height}` : ''}`}
                onDragStart={(e) => {
                  e.dataTransfer.setData(ASSET_MIME, id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                title={m ? `${m.name} · ${m.width}×${m.height}` : 'Loading'}
              >
                {previews[id] ? <Thumb id={id} /> : missing[id] ? <span className="subtle" style={{ padding: 8, display: 'block' }}>Missing</span> : null}
                {used.has(id) && <span className="chip asset-badge">In use</span>}
                <div className="asset-actions">
                  <IconButton
                    label="Add to canvas / Auto-fill frame"
                    onClick={() => {
                      const sel = useEditor.getState().selection.map((sid) => project.doc.layers.find((l) => l.id === sid)).find((l) => l?.type === 'frame');
                      if (sel) {
                        ed.updateLayer(sel.id, { assetId: id, crop: { zoom: 1, fx: 0.5, fy: 0.5 } } as never);
                        return;
                      }
                      const empty = frames(project.doc).find((f) => !f.assetId);
                      if (empty) {
                        ed.updateLayer(empty.id, { assetId: id, crop: { zoom: 1, fx: 0.5, fy: 0.5 } } as never);
                        ed.select([empty.id]);
                        return;
                      }
                      ed.addLayers([{ ...newFrame(project.doc, m?.width, m?.height), assetId: id }]);
                    }}
                  >
                    <Plus size={14} />
                  </IconButton>
                  <IconButton
                    label="Remove from project"
                    onClick={() => {
                      if (used.has(id) && !confirm('This image is used in the design. Remove it and empty those frames?')) return;
                      ed.updateDoc((d) => ({
                        ...d,
                        layers: d.layers.map((l) => (l.type === 'frame' && l.assetId === id ? { ...l, assetId: null } : l)),
                        background: d.background.assetId === id ? { ...d.background, type: 'solid', assetId: null } : d.background,
                      }));
                      ed.updateProject({ assetIds: useEditor.getState().project!.assetIds.filter((a) => a !== id) });
                      useUi.getState().toast('Image removed from this project');
                    }}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
