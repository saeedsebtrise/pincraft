/**
 * Video Pins: make short vertical videos from blog/product links (photos +
 * points + CTA, in the brand's colors and fonts), or upload an existing video;
 * then add the Pin details, schedule or publish, and track them in a library.
 */
import { CalendarClock, Check, Clapperboard, Download, Film, Link2, Loader2, Send, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchPage, importPagePhotos, looksLikeUrl, normalizeUrl } from '../services/blogImport';
import { defaultBoard, publishVideoPin, usePinterest } from '../services/pinterest';
import { matchFormat, probeVideo, renderVideo, STORY_FORMATS, storySlides, videoRepo, type StoryFormat, type VideoPin } from '../services/videoMaker';
import { newId } from '../model/factory';
import { useLibrary } from '../store/libraryStore';
import { useUi } from '../store/uiStore';
import { Modal } from '../ui/controls';

const MAX_LINKS = 10;
const MAX_UPLOAD = 200 * 1024 * 1024;

function blankVideo(p: Partial<VideoPin> & Pick<VideoPin, 'blob' | 'mime' | 'duration' | 'cover' | 'source'>): VideoPin {
  return { id: newId('vid_'), createdAt: Date.now(), title: '', description: '', link: '', boardId: '', altText: '', aiMade: false, relationship: 'none', status: 'draft', publishAt: null, ...p };
}

const fmtTime = (t: number) => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const localTime = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

async function publish(v: VideoPin, onStep?: (s: string) => void): Promise<VideoPin> {
  try {
    const pin = await publishVideoPin({ boardId: v.boardId, title: v.title, description: v.description, link: v.link, altText: v.altText, video: v.blob }, (s) => onStep?.(s));
    const next = { ...v, status: 'published' as const, pinUrl: pin.url, error: undefined };
    await videoRepo.put(next);
    return next;
  } catch (e) {
    const next = { ...v, status: 'failed' as const, error: (e as Error).message };
    await videoRepo.put(next);
    return next;
  }
}

/** A <video> for a stored Blob; the object URL is released when it unmounts. */
function BlobVideo({ blob, ...rest }: { blob: Blob } & React.VideoHTMLAttributes<HTMLVideoElement>) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setSrc(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return src ? <video src={src} {...rest} /> : null;
}

