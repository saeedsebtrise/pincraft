import {
  FolderOpen, Home, Layers, LayoutGrid, LayoutTemplate, Loader2, PaintBucket, Palette, Shapes, Type, Upload,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useEditor } from '../store/editorStore';
import { useLibrary } from '../store/libraryStore';
import { useUi, type LeftTab } from '../store/uiStore';
import { repos } from '../storage/repositories';
import { docTextLayers, ensureFonts } from '../services/fonts';
import { ErrorBoundary } from '../ui/controls';
import { EditorCanvas } from './canvas/EditorCanvas';
import { useAutosave, usePasteImages, useProjectAssets, useShortcuts } from './hooks';
import { importAndPlace } from './importImages';
import { AiAssistantModal } from './modals/AiAssistantModal';
import { ExportModal } from './modals/ExportModal';
import { PreviewModal } from './modals/PreviewModal';
import { SaveTemplateModal } from './modals/SaveTemplateModal';
import { VariationsModal } from './modals/VariationsModal';
import { BackgroundPanel, BrandPanel, ElementsPanel, ProjectsPanel } from './panels/MiscPanels';
import { LayoutsPanel } from './panels/LayoutsPanel';
import { TemplatesPanel } from './panels/TemplatesPanel';
import { TextPanel } from './panels/TextPanel';
import { UploadsPanel } from './panels/UploadsPanel';
import { PropertiesPanel } from './properties/PropertiesPanel';
import { CanvasActions, ToolStrip } from './shell/CanvasTools';
import { PageStrip } from './shell/PageStrip';
import { TopBar } from './shell/TopBar';

const TABS: { id: LeftTab; label: string; icon: React.ReactNode }[] = [
  { id: 'templates', label: 'Templates', icon: <LayoutTemplate size={22} /> },
  { id: 'layouts', label: 'Layouts', icon: <LayoutGrid size={22} /> },
  { id: 'uploads', label: 'Uploads', icon: <Upload size={22} /> },
  { id: 'text', label: 'Text', icon: <Type size={22} /> },
  { id: 'elements', label: 'Elements', icon: <Shapes size={22} /> },
  { id: 'background', label: 'Background', icon: <PaintBucket size={22} /> },
  { id: 'brand', label: 'Brand Kit', icon: <Palette size={22} /> },
  { id: 'projects', label: 'Projects', icon: <FolderOpen size={22} /> },
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
        <Loader2 aria-label="Loading" />
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
  const fontSig = doc.layers.map((l) => (l.type === 'text' ? `${l.fontFamily}${l.fontWeight}${l.italic}` : '')).join('|');
  useEffect(() => {
    const current = useEditor.getState().project?.doc;
    if (current) ensureFonts(docTextLayers(current)).then(() => useUi.getState().bumpFonts());
  }, [fontSig]);

  const panelError = (e: Error, reset: () => void) => <PanelError message={e.message} reset={reset} />;

  return (
    <div className="editor">
      <TopBar />
      <div className={`editor-body ${panelOpen ? '' : 'panel-closed'}`}>
        <nav className="rail" aria-label="Editor tools">
          <a className="rail-item" href="#/">
            <Home size={22} />
            Home
          </a>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="rail-item"
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
          <div className="grow" />
          <button type="button" className="rail-item" onClick={() => ui.set({ modal: 'variations' })}>
            <Layers size={22} />
            Variations
          </button>
        </nav>
        <aside className="side-panel" aria-label={`${tab} panel`}>
          {panelOpen && (
            <ErrorBoundary fallback={panelError}>
              {tab === 'templates' && <TemplatesPanel onClose={() => setPanelOpen(false)} />}
              {tab === 'uploads' && <UploadsPanel />}
              {tab === 'layouts' && <LayoutsPanel />}
              {tab === 'text' && <TextPanel />}
              {tab === 'brand' && <BrandPanel />}
              {tab === 'background' && <BackgroundPanel />}
              {tab === 'elements' && <ElementsPanel />}
              {tab === 'projects' && <ProjectsPanel />}
            </ErrorBoundary>
          )}
        </aside>
        <main className="work-column">
          <div className="work-area">
            <ToolStrip />
            <ErrorBoundary fallback={panelError}>
              <EditorCanvas />
            </ErrorBoundary>
            <CanvasActions />
          </div>
          <PageStrip />
        </main>
        <aside className="props" aria-label="Properties">
          <ErrorBoundary fallback={panelError}>
            <PropertiesPanel />
          </ErrorBoundary>
        </aside>
      </div>
      {ui.modal === 'export' && <ExportModal />}
      {ui.modal === 'preview' && <PreviewModal />}
      {ui.modal === 'variations' && <VariationsModal />}
      {ui.modal === 'saveTemplate' && <SaveTemplateModal />}
      {ui.modal === 'aiAssistant' && <AiAssistantModal />}
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
