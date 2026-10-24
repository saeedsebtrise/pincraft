import { create } from 'zustand';
import type { Id } from '../model/types';

export type LeftTab = 'templates' | 'uploads' | 'layouts' | 'text' | 'brand' | 'background' | 'elements' | 'layers' | 'projects';
export type ModalName = 'export' | 'preview' | 'variations' | 'saveTemplate' | null;

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'error';
  message: string;
}

const LS_KEY = 'pinforge.ui';
function loadPrefs(): { showSafeArea: boolean; recentColors: string[]; onboardingDone: boolean; aiEnabled: boolean } {
  const fallback = { showSafeArea: true, recentColors: [], onboardingDone: false, aiEnabled: false };
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

interface UiState {
  leftTab: LeftTab;
  zoom: number | null; // null = fit to screen
  showSafeArea: boolean;
  cropId: Id | null;
  editingTextId: Id | null;
  swapSourceId: Id | null;
  fontsVersion: number;
  recentColors: string[];
  onboardingDone: boolean;
  aiEnabled: boolean;
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
    if ('showSafeArea' in patch || 'recentColors' in patch || 'onboardingDone' in patch || 'aiEnabled' in patch) persist(get());
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
      JSON.stringify({ showSafeArea: s.showSafeArea, recentColors: s.recentColors, onboardingDone: s.onboardingDone, aiEnabled: s.aiEnabled }),
    );
  } catch {
    /* storage unavailable — preferences just won't persist */
  }
}
