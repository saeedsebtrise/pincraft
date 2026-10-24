export function slugify(s: string, maxLen = 60): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/g, '');
}

export type ExportFormat = 'png' | 'jpeg' | 'webp';

export const FORMAT_EXT: Record<ExportFormat, string> = { png: 'png', jpeg: 'jpg', webp: 'webp' };
export const FORMAT_MIME: Record<ExportFormat, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

/** e.g. "50-lob-haircut-ideas-pin-01.png" */
export function exportFilename(base: string, index: number, format: ExportFormat): string {
  const slug = slugify(base) || 'pinterest';
  return `${slug}-pin-${String(index).padStart(2, '0')}.${FORMAT_EXT[format]}`;
}

/** Cleans a user-typed filename and forces the right extension. */
export function sanitizeFilename(name: string, format: ExportFormat): string {
  const stem = name.replace(/\.(png|jpe?g|webp)$/i, '');
  const clean = stem.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'pin';
  return `${clean}.${FORMAT_EXT[format]}`;
}
