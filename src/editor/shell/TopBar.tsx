import { Check, ChevronDown, Cloud, Copy, Download, Eye, Layers, Loader2, MoreHorizontal, Redo2, Save, Sparkles, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CANVAS_PRESET_CONFIG, presetForSize } from '../../config/canvasPresets';
import { scaleDoc } from '../../model/docOps';
import { useEditor } from '../../store/editorStore';
import { useLibrary } from '../../store/libraryStore';
import { saveProject } from '../../store/projectActions';
import { useUi } from '../../store/uiStore';
import { IconButton } from '../../ui/controls';
import { BrandMark } from '../../ui/BrandMark';

const ZOOMS = [0.25, 0.5, 0.72, 1, 1.5, 2];

export function TopBar() {
  const project = useEditor((s) => s.project!);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const ui = useUi();
  const custom = useLibrary((s) => s.customPresets);
  const [name, setName] = useState(project.name);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => setName(project.name), [project.name]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menu]);

  const doc = project.doc;
  const presets = [...CANVAS_PRESET_CONFIG, ...custom];
  const preset = presets.find((p) => p.width === doc.width && p.height === doc.height);

  return (
    <header className="topbar">
      <a href="#/" className="brand" aria-label="PinCraft home">
        <BrandMark size={38} />
        <span className="brand-text">
          <strong>PinCraft</strong>
          <span>Pinterest Design Studio</span>
        </span>
      </a>
      <input
        className="name-input"
        value={name}
        aria-label="Project name"
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== project.name && useEditor.getState().updateProject({ name: name.trim() })}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
      <label className="tb-select hide-md" title={preset?.description}>
        <span className="sr-only">Pin size</span>
        <select
          value={preset?.id ?? 'custom'}
          onChange={(e) => {
            const p = presets.find((x) => x.id === e.target.value);
            if (p) useEditor.getState().setDoc(scaleDoc(doc, p.width, p.height, presetForSize(p.width, p.height, custom)?.id ?? p.id));
          }}
        >
          {presets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name.replace(' — Recommended', '').replace(/ — \d+×\d+$/, '')} ({p.width} × {p.height})
            </option>
          ))}
          {!preset && <option value="custom">Custom ({doc.width} × {doc.height})</option>}
        </select>
        <ChevronDown size={16} />
      </label>
      <div className="tb-group">
        <IconButton label="Undo (Ctrl+Z)" onClick={() => useEditor.getState().undo()} disabled={!canUndo}>
          <Undo2 size={19} />
        </IconButton>
        <IconButton label="Redo (Ctrl+Shift+Z)" onClick={() => useEditor.getState().redo()} disabled={!canRedo}>
          <Redo2 size={19} />
        </IconButton>
      </div>
      <label className="tb-select tb-zoom">
        <span className="sr-only">Zoom</span>
        <select value={ui.zoom === null ? 'fit' : String(ui.zoom)} onChange={(e) => ui.set({ zoom: e.target.value === 'fit' ? null : Number(e.target.value) })}>
          <option value="fit">{ui.zoom === null ? `${Math.round(ui.effectiveZoom * 100)}% (Fit)` : 'Fit to screen'}</option>
          {ZOOMS.map((z) => (
            <option key={z} value={z}>
              {Math.round(z * 100)}%
            </option>
          ))}
        </select>
        <ChevronDown size={16} />
      </label>
      <span className="save-state hide-md" aria-live="polite">
        {ui.saveState === 'saving' ? <Loader2 size={13} /> : ui.saveState === 'error' ? <Cloud size={13} /> : <Check size={13} />}
        {ui.saveState === 'saving' ? 'Saving…' : ui.saveState === 'error' ? 'Save failed' : 'Saved'}
      </span>
      <div className="grow" />
      <button className="btn btn-outline hide-sm" onClick={() => ui.set({ modal: 'aiAssistant' })}>
        <Sparkles size={17} /> AI Text
      </button>
      <button className="btn btn-outline" onClick={() => ui.set({ modal: 'preview' })}>
        <Eye size={17} /> Preview
      </button>
      <button
        className="btn btn-pink"
        onClick={async () => {
          try {
            await saveProject(useEditor.getState().project!);
            ui.toast('Project saved', 'success');
          } catch {
            ui.toast('Saving failed — browser storage may be full.', 'error');
          }
        }}
      >
        <Save size={17} /> <span className="hide-sm">Save</span>
      </button>
      <button className="btn btn-export" onClick={() => ui.set({ modal: 'export' })}>
        <Download size={17} /> Export
      </button>
      <div className="tb-menu" ref={menuRef}>
        <IconButton label="More actions" onClick={() => setMenu((m) => !m)}>
          <MoreHorizontal size={20} />
        </IconButton>
        {menu && (
          <div className="popover menu" role="menu" style={{ right: 0, top: '100%', marginTop: 6 }}>
            <button role="menuitem" className="menu-item" onClick={() => (setMenu(false), ui.set({ modal: 'variations' }))}>
              <Layers size={15} /> Fresh variations…
            </button>
            <button role="menuitem" className="menu-item" onClick={() => (setMenu(false), ui.set({ modal: 'saveTemplate' }))}>
              <Copy size={15} /> Save as template…
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
