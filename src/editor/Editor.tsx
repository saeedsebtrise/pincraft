import {
  ArrowLeft, Check, Cloud, Copy, Download, Eye, FolderOpen, Image as ImageIcon, LayoutGrid, LayoutTemplate,
  Layers, Loader2, Palette, PaintBucket, Redo2, Save, Shapes, Sparkles, Type, Undo2, Upload,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { STATUS_LABEL, findPreset } from '../config/canvasPresets';
import { useEditor } from '../store/editorStore';
import { useLibrary } from '../store/libraryStore';
import { saveProject } from '../store/projectActions';
import { useUi, type LeftTab, type ModalName } from '../store/uiStore';
import { repos } from '../storage/repositories';
import { docTextLayers, ensureFonts } from '../services/fonts';
import { ErrorBoundary, IconButton } from '../ui/controls';
import { EditorCanvas } from './canvas/EditorCanvas';
import { useAutosave, usePasteImages, useProjectAssets, useShortcuts } from './hooks';
import { importAndPlace } from './importImages';
import { ExportModal } from './modals/ExportModal';
import { PreviewModal } from './modals/PreviewModal';
import { SaveTemplateModal } from './modals/SaveTemplateModal';
import { VariationsModal } from './modals/VariationsModal';
import { BackgroundPanel, BrandPanel, ElementsPanel, ProjectsPanel } from './panels/MiscPanels';
import { LayersPanel } from './panels/LayersPanel';
import { LayoutsPanel } from './panels/LayoutsPanel';
import { TemplatesPanel } from './panels/TemplatesPanel';
import { TextPanel } from './panels/TextPanel';
import { UploadsPanel } from './panels/UploadsPanel';
import { PropertiesPanel } from './properties/PropertiesPanel';

const TABS: { id: LeftTab; label: string; icon: React.ReactNode }[] = [
  { id: 'templates', label: 'Templates', icon: <LayoutTemplate size={20} /> },
  { id: 'uploads', label: 'Uploads', icon: <Upload size={20} /> },
  { id: 'layouts', label: 'Layouts', icon: <LayoutGrid size={20} /> },
  { id: 'text', label: 'Text', icon: <Type size={20} /> },
  { id: 'brand', label: 'Brand Kit', icon: <Palette size={20} /> },
  { id: 'background', label: 'Background', icon: <PaintBucket size={20} /> },
  { id: 'elements', label: 'Elements', icon: <Shapes size={20} /> },
  { id: 'layers', label: 'Layers', icon: <Layers size={20} /> },
  { id: 'projects', label: 'Projects', icon: <FolderOpen size={20} /> },
];

export function EditorScreen({ projectId }: { projectId: string }) {
  const project = useEditor((s) => s.project);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        await useLibrary.getState().load();
        const p = await repos.projects.get(projectId);
        if (cancelled) return;
        if (!p) {
          setError("This project couldn't be found. It may have been deleted.");
          return;
        }
        useEditor.getState().load(p);
        useUi.getState().set({ cropId: null, editingTextId: null, swapSourceId: null, zoom: null, modal: null });
        await ensureFonts(docTextLayers(p.doc));
        useUi.getState().bumpFonts();
      } catch (e) {
        setError(`Failed to load project: ${(e as Error).message}`);
      }
    })();
    return () => {
      cancelled = true;
      useEditor.getState().close();
    };
  }, [projectId]);

  if (error) {
    return (
      <div className="error-screen">
        <div className="stack" style={{ maxWidth: 420 }}>
          <h2>Can't open this Pin</h2>
          <p className="muted">{error}</p>
          <a className="btn btn-dark" href="#/">
            Back to dashboard
          </a>
        </div>
      </div>
    );
  }
  if (!project || project.id !== projectId) {
    return (
      <div className="error-screen">
        <Loader2 className="spin" aria-label="Loading" />
      </div>
    );
  }
  return (
    <ErrorBoundary>
      <EditorLoaded />
    </ErrorBoundary>
  );
}

