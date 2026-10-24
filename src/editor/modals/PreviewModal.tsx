import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FEED_PREVIEW_WIDTH } from '../../config/colors';
import { renderThumbnail } from '../../services/render';
import { useEditor } from '../../store/editorStore';
import { useUi } from '../../store/uiStore';
import { Modal } from '../../ui/controls';

/** Full-size view plus a mock mobile home feed at real feed column width. */
export function PreviewModal() {
  const doc = useEditor((s) => s.project!.doc);
  const [full, setFull] = useState('');
  const [feed, setFeed] = useState('');
  useEffect(() => {
    let alive = true;
    renderThumbnail(doc, Math.min(doc.width, 640)).then((u) => alive && setFull(u));
    renderThumbnail(doc, FEED_PREVIEW_WIDTH * 2).then((u) => alive && setFeed(u));
    return () => {
      alive = false;
    };
  }, [doc]);
  const ratio = doc.height / doc.width;
  const fake = (h: number, i: number) => <div key={i} className="feed-fake" style={{ height: h }} />;

  return (
    <Modal title="Preview" wide onClose={() => useUi.getState().set({ modal: null })}>
      <div className="preview-wrap">
        <div className="stack-sm" style={{ alignItems: 'center' }}>
          <span className="section-title">Full design</span>
          {full ? <img src={full} alt="Full-size Pin preview" style={{ width: 'min(380px, 80vw)', boxShadow: 'var(--canvas-shadow)' }} /> : <Loader2 />}
          <span className="subtle">
            {doc.width}×{doc.height}px
          </span>
        </div>
        <div className="stack-sm" style={{ alignItems: 'center' }}>
          <span className="section-title">Mobile feed ({FEED_PREVIEW_WIDTH}px column)</span>
          <div className="feed-mock" style={{ width: FEED_PREVIEW_WIDTH * 2 + 34 }}>
            <div className="stack-sm">
              {fake(130, 0)}
              <div className="feed-pin" style={{ height: FEED_PREVIEW_WIDTH * Math.min(ratio, 2.1) }}>
                {feed ? <img src={feed} alt="Your Pin at feed size" style={{ width: FEED_PREVIEW_WIDTH, height: '100%', objectFit: 'cover', objectPosition: 'top' }} /> : null}
              </div>
              {fake(180, 1)}
            </div>
            <div className="stack-sm">
              {fake(220, 2)}
              {fake(160, 3)}
              {fake(120, 4)}
            </div>
          </div>
          <span className="subtle" style={{ maxWidth: 360, textAlign: 'center' }}>
            Can you read the headline at this size? If not, make it bigger or shorter.
            {ratio > 1.5 + 0.01 && ' Pins taller than 2:3 may be cropped in the feed — this preview shows the top portion.'}
          </span>
        </div>
      </div>
    </Modal>
  );
}
