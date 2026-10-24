import { UPLOAD_LIMITS } from '../config/colors';

export type SniffedType = 'image/jpeg' | 'image/png' | 'image/webp' | null;

/** Identifies an image by its magic bytes — never trust the file extension or reported MIME. */
export function sniffImageType(bytes: Uint8Array): SniffedType {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export type ValidationResult = { ok: true; mime: Exclude<SniffedType, null> } | { ok: false; error: string };

export async function validateImageFile(file: Blob & { name?: string }): Promise<ValidationResult> {
  const name = file.name ?? 'file';
  if (file.size === 0) return { ok: false, error: `${name} is empty.` };
  if (file.size > UPLOAD_LIMITS.maxFileBytes) {
    return { ok: false, error: `${name} is ${(file.size / 1048576).toFixed(1)} MB — the limit is ${UPLOAD_LIMITS.maxFileBytes / 1048576} MB.` };
  }
  const head = new Uint8Array(await readBytes(file.slice(0, 16)));
  const mime = sniffImageType(head);
  if (!mime) return { ok: false, error: `${name} isn't a supported image. Use JPEG, PNG or WEBP.` };
  return { ok: true, mime };
}

function readBytes(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(blob);
  });
}
