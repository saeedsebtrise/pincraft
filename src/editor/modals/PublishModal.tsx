/**
 * Publish the open Pin to Pinterest: pick a board, check the title,
 * description, link and alt text, and it goes straight to the connected
 * Pinterest account.
 */
import { ExternalLink, Loader2, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PinterestNotConnected } from '../../dashboard/AccountPages';
import { readHeadline } from '../../model/docOps';
import { ensureCanExport } from '../../saas/gates';
import { docTextLayers, ensureFonts } from '../../services/fonts';
import { defaultBoard, publishPin, usePinterest } from '../../services/pinterest';
import { renderForExport } from '../../services/render';
import { useEditor } from '../../store/editorStore';
import { useUi } from '../../store/uiStore';
import { Field, Modal } from '../../ui/controls';

/** Largest image (base64 characters) sent in one request — hosting caps requests at 4.5 MB. */
const MAX_B64 = 4_000_000;

/** The Pin as a JPEG small enough to send, as base64 (quality steps down until it fits). */
export async function pinImage(canvas: HTMLCanvasElement): Promise<{ data: string; preview: string }> {
  let url = '';
  for (const q of [0.92, 0.85, 0.75, 0.65]) {
    url = canvas.toDataURL('image/jpeg', q);
    if (url.length - url.indexOf(',') - 1 <= MAX_B64) break;
  }
  return { data: url.slice(url.indexOf(',') + 1), preview: url };
}

export function PublishModal() {
  const project = useEditor((s) => s.project!);
  const doc = project.doc;
  const pin = usePinterest();
  const close = () => useUi.getState().set({ modal: null });
  const headline = readHeadline(doc) || project.meta.headline || project.name;
  const [title, setTitle] = useState(headline.slice(0, 100));
  const [description, setDescription] = useState(() => {
    const t = project.meta.articleTitle?.trim();
    return (t && t.toLowerCase() !== headline.toLowerCase() ? `${t}. ` : '') + `Save this Pin for later.`;
  });
  const [link, setLink] = useState(project.meta.articleUrl ?? '');
  const [alt, setAlt] = useState(headline);
  const [boardId, setBoardId] = useState('');
  const [image, setImage] = useState<{ data: string; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    void pin.refresh().then(async () => {
      const s = usePinterest.getState();
      if (!s.connected) return;
      const boards = s.boardsLoaded ? s.boards : await s.loadBoards().catch(() => []);
      setBoardId(defaultBoard(boards)?.id ?? '');
    });
    let alive = true;
    (async () => {
      try {
        await ensureFonts(docTextLayers(doc));
        const c = await renderForExport(doc, false);
        const img = await pinImage(c);
        if (alive) setImage(img);
      } catch (e) {
        if (alive) setError(`Couldn’t prepare the Pin image: ${(e as Error).message}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const linkOk = !link.trim() || /^https?:\/\/\S+\.\S+/i.test(link.trim());
  const publish = async () => {
    if (!image || !boardId) return;
    if (!(await ensureCanExport(1))) return;
    setBusy(true);
    setError('');
    try {
      const out = await publishPin({ boardId, title: title.trim(), description: description.trim(), link: link.trim(), altText: alt.trim(), image: { mediaType: 'image/jpeg', data: image.data } });
      setDone(out.url);
      useUi.getState().toast('Pin published to Pinterest', 'success');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Publish to Pinterest"
      onClose={close}
      wide
      footer={
        pin.connected && !done ? (
          <>
            <button className="btn" onClick={close}>
              Cancel
            </button>
            <button className="btn btn-pink" disabled={!image || !boardId || !title.trim() || !linkOk || busy} onClick={() => void publish()}>
              {busy ? <Loader2 size={15} /> : <Send size={15} />} {busy ? 'Publishing…' : 'Publish Pin'}
            </button>
          </>
        ) : undefined
      }
    >
      {!pin.connected ? (
        pin.configured === null || pin.loading ? (
          <div className="act-empty">
            <Loader2 size={20} /> Checking your Pinterest connection…
          </div>
        ) : (
          <PinterestNotConnected what="Pins are published to your connected Pinterest account." />
        )
      ) : done ? (
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center', padding: 20 }}>
          <strong style={{ fontSize: 18 }}>Your Pin is live on Pinterest 🎉</strong>
          <span className="muted">It was added to “{pin.boards.find((b) => b.id === boardId)?.name}”.</span>
          <div className="row" style={{ gap: 8 }}>
            <a className="btn btn-pink" href={done} target="_blank" rel="noopener noreferrer">
              View on Pinterest <ExternalLink size={14} />
            </a>
            <button className="btn" onClick={close}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="publish-grid">
          <div className="stack-sm">
            {image ? <img src={image.preview} alt="Pin preview" className="publish-preview" /> : <div className="act-empty">Preparing image…</div>}
            {pin.account && <span className="subtle">Publishing as @{pin.account.username}</span>}
          </div>
          <div className="stack">
            <Field label="Board">
              <select className="select" value={boardId} onChange={(e) => setBoardId(e.target.value)}>
                {!pin.boards.length && <option value="">No boards — create one on the Boards page</option>}
                {pin.boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.privacy === 'SECRET' ? ' (secret)' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Title (${title.length}/100)`}>
              <input className="input" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label={`Description (${description.length}/800)`}>
              <textarea className="textarea" rows={4} maxLength={800} value={description} onChange={(e) => setDescription(e.target.value)} />
              <span className="subtle">Use your main keyword naturally — Pinterest search reads it.</span>
            </Field>
            <Field label="Destination link">
              <input className="input" value={link} placeholder="https://yourblog.com/post" onChange={(e) => setLink(e.target.value)} />
              {!linkOk && <span className="issue">Use a full link starting with https://</span>}
            </Field>
            <Field label="Alt text">
              <input className="input" value={alt} maxLength={500} onChange={(e) => setAlt(e.target.value)} />
              <span className="subtle">Describes the image for people using screen readers.</span>
            </Field>
            {error && <div className="issue">{error}</div>}
          </div>
        </div>
      )}
    </Modal>
  );
}
