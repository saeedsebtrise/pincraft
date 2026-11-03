/**
 * CSV Import: upload a CSV (one row per Pin), pick how designs are chosen
 * (Smart Mix, one template, or a saved Studio template with {{variables}}),
 * set the posting rhythm, review the plan and create the Pins as one project.
 */
import { AlertCircle, ArrowRight, CalendarClock, Check, Download, FileSpreadsheet, Layers, Loader2, UploadCloud } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { instantiateTemplate } from '../model/docOps';
import type { AssetMeta, Id, PinDocument } from '../model/types';
import { requirePro } from '../saas/gates';
import { autoDesign } from '../services/autoDesign';
import { CSV_COLUMNS, downloadText, importImageUrl, readCsvPins, SAMPLE_CSV, schedulePins, type CsvPin } from '../services/csvImport';
import { fillAsPage, withDefaults } from '../services/studioVars';
import { siteHost } from '../services/blogImport';
import { useAssets } from '../store/assetStore';
import { useLibrary } from '../store/libraryStore';
import { allTemplates } from '../store/projectActions';
import { useUi } from '../store/uiStore';
import { inkWithCanvas, measureWithCanvas, saveAsProject } from './autoShared';

type Mode = 'smart' | 'studio';
type Method = 'mix' | 'single';
const MAX_ROWS = 100;
const SIZE = { width: 1000, height: 1500, presetId: 'pin-standard' };

