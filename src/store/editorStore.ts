/**
 * Editor state: the open project, selection and undo/redo history.
 * History stores immutable PinDocument snapshots (cheap — images are referenced
 * by id), so every doc change is undoable: move, resize, text, color, image
 * replacement, template switch and layer operations.
 */
import { create } from 'zustand';
import { reId } from '../model/docOps';
import { clone, newId, normalizeProject } from '../model/factory';
import type { Id, Layer, PinDocument, Project } from '../model/types';

const HISTORY_LIMIT = 120;
const COALESCE_MS = 900;

type LayerPatch<T extends Layer = Layer> = Partial<NoInfer<T>> | ((l: NoInfer<T>) => NoInfer<T>);

interface EditorState {
  project: Project | null;
  selection: Id[];
  past: PinDocument[];
  future: PinDocument[];
  lastKey: string | null;
  lastTime: number;
  /** Increments on every persisted change; autosave watches it. */
  revision: number;
  clipboard: Layer[];

  load: (p: Project) => void;
  close: () => void;
  setDoc: (next: PinDocument, key?: string) => void;
  updateDoc: (fn: (d: PinDocument) => PinDocument, key?: string) => void;
  updateLayer: <T extends Layer = Layer>(id: Id, patch: LayerPatch<T>, key?: string) => void;
  updateLayers: (ids: Id[], fn: (l: Layer) => Layer, key?: string) => void;
  addLayers: (layers: Layer[], opts?: { select?: boolean; index?: number }) => void;
  removeLayers: (ids: Id[]) => void;
  duplicate: (ids: Id[]) => void;
  copy: () => void;
  paste: () => void;
  reorder: (id: Id, dir: 'forward' | 'backward' | 'front' | 'back') => void;
  moveLayer: (id: Id, toIndex: number) => void;
  undo: () => void;
  redo: () => void;
  select: (ids: Id[]) => void;
  toggleSelect: (id: Id) => void;
  updateProject: (patch: Partial<Omit<Project, 'doc'>>) => void;
  updateMeta: (patch: Partial<Project['meta']>) => void;
  /** Pages: each project can hold several Pins. History is per page and resets on switch. */
  goToPage: (index: number) => void;
  addPage: (doc?: PinDocument) => void;
  duplicatePage: (index: number) => void;
  deletePage: (index: number) => void;
  movePage: (from: number, to: number) => void;
}

