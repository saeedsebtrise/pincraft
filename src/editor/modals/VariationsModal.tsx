import { Check, Copy, Layers, Loader2, Palette, Shuffle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Project, Template } from '../../model/types';
import { recommendTemplates } from '../../services/recommend';
import { renderThumbnail } from '../../services/render';
import { useEditor } from '../../store/editorStore';
import { useLibrary } from '../../store/libraryStore';
import { allTemplates, generateBatch, makeVariation, type VariationKind } from '../../store/projectActions';
import { useUi } from '../../store/uiStore';
import { repos } from '../../storage/repositories';
import { Modal } from '../../ui/controls';

const KINDS: { id: VariationKind; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'duplicate', label: 'Exact copy', hint: 'Start a fresh Pin from this one', icon: <Copy size={18} /> },
  { id: 'shuffle-images', label: 'New images', hint: 'Same design, images reassigned', icon: <Shuffle size={18} /> },
  { id: 'swap-blocks', label: 'Swap colors', hint: 'Black ↔ white blocks and text', icon: <Palette size={18} /> },
  { id: 'next-template', label: 'New template', hint: 'Same content, next matching template', icon: <Layers size={18} /> },
];

function BatchCard({ p, checked, onToggle }: { p: Project; checked: boolean; onToggle: () => void }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    renderThumbnail(p.doc, 220).then((u) => alive && setSrc(u));
    return () => {
      alive = false;
    };
  }, [p]);
  return (
    <label className="tpl-card card" style={{ cursor: 'pointer', borderColor: checked ? 'var(--text)' : undefined }}>
      <div className="tpl-thumb">{src ? <img src={src} alt="" /> : <Loader2 />}</div>
      <div className="tpl-info">
        <span className="row">
          <input type="checkbox" checked={checked} onChange={onToggle} />
          <strong>{p.name.split(' — ').pop()}</strong>
        </span>
      </div>
    </label>
  );
}

export function VariationsModal() {
  const project = useEditor((s) => s.project!);
  const close = () => useUi.getState().set({ modal: null });
  const [batch, setBatch] = useState<Project[] | null>(null);
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const candidates = useMemo(() => {
    const imgs = Math.max(1, project.assetIds.length);
    const recs = recommendTemplates(project.meta.articleTitle || project.meta.headline || project.name, allTemplates(), { imageCount: imgs, limit: 8 }).map((r) => r.template);
    const fits = allTemplates().filter((t) => t.imageCount > 0 && t.imageCount <= imgs && t.id !== project.meta.templateId);
    const pick: Template[] = [];
    for (const t of [...recs, ...fits]) if (!pick.includes(t) && t.imageCount <= imgs && pick.length < 6) pick.push(t);
    return pick;
  }, [project]);

  const createOne = async (kind: VariationKind) => {
    const v = makeVariation(project, kind, useLibrary.getState().activeKit());
    await repos.projects.put(v);
    close();
    location.hash = `#/editor/${v.id}`;
    useUi.getState().toast('Variation created — you are now editing it', 'success');
  };

  return (
    <Modal
      title="Fresh Variation"
      wide
      onClose={close}
      footer={
        batch && (
          <>
            <span className="subtle grow">{keep.size} selected</span>
            <button className="btn" onClick={() => setBatch(null)}>
              Back
            </button>
            <button
              className="btn btn-dark"
              disabled={!keep.size || busy}
              onClick={async () => {
                setBusy(true);
                const chosen = batch.filter((p) => keep.has(p.id));
                await Promise.all(chosen.map((p) => repos.projects.put(p)));
                useUi.getState().toast(`Saved ${chosen.length} new Pin${chosen.length > 1 ? 's' : ''} to your projects`, 'success');
                close();
              }}
            >
              <Check size={15} /> Keep selected
            </button>
          </>
        )
      }
    >
      {!batch ? (
        <div className="stack">
          <span className="section-title">Create a variation of this Pin</span>
          <div className="type-grid">
            {KINDS.map((k) => (
              <button key={k.id} type="button" className="type-card" onClick={() => createOne(k.id)}>
                <div className="type-glyph">{k.icon}</div>
                <strong>{k.label}</strong>
                <span className="subtle">{k.hint}</span>
              </button>
            ))}
          </div>
          <div className="divider" />
          <span className="section-title">Batch variations</span>
          <p className="muted">Generate several designs from the same article, images and headline. Pick the ones to keep — nothing is published anywhere.</p>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {candidates.map((t) => (
              <span key={t.id} className="chip">
                {t.name}
              </span>
            ))}
          </div>
          <div>
            <button
              className="btn btn-dark"
              disabled={!candidates.length}
              onClick={() => {
                const list = generateBatch(project, candidates);
                setBatch(list);
                setKeep(new Set(list.map((p) => p.id)));
              }}
            >
              Generate {candidates.length} variations
            </button>
          </div>
          {!project.assetIds.length && <span className="subtle">Tip: upload images first so variations are filled with your photos.</span>}
        </div>
      ) : (
        <div className="tpl-grid">
          {batch.map((p) => (
            <BatchCard
              key={p.id}
              p={p}
              checked={keep.has(p.id)}
              onToggle={() =>
                setKeep((k) => {
                  const n = new Set(k);
                  if (n.has(p.id)) n.delete(p.id);
                  else n.add(p.id);
                  return n;
                })
              }
            />
          ))}
        </div>
      )}
    </Modal>
  );
}
