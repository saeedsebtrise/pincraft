/**
 * "Research Pinterest first": open the Pinterest search for the focus keyword,
 * drop/paste screenshots of the top Pins, and let AI report what's winning.
 * The report ranks Auto Design's templates and briefs the AI designer.
 */
import { BarChart3, ExternalLink, ImagePlus, Loader2, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { requirePro } from '../saas/gates';
import {
  FONT_LABEL,
  LAYOUT_LABEL,
  MAX_SCREENSHOTS,
  pinterestSearchUrl,
  prepareScreenshot,
  requestResearch,
  TEXT_LABEL,
  type ResearchReport,
} from '../services/pinResearch';

interface Shot {
  id: number;
  mediaType: 'image/jpeg';
  data: string;
  preview: string;
}

const pct = (n: number) => `${Math.round(Math.min(1, Math.max(0, n)) * 100)}%`;

function Bars<T extends string>({ title, items, labels }: { title: string; items: { type: T; share: number }[]; labels: Record<T, string> }) {
  const top = [...items].sort((a, b) => b.share - a.share).slice(0, 3);
  if (!top.length) return null;
  return (
    <div className="stack-sm research-bars">
      <span className="section-title">{title}</span>
      {top.map((x) => (
        <div key={x.type} className="research-bar">
          <span>{labels[x.type] ?? x.type}</span>
          <span className="research-bar-track">
            <span style={{ width: pct(x.share) }} />
          </span>
          <span className="subtle">{pct(x.share)}</span>
        </div>
      ))}
    </div>
  );
}

let shotId = 0;

export function PinResearch({ keyword, report, onReport }: { keyword: string; report: ResearchReport | null; onReport: (r: ResearchReport | null) => void }) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  // The keyword typed above, or one typed here; with neither, the AI reads it off the screenshots.
  const [ownKw, setOwnKw] = useState('');
  const kw = keyword.trim() || ownKw.trim();

  const add = async (files: File[]) => {
    setError('');
    const images = files.filter((f) => f.type.startsWith('image/')).slice(0, MAX_SCREENSHOTS - shots.length);
    const ready: Shot[] = [];
    for (const f of images) {
      try {
        ready.push({ id: shotId++, ...(await prepareScreenshot(f)) });
      } catch {
        setError(`${f.name || 'An image'} couldn’t be opened.`);
      }
    }
    setShots((s) => [...s, ...ready].slice(0, MAX_SCREENSHOTS));
  };

  // Paste screenshots straight from the clipboard (Win+Shift+S, then Ctrl+V).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
      if (files.length) {
        e.preventDefault();
        void add(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const analyze = async () => {
    if (!shots.length || !requirePro('pinResearch')) return;
    setBusy(true);
    setError('');
    try {
      onReport(await requestResearch(kw, shots));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card research" aria-label="Pinterest research">
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
        <h2 className="dash-h2">
          <BarChart3 size={20} style={{ verticalAlign: '-3px' }} /> Research Pinterest first
        </h2>
        {report && (
          <button className="btn btn-sm" onClick={() => onReport(null)}>
            <X size={14} /> Clear research
          </button>
        )}
      </div>

      {!report && (
        <>
          <p className="muted">
            See what already wins for your keyword, then beat it. PinCraft opens Pinterest for you — it never scrapes Pinterest. Take 3–4 screenshots while scrolling
            the results (about 50 Pins) and drop or paste them here.
          </p>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {!keyword.trim() && (
              <input
                className="input"
                style={{ flex: '1 1 240px', maxWidth: 360 }}
                value={ownKw}
                onChange={(e) => setOwnKw(e.target.value)}
                placeholder="Keyword you searched (optional)"
                aria-label="Keyword you searched on Pinterest"
              />
            )}
            <a
              className={`btn ${kw ? 'btn-dark' : ''}`}
              href={kw ? pinterestSearchUrl(kw) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!kw}
              onClick={(e) => !kw && e.preventDefault()}
            >
              <Search size={15} /> {kw ? `Open Pinterest search for “${kw}”` : 'Type a keyword to open Pinterest'} <ExternalLink size={13} />
            </a>
          </div>
          <div
            ref={zoneRef}
            className="research-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void add([...e.dataTransfer.files]);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
          >
            <ImagePlus size={22} />
            <strong>Drop, paste (Ctrl+V) or click to add screenshots</strong>
            <span className="subtle">
              {shots.length}/{MAX_SCREENSHOTS} added · they’re sent to the AI only for this analysis and not stored
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              hidden
              onChange={(e) => {
                void add([...(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
          </div>
          {!!shots.length && (
            <div className="research-shots">
              {shots.map((s) => (
                <span key={s.id} className="research-shot">
                  <img src={s.preview} alt="Pinterest screenshot" />
                  <button type="button" aria-label="Remove screenshot" onClick={() => setShots((all) => all.filter((x) => x.id !== s.id))}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-pink" disabled={!shots.length || busy} onClick={() => void analyze()}>
              {busy ? <Loader2 size={15} /> : <BarChart3 size={15} />} {busy ? 'AI is studying the Pins…' : `Analyze ${shots.length || ''} screenshot${shots.length === 1 ? '' : 's'}`}
            </button>
          </div>
          {error && (
            <div className="issue" role="alert">
              {error}
            </div>
          )}
        </>
      )}

      {report && (
        <div className="stack">
          <p>
            <strong>{report.pinsAnalyzed} Pins analysed.</strong> {report.summary}
          </p>
          <div className="research-grid">
            <Bars title="Layouts" items={report.layouts} labels={LAYOUT_LABEL} />
            <Bars title="Headline treatment" items={report.textStyles} labels={TEXT_LABEL} />
            <Bars title="Fonts" items={report.fonts} labels={FONT_LABEL} />
            <div className="stack-sm">
              <span className="section-title">Also</span>
              <span>Number badge: {pct(report.numberBadgeShare)}</span>
              <span>CTA button: {pct(report.ctaShare)}</span>
              <span>Website shown: {pct(report.websiteShare)}</span>
              {!!report.palette?.length && (
                <span className="row" style={{ gap: 4 }}>
                  {report.palette.slice(0, 6).map((c) => (
                    <span key={c} className="research-swatch" style={{ background: /^#[0-9a-f]{6}$/i.test(c) ? c : 'transparent' }} title={c} />
                  ))}
                </span>
              )}
            </div>
          </div>
          {!!report.headlinePatterns?.length && (
            <div className="stack-sm">
              <span className="section-title">Headline patterns</span>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {report.headlinePatterns.map((h) => (
                  <span key={h} className="chip">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!!report.gaps?.length && (
            <div className="stack-sm">
              <span className="section-title">How your Pins will stand out</span>
              <ul className="research-gaps">
                {report.gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
          <span className="subtle">✓ The designs below are ranked to match what wins, and AI designs are briefed to beat it.</span>
        </div>
      )}
    </section>
  );
}
