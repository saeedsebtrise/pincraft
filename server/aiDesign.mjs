/**
 * AI Pin designs: Claude designs brand-new Pins as structured specs (layout,
 * colours, panels, typography, headline lines, badge, subtitle, CTA, website).
 * The browser turns each spec into an editable PinCraft design and runs the
 * usual checks (text fit, nothing cut off, photos, CTA) — see
 * src/services/aiDesign.ts. Only text goes to the API: the headline, the
 * photos' aspect ratios and colour palette — never the user's photos.
 *
 * Reference mode (POST /api/ai-reference): the user uploads a Pin they like
 * and Claude recreates its design as an editable template. The one image
 * sent is that reference; it is used for this request only and not stored.
 */
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

export const AI_DESIGN_MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
const NAME = /^[A-Za-z0-9 .+-]{1,40}$/;

const clean = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');

/** Builds the output schema for one request (layouts and fonts the app can render). */
export function designSchema(layoutIds, fonts, withHeadline = false) {
  const Font = z.enum(fonts);
  const Box = { x: z.number(), y: z.number(), w: z.number(), h: z.number() };
  const Text = z.object({
    ...Box,
    font: Font,
    weight: z.number().int(),
    color: z.string(),
    size: z.number().describe('max font size as a fraction of the canvas height'),
    uppercase: z.boolean(),
    italic: z.boolean(),
    letterSpacing: z.number(),
    align: z.enum(['left', 'center', 'right']),
    background: z.enum(['none', 'block', 'pill', 'full-width']),
    backgroundColor: z.string(),
    outlineWidth: z.number().describe('0 for none, as a fraction of the font size'),
    outlineColor: z.string(),
    shadow: z.boolean(),
  });
  const Line = Text.extend({ words: z.number().int().describe('headline words on this line; 0 = share the rest') });
  const Optional = Text.extend({ show: z.boolean() });
  return z.object({
    designs: z.array(
      z.object({
        name: z.string(),
        ...(withHeadline ? { headline: z.string().describe('the headline text exactly as it reads on the reference Pin, number included') } : {}),
        background: z.string(),
        photos: z.object({ layout: z.enum(layoutIds), top: z.number(), height: z.number(), gap: z.number().int() }),
        panels: z.array(z.object({ ...Box, color: z.string(), opacity: z.number(), radius: z.number() })),
        rules: z.array(z.object({ ...Box, color: z.string() })),
        badge: z.object({
          show: z.boolean(),
          x: z.number(),
          y: z.number(),
          size: z.number().describe('fraction of the canvas width'),
          shape: z.enum(['circle', 'square', 'rounded', 'plain']),
          color: z.string(),
          textColor: z.string(),
          font: Font,
          outlineWidth: z.number(),
          outlineColor: z.string(),
        }),
        lines: z.array(Line),
        subtitle: Optional,
        cta: Optional,
        website: Optional,
      }),
    ),
  });
}

const SYSTEM = `You are a senior Pinterest Pin designer. You design original, scroll-stopping Pins for blog posts, in the styles that perform on Pinterest: bold stacked headlines in white or coloured blocks over photo collages, centre text bands between photos, number badges, script + bold pairings, outlined "sticker" type straight on the photo, magazine-style serif stacks, minimal editorial panels.

You return designs as data. All positions and sizes are fractions of the canvas (0..1): x/w of the width, y/h of the height. The renderer fits each text box automatically (shrinks the text until it fits), so give every text box generous room.

Rules every design must follow:
- Readability first: strong contrast between text and whatever is behind it (use a block, panel, outline or shadow over photos). Headline words large; the main keyword line the biggest.
- Keep all text inside x 0.04-0.96 and y 0.03-0.97. Text boxes must never overlap each other or the number badge.
- The headline is split over 1-5 lines (top to bottom). Set "words" per line so the lines read the headline in order; the last line may use 0 to take the rest. Never invent words — the app fills in the user's exact headline.
- The number (if any) goes in the badge; set badge.show false when there is no number.
- Photos: choose a layout that suits the photo count; "top"/"height" place the photo area (use the full canvas behind overlays, or leave room for a text panel).
- Use colours that suit the photo palette and topic. Hex colours only (#RRGGBB). Opacity 0..1.
- Fonts: only the listed ones. Pair at most two families per design (e.g. a display font + a script or sans).
- CTA: a short button (show it in most designs); website: small, near the bottom.
- Make every design in the response clearly different from the others: different layout, colour scheme, typography and text treatment. No two designs should look like the same template.`;

const REF_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const REF_MAX_B64 = 6 * 1024 * 1024;

/** The reference Pin as an image block, or null when none (or a bad one) was sent. */
function referenceImage(ref) {
  if (!ref || !REF_TYPES.has(ref.mediaType) || typeof ref.data !== 'string') return null;
  if (ref.data.length < 100 || ref.data.length > REF_MAX_B64 || !/^[A-Za-z0-9+/=]+$/.test(ref.data.slice(0, 200))) return null;
  return { type: 'image', source: { type: 'base64', media_type: ref.mediaType, data: ref.data } };
}