function downloadVideo(v: VideoPin) {
  const u = URL.createObjectURL(v.blob);
  const a = Object.assign(document.createElement('a'), { href: u, download: `${(v.title || 'video-pin').replace(/[^\w-]+/g, '-')}.${v.mime.includes('mp4') ? 'mp4' : 'webm'}` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

// ---------------------------------------------------------------- Pin details form

function VideoPinForm({ video, onDone, compact }: { video: VideoPin; onDone: (v: VideoPin) => void; compact?: boolean }) {
  const pin = usePinterest();
  const [v, setV] = useState<VideoPin>(video);
  const [later, setLater] = useState(video.publishAt != null || !pin.connected);
  const soon = Date.now() + 3_600_000;
  const [date, setDate] = useState(localDate(video.publishAt ?? soon));
  const [time, setTime] = useState(localTime(video.publishAt ?? soon));
  const [own, setOwn] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState('');
  const toast = useUi.getState().toast;
  useEffect(() => setV(video), [video]);
  useEffect(() => {
    if (pin.connected && !pin.boardsLoaded) void pin.loadBoards().catch(() => undefined);
  }, [pin.connected]);
  useEffect(() => {
    if (!v.boardId && pin.boards.length) setV((x) => ({ ...x, boardId: defaultBoard(pin.boards)?.id ?? '' }));
  }, [pin.boards]);
  const set = (p: Partial<VideoPin>) => setV((x) => ({ ...x, ...p }));
  const at = new Date(`${date}T${time}`).getTime();
  const ready = own && checked && v.title.trim() && (later ? Number.isFinite(at) : pin.connected && v.boardId);

  const approve = async () => {
    if (v.link && !/^https?:\/\//i.test(v.link)) return toast('The link must start with http:// or https://', 'error');
    if (later) {
      if (at < Date.now()) return toast('Pick a time in the future', 'error');
      const next = { ...v, status: 'scheduled' as const, publishAt: at, error: undefined };
      await videoRepo.put(next);
      toast(`Video scheduled for ${fmtTime(at)}`, 'success');
      onDone(next);
      return;
    }
    setBusy('Uploading…');
    const next = await publish({ ...v, publishAt: null }, (s) => setBusy(s === 'processing' ? 'Pinterest is processing…' : s === 'publishing' ? 'Publishing…' : 'Uploading…'));
    setBusy('');
    toast(next.status === 'published' ? 'Video Pin published' : next.error ?? 'Publishing failed', next.status === 'published' ? 'success' : 'error');
    onDone(next);
  };

  return (
    <div className={`stack video-form ${compact ? 'is-compact' : ''}`}>
      <label className="field">
        <span className="field-label row-between">
          Title <span className="subtle">{v.title.length}/100</span>
        </span>
        <input className="input" maxLength={100} placeholder="Give people a reason to watch" value={v.title} onChange={(e) => set({ title: e.target.value })} />
      </label>
      <label className="field">
        <span className="field-label row-between">
          Description <span className="subtle">{v.description.length}/800</span>
        </span>
        <textarea className="input" rows={3} maxLength={800} placeholder="What will people discover in this video?" value={v.description} onChange={(e) => set({ description: e.target.value })} />
      </label>
      <label className="field">
        <span className="field-label">Destination link</span>
        <input className="input" placeholder="https://yourwebsite.com/product-or-post" value={v.link} onChange={(e) => set({ link: e.target.value.trim() })} />
      </label>
      <label className="field">
        <span className="field-label">Board</span>
        <select className="input" value={v.boardId} onChange={(e) => set({ boardId: e.target.value })} disabled={!pin.connected}>
          <option value="">{pin.connected ? 'Choose a Pinterest board' : 'Connect Pinterest to load boards'}</option>
          {pin.boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {!pin.connected && (
          <span className="subtle">
            Connect Pinterest to load boards. <a href="#/settings?tab=pinterest">Open Settings →</a>
          </span>
        )}
      </label>
      <label className="field">
        <span className="field-label row-between">
          Accessibility description <span className="subtle">Optional</span>
        </span>
        <input className="input" maxLength={500} placeholder="Describe what is shown in your video" value={v.altText} onChange={(e) => set({ altText: e.target.value })} />
      </label>

      <div className="stack-sm">
        <strong>Choose your moment</strong>
        <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
          <label className="row" style={{ gap: 6 }}>
            <input type="radio" checked={later} onChange={() => setLater(true)} /> Schedule for later
          </label>
          <label className="row" style={{ gap: 6 }}>
            <input type="radio" checked={!later} onChange={() => setLater(false)} disabled={!pin.connected} /> Publish now
          </label>
        </div>
        {later && (
          <div className="grid-2">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time" />
          </div>
        )}
        <span className="subtle">
          Your local time. Scheduled videos publish automatically while PinCraft is open (and you can publish any of them now from the list).
        </span>
        <label className="row" style={{ gap: 6 }}>
          <input type="checkbox" checked={v.aiMade} onChange={(e) => set({ aiMade: e.target.checked })} /> This video was made or modified with AI.
        </label>
      </div>

      <div className="video-confirm">
        <span className="studio-eyebrow">Publishing confirmation</span>
        <span className="subtle">Review this Pin before approving it for Pinterest.</span>
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} /> I own or have permission to publish this content and media.
        </label>
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} /> I checked that the destination page works and matches this Pin.
        </label>
        <label className="field">
          <span className="field-label">Content relationship</span>
          <select className="input" value={v.relationship} onChange={(e) => set({ relationship: e.target.value as VideoPin['relationship'] })}>
            <option value="none">Not commercial or sponsored</option>
            <option value="affiliate">Contains affiliate links</option>
            <option value="sponsored">Paid partnership / sponsored</option>
          </select>
        </label>
      </div>

      <button className="btn btn-pink btn-lg" disabled={!ready || !!busy} onClick={() => void approve()}>
        {busy ? <Loader2 size={16} /> : later ? <CalendarClock size={16} /> : <Send size={16} />} {busy || (later ? 'Approve & schedule video' : 'Approve & publish video')}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- page

export function VideoPinsPage() {
  const [tab, setTab] = useState<'create' | 'upload'>('create');
  const [videos, setVideos] = useState<VideoPin[]>([]);
  const [editing, setEditing] = useState<VideoPin | null>(null);
  const [playing, setPlaying] = useState<VideoPin | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const pin = usePinterest();
  const reload = useCallback(() => void videoRepo.list().then(setVideos), []);
  useEffect(reload, [reload]);
  useEffect(() => {
    if (pin.configured === null) void pin.refresh();
  }, []);

  // Publishes scheduled videos whose time has come (while this page is open and Pinterest is connected).
  const busyRef = useRef(false);
  useEffect(() => {
    if (!pin.connected) return;
    const tick = async () => {
      if (busyRef.current) return;
      const due = (await videoRepo.list()).filter((v) => v.status === 'scheduled' && v.publishAt != null && v.publishAt <= Date.now() && v.boardId);
      if (!due.length) return;
      busyRef.current = true;
      for (const v of due) {
        setPublishing(v.id);
        const r = await publish(v);
        useUi.getState().toast(r.status === 'published' ? `Published “${v.title}”` : `“${v.title}”: ${r.error}`, r.status === 'published' ? 'success' : 'error');
      }
      setPublishing(null);
      busyRef.current = false;
      reload();
    };
    void tick();
    const id = setInterval(() => void tick(), 60_000);
    return () => clearInterval(id);
  }, [pin.connected, reload]);

  const counts = useMemo(() => ({ draft: videos.filter((v) => v.status === 'draft').length, scheduled: videos.filter((v) => v.status === 'scheduled').length, published: videos.filter((v) => v.status === 'published').length }), [videos]);

  return (
    <div className="dash-main video-page">
      <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div className="stack-sm" style={{ gap: 6 }}>
          <span className="studio-eyebrow">
            <Clapperboard size={13} /> Video Pins
          </span>
          <h1 className="dash-h1">Your content. Now in motion.</h1>
          <p className="muted">Create video Pins from your products and posts, with your photos, text and brand.</p>
        </div>
      </div>

      <div className="video-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'create'} className={tab === 'create' ? 'is-on' : ''} onClick={() => setTab('create')}>
          Create from content
        </button>
        <button role="tab" aria-selected={tab === 'upload'} className={tab === 'upload' ? 'is-on' : ''} onClick={() => setTab('upload')}>
          Upload an existing video
        </button>
      </div>

      {tab === 'create' ? (
        <div className="video-grid">
          <CreateFromLinks
            onMade={(v) => {
              reload();
              setEditing(v);
            }}
          />
          <div className="card video-card">
            <strong>Your videos</strong>
            <span className="subtle">Review, edit and schedule your videos.</span>
            <div className="video-stats">
              <span>
                <b>{counts.draft}</b> ready
              </span>
              <span>
                <b>{counts.scheduled}</b> scheduled
              </span>
              <span>
                <b>{counts.published}</b> published
              </span>
            </div>
          </div>
        </div>
      ) : (
        <UploadVideo
          onSaved={() => {
            reload();
          }}
        />
      )}

      <div className="stack-sm">
        <h2 style={{ fontSize: 18 }}>Your video Pins</h2>
        <span className="subtle">Keep an eye on what’s ready, scheduled and published.</span>
      </div>
      {videos.length ? (
        <div className="video-list">
          {videos.map((v) => (
            <div key={v.id} className="video-item card">
              <button className="video-cover" onClick={() => setPlaying(v)} aria-label={`Play ${v.title || 'video'}`}>
                <img src={v.cover} alt="" />
                <span className="video-dur">{Math.round(v.duration)}s</span>
              </button>
              <div className="stack-sm" style={{ gap: 4, minWidth: 0 }}>
                <strong className="ellipsis">{v.title || 'Untitled video'}</strong>
                <span className={`chip video-status is-${v.status}`}>
                  {publishing === v.id ? 'Publishing…' : v.status === 'scheduled' && v.publishAt ? `Scheduled · ${fmtTime(v.publishAt)}` : v.status === 'draft' ? 'Ready' : v.status === 'published' ? 'Published' : 'Failed'}
                </span>
                {v.error && <span className="subtle" style={{ color: 'var(--danger)' }}>{v.error}</span>}
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {v.pinUrl ? (
                    <a className="btn btn-sm" href={v.pinUrl} target="_blank" rel="noopener noreferrer">
                      View Pin
                    </a>
                  ) : (
                    <button className="btn btn-sm btn-pink" onClick={() => setEditing(v)}>
                      {v.status === 'draft' ? 'Add details' : 'Edit'}
                    </button>
                  )}
                  <button className="btn btn-sm" onClick={() => downloadVideo(v)} aria-label="Download">
                    <Download size={14} />
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    aria-label="Delete"
                    onClick={async () => {
                      if (!confirm(`Delete “${v.title || 'this video'}”?`)) return;
                      await videoRepo.remove(v.id);
                      reload();
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty-card video-empty">
          <Film size={26} className="subtle" />
          <strong>Your first video Pin starts here.</strong>
          <span className="subtle">Create or upload a video above. Scheduled videos appear here.</span>
        </div>
      )}

      {editing && (
        <Modal title="Make it your Pin" onClose={() => setEditing(null)} wide>
          <div className="video-edit">
            <BlobVideo blob={editing.blob} controls muted playsInline poster={editing.cover} />
            <VideoPinForm
              video={editing}
              compact
              onDone={() => {
                setEditing(null);
                reload();
              }}
            />
          </div>
        </Modal>
      )}
      {playing && (
        <Modal title={playing.title || 'Video'} onClose={() => setPlaying(null)}>
          <BlobVideo className="video-player" blob={playing.blob} controls autoPlay playsInline />
        </Modal>
      )}
    </div>
  );
}

function CreateFromLinks({ onMade }: { onMade: (v: VideoPin) => void }) {
  const kit = useLibrary((s) => s.activeKit());
  const [links, setLinks] = useState('');
  const [match, setMatch] = useState(true);
  const [format, setFormat] = useState<StoryFormat>('tips');
  const [status, setStatus] = useState('');
  const toast = useUi.getState().toast;
  const urls = links.split(/\s+/).filter(looksLikeUrl).slice(0, MAX_LINKS);

  const create = async () => {
    let made: VideoPin | null = null;
    let failed = 0;
    for (const [i, raw] of urls.entries()) {
      const url = normalizeUrl(raw);
      const n = `${urls.length > 1 ? `Video ${i + 1} of ${urls.length}: ` : ''}`;
      try {
        setStatus(`${n}reading the page…`);
        const page = await fetchPage(url);
        setStatus(`${n}picking photos…`);
        const { photos } = await importPagePhotos(page.images, { max: 6 });
        if (!photos.length) throw new Error('No usable photos on that page.');
        const f = match ? matchFormat({ url, title: page.title, description: page.description }) : format;
        const slides = storySlides({ title: page.title, description: page.description, url, photos: photos.map((p) => p.preview.image as HTMLCanvasElement), format: f });
        const r = await renderVideo(slides, kit, { onProgress: (p) => setStatus(`${n}recording ${Math.round(p * 100)}%`) });
        made = blankVideo({ source: 'made', blob: r.blob, mime: r.blob.type, duration: r.duration, cover: r.cover, title: page.title.slice(0, 100), description: page.description.slice(0, 800), link: url });
        await videoRepo.put(made);
      } catch (e) {
        failed++;
        toast(`${url}: ${(e as Error).message}`, 'error');
      }
    }
    setStatus('');
    if (made) {
      toast(`${urls.length - failed} video${urls.length - failed === 1 ? '' : 's'} created`, 'success');
      onMade(made);
    }
  };

  return (
    <div className="card video-card">
      <div className="video-source">
        <span className="is-on">
          <Link2 size={14} /> From links
        </span>
      </div>
      <strong>Your content. A new way to tell it.</strong>
      <span className="subtle">Add product pages or blog posts. PinCraft finds the photos, writes the story and turns them into videos.</span>
      <label className="field">
        <span className="field-label">Product or article URLs</span>
        <textarea className="input" rows={4} placeholder={'https://yourstore.com/products/your-product\nhttps://yourblog.com/your-post'} value={links} onChange={(e) => setLinks(e.target.value)} />
        <span className="subtle">Up to {MAX_LINKS} links per batch. One video per link.</span>
      </label>
      <strong>Choose the story format</strong>
      <label className="row" style={{ gap: 6 }}>
        <input type="checkbox" checked={match} onChange={(e) => setMatch(e.target.checked)} /> Match the format to my content
      </label>
      <div className="stack-sm">
        {STORY_FORMATS.map((f) => (
          <label key={f.id} className={`video-format ${!match && format === f.id ? 'is-on' : ''} ${match ? 'is-dim' : ''}`}>
            <span className={`video-format-thumb is-${f.id}`} aria-hidden />
            <span className="stack-sm" style={{ gap: 2 }}>
              <strong>{f.label}</strong>
              <span className="subtle">{f.hint}</span>
            </span>
            <input type="radio" name="story-format" checked={!match && format === f.id} disabled={match} onChange={() => setFormat(f.id)} />
          </label>
        ))}
      </div>
      <span className="subtle">Short vertical video (2:3) · smooth transitions · your brand colors and fonts. Made in your browser.</span>
      <button className="btn btn-pink btn-lg" disabled={!urls.length || !!status} onClick={() => void create()}>
        {status ? <Loader2 size={16} /> : <Clapperboard size={16} />} {status || `Create video${urls.length > 1 ? 's' : ''}`}
      </button>
    </div>
  );
}

function UploadVideo({ onSaved }: { onSaved: () => void }) {
  const [video, setVideo] = useState<VideoPin | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useUi.getState().toast;
  const load = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('video/')) return toast('Choose a video file (MP4 or MOV)', 'error');
    if (f.size > MAX_UPLOAD) return toast('That video is over 200 MB', 'error');
    try {
      const info = await probeVideo(f);
      if (info.duration < 4 || info.duration > 900) toast('Pinterest videos must be between 4 seconds and 15 minutes', 'info');
      const v = blankVideo({ source: 'uploaded', blob: f, mime: f.type, duration: info.duration, cover: info.cover, title: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 100) });
      await videoRepo.put(v);
      setVideo(v);
      onSaved();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  return (
    <div className="video-grid">
      <div className="card video-card">
        <strong>Start with your video</strong>
        {video ? (
          <div className="video-uploaded">
            <BlobVideo blob={video.blob} controls muted playsInline poster={video.cover} />
            <button className="btn btn-sm" onClick={() => setVideo(null)}>
              <X size={14} /> Choose another
            </button>
          </div>
        ) : (
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
            <Upload size={26} />
            <strong>Drop your video here</strong>
            <span className="subtle">MP4 · H.264 · 4 s – 15 min · up to 200 MB</span>
            <button className="btn btn-pink btn-sm" onClick={() => fileRef.current?.click()}>
              Choose video
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" hidden onChange={(e) => void load(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
        <div className="video-tip">
          <strong>Made to stand out, even on mute.</strong>
          <span className="subtle">Vertical videos with a clear opening frame and readable text work well in the Pinterest feed. Use 2:3 or 9:16.</span>
        </div>
      </div>
      <div className="card video-card">
        <strong>Make it your Pin</strong>
        {video ? (
          <VideoPinForm
            video={video}
            onDone={() => {
              setVideo(null);
              onSaved();
            }}
          />
        ) : (
          <span className="subtle">
            <Check size={14} /> Choose a video first — then add its title, link, board and publishing time here.
          </span>
        )}
      </div>
    </div>
  );
}