const fmt = (t: number) => new Date(t).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function CsvImportPage() {
  const lib = useLibrary();
  const kit = lib.activeKit();
  const [mode, setMode] = useState<Mode>('smart');
  const [method, setMethod] = useState<Method>('mix');
  const [templateId, setTemplateId] = useState('');
  const [studioId, setStudioId] = useState('');
  const [minPerDay, setMinPerDay] = useState(4);
  const [maxPerDay, setMaxPerDay] = useState(50);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(20);
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState('');
  const [done, setDone] = useState<{ id: string; count: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useUi.getState().toast;

  const templates = useMemo(() => allTemplates(), [lib.userTemplates, lib.hiddenTemplateIds]);
  const studioTemplates = lib.userTemplates;
  const parsed = useMemo(() => (text ? readCsvPins(text) : null), [text]);
  const pins = parsed?.pins.slice(0, MAX_ROWS) ?? [];
  const times = useMemo(() => schedulePins(pins, { minPerDay, maxPerDay, startHour, endHour }), [pins, minPerDay, maxPerDay, startHour, endHour]);

  const load = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') return toast('Choose a .csv file', 'error');
    setFileName(f.name);
    setDone(null);
    setText(await f.text());
  };

  /** The Pin's website: the Brand Kit's, unless it's still the placeholder — then the row's link host. */
  const siteFor = (pin: CsvPin) => pin.values.website || (kit.website && !/yourwebsite/i.test(kit.website) ? kit.website : siteHost(pin.link) || kit.website);

  const designFor = (pin: CsvPin, i: number, ids: Id[], metas: Record<Id, AssetMeta>): PinDocument | null => {
    if (mode === 'studio') {
      const t = studioTemplates.find((x) => x.id === studioId);
      if (!t) return null;
      const images: Record<string, Id> = {};
      ids.forEach((id, j) => (images[`image_${j + 1}`] = id));
      return fillAsPage({ ...t.doc }, withDefaults(pin.values, { website: siteFor(pin) }), images);
    }
    if (method === 'single') {
      const t = templates.find((x) => x.id === templateId);
      if (!t) return null;
      return instantiateTemplate(t, { ...SIZE, headline: pin.title, website: siteFor(pin), assetIds: ids, assetMetas: metas, brand: null });
    }
    const results = autoDesign({ title: pin.title, keyword: pin.keyword, website: siteFor(pin), size: SIZE, assetIds: ids, assetMetas: metas, ctaOffset: i }, templates, { limit: 6, measure: measureWithCanvas, ink: inkWithCanvas });
    return results.length ? results[i % results.length].doc : null;
  };

  const create = async () => {
    if (!pins.length) return;
    if (mode === 'studio' && !studioId) return toast('Choose a saved Studio template', 'error');
    if (mode === 'smart' && method === 'single' && !templateId) return toast('Choose a template', 'error');
    if (pins.length > 10 && !requirePro('batchVariations')) return;
    setDone(null);
    const docs: PinDocument[] = [];
    const publish: NonNullable<import('../model/types').ProjectMeta['publish']> = [];
    const allIds: Id[] = [];
    let failed = 0;
    for (const [i, pin] of pins.entries()) {
      setBusy(`Designing Pin ${i + 1} of ${pins.length}…`);
      const ids: Id[] = [];
      for (const url of pin.images) {
        const id = await importImageUrl(url);
        if (id) ids.push(id);
      }
      allIds.push(...ids);
      const doc = designFor(pin, i, ids, useAssets.getState().metas);
      if (!doc) {
        failed++;
        continue;
      }
      docs.push(doc);
      publish.push({ board: pin.board, link: pin.link, description: pin.description, publishAt: times[i] ?? null });
    }
    setBusy('');
    if (!docs.length) return toast('No Pins could be designed from this CSV', 'error');
    const name = `CSV import — ${fileName.replace(/\.csv$/i, '') || 'pins'}`;
    const p = await saveAsProject(docs, { name, articleTitle: pins[0].title, headline: pins[0].title, templateId: mode === 'studio' ? studioId : method === 'single' ? templateId : 'csv-smart-mix', assetIds: [...new Set(allIds)] });
    if (!p) return;
    p.meta.publish = publish;
    const { repos } = await import('../storage/repositories');
    await repos.projects.put(p);
    setDone({ id: p.id, count: docs.length, failed });
  };

  return (
    <div className="dash-main csv-page">
      <div className="stack-sm" style={{ gap: 4 }}>
        <h1 className="dash-h1">CSV Import</h1>
        <p className="muted">Turn a spreadsheet into a Pinterest campaign: designs, boards and publish times for every row.</p>
      </div>

      <div className="csv-modes">
        <button className={`csv-mode ${mode === 'smart' ? 'is-on' : ''}`} aria-pressed={mode === 'smart'} onClick={() => setMode('smart')}>
          <span className="csv-mode-icon">
            <FileSpreadsheet size={18} />
          </span>
          <span className="stack-sm" style={{ gap: 2 }}>
            <strong>Smart CSV Import {mode === 'smart' && <Check size={14} />}</strong>
            <span className="subtle">Use image URLs. PinCraft picks a design for each row and spreads publish times.</span>
          </span>
        </button>
        <button className={`csv-mode ${mode === 'studio' ? 'is-on' : ''}`} aria-pressed={mode === 'studio'} onClick={() => setMode('studio')}>
          <span className="csv-mode-icon">
            <Layers size={18} />
          </span>
          <span className="stack-sm" style={{ gap: 2 }}>
            <strong>Studio Template Import {mode === 'studio' && <Check size={14} />}</strong>
            <span className="subtle">Fill a saved Studio template’s {'{{variables}}'} from each row.</span>
          </span>
        </button>
      </div>

      <div className="card csv-card">
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="stack-sm" style={{ gap: 4 }}>
            <span className="studio-eyebrow">CSV import</span>
            <h2 style={{ fontSize: 22 }}>Import your Pins</h2>
            <span className="muted">Upload your content. PinCraft prepares the designs, keeps each row’s board and link, and plans the publish times.</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-sm" onClick={() => downloadText('pincraft-sample.csv', SAMPLE_CSV)}>
              <Download size={14} /> Sample CSV
            </button>
            <a className="btn btn-sm" href={mode === 'studio' ? '#/studio' : '#/templates'}>
              {mode === 'studio' ? 'Studio' : 'Templates'} <ArrowRight size={14} />
            </a>
          </div>
        </div>

        <div
          className={`csv-drop ${drag ? 'is-drag' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void load(e.dataTransfer.files[0]);
          }}
        >
          <UploadCloud size={26} />
          <strong>{fileName || 'Drop your CSV here'}</strong>
          <span className="subtle">{parsed ? `${parsed.pins.length} Pin${parsed.pins.length === 1 ? '' : 's'} found${parsed.skipped.length ? ` · ${parsed.skipped.length} row(s) without a title skipped` : ''}` : 'One row per Pin · CSV files only'}</span>
          <button className="btn btn-pink btn-sm" onClick={() => fileRef.current?.click()}>
            Choose CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => void load(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
        </div>

        <details className="csv-help">
          <summary>CSV columns &amp; file help</summary>
          <table className="data-table">
            <tbody>
              {CSV_COLUMNS.map((c) => (
                <tr key={c.name}>
                  <td>
                    <code>{c.name}</code> {c.required && <span className="chip chip-rec">required</span>}
                  </td>
                  <td className="muted">{c.help}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="subtle">Images are downloaded from their URLs. Up to {MAX_ROWS} rows per import; Free plans can import 10 at a time.</span>
        </details>
      </div>

      <details className="card csv-card" open>
        <summary>
          <strong>Design &amp; scheduling settings</strong>
          <span className="subtle">
            {' '}
            · {mode === 'studio' ? 'Studio template' : method === 'mix' ? 'Smart Mix' : 'Single template'} · {minPerDay}–{maxPerDay} Pins per day · {startHour}:00–{endHour}:00 local time
          </span>
        </summary>
        <div className="csv-settings">
          <div className="stack-sm">
            <strong>Template assignment</strong>
            {mode === 'studio' ? (
              <>
                <span className="subtle">Each row fills the template’s {'{{title}}'}, {'{{description}}'}, {'{{cta}}'}, {'{{website}}'} and {'{{image_1}}'}… placeholders.</span>
                <select className="input" value={studioId} onChange={(e) => setStudioId(e.target.value)} aria-label="Studio template">
                  <option value="">Choose a saved Studio template…</option>
                  {studioTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {!studioTemplates.length && (
                  <span className="subtle">
                    No saved templates yet — build one in the <a href="#/studio">Design Studio</a>.
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="subtle">Smart Mix picks a fitting design for each row. Use one template for a consistent campaign look.</span>
                <select className="input" value={method} onChange={(e) => setMethod(e.target.value as Method)} aria-label="Method">
                  <option value="mix">Smart Dynamic Mix</option>
                  <option value="single">One template for every Pin</option>
                </select>
                {method === 'single' && (
                  <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)} aria-label="Template">
                    <option value="">Choose a template…</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </>
            )}
          </div>
          <div className="stack-sm">
            <strong>
              <CalendarClock size={15} /> Auto scheduling
            </strong>
            <span className="subtle">Rows with both publish_date and publish_time keep them. The rest are spread across the coming days from tomorrow.</span>
            <div className="grid-2">
              <label className="field">
                <span className="field-label">Minimum per day</span>
                <input className="input" type="number" min={1} max={100} value={minPerDay} onChange={(e) => setMinPerDay(Math.max(1, +e.target.value || 1))} />
              </label>
              <label className="field">
                <span className="field-label">Maximum per day</span>
                <input className="input" type="number" min={1} max={100} value={maxPerDay} onChange={(e) => setMaxPerDay(Math.max(1, +e.target.value || 1))} />
              </label>
              <label className="field">
                <span className="field-label">From (hour)</span>
                <input className="input" type="number" min={0} max={23} value={startHour} onChange={(e) => setStartHour(Math.min(23, Math.max(0, +e.target.value || 0)))} />
              </label>
              <label className="field">
                <span className="field-label">Until (hour)</span>
                <input className="input" type="number" min={1} max={24} value={endHour} onChange={(e) => setEndHour(Math.min(24, Math.max(startHour + 1, +e.target.value || 0)))} />
              </label>
            </div>
          </div>
        </div>
      </details>

      {pins.length > 0 && (
        <div className="card csv-card">
          <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div className="stack-sm" style={{ gap: 2 }}>
              <strong>Review {pins.length} Pin{pins.length === 1 ? '' : 's'}</strong>
              {parsed && parsed.pins.length > MAX_ROWS && <span className="subtle">Only the first {MAX_ROWS} rows are imported.</span>}
            </div>
            <button className="btn btn-pink" disabled={!!busy} onClick={() => void create()}>
              {busy ? <Loader2 size={15} /> : <Check size={15} />} {busy || `Create ${pins.length} Pin${pins.length === 1 ? '' : 's'}`}
            </button>
          </div>
          {done && (
            <div className="csv-done">
              <Check size={16} /> {done.count} Pin{done.count === 1 ? '' : 's'} created{done.failed ? ` · ${done.failed} couldn’t be designed` : ''}.{' '}
              <a href={`#/editor/${done.id}`}>Open the project →</a>
            </div>
          )}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Title</th>
                  <th>Board</th>
                  <th>Photos</th>
                  <th>Link</th>
                  <th>Publish</th>
                </tr>
              </thead>
              <tbody>
                {pins.map((p, i) => (
                  <tr key={p.row}>
                    <td className="muted">{p.row}</td>
                    <td>{p.title}</td>
                    <td>{p.board || <span className="subtle">Default board</span>}</td>
                    <td>
                      {p.images.length || (
                        <span className="subtle" title="No image URL — the design uses placeholders you can fill in the editor">
                          <AlertCircle size={13} /> none
                        </span>
                      )}
                    </td>
                    <td className="ellipsis" style={{ maxWidth: 220 }}>
                      {p.link || <span className="subtle">—</span>}
                    </td>
                    <td>
                      {fmt(times[i])} {p.fixedAt != null && <span className="chip">fixed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
