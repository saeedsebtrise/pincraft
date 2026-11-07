/**
 * Bulk Design: paste any number of blog post links. For each post PinCraft
 * reads the title, picks the post's best photos and designs N Pins with them;
 * "Create" saves one project per post (its Pins are the pages).
 *
 * AI Designer options: the brand palette and fonts (optionally applied to every
 * design), the template strategy (Smart Dynamic Mix or rotating through the
 * user's own Studio templates) and a daily publishing pace for the schedule.
 */
import { AlertCircle, CalendarClock, Check, ExternalLink, Layers, Loader2, Palette } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ImageMap } from '../editor/canvas/nodes';
import { requirePro } from '../saas/gates';
import { requestAiDesigns, specToTemplate } from '../services/aiDesign';
import { autoDesign, autoText, type AutoDesignResult } from '../services/autoDesign';
import { applyBrand } from '../model/docOps';
import type { BrandKit, PinDocument, ProjectMeta, Template } from '../model/types';
import { fontOptions } from '../editor/panels/MiscPanels';
import { schedulePins } from '../services/csvImport';
import { fillVariables } from '../services/studioVars';
import { BRAND_PALETTES } from './StudioPages';
import { fetchPage, importPagePhotos, siteHost, type ImportedPhoto } from '../services/blogImport';
import { parseLinks, pickForPost } from '../services/bulkDesign';
import { useAssets } from '../store/assetStore';
import { useLibrary } from '../store/libraryStore';
import { allTemplates } from '../store/projectActions';
import { currentTaste } from '../store/favorites';
import { useUi } from '../store/uiStore';
import { docThumbnail } from '../templates/thumbnails';
import { inkWithCanvas, measureWithCanvas, saveAsProject, SIZES } from './autoShared';

const PINS_PER_POST = [1, 3, 5, 10, 15];
const MAX_POSTS = 200;
const PHOTOS_PER_POST = 6;

type Status = 'waiting' | 'reading' | 'photos' | 'designing' | 'done' | 'error';

interface Post {
  url: string;
  status: Status;
  message?: string;
  title?: string;
  description?: string;
  host?: string;
  photos?: ImportedPhoto[];
  results?: AutoDesignResult[];
  keep?: Set<string>;
  projectId?: string;
  /** e.g. why AI designs were skipped for this post. */
  note?: string;
}

function PinThumb({ r, photos, checked, onToggle }: { r: AutoDesignResult; photos: ImageMap; checked: boolean; onToggle: () => void }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    docThumbnail(r.doc, 240, photos).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [r, photos]);
  return (
    <label className="bulk-pin" data-checked={checked} title={r.template.name}>
      <span className="bulk-pin-img">{src ? <img src={src} alt={r.template.name} /> : <Loader2 className="subtle" />}</span>
      <input type="checkbox" checked={checked} onChange={onToggle} aria-label={`Keep ${r.template.name}`} />
    </label>
  );
}

const STATUS_TEXT: Record<Status, string> = {
  waiting: 'Waiting…',
  reading: 'Reading the post…',
  photos: 'Picking the best photos…',
  designing: 'Designing Pins…',
  done: '',
  error: '',
};

