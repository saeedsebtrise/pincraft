# PinCraft — Pinterest Pin Design Software

A focused, Canva-style editor built for Pinterest blog Pins. You choose a design type, then a Pin size, then a template. Upload images, pick a generated headline, adjust the typography, images, colors and layout, preview the Pin in a mobile feed, and export it at its exact size.

Everything runs in the browser. Images stay on your device; there is no server and no account. The optional AI headline assistant goes through a small proxy that you run yourself.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Type-check + production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests (Vitest, 67 tests) |
| `npm run typecheck` | TypeScript only |
| `npm run ai-proxy` | Optional AI headline proxy (needs `ANTHROPIC_API_KEY`) |

Requires Node 20+ (developed on Node 24). On a fresh machine, if `npm install` blocks esbuild's install script, run `npm approve-scripts esbuild`.

### Optional: AI headline assistant

The app works fully without AI: local, rule-based headline suggestions are always available. To add AI suggestions:

```bash
cp .env.example .env                       # sets VITE_AI_PROXY_URL=/api/ai
ANTHROPIC_API_KEY=sk-ant-... npm run ai-proxy
npm run dev
```

Then open **AI Text** in the top bar and turn on **Use AI**. Only the article title, keyword and website go to the proxy, never images. The API key lives only in the proxy's environment. The proxy uses `claude-opus-5-5` by default (override with `AI_MODEL`). It enables Anthropic's server-side refusal fallback (`fallbacks: "default"`), so a declined request is retried on a fallback model. Any AI error falls back to the on-device suggestions.

### AI designs (Pro)

With the AI proxy running (see above), Auto Design shows **Make 4 original AI designs**, and Bulk Design has **Include original AI designs**.

Claude (`claude-opus-5-5`, with refusal fallback on) designs brand-new Pins for the post as structured data:
- photo layout
- colours and panels
- fonts
- the headline split into lines
- number badge, subtitle, CTA and website

The app turns each design into an ordinary editable Pin (`src/services/aiDesign.ts`). It checks and clamps every value: positions, sizes, colours, fonts and layouts. Then it runs the same checks as the templates: fills in your exact headline, fits the text, keeps the keyword from being cut off, adds your photos and the CTA.

Only text goes to the AI: the headline, the photos' height-to-width ratios and their colour palette. The photos themselves are never sent. The server side is `server/aiDesign.mjs` (`POST /api/ai-design`).

### Pinterest research (Pro)

In Auto Design, **Research Pinterest first** works in three steps:
1. It opens Pinterest's own search page for your focus keyword in a new tab. PinCraft never scrapes Pinterest, which its Terms forbid.
2. You take 3–4 screenshots while scrolling (about 50 Pins) and drop or paste them in.
3. AI (`POST /api/pin-research`, `server/pinResearch.mjs`) reports what wins: layouts, headline treatments, fonts, colours, number badges, CTAs, headline patterns, and the gaps a new Pin can fill.

Auto Design then ranks templates that match the winning styles higher (`src/services/pinResearch.ts`), and AI designs are briefed to match the feed and beat it. Screenshots are sent to the Anthropic API only for that analysis and are not stored.

### Blog URL → Pins

In **Auto Design**, paste a blog post link and press Enter. PinCraft reads the post's title and photos, then designs 50 Pins with those photos already in the frames. You can click a photo to leave it out, and the footer uses the post's site unless your Brand Kit has a website.

