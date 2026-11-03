/**
 * The browser side of the Pinterest connection (server/pinterest.mjs). The
 * Pinterest tokens stay in an httpOnly cookie on the server; this only calls
 * /api/pinterest/* and keeps the results (account, boards, default board).
 */
import { create } from 'zustand';
import { logActivity, tracked } from './activity';
import { useWorkspace } from '../store/workspaceStore';

export interface PinterestAccount {
  username: string;
  name: string;
  image?: string;
  type?: string;
  followers?: number;
  monthlyViews?: number;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description: string;
  privacy: 'PUBLIC' | 'SECRET' | 'PROTECTED';
  pinCount: number;
  cover: string | null;
}

export interface DailyMetrics {
  date: string;
  status: string;
  IMPRESSION: number;
  ENGAGEMENT: number;
  OUTBOUND_CLICK: number;
  PIN_CLICK: number;
  SAVE: number;
}
export type Metric = Exclude<keyof DailyMetrics, 'date' | 'status'>;

export interface Analytics {
  days: number;
  summary: Partial<Record<Metric, number>>;
  daily: DailyMetrics[];
}

export interface Trend {
  keyword: string;
  weekly: number | null;
  monthly: number | null;
  yearly: number | null;
  series: Record<string, number>;
}

export const SERVER_OFFLINE = 'The Pinterest connection needs the PinCraft server. Locally, start it with npm run ai-proxy; online it runs on Vercel.';

