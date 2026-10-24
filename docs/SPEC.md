# PinForge — Product & Technical Specification

Status: MVP implemented and tested (see [ACCEPTANCE.md](ACCEPTANCE.md)). This document describes what is built, why it is built that way, and how it extends.

Contents
1. Product requirements (PRD)
2. Feature matrix
3. Design type system (revised feature architecture)
4. Template system & families
5. User flow & screens (with mockup descriptions)
6. Data model & template JSON
7. Technical stack decision
8. Folder architecture
9. UI design system
10. Storage, export, quality checks
11. How the Pin styles are built in the editor
12. Tests
13. MVP scope & roadmap

---

## 1. Product requirements

**Problem.** Pinterest bloggers make many Pins per article. Each one combines an article title, several photos, a website and a consistent brand. General-purpose editors are slow for this repetitive, structured work, and one-click generators give no control over the result.

**Goal.** Get from an article title and a set of photos to a professional, exact-size Pin in a few minutes, using automation (templates, auto-fill, headline suggestions, variations) while keeping full manual control over every element.

**Users.** Hair, beauty, home-decor, balcony/patio, fashion, recipe, relationship and lifestyle bloggers who publish listicle and editorial Pins daily, on desktop or laptop.

**Principles.**
- Pinterest-specific: Pin sizes, design types, center bands, number badges, website footers, mobile feed preview.
- Automation never removes control. Everything a template or generator produces is an ordinary editable layer.
- Collage is one design type among many, not the default for everything.
- No fake UI: every visible control works, and unbuilt features are not shown.
- Private by default: images stay in the browser, and AI is optional, text-only and off until the user enables it.
- No performance promises: the app makes creatives; reach depends on content, account and audience.

**Success criteria.** Each of the seven acceptance workflows completes. Export is pixel-exact in size and visually matches the editor. A 4-image editorial Pin goes from a new project to an exported PNG in under three minutes.

## 2. Feature matrix

| Area | Feature | Status |
|---|---|---|
| Sizes | Central preset registry with Official/Custom labels; 1000×1500 default; 3:4, 4:5, 9:16, 1:1; 736×1472 Custom Blog Pin | ✅ MVP |
| | Custom width/height, save as preset, resize canvas (collage re-flows) | ✅ MVP |
| Design types | 16 design types as step 1 of New Pin and as the gallery's primary filter | ✅ MVP |
| Templates | 37 data-driven templates in 10 families; category tags; preview, use, duplicate | ✅ MVP |
| | Save as template, rename and delete user templates | ✅ MVP |
| | Recommend a design from the article title | ✅ MVP |
| Collage | 23 layouts (1–6 images) including center-band layouts | ✅ MVP |
| | Gap, margin, band height, radius, border, region; drag-to-swap cells; detach; individual frame sizes | ✅ MVP |
| | Auto-fill, no duplicates by default, smart aspect-ratio matching | ✅ MVP (smart assignment counts as Phase 2, shipped early) |
| Canvas | Select, multi-select, marquee, drag, resize, rotate, snap guides, align, distribute, z-order, lock, hide, duplicate, copy/paste, undo/redo | ✅ MVP |
| | Group layers | ⏳ Roadmap |
| Images | Upload (picker, drag & drop, paste), 10 per project, magic-byte validation, size and dimension limits | ✅ MVP |
| | Non-destructive crop/zoom/position, flip, replace, reset; brightness, contrast, saturation, warmth, blur, grayscale | ✅ MVP |
| Text | Heading, subheading, body, CTA, website, badge, custom; full typography; background blocks (box/pill/circle, hug); stroke; shadow; auto-fit | ✅ MVP |
| | Text style presets; compositions (script + bold, stacked blocks, number + keyword) | ✅ MVP |
| Blocks | Number badge (4 shapes, 4 positions); center band (5 styles + dividers); website footer (5 styles + panel + separator) | ✅ MVP |
| Headlines | On-device suggestions + CTA ideas; headline fills badge, accent, lines and title | ✅ MVP |
| | AI assistant through a provider abstraction and a server proxy | ✅ Phase 2 shipped early (optional) |
| Brand | Brand kits (multiple), apply brand, brand swatches, logo | ✅ MVP |
| Color | Picker, HEX, RGB, recent, brand, document and preset colors, eyedropper where supported | ✅ MVP |
| Background | Solid, gradient, image, transparent | ✅ MVP |
| Quality | Overflow, small text, contrast, safe area, outside canvas, empty frames, low-res, missing asset, missing website, font failure | ✅ MVP |
| Preview | Full size + mobile feed mock | ✅ MVP |
| Projects | Autosave, save, duplicate, rename, delete, thumbnails, reopen exactly | ✅ MVP |
| Variations | Create variation (4 kinds); batch variations | ✅ (batch is Phase 2, shipped early) |
| Export | PNG/JPEG/WEBP, quality slider + size estimate, exact size verified, filename, transparent PNG, no watermark | ✅ MVP |
| Future | Accounts, cloud projects, teams, marketplace, Pinterest publishing, article URL import, billing, analytics | ⏳ Architecture ready (see §13) |

