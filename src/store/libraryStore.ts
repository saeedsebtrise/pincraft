/**
 * Library-level data shared by the dashboard and editor:
 * user templates, brand kits and saved custom canvas presets.
 */
import { create } from 'zustand';
import { makeCustomPreset, type CanvasPreset } from '../config/canvasPresets';
import { clone, newId } from '../model/factory';
import type { BrandKit, PinDocument, Template, TemplateCategory } from '../model/types';
import { frames } from '../model/docOps';
import { repos } from '../storage/repositories';

const PRESET_KEY = 'pinforge.presets';
const ACTIVE_KIT_KEY = 'pinforge.activeKit';
const HIDDEN_KEY = 'pinforge.hiddenTemplates';

export const DEFAULT_BRAND_KIT: BrandKit = {
  id: 'kit_default',
  name: 'My Brand',
  brandName: 'My Blog',
  website: 'yourwebsite.com',
  logoAssetId: null,
  primary: '#111111',
  secondary: '#F6F1EB',
  accent: '#C7797D',
  headingFont: 'Playfair Display',
  bodyFont: 'Inter',
  ctaStyle: 'dark-block',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface LibraryState {
  loaded: boolean;
  userTemplates: Template[];
  brandKits: BrandKit[];
  activeKitId: string;
  customPresets: CanvasPreset[];
  /** Built-in templates this user removed from their library (kept so old projects still open). */
  hiddenTemplateIds: string[];

  load: () => Promise<void>;
  saveTemplate: (name: string, doc: PinDocument, categories?: TemplateCategory[]) => Promise<Template>;
  duplicateTemplate: (t: Template) => Promise<Template>;
  renameTemplate: (id: string, name: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  /** Removes a built-in template from this user's library and Auto Design. */
  hideTemplate: (id: string) => void;
  /** Brings every removed built-in template back. */
  restoreHiddenTemplates: () => void;
  saveBrandKit: (kit: BrandKit) => Promise<void>;
  deleteBrandKit: (id: string) => Promise<void>;
  setActiveKit: (id: string) => void;
  activeKit: () => BrandKit;
  addCustomPreset: (name: string, w: number, h: number) => CanvasPreset;
  removeCustomPreset: (id: string) => void;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  loaded: false,
  userTemplates: [],
  brandKits: [DEFAULT_BRAND_KIT],
  activeKitId: readJson(ACTIVE_KIT_KEY, DEFAULT_BRAND_KIT.id),
  customPresets: readJson<CanvasPreset[]>(PRESET_KEY, []),
  hiddenTemplateIds: readJson<string[]>(HIDDEN_KEY, []),

  load: async () => {
    try {
      const [templates, kits] = await Promise.all([repos.templates.list(), repos.brandKits.list()]);
      set({
        loaded: true,
        userTemplates: templates.sort((a, b) => b.createdAt - a.createdAt),
        brandKits: kits.length ? kits : [DEFAULT_BRAND_KIT],
      });
    } catch {
      set({ loaded: true });
    }
  },

  saveTemplate: async (name, doc, categories = ['My Templates']) => {
    const d = clone(doc);
    // Templates never carry the user's photos — frames become empty slots.
    d.layers = d.layers.map((l) => (l.type === 'frame' && l.role !== 'logo' ? { ...l, assetId: null, crop: { zoom: 1, fx: 0.5, fy: 0.5 } } : l));
    if (d.background.type === 'image') d.background = { ...d.background, type: 'solid', assetId: null };
    const t: Template = {
      id: newId('ut_'),
      name: name.trim() || 'My template',
      description: `Saved from a ${doc.width}×${doc.height} design.`,
      categories: [...new Set<TemplateCategory>(['My Templates', ...categories])],
      family: 10,
      imageCount: frames(d).filter((f) => f.role !== 'logo').length,
      doc: d,
      source: 'user',
      createdAt: Date.now(),
    };
    await repos.templates.put(t);
    set({ userTemplates: [t, ...get().userTemplates] });
    return t;
  },
  duplicateTemplate: async (t) => {
    const copy: Template = { ...clone(t), id: newId('ut_'), name: `${t.name} (copy)`, source: 'user', createdAt: Date.now() };
    if (!copy.categories.includes('My Templates')) copy.categories = ['My Templates', ...copy.categories];
    await repos.templates.put(copy);
    set({ userTemplates: [copy, ...get().userTemplates] });
    return copy;
  },
  renameTemplate: async (id, name) => {
    const t = get().userTemplates.find((x) => x.id === id);
    if (!t) return;
    const next = { ...t, name };
    await repos.templates.put(next);
    set({ userTemplates: get().userTemplates.map((x) => (x.id === id ? next : x)) });
  },
  deleteTemplate: async (id) => {
    await repos.templates.remove(id);
    set({ userTemplates: get().userTemplates.filter((x) => x.id !== id) });
  },
  hideTemplate: (id) => {
    const next = [...new Set([...get().hiddenTemplateIds, id])];
    set({ hiddenTemplateIds: next });
    try {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable: hidden for this session only */
    }
  },
  restoreHiddenTemplates: () => {
    set({ hiddenTemplateIds: [] });
    try {
      localStorage.removeItem(HIDDEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },

  saveBrandKit: async (kit) => {
    await repos.brandKits.put(kit);
    const exists = get().brandKits.some((k) => k.id === kit.id);
    set({ brandKits: exists ? get().brandKits.map((k) => (k.id === kit.id ? kit : k)) : [...get().brandKits, kit] });
  },
  deleteBrandKit: async (id) => {
    await repos.brandKits.remove(id);
    const kits = get().brandKits.filter((k) => k.id !== id);
    set({ brandKits: kits.length ? kits : [DEFAULT_BRAND_KIT] });
    if (get().activeKitId === id) get().setActiveKit((kits[0] ?? DEFAULT_BRAND_KIT).id);
  },
  setActiveKit: (id) => {
    set({ activeKitId: id });
    try {
      localStorage.setItem(ACTIVE_KIT_KEY, JSON.stringify(id));
    } catch {
      /* ignore */
    }
  },
  activeKit: () => get().brandKits.find((k) => k.id === get().activeKitId) ?? get().brandKits[0] ?? DEFAULT_BRAND_KIT,

  addCustomPreset: (name, w, h) => {
    const p = makeCustomPreset(newId('user-'), name || `Custom ${w}×${h}`, w, h);
    const customPresets = [...get().customPresets, p];
    set({ customPresets });
    localStorage.setItem(PRESET_KEY, JSON.stringify(customPresets));
    return p;
  },
  removeCustomPreset: (id) => {
    const customPresets = get().customPresets.filter((p) => p.id !== id);
    set({ customPresets });
    localStorage.setItem(PRESET_KEY, JSON.stringify(customPresets));
  },
}));
