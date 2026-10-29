/**
 * "Create a template from a Pin image": drop in any Pin you like, AI recreates
 * its design as an editable template and it's saved to My Templates.
 */
import { ImagePlus, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Template } from '../model/types';
import { requirePro } from '../saas/gates';
import { requestReferenceDesigns } from '../services/aiReference';
import { useLibrary } from '../store/libraryStore';
import { useUi } from '../store/uiStore';
import { docThumbnail } from '../templates/thumbnails';
import { Modal } from '../ui/controls';

export function ReferenceTemplateModal({ onClose, onUse }: { onClose: () => void; onUse: (t: Template) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [headline, setHeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ t: Template; thumb: string }[]>([]);
  const input = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined) => {
    if (!f || !f.type.startsWith('image/')) return;
    setError('');
    setSaved([]);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);
  // Paste a screenshot straight in (Win+Shift+S, then Ctrl+V).
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith('image/'));
      if (f) {
        e.preventDefault();
        pick(f);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const create = async () => {
    if (!file || !requirePro('aiDesign')) return;
    setBusy(true);
    setError('');
    try {
      const designs = await requestReferenceDesigns(file, { headline });
      const lib = useLibrary.getState();
      const out = [];
      for (const d of designs) {
        const name = d.template.name.replace(/^AI — /, '') || 'From a Pin I like';
        const t = await lib.saveTemplate(`${name} (from image)`, d.doc, ['My Templates', 'Custom Blog Pin']);
        out.push({ t, thumb: await docThumbnail(t.doc, 300) });
      }
      setSaved(out);
      useUi.getState().toast('Saved to My Templates', 'success');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Create a template from a Pin image" onClose={onClose} wide>
      <div className="stack">
        <p className="muted">
          Drop in a Pin you like. AI recreates its design — layout, colours, fonts and text style — as an editable template in My Templates, ready for Auto Design.
          The image is used only for this and isn't stored.
        </p>
        <div className="row" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div
            className="research-drop"
            style={{ width: 220, minHeight: 300, padding: preview ? 6 : undefined }}
            role="button"
            tabIndex={0}
            onClick={() => input.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pick(e.dataTransfer.files[0]);
            }}
          >
            {preview ? (
              <img src={preview} alt="Reference Pin" style={{ maxWidth: '100%', maxHeight: 420, display: 'block' }} />
            ) : (
              <>
                <ImagePlus size={22} />
                <strong>Drop, paste or click to add a Pin image</strong>
                <span className="subtle">JPEG, PNG or WEBP</span>
              </>
            )}
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pick(e.target.files?.[0] ?? undefined)} />
          </div>
          <div className="stack grow" style={{ minWidth: 240 }}>
            <label className="stack-sm">
              <span className="section-title">Headline for the template (optional)</span>
              <input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Leave empty to use the one on the image" />
            </label>
            <button className="btn btn-pink" disabled={!file || busy} onClick={() => void create()}>
              {busy ? <Loader2 size={15} /> : <Sparkles size={15} />} {busy ? 'AI is recreating the design…' : 'Create template'}
            </button>
            {error && (
              <div className="issue" role="alert">
                {error}
              </div>
            )}
            {saved.length > 0 && (
              <div className="stack-sm">
                <span className="section-title">Saved to My Templates</span>
                <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
                  {saved.map(({ t, thumb }) => (
                    <div key={t.id} className="stack-sm" style={{ width: 150 }}>
                      {thumb && <img src={thumb} alt={t.name} style={{ width: '100%', boxShadow: 'var(--shadow-sm)' }} />}
                      <button className="btn btn-primary btn-sm" onClick={() => onUse(t)}>
                        Use template
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
