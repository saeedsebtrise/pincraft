/**
 * Workspace preferences: workspace name, publishing schedule (timezone and
 * posting window), email preferences and the default board. Saved in this
 * browser per account; used by the Settings and Boards pages.
 */
import { create } from 'zustand';

export interface WorkspacePrefs {
  workspaceName: string;
  timezone: string;
  /** Earliest posting hour, 0–23. */
  windowStart: number;
  /** Last posting hour, 1–23. */
  windowEnd: number;
  /** Pins per day the scheduler aims for (a target, not a rule). */
  dailyPace: number;
  emailTips: boolean;
  defaultBoardId: string | null;
}

export const DEFAULT_PREFS: WorkspacePrefs = {
  workspaceName: 'My Workspace',
  timezone: (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  })(),
  windowStart: 8,
  windowEnd: 20,
  dailyPace: 10,
  emailTips: false,
  defaultBoardId: null,
};

const KEY = 'pincraft.workspace';
let owner = 'local';
const storageKey = () => `${KEY}.${owner}`;

function read(): WorkspacePrefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(storageKey()) ?? '{}') };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/** Checks a posting window; returns an error message, or null when it's fine. */
export function windowError(start: number, end: number): string | null {
  if (!Number.isInteger(start) || start < 0 || start > 23) return 'The window must start between 0 and 23.';
  if (!Number.isInteger(end) || end < 1 || end > 23) return 'The window must end between 1 and 23.';
  if (end <= start) return 'The window must end after it starts.';
  return null;
}

interface WorkspaceState {
  prefs: WorkspacePrefs;
  useOwner: (id: string) => void;
  update: (patch: Partial<WorkspacePrefs>) => void;
}

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  prefs: read(),
  useOwner: (id) => {
    owner = id || 'local';
    set({ prefs: read() });
  },
  update: (patch) => {
    const prefs = { ...get().prefs, ...patch };
    try {
      localStorage.setItem(storageKey(), JSON.stringify(prefs));
    } catch {
      /* storage blocked: kept for this session */
    }
    set({ prefs });
  },
}));
