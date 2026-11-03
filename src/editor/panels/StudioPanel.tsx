/**
 * Design Studio panel: build a reusable design from elements, ready blocks
 * and {{variables}}, preview it with sample values, fill it from a CSV (one
 * page per row), let AI write its text, and save it as a template.
 */
import { Eye, FileSpreadsheet, Image as ImageIcon, LayoutTemplate, Loader2, Maximize2, RotateCcw, Save, Sparkles, SquareDashed, Trash2, Type } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { applyBrand, isText, reId, scaleDoc } from '../../model/docOps';
import { clone, createDocument, createText } from '../../model/factory';
import type { Id, Layer, TextLayer } from '../../model/types';
import { requirePro } from '../../saas/gates';
import { importImageUrl } from '../../services/csvImport';
import { csvRecords, fillAsPage, withDefaults, fillVariables, findVariables, IMAGE_VARS, SAMPLE_VALUES, STUDIO_VARS, token } from '../../services/studioVars';
import { useAssets } from '../../store/assetStore';
import { useEditor } from '../../store/editorStore';
import { useLibrary } from '../../store/libraryStore';
import { useUi } from '../../store/uiStore';
import { docThumbnail } from '../../templates/thumbnails';
import { Modal } from '../../ui/controls';
import type { ImageMap } from '../canvas/nodes';
import { newFooter } from '../blocks';
import { BASIC_SHAPES, basicShape, element, ELEMENTS, imagePlaceholder, nextImageNumber, READY_BLOCKS, readyBlock } from '../studioBlocks';
import { runAssistant } from '../textAssist';
import { importAndPlace } from '../importImages';

const PREVIEW_KEY = 'pinforge.studioPreview';
const MAX_CSV_ROWS = 50;

function loadPreview(): Record<string, string> {
  try {
    return { ...SAMPLE_VALUES, ...JSON.parse(localStorage.getItem(PREVIEW_KEY) || '{}') };
  } catch {
    return { ...SAMPLE_VALUES };
  }
}

