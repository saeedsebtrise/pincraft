/**
 * Design Studio home (start a reusable {{variable}} design) and the Brand Kit
 * page (palettes, fonts, logo, website color detection and a live preview).
 */
import { ArrowRight, Check, Loader2, PenTool, Plus, RotateCcw, Upload, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BrandKitEditor } from '../editor/panels/MiscPanels';
import { readyBlock } from '../editor/studioBlocks';
import { reId, scaleDoc } from '../model/docOps';
import { clone, createProject } from '../model/factory';
import type { BrandKit, PinDocument, Template } from '../model/types';
import { ensureCanCreateProject } from '../saas/gates';
import { fetchPage, looksLikeUrl } from '../services/blogImport';
import { cssFontFamily } from '../config/fonts';
import { repos } from '../storage/repositories';
import { useAssets } from '../store/assetStore';
import { DEFAULT_BRAND_KIT, useLibrary } from '../store/libraryStore';
import { createPin } from '../store/projectActions';
import { useUi } from '../store/uiStore';
import { docThumbnail } from '../templates/thumbnails';

// ---------------------------------------------------------------- Design Studio

const STUDIO_SIZES = [
  { id: 'pin-standard', label: '2:3 · 1000 × 1500', width: 1000, height: 1500 },
  { id: 'custom-blog-736', label: '1:2 · 736 × 1472', width: 736, height: 1472 },
  { id: 'pin-full-vertical', label: '9:16 · 1080 × 1920', width: 1080, height: 1920 },
];

type Starter = 'blank' | 'recipe' | 'hero' | 'grid4' | 'before-after';
const STARTERS: { id: Starter; label: string; hint: string }[] = [
  { id: 'blank', label: 'Blank canvas', hint: 'Start from nothing' },
  { id: 'recipe', label: 'Recipe Pin', hint: 'Photo, {{title}}, CTA, website' },
  { id: 'hero', label: 'Hero + headline', hint: 'Big photo, headline panel' },
  { id: 'grid4', label: '4-photo grid', hint: '{{image_1}}…{{image_4}} + title' },
  { id: 'before-after', label: 'Before / After', hint: 'Two photos with labels' },
];

async function openInStudio(doc: PinDocument | null, name: string, size: (typeof STUDIO_SIZES)[number]) {
  if (!(await ensureCanCreateProject())) return;
  let p;
  if (doc) {
    p = createProject(doc, name);
    p.meta = { ...p.meta, brandKitId: useLibrary.getState().activeKit().id };
    await repos.projects.put(p);
  } else {
    p = await createPin({ width: size.width, height: size.height, presetId: size.id, templateId: null, headline: name });
  }
  useUi.getState().set({ leftTab: 'studio' });
  location.hash = `#/editor/${p.id}`;
}

function starterDoc(id: Starter, size: (typeof STUDIO_SIZES)[number], kit: BrandKit): PinDocument | null {
  if (id === 'blank') return null;
  const base: PinDocument = {
    width: size.width,
    height: size.height,
    presetId: size.id,
    background: { type: 'solid', color: kit.secondary, gradientFrom: kit.secondary, gradientTo: '#FFFFFF', gradientAngle: 180, assetId: null },
    collage: null,
    layers: [],
  };
  let doc = { ...base, layers: readyBlock(base, id, kit) };
  if (id === 'grid4' || id === 'before-after') doc = { ...doc, layers: [...doc.layers, ...readyBlock(doc, 'recipe', kit).filter((l) => l.type !== 'frame')] };
  return doc;
}

function TemplateThumb({ t }: { t: Template }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    void docThumbnail(t.doc, 200).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [t]);
  return src ? <img src={src} alt={t.name} /> : <Loader2 className="subtle" />;
}

