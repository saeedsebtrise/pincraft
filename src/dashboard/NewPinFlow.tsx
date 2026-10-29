import { ArrowLeft, ArrowRight, Columns, FileText, Grid, Image as ImageIcon, ImagePlus, Layout, Link2, Loader2, Save, Sparkles, Square, Type, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { assignImages } from '../model/docOps';
import type { Id } from '../model/types';
import { autoText, headlineFor } from '../services/autoDesign';
import { fetchPage, importPagePhotos, looksLikeUrl, normalizeUrl, siteHost } from '../services/blogImport';
import { useAssets } from '../store/assetStore';
import { saveProject } from '../store/projectActions';
import { thumbUrl } from '../ui/imageUrl';
import { CANVAS_LIMITS, CANVAS_PRESET_CONFIG, DEFAULT_PRESET_ID, PRESET_VERIFIED_ON, STATUS_LABEL, type CanvasPreset } from '../config/canvasPresets';
import { DESIGN_TYPES, type DesignType } from '../config/designTypes';
import { CUSTOM_PIN_LAYOUTS, type CustomPinLayoutId } from '../model/customPinLayouts';
import type { Template } from '../model/types';
import { suggestHeadlines } from '../services/headlines';
import { recommendTemplates } from '../services/recommend';
import { useLibrary } from '../store/libraryStore';
import { allTemplates, createPin, findTemplate } from '../store/projectActions';
import { useUi } from '../store/uiStore';
import { BLANK_TEMPLATE_ID } from '../templates/builtins';
import { Field } from '../ui/controls';
import { ensureCanCreateProject } from '../saas/gates';
import { TemplateCard, TemplateGallery } from './TemplateGallery';
import { TypeCard } from './TypeCard';

const chipClass = (p: CanvasPreset) => (p.status === 'official-recommended' ? 'chip chip-rec' : p.status === 'official-supported' ? 'chip chip-sup' : 'chip chip-custom');

export function PresetPicker({ value, onChange }: { value: CanvasPreset; onChange: (p: CanvasPreset) => void }) {
  const lib = useLibrary();
  const [w, setW] = useState(value.width);
  const [h, setH] = useState(value.height);
  const [name, setName] = useState('');
  const presets = [...CANVAS_PRESET_CONFIG, ...lib.customPresets];
  const valid = w >= CANVAS_LIMITS.min && h >= CANVAS_LIMITS.min && w <= CANVAS_LIMITS.max && h <= CANVAS_LIMITS.max;
  return (
    <div className="stack">
      <div className="preset-grid" role="radiogroup" aria-label="Pin size">
        {presets.map((p) => {
          const k = 60 / Math.max(p.width, p.height);
          return (
            <button key={p.id} type="button" role="radio" aria-checked={value.id === p.id} aria-pressed={value.id === p.id} className="preset-card" onClick={() => onChange(p)} title={p.description}>
              <div className="preset-shape">
                <span style={{ width: p.width * k, height: p.height * k }} />
              </div>
              <strong style={{ fontSize: 13 }}>{p.name}</strong>
              <span className="subtle">
                {p.width} × {p.height} · {p.aspectRatio}
              </span>
              <span className={chipClass(p)}>{STATUS_LABEL[p.status]}</span>
            </button>
          );
        })}
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div className="stack-sm">
          <strong>Custom size</strong>
          <div className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="Width (px)">
              <input className="input" type="number" min={CANVAS_LIMITS.min} max={CANVAS_LIMITS.max} value={w} onChange={(e) => setW(Number(e.target.value))} style={{ width: 110 }} />
            </Field>
            <Field label="Height (px)">
              <input className="input" type="number" min={CANVAS_LIMITS.min} max={CANVAS_LIMITS.max} value={h} onChange={(e) => setH(Number(e.target.value))} style={{ width: 110 }} />
            </Field>
            <Field label="Preset name (optional)">
              <input className="input" value={name} placeholder={`Custom ${w}×${h}`} onChange={(e) => setName(e.target.value)} style={{ width: 180 }} />
            </Field>
            <button
              className="btn"
              disabled={!valid}
              onClick={() => onChange({ id: 'custom', name: `Custom ${w}×${h}`, width: Math.round(w), height: Math.round(h), aspectRatio: '', category: 'user', status: 'custom', recommended: false, description: '' })}
            >
              Use this size
            </button>
            <button className="btn" disabled={!valid} onClick={() => onChange(lib.addCustomPreset(name, Math.round(w), Math.round(h)))}>
              <Save size={14} /> Save as preset
            </button>
          </div>
          {!valid && <span className="subtle">Sizes must be between {CANVAS_LIMITS.min} and {CANVAS_LIMITS.max}px.</span>}
        </div>
      </div>
      <span className="subtle">
        Official labels follow Pinterest's help center (checked {PRESET_VERIFIED_ON}). Specs can change — 2:3 is the safest choice for the feed.
      </span>
    </div>
  );
}

export function NewPinFlow({ initialTemplateId, initialType }: { initialTemplateId?: string; initialType?: DesignType }) {
  const preTemplate = findTemplate(initialTemplateId);
  const [step, setStep] = useState(preTemplate ? 2 : initialType ? 2 : 1);
  const [type, setType] = useState<DesignType | null>(initialType ?? null);
  const [selectedLayout, setSelectedLayout] = useState<CustomPinLayoutId>(() => {
    if (initialType === 'single-image') return 'single-image';
    if (initialType === 'image-text-overlay') return 'image-text-overlay';
    if (initialType === 'image-text-panel') return 'image-text-panel';
    if (initialType === 'split' || initialType === 'two-image') return 'two-image';
    if (initialType === 'collage-4' || initialType === 'collage-5') return 'collage-4';
    if (initialType === 'quote-advice') return 'quote-advice';
    return 'single-image';
  });
  const [preset, setPreset] = useState<CanvasPreset>(() => {
    const native = preTemplate && CANVAS_PRESET_CONFIG.find((p) => p.width === preTemplate.doc.width && p.height === preTemplate.doc.height);
    return native ?? CANVAS_PRESET_CONFIG.find((p) => p.id === DEFAULT_PRESET_ID)!;
  });
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<Template | undefined>(preTemplate);
  const [busy, setBusy] = useState(false);
  // Photos for the new Pin: read from the blog post link, or uploaded by the user.
  const [photoIds, setPhotoIds] = useState<Id[]>([]);
  const [post, setPost] = useState<{ url: string; host: string; title: string } | null>(null);
  const [reading, setReading] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const isLink = looksLikeUrl(title);
  /** The article title to design with: the post's own title once its link was read. */
  const articleTitle = (post && normalizeUrl(title) === post.url ? post.title : isLink ? '' : title).trim();

  const recs = useMemo(() => recommendTemplates(articleTitle, allTemplates(), { presetId: preset.id, limit: 4 }), [articleTitle, preset.id]);

  /** Reads the blog post: its title goes on the Pin and its best photos fill the frames. */
  const readPost = async (): Promise<{ title: string; ids: Id[]; host: string } | null> => {
    setReading('Reading the post…');
    try {
      const page = await fetchPage(title);
      const host = siteHost(page.url);
      const want = Math.max(4, template?.imageCount ?? 4);
      const { ids } = await importPagePhotos(page.images, {
        max: Math.min(10, want + 2),
        onProgress: (done, total) => setReading(`Picking the best photos… ${done}/${total}`),
      });
      setPost({ url: normalizeUrl(title), host, title: page.title });
      setPhotoIds(ids);
      if (!ids.length) useUi.getState().toast('No usable photos found in that post — add your own below.', 'info');
      return { title: page.title, ids, host };
    } catch (e) {
      useUi.getState().toast((e as Error).message, 'error');
      return null;
    } finally {
      setReading('');
    }
  };

  const upload = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    setReading('Adding your photos…');
    const { ids, errors } = await useAssets.getState().importFiles(images);
    errors.forEach((e) => useUi.getState().toast(e, 'error'));
    setPhotoIds((cur) => [...cur, ...ids]);
    setReading('');
  };

  const create = async (t: Template | undefined, layout?: CustomPinLayoutId) => {
    if (!(await ensureCanCreateProject())) return;
    setBusy(true);
    try {
      // A link that hasn't been read yet: read it now so the Pin gets the post's title and photos.
      let titleText = articleTitle;
      let ids = photoIds;
      let host = post?.host ?? '';
      if (isLink && !titleText) {
        const read = await readPost();
        if (read) ({ title: titleText, ids, host } = { ...read, ids: [...read.ids, ...photoIds.filter((id) => !read.ids.includes(id))] });
      }
      const text = titleText ? autoText(titleText) : null;
      const customLayout = layout ?? (type === 'blank' ? selectedLayout : undefined);
      let p = await createPin({
        width: preset.width,
        height: preset.height,
        presetId: preset.id,
        templateId: customLayout ? null : (t?.id ?? BLANK_TEMPLATE_ID),
        customLayout,
        articleTitle: titleText,
        // The whole title goes on the Pin: split over headline + subtitle when the design has a subtitle line, all in the headline otherwise.
        headline: text ? (t && !customLayout ? headlineFor(t, titleText, text) : titleText) : titleText ? suggestHeadlines({ articleTitle: titleText })[0] : undefined,
        subtitle: text?.subtitle || undefined,
      });
      if (ids.length || host) {
        const metas = useAssets.getState().metas;
        let doc = ids.length ? assignImages(p.doc, ids, metas, { smart: true, allowDuplicates: true }) : p.doc;
        // The post's own site in the footer, unless the brand kit already has a website.
        const brandSite = useLibrary.getState().activeKit().website;
        if (host && (!brandSite || brandSite === 'yourwebsite.com')) {
          doc = { ...doc, layers: doc.layers.map((l) => (l.type === 'text' && l.role === 'website' ? { ...l, text: host } : l)) };
        }
        p = await saveProject({ ...p, doc, pages: [doc], activePage: 0, assetIds: [...new Set([...p.assetIds, ...ids])] });
      }
      useUi.getState().set({ leftTab: ids.length ? 'uploads' : (customLayout && customLayout !== 'blank' && customLayout !== 'quote-advice') || (t && t.imageCount > 0) ? 'uploads' : 'text' });
      location.hash = `#/editor/${p.id}`;
    } catch (e) {
      useUi.getState().toast(`Couldn't create the Pin: ${(e as Error).message}`, 'error');
      setBusy(false);
    }
  };

  const next = () => {
    // A template picked on the Templates page is used as is; only the blank flow uses a custom layout.
    if (step === 2 && type === 'blank') return create(undefined, selectedLayout);
    if (step === 2 && preTemplate) return create(preTemplate);
    setStep((s) => s + 1);
  };

  return (
    <div className="dash-main">
      <div className="row-between" style={{ flexWrap: 'wrap' }}>
        <div className="stack-sm">
          <span className="subtle">Step {step} of {type === 'blank' || preTemplate ? 2 : 3}</span>
          <h1 style={{ fontSize: 24 }}>{step === 1 ? 'Choose a design type' : step === 2 ? (type === 'blank' ? 'Custom Pin — Choose Layout & Size' : 'Choose your Pin size') : 'Pick a template'}</h1>
        </div>
        <div className="row">
          {step > 1 && (
            <button className="btn" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft size={15} /> Back
            </button>
          )}
          {step < 3 && (
            <button className="btn btn-dark" disabled={(step === 1 && !type) || busy} onClick={next}>
              {busy ? <Loader2 size={15} /> : null}
              {step === 2 && (type === 'blank' || preTemplate) ? 'Create Pin' : 'Next'} <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="card stack-sm" style={{ padding: 18 }}>
        <Field label="Blog post link or article title — the title goes on your Pin, the post's photos fill the frames">
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input grow"
              value={title}
              placeholder="Paste a blog post link, or type a title — e.g. 50 Lob Haircut Ideas to Take to Your Next Salon Appointment"
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && isLink && !reading && void readPost()}
            />
            {isLink && (
              <button className="btn btn-dark" disabled={!!reading} onClick={() => void readPost()}>
                {reading ? <Loader2 size={15} /> : <Link2 size={15} />} Read post
              </button>
            )}
            <button className="btn" disabled={!!reading} onClick={() => fileRef.current?.click()}>
              <ImagePlus size={15} /> Add photos
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(e) => {
                void upload([...(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
          </div>
        </Field>
        {reading && <span className="subtle">{reading}</span>}
        {post && normalizeUrl(title) === post.url && (
          <div className="row" style={{ gap: 6, fontSize: 13 }}>
            <Sparkles size={14} style={{ color: 'var(--accent)' }} />
            <span>
              <strong>{post.title}</strong> <span className="subtle">· {post.host}</span>
            </span>
          </div>
        )}
        {photoIds.length > 0 && (
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="subtle">
              {photoIds.length} photo{photoIds.length === 1 ? '' : 's'} ready — they fill the {template ? `${template.imageCount} frame${template.imageCount === 1 ? '' : 's'} of “${template.name}”` : 'frames'}:
            </span>
            <PhotoStrip ids={photoIds} onRemove={(id) => setPhotoIds((cur) => cur.filter((x) => x !== id))} />
          </div>
        )}
        {articleTitle && !reading && (
          <div className="row" style={{ fontSize: 12, color: 'var(--text-2)' }}>
            <Sparkles size={14} style={{ color: 'var(--accent)' }} />
            <span>
              Headline on your Pin: <strong>{template ? headlineFor(template, articleTitle, autoText(articleTitle)) : articleTitle}</strong> — auto-fitted to the design.
            </span>
          </div>
        )}
      </div>

      {step === 1 && (
        <>
          {recs.length > 0 && <RecommendRow recs={recs.map((r) => ({ t: r.template, why: r.reasons.join(' · ') }))} onUse={(t) => { setTemplate(t); setStep(2); }} />}
          <div className="type-grid2" role="radiogroup" aria-label="Design type">
            {DESIGN_TYPES.map((d) => (
              <TypeCard
                key={d.id}
                def={d}
                selected={type === d.id}
                onPick={() => {
                  setType(d.id);
                  if (d.id === 'single-image') setSelectedLayout('single-image');
                  else if (d.id === 'image-text-overlay') setSelectedLayout('image-text-overlay');
                  else if (d.id === 'image-text-panel') setSelectedLayout('image-text-panel');
                  else if (d.id === 'split' || d.id === 'two-image') setSelectedLayout('two-image');
                  else if (d.id === 'collage-4' || d.id === 'collage-5') setSelectedLayout('collage-4');
                  else if (d.id === 'quote-advice') setSelectedLayout('quote-advice');
                  else if (d.id === 'blank') setSelectedLayout('single-image');
                }}
                onOpen={() => {
                  setType(d.id);
                  if (d.id === 'single-image') setSelectedLayout('single-image');
                  else if (d.id === 'image-text-overlay') setSelectedLayout('image-text-overlay');
                  else if (d.id === 'image-text-panel') setSelectedLayout('image-text-panel');
                  else if (d.id === 'split' || d.id === 'two-image') setSelectedLayout('two-image');
                  else if (d.id === 'collage-4' || d.id === 'collage-5') setSelectedLayout('collage-4');
                  else if (d.id === 'quote-advice') setSelectedLayout('quote-advice');
                  else if (d.id === 'blank') setSelectedLayout('single-image');
                  setStep(2);
                }}
              />
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <div className="stack" style={{ gap: 24 }}>
          {type === 'blank' && (
            <div className="card" style={{ padding: 20 }}>
              <div className="stack-sm" style={{ marginBottom: 16 }}>
                <div className="row" style={{ gap: 8 }}>
                  <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                  <strong style={{ fontSize: 16 }}>Choose Pin Layout Style (Kon si Pin bnani hai?)</strong>
                </div>
                <span className="subtle">Select the layout structure. Images and headlines will auto-adjust to your canvas size automatically.</span>
              </div>
              <div className="custom-layout-grid" role="radiogroup" aria-label="Pin layout style">
                {CUSTOM_PIN_LAYOUTS.map((layout) => {
                  const isSel = selectedLayout === layout.id;
                  return (
                    <button
                      key={layout.id}
                      type="button"
                      role="radio"
                      aria-checked={isSel}
                      className={`custom-layout-card ${isSel ? 'is-selected' : ''}`}
                      onClick={() => setSelectedLayout(layout.id)}
                    >
                      <div className="custom-layout-header">
                        <div className="custom-layout-badge">
                          {layout.id === 'single-image' ? <ImageIcon size={18} /> :
                           layout.id === 'image-text-overlay' ? <Layout size={18} /> :
                           layout.id === 'image-text-panel' ? <FileText size={18} /> :
                           layout.id === 'two-image' ? <Columns size={18} /> :
                           layout.id === 'collage-4' ? <Grid size={18} /> :
                           layout.id === 'quote-advice' ? <Type size={18} /> :
                           <Square size={18} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: 14, display: 'block' }}>{layout.label}</strong>
                          <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{layout.tagline}</span>
                        </div>
                      </div>
                      <p className="subtle" style={{ fontSize: 12, lineHeight: 1.4, margin: 0 }}>{layout.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {template && !preTemplate && (
            <div className="ok-box">
              Template selected: {template.name}.{' '}
              <button className="btn btn-sm" onClick={() => create(template)}>
                Create Pin with it
              </button>
            </div>
          )}

          <PresetPicker value={preset} onChange={setPreset} />
        </div>
      )}

      {step === 3 && (
        <>
          {recs.length > 0 && <RecommendRow recs={recs.map((r) => ({ t: r.template, why: r.reasons.join(' · ') }))} onUse={create} />}
          <TemplateGallery onUse={create} initialType={type ?? 'all'} compact selectedId={template?.id} />
        </>
      )}
    </div>
  );
}

/** Small thumbnails of the photos picked for the new Pin, each removable. */
function PhotoStrip({ ids, onRemove }: { ids: Id[]; onRemove: (id: Id) => void }) {
  return (
    <div className="research-shots">
      {ids.map((id) => (
        <span key={id} className="research-shot" style={{ width: 56, height: 72 }}>
          <PhotoThumb id={id} />
          <button type="button" aria-label="Leave this photo out" onClick={() => onRemove(id)}>
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}

function PhotoThumb({ id }: { id: Id }) {
  const img = useAssets((s) => s.previews[id]);
  const url = useMemo(() => (img ? thumbUrl(img, 120) : ''), [img]);
  return url ? <img src={url} alt="" /> : null;
}

function RecommendRow({ recs, onUse }: { recs: { t: Template; why: string }[]; onUse: (t: Template) => void }) {
  return (
    <section className="stack-sm">
      <div className="family-title">
        <h3 className="row">
          <Sparkles size={16} /> Recommended for your title
        </h3>
        <span className="subtle">Suggestions only — pick anything you like.</span>
      </div>
      <div className="tpl-grid">
        {recs.map(({ t, why }) => (
          <div key={t.id} className="stack-sm">
            <TemplateCard t={t} onUse={onUse} compact />
            <span className="subtle">{why}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