async function loadUrlImage(url: string) {
  try {
    const res = await fetch(`/api/image?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const image = await createImageBitmap(await res.blob());
    return { image, width: image.width, height: image.height };
  } catch {
    return null;
  }
}

function Section({ eyebrow, title, hint, children }: { eyebrow?: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="panel-section studio-section">
      {eyebrow && <span className="studio-eyebrow">{eyebrow}</span>}
      <strong>{title}</strong>
      {hint && <span className="subtle">{hint}</span>}
      {children}
    </div>
  );
}

export function StudioPanel() {
  const ed = useEditor.getState();
  const doc = useEditor((s) => s.project!.doc);
  const selection = useEditor((s) => s.selection);
  const lib = useLibrary();
  const kit = lib.activeKit();
  const vars = useMemo(() => findVariables(doc), [doc]);
  const [values, setValues] = useState<Record<string, string>>(loadPreview);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [csv, setCsv] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const toast = useUi.getState().toast;
  const add = (layers: Layer[]) => ed.addLayers(layers, { select: true });
  const selectedText = doc.layers.find((l): l is TextLayer => isText(l) && selection.includes(l.id));
  const userTemplates = lib.userTemplates;

  useEffect(() => {
    try {
      localStorage.setItem(PREVIEW_KEY, JSON.stringify(values));
    } catch {
      /* preview values just won't persist */
    }
  }, [values]);

  const insertVar = (name: string) => {
    if (IMAGE_VARS.includes(name as (typeof IMAGE_VARS)[number])) {
      add([imagePlaceholder(doc, Number(name.split('_')[1]))]);
      return;
    }
    if (selectedText) {
      ed.updateLayer<TextLayer>(selectedText.id, (l) => ({ ...l, text: l.text.trim() ? `${l.text} ${token(name)}` : token(name) }));
      return;
    }
    const k = doc.width / 1000;
    add([createText({ name: name[0].toUpperCase() + name.slice(1), role: name === 'title' ? 'title' : name === 'cta' ? 'cta' : name === 'website' ? 'website' : 'body', x: doc.width * 0.1, y: doc.height * 0.45, width: doc.width * 0.8, height: 110 * k, text: token(name), fontFamily: name === 'title' ? kit.headingFont : kit.bodyFont, fontWeight: name === 'title' ? 800 : 600, fontSize: (name === 'title' ? 90 : 40) * k, fill: kit.primary })]);
  };

  const imageMapFor = async (vals: Record<string, string>) => {
    const images: ImageMap = {};
    const ids: Record<string, Id> = {};
    await Promise.all(
      IMAGE_VARS.filter((v) => vals[v]?.trim()).map(async (v) => {
        const src = await loadUrlImage(vals[v].trim());
        if (src) {
          ids[v] = `preview_${v}`;
          images[`preview_${v}`] = src;
        }
      }),
    );
    return { images, ids };
  };

  const previewVariables = async () => {
    setBusy('preview');
    try {
      const { images, ids } = await imageMapFor(values);
      const assets: ImageMap = Object.fromEntries(Object.entries(useAssets.getState().previews).map(([k, image]) => [k, { image, width: image.width, height: image.height }]));
      setPreview(await docThumbnail(fillVariables(doc, values, ids), 520, { ...assets, ...images }));
    } finally {
      setBusy(null);
    }
  };

  const applyValues = async () => {
    setBusy('apply');
    try {
      const ids: Record<string, Id> = {};
      for (const v of IMAGE_VARS) if (values[v]?.trim() && vars.includes(v)) {
        const id = await importImageUrl(values[v].trim());
        if (id) ids[v] = id;
      }
      if (Object.keys(ids).length) ed.updateProject({ assetIds: [...new Set([...useEditor.getState().project!.assetIds, ...Object.values(ids)])] });
      ed.setDoc(fillVariables(doc, values, ids));
      toast('Values applied — Undo brings the variables back', 'success');
    } finally {
      setBusy(null);
    }
  };

  const runCsv = async () => {
    const { records } = csvRecords(csv);
    if (!records.length) return toast('Paste a CSV with a header row and at least one row', 'error');
    if (!requirePro('batchVariations')) return;
    const rows = records.slice(0, MAX_CSV_ROWS);
    setBusy('csv');
    try {
      const template = useEditor.getState().project!.doc;
      const newIds: Id[] = [];
      for (const [i, r] of rows.entries()) {
        const ids: Record<string, Id> = {};
        for (const v of IMAGE_VARS) {
          const url = r[v] || (v === 'image_1' ? r.image_url || r.image : '');
          if (url && vars.includes(v)) {
            const id = await importImageUrl(url);
            if (id) (ids[v] = id), newIds.push(id);
          }
        }
        ed.addPage(fillAsPage(template, withDefaults(r, { website: kit.website }), ids));
        setBusy(`csv ${i + 1}/${rows.length}`);
      }
      ed.updateProject({ assetIds: [...new Set([...useEditor.getState().project!.assetIds, ...newIds])] });
      toast(`${rows.length} Pin${rows.length === 1 ? '' : 's'} added as pages${records.length > rows.length ? ` (first ${MAX_CSV_ROWS} rows)` : ''}`, 'success');
    } finally {
      setBusy(null);
    }
  };

  const generate = async () => {
    if (!topic.trim()) return toast('Type what the Pin is about', 'error');
    setBusy('ai');
    try {
      const r = await runAssistant({ articleTitle: topic.trim(), website: kit.website }, useUi.getState().aiEnabled);
      const k = doc.width / 1000;
      const W = doc.width;
      const layers: Layer[] = [];
      if (r.headlines[0]) layers.push(createText({ name: 'AI headline', role: doc.layers.some((l) => l.role === 'title') ? 'none' : 'title', x: W * 0.08, y: doc.height * 0.58, width: W * 0.84, height: 230 * k, text: r.headlines[0], fontFamily: kit.headingFont, fontWeight: 800, fontSize: 100 * k, minFontSize: 28 * k, fill: kit.primary }));
      if (r.subtitles[0]) layers.push(createText({ name: 'AI subtitle', role: 'subtitle', x: W * 0.1, y: doc.height * 0.58 + 240 * k, width: W * 0.8, height: 60 * k, text: r.subtitles[0], fontFamily: kit.bodyFont, fontWeight: 500, fontSize: 34 * k, fill: kit.primary }));
      if (r.ctas[0]) layers.push(createText({ name: 'AI CTA', role: 'cta', x: W * 0.27, y: doc.height * 0.58 + 320 * k, width: W * 0.46, height: 84 * k, text: r.ctas[0], fontFamily: kit.bodyFont, fontWeight: 800, fontSize: 34 * k, textTransform: 'uppercase', fill: '#FFFFFF', background: { ...createText().background, enabled: true, color: kit.accent, shape: 'pill', paddingX: 34 * k, paddingY: 14 * k, hug: true } }));
      add(layers);
      toast(r.source === 'ai' ? 'AI headline, subtitle and CTA added' : 'Headline, subtitle and CTA added (on-device — turn on AI for smarter text)', 'success');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="studio-panel">
      <div className="panel-head">
        <h2>Design Studio</h2>
      </div>

      <div className="panel-section studio-toolbar">
        <button className="btn btn-sm" onClick={() => useUi.getState().set({ modal: 'saveTemplate' })}>
          <Save size={14} /> Save template
        </button>
        <button
          className="btn btn-sm"
          onClick={() => {
            const el = document.documentElement;
            if (document.fullscreenElement) void document.exitFullscreen();
            else void el.requestFullscreen?.();
          }}
        >
          <Maximize2 size={14} /> Full screen
        </button>
        <button
          className="btn btn-sm btn-danger"
          onClick={() => {
            if (!confirm('Clear the canvas? (Undo brings it back)')) return;
            ed.setDoc({ ...createDocument(doc.width, doc.height, doc.presetId) });
          }}
        >
          <Trash2 size={14} /> Clear
        </button>
      </div>

      <Section eyebrow="Add elements" title="Content" hint="Fixed content for one design, or an image placeholder for CSV bulk rendering.">
        <div className="studio-grid-1">
          <button className="btn studio-add" onClick={() => insertVar('title')}>
            <Type size={16} /> Text
          </button>
          <button className="btn studio-add" onClick={() => fileRef.current?.click()}>
            <ImageIcon size={16} /> Image
          </button>
          <button className="btn studio-add" onClick={() => add([imagePlaceholder(doc, nextImageNumber(doc))])}>
            <SquareDashed size={16} /> Image placeholder
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            if (files.length) void importAndPlace(files, null, true);
          }}
        />
      </Section>

      <Section title="Variables" hint={selectedText ? `Click to insert into “${selectedText.name}”.` : 'Select a text layer to insert into it, or click to add a new one. Image variables add a placeholder.'}>
        <div className="studio-chips">
          {STUDIO_VARS.map((v) => (
            <button key={v} className={`chip ${vars.includes(v) ? 'chip-rec' : ''}`} onClick={() => insertVar(v)}>
              {token(v)}
            </button>
          ))}
        </div>
        <span className="studio-eyebrow">Detected in template</span>
        <span className="subtle">{vars.length ? vars.map(token).join('  ') : 'No variables yet'}</span>
        <span className="studio-eyebrow">Preview values</span>
        <div className="stack-sm">
          {(['title', 'description', 'cta', 'website'] as const).map((v) => (
            <input key={v} className="input input-sm" placeholder={v} value={values[v] ?? ''} onChange={(e) => setValues({ ...values, [v]: e.target.value })} aria-label={`Preview ${v}`} />
          ))}
          {IMAGE_VARS.map((v, i) => (
            <input key={v} className="input input-sm" placeholder={`Image ${i + 1} URL`} value={values[v] ?? ''} onChange={(e) => setValues({ ...values, [v]: e.target.value })} aria-label={`Preview image ${i + 1} URL`} />
          ))}
        </div>
        <div className="grid-2">
          <button className="btn btn-pink btn-sm" disabled={!!busy || !vars.length} onClick={() => void previewVariables()}>
            {busy === 'preview' ? <Loader2 size={14} /> : <Eye size={14} />} Preview
          </button>
          <button className="btn btn-sm" disabled={!!busy || !vars.length} onClick={() => void applyValues()}>
            {busy === 'apply' ? <Loader2 size={14} /> : null} Apply values
          </button>
        </div>
      </Section>

      <Section title="Bulk from CSV" hint={`One Pin per row, added as pages. Columns named like the variables (title, description, cta, website, image_1…). Up to ${MAX_CSV_ROWS} rows.`}>
        <textarea className="input" rows={4} placeholder={'title,description,image_1\nEasy Chicken Recipe,Best Family Dinner,https://…'} value={csv} onChange={(e) => setCsv(e.target.value)} />
        <div className="grid-2">
          <button className="btn btn-sm" onClick={() => csvRef.current?.click()}>
            <FileSpreadsheet size={14} /> Load .csv
          </button>
          <button className="btn btn-sm btn-dark" disabled={!!busy || !csv.trim() || !vars.length} onClick={() => void runCsv()}>
            {busy?.startsWith('csv') ? <Loader2 size={14} /> : null} {busy?.startsWith('csv ') ? busy.slice(4) : 'Create Pins'}
          </button>
        </div>
        <input
          ref={csvRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) setCsv(await f.text());
          }}
        />
      </Section>

      <Section title="Design Generator" hint="Adds AI-written headline, subtitle and CTA layers. Existing layers stay in place.">
        <textarea className="input" rows={2} placeholder="Example: Easy high protein chicken dinner" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <button className="btn btn-pink" disabled={!!busy} onClick={() => void generate()}>
          {busy === 'ai' ? <Loader2 size={15} /> : <Sparkles size={15} />} Generate design
        </button>
      </Section>

      <Section title="Brand Kit" hint={`${kit.name} · colors, fonts and website from your Brand Kit.`}>
        <div className="studio-grid-1">
          <button className="btn btn-sm" onClick={() => ed.setDoc(applyBrand(doc, kit))}>
            Apply brand colors &amp; fonts
          </button>
          <button
            className="btn btn-sm"
            disabled={!kit.logoAssetId}
            title={kit.logoAssetId ? '' : 'Upload a logo in Brand Kit first'}
            onClick={() => {
              const k = doc.width / 1000;
              add([{ ...imagePlaceholder(doc, 0, { x: doc.width * 0.06, y: doc.height * 0.04, width: 160 * k, height: 160 * k, cornerRadius: 0 }), name: 'Logo', role: 'logo', assetId: kit.logoAssetId, fit: 'contain' }]);
            }}
          >
            Add logo
          </button>
          <button className="btn btn-sm" onClick={() => add(newFooter(doc, 'light-pill', kit.website, false, false))}>
            Add website footer
          </button>
        </div>
      </Section>

      <Section eyebrow="Section presets" title="Ready blocks" hint="A coordinated group of editable layers.">
        <div className="grid-2">
          {READY_BLOCKS.map((b) => (
            <button key={b.id} className="btn btn-sm" onClick={() => add(readyBlock(doc, b.id, kit))}>
              <span aria-hidden>{b.emoji}</span> {b.label}
            </button>
          ))}
        </div>
      </Section>

      <Section eyebrow="Elements library" title="Add elements">
        <div className="grid-2">
          {ELEMENTS.map((b) => (
            <button key={b.id} className="btn btn-sm" onClick={() => add(element(doc, b.id, kit))}>
              <span aria-hidden>{b.emoji}</span> {b.label}
            </button>
          ))}
        </div>
      </Section>

      <Section eyebrow="Basic shapes" title="Shapes">
        <div className="grid-2">
          {BASIC_SHAPES.map((b) => (
            <button key={b.id} className="btn btn-sm" onClick={() => add(basicShape(doc, b.id, kit))}>
              <span aria-hidden>{b.emoji}</span> {b.label}
            </button>
          ))}
        </div>
      </Section>

      <Section eyebrow="My studio templates" title="Saved designs" hint="Reusable in the Studio and in CSV Import.">
        {userTemplates.length ? (
          <div className="stack-sm">
            {userTemplates.slice(0, 20).map((t) => (
              <div key={t.id} className="row-between studio-saved">
                <span className="ellipsis">
                  <LayoutTemplate size={14} /> {t.name}
                </span>
                <button className="btn btn-sm" onClick={() => ed.setDoc(reId(scaleDoc(clone(t.doc), doc.width, doc.height, doc.presetId)))}>
                  Use
                </button>
              </div>
            ))}
          </div>
        ) : (
          <span className="subtle">No saved templates yet. Build a design and click Save template.</span>
        )}
      </Section>

      {preview && (
        <Modal title="Variables preview" onClose={() => setPreview(null)} footer={<button className="btn" onClick={() => setPreview(null)}><RotateCcw size={14} /> Close</button>}>
          <img src={preview} alt="Design with the preview values" style={{ width: '100%', borderRadius: 12 }} />
        </Modal>
      )}
    </div>
  );
}
