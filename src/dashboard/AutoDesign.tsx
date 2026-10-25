import { Check, Loader2, Pencil, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { layoutText } from '../editor/canvas/textLayout';
import { createProject } from '../model/factory';
import type { PinDocument, TextLayer } from '../model/types';
import { ensureCanCreateProject, handleLimitError } from '../saas/gates';
import { autoDesign, autoText, type AutoDesignResult, type AutoInput } from '../services/autoDesign';
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

/** Start a project from finished designs: one Pin per page, opened in the editor. */
async function saveAsProject(docs: PinDocument[], name: string, articleTitle: string, headline: string, templateId: string) {
  if (!(await ensureCanCreateProject())) return;
  const p = createProject(docs[0], name);
  p.pages = docs;
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

function ResultCard({ r, checked, onToggle, onEdit }: { r: AutoDesignResult; checked: boolean; onToggle: () => void; onEdit: () => void }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    setSrc('');
    docThumbnail(r.doc, 300).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [r]);
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

export function AutoDesign({ initialTitle = '' }: { initialTitle?: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [keyword, setKeyword] = useState('');
  const [sizeId, setSizeId] = useState('native');
  const [limit, setLimit] = useState(12);
  const [input, setInput] = useState<AutoInput | null>(null);
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const website = useLibrary((s) => s.activeKit().website);

  const generate = (t = title, k = keyword) => {
    if (!t.trim() && !k.trim()) return;
    setLimit(12);
    setInput({ title: t.trim() || k.trim(), keyword: k.trim(), website, size: SIZES.find((s) => s.id === sizeId)?.size });
  };
  // Arriving with ?q=… (from the home screen) designs straight away.
  useEffect(() => {
    if (initialTitle.trim()) generate(initialTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = useMemo(() => (input ? autoDesign(input, allTemplates(), { limit, measure: measureWithCanvas }) : []), [input, limit]);
  useEffect(() => setKeep(new Set(results.map((r) => r.template.id))), [results]);
  const text = input ? autoText(input.title, input.keyword) : null;
  const chosen = results.filter((r) => keep.has(r.template.id));

  const create = async (list: AutoDesignResult[]) => {
    if (!list.length || !input || !text) return;
    setBusy(true);
    try {
      await saveAsProject(list.map((r) => r.doc), text.headline, input.title, text.headline, list[0].template.id);
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
          <p className="muted">Type your article title or primary keyword and press Enter — PinCraft designs the Pins and fits the text for you.</p>
        </div>
        <form
          className="stack-sm"
          onSubmit={(e) => {
            e.preventDefault();
            generate();
          }}
        >
          <div className="search-box auto-input">
            <Sparkles size={20} />
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 50 Lob Haircut Ideas to Take to Your Next Salon Appointment — or just “lob haircut”"
              aria-label="Article title or primary keyword"
            />
            <button className="btn btn-pink" type="submit" disabled={!title.trim() && !keyword.trim()}>
              Design Pins
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
              />
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn" onClick={() => setLimit((l) => l + 12)} disabled={results.length < limit}>
              Show more designs
            </button>
          </div>
          <p className="subtle">All selected Pins go into one project as pages — add your photos there and every frame fills automatically.</p>
        </section>
      )}
    </div>
  );
}
