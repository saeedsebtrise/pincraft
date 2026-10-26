import { bgOn } from '../templates/builtins';
import { createDocument, createFrame, createShape, createText } from './factory';
import type { BrandKit, Layer, PinDocument } from './types';

export type CustomPinLayoutId =
  | 'single-image'
  | 'image-text-overlay'
  | 'image-text-panel'
  | 'two-image'
  | 'collage-4'
  | 'quote-advice'
  | 'blank';

export interface CustomPinLayoutDef {
  id: CustomPinLayoutId;
  label: string;
  tagline: string;
  description: string;
  imageCount: number;
}

export const CUSTOM_PIN_LAYOUTS: CustomPinLayoutDef[] = [
  {
    id: 'single-image',
    label: 'Single Image Pin',
    tagline: 'Auto-Adjusting Full Bleed',
    description: 'Image auto-adjusts to cover 100% of the canvas seamlessly with zero blank space.',
    imageCount: 1,
  },
  {
    id: 'image-text-overlay',
    label: 'Single Image + Text Overlay',
    tagline: 'Photo + Topic Overlay',
    description: 'Full cover photo with dark/gradient vignette & topic headline auto-fitted.',
    imageCount: 1,
  },
  {
    id: 'image-text-panel',
    label: 'Split Layout / Text Panel',
    tagline: 'Top Photo + Clean Card',
    description: 'Top photo with a readable contrast card for headline and call to action.',
    imageCount: 1,
  },
  {
    id: 'two-image',
    label: '2-Image Split Pin',
    tagline: 'Two Stacked Photos',
    description: 'Two photo frames separated by a high-contrast center headline banner.',
    imageCount: 2,
  },
  {
    id: 'collage-4',
    label: '4-Image Collage Pin',
    tagline: 'Multi-Photo Grid',
    description: '4-photo grid collage with a bold center headline band.',
    imageCount: 4,
  },
  {
    id: 'quote-advice',
    label: 'Quote / Typography Pin',
    tagline: 'Aesthetic Text Focus',
    description: 'Clean typographical layout that highlights your quote, tip, or topic.',
    imageCount: 0,
  },
  {
    id: 'blank',
    label: 'Blank Custom Canvas',
    tagline: 'Total Creative Freedom',
    description: 'Start with a completely empty canvas to place and style elements manually.',
    imageCount: 0,
  },
];

