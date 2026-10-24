import { useEffect, useMemo, useState } from 'react';
import type { Template } from '../model/types';
import { useAssets } from '../store/assetStore';
import { useEditor } from '../store/editorStore';
import { templateThumbnail, type PreviewPhotos } from './thumbnails';

/** Thumbnail for a template; inside an open project it previews with the project's own photos. */
export function useTemplateThumb(t: Template, width = 260, withProjectPhotos = false): string {
  const [src, setSrc] = useState('');
  const photos = useProjectPhotos(withProjectPhotos);
  useEffect(() => {
    let alive = true;
    templateThumbnail(t, width, photos).then((s) => alive && setSrc(s));
    return () => {
      alive = false;
    };
  }, [t, width, photos]);
  return src;
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
