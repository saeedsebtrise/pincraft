/**
 * Workspace activity: a history of what happened (Pins created, exports, AI
 * designs, research, blog imports, templates, brand kits, sign-ins) and what
 * went wrong, newest first. Shown on the Activity page.
 *
 * Kept per account in this browser (the last 100 events). It's a log for the
 * user — nothing is sent anywhere.
 */
import { create } from 'zustand';

export type ActivityOutcome = 'completed' | 'warning' | 'failed' | 'update';
export type ActivityArea = 'Pins' | 'Export' | 'AI' | 'Research' | 'Blog import' | 'Templates' | 'Brand Kit' | 'Account' | 'Projects';

export interface ActivityEvent {
  id: string;
  at: number;
  area: ActivityArea;
  outcome: ActivityOutcome;
  title: string;
  detail?: string;
  /** Where the user can fix or see it ("#/brand"), with its label. */
  link?: { href: string; label: string };
  /** Extra facts shown under "Event details". */
  data?: Record<string, string | number>;
}

export const MAX_EVENTS = 100;
const KEY = 'pincraft.activity';
let owner = 'local';

const storageKey = () => `${KEY}.${owner}`;

function read(): ActivityEvent[] {
  try {
    const v = JSON.parse(localStorage.getItem(storageKey()) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(events: ActivityEvent[]) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(events));
  } catch {
    /* storage full or blocked: the log lives for this session only */
  }
}

interface ActivityState {
  events: ActivityEvent[];
  /** Switches to another account's log (each account keeps its own). */
  useOwner: (id: string) => void;
  /** Re-reads the log (another tab may have added events). */
  reload: () => void;
  clear: () => void;
}

export const useActivity = create<ActivityState>((set) => ({
  events: read(),
  useOwner: (id) => {
    owner = id || 'local';
    set({ events: read() });
  },
  reload: () => set({ events: read() }),
  clear: () => {
    write([]);
    set({ events: [] });
  },
}));

let seq = 0;

/** Records one event (newest first, capped at the last 100). Never throws. */
export function logActivity(e: Omit<ActivityEvent, 'id' | 'at'> & { at?: number }): ActivityEvent {
  const event: ActivityEvent = { ...e, at: e.at ?? Date.now(), id: `a${Date.now().toString(36)}${(seq++).toString(36)}` };
  const events = [event, ...read()].slice(0, MAX_EVENTS);
  write(events);
  useActivity.setState({ events });
  return event;
}

/** Runs `task` and records how it went: `done` on success, a failed event with the error otherwise. */
export async function tracked<T>(
  base: { area: ActivityArea; title: string; failTitle: string; link?: ActivityEvent['link'] },
  task: () => Promise<T>,
  done?: (result: T) => Partial<Omit<ActivityEvent, 'id' | 'at' | 'area'>> | null,
): Promise<T> {
  try {
    const result = await task();
    const extra = done?.(result);
    if (extra !== null) logActivity({ area: base.area, outcome: 'completed', title: base.title, ...extra });
    return result;
  } catch (err) {
    logActivity({ area: base.area, outcome: 'failed', title: base.failTitle, detail: (err as Error).message, link: base.link });
    throw err;
  }
}

// ---------------------------------------------------------------- filtering (Activity page)

export type OutcomeFilter = 'all' | ActivityOutcome;
export const RANGES = { 1: 'Today', 7: 'Last 7 days', 30: 'Last 30 days', 0: 'All time' } as const;
export type RangeDays = keyof typeof RANGES;

export function filterEvents(events: ActivityEvent[], f: { outcome: OutcomeFilter; area: ActivityArea | 'all'; days: RangeDays; query: string; now?: number }): ActivityEvent[] {
  const now = f.now ?? Date.now();
  const since = f.days === 1 ? new Date(now).setHours(0, 0, 0, 0) : f.days ? now - f.days * 86_400_000 : 0;
  const q = f.query.trim().toLowerCase();
  return events.filter(
    (e) =>
      e.at >= since &&
      (f.outcome === 'all' || e.outcome === f.outcome) &&
      (f.area === 'all' || e.area === f.area) &&
      (!q || `${e.area} ${e.title} ${e.detail ?? ''}`.toLowerCase().includes(q)),
  );
}

/** "Today", "Yesterday" or the date — the group heading for an event. */
export function dayLabel(at: number, now = Date.now()): string {
  const day = (t: number) => new Date(t).setHours(0, 0, 0, 0);
  const diff = Math.round((day(now) - day(at)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(at).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}