async function call<T>(op: string, init?: RequestInit, query = ''): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/pinterest/${op}${query}`, { credentials: 'same-origin', ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } });
  } catch {
    throw new Error(SERVER_OFFLINE);
  }
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) {
    if (res.status === 401) usePinterest.setState({ connected: false, account: null });
    throw new Error(data?.error || (res.status === 404 || res.status >= 500 ? SERVER_OFFLINE : `Pinterest request failed (${res.status})`));
  }
  return data as T;
}

interface PinterestState {
  /** null until the first status check. */
  configured: boolean | null;
  /** True when the PinCraft server (npm run ai-proxy locally, Vercel online) didn't answer. */
  serverOffline: boolean;
  connected: boolean;
  account: PinterestAccount | null;
  boards: PinterestBoard[];
  boardsLoaded: boolean;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  loadBoards: () => Promise<PinterestBoard[]>;
  createBoard: (b: { name: string; description: string; privacy: 'PUBLIC' | 'SECRET' }) => Promise<PinterestBoard>;
  disconnect: () => Promise<void>;
}

export const usePinterest = create<PinterestState>((set, get) => ({
  configured: null,
  serverOffline: false,
  connected: false,
  account: null,
  boards: [],
  boardsLoaded: false,
  loading: false,
  error: '',
  refresh: async () => {
    set({ loading: true, error: '' });
    try {
      const s = await call<{ configured: boolean; connected: boolean; account?: PinterestAccount }>('status');
      set({ configured: s.configured, connected: s.connected, account: s.account ?? null, serverOffline: false });
    } catch (e) {
      const offline = (e as Error).message === SERVER_OFFLINE;
      set({ error: (e as Error).message, serverOffline: offline, ...(offline ? { configured: false, connected: false } : {}) });
    } finally {
      set({ loading: false });
    }
  },
  loadBoards: async () => {
    try {
      const { boards } = await call<{ boards: PinterestBoard[] }>('boards');
      set({ boards, boardsLoaded: true, error: '' });
      logActivity({ area: 'Boards', outcome: 'completed', title: 'Pinterest boards synced', detail: `${boards.length} board${boards.length === 1 ? '' : 's'} loaded.` });
      return boards;
    } catch (e) {
      set({ error: (e as Error).message });
      logActivity({ area: 'Boards', outcome: 'failed', title: 'Pinterest boards sync failed', detail: (e as Error).message, link: { href: '#/settings?tab=pinterest', label: 'Check Pinterest connection' } });
      throw e;
    }
  },
  createBoard: async (b) => {
    const { board } = await tracked(
      { area: 'Boards', title: 'Board created on Pinterest', failTitle: 'Couldn’t create the board' },
      () => call<{ board: PinterestBoard }>('boards', { method: 'POST', body: JSON.stringify(b) }),
      (r) => ({ detail: `“${r.board.name}” (${r.board.privacy === 'SECRET' ? 'secret' : 'public'}).` }),
    );
    set({ boards: [board, ...get().boards] });
    return board;
  },
  disconnect: async () => {
    await call('disconnect', { method: 'POST' });
    set({ connected: false, account: null, boards: [], boardsLoaded: false });
    logActivity({ area: 'Account', outcome: 'update', title: 'Pinterest disconnected', detail: 'Your Pinterest account is no longer connected.' });
  },
}));

/** Starts the Pinterest sign-in (full page: Pinterest sends the user back to Settings). */
export function connectPinterest() {
  location.href = '/api/pinterest/connect';
}

export interface PublishInput {
  boardId: string;
  title: string;
  description: string;
  link: string;
  altText: string;
  image: { mediaType: 'image/jpeg' | 'image/png'; data: string };
}

export function publishPin(p: PublishInput): Promise<{ id: string; url: string }> {
  return tracked(
    { area: 'Publishing', title: 'Pin published to Pinterest', failTitle: 'Pin publishing failed', link: { href: '#/settings?tab=pinterest', label: 'Check Pinterest connection' } },
    async () => (await call<{ pin: { id: string; url: string } }>('pins', { method: 'POST', body: JSON.stringify(p) })).pin,
    (pin) => ({ detail: `“${p.title || 'Untitled Pin'}”`, link: { href: pin.url, label: 'View on Pinterest' }, data: { board: usePinterest.getState().boards.find((b) => b.id === p.boardId)?.name ?? p.boardId } }),
  );
}

/**
 * Publishes a video Pin: registers the upload, sends the file straight to
 * Pinterest's upload URL, waits until Pinterest has processed it, then creates the Pin.
 */
export function publishVideoPin(
  p: Omit<PublishInput, 'image'> & { video: Blob },
  onStep?: (step: 'uploading' | 'processing' | 'publishing') => void,
): Promise<{ id: string; url: string }> {
  return tracked(
    { area: 'Publishing', title: 'Video Pin published to Pinterest', failTitle: 'Video Pin publishing failed', link: { href: '#/video', label: 'Open Video Pins' } },
    async () => {
      const reg = await call<{ mediaId: string; uploadUrl: string; uploadParameters: Record<string, string> }>('media', { method: 'POST', body: '{}' });
      onStep?.('uploading');
      const form = new FormData();
      for (const [k, v] of Object.entries(reg.uploadParameters)) form.append(k, v);
      form.append('file', p.video);
      const up = await fetch(reg.uploadUrl, { method: 'POST', body: form }).catch(() => null);
      if (!up || !up.ok) throw new Error('Pinterest didn’t accept the video upload. Use an MP4 (H.264), 4 s – 15 min, under 2 GB.');
      onStep?.('processing');
      for (let i = 0; i < 60; i++) {
        const { status } = await call<{ status: string }>('media', undefined, `?id=${encodeURIComponent(reg.mediaId)}`);
        if (status === 'succeeded') break;
        if (status === 'failed') throw new Error('Pinterest couldn’t process this video. Try an MP4 (H.264).');
        if (i === 59) throw new Error('Pinterest is still processing the video — try publishing again in a few minutes.');
        await new Promise((r) => setTimeout(r, 4000));
      }
      onStep?.('publishing');
      const { video: _video, ...rest } = p;
      return (await call<{ pin: { id: string; url: string } }>('videopin', { method: 'POST', body: JSON.stringify({ ...rest, mediaId: reg.mediaId }) })).pin;
    },
    (pin) => ({ detail: `“${p.title || 'Untitled video'}”`, link: { href: pin.url, label: 'View on Pinterest' } }),
  );
}

export const fetchAnalytics =(days: 7 | 30 | 90) => call<Analytics>('analytics', undefined, `?days=${days}`);
export const fetchTrends = (region: string, type: string) =>
  call<{ region: string; type: string; trends: Trend[] }>('trends', undefined, `?region=${encodeURIComponent(region)}&type=${encodeURIComponent(type)}`);

/** The board new Pins go to by default (falls back to the first board). */
export function defaultBoard(boards: PinterestBoard[]): PinterestBoard | undefined {
  const id = useWorkspace.getState().prefs.defaultBoardId;
  return boards.find((b) => b.id === id) ?? boards[0];
}
