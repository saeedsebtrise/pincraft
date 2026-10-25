import { create } from 'zustand';
import type { Id } from '../model/types';

export type LeftTab = 'templates' | 'uploads' | 'layouts' | 'text' | 'brand' | 'background' | 'elements' | 'projects';
export type RightTab = 'design' | 'images' | 'text' | 'layers';
export type ModalName = 'export' | 'preview' | 'variations' | 'saveTemplate' | 'aiAssistant' | null;

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'error';
  message: string;
}

const LS_KEY = 'pinforge.ui';
interface Prefs {
  showSafeArea: boolean;
  showGrid: boolean;
  snapEnabled: boolean;
  recentColors: string[];
  onboardingDone: boolean;
  aiEnabled: boolean;
  /** Uploads and Fill/Refill put the photos on every page of the project, not just the open one. */
  fillAllPages: boolean;
}
const PREF_KEYS: (keyof Prefs)[] = ['showSafeArea', 'showGrid', 'snapEnabled', 'recentColors', 'onboardingDone', 'aiEnabled', 'fillAllPages'];

function loadPrefs(): Prefs {
  const fallback: Prefs = { showSafeArea: true, showGrid: false, snapEnabled: true, recentColors: [], onboardingDone: false, aiEnabled: false, fillAllPages: true };
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

interface UiState extends Prefs {
  leftTab: LeftTab;
  rightTab: RightTab;
  /** Scale actually used by the canvas (fit or manual), for the zoom readout. */
  effectiveZoom: number;
  /** Export format pre-selected when the Export modal opens. */
  exportFormat: 'png' | 'jpeg' | 'webp';
  zoom: number | null; // null = fit to screen
  cropId: Id | null;
  editingTextId: Id | null;
  swapSourceId: Id | null;
  fontsVersion: number;
  modal: ModalName;
  toasts: Toast[];
  saveState: 'saved' | 'saving' | 'error';

  set: (patch: Partial<UiState>) => void;
  setLeftTab: (t: LeftTab) => void;
  pushRecentColor: (c: string) => void;
  toast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
  bumpFonts: () => void;
}

let toastId = 0;

export const useUi = create<UiState>((set, get) => ({
  leftTab: 'templates',
  rightTab: 'design',
  effectiveZoom: 1,
  exportFormat: 'png',
  zoom: null,
  cropId: null,
  editingTextId: null,
  swapSourceId: null,
  fontsVersion: 0,
  modal: null,
  toasts: [],
  saveState: 'saved',
  ...loadPrefs(),

  set: (patch) => {
    set(patch);
    if (PREF_KEYS.some((k) => k in patch)) persist(get());
  },
  setLeftTab: (t) => set({ leftTab: t }),
  pushRecentColor: (c) => {
    const recentColors = [c.toUpperCase(), ...get().recentColors.filter((x) => x !== c.toUpperCase())].slice(0, 10);
    set({ recentColors });
    persist(get());
  },
  toast: (message, kind = 'info') => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { id, kind, message }] });
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 7000 : 3500);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  bumpFonts: () => set({ fontsVersion: get().fontsVersion + 1 }),
}));

function persist(s: UiState) {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify(Object.fromEntries(PREF_KEYS.map((k) => [k, s[k]]))),
    );
  } catch {
    /* storage unavailable — preferences just won't persist */
  }
}