## 3. Design type system

The user's first creative choice is **what kind of Pin** to make. The 16 types are defined in `src/config/designTypes.ts`:

Single Image · Single Image + Text Overlay · Single Image + Text Panel · Split Layout · 2-Image · 3-Image · 4-Image Collage · 5-Image Collage · Editorial Blog · Listicle · Number Badge · Script + Bold Typography · Quote / Advice · Home Decor Style · Hair / Beauty Style · Blank Custom Canvas.

How a template gets its types (`templateDesignTypes()`):
- **Derived from structure.** The frame count sets Single, 2-, 3-, 4- or 5-image (0 means Blank). A `badge` layer adds Number Badge. An `accent` layer (script word) adds Script + Bold. Category tags add Home Decor and Hair / Beauty, and also Listicle and Quote / Advice. Because these are derived, a template a user saves gets classified with no extra work.
- **Explicit for style.** Overlay, Panel, Split and Editorial are declared on each built-in template.

Feature architecture (the layers of the system):

```
Design types ─┐
Categories ───┼──► Template gallery / recommendations ──► Template (PinDocument data)
Article title ┘                                                   │ instantiate (scale, fill headline/website/images)
                                                                  ▼
                       Design blocks ──► Editor document (layers + collage + background) ◄── Brand kit
                       (badge, band, footer,                       │
                        text styles, compositions)                 ├──► Quality checks
                                                                   ├──► Variations / batch
                                                                   └──► Renderer ──► Export / thumbnails / preview
```

## 4. Template system & families

A **template is a `PinDocument`**, the same structure as a project's design, authored at a native size (1000×1500, or 736×1472 for the blog family). There are no screenshots. Thumbnails are rendered from the data using generated placeholder photos.

`instantiateTemplate(template, {width, height, presetId, headline, website, assetIds})`:
1. Clone the document and give every layer a new id.
2. `scaleDoc` to the target size. Positions and sizes scale per axis; typography, padding and strokes follow the width; collage frames re-flow from the layout instead of being stretched.
3. Apply the headline (`applyHeadline`): a leading number goes to the badge; a leading descriptive word ("Stunning", "Perfect") goes to the script accent; the rest is spread across stacked `title-line` blocks with balanced line lengths, or placed in the `title`.
4. Set the website on `website` layers.
5. Assign images to empty frames.

`switchTemplate` does the same while keeping the current images (in their current order), headline and website. That is what makes "change template" safe (acceptance TEST 4).

### Families (all in `src/templates/builtins.ts`)

| # | Family | Structure | Built-in examples |
|---|---|---|---|
| 1 | 2 top + 2 bottom + center text | `band-2-2` layout, band shape, optional badge, footer | White Band + Badge · Cream Band + Script · Dark Band · Blog 736 center band |
| 2 | 2 top + headline + 3 bottom | `band-2-3`, headline band, badge | Balcony White Headline · Patio Script + Bold · Distressed Dark Band · Blog 736 2+3 |
| 3 | 4-image editorial collage | `grid-2x2` thin dividers, stacked blocks or a box with a script accent | White Blocks · Black Blocks · Script Accent Box · Hero Left + 2 · Blog 736 editorial |
| 4 | Number badge listicle | large circle / rounded / square badge + big keyword headline | Text-First Big Number · Badge + 4-Image Grid · Badge Over Image (hero + 3) |
| 5 | Script + bold mixed font | `accent` script word + bold caps title, white band | Script + Bold White Band (52 Perfect Bronde…) · Two Photos (Best Balcony…) |
| 6 | Single image + bold overlay | full-bleed photo, tint or white box, optional badge | Dark Tint · White Box + Badge · Magazine Cover · Blog 736 overlay |
| 7 | Single image + text panel | photo plus a separate readable panel or card | Bottom Panel · Minimal Rounded · Center Card · Quote/Advice Blush · Quote Text Only · Recipe Card · How-To Steps · Blog 736 panel |
| 8 | Hair / beauty | image-driven, 2 or 4 photos, badge, white blocks | 2 Photos + White Blocks · 4 Photos + Pink Band · Side by Side Bold |
| 9 | Home decor / balcony / patio | warm collage, central title, badge | Hero + 4 + Center Title · Editorial Offset · Patio Badge on Band 2+3 |
| 10 | Blank editorial canvas | empty document | Blank |