Browsers can't read other websites directly, so the app's own server does it (`server/pageFetch.mjs`, routes `GET /api/page` and `GET /api/image`):
- **Development:** `npm run dev` and `npm run preview` include it, with nothing to set up.
- **Production on Vercel:** the `api/` folder deploys these routes (and the AI routes) as functions — see [docs/SAAS_SETUP.md](docs/SAAS_SETUP.md#3-deploy-on-vercel-app--api--your-domain).
- **Other hosts:** run `npm run ai-proxy` behind your static host and route `/api/*` to it. It serves these routes too, and they don't need an API key.

The reader only fetches public `http(s)` addresses. Every hostname, including each redirect, is checked when it connects, so it can't reach `localhost` or private networks. Pages are capped at 3 MB and photos at 15 MB. Some sites block automatic readers; for those, type the title and upload the photos instead.

## What's in the MVP

- **The PinCraft workspace**:
  - Dashboard with sidebar navigation, template search, "Create Stunning Pinterest Pins" design-type cards, Popular Templates and recent projects.
  - Editor top bar with the Pin size, undo/redo, zoom, AI Text, Preview, Save and Export.
  - A labeled left rail and a vertical tool strip (Select, Frame, Text, Shape, Line, Badge).
  - Floating selection actions (duplicate, delete, forward/back, lock).
  - A right panel with **Design · Images · Text · Layers** tabs. Design holds canvas size and ratio buttons, background, Grid / Safe Area / Snap toggles, border & frame, the design check, and export settings.
- **Pages**: a project holds several Pins (for example different designs for one article). The bottom page strip has Add, Duplicate and Delete. Export the current page or all pages at once, and batch variations can be added as pages.
- **AI Text Assistant**: Pin Headlines, Subtitles, CTA Text and Variations tabs, each suggestion with Copy and Use. It works on-device; AI is optional. The subtitle slot in a template fills automatically from the rest of the article title (for example "To Take to Your Next Salon Appointment").
- **Template previews use your own photos** once a project has uploads.
- **The 16 design types** are picked first: Single Image, Image + Text Overlay, Image + Text Panel, Split, 2-Image, 3-Image, 4-Image Collage, 5-Image Collage, Editorial, Listicle, Number Badge, Script + Bold, Quote / Advice, Home Decor, Hair / Beauty, and Blank.
- **Pin sizes** come from one preset registry (`src/config/canvasPresets.ts`). Each is labeled Official · Recommended, Official · Supported, or Custom. The default is 1000×1500 (2:3). The 736×1472 Custom Blog Pin preset has its own template family. You can also enter a custom size and save it as a preset.
- **184 editable templates** in 10 families, including 18 premium designs (clean minimal, bold magazine, luxury), 10 high-click designs (huge keyword on a solid band, big number, CTA button), 31 "Pin style" templates modelled on real blog Pins and 85 original layouts inspired by popular blog-Pin template packs (colour strips, centre bands with sticker script, text-first panels, mosaics, starbursts, medallions, polaroids) (decor headline bands, hair serif stacks, white text blocks, big white numbers, outlined and sticker-serif headlines): 2 top + center text + 2 bottom; 2 top + headline + 3 bottom; 4-image editorial; number-badge listicle; script + bold; single image + bold overlay; single image + text panel; hair / beauty; home decor / balcony / patio; and a blank canvas. Each template is tagged by category (Hair, Beauty, Home Decor, Balcony, Patio, Living Room, Fall Decor, Fashion, Lifestyle, Relationship, Quote, Listicle…).
- **Collage engine**
  - 23 layouts with 1–6 images, including center-band layouts whose band height is adjustable.
  - Controls for gap, margin, corner radius, border and collage area.
  - Collage cells swap images when you drag one onto another; a cell can be detached to move it freely.
  - Auto-fill can match each frame to the image with the closest aspect ratio.
- **Canvas editor**
  - Select, shift-click multi-select, drag-box (marquee) selection, drag, resize, rotate.
  - Snapping with center and edge guides.
  - Align and distribute; duplicate, delete, lock, hide; z-order controls.
  - Inline text editing (double-click).
  - Crop mode (double-click an image): drag to reposition, scroll to zoom.
  - Undo/redo for every document change; keyboard shortcuts.
- **Images**
  - Drag-and-drop, file picker and paste uploads, up to 10 images per project. Files are checked by their magic bytes, not their extension.
  - Non-destructive crop, zoom, flip, brightness, contrast, saturation, warmth, blur and grayscale. The original file is never modified.
- **Typography**
  - 22 curated fonts: editorial serif, modern serif, sans, bold display, distressed, script, elegant and minimal.
  - Text background blocks: box, pill or circle, which can hug the text.
  - Stroke, shadow, letter spacing, line height and text transform.
  - Auto-fit shrinks text to its box, with a minimum readable size and an overflow warning.
  - Ready-made text styles and mixed-type compositions (script + bold caps, stacked blocks, number + keyword).
- **Design blocks**
  - Number badges: circle, rounded square, square or pill, with four position presets.
  - Center text bands: white, cream, color, dark or split, with optional divider lines. The band moves your existing headline into itself.
  - Website footers: 5 styles, an optional light panel and a separator line.
- **Headlines**: on-device suggestions from the article title (for example "50 Lob Haircut Ideas" or "50 Chic Lob Haircuts"), plus the optional AI assistant. Picking a headline fills the badge, script accent, stacked lines and title automatically.
- **Recommend a design**: rule-based template suggestions from the article title (topic, list number, descriptive words). The picks are varied, and you can always choose freely.
- **Brand Kit**: website, primary/secondary/accent colors, heading and body fonts, logo and CTA style. "Apply brand to this Pin" applies it in one undoable step. Multiple kits are supported.
- **Design check**: warns about text overflow, text too small for the mobile feed, low contrast, text outside the safe area, objects outside the canvas, empty frames, low-resolution or missing images, a missing website and fonts that fail to load. These are warnings only and never block export.
- **Projects**: autosave to IndexedDB (debounced, and flushed when the tab is hidden). Save, rename, duplicate, delete and dashboard thumbnails.
- **Fresh variations**: exact copy, new images, swapped black/white blocks, or the next template. **Batch variations** generate several designs from the same content; you keep the ones you choose.
- **Export**: PNG (default), JPEG or WEBP, with a quality slider and a live file-size estimate. The output is rendered at exactly the canvas size and the dimensions are verified. Filenames are clean (`50-lob-haircut-ideas-pin-01.png`). Transparent PNG is available when the background is transparent. There is no watermark.
- **Preview**: the full design next to a mock mobile home feed at real column width.

## Architecture in one paragraph

React 18 + TypeScript + Vite, with **Konva (react-konva)** for the canvas and **Zustand** for state. Persistence goes through repository interfaces backed by **IndexedDB**. A Pin is a serializable `PinDocument` made of layers (frames, text, shapes), collage settings and a background. Templates are the same documents, authored at a native size and scaled to any canvas. The editor, export, thumbnails and previews all render through the same node components (`src/editor/canvas/nodes.tsx`). Export renders off-screen at scale 1 on a stage the exact size of the canvas, which is why the output matches the editor. See [docs/SPEC.md](docs/SPEC.md) for the full specification and architecture.

```
src/
  config/        canvas presets, design types & families, fonts, colors/limits
  model/         types (document model), factories, geometry, pure document ops
  collage/       layout definitions + gap/band math
  templates/     starter library (data), thumbnails
  store/         editor (doc + history), assets, library (templates, brand kits, presets), UI, project workflows
  storage/       repository interfaces + IndexedDB implementation
  services/      export/render, fonts, headlines, recommendations, quality checks, file validation, AI provider
  editor/        editor shell, canvas, side panels, properties, modals, design blocks
  dashboard/     projects, New Pin flow (type → size → template), gallery, brand kit
  ui/            design-system controls (fields, color picker, modal, toasts, error boundary)
  test/          unit tests
server/          optional AI proxy (keeps the API key server-side)
docs/            SPEC.md, ACCEPTANCE.md
```

## Keyboard shortcuts

| Keys | Action |
|---|---|
| Delete / Backspace | Delete selection |
| Ctrl/⌘ + Z · Ctrl/⌘ + Shift + Z · Ctrl/⌘ + Y | Undo · Redo · Redo |
| Ctrl/⌘ + C / V / D | Copy / Paste / Duplicate |
| Ctrl/⌘ + A | Select all |
| Arrows · Shift + Arrows | Nudge 1px · 10px |
| Double-click | Edit text / crop image |
| Enter / Esc | Finish crop · cancel swap/crop/edit, deselect |

## Tests

- `npm test`: 48 unit tests covering presets, collage math, crop geometry, headline application, every template at every preset, template switching (keeps images and headline), smart image assignment, undo/redo, quality checks, file validation, filenames, recommendations and IndexedDB round trips.
- Browser acceptance tests 1–7 were run against the live app. Results are in [docs/ACCEPTANCE.md](docs/ACCEPTANCE.md).

## Notes and limits

- Grouping layers isn't in the MVP; multi-select with align/distribute covers most uses.
- Fonts load from Google Fonts, so the first load needs internet. Bundling them locally is on the roadmap.
- Data lives in this browser's IndexedDB. Clearing site data removes projects. Cloud storage is on the roadmap behind the repository interfaces that already exist.
- PinCraft doesn't promise reach, rankings or traffic. It makes professional Pin creatives; performance depends on your content, account and audience.
