/**
 * Activity: what happened in the workspace and what needs attention —
 * searchable, filtered by outcome, area and time, newest first.
 */
import { AlertTriangle, CheckCircle2, Info, RefreshCw, Search, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  dayLabel,
  filterEvents,
  MAX_EVENTS,
  RANGES,
  useActivity,
  type ActivityArea,
  type ActivityEvent,
  type ActivityOutcome,
  type OutcomeFilter,
  type RangeDays,
} from '../services/activity';

const OUTCOMES: { id: OutcomeFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'warning', label: 'Warnings' },
  { id: 'failed', label: 'Failed' },
  { id: 'update', label: 'Updates' },
];
const AREAS: ActivityArea[] = ['Pins', 'Export', 'AI', 'Research', 'Blog import', 'Templates', 'Brand Kit', 'Projects', 'Account'];

const BADGE: Record<ActivityOutcome, { label: string; className: string; icon: React.ReactNode }> = {
  completed: { label: 'Completed', className: 'act-ok', icon: <CheckCircle2 size={18} /> },
  warning: { label: 'Warning', className: 'act-warn', icon: <AlertTriangle size={18} /> },
  failed: { label: 'Failed', className: 'act-fail', icon: <XCircle size={18} /> },
  update: { label: 'Update', className: 'act-update', icon: <Info size={18} /> },
};

export function ActivityPage() {
  const events = useActivity((s) => s.events);
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState<OutcomeFilter>('all');
  const [area, setArea] = useState<ActivityArea | 'all'>('all');
  const [days, setDays] = useState<RangeDays>(30);
  useEffect(() => {
    useActivity.getState().reload();
  }, []);

  const shown = useMemo(() => filterEvents(events, { outcome, area, days, query }), [events, outcome, area, days, query]);
  const groups = useMemo(() => {
    const out: { day: string; list: ActivityEvent[] }[] = [];
    for (const e of shown) {
      const day = dayLabel(e.at);
      const g = out[out.length - 1];
      if (g?.day === day) g.list.push(e);
      else out.push({ day, list: [e] });
    }
    return out;
  }, [shown]);
  const filtered = query.trim() !== '' || outcome !== 'all' || area !== 'all' || days !== 30;

  return (
    <div className="dash-main">
      <div className="stack-sm">
        <h1 className="dash-h1">Activity</h1>
        <span className="muted">See what happened in your workspace and which actions need attention.</span>
      </div>
      <section className="card act-card">
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="stack-sm">
            <strong style={{ fontSize: 17 }}>Workspace activity</strong>
            <span className="subtle">Your {MAX_EVENTS} most recent events, newest first — including past problems. Times use your device's timezone.</span>
          </div>
          <button className="btn" onClick={() => useActivity.getState().reload()}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <label className="search-box grow" style={{ minWidth: 220 }}>
            <Search size={17} />
            <input placeholder="Search activity…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search activity" />
          </label>
          <select className="select" style={{ width: 170 }} value={area} onChange={(e) => setArea(e.target.value as ActivityArea | 'all')} aria-label="Area">
            <option value="all">All activity</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select className="select" style={{ width: 150 }} value={days} onChange={(e) => setDays(Number(e.target.value) as RangeDays)} aria-label="Time range">
            {(Object.keys(RANGES) as unknown as RangeDays[]).map((d) => (
              <option key={d} value={d}>
                {RANGES[d]}
              </option>
            ))}
          </select>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Outcome">
          {OUTCOMES.map((o) => (
            <button key={o.id} type="button" className="filter-chip" aria-pressed={outcome === o.id} onClick={() => setOutcome(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="row-between act-count">
          <span className="subtle">
            {shown.length} of {events.length} matching event{events.length === 1 ? '' : 's'}
          </span>
          {filtered && (
            <button
              className="link-btn"
              onClick={() => {
                setQuery('');
                setOutcome('all');
                setArea('all');
                setDays(30);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        {shown.length === 0 ? (
          <div className="act-empty">
            <Search size={20} />
            <strong>No matching activity</strong>
            <span className="subtle">{events.length ? 'Try a different search or clear the selected filters.' : 'Create Pins, export or run Auto Design — it will show up here.'}</span>
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.day} className="stack-sm">
              <span className="section-title act-day">{g.day}</span>
              {g.list.map((e) => (
                <ActivityRow key={e.id} e={e} />
              ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function ActivityRow({ e }: { e: ActivityEvent }) {
  const b = BADGE[e.outcome];
  return (
    <div className="act-row">
      <span className={`act-icon ${b.className}`}>{b.icon}</span>
      <div className="stack-sm grow" style={{ gap: 2 }}>
        <span className="subtle">{e.area}</span>
        <strong>{e.title}</strong>
        {e.detail && <span className="muted">{e.detail}</span>}
        {e.link && (
          <a className="act-link" href={e.link.href}>
            {e.link.label} →
          </a>
        )}
        {e.data && Object.keys(e.data).length > 0 && (
          <details className="act-details">
            <summary>Event details</summary>
            <dl>
              {Object.entries(e.data).map(([k, v]) => (
                <div key={k} className="row" style={{ gap: 8 }}>
                  <dt className="subtle">{k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
      </div>
      <div className="stack-sm" style={{ alignItems: 'flex-end', gap: 4 }}>
        <span className={`act-badge ${b.className}`}>{b.label}</span>
        <span className="subtle">{new Date(e.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}
