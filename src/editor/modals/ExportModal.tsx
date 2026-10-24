import { CheckCircle2, Download, FileImage, Image as ImageIcon, Loader2, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { readHeadline } from '../../model/docOps';
import { normalizeProject } from '../../model/factory';
import { exportFilename, sanitizeFilename, type ExportFormat } from '../../services/filename';
import { docTextLayers, ensureFonts } from '../../services/fonts';
import { downloadBlob, encodeCanvas, renderForExport, sampleTextBackgrounds, webpSupported, type ExportResult } from '../../services/render';
import { useEditor } from '../../store/editorStore';
import { useUi } from '../../store/uiStore';
import { Field, Modal, Seg, Toggle } from '../../ui/controls';
import { BrandMark } from '../../ui/BrandMark';
import { IssueList, useDesignIssues } from '../properties/PropertiesPanel';

const countKey = (id: string) => `pinforge.exportCount.${id}`;
const readCount = (id: string) => {
  try {
    return Number(localStorage.getItem(countKey(id)) ?? '0');
  } catch {
    return 0;
  }
};
const bumpCount = (id: string, by: number) => {
  try {
    localStorage.setItem(countKey(id), String(readCount(id) + by));
  } catch {
    /* ignore */
  }
};

const FORMATS: { id: ExportFormat; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'png', label: 'PNG', hint: 'Best Quality', icon: <ImageIcon size={22} /> },
  { id: 'jpeg', label: 'JPEG', hint: 'Smaller Size', icon: <FileImage size={22} /> },
  { id: 'webp', label: 'WEBP', hint: 'Web Optimized', icon: <Zap size={22} /> },
];

const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

