import { useEffect, useRef } from 'react';
import { normalizeProject } from '../model/factory';
import type { FrameLayer, Layer } from '../model/types';
import { useAssets } from '../store/assetStore';
import { useEditor } from '../store/editorStore';
import { useUi } from '../store/uiStore';
import { repos } from '../storage/repositories';
import { renderThumbnail } from '../services/render';

const isTyping = (el: EventTarget | null) => {
  const e = el as HTMLElement | null;
  return !!e && (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT' || e.isContentEditable);
};

/** Editor keyboard shortcuts (Delete, ⌘/Ctrl Z, ⇧Z, Y, C, V, D, A, arrows). */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const ed = useEditor.getState();
      const ui = useUi.getState();
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (ui.modal) return;

      if (key === 'escape') {
        if (ui.cropId || ui.swapSourceId || ui.editingTextId) ui.set({ cropId: null, swapSourceId: null, editingTextId: null });
        else ed.select([]);
        return;
      }
      if (key === 'enter' && ui.cropId) {
        ui.set({ cropId: null });
        return;
      }
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) ed.redo();
        else ed.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        ed.redo();
        return;
      }
      if (mod && key === 'c') return ed.copy();
      if (mod && key === 'v') return ed.paste();
      if (mod && key === 'd') {
        e.preventDefault();
        ed.duplicate(ed.selection);
        return;
      }
      if (mod && key === 'a') {
        e.preventDefault();
        ed.select(ed.project?.doc.layers.filter((l) => l.visible && !l.locked).map((l) => l.id) ?? []);
        return;
      }
      if ((key === 'delete' || key === 'backspace') && ed.selection.length) {
        e.preventDefault();
        const deletable = ed.selection.filter((id) => !ed.project?.doc.layers.find((l) => l.id === id)?.locked);
        ed.removeLayers(deletable);
        return;
      }
      const arrows: Record<string, [number, number]> = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
      if (arrows[key] && ed.selection.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const [dx, dy] = arrows[key];
        ed.updateLayers(
          ed.selection,
          (l: Layer) => (l.locked ? l : ({ ...l, x: l.x + dx * step, y: l.y + dy * step, ...(l.type === 'frame' ? { slot: null } : {}) } as Layer)),
          'nudge',
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** Paste images from the clipboard straight into the project. */
export function usePasteImages(onFiles: (files: File[]) => void) {
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) {
        e.preventDefault();
        onFiles(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onFiles]);
}

/**
 * Autosave: debounced write to the project repository on every change, plus a
 * lagging thumbnail for the dashboard. Also flushes when the tab is hidden.
 */
export function useAutosave() {
  const thumb = useRef<string | undefined>(undefined);
  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let thumbTimer: ReturnType<typeof setTimeout> | undefined;
    thumb.current = useEditor.getState().project?.thumbnail;
    // The editor clears the store on unmount before this hook's cleanup runs, so keep the last project for the final flush.
    let latest = useEditor.getState().project;
    let dirty = false;

    const save = async () => {
      const p = useEditor.getState().project ?? latest;
      if (!p) return;
      dirty = false;
      useUi.getState().set({ saveState: 'saving' });
      try {
        await repos.projects.put({ ...normalizeProject(p), thumbnail: thumb.current, meta: { ...p.meta, updatedAt: Date.now() } });
        useUi.getState().set({ saveState: 'saved' });
      } catch {
        useUi.getState().set({ saveState: 'error' });
      }
    };
    const makeThumb = async () => {
      const p = useEditor.getState().project ?? latest;
      if (!p) return;
      try {
        thumb.current = await renderThumbnail(p.doc, 300);
        await save();
      } catch {
        /* thumbnail is cosmetic */
      }
    };

    const unsub = useEditor.subscribe((s, prev) => {
      if (s.revision === prev.revision || !s.project) return;
      latest = s.project;
      dirty = true;
      clearTimeout(saveTimer);
      clearTimeout(thumbTimer);
      useUi.getState().set({ saveState: 'saving' });
      saveTimer = setTimeout(save, 500);
      thumbTimer = setTimeout(makeThumb, 2500);
    });
    const flush = () => {
      if (document.visibilityState === 'hidden') {
        clearTimeout(saveTimer);
        save();
      }
    };
    document.addEventListener('visibilitychange', flush);
    if (!thumb.current) thumbTimer = setTimeout(makeThumb, 1200);
    return () => {
      unsub();
      clearTimeout(saveTimer);
      clearTimeout(thumbTimer);
      document.removeEventListener('visibilitychange', flush);
      if (dirty) save();
    };
  }, []);
}

/** Keeps preview images for every asset the open project references. */
export function useProjectAssets() {
  const ids = useEditor((s) => s.project?.assetIds);
  const doc = useEditor((s) => s.project?.doc);
  useEffect(() => {
    if (!ids || !doc) return;
    const frameIds = doc.layers.filter((l): l is FrameLayer => l.type === 'frame').map((f) => f.assetId).filter(Boolean) as string[];
    const bg = doc.background.assetId ? [doc.background.assetId] : [];
    useAssets.getState().ensureLoaded([...new Set([...ids, ...frameIds, ...bg])]);
  }, [ids, doc]);
}
