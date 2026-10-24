import { Copy, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PinDocument } from '../../model/types';
import { renderThumbnail } from '../../services/render';
import { useEditor } from '../../store/editorStore';

// Rendered thumbnails are cached per document snapshot (documents are immutable).
const thumbCache = new WeakMap<PinDocument, Promise<string>>();
function pageThumb(doc: PinDocument): Promise<string> {
  let t = thumbCache.get(doc);
  if (!t) {
    t = renderThumbnail(doc, 132).catch(() => '');
    thumbCache.set(doc, t);
  }
  return t;
}

function PageThumb({ doc, live }: { doc: PinDocument; live: boolean }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    // The page being edited changes on every edit, so wait for a pause before re-rendering it.
    const timer = setTimeout(() => pageThumb(doc).then((u) => alive && u && setSrc(u)), live ? 700 : 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [doc, live]);
  return src ? <img src={src} alt="" /> : <span className="page-blank" style={{ aspectRatio: `${doc.width} / ${doc.height}` }} />;
}

/** Pages: several Pins in one project (e.g. different designs for the same article). */
export function PageStrip() {
  const project = useEditor((s) => s.project!);
  const ed = useEditor.getState();
  const pages = project.pages.map((p, i) => (i === project.activePage ? project.doc : p));
  return (
    <div className="page-strip" role="tablist" aria-label="Pages">
      {pages.map((doc, i) => (
        <div key={i} className="page-item">
          <button
            type="button"
            role="tab"
            className="page-thumb"
            aria-selected={i === project.activePage}
            aria-label={`Page ${i + 1}`}
            onClick={() => ed.goToPage(i)}
          >
            <PageThumb doc={doc} live={i === project.activePage} />
          </button>
          <span className="page-num">{i + 1}</span>
          <div className="page-actions">
            <button type="button" className="icon-btn" aria-label={`Duplicate page ${i + 1}`} data-tip="Duplicate page" data-tip-pos="top" onClick={() => ed.duplicatePage(i)}>
              <Copy size={13} />
            </button>
            {pages.length > 1 && (
              <button
                type="button"
                className="icon-btn"
                aria-label={`Delete page ${i + 1}`}
                data-tip="Delete page"
                data-tip-pos="top"
                onClick={() => confirm(`Delete page ${i + 1}? This can't be undone.`) && ed.deletePage(i)}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="button" className="page-add" onClick={() => ed.addPage()}>
        <Plus size={22} />
        Add Page
      </button>
    </div>
  );
}