export function StudioHome() {
  const lib = useLibrary();
  const kit = lib.activeKit();
  const [size, setSize] = useState(STUDIO_SIZES[0]);
  const [busy, setBusy] = useState<string | null>(null);
  const mine = lib.userTemplates;
  const go = async (key: string, f: () => Promise<void>) => {
    setBusy(key);
    try {
      await f();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="dash-main">
      <div className="page-hero">
        <span className="studio-eyebrow">
          <PenTool size={13} /> Design Studio
        </span>
        <h1 className="dash-h1">Build reusable Pin designs</h1>
        <p className="muted">
          Layers, <code>{'{{variables}}'}</code>, image placeholders and your brand. Preview with sample values, then fill one design from a CSV — every row becomes a Pin.
        </p>
      </div>

      <div className="card studio-start">
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <strong>Start a studio design</strong>
          <div className="seg" aria-label="Size">
            {STUDIO_SIZES.map((s) => (
              <button key={s.id} type="button" aria-pressed={size.id === s.id} onClick={() => setSize(s)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="studio-starters">
          {STARTERS.map((s) => (
            <button key={s.id} className="studio-starter" disabled={!!busy} onClick={() => void go(s.id, () => openInStudio(starterDoc(s.id, size, kit), s.id === 'blank' ? 'Studio design' : `${s.label} — studio`, size))}>
              <span className="studio-starter-icon">{busy === s.id ? <Loader2 size={20} /> : s.id === 'blank' ? <Plus size={20} /> : <PenTool size={20} />}</span>
              <strong>{s.label}</strong>
              <span className="subtle">{s.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="stack-sm">
        <h2 style={{ fontSize: 18 }}>Saved studio designs</h2>
        <span className="subtle">Templates you saved with “Save template”. Use them here, in the Studio panel, or in CSV Import.</span>
      </div>
      {mine.length ? (
        <div className="studio-saved-grid">
          {mine.map((t) => (
            <button
              key={t.id}
              className="studio-saved-card"
              disabled={!!busy}
              onClick={() => void go(t.id, () => openInStudio(reId(scaleDoc(clone(t.doc), size.width, size.height, size.id)), t.name, size))}
            >
              <span className="studio-saved-img">
                <TemplateThumb t={t} />
              </span>
              <span className="ellipsis">{t.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="card empty-card">
          <span className="muted">No saved designs yet. Start a design above, then click Save template in the Studio panel.</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Brand Kit

/** Named palettes: text (primary), background (secondary) and accent. */
export const BRAND_PALETTES: { name: string; primary: string; secondary: string; accent: string }[] = [
  { name: 'PinCraft', primary: '#111827', secondary: '#FFF1F2', accent: '#E60023' },
  { name: 'Sage', primary: '#1F2D24', secondary: '#EEF3EC', accent: '#6B8F71' },
  { name: 'Ocean', primary: '#0B2537', secondary: '#E9F4F8', accent: '#0E7490' },
  { name: 'Plum', primary: '#2A1430', secondary: '#F6EEF7', accent: '#7E2E84' },
  { name: 'Honey', primary: '#2D2112', secondary: '#FFF6E5', accent: '#C98B12' },
  { name: 'Ink', primary: '#0F172A', secondary: '#F1F5F9', accent: '#334155' },
  { name: 'Rose', primary: '#3B1020', secondary: '#FFF0F4', accent: '#D6336C' },
  { name: 'Coral', primary: '#331A14', secondary: '#FFF3EF', accent: '#F06449' },
  { name: 'Terracotta', primary: '#2B1810', secondary: '#F7F3EE', accent: '#C2593F' },
  { name: 'Peach', primary: '#3A2218', secondary: '#FFF4EC', accent: '#F28C5B' },
  { name: 'Golden', primary: '#2A2310', secondary: '#FBF6E6', accent: '#B8860B' },
  { name: 'Olive', primary: '#23260F', secondary: '#F3F4E8', accent: '#6B7B2A' },
  { name: 'Forest', primary: '#0F2418', secondary: '#ECF4EF', accent: '#1E6B43' },
  { name: 'Mint', primary: '#10302A', secondary: '#ECFAF5', accent: '#14A37F' },
  { name: 'Teal', primary: '#0D2A2C', secondary: '#E8F6F6', accent: '#0F8B8D' },
  { name: 'Sky', primary: '#0E2238', secondary: '#EDF6FF', accent: '#2B87D8' },
  { name: 'Royal', primary: '#101A3A', secondary: '#EEF1FB', accent: '#2742B8' },
  { name: 'Indigo', primary: '#1A1840', secondary: '#F0F0FB', accent: '#4F46E5' },
  { name: 'Lavender', primary: '#261F3A', secondary: '#F5F2FC', accent: '#8B6FD6' },
  { name: 'Orchid', primary: '#33163A', secondary: '#FBF0FB', accent: '#B23CB8' },
  { name: 'Wine', primary: '#2E0F16', secondary: '#F8EEF0', accent: '#8E1F35' },
  { name: 'Cocoa', primary: '#2A1C16', secondary: '#F5EFEA', accent: '#7A4E36' },
  { name: 'Sand', primary: '#2E2820', secondary: '#F6F1E8', accent: '#A68A64' },
  { name: 'Charcoal', primary: '#111111', secondary: '#F4F4F4', accent: '#3A3A3A' },
];

function useLogoUrl(id: string | null) {
  const preview = useAssets((s) => (id ? s.previews[id] : undefined));
  useEffect(() => {
    if (id) void useAssets.getState().ensureLoaded([id]);
  }, [id]);
  return useMemo(() => {
    if (!preview) return '';
    const c = document.createElement('canvas');
    c.width = preview.width;
    c.height = preview.height;
    c.getContext('2d')?.drawImage(preview, 0, 0);
    return c.toDataURL('image/png');
  }, [preview]);
}

function BrandPreview({ kit }: { kit: BrandKit }) {
  const logo = useLogoUrl(kit.logoAssetId);
  return (
    <div className="brand-preview" style={{ background: kit.secondary }}>
      <div className="brand-preview-photo" style={{ background: `linear-gradient(135deg, ${kit.accent}55, ${kit.secondary} 60%, ${kit.accent}33)` }} />
      <div className="brand-preview-card">
        <strong style={{ fontFamily: cssFontFamily(kit.headingFont), color: kit.primary }}>Fresh ideas for a beautiful home</strong>
        <span style={{ fontFamily: cssFontFamily(kit.bodyFont), color: kit.primary }}>Make every corner feel like you</span>
        <span className="brand-preview-cta" style={{ background: kit.accent, fontFamily: cssFontFamily(kit.bodyFont) }}>
          Read more
        </span>
      </div>
      <div className="brand-preview-foot" style={{ color: kit.primary }}>
        {logo ? <img src={logo} alt="" /> : <span className="brand-preview-dot" style={{ background: kit.accent }} />}
        <span>{kit.brandName || 'Your brand'}</span>
        <span className="grow" />
        <span>{kit.website || 'yourwebsite.com'}</span>
      </div>
    </div>
  );
}

export function BrandKitPage() {
  const lib = useLibrary();
  const kit = lib.activeKit();
  const [draft, setDraft] = useState<BrandKit>(kit);
  const [detecting, setDetecting] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useUi.getState().toast;
  useEffect(() => setDraft(kit), [kit]);
  const set = (p: Partial<BrandKit>) => setDraft((d) => ({ ...d, ...p }));
  const logo = useLogoUrl(draft.logoAssetId);
  const dirty = JSON.stringify(draft) !== JSON.stringify(kit);
  const save = async () => {
    await lib.saveBrandKit(draft);
    toast('Brand Kit saved', 'success');
  };

  const detect = async () => {
    if (!looksLikeUrl(draft.website)) return toast('Add your website first (e.g. yourblog.com)', 'error');
    setDetecting(true);
    try {
      const page = await fetchPage(draft.website);
      const colors = page.colors ?? [];
      setFound(colors);
      if (!colors.length) toast('No brand colors found on that page — pick a palette instead', 'info');
      else {
        set({ accent: colors[0].toUpperCase() });
        toast(`Found ${colors.length} color${colors.length === 1 ? '' : 's'} — accent set to ${colors[0].toUpperCase()}`, 'success');
      }
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="dash-main brand-page">
      <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div className="stack-sm" style={{ gap: 4 }}>
          <h1 className="dash-h1">Brand Kit</h1>
          <p className="muted">Your colors, fonts and logo, together. Used by Auto Design, the Studio, footers and “Apply brand”.</p>
        </div>
        <button className="btn btn-pink" disabled={!dirty} onClick={() => void save()}>
          <Check size={16} /> {dirty ? 'Save brand' : 'Saved'}
        </button>
      </div>

      <div className="brand-layout">
        <div className="stack">
          <div className="card brand-card">
            <strong>Color palettes</strong>
            <div className="palette-chips">
              {BRAND_PALETTES.map((p) => {
                const on = draft.primary.toUpperCase() === p.primary && draft.secondary.toUpperCase() === p.secondary && draft.accent.toUpperCase() === p.accent;
                return (
                  <button key={p.name} className={`palette-chip ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => set({ primary: p.primary, secondary: p.secondary, accent: p.accent })}>
                    <span className="palette-dots">
                      <i style={{ background: p.primary }} />
                      <i style={{ background: p.accent }} />
                    </span>
                    {p.name}
                  </button>
                );
              })}
            </div>
            {found.length > 0 && (
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <span className="subtle">From your website:</span>
                {found.map((c) => (
                  <button key={c} className="palette-chip" title={`Use ${c} as accent`} onClick={() => set({ accent: c.toUpperCase() })}>
                    <span className="palette-dots">
                      <i style={{ background: c }} />
                    </span>
                    {c.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-sm" disabled={detecting} onClick={() => void detect()}>
                {detecting ? <Loader2 size={14} /> : <Wand2 size={14} />} Detect website colors
              </button>
              <button className="btn btn-sm" onClick={() => set({ primary: DEFAULT_BRAND_KIT.primary, secondary: DEFAULT_BRAND_KIT.secondary, accent: DEFAULT_BRAND_KIT.accent })}>
                <RotateCcw size={14} /> Reset colors
              </button>
            </div>
          </div>

          <div className="card brand-card">
            <strong>Brand &amp; fonts</strong>
            <BrandKitEditor kit={draft} onChange={setDraft} />
          </div>

          <div className="card brand-card">
            <strong>Logo</strong>
            <span className="subtle">PNG, JPEG or WebP. Shown on Pins with “Add logo” in the Studio.</span>
            <div className="row" style={{ gap: 12 }}>
              {logo && <img className="brand-logo" src={logo} alt="Your logo" />}
              <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> {logo ? 'Replace logo' : 'Upload logo'}
              </button>
              {draft.logoAssetId && (
                <button className="btn btn-sm btn-danger" onClick={() => set({ logoAssetId: null })}>
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                const { ids, errors } = await useAssets.getState().importFiles([f]);
                if (ids[0]) set({ logoAssetId: ids[0] });
                else toast(errors[0] ?? 'Couldn’t read that image', 'error');
              }}
            />
          </div>

          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-pink btn-lg"
              onClick={async () => {
                if (dirty) await save();
                location.hash = '#/auto';
              }}
            >
              Create Pins with this brand <ArrowRight size={16} />
            </button>
            <a className="btn btn-lg" href="#/studio">
              Open Design Studio
            </a>
          </div>
        </div>

        <aside className="card brand-card brand-preview-wrap">
          <strong>Live preview</strong>
          <BrandPreview kit={draft} />
        </aside>
      </div>
    </div>
  );
}
