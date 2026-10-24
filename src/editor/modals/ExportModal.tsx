import { CheckCircle2, Download, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { readHeadline } from '../../model/docOps';
import { exportFilename, sanitizeFilename, type ExportFormat } from '../../services/filename';
import { docTextLayers, ensureFonts } from '../../services/fonts';
import { downloadBlob, encodeCanvas, renderForExport, sampleTextBackgrounds, webpSupported, type ExportResult } from '../../services/render';
import { useEditor } from '../../store/editorStore';
import { useUi } from '../../store/uiStore';
import { Field, Modal, RangeField, Seg, Toggle } from '../../ui/controls';
import { IssueList, useDesignIssues } from '../properties/PropertiesPanel';

const countKey = (id: string) => `pinforge.exportCount.${id}`;
const readCount = (id: string) => {
  try {
    return Number(localStorage.getItem(countKey(id)) ?? '0');
  } catch {
    return 0;
  }
};

export function ExportModal() {
  const project = useEditor((s) => s.project!);
  const doc = project.doc;
  const close = () => useUi.getState().set({ modal: null });
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(92);
  const [transparent, setTransparent] = useState(doc.background.type === 'transparent');
  const base = readHeadline(doc) || project.meta.headline || project.name;
  const [filename, setFilename] = useState(() => exportFilename(base, readCount(project.id) + 1, 'png'));
  const [touched, setTouched] = useState(false);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [estimate, setEstimate] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ExportResult | null>(null);
  const [sampled, setSampled] = useState<Record<string, string> | undefined>();
  const [failedFonts, setFailedFonts] = useState<string[]>([]);
  const webp = useMemo(webpSupported, []);
  const keepAlpha = format === 'png' && transparent && doc.background.type === 'transparent';
  const extra = useMemo(() => ({ sampled, failedFonts }), [sampled, failedFonts]);
  const issues = useDesignIssues(doc, extra);

  useEffect(() => {
    if (!touched) setFilename(exportFilename(base, readCount(project.id) + 1, format));
    else setFilename((f) => sanitizeFilename(f, format));
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
        if (alive) setCanvas(c);
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

  const download = () => {
    if (!estimate) return;
    if (estimate.width !== doc.width || estimate.height !== doc.height) {
      setError('Size verification failed — export cancelled.');
      return;
    }
    const name = sanitizeFilename(filename, format);
    downloadBlob(estimate.blob, name);
    try {
      localStorage.setItem(countKey(project.id), String(readCount(project.id) + 1));
    } catch {
      /* ignore */
    }
    setDone(estimate);
    useUi.getState().toast(`Downloaded ${name}`, 'success');
  };

  return (
    <Modal
      title="Export Pin"
      onClose={close}
      footer={
        <>
          <button className="btn" onClick={close}>
            Close
          </button>
          <button className="btn btn-primary" onClick={download} disabled={!estimate}>
            {estimate ? <Download size={16} /> : <Loader2 size={16} />} Download Pin
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="row-between">
          <Seg
            label="Format"
            value={format}
            onChange={setFormat}
            options={[
              { value: 'png', label: 'PNG', title: 'PNG — highest quality (default)' },
              { value: 'jpeg', label: 'JPEG', title: 'JPEG — smaller file' },
              ...(webp ? [{ value: 'webp' as const, label: 'WEBP', title: 'WEBP — smallest file' }] : []),
            ]}
          />
          <span className="chip chip-rec">
            {doc.width} × {doc.height} px · exact size
          </span>
        </div>
        {format !== 'png' && (
          <RangeField label={`${format.toUpperCase()} quality`} min={80} max={100} value={quality} onChange={setQuality} format={(v) => `${v}%`} />
        )}
        {format === 'png' && doc.background.type === 'transparent' && <Toggle label="Transparent background" checked={transparent} onChange={setTransparent} />}
        {format !== 'png' && doc.background.type === 'transparent' && <span className="subtle">{format.toUpperCase()} has no transparency; the background will be white.</span>}
        <Field label="Filename">
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
        <div className="row subtle">
          {!estimate && !error && (
            <>
              <Loader2 size={14} /> Rendering at full resolution…
            </>
          )}
          {estimate && (
            <>
              Estimated file size: <strong>{(estimate.blob.size / 1024).toFixed(0)} KB</strong>
              {format !== 'png' && quality < 88 && ' · lower quality may show artifacts around text'}
            </>
          )}
        </div>
        {error && <div className="issue">{error}</div>}
        {done && (
          <div className="ok-box">
            <CheckCircle2 size={14} /> Exported {done.width}×{done.height} {format.toUpperCase()} ({(done.blob.size / 1024).toFixed(0)} KB) — dimensions verified. No watermark.
          </div>
        )}
        <div className="stack-sm">
          <span className="section-title">Before you export</span>
          <IssueList issues={issues} onPick={(i) => {
            if (i.layerId) {
              useEditor.getState().select([i.layerId]);
              close();
            }
          }} />
        </div>
      </div>
    </Modal>
  );
}