export function ExportModal() {
  const project = useEditor((s) => s.project!);
  const doc = project.doc;
  const pageCount = project.pages.length;
  const close = () => useUi.getState().set({ modal: null });
  const webp = useMemo(webpSupported, []);
  const [format, setFormat] = useState<ExportFormat>(() => {
    const f = useUi.getState().exportFormat;
    return f === 'webp' && !webp ? 'png' : f;
  });
  const [quality, setQuality] = useState(92);
  const [scope, setScope] = useState<'page' | 'all'>('page');
  const [transparent, setTransparent] = useState(doc.background.type === 'transparent');
  const base = readHeadline(doc) || project.meta.headline || project.name;
  const [filename, setFilename] = useState(() => exportFilename(base, readCount(project.id) + 1, format));
  const [touched, setTouched] = useState(false);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [preview, setPreview] = useState('');
  const [estimate, setEstimate] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sampled, setSampled] = useState<Record<string, string> | undefined>();
  const [failedFonts, setFailedFonts] = useState<string[]>([]);
  const keepAlpha = format === 'png' && transparent && doc.background.type === 'transparent';
  const extra = useMemo(() => ({ sampled, failedFonts }), [sampled, failedFonts]);
  const issues = useDesignIssues(doc, extra);

  useEffect(() => {
    useUi.getState().set({ exportFormat: format });
    setFilename((f) => (touched ? sanitizeFilename(f, format) : exportFilename(base, readCount(project.id) + 1, format)));
  }, [format]);

  // Render once at full resolution; re-encode when format/quality changes to show the real file size.
  useEffect(() => {
    let alive = true;
    setCanvas(null);
    setError(null);
    (async () => {
      try {
        setFailedFonts(await ensureFonts(docTextLayers(doc)));
        const c = await renderForExport(doc, keepAlpha);
        if (!alive) return;
        setCanvas(c);
        const small = document.createElement('canvas');
        small.width = 240;
        small.height = Math.round((240 * c.height) / c.width);
        small.getContext('2d')!.drawImage(c, 0, 0, small.width, small.height);
        setPreview(small.toDataURL('image/png'));
        const s = await sampleTextBackgrounds(doc);
        if (alive) setSampled(s);
      } catch (e) {
        if (alive) setError(`Export failed: ${(e as Error).message}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [doc, keepAlpha]);

  useEffect(() => {
    if (!canvas) return;
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const r = await encodeCanvas(canvas, format, quality / 100);
        if (alive) setEstimate(r);
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [canvas, format, quality]);

  const downloadPage = () => {
    if (!estimate) return;
    if (estimate.width !== doc.width || estimate.height !== doc.height) {
      setError('Size verification failed — export cancelled.');
      return;
    }
    const name = sanitizeFilename(filename, format);
    downloadBlob(estimate.blob, name);
    bumpCount(project.id, 1);
    setDone(`Exported ${estimate.width}×${estimate.height} ${format.toUpperCase()} (${kb(estimate.blob.size)}) — dimensions verified.`);
    useUi.getState().toast(`Downloaded ${name}`, 'success');
  };

  const downloadAll = async () => {
    setBusy(true);
    setError(null);
    try {
      const pages = normalizeProject(useEditor.getState().project!).pages;
      const stem = sanitizeFilename(filename, format).replace(/-pin-\d+\.\w+$/, '').replace(/\.\w+$/, '');
      let n = 0;
      for (const [i, page] of pages.entries()) {
        await ensureFonts(docTextLayers(page));
        const c = await renderForExport(page, format === 'png' && transparent && page.background.type === 'transparent');
        const r = await encodeCanvas(c, format, quality / 100);
        if (r.width !== page.width || r.height !== page.height) throw new Error(`Page ${i + 1} size verification failed`);
        downloadBlob(r.blob, `${stem}-pin-${String(i + 1).padStart(2, '0')}.${format === 'jpeg' ? 'jpg' : format}`);
        n++;
        await new Promise((res) => setTimeout(res, 350)); // let the browser start each download
      }
      bumpCount(project.id, n);
      setDone(`Exported ${n} Pins as ${format.toUpperCase()} — every file's dimensions verified.`);
    } catch (e) {
      setError(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Export Your Pin" onClose={close}>
      <div className="stack export-modal">
        <div className="row export-brand">
          <BrandMark size={30} />
          <strong>PinCraft</strong>
        </div>
        <div className="stack-sm">
          <span className="field-label-strong">File Format</span>
          <div className="format-grid" role="radiogroup" aria-label="File format">
            {FORMATS.filter((f) => f.id !== 'webp' || webp).map((f) => (
              <button key={f.id} type="button" role="radio" aria-checked={format === f.id} className="format-card" onClick={() => setFormat(f.id)}>
                {f.icon}
                <span>
                  <strong>{f.label}</strong>
                  <small>{f.hint}</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="stack-sm">
          <span className="field-label-strong">Image Quality</span>
          <div className="row">
            <input
              className="grow"
              type="range"
              min={80}
              max={100}
              value={format === 'png' ? 100 : quality}
              disabled={format === 'png'}
              onChange={(e) => setQuality(Number(e.target.value))}
              aria-label="Image quality"
            />
            <span className="value-box">{format === 'png' ? 100 : quality}%</span>
          </div>
          {format === 'png' && <span className="subtle">PNG is lossless — always full quality.</span>}
        </div>

        {format === 'png' && doc.background.type === 'transparent' && <Toggle label="Transparent background" checked={transparent} onChange={setTransparent} />}
        {format !== 'png' && doc.background.type === 'transparent' && <span className="subtle">{format.toUpperCase()} has no transparency; the background will be white.</span>}

        {pageCount > 1 && (
          <Seg
            label="Pages to export"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'page', label: `This page (${project.activePage + 1})`, title: 'Export the page you are editing' },
              { value: 'all', label: `All ${pageCount} pages`, title: 'Download every page as its own file' },
            ]}
          />
        )}

        <Field label="File Name">
          <input
            className="input"
            value={filename}
            onChange={(e) => {
              setTouched(true);
              setFilename(e.target.value);
            }}
            onBlur={() => setFilename(sanitizeFilename(filename, format))}
          />
        </Field>

        <div className="export-preview">
          <span className="field-label-strong">Preview</span>
          <div className="export-preview-body">
            {preview ? <img src={preview} alt="Export preview" /> : <span className="export-preview-blank"><Loader2 /></span>}
            <dl>
              <dt>Dimensions</dt>
              <dd>
                {doc.width} × {doc.height} px
              </dd>
              <dt>File Size</dt>
              <dd>{estimate ? kb(estimate.blob.size) : 'Rendering…'}</dd>
            </dl>
          </div>
        </div>

        {error && <div className="issue">{error}</div>}
        {done && (
          <div className="ok-box">
            <CheckCircle2 size={14} /> {done} No watermark.
          </div>
        )}

        <button
          className="btn btn-export btn-lg btn-block"
          onClick={scope === 'all' && pageCount > 1 ? downloadAll : downloadPage}
          disabled={busy || (scope === 'page' && !estimate)}
        >
          {busy || (scope === 'page' && !estimate) ? <Loader2 size={18} /> : <Download size={18} />}
          {scope === 'all' && pageCount > 1 ? `Download ${pageCount} Pins` : 'Download Pin'}
        </button>

        <details className="stack-sm">
          <summary className="field-label-strong">Before you export ({issues.length} {issues.length === 1 ? 'note' : 'notes'})</summary>
          <IssueList
            issues={issues}
            onPick={(i) => {
              if (i.layerId) {
                useEditor.getState().select([i.layerId]);
                close();
              }
            }}
          />
        </details>
      </div>
    </Modal>
  );
}