function EditorLoaded() {
  const ui = useUi();
  const tab = ui.leftTab;
  const [panelOpen, setPanelOpen] = useState(true);
  useShortcuts();
  useAutosave();
  useProjectAssets();
  const onPasteFiles = useCallback((files: File[]) => void importAndPlace(files), []);
  usePasteImages(onPasteFiles);

  // Load fonts whenever the document starts using a new face.
  const doc = useEditor((s) => s.project!.doc);
  const fontSig = doc.layers.filter((l) => l.type === 'text').map((l) => (l.type === 'text' ? `${l.fontFamily}${l.fontWeight}${l.italic}` : '')).join('|');
  useEffect(() => {
    const doc = useEditor.getState().project?.doc;
    if (doc) ensureFonts(docTextLayers(doc)).then(() => useUi.getState().bumpFonts());
  }, [fontSig]);

  return (
    <div className="editor">
      <TopBar />
      <div className={`editor-body ${panelOpen ? '' : 'panel-closed'}`}>
        <nav className="rail" aria-label="Editor tools">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id && panelOpen}
              onClick={() => {
                if (tab === t.id) setPanelOpen((o) => !o);
                else {
                  ui.setLeftTab(t.id);
                  setPanelOpen(true);
                }
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
        <aside className="side-panel" aria-label={`${tab} panel`}>
          {panelOpen && (
            <ErrorBoundary fallback={(e, reset) => <PanelError message={e.message} reset={reset} />}>
              {tab === 'templates' && <TemplatesPanel />}
              {tab === 'uploads' && <UploadsPanel />}
              {tab === 'layouts' && <LayoutsPanel />}
              {tab === 'text' && <TextPanel />}
              {tab === 'brand' && <BrandPanel />}
              {tab === 'background' && <BackgroundPanel />}
              {tab === 'elements' && <ElementsPanel />}
              {tab === 'layers' && <LayersPanel />}
              {tab === 'projects' && <ProjectsPanel />}
            </ErrorBoundary>
          )}
        </aside>
        <ErrorBoundary fallback={(e, reset) => <PanelError message={e.message} reset={reset} />}>
          <EditorCanvas />
        </ErrorBoundary>
        <aside className="props" aria-label="Properties">
          <ErrorBoundary fallback={(e, reset) => <PanelError message={e.message} reset={reset} />}>
            <PropertiesPanel />
          </ErrorBoundary>
        </aside>
      </div>
      {ui.modal === 'export' && <ExportModal />}
      {ui.modal === 'preview' && <PreviewModal />}
      {ui.modal === 'variations' && <VariationsModal />}
      {ui.modal === 'saveTemplate' && <SaveTemplateModal />}
    </div>
  );
}

function PanelError({ message, reset }: { message: string; reset: () => void }) {
  return (
    <div className="panel-section">
      <strong>This panel hit an error</strong>
      <span className="subtle">{message}</span>
      <button className="btn btn-sm" onClick={reset}>
        Retry
      </button>
    </div>
  );
}

function TopBar() {
  const project = useEditor((s) => s.project!);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const saveState = useUi((s) => s.saveState);
  const setModal = (m: ModalName) => useUi.getState().set({ modal: m });
  const custom = useLibrary((s) => s.customPresets);
  const preset = findPreset(project.doc.presetId, custom);
  const [name, setName] = useState(project.name);
  useEffect(() => setName(project.name), [project.name]);

  return (
    <header className="topbar">
      <a className="btn btn-ghost btn-sm" href="#/" aria-label="Back to dashboard" data-tip="Dashboard">
        <ArrowLeft size={16} />
        <span className="logo-mark" style={{ width: 24, height: 24, borderRadius: 6 }}>
          <ImageIcon size={14} />
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
      <span className="chip hide-sm" title={preset?.description}>
        {project.doc.width}×{project.doc.height} · {preset ? STATUS_LABEL[preset.status] : 'Custom'}
      </span>
      <span className="save-state hide-sm" aria-live="polite">
        {saveState === 'saving' ? <Loader2 size={13} /> : saveState === 'error' ? <Cloud size={13} /> : <Check size={13} />}
        {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : 'Saved'}
      </span>
      <div className="grow" />
      <IconButton label="Undo (Ctrl+Z)" onClick={() => useEditor.getState().undo()} disabled={!canUndo}>
        <Undo2 size={17} />
      </IconButton>
      <IconButton label="Redo (Ctrl+Shift+Z)" onClick={() => useEditor.getState().redo()} disabled={!canRedo}>
        <Redo2 size={17} />
      </IconButton>
      <span className="tb-sep" />
      <button className="btn btn-sm hide-sm" onClick={() => setModal('variations')} data-tip="Create a fresh variation or batch">
        <Sparkles size={15} /> Fresh Variation
      </button>
      <button className="btn btn-sm hide-sm" onClick={() => setModal('saveTemplate')} data-tip="Save this design as a reusable template">
        <Copy size={15} /> Save as Template
      </button>
      <button className="btn btn-sm" onClick={() => setModal('preview')} data-tip="Full size and mobile feed preview">
        <Eye size={15} /> Preview
      </button>
      <button
        className="btn btn-sm"
        data-tip="Save now (autosave is on)"
        aria-label="Save"
        onClick={async () => {
          try {
            await saveProject(useEditor.getState().project!);
            useUi.getState().toast('Project saved', 'success');
          } catch {
            useUi.getState().toast('Saving failed — browser storage may be full.', 'error');
          }
        }}
      >
        <Save size={15} /> <span className="hide-sm">Save</span>
      </button>
      <button className="btn btn-primary btn-sm" onClick={() => setModal('export')}>
        <Download size={15} /> Export
      </button>
    </header>
  );
}
