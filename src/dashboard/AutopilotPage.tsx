import { CalendarClock, CheckCircle2, Download, ExternalLink, FileSpreadsheet, GitBranch, Image, KeyRound, Play, Workflow } from 'lucide-react';
import { useRef, useState } from 'react';
import sheetScript from '../../autopilot/google-sheet-script.gs?raw';
import setupGuide from '../../docs/AUTOPILOT_SETUP.md?raw';
import { AutopilotControl } from './AutopilotControl';
import './autopilot.css';

const STORAGE_KEY = 'pincraft:autopilot:shortcuts';
const QUEUE_CSV = 'Article URL,Board ID,Status,Pin URL,Error,Job ID,Lease,Updated At\r\n';
type Shortcuts = { sheet: string; repository: string };
const EMPTY_SHORTCUTS: Shortcuts = { sheet: '', repository: '' };

function downloadText(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const anchor = Object.assign(document.createElement('a'), { href: url, download: name });
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Only service links are retained; credentials and arbitrary destinations are rejected. */
function normalizeShortcut(value: string, kind: keyof Shortcuts): string {
  if (!value.trim()) return '';
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error(kind === 'sheet' ? 'Enter a Google Sheets URL.' : 'Enter a GitHub repository URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use an HTTPS link without credentials or a custom port.');
  if (kind === 'sheet') {
    const match = url.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)(?:\/.*)?$/);
    if (url.hostname !== 'docs.google.com' || !match) throw new Error('Use a link such as https://docs.google.com/spreadsheets/d/your-sheet-id/edit.');
    return `https://docs.google.com/spreadsheets/d/${match[1]}/edit`;
  }
  const match = url.pathname.match(/^\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_.-]+)\/?$/);
  const repository = match?.[2].replace(/\.git$/, '');
  if (url.hostname !== 'github.com' || !match || !repository || ['.', '..'].includes(repository)) throw new Error('Use the repository link: https://github.com/owner/repository.');
  return `https://github.com/${match[1]}/${repository}`;
}

function readShortcuts(): Shortcuts {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!saved || typeof saved !== 'object') return EMPTY_SHORTCUTS;
    const data = saved as Record<string, unknown>;
    return {
      sheet: normalizeShortcut(typeof data.sheet === 'string' ? data.sheet : '', 'sheet'),
      repository: normalizeShortcut(typeof data.repository === 'string' ? data.repository : '', 'repository'),
    };
  } catch { return EMPTY_SHORTCUTS; }
}

const STATUSES = [
  ['Pending / Retry', 'Waiting for the next publishing slot. Leave Board ID blank for a suggestion from your allowed boards.'],
  ['Processing', 'The worker is reading the article, writing copy and rendering the Pin.'],
  ['Publishing', 'The Pin has been handed to Make. Wait for the result before editing the row.'],
  ['Posted', 'Pinterest returned a Pin ID. Open the Pin URL in the Sheet to view it.'],
  ['Error', 'Preparation failed before publishing. Fix the article or configuration, then set the row to Retry.'],
  ['Needs review', 'The publishing result is uncertain. Check Pinterest and Make first; if posted, record the Pin URL and set Posted. This status pauses the queue.'],
  ['Skip', 'This row is excluded. An article already marked Posted is also skipped automatically.'],
] as const;

