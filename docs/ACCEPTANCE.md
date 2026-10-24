# Acceptance test results

Run on 2026-10-24 against the dev server (`npm run dev`) in a Chromium-based browser at a 1440×900 viewport. Test images were generated in the page (JPEG canvases of known sizes) and fed through the real upload pipeline (`importAndPlace` → validation → IndexedDB → preview decode). Exports went through the same `exportDocument` code as the Export modal's Download button. Measurements used the dev-only `window.__pf` hook.

| # | Workflow | Result | Evidence |
|---|---|---|---|
| 1 | 1000×1500 project → upload 4 → 2×2 template → edit each crop (zoom/focal/flip) → headline → export PNG | ✅ Pass | All 4 frames auto-filled; headline split into badge "50" + "Lob / Haircut / Ideas"; exported `image/png` decoded at **1000×1500**. |
| 2 | 736×1472 project → upload 5 → 5-image collage → title + website → export JPEG | ✅ Pass | `blog-736-five-band`: 5/5 frames filled, accent "Stunning" + title "Balcony Decor Ideas", website `chiquehomeliving.com`; exported `image/jpeg` decoded at **736×1472**. |
| 3 | Single-image Pin → add 4 text blocks → move & resize → undo → redo → save → browser refresh → reopen | ✅ Pass | Added heading, subheading, body and custom text by clicking the panel; real mouse drag moved Body text y 900→1145 (with center snap guide); a corner-handle drag resized it 800→885px (font 34→38). Undo ×2 restored (100, 900, 800, 34); redo ×2 restored (100, 1145, 885, 38). After `location.reload()` the reopened document was **byte-identical** to the saved one. |
| 4 | Switch between 4-image templates | ✅ Pass | Switched Editorial White Blocks → Center Text White Band → Editorial Black Blocks; slot images stayed in the same order, all project images stayed in the library, the headline "50 Lob Haircut Ideas" was kept, and no layer had missing fields. Also covered by unit tests. |
| 5 | Crop/reposition → export → crop matches preview | ✅ Pass | Editor content layer vs full-resolution export, mean absolute difference inside each image frame: **0.18 / 0.49 / 1.45 / 1.58** (0–255 scale). The only outliers were on anti-aliased letter edges, from preview vs original resampling. Visual side-by-side confirmed fonts, crops, flips, dividers and footer match. |
| 6 | Text near edge → safe-area warning; guide not exported | ✅ Pass | A left-aligned text at x=8 showed "Outside safe area" in the design check and in the Export modal. Blue guide pixels sampled along x=60 (6% guide): **117** in the editor with the overlay, **0** in the exported PNG. |
| 7 | Low-resolution source → warning, app keeps working | ✅ Pass | A 150×200 image in a 495×745 frame showed "Low resolution image — upscaled 373%"; a 1000×1000 image zoomed 2× flagged 149%. Editing and export continued normally. |

Additional checks done in the same session:
- A bad file (`fake.png` containing text) was rejected with "fake.png isn't a supported image. Use JPEG, PNG or WEBP."; nothing was added to the project.
- Export modal: PNG/JPEG/WEBP, the quality slider re-encodes and shows the real file size, clean auto filename `50-lob-haircut-ideas-pin-01.png`, the warnings list appears before download.
- Preview modal: full design plus a mobile feed mock at a 180px column.
- Batch variations: 6 candidates rendered with the user's images and headline; "Keep selected" saved 6 new projects.
- New Pin flow: the article title "32 Minimalist Balcony Decor Ideas" recommended Balcony White Headline, Text-First Big Number, Patio Badge on Band and Script + Bold Two Photos.
- Center band on a 4-image design: the image rows moved apart, and the existing badge plus headline blocks moved into the dark band.
- Production build (`npm run build`) succeeds; 41/41 unit tests pass.

Issues found during testing and fixed before sign-off:
- A regex bug in the script-accent split (`/s+/` instead of `/\s+/`).
- The safe-area check used the text box instead of the visible text, which gave false positives on centered titles.
- The text-too-small threshold flagged template labels; it was lowered to 2.6% of the canvas width.
- Adding a center band duplicated the headline instead of moving it into the band.
- Script accents took non-descriptive words ("Lob"); only descriptive words are used now.
- Manually added headings no longer take over the template's title role.
- Leaving the editor within the 500ms autosave window could skip the last save, and a font effect could throw on exit; both fixed and re-verified (edit, then leave immediately: change persisted, no console errors).
- Mini template cards had overlapping captions (CSS selector scope).

Not covered by automation: touch input on tablets, Safari and Firefox rendering differences (Konva filters and `ctx.filter` are not used, so they should behave the same), and offline font loading.
