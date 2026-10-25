/**
 * Pinterest research: the user screenshots the top Pins for their focus
 * keyword on Pinterest (PinCraft only opens the search page for them — it
 * never scrapes Pinterest) and drops the screenshots in. Claude looks at them
 * and returns a "what's winning" report: layouts, text treatments, fonts,
 * colours, badges, CTAs, headline patterns and the gaps a better Pin can fill.
 * PinCraft then ranks templates that match the winning styles and briefs the
 * AI designer to beat them.
 *
 * POST /api/pin-research { keyword, images: [{ mediaType, data (base64) }] }
 * The screenshots go to the Anthropic API for this analysis only; nothing is stored.
 */
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

export const PIN_RESEARCH_MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
export const MAX_IMAGES = 12;
const MAX_IMAGE_B64 = 6 * 1024 * 1024; // ~4.5 MB per screenshot
const MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const LAYOUTS = ['single-photo', 'two-photos', 'collage-3-4', 'collage-5-plus', 'band-between-photos', 'text-panel', 'text-only'];
export const TEXT_STYLES = ['white-blocks', 'solid-band', 'overlay-no-box', 'outlined-sticker', 'script-accent', 'serif-editorial', 'distressed', 'pill-labels'];
export const FONT_STYLES = ['bold-sans', 'condensed-sans', 'rounded-sans', 'serif', 'script', 'distressed'];

const share = (values) => z.array(z.object({ type: z.enum(values), share: z.number().describe('fraction of the Pins seen, 0..1') }));

export const ResearchReport = z.object({
  pinsAnalyzed: z.number().int(),
  summary: z.string().describe('2-3 sentences: what the winning Pins for this keyword look like'),
  layouts: share(LAYOUTS),
  textStyles: share(TEXT_STYLES),
  fonts: share(FONT_STYLES),
  palette: z.array(z.string()).describe('up to 6 dominant #RRGGBB colours used in the text/blocks/panels'),
  numberBadgeShare: z.number().describe('fraction of Pins with a big list number'),
  ctaShare: z.number().describe('fraction of Pins with a call-to-action button'),
  websiteShare: z.number().describe('fraction of Pins showing a website'),
  headlinePatterns: z.array(z.string()).describe('up to 5 headline formulas, e.g. "Number + adjective + keyword + Ideas"'),
  commonWords: z.array(z.string()).describe('words that recur in the headlines, up to 12'),
  gaps: z.array(z.string()).describe('up to 5 concrete ways a new Pin could stand out from these'),
  designBrief: z.string().describe('a short brief for a designer: what to keep from the winners and what to do better'),
});

const SYSTEM = `You are a Pinterest marketing analyst who studies Pin design. You are shown screenshots of Pinterest search results (or single Pins) for one keyword. Look at every Pin you can see and describe, as data, how the top Pins are designed.

- Count only Pins you can actually see; estimate shares (0..1) from them.
- Describe design, not content: photo layout, how the headline is treated (white blocks, solid band, text straight on the photo, outlined sticker type, script accents, serif editorial, distressed type, pill labels), font styles, colours of text and blocks, number badges, CTA buttons, website lines.
- Headline patterns: generalise the formulas (e.g. "Number + adjective + keyword + Ideas"); do not copy whole headlines.
- Gaps: concrete, design-level ways a new Pin could stand out in this feed (e.g. "almost all use white text on photos — a bold coloured band would stand out").
- The design brief is for a designer making a better Pin for this keyword: what to keep, what to change.
- Ignore ads, video badges and Pinterest's own interface.`;

const clean = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');

export async function researchPins(client, raw) {
  // The keyword is optional: without one, the AI reads it off the search bar and Pin headlines in the screenshots.
  const keyword = clean(raw.keyword, 120);
  const images = (Array.isArray(raw.images) ? raw.images : []).slice(0, MAX_IMAGES).filter(
    (im) => im && MEDIA_TYPES.has(im.mediaType) && typeof im.data === 'string' && im.data.length > 100 && im.data.length <= MAX_IMAGE_B64 && /^[A-Za-z0-9+/=]+$/.test(im.data.slice(0, 200)),
  );
  if (!images.length) throw Object.assign(new Error('Add at least one screenshot of Pinterest Pins'), { status: 400 });

  const response = await client.beta.messages.create({
    model: PIN_RESEARCH_MODEL,
    max_tokens: 8000,
    // If Claude declines, the API re-runs the request on a fallback model automatically.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: zodOutputFormat(ResearchReport) },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          ...images.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mediaType, data: im.data } })),
          {
            type: 'text',
            text: keyword
              ? `Keyword: ${keyword}\nThese are ${images.length} screenshot(s) of the top Pinterest results for this keyword. Analyse the Pin designs.`
              : `These are ${images.length} screenshot(s) of the top Pinterest results for one keyword (work out the keyword from the search bar or the Pin headlines). Analyse the Pin designs.`,
          },
        ],
      },
    ],
  });
  if (response.stop_reason === 'refusal') throw Object.assign(new Error('The AI declined to analyse these screenshots'), { status: 422 });
  if (response.stop_reason === 'max_tokens') throw Object.assign(new Error('The AI response was cut off — try fewer screenshots'), { status: 502 });
  const text = response.content.find((b) => b.type === 'text')?.text ?? '';
  const parsed = ResearchReport.safeParse(JSON.parse(text));
  if (!parsed.success) throw Object.assign(new Error('Unexpected AI response'), { status: 502 });
  return { keyword, report: parsed.data };
}