Category tags: Hair, Beauty, Home Decor, Balcony, Patio, Living Room, Fall Decor, Fashion, Lifestyle, Relationship, Quote, Listicle, Food / Recipe, How-To, Custom Blog Pin, My Templates.

### Recommend a design (`src/services/recommend.ts`)

This is local and needs no AI. Topic rules match the title to categories (balcony, patio, living room, fall, decor, hair, beauty, fashion, recipe, relationship, quote, how-to). A leading number favors number-badge and listicle designs, and a descriptive first word favors script + bold. Matching the image count adds points, and so does a native size that matches the preset. Results are diversified so the first picks come from different families. Each pick shows its reasons, for example "Fits your balcony topic · Number badge for your list count". The user can always ignore them.

## 5. User flow & screens

```
Dashboard ──► Create New Pin
               1. Design type (16 cards; optional article title → recommendations row)
               2. Pin size (presets with Official/Custom chips, custom size, save preset)
               3. Template (gallery filtered to the type; recommendations; Blank skips this step)
            ──► Editor (Uploads tab opens first if the template has image slots)
               upload/auto-fill → pick headline → customize → preview → export
```

### Screen descriptions (mockups as built)

**Dashboard.**
- Top bar: logo, Projects / Templates / Brand Kit, and a red "Create New Pin" button.
- Hero card with "Browse templates" and "Create New Pin".
- A dismissible 4-step getting-started row.
- A grid of recent projects with real thumbnails at their own aspect ratio, each with a ⋯ menu (Rename, Duplicate, Delete).

**New Pin, step 1: Choose a design type.**
- An article title field at the top.
- When it has text, a "Recommended for your title" row of 4 rendered template cards, each with its reason.
- Below it, a grid of 16 type cards, each with a small structural diagram (for example 2×2 photos with a text band), a label and a hint. Next/Back sit at the top right.

**Step 2: Choose your Pin size.**
- Preset cards drawn as proportional rectangles, labeled with name, size, ratio and a colored status chip (green Recommended, blue Supported, purple Custom).
- A custom-size card with width, height, a name, "Use this size" and "Save as preset".
- A note saying when the preset labels were last checked against Pinterest's help docs.

**Step 3: Pick a template.**
- Left: the list of design types with counts.
- Top: category filter chips.
- Body: sections per family ("1. 2 Top + 2 Bottom + Center Text", …) with template cards. Each card shows the thumbnail, name, image-count and ratio chips, and on hover "Use template" plus Preview. My Templates appear first.

**Editor (desktop).**
- Top bar: back, project name (editable), size chip, save status, undo/redo, Fresh Variation, Save as Template, Preview, Save, Export (red).
- Left rail: Templates, Uploads, Layouts, Text, Brand Kit, Background, Elements, Layers, Projects.
- Side panel: the tab's tools.
  - **Templates**: type and category filters, recommendations, mini cards.
  - **Uploads**: dropzone, auto-fill (smart / duplicates toggles), image library with "In use" badges.
  - **Layouts**: layout tiles grouped by image count, gap, margin, band height, radius, border, collage area.
  - **Text**: headline assistant, add text, compositions, text styles, number badge, center band, website footer.
  - **Layers**: drag to reorder, rename, show/hide, lock, duplicate, delete.
- Center: the canvas on a neutral workspace, with a dashed blue safe-area guide, red snap lines, a contextual hint pill ("Drag to reposition · scroll to zoom") and a zoom control.
- Right: properties that change with the selection.
  - **Nothing selected**: canvas size, safe-area toggle, live design check.
  - **Image**: crop/swap, replace, crop sliders, flip, adjustments, frame.
  - **Text**: content, typography, block, shadow, stroke. Badges also get number, shape and position.
  - **Several layers**: align and distribute.
  - Every selection also shows position and size.

