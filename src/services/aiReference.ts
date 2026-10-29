/**
 * "Create a template from a Pin you like": the user drops in any Pin image,
 * Claude recreates its design (layout, colours, fonts, text treatments) as an
 * editable template, and it's saved to My Templates — ready for Auto Design
 * and the editor like any other template.
 *
 * The image is shrunk in the browser (Vercel caps requests at 4.5 MB) and sent
 * only for this request; it is not stored.
 */
import { COLLAGE_LAYOUTS } from '../collage/layouts';
import { FONT_LIBRARY } from '../config/fonts';
import { instantiateTemplate } from '../model/docOps';
import type { PinDocument, Template } from '../model/types';
import { aiAuthHeaders } from './ai/auth';
import { AI_OFFLINE, AiDesignError, specToTemplate, type AiDesignSpec } from './aiDesign';
import { fitScreenshots, prepareScreenshot } from './pinResearch';

/** The canvas closest to the reference's shape: 2:3, 9:16 or the long 1:2 blog Pin. */
export function canvasForRatio(heightOverWidth: number): { width: number; height: number; presetId: string } {
  if (heightOverWidth >= 1.9) return { width: 736, height: 1472, presetId: 'custom-blog-736' };
  if (heightOverWidth >= 1.65) return { width: 1080, height: 1920, presetId: 'pin-full-vertical' };
  return { width: 1000, height: 1500, presetId: 'pin-standard' };
}

export interface ReferenceDesign {
  template: Template;
  /** The design with its own headline filled in, ready to save or open. */
  doc: PinDocument;
  /** The headline Claude read off the reference (or the one the user typed). */
  headline: string;
}

/** Sends the reference Pin and returns the recreated design(s). */
export async function requestReferenceDesigns(file: Blob, opts: { headline?: string; count?: number } = {}): Promise<ReferenceDesign[]> {
  const bmp = await createImageBitmap(file);
  const ratio = bmp.height / Math.max(1, bmp.width);
  bmp.close();
  const size = canvasForRatio(ratio);
  const shot = await prepareScreenshot(file);
  const [reference] = await fitScreenshots([shot]);

  let res: Response;
  try {
    res = await fetch('/api/ai-reference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await aiAuthHeaders()) },
      body: JSON.stringify({
        reference,
        headline: opts.headline?.trim() || undefined,
        count: opts.count ?? 1,
        width: size.width,
        height: size.height,
        layouts: COLLAGE_LAYOUTS.map((l) => ({ id: l.id, count: l.count, band: !!l.bandable })),
        fonts: FONT_LIBRARY.map((f) => f.family),
      }),
    });
  } catch {
    throw new AiDesignError(AI_OFFLINE);
  }
  if (!res.ok) {
    const msg = await res.json().then((d: { error?: string }) => d.error ?? '', () => '');
    throw new AiDesignError(res.status === 404 || (res.status >= 500 && !msg) ? AI_OFFLINE : msg || `The AI request failed (${res.status})`);
  }
  const data = (await res.json()) as { designs?: (AiDesignSpec & { headline?: string })[] };
  const out: ReferenceDesign[] = [];
  for (const spec of data.designs ?? []) {
    const template = specToTemplate(spec, size.width, size.height);
    if (!template) continue;
    const headline = opts.headline?.trim() || (typeof spec.headline === 'string' ? spec.headline.trim() : '') || 'Your Pin Headline Here';
    const doc = instantiateTemplate(template, { ...size, headline, brand: null });
    out.push({ template, doc, headline });
  }
  if (!out.length) throw new AiDesignError('The AI could not read a design from that image — try a clearer Pin image.');
  return out;
}
