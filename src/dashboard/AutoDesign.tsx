import { Check, Link2, Loader2, Pencil, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cssFontFamily } from '../config/fonts';
import { konvaFontStyle, layoutText } from '../editor/canvas/textLayout';
import { createProject } from '../model/factory';
import type { ImageMap } from '../editor/canvas/nodes';
import type { Id, PinDocument, Rect, TextLayer } from '../model/types';
import { ensureCanCreateProject, handleLimitError } from '../saas/gates';
import { autoDesign, autoText, type AutoDesignResult, type AutoInput } from '../services/autoDesign';
import { fetchPage, importPagePhotos, looksLikeUrl, siteHost } from '../services/blogImport';
import { useAssets } from '../store/assetStore';
import { thumbUrl } from '../ui/imageUrl';
import { repos } from '../storage/repositories';
import { useLibrary } from '../store/libraryStore';
import { allTemplates } from '../store/projectActions';
import { useUi } from '../store/uiStore';
import { docThumbnail } from '../templates/thumbnails';

const SIZES: { id: string; label: string; size?: AutoInput['size'] }[] = [
  { id: 'native', label: 'Each design’s own size' },
  { id: 'pin-standard', label: '2:3 · 1000 × 1500', size: { width: 1000, height: 1500, presetId: 'pin-standard' } },
  { id: 'custom-blog-736', label: '1:2 · 736 × 1472', size: { width: 736, height: 1472, presetId: 'custom-blog-736' } },
  { id: 'pin-full-vertical', label: '9:16 · 1080 × 1920', size: { width: 1080, height: 1920, presetId: 'pin-full-vertical' } },
];

/** How far auto-fit shrank a text layer, measured with the same layout the editor and export use. */
const measureWithCanvas = (l: TextLayer) => Math.min(1, layoutText(l).fontSize / l.fontSize);

/**
 * Where the letters sit on the Pin. Badges count their whole shape. Other text
 * is measured the way Konva draws it: each line on a "middle" baseline at the
 * line's centre, so the real glyph top/bottom come from the canvas text metrics.
 */
let metricsCtx: CanvasRenderingContext2D | null = null;
const inkWithCanvas = (l: TextLayer): Rect => {
  const t = layoutText(l);
  if (l.role === 'badge' && t.bg) return { x: l.x + t.bg.x, y: l.y + t.bg.y, width: t.bg.width, height: t.bg.height };
  metricsCtx ??= document.createElement('canvas').getContext('2d');
  const lh = t.fontSize * l.lineHeight;
  const lines = Math.max(1, Math.round(t.textHeight / lh));
  let above = t.fontSize * 0.5;
  let below = t.fontSize * 0.5;
  if (metricsCtx) {
    metricsCtx.font = `${konvaFontStyle(l)} ${t.fontSize}px ${cssFontFamily(l.fontFamily)}`;
    metricsCtx.textBaseline = 'middle';
    const m = metricsCtx.measureText(t.text);
    above = m.actualBoundingBoxAscent;
    below = m.actualBoundingBoxDescent;
  }
  const ax = l.align === 'left' ? 0 : l.align === 'right' ? 1 : 0.5;
  const sw = l.strokeWidth / 2; // outlines grow the letters on every side
  const top = l.y + t.textY + lh / 2 - above - sw;
  const bottom = l.y + t.textY + (lines - 0.5) * lh + below + sw;
  return { x: l.x + t.innerX + (t.innerW - t.textWidth) * ax - sw, y: top, width: t.textWidth + 2 * sw, height: bottom - top };
};

/** Start a project from finished designs: one Pin per page, opened in the editor. */
async function saveAsProject(docs: PinDocument[], name: string, articleTitle: string, headline: string, templateId: string, assetIds: Id[] = []) {
  if (!(await ensureCanCreateProject())) return;
  const p = createProject(docs[0], name);
  p.pages = docs;
  p.assetIds = assetIds;
  p.meta = { ...p.meta, articleTitle, headline, templateId, brandKitId: useLibrary.getState().activeKit().id };
  try {
    await repos.projects.put(p);
  } catch (e) {
    if (handleLimitError(e)) return;
    throw e;
  }
  location.hash = `#/editor/${p.id}`;
  useUi.getState().toast(docs.length > 1 ? `${docs.length} Pins created — each one is a page in this project` : 'Pin created', 'success');
}

function PhotoChip({ id, off, onToggle }: { id: Id; off: boolean; onToggle: () => void }) {
  const preview = useAssets((s) => s.previews[id]);
  const src = useMemo(() => (preview ? thumbUrl(preview, 120) : ''), [preview]);
  return (
    <button type="button" className="auto-photo" data-off={off} onClick={onToggle} aria-pressed={!off} title={off ? 'Use this photo' : 'Leave this photo out'}>
      {src && <img src={src} alt="" />}
    </button>
  );
}

