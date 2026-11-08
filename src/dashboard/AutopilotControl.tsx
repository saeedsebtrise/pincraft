/**
 * Autopilot control panel: see the Sheet queue, add article links, turn
 * publishing on/off, set the daily limit, start a preview or a publish run,
 * retry/skip rows and follow the worker's runs — without leaving PinCraft.
 * Everything goes through the server (admin key), never straight to Google or GitHub.
 */
import { CheckCircle2, ExternalLink, KeyRound, ListPlus, Loader2, Lock, Play, RefreshCw, Send, Settings2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminKey, autopilotApi, ControlError, controlStatus, parseArticleLinks, type Overview, type QueueRow, type WorkerRun } from '../services/autopilotControl';

type Phase = 'checking' | 'offline' | 'setup' | 'locked' | 'ready';

const when = (t: number | string) => {
  const d = typeof t === 'number' ? new Date(t) : new Date(t);
  return Number.isFinite(d.getTime()) && d.getTime() > 0 ? d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
};
const randomKey = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('');
const STATUS_CLASS: Record<string, string> = { Posted: 'is-ok', Error: 'is-bad', 'Needs review': 'is-warn', Processing: 'is-busy', Publishing: 'is-busy', Skip: 'is-muted' };

export function AutopilotControl() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [missing, setMissing] = useState<string[]>([]);
  const [keyDraft, setKeyDraft] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [runs, setRuns] = useState<WorkerRun[]>([]);
  const [runsNote, setRunsNote] = useState('');
  const [links, setLinks] = useState('');
  const [boardId, setBoardId] = useState('');
  // Different Pins per article: each gets its own design, photo and title, posted a day apart.
  const [pinsPerArticle, setPinsPerArticle] = useState(3);
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);
  const suggestedKey = useMemo(randomKey, []);

  const fail = (e: unknown) => {
    if (e instanceof ControlError && e.status === 401) {
      adminKey.set('');
      setPhase('locked');
      setNote({ kind: 'bad', text: 'Wrong admin key.' });
      return;
    }
    setNote({ kind: 'bad', text: (e as Error).message });
  };

  const refresh = useCallback(async () => {
    try {
      const [o, r] = await Promise.all([autopilotApi.overview(), autopilotApi.runs()]);
      setOverview(o);
      setRuns(r.runs);
      setRunsNote(r.error ?? '');
      setPhase('ready');
    } catch (e) {
      fail(e);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const s = await controlStatus();
      if (!s) return setPhase('offline');
      if (!s.configured) {
        setMissing(s.missing);
        return setPhase('setup');
      }
      if (!adminKey.get()) return setPhase('locked');
      await refresh();
    })();
  }, [refresh]);

  // Keep the queue fresh while the panel is open.
  useEffect(() => {
    if (phase !== 'ready') return;
    const id = setInterval(() => void refresh(), 30000);
    return () => clearInterval(id);
  }, [phase, refresh]);

  const act = async (label: string, f: () => Promise<unknown>, done: string) => {
    setBusy(label);
    setNote(null);
    try {
      await f();
      setNote({ kind: 'ok', text: done });
      await refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy('');
    }
  };

  if (phase === 'checking') {
    return (
      <section className="card autopilot-card ap-control">
        <span className="subtle">
          <Loader2 size={15} /> Checking the control panel…
        </span>
      </section>
    );
  }

  if (phase === 'offline' || phase === 'setup') {
    return (
      <section className="card autopilot-card ap-control" aria-labelledby="ap-control-title">
        <div className="autopilot-section-heading">
          <div>
            <span className="autopilot-eyebrow">
              <Settings2 size={15} /> Control panel
            </span>
            <h2 id="ap-control-title">Run Autopilot from this page</h2>
            <p>Once connected, you can add articles, start previews, turn publishing on or off and watch the queue here. A one-time setup (about 5 minutes):</p>
          </div>
        </div>
        <ol className="ap-setup">
          <li>
            <strong>Update the Google Sheet script.</strong> Download the latest Apps Script below (step 01), paste it over the old one in <em>Extensions → Apps Script</em>, then <em>Deploy → Manage deployments → Edit → Version: New version → Deploy</em>. The web app URL stays the same.
          </li>
          <li>
            <strong>Add 3 environment variables in Vercel</strong> (Project → Settings → Environment Variables):
            <ul>
              <li>
                <code>AUTOPILOT_SHEET_URL</code> — the same Apps Script <code>/exec</code> URL as your GitHub secret
              </li>
              <li>
                <code>AUTOPILOT_SHEET_SECRET</code> — the same value as your GitHub secret and the Sheet’s <code>SHARED_SECRET</code>
              </li>
              <li>
                <code>AUTOPILOT_ADMIN_KEY</code> — a password only you know (16+ characters). For example: <code className="ap-key">{suggestedKey}</code>
              </li>
            </ul>
          </li>
          <li>
            <strong>Redeploy</strong> in Vercel → Deployments → ⋯ → Redeploy. Then reload this page and enter your admin key.
          </li>
        </ol>
        <p className="autopilot-hint">
          {phase === 'offline'
            ? 'The PinCraft server did not answer. Locally, run npm run ai-proxy with these keys in .env; online, redeploy after adding them.'
            : `Still missing on the server: ${missing.join(', ')}.`}
        </p>
      </section>
    );
  }

  if (phase === 'locked') {
    return (
      <section className="card autopilot-card ap-control" aria-labelledby="ap-control-title">
        <div className="autopilot-section-heading">
          <div>
            <span className="autopilot-eyebrow">
              <Lock size={15} /> Control panel
            </span>
            <h2 id="ap-control-title">Unlock Autopilot</h2>
            <p>Enter the admin key you set as AUTOPILOT_ADMIN_KEY on the server. It is kept for this browser tab only.</p>
          </div>
        </div>
        <form
          className="row ap-unlock"
          onSubmit={(e) => {
            e.preventDefault();
            adminKey.set(keyDraft.trim());
            setKeyDraft('');
            setNote(null);
            void refresh();
          }}
        >
          <input className="input" type="password" autoComplete="current-password" placeholder="Admin key" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} aria-label="Admin key" />
          <button className="btn btn-pink" disabled={keyDraft.trim().length < 16}>
            <KeyRound size={15} /> Unlock
          </button>
        </form>
        {note && <p className={note.kind === 'bad' ? 'autopilot-error' : 'autopilot-hint'}>{note.text}</p>}
      </section>
    );
  }

  const o = overview!;
  const counts = o.rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {});
  const waiting = (counts.Pending ?? 0) + (counts.Retry ?? 0);
  const rowAction = (r: QueueRow) => {
    const set = (status: 'Retry' | 'Skip' | 'Pending', label: string) => (
      <button key={status} className="btn btn-sm" disabled={!!busy} onClick={() => void act(`row${r.row}`, () => autopilotApi.setRow(r.row, status), `Row ${r.row} set to ${status}.`)}>
        {label}
      </button>
    );
    if (r.status === 'Error') return [set('Retry', 'Retry'), set('Skip', 'Skip')];
    if (r.status === 'Pending' || r.status === 'Retry') return [set('Skip', 'Skip')];
    if (r.status === 'Skip') return [set('Pending', 'Queue again')];
    return [];
  };

  return (
    <section className="card autopilot-card ap-control" aria-labelledby="ap-control-title">
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="stack-sm" style={{ gap: 2 }}>
          <span className="autopilot-eyebrow">
            <Settings2 size={15} /> Control panel
          </span>
          <h2 id="ap-control-title">Autopilot</h2>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-sm" disabled={!!busy} onClick={() => void act('refresh', async () => undefined, 'Up to date.')}>
            {busy === 'refresh' ? <Loader2 size={14} /> : <RefreshCw size={14} />} Refresh
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              adminKey.set('');
              setPhase('locked');
            }}
          >
            <Lock size={14} /> Lock
          </button>
        </div>
      </div>

      <div className="ap-stats">
        <div className={`ap-stat ${o.settings.enabled ? 'is-on' : ''}`}>
          <span>Publishing</span>
          <strong>{o.settings.enabled ? 'ON' : 'OFF'}</strong>
          <button className={`btn btn-sm ${o.settings.enabled ? '' : 'btn-pink'}`} disabled={!!busy} onClick={() => void act('toggle', () => autopilotApi.settings({ enabled: !o.settings.enabled }), o.settings.enabled ? 'Publishing turned off in the Sheet.' : 'Publishing turned on in the Sheet.')}>
            {busy === 'toggle' ? <Loader2 size={14} /> : null} Turn {o.settings.enabled ? 'off' : 'on'}
          </button>
        </div>
        <div className="ap-stat">
          <span>Pins in the last 24 h</span>
          <strong>
            {o.postedLast24h} / {o.settings.dailyLimit}
          </strong>
          <select className="select" value={o.settings.dailyLimit} disabled={!!busy} onChange={(e) => void act('limit', () => autopilotApi.settings({ dailyLimit: Number(e.target.value) }), `Daily limit set to ${e.target.value}.`)} aria-label="Daily limit">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} a day
              </option>
            ))}
          </select>
        </div>
        <div className="ap-stat">
          <span>Next slot</span>
          <strong>{o.nextSlotAt > Date.now() ? when(o.nextSlotAt) : 'Now'}</strong>
          <small>every {o.settings.intervalMinutes / 60} h at least</small>
        </div>
        <div className="ap-stat">
          <span>Waiting in queue</span>
          <strong>{waiting}</strong>
          <button className="btn btn-sm" disabled={!!busy || !waiting} onClick={() => void act('publish', () => autopilotApi.publishNow(), 'Publish run started. If a slot is open, the next article will post in a few minutes.')}>
            {busy === 'publish' ? <Loader2 size={14} /> : <Send size={14} />} Publish next now
          </button>
        </div>
      </div>
      <p className="autopilot-hint">Publishing also needs the GitHub variable AUTOPILOT_ENABLED = true and the Make scenario on. Turning it off here stops new jobs; one already sent to Make may still finish.</p>

      {note && <p className={note.kind === 'bad' ? 'autopilot-error' : 'ap-ok'} role={note.kind === 'bad' ? 'alert' : 'status'}>{note.text}</p>}

      <div className="ap-grid">
        <form
          className="stack-sm ap-box"
          onSubmit={(e) => {
            e.preventDefault();
            const urls = parseArticleLinks(links);
            void act('add', async () => {
              const r = await autopilotApi.add(urls, boardId.trim(), pinsPerArticle);
              setLinks('');
              return r;
            }, `${urls.length} article${urls.length === 1 ? '' : 's'} × ${pinsPerArticle} Pin${pinsPerArticle === 1 ? '' : 's'} sent to the queue (Pins already in the queue and invalid links are skipped).`);
          }}
        >
          <strong>
            <ListPlus size={15} /> Add articles
          </strong>
          <textarea className="input" rows={4} placeholder={'One article link per line\nhttps://yourblog.com/post-1'} value={links} onChange={(e) => setLinks(e.target.value)} aria-label="Article links" />
          <label className="row" style={{ gap: 8 }}>
            <span className="subtle" style={{ whiteSpace: 'nowrap' }}>Pins per article</span>
            <select className="select" value={pinsPerArticle} onChange={(e) => setPinsPerArticle(Number(e.target.value))} aria-label="Pins per article">
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Pin' : 'different Pins'}
                </option>
              ))}
            </select>
          </label>
          {pinsPerArticle > 1 && <span className="subtle">Each Pin gets its own design, lead photo and title. Pins of one article go out at least a day apart. Add a posted article again to give it more Pins.</span>}
          <div className="row" style={{ gap: 8 }}>
            <input className="input" placeholder="Board ID (optional — AI picks)" value={boardId} onChange={(e) => setBoardId(e.target.value)} aria-label="Board ID" />
            <button className="btn btn-pink" disabled={!!busy || !parseArticleLinks(links).length}>
              {busy === 'add' ? <Loader2 size={15} /> : <ListPlus size={15} />} Add {parseArticleLinks(links).length || ''}
            </button>
          </div>
        </form>
        <form
          className="stack-sm ap-box"
          onSubmit={(e) => {
            e.preventDefault();
            void act('preview', () => autopilotApi.preview(previewUrl.trim(), pinsPerArticle), `Preview of ${pinsPerArticle} Pin${pinsPerArticle === 1 ? '' : 's'} started. In a minute or two it shows under Recent runs — open it and download “autopilot-preview” (preview.png, preview-2.png, …).`);
          }}
        >
          <strong>
            <Play size={15} /> Preview a Pin
          </strong>
          <span className="subtle">Makes the image and copy for one article without publishing or touching the queue.</span>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" placeholder="https://yourblog.com/an-article" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} aria-label="Article to preview" />
            <button className="btn" disabled={!!busy || !/^https?:\/\//i.test(previewUrl.trim())}>
              {busy === 'preview' ? <Loader2 size={15} /> : <Play size={15} />} Run preview
            </button>
          </div>
        </form>
      </div>

      <div className="stack-sm">
        <div className="row-between">
          <strong>Queue</strong>
          <span className="subtle">
            {Object.entries(counts)
              .map(([k, v]) => `${v} ${k}`)
              .join(' · ') || 'Empty'}
            {o.total > o.rows.length ? ` · showing first ${o.rows.length} of ${o.total}` : ''}
          </span>
        </div>
        {o.rows.length ? (
          <div className="table-wrap">
            <table className="data-table ap-queue">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Article</th>
                  <th>Status</th>
                  <th>Pin / note</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {o.rows.map((r) => (
                  <tr key={r.row}>
                    <td className="muted">{r.row}</td>
                    <td className="ellipsis" style={{ maxWidth: 320 }}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer">
                        {r.url.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    </td>
                    <td>
                      <span className={`chip ap-status ${STATUS_CLASS[r.status] ?? ''}`}>{r.status}</span>
                    </td>
                    <td className="ellipsis" style={{ maxWidth: 280 }}>
                      {r.pinUrl ? (
                        <a href={r.pinUrl} target="_blank" rel="noopener noreferrer">
                          View Pin <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="subtle" title={r.error}>
                          {r.error}
                        </span>
                      )}
                    </td>
                    <td className="muted">{when(r.updatedAt)}</td>
                    <td className="row" style={{ gap: 6 }}>
                      {rowAction(r)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <span className="subtle">No articles yet — add some above.</span>
        )}
        {counts['Needs review'] ? <p className="autopilot-error">A row needs review: check Pinterest and Make, then fix it in the Sheet (record the Pin URL and set Posted, or set Retry). The queue waits until then.</p> : null}
      </div>

      <div className="stack-sm">
        <strong>Recent runs</strong>
        {runsNote && <span className="subtle">{runsNote}</span>}
        {runs.length ? (
          <ul className="ap-runs">
            {runs.map((r) => (
              <li key={r.id}>
                <span className={`chip ap-status ${r.status !== 'completed' ? 'is-busy' : r.conclusion === 'success' ? 'is-ok' : 'is-bad'}`}>{r.status !== 'completed' ? r.status.replace('_', ' ') : r.conclusion}</span>
                <span>Run #{r.number}</span>
                <span className="subtle">{when(r.createdAt)}</span>
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  Open <ExternalLink size={12} />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <span className="subtle">No runs yet.</span>
        )}
        <span className="autopilot-hint">
          <CheckCircle2 size={13} /> A preview’s image and text are under “Artifacts” on its run page.
        </span>
      </div>
    </section>
  );
}