**Export modal.**
- Format segments, an "exact size" chip, a quality slider for JPEG/WEBP, the filename and the estimated file size.
- A "Before you export" warning list.
- Download Pin, and after download a verified-size confirmation.

**Preview modal.** The full design next to a mock two-column mobile feed with the Pin at 180px column width.

**Fresh Variation modal.** Four variation cards, plus batch generation that shows rendered candidates with checkboxes and "Keep selected".

**Mobile and tablet.** The panels collapse. On phones the rail becomes a horizontal strip and panels become bottom sheets. The editor is desktop-first; previewing and basic edits work on smaller screens.

## 6. Data model

```
Project { id, name, schemaVersion: 1, doc: PinDocument, assetIds[], meta, thumbnail? }
  meta { articleTitle, headline, keyword, templateId, brandKitId, createdAt, updatedAt }
PinDocument { width, height, presetId, background, collage | null, layers[] }   // layers[0] = bottom
  Background { type: solid|gradient|image|transparent, color, gradientFrom/To/Angle, assetId }
  CollageSettings { layoutId, region (0..1 rect), gap, margin, band (0..0.8), cornerRadius, borderWidth, borderColor }
Layer = FrameLayer | TextLayer | ShapeLayer
  base { id, type, name, x, y, width, height, rotation, opacity, visible, locked,
         role: title|title-line|accent|badge|subtitle|body|website|cta|logo|band|decor|none }
  FrameLayer { assetId|null, fit: cover|contain, crop {zoom, fx, fy}, flipX, flipY,
               adjust {brightness, contrast, saturation, warmth, blur, grayscale},
               cornerRadius, strokeWidth, stroke, placeholderFill, slot|null }
  TextLayer  { text, fontFamily, fontSize, fontWeight, italic, underline, fill, align, verticalAlign,
               lineHeight, letterSpacing, textTransform, autoFit, minFontSize,
               background {enabled, shape: rect|pill|circle, color, opacity, paddingX/Y, radius,
                           borderWidth, borderColor, hug}, shadow {...}, strokeWidth, stroke }
  ShapeLayer { shape: rect|ellipse|line, fill, stroke, strokeWidth, cornerRadius }
AssetMeta { id, name, mime, width, height, size, createdAt }   + original Blob in the asset repository
Template { id, name, description, family 1–10, categories[], designTypes?[], imageCount, doc, source, createdAt }
BrandKit { id, name, brandName, website, logoAssetId, primary, secondary, accent, headingFont, bodyFont, ctaStyle }
```

Key design decisions:
- **The crop is a focal point plus zoom** (`fx, fy` in 0..1 of the source), not pixel offsets. It survives frame resizes, template switches and canvas resizes, and the geometry comes from the image's *natural* size. That is why the editor (working from a preview image) and the export (from the full-resolution original) produce identical crops.
- **Roles** carry meaning (title, badge, accent, website, band), so headlines, brand kits, recommendations and variations can work on any design without hard-coded layer ids.
- **Collage frames carry a `slot`.** Collage settings re-flow slot frames. A frame the user moves or resizes by hand is detached (`slot: null`) and is never repositioned against their will.

### Example template JSON (abridged, 1000×1500, family 2)

```json
{
  "id": "f2-balcony-white", "name": "Balcony Ideas — White Headline", "family": 2,
  "categories": ["Balcony", "Home Decor", "Patio", "Listicle"], "designTypes": ["split", "listicle"],
  "imageCount": 5, "source": "builtin",
  "doc": {
    "width": 1000, "height": 1500, "presetId": "pin-standard",
    "background": { "type": "solid", "color": "#FFFFFF" },
    "collage": { "layoutId": "band-2-3", "region": {"x":0,"y":0,"width":1,"height":1},
                 "gap": 8, "margin": 0, "band": 0.28, "cornerRadius": 0, "borderWidth": 0, "borderColor": "#FFFFFF" },
    "layers": [
      { "type": "frame", "slot": 0, "x": 0, "y": 0, "width": 496, "height": 536, "assetId": null,
        "crop": {"zoom":1,"fx":0.5,"fy":0.5}, "fit": "cover", "role": "none" },
      "… 4 more frames …",
      { "type": "shape", "role": "band", "name": "Text band", "fill": "#FFFFFF", "x": 0, "y": 540, "width": 1000, "height": 420 },
      { "type": "text", "role": "badge", "text": "24", "fontFamily": "Anton", "fill": "#FFFFFF",
        "background": { "enabled": true, "shape": "circle", "color": "#B5651D", "hug": false } },
      { "type": "text", "role": "title", "text": "Charming Bohemian Balcony Ideas", "fontFamily": "Archivo Black",
        "textTransform": "uppercase", "autoFit": true, "fontSize": 92 },
      { "type": "text", "role": "website", "text": "yourwebsite.com", "letterSpacing": 4, "textTransform": "uppercase",
        "fill": "#FFFFFF", "shadow": { "enabled": true } }
    ]
  }
}
```

