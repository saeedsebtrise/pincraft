# Autopilot validation — 7 November 2026

## Completed locally

The focused Autopilot change was exported from the Git index into a clean temporary checkout and installed with `npm ci` before committing. The checks below cover that isolated snapshot; unrelated, uncommitted editor features were excluded.

- `npm run lint`: passes for the Autopilot worker, Apps Script, setup page and feature tests. The legacy editor is outside this ESLint scope.
- `npm test`: 219 tests pass across 19 files, including queue, preview-isolation, real image-rendering and setup-page interaction tests.
- `npm run test:autopilot`: 9 Node checks pass.
- `npm run build`: passes, including strict TypeScript checking.
- `npm audit --omit=dev`: zero reported production dependency vulnerabilities after updating nanoid and Supabase within their existing major versions.
- The setup route loads in the browser and its accessibility snapshot exposes navigation, labelled fields, downloads and queue explanations.
- A synthetic 1000 × 1500 PNG was rendered and visually inspected. Headline, CTA and footer fit their bounds. This is a renderer check, not a live Gemini/article preview.
- New source changes pass whitespace checks. Existing unrelated editor changes were retained.

## Remaining launch work

- Complete configuration and verification of Google Apps Script, Gemini, GitHub environment secrets, Make mappings and Pinterest OAuth using `AUTOPILOT_SETUP.md`. The automated/local validation above used no credentials and published no Pins; service setup is a separate activity.
- Run a real preview, inspect its copy and imagery, then perform the guide's controlled single-Pin publishing test before enabling the timer.
- Browser screenshot calls aborted before dispatch. Desktop/mobile visual verification of the final enhanced page remains to be completed; DOM interaction tests and a responsive CSS review do not replace that check.
- Five existing development-tool audit entries remain: two moderate, one high and two critical in the Vite/Vitest dependency trees. Resolve these with a separately tested tooling upgrade before treating the repository as production-ready. Do not expose the development/test servers publicly.
- The build still reports a large main JavaScript chunk and an existing mixed static/dynamic import warning. The Autopilot page, guide and Apps Script download are loaded separately from the startup bundle.
- CI workflow files are prepared; remote CI runs, branch protection, deployment, monitoring and service backups were not configured in this local session.

## Dependency tradeoffs

The lockfile now resolves nanoid 5.1.16 and Supabase 2.119.0. An explicit Node 22 types dependency replaces reliance on transitive Node types. The minimatch 11.0.1 override removes the advisory introduced through the lint-tool dependency chain; lint, all tests and the production build pass with that override. Recheck the override when updating ESLint/typescript-eslint.

The application remains on React/Vite as agreed for this incremental feature. No framework, database or billing migration was performed. Architecture, queue schema, authentication, environment variables, setup and rollback procedures are in `AUTOPILOT_SETUP.md`.
