import { ArrowLeft, ArrowRight, Columns, FileText, Grid, Image as ImageIcon, Layout, Loader2, Save, Sparkles, Square, Type } from 'lucide-react';
import { useMemo, useState } from 'react';
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

  const recs = useMemo(() => recommendTemplates(title, allTemplates(), { presetId: preset.id, limit: 4 }), [title, preset.id]);

  const create = async (t: Template | undefined, layout?: CustomPinLayoutId) => {
    if (!(await ensureCanCreateProject())) return;
    setBusy(true);
    try {
      const headline = title.trim() ? suggestHeadlines({ articleTitle: title })[0] : undefined;
      const customLayout = (type === 'blank' || layout) ? (layout ?? selectedLayout) : undefined;
      const p = await createPin({
        width: preset.width,
        height: preset.height,
        presetId: preset.id,
        templateId: customLayout ? null : (t?.id ?? BLANK_TEMPLATE_ID),
        customLayout,
        articleTitle: title.trim(),
        headline: title.trim() || headline,
      });
      useUi.getState().set({ leftTab: (customLayout && customLayout !== 'blank' && customLayout !== 'quote-advice') || (t && t.imageCount > 0) ? 'uploads' : 'text' });
      location.hash = `#/editor/${p.id}`;
    } catch (e) {
      useUi.getState().toast(`Couldn't create the Pin: ${(e as Error).message}`, 'error');
      setBusy(false);
    }
  };

  const next = () => {
    if (step === 2 && (type === 'blank' || preTemplate)) return create(preTemplate ?? undefined, selectedLayout);
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

      <div className="card" style={{ padding: 18 }}>
        <Field label="Your Topic / Article title — auto-adjusts onto your Pin">
          <input
            className="input"
            value={title}
            placeholder="e.g. 50 Lob Haircut Ideas to Take to Your Next Salon Appointment"
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        {title.trim() && (
          <div className="row" style={{ marginTop: 8, fontSize: 12, color: 'var(--text-2)' }}>
            <Sparkles size={14} style={{ color: 'var(--accent)' }} />
            <span>Topic headline will be auto-fitted and styled on your Pin.</span>
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