## 7. Technical stack decision

| Choice | Why |
|---|---|
| **React 18 + TypeScript + Vite** | Typed models end to end; fast dev loop; static build (the MVP needs no server). |
| **Konva + react-konva** (over Fabric.js) | Declarative React bindings fit a state-driven editor: the document is the single source of truth and the canvas is a pure function of it. Fabric is imperative and owns its own object state, which fights undo/redo and serialization. Konva has `clipFunc` for rounded image frames, `Transformer` for resize/rotate with multi-node drag, cacheable filters for non-destructive adjustments, and `toCanvas({pixelRatio})` for exact-size export. Fabric's built-in text editing (IText) is better; we cover that with an overlay textarea on double-click. |
| **Zustand** | Small separate stores (editor+history, assets, library, UI) without boilerplate; easy to subscribe to from outside React (autosave, export). |
| **IndexedDB (idb-keyval)** | Stores original image Blobs and projects locally; behind repository interfaces so cloud storage can be swapped in. |
| **Plain CSS with design tokens** | Small, consistent design system without a build-time CSS framework; tokens live in `styles/app.css`. |
| **Vitest + jsdom + fake-indexeddb** | Pure model/services are tested headlessly; canvas behavior is covered by browser acceptance tests. |
| **lucide-react** | Consistent, accessible icon set. |

## 8. Folder architecture

See README for the tree. Rules:
- `model/` and `collage/` are pure: no React, no DOM, all unit-tested.
- `services/` holds side-effecting capabilities (render, fonts, AI, validation).
- `store/` holds state plus workflows.
- Components never touch IndexedDB directly; they go through `storage/repositories.ts`.
- One renderer: `editor/canvas/nodes.tsx` is shared by the editor, export, thumbnails, previews and batch variations.

## 9. UI design system

- **Tokens** (`:root` in `styles/app.css`): neutral warm grays (`--bg #f4f3f1`, surfaces white / `#f8f7f5` / `#efeeeb`), text `#1c1b19` / `#5f5b55` / `#8f8a83`, accent Pinterest red `#e60023` used only for primary actions, focus blue `#2f6fed` (also used for selection), plus success, warning and danger.
- **Spacing** 4/8/12/16/24/32. **Radius** 6/10/14/pill. **Type** Inter at 11/12.5/14/16/22.
- **Components**: buttons (default, primary, dark, ghost, sm/lg), icon buttons with CSS tooltips (`data-tip`), inputs, number fields that commit on blur/Enter with ↑/↓ stepping, range rows with value readout, segmented controls, switches, color popover, chips (status chips for Recommended/Supported/Custom), cards, modals (focus moves in, Esc closes, focus is restored), toasts (aria-live), and error boundaries per panel.
- **States**: hover is a surface tint; selected/pressed is a dark fill or a 1px dark ring; selected objects on canvas get a blue Transformer; focus-visible gets a blue outline. State is never shown by color alone: pressed buttons also change fill, and warnings carry an icon and a title.
- **Accessibility**: aria-labels on icon buttons, roles on lists, radiogroups and switches, keyboard reachable panels, a labeled canvas region.

## 10. Storage, export, quality

