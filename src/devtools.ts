import { importAndPlace } from './editor/importImages';
import { exportDocument, renderDocToCanvas, previewImages } from './services/render';
import { useAssets } from './store/assetStore';
import { useEditor } from './store/editorStore';
import { useLibrary } from './store/libraryStore';
import { createPin } from './store/projectActions';
import { useUi } from './store/uiStore';

/** Exposes app internals on window.__pf in development so acceptance tests can drive real workflows. */
export function installDevtools() {
  (window as unknown as Record<string, unknown>).__pf = {
    editor: useEditor,
    ui: useUi,
    assets: useAssets,
    library: useLibrary,
    createPin,
    importAndPlace,
    exportDocument,
    renderDocToCanvas,
    previewImages,
  };
}
