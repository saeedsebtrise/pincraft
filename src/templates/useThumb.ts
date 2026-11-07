import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Template } from '../model/types';
import { useAssets } from '../store/assetStore';
import { useEditor } from '../store/editorStore';
import { templateThumbnail, type PreviewPhotos } from './thumbnails';

/** Thumbnail for a template; inside an open project it previews with the project's own photos. */
export function useTemplateThumb(t: Template, width = 260, withProjectPhotos = false, enabled = true): string {
  const [src, setSrc] = useState('');
  const photos = useProjectPhotos(withProjectPhotos);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    templateThumbnail(t, width, photos).then((s) => alive && setSrc(s));
    return () => {
      alive = false;
    };
  }, [t, width, photos, enabled]);
  return src;
}

/**
 * The same thumbnail, rendered only once its tile is near the screen. Galleries show
 * hundreds of templates; rendering them all at once froze the page for seconds.
 * Attach the returned ref to the tile.
 */
export function useLazyTemplateThumb(t: Template, width = 260, withProjectPhotos = false): [(el: Element | null) => void, string] {
  const [visible, setVisible] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const ref = useCallback((el: Element | null) => {
    observer.current?.disconnect();
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.current?.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    observer.current.observe(el);
    // Some hosts (hidden or background windows) never report intersections: fall back to a
    // one-time position check so the tiles on screen still get their thumbnails.
    window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (r.bottom > -400 && r.top < window.innerHeight + 400) setVisible(true);
    }, 1000);
  }, []);
  // No effect cleanup here: React calls ref(null) on unmount, which disconnects. An effect
  // cleanup would also fire on StrictMode's simulated unmount and leave every tile blank.
  return [ref, useTemplateThumb(t, width, withProjectPhotos, visible)];
}

function useProjectPhotos(enabled: boolean): PreviewPhotos | undefined {
  const ids = useEditor((s) => (enabled ? s.project?.assetIds : undefined));
  const previews = useAssets((s) => s.previews);
  const metas = useAssets((s) => s.metas);
  return useMemo(() => {
    if (!ids?.length) return undefined;
    const ready = ids.filter((id) => previews[id] && metas[id]);
    if (!ready.length) return undefined;
    return { key: ready.join(','), sources: ready.map((id) => ({ image: previews[id], width: metas[id].width, height: metas[id].height })) };
  }, [ids, previews, metas]);
}