export function AutopilotPage() {
  const [saved, setSaved] = useState(readShortcuts);
  const [draft, setDraft] = useState(saved);
  const [errors, setErrors] = useState<Partial<Record<keyof Shortcuts, string>>>({});
  const [message, setMessage] = useState('');
  const [storageError, setStorageError] = useState(false);
  const setupRef = useRef<HTMLElement>(null);
  const workflowUrl = saved.repository ? `${saved.repository}/actions/workflows/pinterest-autopilot.yml` : '';

  function saveLinks(event: React.FormEvent) {
    event.preventDefault();
    const next: Shortcuts = { ...EMPTY_SHORTCUTS };
    const nextErrors: typeof errors = {};
    for (const field of ['sheet', 'repository'] as const) {
      try { next[field] = normalizeShortcut(draft[field], field); }
      catch (error) { nextErrors[field] = error instanceof Error ? error.message : 'Check this link.'; }
    }
    setErrors(nextErrors);
    setMessage('');
    setStorageError(false);
    if (Object.keys(nextErrors).length) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaved(next);
      setDraft(next);
      setMessage('Shortcuts saved on this device. Connection status has not been checked.');
    } catch {
      setStorageError(true);
      setMessage('This browser could not save shortcuts. You can still use the setup downloads below.');
    }
  }

  return (
    <main className="dash-main autopilot-page">
      <section className="autopilot-hero" aria-labelledby="autopilot-title">
        <div className="autopilot-intro">
          <span className="autopilot-eyebrow"><Workflow size={15} aria-hidden="true" /> Publish &amp; grow</span>
          <h1 className="dash-h1" id="autopilot-title">Your articles. A steady stream of Pins.</h1>
          <p>Set up Autopilot once, then add article links to your Google Sheet. Your cloud worker creates the copy and design, and Make publishes to Pinterest — even when your computer is off.</p>
          <div className="autopilot-actions">
            <button type="button" className="btn btn-pink" onClick={() => { setupRef.current?.scrollIntoView({ block: 'start' }); setupRef.current?.focus({ preventScroll: true }); }}><Play size={16} aria-hidden="true" /> Set up Autopilot</button>
            <button type="button" className="btn" onClick={() => downloadText('PinCraft-Autopilot-Setup.md', setupGuide, 'text/markdown')}><Download size={16} aria-hidden="true" /> Download full guide</button>
          </div>
          <span className="autopilot-hint">Set up once, then run everything from the control panel below.</span>
        </div>
        <ol className="autopilot-flow" aria-label="Autopilot workflow">
          <li><span className="autopilot-flow-icon"><FileSpreadsheet size={22} aria-hidden="true" /></span><div><strong>Queue your articles</strong><span>Google Sheets</span></div></li>
          <li><span className="autopilot-flow-icon"><Image size={22} aria-hidden="true" /></span><div><strong>Create copy &amp; design</strong><span>Gemini + cloud worker</span></div></li>
          <li><span className="autopilot-flow-icon"><Workflow size={22} aria-hidden="true" /></span><div><strong>Publish &amp; record the link</strong><span>Make + Pinterest</span></div></li>
        </ol>
      </section>

      <div className="autopilot-facts" aria-label="Default publishing settings">
        <div><CalendarClock size={19} aria-hidden="true" /><span><strong>Up to 10 publish attempts</strong><small>per rolling 24 hours</small></span></div>
        <div><CalendarClock size={19} aria-hidden="true" /><span><strong>At least 2 hours apart</strong><small>queue checks every 15 minutes</small></span></div>
        <div><CheckCircle2 size={19} aria-hidden="true" /><span><strong>Preview before publishing</strong><small>1000 × 1500 PNG + copy</small></span></div>
      </div>

      <AutopilotControl />

      <section className="card autopilot-card" aria-labelledby="autopilot-links-title">
        <div className="autopilot-section-heading"><div><h2 id="autopilot-links-title">Your workspace shortcuts</h2><p>Save your Sheet and repository links for quick access. These links do not connect or enable Autopilot.</p></div></div>
        <form onSubmit={saveLinks} noValidate className="autopilot-links-form">
          <div className="field">
            <label className="field-label" htmlFor="autopilot-sheet">Google Sheet URL</label>
            <input className="input" id="autopilot-sheet" type="url" placeholder="https://docs.google.com/spreadsheets/d/…/edit" value={draft.sheet} onChange={(event) => { setDraft({ ...draft, sheet: event.target.value }); setMessage(''); }} aria-invalid={!!errors.sheet} aria-describedby={errors.sheet ? 'autopilot-sheet-error' : undefined} autoComplete="off" />
            {errors.sheet && <p className="autopilot-error" id="autopilot-sheet-error" role="alert">{errors.sheet}</p>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="autopilot-repository">GitHub repository URL</label>
            <input className="input" id="autopilot-repository" type="url" placeholder="https://github.com/owner/repository" value={draft.repository} onChange={(event) => { setDraft({ ...draft, repository: event.target.value }); setMessage(''); }} aria-invalid={!!errors.repository} aria-describedby={errors.repository ? 'autopilot-repository-error' : undefined} autoComplete="off" />
            {errors.repository && <p className="autopilot-error" id="autopilot-repository-error" role="alert">{errors.repository}</p>}
          </div>
          <div className="autopilot-actions autopilot-links-actions">
            <button type="submit" className="btn">Save shortcuts</button>
            {saved.sheet && <a className="btn" href={saved.sheet} target="_blank" rel="noopener noreferrer">Open queue <ExternalLink size={14} aria-hidden="true" /></a>}
            {workflowUrl && <a className="btn" href={workflowUrl} target="_blank" rel="noopener noreferrer">Open workflow <ExternalLink size={14} aria-hidden="true" /></a>}
          </div>
          {message && <p className={storageError ? 'autopilot-error' : 'autopilot-hint'} role={storageError ? 'alert' : 'status'}>{message}</p>}
        </form>
      </section>

      <section ref={setupRef} tabIndex={-1} className="autopilot-setup" aria-labelledby="autopilot-setup-title">
        <div className="autopilot-section-heading"><div><span className="autopilot-eyebrow">One-time setup</span><h2 id="autopilot-setup-title">Bring your publishing workflow together</h2><p>You will need a Google account, a GitHub repository, a Gemini API key and a Make scenario connected to Pinterest. Provider usage and plan limits apply.</p></div></div>
        <ol className="autopilot-steps">
          <li className="card autopilot-card"><span className="autopilot-step-number" aria-hidden="true">01</span><div className="autopilot-step-body"><h3>Create your queue</h3><p>Create a Google Sheet, open <strong>Extensions → Apps Script</strong>, and paste the downloaded script. Follow the guide to set its properties, run <code>setup()</code> and deploy its web app. Keep publishing disabled during setup.</p><p>The script creates a <strong>Pins</strong> tab. Add one article URL per row. Board ID is optional; leave the job, lease and result columns for the worker.</p><div className="autopilot-actions"><button className="btn btn-sm" type="button" onClick={() => downloadText('google-sheet-script.gs', sheetScript)}><Download size={14} aria-hidden="true" /> Download Apps Script</button><button className="btn btn-sm" type="button" onClick={() => downloadText('pincraft-autopilot-queue.csv', QUEUE_CSV, 'text/csv')}><FileSpreadsheet size={14} aria-hidden="true" /> Queue CSV headers</button></div></div></li>
          <li className="card autopilot-card"><span className="autopilot-step-number" aria-hidden="true">02</span><div className="autopilot-step-body"><h3>Configure the cloud worker</h3><p>Push this project to your GitHub repository. The <strong>Pinterest Autopilot</strong> workflow runs from its Actions tab. Add the guide’s secrets and variables to the <strong>autopilot</strong> environment, including your allowed boards and Gemini model.</p><div className="autopilot-note"><KeyRound size={17} aria-hidden="true" /><span>API keys belong in GitHub Secrets and Apps Script properties. This page only saves your two workspace links.</span></div>{workflowUrl && <a className="autopilot-text-link" href={workflowUrl} target="_blank" rel="noopener noreferrer"><GitBranch size={15} aria-hidden="true" /> Open your workflow <ExternalLink size={13} aria-hidden="true" /></a>}</div></li>
          <li className="card autopilot-card"><span className="autopilot-step-number" aria-hidden="true">03</span><div className="autopilot-step-body"><h3>Connect Make to Pinterest</h3><p>Create the Make webhook scenario from the guide, connect your Pinterest account and map the image, board, title, description, alt text and article link. The webhook response must return the created Pinterest Pin ID so the worker can mark the row Posted.</p><p>Use the guide’s exact response mapping and duplicate-protection steps. Keep the Make scenario available when you run a publishing job.</p></div></li>
          <li className="card autopilot-card"><span className="autopilot-step-number" aria-hidden="true">04</span><div className="autopilot-step-body"><h3>Preview, then start your schedule</h3><p>In GitHub Actions, choose <strong>Run workflow → preview</strong> and enter an article URL. Download the <strong>autopilot-preview</strong> artifact and check its image and copy. Preview does not change the Sheet or contact Make.</p><p>When your connections and preview are ready, enable publishing in GitHub and Apps Script. Run one publish job and verify its Pin and Sheet row, then run <code>installTimer()</code>. The timer checks every 15 minutes; the Sheet enforces your limit and interval.</p><p className="autopilot-hint">To pause future jobs, disable publishing in Apps Script and GitHub. A job already handed to Make may still finish. Check the Sheet and workflow history for its result.</p></div></li>
        </ol>
      </section>

      <section className="card autopilot-card" aria-labelledby="autopilot-status-title">
        <div className="autopilot-section-heading"><div><h2 id="autopilot-status-title">Read your queue at a glance</h2><p>These are the statuses used in your Google Sheet. Open the Sheet for actual job progress.</p></div></div>
        <dl className="autopilot-status-list">{STATUSES.map(([label, explanation]) => <div key={label}><dt>{label}</dt><dd>{explanation}</dd></div>)}</dl>
        <p className="autopilot-hint">If a worker stops while a row is Processing or Publishing, check its GitHub run and Make history before changing the row. Those states hold the queue to avoid overlapping jobs.</p>
      </section>
    </main>
  );
}