export function buildCustomPinDocument(opts: {
  width: number;
  height: number;
  presetId: string;
  layoutId: CustomPinLayoutId;
  headline?: string;
  brand?: BrandKit | null;
}): PinDocument {
  const { width: W, height: H, presetId, layoutId, headline, brand } = opts;
  const k = W / 1000;
  const doc = createDocument(W, H, presetId);
  const text = headline?.trim();

  switch (layoutId) {
    case 'single-image': {
      // 100% canvas cover photo frame that automatically covers the entire pin
      const heroFrame = createFrame({
        name: 'Hero Image',
        x: 0,
        y: 0,
        width: W,
        height: H,
        slot: 0,
        placeholderFill: '#EAE6E1',
      });
      const layers: Layer[] = [heroFrame];
      if (text) {
        layers.push(
          createText({
            name: 'Headline',
            role: 'title',
            x: W * 0.08,
            y: H * 0.65,
            width: W * 0.84,
            height: 220 * k,
            text,
            fontFamily: brand?.headingFont || 'Playfair Display',
            fontWeight: 800,
            fontSize: Math.min(84 * k, Math.max(36 * k, (W * 0.84) / Math.max(1, text.length * 0.35))),
            lineHeight: 1.2,
            fill: '#FFFFFF',
            align: 'center',
            minFontSize: 24 * k,
            shadow: { enabled: true, color: '#000000', blur: 18, offsetX: 0, offsetY: 4, opacity: 0.7 },
            background: bgOn('#000000', { hug: true, opacity: 0.45, paddingX: 28 * k, paddingY: 16 * k, radius: 12 * k }),
          })
        );
      }
      return { ...doc, layers };
    }

    case 'image-text-overlay': {
      const heroFrame = createFrame({
        name: 'Background Photo',
        x: 0,
        y: 0,
        width: W,
        height: H,
        slot: 0,
        placeholderFill: '#E5E0DA',
      });
      const shade = createShape({
        name: 'Bottom Shade',
        role: 'decor',
        x: 0,
        y: H * 0.48,
        width: W,
        height: H * 0.52,
        fill: '#000000',
        opacity: 0.48,
      });
      const title = createText({
        name: 'Headline',
        role: 'title',
        x: W * 0.08,
        y: H * 0.62,
        width: W * 0.84,
        height: 230 * k,
        text: text || 'Your Pin Headline Here',
        fontFamily: brand?.headingFont || 'Playfair Display',
        fontWeight: 800,
        fontSize: Math.min(84 * k, Math.max(36 * k, (W * 0.84) / Math.max(1, (text || 'Your Pin Headline Here').length * 0.35))),
        lineHeight: 1.2,
        fill: '#FFFFFF',
        align: 'center',
        minFontSize: 24 * k,
        shadow: { enabled: true, color: '#000000', blur: 14, offsetX: 0, offsetY: 3, opacity: 0.6 },
      });
      const footer = createText({
        name: 'Website',
        role: 'website',
        x: W * 0.1,
        y: H * 0.92,
        width: W * 0.8,
        height: 40 * k,
        text: brand?.website || 'yourwebsite.com',
        fontFamily: brand?.bodyFont || 'Inter',
        fontWeight: 600,
        fontSize: 28 * k,
        letterSpacing: 4 * k,
        textTransform: 'uppercase',
        fill: '#FFFFFF',
        opacity: 0.85,
        align: 'center',
        minFontSize: 12,
      });
      return { ...doc, layers: [heroFrame, shade, title, footer] };
    }

    case 'image-text-panel': {
      const photoH = Math.round(H * 0.62);
      const photoFrame = createFrame({
        name: 'Main Photo',
        x: 0,
        y: 0,
        width: W,
        height: photoH,
        slot: 0,
        placeholderFill: '#EDE8E1',
      });
      const card = createShape({
        name: 'Text Card',
        role: 'decor',
        x: 0,
        y: Math.round(H * 0.6),
        width: W,
        height: Math.round(H * 0.4),
        fill: '#FAF7F2',
      });
      const title = createText({
        name: 'Headline',
        role: 'title',
        x: W * 0.08,
        y: Math.round(H * 0.65),
        width: W * 0.84,
        height: 180 * k,
        text: text || 'Your Pin Headline Here',
        fontFamily: brand?.headingFont || 'Plus Jakarta Sans',
        fontWeight: 800,
        fontSize: Math.min(76 * k, Math.max(34 * k, (W * 0.84) / Math.max(1, (text || 'Your Pin Headline Here').length * 0.35))),
        lineHeight: 1.25,
        fill: '#1E1B18',
        align: 'center',
        minFontSize: 22 * k,
      });
      const cta = createText({
        name: 'Call to action',
        role: 'cta',
        x: W * 0.3,
        y: Math.round(H * 0.88),
        width: W * 0.4,
        height: 54 * k,
        text: 'Read more',
        fontFamily: brand?.bodyFont || 'Inter',
        fontWeight: 700,
        fontSize: 28 * k,
        letterSpacing: 2 * k,
        textTransform: 'uppercase',
        fill: '#FFFFFF',
        background: bgOn('#1E1B18', { shape: 'pill', paddingX: 24 * k, paddingY: 10 * k }),
        align: 'center',
        minFontSize: 12,
      });
      return { ...doc, layers: [photoFrame, card, title, cta] };
    }

    case 'two-image': {
      const h1 = Math.round(H * 0.45);
      const bandY = Math.round(H * 0.43);
      const bandH = Math.round(H * 0.18);
      const h2Y = Math.round(H * 0.59);
      const h2 = Math.round(H * 0.41);
      const topFrame = createFrame({ name: 'Image 1', x: 0, y: 0, width: W, height: h1, slot: 0, placeholderFill: '#EAE5DE' });
      const band = createShape({ name: 'Center Band', role: 'band', x: 0, y: bandY, width: W, height: bandH, fill: '#FFFFFF' });
      const title = createText({
        name: 'Headline',
        role: 'title',
        x: W * 0.06,
        y: bandY + 20 * k,
        width: W * 0.88,
        height: bandH - 40 * k,
        text: text || 'YOUR PIN HEADLINE HERE',
        fontFamily: 'Anton',
        fontWeight: 400,
        fontSize: Math.min(88 * k, Math.max(36 * k, (W * 0.88) / Math.max(1, (text || 'YOUR PIN HEADLINE HERE').length * 0.35))),
        textTransform: 'uppercase',
        fill: '#111111',
        align: 'center',
        minFontSize: 24 * k,
      });
      const bottomFrame = createFrame({ name: 'Image 2', x: 0, y: h2Y, width: W, height: h2, slot: 1, placeholderFill: '#DFD9D0' });
      return { ...doc, layers: [topFrame, bottomFrame, band, title] };
    }

    case 'collage-4': {
      const halfW = Math.round(W / 2 - 4 * k);
      const topH = Math.round(H * 0.42);
      const bandY = Math.round(H * 0.4);
      const bandH = Math.round(H * 0.2);
      const botY = Math.round(H * 0.58);
      const botH = Math.round(H * 0.42);

      const f1 = createFrame({ name: 'Image 1', x: 0, y: 0, width: halfW, height: topH, slot: 0, placeholderFill: '#EAE5DE' });
      const f2 = createFrame({ name: 'Image 2', x: halfW + 8 * k, y: 0, width: halfW, height: topH, slot: 1, placeholderFill: '#E2DCD4' });
      const f3 = createFrame({ name: 'Image 3', x: 0, y: botY, width: halfW, height: botH, slot: 2, placeholderFill: '#DBD5CC' });
      const f4 = createFrame({ name: 'Image 4', x: halfW + 8 * k, y: botY, width: halfW, height: botH, slot: 3, placeholderFill: '#D5CFC5' });
      const band = createShape({ name: 'Center Band', role: 'band', x: 0, y: bandY, width: W, height: bandH, fill: '#FFFFFF' });
      const title = createText({
        name: 'Headline',
        role: 'title',
        x: W * 0.06,
        y: bandY + 24 * k,
        width: W * 0.88,
        height: bandH - 48 * k,
        text: text || 'YOUR PIN HEADLINE HERE',
        fontFamily: 'Anton',
        fontWeight: 400,
        fontSize: Math.min(84 * k, Math.max(34 * k, (W * 0.88) / Math.max(1, (text || 'YOUR PIN HEADLINE HERE').length * 0.35))),
        textTransform: 'uppercase',
        fill: '#111111',
        align: 'center',
        minFontSize: 22 * k,
      });
      return { ...doc, layers: [f1, f2, f3, f4, band, title] };
    }

    case 'quote-advice': {
      const bg = createShape({ name: 'Aesthetic Background', role: 'decor', x: 0, y: 0, width: W, height: H, fill: '#F7F3EE' });
      const quoteMark = createText({
        name: 'Quote Mark',
        role: 'decor',
        x: W * 0.1,
        y: H * 0.22,
        width: W * 0.8,
        height: 120 * k,
        text: '“',
        fontFamily: 'Playfair Display',
        fontWeight: 900,
        fontSize: 160 * k,
        fill: '#C7797D',
        align: 'center',
      });
      const title = createText({
        name: 'Quote Headline',
        role: 'title',
        x: W * 0.1,
        y: H * 0.36,
        width: W * 0.8,
        height: H * 0.36,
        text: text ? `“${text}”` : '“The best time for new beginnings is now.”',
        fontFamily: brand?.headingFont || 'Playfair Display',
        italic: true,
        fontWeight: 700,
        fontSize: Math.min(78 * k, Math.max(36 * k, (W * 0.8) / Math.max(1, (text || 'The best time for new beginnings').length * 0.35))),
        lineHeight: 1.35,
        fill: '#2E2420',
        align: 'center',
        minFontSize: 22 * k,
      });
      const footer = createText({
        name: 'Author / Website',
        role: 'website',
        x: W * 0.15,
        y: H * 0.82,
        width: W * 0.7,
        height: 40 * k,
        text: brand?.website || 'yourbrand.com',
        fontFamily: 'Inter',
        fontWeight: 600,
        fontSize: 26 * k,
        letterSpacing: 4 * k,
        textTransform: 'uppercase',
        fill: '#8A847C',
        align: 'center',
      });
      return { ...doc, layers: [bg, quoteMark, title, footer] };
    }

    case 'blank':
    default:
      return doc;
  }
}
