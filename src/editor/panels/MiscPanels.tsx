import { Circle, Image as ImageIcon, Minus, Plus, Square, SquareDashed, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { thumbUrl } from '../../ui/imageUrl';
import { FONT_CATEGORIES, FONT_LIBRARY } from '../../config/fonts';
import { applyBrand, documentColors } from '../../model/docOps';
import { createFrame, newId } from '../../model/factory';
import type { Background, BrandKit, Project } from '../../model/types';
import { useAssets } from '../../store/assetStore';
import { useEditor } from '../../store/editorStore';
import { DEFAULT_BRAND_KIT, useLibrary } from '../../store/libraryStore';
import { useUi } from '../../store/uiStore';
import { repos } from '../../storage/repositories';
import { ColorField, Field, RangeField, Select } from '../../ui/controls';
import { newFrame, newShape } from '../blocks';

export const fontOptions = FONT_CATEGORIES.flatMap((c) => FONT_LIBRARY.filter((f) => f.category === c).map((f) => ({ value: f.family, label: f.family, group: c })));

export function BrandKitEditor({ kit, onChange }: { kit: BrandKit; onChange: (k: BrandKit) => void }) {
  const set = (p: Partial<BrandKit>) => onChange({ ...kit, ...p });
  return (
    <div className="stack">
      <Field label="Kit name">
        <input className="input" value={kit.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="Brand name">
        <input className="input" value={kit.brandName} onChange={(e) => set({ brandName: e.target.value })} />
      </Field>
      <Field label="Website (used by footers)">
        <input className="input" value={kit.website} placeholder="luxehairstyles.com" onChange={(e) => set({ website: e.target.value.trim() })} />
      </Field>
      <div className="grid-3">
        <ColorField label="Primary" value={kit.primary} onChange={(v) => set({ primary: v })} />
        <ColorField label="Secondary" value={kit.secondary} onChange={(v) => set({ secondary: v })} />
        <ColorField label="Accent" value={kit.accent} onChange={(v) => set({ accent: v })} />
      </div>
      <Select label="Heading font" value={kit.headingFont} onChange={(v) => set({ headingFont: v })} options={fontOptions} />
      <Select label="Body font" value={kit.bodyFont} onChange={(v) => set({ bodyFont: v })} options={fontOptions} />
      <Select
        label="Default CTA style"
        value={kit.ctaStyle}
        onChange={(v) => set({ ctaStyle: v })}
        options={[
          { value: 'dark-block', label: 'Dark block' },
          { value: 'light-block', label: 'Light block' },
          { value: 'outline', label: 'Outline' },
          { value: 'text', label: 'Text only' },
        ]}
      />
    </div>
  );
}

export function BrandPanel() {
  const lib = useLibrary();
  const kit = lib.activeKit();
  const [draft, setDraft] = useState(kit);
  useEffect(() => setDraft(kit), [kit]);
  const ed = useEditor.getState();
  const project = useEditor((s) => s.project!);
  const logo = useAssets((s) => (draft.logoAssetId ? s.previews[draft.logoAssetId] : undefined));

  useEffect(() => {
    if (draft.logoAssetId) useAssets.getState().ensureLoaded([draft.logoAssetId]);
  }, [draft.logoAssetId]);

  const save = (k: BrandKit) => {
    setDraft(k);
    lib.saveBrandKit(k);
  };

  return (
    <div>
      <div className="panel-head">
        <h2>Brand Kit</h2>
      </div>
      <div className="panel-section">
        <Select label="Active kit" value={lib.activeKitId} onChange={(v) => lib.setActiveKit(v)} options={lib.brandKits.map((k) => ({ value: k.id, label: k.name }))} />
        <div className="grid-2">
          <button
            className="btn btn-sm"
            onClick={async () => {
              const k = { ...DEFAULT_BRAND_KIT, id: newId('kit_'), name: 'New brand' };
              await lib.saveBrandKit(k);
              lib.setActiveKit(k.id);
            }}
          >
            <Plus size={14} /> New kit
          </button>
          <button className="btn btn-sm btn-danger" disabled={lib.brandKits.length < 2} onClick={() => confirm(`Delete “${kit.name}”?`) && lib.deleteBrandKit(kit.id)}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
      <div className="panel-section">
        <BrandKitEditor kit={draft} onChange={save} />
        <Field label="Logo">
          <div className="row">
            {logo && <img alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', background: '#f3f3f3', borderRadius: 6 }} src={thumbUrl(logo, 96)} />}
            <label className="btn btn-sm">
              Upload logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const { ids, errors } = await useAssets.getState().importFiles([f]);
                  errors.forEach((er) => useUi.getState().toast(er, 'error'));
                  if (ids[0]) save({ ...draft, logoAssetId: ids[0] });
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </Field>
      </div>
      <div className="panel-section">
        <button className="btn btn-dark" onClick={() => ed.setDoc(applyBrand(project.doc, draft))}>
          Apply brand to this Pin
        </button>
        <span className="subtle">Sets heading/body fonts, website footer text, badge & CTA accent and dark blocks to your primary color. Undo to revert.</span>
        <button
          className="btn btn-sm"
          disabled={!draft.logoAssetId}
          onClick={() => {
            const m = draft.logoAssetId ? useAssets.getState().metas[draft.logoAssetId] : undefined;
            const w = project.doc.width * 0.22;
            const h = m ? (w * m.height) / m.width : w;
            ed.addLayers([createFrame({ name: 'Logo', role: 'logo', fit: 'contain', assetId: draft.logoAssetId, x: (project.doc.width - w) / 2, y: project.doc.height * 0.03, width: w, height: h, placeholderFill: 'rgba(0,0,0,0)' })]);
          }}
        >
          Add logo to Pin
        </button>
      </div>
    </div>
  );
}

export function BackgroundPanel() {
  return (
    <div>
      <div className="panel-head">
        <h2>Background</h2>
      </div>
      <div className="panel-section">
        <BackgroundControls />
        <span className="subtle">The background shows through collage gaps, so it doubles as the divider color.</span>
      </div>
    </div>
  );
}

/** Background type + color/gradient/image controls (used by the Background tab and the Design panel). */
export function BackgroundControls() {
  const doc = useEditor((s) => s.project!.doc);
  const assetIds = useEditor((s) => s.project!.assetIds);
  const kit = useLibrary((s) => s.activeKit());
  const bg = doc.background;
  const set = (p: Partial<Background>, key?: string) => useEditor.getState().updateDoc((d) => ({ ...d, background: { ...d.background, ...p } }), key);
  const brandColors = [kit.primary, kit.secondary, kit.accent];

  return (
    <>
        <div className="seg seg-wide" role="group" aria-label="Background type">
          {(['solid', 'gradient', 'image', 'transparent'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={bg.type === t} onClick={() => set({ type: t })}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        {(bg.type === 'solid' || bg.type === 'image') && <ColorField label={bg.type === 'image' ? 'Fallback color' : 'Color'} value={bg.color} onChange={(v) => set({ color: v }, 'bg-color')} brandColors={brandColors} docColors={documentColors(doc)} />}
        {bg.type === 'gradient' && (
          <>
            <div className="grid-2">
              <ColorField label="From" value={bg.gradientFrom} onChange={(v) => set({ gradientFrom: v }, 'bg-g1')} brandColors={brandColors} />
              <ColorField label="To" value={bg.gradientTo} onChange={(v) => set({ gradientTo: v }, 'bg-g2')} brandColors={brandColors} />
            </div>
            <RangeField label="Angle" min={0} max={360} value={bg.gradientAngle} onChange={(v) => set({ gradientAngle: v }, 'bg-angle')} format={(v) => `${v}°`} />
          </>
        )}
        {bg.type === 'image' && (
          <div className="stack-sm">
            <span className="field-label">Background image</span>
            {assetIds.length === 0 && <span className="subtle">Upload images first (Uploads tab).</span>}
            <div className="asset-grid">
              {assetIds.map((id) => (
                <BgThumb key={id} id={id} selected={bg.assetId === id} onPick={() => set({ assetId: id })} />
              ))}
            </div>
          </div>
        )}
        {bg.type === 'transparent' && <span className="subtle">Transparent backgrounds export only as PNG. Pinterest Pins normally use an opaque background.</span>}
    </>
  );
}

function BgThumb({ id, selected, onPick }: { id: string; selected: boolean; onPick: () => void }) {
  const img = useAssets((s) => s.previews[id]);
  const url = useMemo(() => (img ? thumbUrl(img, 200) : ''), [img]);
  return (
    <button type="button" className="asset" style={{ borderColor: selected ? 'var(--text)' : undefined, padding: 0 }} onClick={onPick} aria-pressed={selected} aria-label="Use as background">
      {url && <img src={url} alt="" />}
    </button>
  );
}

export function ElementsPanel() {
  const doc = useEditor((s) => s.project!.doc);
  const ed = useEditor.getState();
  return (
    <div>
      <div className="panel-head">
        <h2>Elements</h2>
      </div>
      <div className="panel-section">
        <span className="section-title">Image frames</span>
        <div className="grid-2">
          <button className="btn btn-sm" onClick={() => ed.addLayers([newFrame(doc)])}>
            <ImageIcon size={14} /> Empty frame
          </button>
          <button className="btn btn-sm" onClick={() => ed.addLayers([{ ...newFrame(doc), cornerRadius: doc.width * 0.04 }])}>
            <SquareDashed size={14} /> Rounded frame
          </button>
          <button className="btn btn-sm" onClick={() => ed.addLayers([{ ...newFrame(doc), width: doc.width * 0.5, height: doc.width * 0.5, cornerRadius: doc.width }])}>
            <Circle size={14} /> Circle frame
          </button>
        </div>
        <span className="subtle">Drop an uploaded image onto any frame to fill it.</span>
      </div>
      <div className="panel-section">
        <span className="section-title">Shapes</span>
        <div className="grid-2">
          <button className="btn btn-sm" onClick={() => ed.addLayers([newShape(doc, 'rect')])}>
            <Square size={14} /> Rectangle
          </button>
          <button className="btn btn-sm" onClick={() => ed.addLayers([newShape(doc, 'rounded')])}>
            <SquareDashed size={14} /> Rounded box
          </button>
          <button className="btn btn-sm" onClick={() => ed.addLayers([newShape(doc, 'ellipse')])}>
            <Circle size={14} /> Circle
          </button>
          <button className="btn btn-sm" onClick={() => ed.addLayers([newShape(doc, 'line')])}>
            <Minus size={14} /> Divider line
          </button>
          <button className="btn btn-sm" onClick={() => ed.addLayers([newShape(doc, 'overlay')], { index: doc.layers.reduce((a, l, i) => (l.type === 'frame' ? i + 1 : a), 0) })}>
            <Square size={14} /> Dark overlay
          </button>
        </div>
        <span className="subtle">Number badges, center text bands and website footers are in the Text tab.</span>
      </div>
    </div>
  );
}

export function ProjectsPanel() {
  const current = useEditor((s) => s.project!.id);
  const [list, setList] = useState<Project[] | null>(null);
  useEffect(() => {
    repos.projects.list().then(setList).catch(() => setList([]));
  }, []);
  return (
    <div>
      <div className="panel-head">
        <h2>Projects</h2>
        <a className="btn btn-sm" href="#/new">
          <Plus size={14} /> New Pin
        </a>
      </div>
      <div className="panel-section">
        {!list && <span className="subtle">Loading…</span>}
        {list?.length === 0 && <span className="subtle">No saved projects yet.</span>}
        <div className="mini-tpl-grid">
          {list?.map((p) => (
            <a key={p.id} className="mini-tpl" href={`#/editor/${p.id}`} aria-current={p.id === current ? 'page' : undefined} style={{ textDecoration: 'none', borderColor: p.id === current ? 'var(--text)' : undefined }}>
              {p.thumbnail ? <img src={p.thumbnail} alt="" /> : <div style={{ aspectRatio: '2/3', background: 'var(--surface-3)' }} />}
              <span>{p.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