- **Repositories** (`ProjectRepository`, `AssetRepository`, `CollectionRepository`) over IndexedDB stores: projects, assets (original Blob + meta), templates, brand kits. Presets, UI preferences and the active kit are in localStorage.
- **Autosave**: every document revision is written 500ms later. The thumbnail re-renders after 2.5s, and the write is flushed when the tab is hidden. Deleting a project also removes images no other project uses.
- **Export**:
  1. Load fonts.
  2. Decode the full-resolution originals.
  3. Render the document off-screen on a Konva stage the exact canvas size, at pixel ratio 1.
  4. Composite onto a canvas of exactly `width × height`, filling white unless transparent PNG was chosen.
  5. Verify the dimensions.
  6. Encode (PNG; JPEG/WEBP with quality) and check the encoded MIME type.

  Guides, selection boxes and placeholder labels live on a separate overlay layer or exist only in edit mode, so they can never be exported.
- **Quality checks** (`services/qualityCheck.ts`) are pure, with text measurement injected. The contrast check samples the rendered background under each text layer, with the text hidden, when the Export modal opens. The safe-area check uses the visible text bounds, not the editable box.

## 11. How the Pin styles are built in the editor

| Style | Mechanism |
|---|---|
| 2 top + center text + 2/3 bottom | Band layouts (`band-2-2`, `band-2-3`, `band-1-2`, `band-1-1`) open a band of `collage.band` height between image rows. A `role: band` shape tracks the band automatically when you change its height. Text → Center band adds or restyles it and moves the existing headline into it. |
| Thin-divider editorial grid | Collage `gap`, with the background color showing through as the divider color. |
| Stacked editorial title blocks | Several `title-line` text layers with `background.hug`, so each block hugs its word. The headline is spread across them with balanced line lengths. |
| Number badge | A `role: badge` text layer whose background is a circle, rect (+ radius = rounded square) or pill. Position presets: top-left, center-top, over band, over image. A leading number in the headline fills it automatically. |
| Script + bold | A `role: accent` text layer in a script font (Great Vibes, Allura, Pacifico, Sacramento) over a bold caps `title` (Anton, Oswald, Archivo Black, Bebas Neue). A leading descriptive word in the headline becomes the accent. |
| Distressed headline | The Rubik Distressed or Rubik Dirt display fonts (Text styles → Distressed display). |
| White / black boxes, outline, shadow | Text styles presets, or background, stroke and shadow controls. |
| Website footer | A `role: website` text with 5 styles (over image with shadow, dark pill, light pill, plain dark, plain light), an optional light panel and a separator line. Uppercase with letter spacing by default; filled from the Brand Kit website. |
| Overlay / panel / quote | Single-cell layouts with a `region`, plus a tint shape, white box text, or panel area. |

## 12. Tests

- **Unit (41)**: `src/test/model.test.ts`, `src/test/services.test.ts`. See README.
- **Browser acceptance (7/7)**: [ACCEPTANCE.md](ACCEPTANCE.md). These were run in a real browser against the dev server, using a dev-only `window.__pf` hook to drive uploads (synthetic images) and to measure export dimensions and pixel parity.

## 13. MVP scope & roadmap

**MVP (done).** Everything in §2 marked MVP, plus several Phase 2 items shipped early: smart image assignment, batch variations, the optional AI assistant, and multiple brand kits.

**Architecture hooks for later phases.**

| Future feature | Where it plugs in |
|---|---|
| User accounts and cloud projects | Implement `ProjectRepository` / `AssetRepository` against an API, add an auth provider, and keep IndexedDB as an offline cache. `schemaVersion` on projects enables migrations. |
| Team workspaces and collaboration | `BrandKit` and `Template` collections become workspace-scoped; documents are already immutable snapshots, which suits sync and CRDT later. |
| Template marketplace / admin manager | Templates are JSON `PinDocument`s with `source`; add `source: 'marketplace'` and a loader. |
| Bulk article workflow | `generateBatch()` already maps one project onto N templates; feed it from a CSV or a list of article titles. |
| Article URL import | A server-side fetcher that respects robots.txt and image ownership returns title and image URLs, which feed `createPin` and `importAndPlace`. Not built in the MVP by design. |
| Pinterest publishing | A separate module using Pinterest's official API with OAuth, taking `exportDocument()` output plus title, description, link and board. It never posts automatically. |
| AI image features (background removal, generation, image ranking) | A new provider interface beside `TextAssistProvider`; images would leave the device only behind an explicit per-feature opt-in. |
| Subscription billing / analytics | Server side, next to accounts. The editor has no watermark and no gated features today. |
| Grouping | A `GroupLayer` type in the union, plus a Transformer on group nodes. |
| Self-hosted fonts | Bundle the 22 families (e.g. via @fontsource) for offline use and guaranteed export parity. |