export function BulkDesign() {
  const [text, setText] = useState('');
  const [perPost, setPerPost] = useState(5);
  const [sizeId, setSizeId] = useState('native');
  const [cta, setCta] = useState(true);
  const [ai, setAi] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const runId = useRef(0);
  const lib = useLibrary();
  const kit = lib.activeKit();
  const kitWebsite = kit.website;
  const [brandDraft, setBrandDraft] = useState<BrandKit>(kit);
  useEffect(() => setBrandDraft(kit), [kit]);
  const [useBrand, setUseBrand] = useState(false);
  const [strategy, setStrategy] = useState<'mix' | 'studio'>('mix');
  const [paceFrom, setPaceFrom] = useState(2);
  const [paceTo, setPaceTo] = useState(50);
  const studioTemplates = lib.userTemplates;
  const links = useMemo(() => parseLinks(text), [text]);

  const update = (i: number, patch: Partial<Post>) => setPosts((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const start = async () => {
    const list = links.slice(0, MAX_POSTS);
    if (!list.length || (ai && !requirePro('aiDesign'))) return;
    const run = ++runId.current;
    setPosts(list.map((url) => ({ url, status: 'waiting' })));
    setRunning(true);
    const size = SIZES.find((s) => s.id === sizeId)?.size;
    let next = 0;
    const one = async (i: number) => {
      const url = list[i];
      try {
        update(i, { status: 'reading' });
        const page = await fetchPage(url);
        if (run !== runId.current) return;
        if (!page.title) throw new Error('No title on this page.');
        const host = siteHost(page.url);
        update(i, { status: 'photos', title: page.title, description: page.description, host });
        const { photos } = page.images.length ? await importPagePhotos(page.images, { max: PHOTOS_PER_POST }) : { photos: [] as ImportedPhoto[] };
        // Light previews are kept per post; the full ones come back when a project opens.
        useAssets.getState().dropPreviews(photos.map((p) => p.id));
        if (run !== runId.current) return;
        update(i, { status: 'designing', photos });
        await new Promise((r) => setTimeout(r)); // let the status paint before the heavier work
        const website = kitWebsite && !/yourwebsite/i.test(kitWebsite) ? kitWebsite : host;
        const ranked = autoDesign(
          { title: page.title, website, size, assetIds: photos.map((p) => p.id), assetMetas: useAssets.getState().metas, cta, ctaOffset: i * perPost },
          strategy === 'studio' && studioTemplates.length ? studioTemplates : allTemplates(),
          { limit: Math.max(perPost * 2, perPost + 4), measure: measureWithCanvas, ink: inkWithCanvas, taste: currentTaste() },
        ).map((r) => ({ ...r, doc: fillVariables(r.doc, { title: page.title, description: page.description, website }) }));
        // Optional: brand-new AI designs first (up to 4 per post), then the best template designs.
        let aiMade: AutoDesignResult[] = [];
        let note: string | undefined;
        if (ai) {
          const W = size?.width ?? 1000;
          const H = size?.height ?? 1500;
          try {
            const words = autoText(page.title);
            const specs = await requestAiDesigns({
              headline: words.headline,
              subtitle: words.subtitle,
              topic: page.title,
              width: W,
              height: H,
              count: Math.min(4, perPost),
              photos: photos.map((p) => p.preview),
            });
            const templates = specs.map((sp) => specToTemplate(sp, W, H)).filter((t): t is Template => !!t);
            aiMade = autoDesign(
              { title: page.title, website, size: { width: W, height: H, presetId: size?.presetId ?? 'pin-standard' }, assetIds: photos.map((p) => p.id), assetMetas: useAssets.getState().metas, cta, ctaOffset: i },
              templates,
              { limit: templates.length, measure: measureWithCanvas, ink: inkWithCanvas },
            );
          } catch (e) {
            note = `AI designs skipped: ${(e as Error).message}`;
          }
          if (run !== runId.current) return;
        }
        const results = [...aiMade, ...pickForPost(ranked, Math.max(0, perPost - aiMade.length), i)];
        update(i, { status: 'done', results, note, keep: new Set(results.map((r) => r.template.id)) });
      } catch (e) {
        if (run === runId.current) update(i, { status: 'error', message: (e as Error).message || 'Couldn’t read this post.' });
      }
    };
    // Two posts at a time: quick, without hammering anyone's site.
    const worker = async () => {
      while (next < list.length && run === runId.current) await one(next++);
    };
    await Promise.all([worker(), worker()]);
    if (run === runId.current) setRunning(false);
  };

  const ready = posts.filter((p) => p.status === 'done' && p.results?.length && p.keep?.size && !p.projectId);
  const pinCount = ready.reduce((n, p) => n + (p.keep?.size ?? 0), 0);

  /** Brand colors and fonts on a design, keeping the Pin's own website. */
  const branded = (doc: PinDocument, website: string) => (useBrand ? applyBrand(doc, { ...brandDraft, website }) : doc);

  const create = async (indexes: number[], open: boolean) => {
    setSaving(true);
    // One publishing plan across the whole batch, at the chosen daily pace.
    const counts = indexes.map((i) => (posts[i].projectId ? 0 : (posts[i].results ?? []).filter((r) => posts[i].keep?.has(r.template.id)).length));
    const times = schedulePins(Array.from({ length: counts.reduce((a, b) => a + b, 0) }, () => ({ fixedAt: null })), { minPerDay: paceFrom, maxPerDay: paceTo, startHour: 8, endHour: 20 });
    let slot = 0;
    let made = 0;
    let lastId = '';
    try {
      for (const i of indexes) {
        const p = posts[i];
        const chosen = (p.results ?? []).filter((r) => p.keep?.has(r.template.id));
        if (!chosen.length || p.projectId) continue;
        const headline = autoText(p.title ?? '').headline || p.title || 'Pins';
        const site = siteHost(p.url);
        const publish: NonNullable<ProjectMeta['publish']> = chosen.map(() => ({ board: '', link: p.url, description: p.description ?? '', publishAt: times[slot++] ?? null }));
        const project = await saveAsProject(
          chosen.map((r) => branded(r.doc, kitWebsite && !/yourwebsite/i.test(kitWebsite) ? kitWebsite : site)),
          { name: headline, articleTitle: p.title ?? '', articleUrl: p.url, headline, templateId: chosen[0].template.id, assetIds: (p.photos ?? []).map((x) => x.id) },
        );
        if (!project) break; // plan limit reached — the upgrade prompt is showing
        project.meta.publish = publish;
        const { repos } = await import('../storage/repositories');
        await repos.projects.put(project);
        update(i, { projectId: project.id });
        lastId = project.id;
        made++;
      }
    } catch (e) {
      useUi.getState().toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
    if (!made) return;
    if (open && lastId) location.hash = `#/editor/${lastId}`;
    else useUi.getState().toast(`Created ${made} project${made === 1 ? '' : 's'} — one per post, in Projects`, 'success');
  };

  const toggle = (i: number, id: string) =>
    setPosts((list) =>
      list.map((p, j) => {
        if (j !== i) return p;
        const keep = new Set(p.keep);
        if (keep.has(id)) keep.delete(id);
        else keep.add(id);
        return { ...p, keep };
      }),
    );

  const done = posts.filter((p) => p.status === 'done').length;
  const failed = posts.filter((p) => p.status === 'error').length;

  return (
    <>
      <form
        className="stack-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void start();
        }}
      >
        <textarea
          className="textarea bulk-links"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Paste your blog post links — one per line (3, 5, 10, 15… as many as you like)\nhttps://yourblog.com/lob-haircut-ideas\nhttps://yourblog.com/fall-porch-decor'}
          aria-label="Blog post links, one per line"
          rows={5}
        />
        <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
          <label className="row subtle" style={{ gap: 6 }}>
            Pins per post
            <select className="select" style={{ width: 90 }} value={perPost} onChange={(e) => setPerPost(Number(e.target.value))} aria-label="Pins per post">
              {PINS_PER_POST.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <select className="select" style={{ width: 230 }} value={sizeId} onChange={(e) => setSizeId(e.target.value)} aria-label="Pin size">
            {SIZES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <label className="row subtle" style={{ gap: 6 }}>
            <input type="checkbox" checked={cta} onChange={(e) => setCta(e.target.checked)} disabled={running} />
            Add a call to action (different on each Pin)
          </label>
          <label className="row subtle" style={{ gap: 6 }}>
            <input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked && requirePro('aiDesign'))} disabled={running} />
            Include original AI designs (up to 4 per post)
          </label>
          <span className="subtle grow">
            {links.length
              ? `${Math.min(links.length, MAX_POSTS)} post${links.length === 1 ? '' : 's'} × ${perPost} = ${Math.min(links.length, MAX_POSTS) * perPost} Pins${links.length > MAX_POSTS ? ` (first ${MAX_POSTS} links)` : ''}`
              : 'No links yet'}
          </span>
          <button className="btn btn-pink" type="submit" disabled={!links.length || running}>
            {running ? <Loader2 size={15} /> : <Layers size={15} />} Design Pins for all posts
          </button>
        </div>
      </form>

      <details className="card ai-opts">
        <summary>
          <Palette size={15} /> Brand &amp; fonts
          <span className="palette-dots" style={{ marginLeft: 'auto' }}>
            <i style={{ background: brandDraft.accent }} />
            <i style={{ background: brandDraft.primary }} />
          </span>
        </summary>
        <div className="stack">
          <div className="palette-chips">
            {BRAND_PALETTES.map((p) => {
              const on = brandDraft.accent.toUpperCase() === p.accent && brandDraft.primary.toUpperCase() === p.primary;
              return (
                <button key={p.name} type="button" className={`palette-chip ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => setBrandDraft({ ...brandDraft, primary: p.primary, secondary: p.secondary, accent: p.accent })}>
                  <span className="palette-dots">
                    <i style={{ background: p.primary }} />
                    <i style={{ background: p.accent }} />
                  </span>
                  {p.name}
                </button>
              );
            })}
          </div>
          <div className="grid-2">
            <label className="field">
              <span className="field-label">Headline font</span>
              <select className="select" value={brandDraft.headingFont} onChange={(e) => setBrandDraft({ ...brandDraft, headingFont: e.target.value })}>
                {fontOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Body font</span>
              <select className="select" value={brandDraft.bodyFont} onChange={(e) => setBrandDraft({ ...brandDraft, bodyFont: e.target.value })}>
                {fontOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <label className="row subtle" style={{ gap: 6 }}>
              <input type="checkbox" checked={useBrand} onChange={(e) => setUseBrand(e.target.checked)} />
              Use these colors &amp; fonts on the Pins (off: each design keeps its original look)
            </label>
            <button
              type="button"
              className="btn btn-sm"
              disabled={JSON.stringify(brandDraft) === JSON.stringify(kit)}
              onClick={async () => {
                await lib.saveBrandKit(brandDraft);
                useUi.getState().toast('Brand saved', 'success');
              }}
            >
              Save brand
            </button>
          </div>
        </div>
      </details>

      <details className="card ai-opts" open>
        <summary>
          <Layers size={15} /> Template strategy
        </summary>
        <div className="csv-modes">
          <button type="button" className={`csv-mode ${strategy === 'mix' ? 'is-on' : ''}`} aria-pressed={strategy === 'mix'} onClick={() => setStrategy('mix')}>
            <span className="stack-sm" style={{ gap: 2 }}>
              <strong>Smart Dynamic Mix</strong>
              <span className="subtle">Matches PinCraft templates to each post and avoids repeating layouts.</span>
            </span>
          </button>
          <button type="button" className={`csv-mode ${strategy === 'studio' ? 'is-on' : ''}`} aria-pressed={strategy === 'studio'} disabled={!studioTemplates.length} onClick={() => setStrategy('studio')}>
            <span className="stack-sm" style={{ gap: 2 }}>
              <strong>Studio Smart Rotation</strong>
              <span className="subtle">
                {studioTemplates.length ? `Rotates through your ${studioTemplates.length} saved Studio template${studioTemplates.length === 1 ? '' : 's'}.` : 'Save a template in the Design Studio to enable this.'}
              </span>
            </span>
          </button>
        </div>
      </details>

      <details className="card ai-opts">
        <summary>
          <CalendarClock size={15} /> Daily publishing pace · {paceFrom}–{paceTo} Pins / day
        </summary>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <span className="subtle grow">
            A publishing target for this batch across all its posts. Each Pin gets a planned time (8:00–20:00, from tomorrow) saved with its project, ready for scheduling.
          </span>
          <label className="field" style={{ width: 90 }}>
            <span className="field-label">From</span>
            <input className="input" type="number" min={1} max={50} value={paceFrom} onChange={(e) => setPaceFrom(Math.min(paceTo, Math.max(1, +e.target.value || 1)))} />
          </label>
          <label className="field" style={{ width: 90 }}>
            <span className="field-label">To</span>
            <input className="input" type="number" min={1} max={50} value={paceTo} onChange={(e) => setPaceTo(Math.max(paceFrom, Math.min(50, +e.target.value || 1)))} />
          </label>
          <span className="subtle">Pins / day</span>
        </div>
      </details>

      {!!posts.length && (
        <section className="stack">
          <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
            <h2 className="dash-h2">
              {running ? `Designing… ${done + failed} of ${posts.length} posts` : `${done} of ${posts.length} posts ready`}
              {failed ? ` · ${failed} couldn’t be read` : ''}
            </h2>
            <button className="btn btn-pink" disabled={!ready.length || saving} onClick={() => create(posts.map((_, i) => i), false)}>
              <Check size={15} /> Create {pinCount} Pins ({ready.length} project{ready.length === 1 ? '' : 's'})
            </button>
          </div>
          {posts.map((p, i) => {
            const photos: ImageMap = Object.fromEntries((p.photos ?? []).map((x) => [x.id, x.preview]));
            return (
              <div key={p.url} className="card bulk-post">
                <div className="row-between" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }} className="grow">
                    <strong className="ellipsis" style={{ display: 'block' }}>
                      {p.title || p.url}
                    </strong>
                    <span className="subtle">
                      {p.host || siteHost(p.url)}
                      {p.photos ? ` · ${p.photos.length} best photo${p.photos.length === 1 ? '' : 's'}` : ''}
                      {p.status === 'done' && p.photos && !p.photos.length ? ' · no usable photos — sample photos shown' : ''}
                    </span>
                  </div>
                  {p.status === 'error' ? (
                    <span className="issue row" style={{ gap: 6 }}>
                      <AlertCircle size={15} /> {p.message}
                    </span>
                  ) : p.status !== 'done' ? (
                    <span className="row subtle" style={{ gap: 6 }}>
                      <Loader2 size={15} /> {STATUS_TEXT[p.status]}
                    </span>
                  ) : p.projectId ? (
                    <a className="btn" href={`#/editor/${p.projectId}`}>
                      <ExternalLink size={14} /> Open project
                    </a>
                  ) : (
                    <button className="btn" disabled={!p.keep?.size || saving} onClick={() => create([i], true)}>
                      <ExternalLink size={14} /> Create & open
                    </button>
                  )}
                </div>
                {p.note && <span className="subtle">{p.note}</span>}
                {!!p.photos?.length && (
                  <div className="bulk-photos" aria-label="Photos picked from the post">
                    {p.photos.map((x) => (
                      <PhotoPreview key={x.id} photo={x} />
                    ))}
                  </div>
                )}
                {!!p.results?.length && (
                  <div className="bulk-pins">
                    {p.results.map((r) => (
                      <PinThumb key={r.template.id} r={r} photos={photos} checked={!!p.keep?.has(r.template.id)} onToggle={() => toggle(i, r.template.id)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}

function PhotoPreview({ photo }: { photo: ImportedPhoto }) {
  const src = useMemo(() => {
    const img = photo.preview.image as HTMLCanvasElement;
    return 'toDataURL' in img ? img.toDataURL('image/jpeg', 0.7) : '';
  }, [photo]);
  return <img className="bulk-photo" src={src} alt="" title={`Photo score ${Math.round(photo.score * 100)}/100`} />;
}

