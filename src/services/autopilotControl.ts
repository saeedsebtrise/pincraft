/**
 * Browser side of the Autopilot control panel (server/autopilotControl.mjs).
 * The admin key is kept for this browser tab only (sessionStorage) and sent
 * as a header; the Sheet secret and GitHub token never reach the browser.
 */
const KEY = 'pincraft:autopilot:admin';

export interface QueueRow {
  row: number;
  url: string;
  boardId: string;
  status: string;
  pinUrl: string;
  error: string;
  updatedAt: string;
}
export interface Overview {
  settings: { enabled: boolean; dailyLimit: number; intervalMinutes: number };
  postedLast24h: number;
  nextSlotAt: number;
  lastDispatchAt: number;
  total: number;
  rows: QueueRow[];
}
export interface WorkerRun {
  id: number;
  number: number;
  event: string;
  status: string;
  conclusion: string | null;
  createdAt: string;
  url: string;
}

export const adminKey = {
  get: () => {
    try {
      return sessionStorage.getItem(KEY) ?? '';
    } catch {
      return '';
    }
  },
  set: (v: string) => {
    try {
      if (v) sessionStorage.setItem(KEY, v);
      else sessionStorage.removeItem(KEY);
    } catch {
      /* this tab only */
    }
  },
};

export class ControlError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(op: string, body: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/autopilot/${op}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-autopilot-key': adminKey.get() }, body: JSON.stringify(body) });
  } catch {
    throw new ControlError('The PinCraft server could not be reached.', 0);
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new ControlError(data?.error || (res.status === 404 ? 'The PinCraft server is not running this feature yet — redeploy, or start npm run ai-proxy locally.' : `Request failed (${res.status})`), res.status);
  return data as T;
}

export async function controlStatus(): Promise<{ configured: boolean; missing: string[] } | null> {
  try {
    const res = await fetch('/api/autopilot/status');
    if (!res.ok) return null;
    return (await res.json()) as { configured: boolean; missing: string[] };
  } catch {
    return null;
  }
}

export const autopilotApi = {
  overview: () => call<Overview>('overview'),
  runs: () => call<{ runs: WorkerRun[]; error?: string }>('runs'),
  add: (urls: string[], boardId = '', pinsPerArticle = 1) => call<{ added: number; skipped: number }>('add', { urls, boardId, pinsPerArticle }),
  settings: (s: { enabled?: boolean; dailyLimit?: number }) => call<object>('settings', s),
  setRow: (row: number, status: 'Retry' | 'Skip' | 'Pending') => call<object>('row', { row, status }),
  preview: (articleUrl: string, pins = 1) => call<object>('preview', { articleUrl, pins }),
  publishNow: () => call<object>('publish'),
};

/** Links in pasted text (one per line, or separated by spaces/commas). */
export function parseArticleLinks(text: string): string[] {
  return [...new Set(text.split(/[\s,]+/).map((s) => s.trim()).filter((s) => /^https?:\/\/[^/?#@\s]+/i.test(s)))];
}