export const useEditor = create<EditorState>((set, get) => {
  const commit = (next: PinDocument, key?: string) => {
    const s = get();
    if (!s.project || next === s.project.doc) return;
    const now = Date.now();
    const merge = !!key && key === s.lastKey && now - s.lastTime < COALESCE_MS;
    const past = merge ? s.past : [...s.past, s.project.doc].slice(-HISTORY_LIMIT);
    const ids = new Set(next.layers.map((l) => l.id));
    set({
      project: { ...s.project, doc: next },
      past,
      future: [],
      lastKey: key ?? null,
      lastTime: now,
      revision: s.revision + 1,
      selection: s.selection.filter((id) => ids.has(id)),
    });
  };


  const setPages = (pages: PinDocument[], activePage: number) => {
    const p = get().project;
    if (!p) return;
    const i = Math.max(0, Math.min(pages.length - 1, activePage));
    set({
      project: { ...p, pages, activePage: i, doc: pages[i] },
      selection: [],
      past: [],
      future: [],
      lastKey: null,
      revision: get().revision + 1,
    });
  };
  const synced = () => normalizeProject(get().project!);

  const mapLayers = (d: PinDocument, ids: Set<Id>, fn: (l: Layer) => Layer): PinDocument => ({
    ...d,
    layers: d.layers.map((l) => (ids.has(l.id) ? fn(l) : l)),
  });

  return {
    project: null,
    selection: [],
    past: [],
    future: [],
    lastKey: null,
    lastTime: 0,
    revision: 0,
    clipboard: [],

    load: (p) => set({ project: normalizeProject(p), selection: [], past: [], future: [], lastKey: null, revision: 0 }),
    close: () => set({ project: null, selection: [], past: [], future: [] }),
    setDoc: commit,
    updateDoc: (fn, key) => {
      const p = get().project;
      if (p) commit(fn(p.doc), key);
    },
    updateLayer: (id, patch, key) => {
      const p = get().project;
      if (!p) return;
      commit(
        mapLayers(p.doc, new Set([id]), (l) =>
          typeof patch === 'function'
            ? (patch as unknown as (x: Layer) => Layer)(l)
            : // Typing in an accent makes it the user's own word (part of the headline from now on).
              ({ ...l, ...patch, ...(l.type === 'text' && l.role === 'accent' && 'text' in patch ? { designAccent: false } : {}) } as Layer),
        ),
        key,
      );
    },
    updateLayers: (ids, fn, key) => {
      const p = get().project;
      if (p) commit(mapLayers(p.doc, new Set(ids), fn), key);
    },
    addLayers: (layers, opts = {}) => {
      const p = get().project;
      if (!p) return;
      const arr = [...p.doc.layers];
      arr.splice(opts.index ?? arr.length, 0, ...layers);
      commit({ ...p.doc, layers: arr });
      if (opts.select !== false) set({ selection: layers.map((l) => l.id) });
    },
    removeLayers: (ids) => {
      const p = get().project;
      if (!p || !ids.length) return;
      const del = new Set(ids);
      commit({ ...p.doc, layers: p.doc.layers.filter((l) => !del.has(l.id)) });
      set({ selection: [] });
    },
    duplicate: (ids) => {
      const p = get().project;
      if (!p || !ids.length) return;
      const arr = [...p.doc.layers];
      const newIds: Id[] = [];
      for (const id of ids) {
        const i = arr.findIndex((l) => l.id === id);
        if (i < 0) continue;
        const copy = { ...clone(arr[i]), id: newId(arr[i].type[0] + '_'), x: arr[i].x + 24, y: arr[i].y + 24, locked: false };
        if (copy.type === 'frame') copy.slot = null;
        copy.name = arr[i].name + ' copy';
        arr.splice(i + 1, 0, copy);
        newIds.push(copy.id);
      }
      commit({ ...p.doc, layers: arr });
      set({ selection: newIds });
    },
    copy: () => {
      const { project, selection } = get();
      if (!project) return;
      set({ clipboard: clone(project.doc.layers.filter((l) => selection.includes(l.id))) });
    },
    paste: () => {
      const { clipboard } = get();
      if (!clipboard.length) return;
      const pasted = clipboard.map((l) => {
        const c = { ...clone(l), id: newId(l.type[0] + '_'), x: l.x + 24, y: l.y + 24, locked: false };
        if (c.type === 'frame') c.slot = null;
        return c;
      });
      set({ clipboard: pasted });
      get().addLayers(pasted);
    },
    reorder: (id, dir) => {
      const p = get().project;
      if (!p) return;
      const i = p.doc.layers.findIndex((l) => l.id === id);
      if (i < 0) return;
      const to = { forward: i + 1, backward: i - 1, front: p.doc.layers.length - 1, back: 0 }[dir];
      get().moveLayer(id, to);
    },
    moveLayer: (id, toIndex) => {
      const p = get().project;
      if (!p) return;
      const arr = [...p.doc.layers];
      const i = arr.findIndex((l) => l.id === id);
      const to = Math.max(0, Math.min(arr.length - 1, toIndex));
      if (i < 0 || i === to) return;
      const [l] = arr.splice(i, 1);
      arr.splice(to, 0, l);
      commit({ ...p.doc, layers: arr });
    },
    undo: () => {
      const s = get();
      if (!s.project || !s.past.length) return;
      const prev = s.past[s.past.length - 1];
      set({
        project: { ...s.project, doc: prev },
        past: s.past.slice(0, -1),
        future: [s.project.doc, ...s.future],
        lastKey: null,
        revision: s.revision + 1,
        selection: s.selection.filter((id) => prev.layers.some((l) => l.id === id)),
      });
    },
    redo: () => {
      const s = get();
      if (!s.project || !s.future.length) return;
      const next = s.future[0];
      set({
        project: { ...s.project, doc: next },
        past: [...s.past, s.project.doc],
        future: s.future.slice(1),
        lastKey: null,
        revision: s.revision + 1,
        selection: s.selection.filter((id) => next.layers.some((l) => l.id === id)),
      });
    },
    select: (ids) => set({ selection: ids }),
    toggleSelect: (id) => {
      const sel = get().selection;
      set({ selection: sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id] });
    },
    updateProject: (patch) => {
      const p = get().project;
      if (p) set({ project: { ...p, ...patch }, revision: get().revision + 1 });
    },
    goToPage: (index) => {
      const p = get().project;
      if (!p || index === p.activePage) return;
      setPages(synced().pages, index);
    },
    addPage: (doc) => {
      if (!get().project) return;
      const p = synced();
      const pages = [...p.pages];
      pages.splice(p.activePage + 1, 0, doc ?? reId(clone(p.doc)));
      setPages(pages, p.activePage + 1);
    },
    duplicatePage: (index) => {
      if (!get().project) return;
      const p = synced();
      const pages = [...p.pages];
      pages.splice(index + 1, 0, reId(clone(pages[index])));
      setPages(pages, index + 1);
    },
    deletePage: (index) => {
      if (!get().project) return;
      const p = synced();
      if (p.pages.length < 2) return;
      const pages = p.pages.filter((_, i) => i !== index);
      setPages(pages, index <= p.activePage ? Math.max(0, p.activePage - 1) : p.activePage);
    },
    movePage: (from, to) => {
      if (!get().project || from === to) return;
      const p = synced();
      const pages = [...p.pages];
      const [moved] = pages.splice(from, 1);
      pages.splice(to, 0, moved);
      const active = p.activePage === from ? to : pages.indexOf(p.pages[p.activePage]);
      setPages(pages, active);
    },
    updateMeta: (patch) => {
      const p = get().project;
      if (p) set({ project: { ...p, meta: { ...p.meta, ...patch } }, revision: get().revision + 1 });
    },
  };
});

export const selectedLayers = (s: EditorState): Layer[] =>
  s.project ? s.project.doc.layers.filter((l) => s.selection.includes(l.id)) : [];