const REFERENCE_BRIEF = `The attached image is a Pinterest Pin the user likes. Recreate ITS design as an editable template, as faithfully as the schema allows:
- Same structure: pick the photo layout closest to its photo arrangement and set photos.top/height to match where its photos sit; panels, bands and boxes where it has them.
- Same colours (sample them as hex), same text treatments (white boxes, coloured blocks, outlines, shadows, highlights), same positions and relative sizes, same alignment.
- Fonts: the closest ones from the list (condensed bold: Anton, Bebas Neue or Oswald; heavy geometric: Montserrat or Archivo Black; serif: Playfair Display, DM Serif Display, Libre Baskerville or Cormorant Garamond; script: Pacifico, Allura or Great Vibes).
- Break the headline into lines exactly where the reference breaks it, with the same emphasis (which line is biggest or coloured). Put its number in the badge when it shows one big number.
- Set "headline" to the headline text as it reads on the reference.
- Do not copy logos or the reference's website name; the website line is only a placeholder.
- When asked for more than one design, the first is the faithful copy and the others are close variations (colours or font pairing changed, same structure).`;

export async function designPins(client, raw) {
  const reference = referenceImage(raw.reference);
  if (raw.reference && !reference) throw Object.assign(new Error('Add a JPEG, PNG or WEBP image of the Pin (under 4 MB).'), { status: 400 });
  const headline = clean(raw.headline, 120);
  if (!headline && !reference) throw Object.assign(new Error('headline is required'), { status: 400 });
  const layoutIds = (Array.isArray(raw.layouts) ? raw.layouts : []).map((l) => clean(l?.id, 40)).filter((id) => /^[a-z0-9-]{1,40}$/.test(id)).slice(0, 40);
  const fonts = (Array.isArray(raw.fonts) ? raw.fonts : []).map((f) => clean(f, 40)).filter((f) => NAME.test(f)).slice(0, 40);
  if (!layoutIds.length || !fonts.length) throw Object.assign(new Error('layouts and fonts are required'), { status: 400 });
  const count = Math.max(1, Math.min(reference ? 3 : 8, Number(raw.count) || (reference ? 1 : 4)));
  const layouts = raw.layouts
    .filter((l) => layoutIds.includes(l?.id))
    .map((l) => `${l.id} (${Number(l.count) || 1} photo${Number(l.count) === 1 ? '' : 's'}${l.band ? ', leaves an empty text band across the middle 32% of the photo area — put the headline there' : ''})`);
  const palette = (Array.isArray(raw.palette) ? raw.palette : []).map((c) => clean(c, 7)).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 8);
  const ratios = (Array.isArray(raw.photoRatios) ? raw.photoRatios : []).map(Number).filter((n) => n > 0 && n < 10).slice(0, 12);

  // Optional Pinterest research for this keyword (server/pinResearch.mjs): match what's winning, then beat it.
  const r = raw.research && typeof raw.research === 'object' ? raw.research : null;
  const list = (v, n, max) => (Array.isArray(v) ? v.map((x) => clean(x, max)).filter(Boolean).slice(0, n) : []);
  const research = r && [
    "What the top Pinterest Pins for this keyword look like (from the user's research):",
    clean(r.summary, 600),
    list(r.headlinePatterns, 5, 120).length && `Headline patterns: ${list(r.headlinePatterns, 5, 120).join('; ')}`,
    list(r.palette, 6, 7).length && `Their colours: ${list(r.palette, 6, 7).join(', ')}`,
    list(r.gaps, 5, 200).length && `How to stand out: ${list(r.gaps, 5, 200).join('; ')}`,
    clean(r.designBrief, 800) && `Brief: ${clean(r.designBrief, 800)}`,
    'Design Pins that clearly belong in this feed (same kind of layouts and text treatments that win) but are better: bigger, clearer keyword, stronger contrast, and the gaps above.',
  ].filter(Boolean).join('\n');

  const brief = [
    `Design ${count} different Pins.`,
    `Canvas: ${Math.round(Number(raw.width) || 1000)} x ${Math.round(Number(raw.height) || 1500)} px.`,
    headline ? `Headline: ${headline}` : 'Headline: use the one on the reference Pin.',
    raw.subtitle && `Subtitle: ${clean(raw.subtitle, 120)}`,
    `Topic: ${clean(raw.topic, 200) || headline || 'as on the reference Pin'}`,
    `Photos available: ${ratios.length} (height/width ratios: ${ratios.map((r) => r.toFixed(2)).join(', ') || 'none — use the single layout and design for any photo'})`,
    palette.length && `Photo colour palette: ${palette.join(', ')}`,
    `Photo layouts you can use: ${layouts.join('; ')}`,
    `Fonts you can use: ${fonts.join(', ')}`,
    research,
    reference && REFERENCE_BRIEF,
  ].filter(Boolean);
  const schema = designSchema(layoutIds, fonts, !!reference);

  const response = await client.beta.messages.create({
    model: AI_DESIGN_MODEL,
    max_tokens: 16000,
    // If Claude declines, the API re-runs the request on a fallback model automatically.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: zodOutputFormat(schema) },
    system: SYSTEM,
    messages: [{ role: 'user', content: reference ? [reference, { type: 'text', text: brief.join('\n') }] : brief.join('\n') }],
  });
  if (response.stop_reason === 'refusal') throw Object.assign(new Error('The AI declined this request'), { status: 422 });
  if (response.stop_reason === 'max_tokens') throw Object.assign(new Error('The AI response was cut off — ask for fewer designs'), { status: 502 });
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  const parsed = schema.safeParse(JSON.parse(text));
  if (!parsed.success) throw Object.assign(new Error('Unexpected AI response'), { status: 502 });
  return { designs: parsed.data.designs.slice(0, count) };
}