function ResultCard({ r, checked, onToggle, onEdit, photos }: { r: AutoDesignResult; checked: boolean; onToggle: () => void; onEdit: () => void; photos: ImageMap }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    setSrc('');
    docThumbnail(r.doc, 300, photos).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [r, photos]);
  return (
    <div className="card tpl-card auto-card" data-checked={checked}>
      <div className="tpl-thumb" style={{ aspectRatio: '1 / 1.6' }}>
        {src ? <img src={src} alt={r.template.name} /> : <Loader2 className="subtle" />}
        <div className="tpl-actions">
          <button className="btn btn-dark btn-sm grow" onClick={onEdit}>
            <Pencil size={14} /> Edit this Pin
          </button>
        </div>
      </div>
      <label className="tpl-info row" style={{ cursor: 'pointer' }}>
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <strong className="grow">{r.template.name}</strong>
      </label>
    </div>
  );
}

/** A blog post read from its link: its photos are stored as assets and used in every design. */
interface Source {
  url: string;
  host: string;
  title: string;
  photoIds: Id[];
}

export function AutoDesign({ initialTitle = '' }: { initialTitle?: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [keyword, setKeyword] = useState('');
  const [sizeId, setSizeId] = useState('native');
  const [limit, setLimit] = useState(50);
  const [input, setInput] = useState<AutoInput | null>(null);
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<Source | null>(null);
  const [excluded, setExcluded] = useState<Set<Id>>(new Set());
  const [reading, setReading] = useState('');
  const [error, setError] = useState('');
  const runId = useRef(0);
  const kitWebsite = useLibrary((s) => s.activeKit().website);
  const metas = useAssets((s) => s.metas);
  const previews = useAssets((s) => s.previews);

  const photoIds = useMemo(() => (source ? source.photoIds.filter((id) => !excluded.has(id)) : []), [source, excluded]);
  const photoMap = useMemo<ImageMap>(
    () => Object.fromEntries(photoIds.filter((id) => previews[id] && metas[id]).map((id) => [id, { image: previews[id], width: metas[id].width, height: metas[id].height }])),
    [photoIds, previews, metas],
  );

  const design = (t: string, k: string, src: Source | null, ids: Id[]) => {
    // The post's own site goes in the footer unless the brand kit has a real website.
    const website = kitWebsite && !/yourwebsite/i.test(kitWebsite) ? kitWebsite : src?.host || kitWebsite;
    setLimit(50);
    setInput({ title: t, keyword: k, website, size: SIZES.find((s) => s.id === sizeId)?.size, assetIds: ids, assetMetas: useAssets.getState().metas });
  };

  const generate = async (t = title, k = keyword) => {
    // Only the latest request may update the page (a slow read must not overwrite a newer one).
    const run = ++runId.current;
    setError('');
    if (!t.trim() && !k.trim()) return;
    if (!looksLikeUrl(t)) {
      setSource(null);
      design(t.trim() || k.trim(), k.trim(), null, []);
      return;
    }
    // Blog URL → Pins: read the post, bring in its photos, then design with them.
    setInput(null);
    setReading('Reading the blog post…');
    try {
      const page = await fetchPage(t);
      if (run !== runId.current) return;
      if (!page.title) throw new Error('That page has no title. Type the title instead.');
      setReading(page.images.length ? `Bringing in photos from ${siteHost(page.url)}…` : '');
      const { ids } = page.images.length
        ? await importPagePhotos(page.images, {
            max: 8,
            onProgress: (d, n) => run === runId.current && setReading(`Bringing in photos from ${siteHost(page.url)}… ${d}/${n}`),
          })
        : { ids: [] as Id[] };
      if (run !== runId.current) return;
      const src: Source = { url: page.url, host: siteHost(page.url), title: page.title, photoIds: ids };
      setSource(src);
      setExcluded(new Set());
      design(page.title, k.trim(), src, ids);
    } catch (e) {
      if (run === runId.current) setError((e as Error).message || 'Couldn’t read that page.');
    } finally {
      if (run === runId.current) setReading('');
    }
  };

  // Removing a photo from the post re-designs with the rest.
  const togglePhoto = (id: Id) => {
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExcluded(next);
    if (source) design(source.title, keyword.trim(), source, source.photoIds.filter((x) => !next.has(x)));
  };
  // Arriving with ?q=… (from the home screen) designs straight away.
  // (Once only: React's dev mode runs effects twice, which would import the post's photos twice.)
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !initialTitle.trim()) return;
    started.current = true;
    void generate(initialTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = useMemo(() => (input ? autoDesign(input, allTemplates(), { limit, measure: measureWithCanvas, ink: inkWithCanvas }) : []), [input, limit]);
  useEffect(() => setKeep(new Set(results.map((r) => r.template.id))), [results]);
  const text = input ? autoText(input.title, input.keyword) : null;
  const chosen = results.filter((r) => keep.has(r.template.id));

  const create = async (list: AutoDesignResult[]) => {
    if (!list.length || !input || !text) return;
    setBusy(true);
    try {
      await saveAsProject(list.map((r) => r.doc), text.headline, input.title, text.headline, list[0].template.id, photoIds);
    } catch (e) {
      useUi.getState().toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dash-main">
      <section className="card home-hero">
        <div className="stack-sm">
          <h1 className="dash-h1">
            <Wand2 size={26} style={{ verticalAlign: '-4px' }} /> Auto Design
          </h1>
          <p className="muted">
            Paste a blog post link — or type your article title or primary keyword — and press Enter. PinCraft designs the Pins with the post’s own photos and fits the
            text for you.
          </p>
        </div>
        <form
          className="stack-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
        >
          <div className="search-box auto-input">
            {looksLikeUrl(title) ? <Link2 size={20} /> : <Sparkles size={20} />}
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Paste a blog post link, or type a title — e.g. 50 Lob Haircut Ideas, or just “lob haircut”"
              aria-label="Blog post link, article title or primary keyword"
            />
            <button className="btn btn-pink" type="submit" disabled={(!title.trim() && !keyword.trim()) || !!reading}>
              {reading ? <Loader2 size={15} /> : null} Design Pins
            </button>
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
            <input className="input" style={{ width: 260 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Primary keyword (optional)" aria-label="Primary keyword" />
            <select className="select" style={{ width: 230 }} value={sizeId} onChange={(e) => setSizeId(e.target.value)} aria-label="Pin size">
              {SIZES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </form>
        {reading && (
          <div className="row subtle" role="status">
            <Loader2 size={16} /> {reading}
          </div>
        )}
        {error && (
          <div className="issue" role="alert">
            {error}
          </div>
        )}
        {source && (
          <div className="stack-sm">
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <span className="chip">
                <Link2 size={13} /> From {source.host}
              </span>
              <span className="subtle">
                {source.photoIds.length
                  ? `${photoIds.length} of ${source.photoIds.length} photos used — click a photo to leave it out.`
                  : 'No usable photos on that page — the designs show sample photos; add yours in the editor.'}
              </span>
            </div>
            {!!source.photoIds.length && (
              <div className="auto-photos">
                {source.photoIds.map((id) => (
                  <PhotoChip key={id} id={id} off={excluded.has(id)} onToggle={() => togglePhoto(id)} />
                ))}
              </div>
            )}
          </div>
        )}
        {text && (
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <span className="chip">Headline: {text.headline}</span>
            {text.subtitle && <span className="chip">Subtitle: {text.subtitle}</span>}
            <span className="subtle">Click “Edit this Pin” to change anything — text keeps fitting as you type.</span>
          </div>
        )}
      </section>

      {input && !results.length && <div className="issue">Nothing to design yet — type a title or keyword.</div>}
      {!!results.length && (
        <section className="stack">
          <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
            <h2 className="dash-h2">
              {results.length} designs for “{text?.headline}”
            </h2>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" onClick={() => setKeep(keep.size === results.length ? new Set() : new Set(results.map((r) => r.template.id)))}>
                {keep.size === results.length ? 'Select none' : 'Select all'}
              </button>
              <button className="btn btn-pink" disabled={!chosen.length || busy} onClick={() => create(chosen)}>
                <Check size={15} /> Create {chosen.length} Pin{chosen.length === 1 ? '' : 's'}
              </button>
            </div>
          </div>
          <div className="tpl-grid">
            {results.map((r) => (
              <ResultCard
                key={r.template.id}
                r={r}
                checked={keep.has(r.template.id)}
                onToggle={() =>
                  setKeep((s) => {
                    const n = new Set(s);
                    if (n.has(r.template.id)) n.delete(r.template.id);
                    else n.add(r.template.id);
                    return n;
                  })
                }
                onEdit={() => create([r])}
                photos={photoMap}
              />
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => setLimit((l) => l + 25)} disabled={results.length < limit}>
              Show more designs
            </button>
          </div>
          <p className="subtle">
            {source?.photoIds.length
              ? 'All selected Pins go into one project as pages, with the post’s photos already in place.'
              : 'All selected Pins go into one project as pages — add your photos there and every frame fills automatically.'}
          </p>
        </section>
      )}
    </div>
  );
}
