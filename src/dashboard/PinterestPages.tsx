/**
 * Boards and Analytics: the user's Pinterest boards (sync, create, default
 * destination) and Pinterest performance (profile analytics, search trends).
 */
import { BarChart3, Bookmark, Eye, Lock, MousePointerClick, Plus, RefreshCw, Search, Share2, Sparkles, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { logActivity } from '../services/activity';
import { defaultBoard, fetchAnalytics, fetchTrends, usePinterest, type Analytics, type Metric, type PinterestBoard, type Trend } from '../services/pinterest';
import { useUi } from '../store/uiStore';
import { useWorkspace } from '../store/workspaceStore';
import { Field, Modal } from '../ui/controls';
import { PinterestNotConnected } from './AccountPages';

/** Loads the connection status (and boards when asked) once per page. */
function usePinterestReady(withBoards = false) {
  const pin = usePinterest();
  useEffect(() => {
    void pin.refresh().then(() => {
      const s = usePinterest.getState();
      if (withBoards && s.connected && !s.boardsLoaded) void s.loadBoards().catch(() => {});
    });
  }, []);
  return pin;
}

// ---------------------------------------------------------------- Boards

export function BoardsPage() {
  const pin = usePinterestReady(true);
  const prefs = useWorkspace((s) => s.prefs);
  const [query, setQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [creating, setCreating] = useState(false);
  const shown = pin.boards.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()));
  const pins = pin.boards.reduce((n, b) => n + b.pinCount, 0);
  const def = pin.boards.length ? defaultBoard(pin.boards) : undefined;
  const sync = async () => {
    setSyncing(true);
    try {
      await pin.loadBoards();
      useUi.getState().toast('Boards synced from Pinterest', 'success');
    } catch (e) {
      useUi.getState().toast((e as Error).message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="dash-main">
      <div className="stack-sm">
        <h1 className="dash-h1">Boards</h1>
        <span className="muted">Your Pinterest boards — where every Pin gets published.</span>
      </div>
      <section className="card board-hero">
        <div className="stack-sm grow" style={{ minWidth: 240 }}>
          <span className="kicker">Board destinations</span>
          <h2 style={{ fontSize: 22 }}>Organize where every Pin gets published.</h2>
          <span className="muted">Sync your boards from Pinterest, check their visibility and choose one default for new Pins.</span>
        </div>
        <div className="board-stats">
          <div className="fact">
            <span className="field-label">Synced boards</span>
            <strong style={{ fontSize: 22 }}>{pin.boards.length}</strong>
          </div>
          <div className="fact">
            <span className="field-label">Pins on boards</span>
            <strong style={{ fontSize: 22 }}>{pins.toLocaleString()}</strong>
          </div>
          <div className="fact">
            <span className="field-label">Default destination</span>
            <strong>{def?.name ?? 'Not set'}</strong>
          </div>
        </div>
      </section>

      <section className="card act-card">
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <label className="search-box grow" style={{ minWidth: 200 }}>
            <Search size={17} />
            <input placeholder="Search boards by name…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search boards" />
          </label>
          <button className="btn" disabled={!pin.connected || syncing} onClick={() => void sync()}>
            <RefreshCw size={15} /> {syncing ? 'Syncing…' : 'Sync from Pinterest'}
          </button>
          <button className="btn btn-pink" disabled={!pin.connected} onClick={() => setCreating(true)}>
            <Plus size={15} /> Create Board
          </button>
        </div>
        <span className="subtle">{pin.boards.length} board{pin.boards.length === 1 ? '' : 's'} in this workspace</span>
        {!pin.connected ? (
          <PinterestNotConnected what="Boards are loaded from your Pinterest account." />
        ) : shown.length === 0 ? (
          <div className="act-empty">
            <Share2 size={20} />
            <strong>{pin.boards.length ? 'No boards match your search' : pin.boardsLoaded ? 'No boards yet' : 'Loading boards…'}</strong>
            <span className="subtle">{pin.boards.length ? 'Try another name.' : 'Create your first board to start publishing.'}</span>
          </div>
        ) : (
          <div className="board-grid">
            {shown.map((b) => (
              <BoardCard key={b.id} b={b} isDefault={def?.id === b.id} explicit={prefs.defaultBoardId === b.id} />
            ))}
          </div>
        )}
      </section>
      {creating && <CreateBoardModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function BoardCard({ b, isDefault, explicit }: { b: PinterestBoard; isDefault: boolean; explicit: boolean }) {
  return (
    <div className={`board-card${isDefault ? ' is-default' : ''}`}>
      <div className="board-cover">{b.cover ? <img src={b.cover} alt="" /> : <Share2 size={22} />}</div>
      <div className="stack-sm" style={{ gap: 4, padding: 12 }}>
        <strong style={{ overflowWrap: 'anywhere' }}>{b.name}</strong>
        <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <span className="chip">{b.pinCount.toLocaleString()} Pins</span>
          <span className="chip">{b.privacy === 'SECRET' ? <><Lock size={11} /> Secret</> : 'Public'}</span>
          {isDefault && <span className="chip chip-rec">Default</span>}
        </span>
        {b.description && <span className="subtle board-desc">{b.description}</span>}
        {!explicit && (
          <button
            className="btn btn-sm"
            onClick={() => {
              useWorkspace.getState().update({ defaultBoardId: b.id });
              logActivity({ area: 'Boards', outcome: 'update', title: 'Default board changed', detail: `New Pins go to “${b.name}”.` });
            }}
          >
            Make default
          </button>
        )}
      </div>
    </div>
  );
}

function CreateBoardModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'SECRET'>('PUBLIC');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Modal
      title="Create Pinterest Board"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-pink"
            disabled={!name.trim() || busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                const b = await usePinterest.getState().createBoard({ name: name.trim(), description: description.trim(), privacy });
                if (!useWorkspace.getState().prefs.defaultBoardId) useWorkspace.getState().update({ defaultBoardId: b.id });
                useUi.getState().toast(`Board “${b.name}” created on Pinterest`, 'success');
                onClose();
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            {busy ? 'Creating…' : 'Create Board'}
          </button>
        </>
      }
    >
      <div className="stack">
        <span className="muted">This creates a real board on your connected Pinterest account.</span>
        <Field label="Board name *">
          <input className="input" value={name} maxLength={180} placeholder="Example: Easy Dinner Ideas" onChange={(e) => setName(e.target.value)} autoFocus />
          <span className="subtle">Visible on Pinterest and used when choosing where to publish.</span>
        </Field>
        <Field label="Description">
          <textarea className="textarea" rows={3} maxLength={500} value={description} placeholder="Optional board description…" onChange={(e) => setDescription(e.target.value)} />
          <span className="subtle">Helps people (and Pinterest search) understand the board's topic.</span>
        </Field>
        <Field label="Visibility">
          <select className="select" value={privacy} onChange={(e) => setPrivacy(e.target.value as 'PUBLIC' | 'SECRET')}>
            <option value="PUBLIC">Public</option>
            <option value="SECRET">Secret</option>
          </select>
          <span className="subtle">{privacy === 'PUBLIC' ? 'Public boards are visible on your Pinterest profile.' : 'Secret boards are only visible to you.'}</span>
        </Field>
        {error && <div className="issue">{error}</div>}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Analytics

const METRIC_INFO: { id: Metric; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'IMPRESSION', label: 'Impressions', hint: 'Times your Pins were on screen', icon: <Eye size={16} /> },
  { id: 'ENGAGEMENT', label: 'Engagements', hint: 'Total interactions with your Pins', icon: <Sparkles size={16} /> },
  { id: 'OUTBOUND_CLICK', label: 'Outbound clicks', hint: 'Clicks to your website', icon: <Share2 size={16} /> },
  { id: 'PIN_CLICK', label: 'Pin clicks', hint: 'Clicks to open Pin close-ups', icon: <MousePointerClick size={16} /> },
  { id: 'SAVE', label: 'Saves', hint: 'Times people saved your Pins', icon: <Bookmark size={16} /> },
];

export function AnalyticsPage({ initialTab }: { initialTab?: string }) {
  const [tab, setTab] = useState<'profile' | 'trends'>(initialTab === 'trends' ? 'trends' : 'profile');
  const pin = usePinterestReady();
  return (
    <div className="dash-main">
      <div className="stack-sm">
        <h1 className="dash-h1">Analytics</h1>
        <span className="muted">Pinterest performance and live search trends.</span>
      </div>
      <div className="card analytics-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'profile'} className="analytics-tab" onClick={() => setTab('profile')}>
          <strong>Profile Analytics</strong>
          <span className="subtle">Account performance</span>
        </button>
        <button role="tab" aria-selected={tab === 'trends'} className="analytics-tab" onClick={() => setTab('trends')}>
          <strong>
            Pinterest Trends <span className="chip chip-rec">Live</span>
          </strong>
          <span className="subtle">Trending searches</span>
        </button>
      </div>
      {!pin.connected && pin.configured !== null ? (
        <section className="card act-card">
          <PinterestNotConnected what={tab === 'profile' ? 'Analytics come from your Pinterest account.' : 'Pinterest Trends need a connected Pinterest business account.'} />
        </section>
      ) : tab === 'profile' ? (
        <ProfileAnalytics />
      ) : (
        <TrendsPanel />
      )}
    </div>
  );
}

function ProfileAnalytics() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [metric, setMetric] = useState<Metric>('IMPRESSION');
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async (d = days) => {
    setBusy(true);
    setError('');
    try {
      setData(await fetchAnalytics(d));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const connected = usePinterest((s) => s.connected);
  // Load as soon as the connection is confirmed, and again when the range changes.
  useEffect(() => {
    if (connected) void load(days);
  }, [days, connected]);
  const info = METRIC_INFO.find((m) => m.id === metric)!;
  const series = data?.daily ?? [];
  const total = series.reduce((n, d) => n + d[metric], 0);
  const best = series.reduce<(typeof series)[number] | null>((b, d) => (!b || d[metric] > b[metric] ? d : b), null);

  return (
    <>
      <section className="card act-card">
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="stack-sm">
            <span className="kicker">Pinterest analytics</span>
            <h2 style={{ fontSize: 22 }}>Profile Analytics</h2>
            <span className="muted">Organic performance of your connected Pinterest account.</span>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {([7, 30, 90] as const).map((d) => (
              <button key={d} className="filter-chip" aria-pressed={days === d} onClick={() => setDays(d)}>
                Last {d} days
              </button>
            ))}
            <button className="btn btn-sm" disabled={busy} onClick={() => void load()}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
        <span className="subtle">Pinterest limits the date range to 90 days; yesterday is the latest full day.</span>
        {error && <div className="issue">{error}</div>}
      </section>
      <div className="metric-grid">
        {METRIC_INFO.map((m) => (
          <button key={m.id} className={`card metric-card${metric === m.id ? ' is-active' : ''}`} onClick={() => setMetric(m.id)}>
            <span className="row-between">
              <span className="field-label">{m.label}</span>
              <span className="soft-icon" style={{ width: 28, height: 28 }}>
                {m.icon}
              </span>
            </span>
            <strong className="usage-num">{data ? (data.summary[m.id] ?? series.reduce((n, d) => n + d[m.id], 0)).toLocaleString() : '—'}</strong>
            <span className="subtle">{m.hint}</span>
          </button>
        ))}
      </div>
      <div className="analytics-grid">
        <section className="card act-card">
          <div className="row-between">
            <div className="stack-sm" style={{ gap: 2 }}>
              <strong style={{ fontSize: 17 }}>Performance over time</strong>
              <span className="subtle">Daily {info.label.toLowerCase()} for the selected period.</span>
            </div>
            <select className="select" style={{ width: 170 }} value={metric} onChange={(e) => setMetric(e.target.value as Metric)} aria-label="Metric">
              {METRIC_INFO.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          {series.length ? <Chart series={series.map((d) => ({ date: d.date, value: d[metric] }))} /> : <div className="act-empty">{busy ? 'Loading…' : 'No data for this period yet.'}</div>}
        </section>
        <section className="card act-card">
          <span className="kicker">Period insights</span>
          <strong style={{ fontSize: 18 }}>{info.label}</strong>
          <div className="fact">
            <span className="field-label">Period total</span>
            <strong>{data ? total.toLocaleString() : '—'}</strong>
          </div>
          <div className="fact">
            <span className="field-label">Daily average</span>
            <strong>{series.length ? Math.round(total / series.length).toLocaleString() : '—'}</strong>
          </div>
          <div className="fact">
            <span className="field-label">Best day</span>
            <strong>{best && best[metric] > 0 ? `${new Date(best.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${best[metric].toLocaleString()}` : 'No data'}</strong>
          </div>
          <span className="subtle">Metrics come from Pinterest and can update with a short delay.</span>
        </section>
      </div>
      {series.length > 0 && (
        <section className="card act-card">
          <details>
            <summary>View daily data</summary>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    {METRIC_INFO.map((m) => (
                      <th key={m.id}>{m.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...series].reverse().map((d) => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      {METRIC_INFO.map((m) => (
                        <td key={m.id}>{d[m.id].toLocaleString()}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}
    </>
  );
}

/** Simple responsive bar chart (no library): one bar per day. */
function Chart({ series }: { series: { date: string; value: number }[] }) {
  const max = Math.max(1, ...series.map((s) => s.value));
  return (
    <div className="bar-chart" role="img" aria-label="Daily values">
      {series.map((s) => (
        <span key={s.date} className="bar" style={{ height: `${Math.max(2, (s.value / max) * 100)}%` }} title={`${s.date}: ${s.value.toLocaleString()}`} />
      ))}
    </div>
  );
}

const TREND_REGIONS: [string, string][] = [
  ['US', 'United States'],
  ['CA', 'Canada'],
  ['GB+IE', 'UK & Ireland'],
  ['AU+NZ', 'Australia & NZ'],
  ['DE', 'Germany'],
  ['FR', 'France'],
  ['ES', 'Spain'],
  ['IT', 'Italy'],
  ['BR', 'Brazil'],
  ['MX', 'Mexico'],
];
const TREND_TYPES: [string, string][] = [
  ['growing', 'Growing trends'],
  ['monthly', 'Monthly top'],
  ['yearly', 'Yearly top'],
  ['seasonal', 'Seasonal'],
];

function TrendsPanel() {
  const [region, setRegion] = useState('US');
  const [type, setType] = useState('growing');
  const [filter, setFilter] = useState('');
  const [trends, setTrends] = useState<Trend[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true);
    setError('');
    try {
      setTrends((await fetchTrends(region, type)).trends);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const shown = useMemo(() => (trends ?? []).filter((t) => t.keyword.toLowerCase().includes(filter.trim().toLowerCase())), [trends, filter]);
  const pct = (v: number | null) => (v === null ? '—' : `${v > 0 ? '+' : ''}${Math.round(v)}%`);

  return (
    <>
      <section className="card act-card">
        <div className="row" style={{ gap: 10 }}>
          <span className="soft-icon">
            <TrendingUp size={18} />
          </span>
          <div className="stack-sm" style={{ gap: 2 }}>
            <span className="kicker">Pinterest trends</span>
            <strong style={{ fontSize: 18 }}>Pinterest search trends</strong>
            <span className="subtle">Top Pinterest keywords and their search growth. Use them as titles and keywords for your next Pins.</span>
          </div>
        </div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <label className="search-box grow" style={{ minWidth: 200 }}>
            <Search size={17} />
            <input placeholder="Filter keywords" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter keywords" />
          </label>
          <select className="select" style={{ width: 180 }} value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
            {TREND_REGIONS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <select className="select" style={{ width: 170 }} value={type} onChange={(e) => setType(e.target.value)} aria-label="Trend type">
            {TREND_TYPES.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <button className="btn btn-pink" disabled={busy} onClick={() => void load()}>
            <Search size={15} /> {busy ? 'Loading…' : 'Load trends'}
          </button>
        </div>
        {error && <div className="issue">{error}</div>}
      </section>
      <section className="card act-card">
        <strong style={{ fontSize: 17 }}>Current Pinterest keywords</strong>
        <span className="subtle">Growth is Pinterest's own number for each keyword; it is not a search count and can't be compared across keywords.</span>
        {!trends ? (
          <div className="act-empty">
            <BarChart3 size={20} />
            <strong>Load trends to see keywords</strong>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Keyword</th>
                  <th>Weekly</th>
                  <th>Monthly</th>
                  <th>Yearly</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((t, i) => (
                  <tr key={t.keyword}>
                    <td>{i + 1}</td>
                    <td>
                      <strong>{t.keyword}</strong>
                    </td>
                    <td className={(t.weekly ?? 0) >= 0 ? 'tone-ok' : ''}>{pct(t.weekly)}</td>
                    <td className={(t.monthly ?? 0) >= 0 ? 'tone-ok' : ''}>{pct(t.monthly)}</td>
                    <td className={(t.yearly ?? 0) >= 0 ? 'tone-ok' : ''}>{pct(t.yearly)}</td>
                    <td>
                      <a className="link-btn" href={`#/auto?q=${encodeURIComponent(t.keyword)}`}>
                        Design Pins →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
