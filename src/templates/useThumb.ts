import { useEffect, useState } from 'react';
import type { Template } from '../model/types';
import { templateThumbnail } from './thumbnails';

export function useTemplateThumb(t: Template, width = 260): string {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    templateThumbnail(t, width).then((s) => alive && setSrc(s));
    return () => {
      alive = false;
    };
  }, [t, width]);
  return src;
}
