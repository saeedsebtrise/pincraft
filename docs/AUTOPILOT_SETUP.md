# Pinterest Autopilot setup

Autopilot turns a queue of your article links into 1000 × 1500 image Pins. Google Sheets owns the queue and schedule, a GitHub Actions worker reads articles and renders images, Gemini drafts the copy, and your Make scenario publishes through its Pinterest connection.

Open **Publish & grow → Autopilot** in PinCraft for the setup downloads and shortcuts. That page is a setup companion: it does not read the live queue, verify connections, store credentials, or turn publishing on. Google Sheets remains the source of truth.

## What is included

- A `Pins` sheet with Pending, Processing, Publishing, Posted, Error, Retry, Skip, and Needs review states.
- A 15-minute Apps Script timer that requests one cloud run when work is due. Each worker processes at most one article.
- Up to 10 publishing attempts in a rolling 24 hours, at least 120 minutes apart. You can reduce the limit or increase the interval. Attempts with an uncertain outcome still count.
- AI-generated keyword, title, description, alt text, CTA, and an allowed board selection; deterministic photo layouts rendered with Sharp. These are AI-assisted Pins, not AI-generated photos.
- A preview mode that saves a PNG and metadata without touching the Sheet, consuming publishing quota, or contacting Make.
- A publishing gate and durable state before calling Make. An unclear outcome stops the queue for reconciliation; no automatic publishing retry is performed by the worker.

This is one owner-operated queue, not a multi-tenant scheduling service. It does not guarantee exactly-once publication across external providers, guarantee an exact posting time, or promise traffic. Use public articles and images you own or have permission to publish. Preview-generated copy and alt text need editorial review before enabling automatic runs.

## 1. Prepare the repository and provider accounts

Use a GitHub repository containing this code, Google Sheets with Apps Script, a Gemini API project, and Make with a Pinterest connection. The worker runs in the cloud even while your computer is off. Provider quotas, billing, and available models depend on your accounts; this guide does not assume the workflow is free.

Run locally with Node 22 or later:

```sh
npm ci
npm run dev
```

Commit the implementation through a reviewed feature branch. Make sure `.github/workflows/pinterest-autopilot.yml` is available on the repository's default branch before using the Actions interface or timer. Keep the worker on a reviewed branch or tag, and restrict who can change it.

Create a GitHub Actions environment named **autopilot**. Add the secrets and variables listed below. Begin with `AUTOPILOT_ENABLED=false`. An environment requiring approval for every run will also require approval for timer-triggered runs; choose that setting according to your intended operating mode.

### GitHub environment secrets

| Name | Value to supply | Needed for |
|---|---|---|
| `GEMINI_API_KEY` | Key from your Gemini API project | Preview and publishing |
| `AUTOPILOT_SHEET_URL` | Deployed Apps Script URL ending in `/exec` | Publishing |
| `AUTOPILOT_SHEET_SECRET` | Same random secret as Script Property `SHARED_SECRET`; at least 32 characters | Publishing |
| `MAKE_WEBHOOK_URL` | HTTPS Custom webhook URL created in Make | Publishing |
| `MAKE_WEBHOOK_API_KEY` | API key configured on that webhook | Recommended for publishing |

### GitHub environment variables

| Name | Value to supply |
|---|---|
| `AUTOPILOT_ENABLED` | `false` initially; `true` only when ready to publish |
| `AUTOPILOT_BOARDS_JSON` | JSON array of board IDs and names; IDs must be strings |
| `GEMINI_MODEL` | A model ID available to your account that supports `generateContent` and JSON output |
| `AUTOPILOT_TEMPLATE` | Optional. `A` sandwich, `B` top-card, `C` pastel-band, `D` bold-banner, `E` split-title, `F` frame-box, `G` hook-banner or `H` top-card-pill to use one design; empty or `rotate` rotates A–H per article. C, D, E and G need 6 usable photos (300px+ short side), the others 4; with fewer the Pin uses A (2 photos when only 1–3 are usable). D and G need a banner and script line, F and H a script line; without them the next template in rotation is used. Preview `preview.json` shows the template and palette used. |

Board configuration example (replace the example ID):

```json
[{"id":"123456789012345678","name":"Home decor"}]
```

Use actual numeric board IDs from **Pinterest → List Boards** in Make or PinCraft's connected Boards view. A board URL slug is not a board ID. Choose boards accessible to the account connected in Make.

The worker sends article text and photo alt labels to Gemini, not photo bytes. It requests JSON and validates the result with Zod before use. Model access and configuration must be tested in preview. See Google's [generateContent reference](https://ai.google.dev/api/generate-content?hl=en).

## 2. Create the Google Sheet and deploy its script

1. Create a private Google Sheet. Open **Extensions → Apps Script**.
2. Replace the starter code with `autopilot/google-sheet-script.gs`, also downloadable from PinCraft's Autopilot page. Save it.
3. In Apps Script **Project Settings → Script properties**, add the properties below. Keep `ENABLED=false`.
4. Select and run `setup`; accept the requested Google permissions. It creates the `Pins` tab and formats its columns as text, preserving long Pinterest IDs. If using the downloadable queue CSV, import it into the `Pins` tab with numeric conversion disabled, then run `setup` to check the headers.
5. Choose **Deploy → New deployment → Web app**. Execute as **Me** (the Sheet owner); allow access by **Anyone** so the cloud worker can call it. The script checks a shared secret in every POST body before accessing the queue. An organization that prohibits anonymous web apps needs a different authenticated bridge; this deployment mode will not work there.
6. Copy the production `/exec` URL into GitHub's `AUTOPILOT_SHEET_URL` secret. Set `AUTOPILOT_SHEET_SECRET` to the same value as `SHARED_SECRET`. Do not use the editor-only `/dev` URL.

Google documents the execution identity and deployment controls in [Apps Script web apps](https://developers.google.com/apps-script/guides/web). When updating the script, publish a new version through **Manage deployments**; saving source alone does not update an existing versioned deployment.

### Script properties

| Property | Value / purpose |
|---|---|
| `SHARED_SECRET` | Random secret of at least 32 characters; keep out of the Sheet cells and repository |
| `SHEET_ID` | Spreadsheet ID; `setup()` fills this automatically for a bound script |
| `ENABLED` | `false` until preview and Make setup are complete |
| `DAILY_LIMIT` | `10` by default; integer from 1 to 10 |
| `INTERVAL_MINUTES` | `120` by default; at least 120 |
| `PHOTO_LAYOUT` | Optional, set from the Autopilot page: `random` (default), `4`, `6` or `8` photos per Pin |
| `PIN_SIZES` | Optional, set from the Autopilot page: comma-separated sizes to rotate through, e.g. `2:3,1:2` (default `2:3`) |
| `SAME_ARTICLE_GAP_HOURS` | Optional. Hours between two Pins of the same article; `24` by default (0–720) |
| `GITHUB_REPO` | Repository in `owner/repository` format |
| `GITHUB_REF` | Reviewed branch or tag to run; defaults to `main` |
| `GITHUB_TOKEN` | Fine-grained token restricted to this repository, with Actions write permission |
| `ATTEMPTS` | Managed by the script; publishing timestamps used for the rolling limit |
| `LAST_DISPATCH` | Managed by the script; reduces duplicate dispatches |

Do not create `ATTEMPTS` or `LAST_DISPATCH` manually for a fresh installation. Do not clear them to bypass the posting limits. Restrict Sheet and bound-script editing to trusted operators; editors can alter queue decisions and script configuration.

GitHub's [workflow dispatch API](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event) accepts a workflow filename, ref, and inputs, using a token with Actions write permission. The script uses API version `2026-03-10` and accepts a successful 2xx response. The token used by Apps Script is separate from the workflow's automatic `GITHUB_TOKEN`.

### Queue columns, in this exact order

```text
Article URL,Board ID,Status,Pin URL,Error,Job ID,Lease,Updated At
```

Enter one public article URL in column A. Column B is optional: leave it empty to let Gemini choose among configured boards, or specify a configured numeric board ID. Use `Pending` in C. Leave D–H empty on new rows; the worker manages them. Do not duplicate Job IDs or edit active rows while a worker is running.

## 3. Build the Make publishing scenario

Create this sequence:

```text
Custom webhook → Pinterest: Create a Pin → Webhook response
```

Connect the intended Pinterest account in the Pinterest module. PinCraft's own Pinterest sign-in is independent of Make's connection; signing in to one does not configure the other. See [Make's Pinterest connection instructions](https://apps.make.com/pinterest).

In **Custom webhook**, add API key authentication and store the matching key in GitHub's `MAKE_WEBHOOK_API_KEY`. The worker sends it as `x-make-apikey`. Configure these incoming fields as text: `job_id`, `keyword`, `title`, `description`, `alt_text`, `cta`, `board_id`, `link`, `image_base64`, `image_mime`, `filename`. You can define the structure manually without sending a request or creating a Pin. Keep JSON pass-through off so the fields are available for mapping.

The worker sends a JSON object with that contract. `image_base64` is raw base64, without a `data:image/...;base64,` prefix. `image_mime` identifies the image format. Make limits webhook payloads to 5 MiB; the worker checks the serialized payload before reserving a publishing attempt. [Make Custom webhook documentation](https://apps.make.com/gateway).

Map the **Create a Pin** fields:

| Pinterest field | Worker field / expression |
|---|---|
| Board ID | `board_id` (enable mapping rather than a fixed board) |
| Title | `title` |
| Description | `description` |
| Link | `link` |
| Alt text | `alt_text` |
| Image file name, if using upload mode | `filename` |
| Image file data, if using upload mode | `toBinary(image_base64; base64)` |

Select image/file upload rather than URL media. In Make's expression editor, insert the webhook's `image_base64` mapping token into `toBinary(...; base64)`; this decodes it to file bytes. The exact media field label varies with module version. If the module exposes a base64 source directly, supply `image_base64` as text and `image_mime` as its content type instead. Do not decode and then re-encode accidentally. Make documents this conversion in [text and binary functions](https://help.make.com/text-and-binary-functions).

If your Create a Pin module lacks the required media or alt-text fields, use **Pinterest → Make an API Call** through the same connection, targeting `POST https://api.pinterest.com/v5/pins` (enter the path relative to the API base displayed by the module). Create the request with **JSON → Create JSON**, mapping this structure, and map its result as the body:

```json
{
  "board_id": "<map board_id>",
  "title": "<map title>",
  "description": "<map description>",
  "alt_text": "<map alt_text>",
  "link": "<map link>",
  "media_source": {
    "source_type": "image_base64",
    "content_type": "<map image_mime>",
    "data": "<map image_base64>"
  }
}
```

The angle-bracket values above are mapping instructions, not literal strings. Using Create JSON ensures quotes and newlines in AI copy are escaped correctly. This payload follows [Pinterest's official API schema](https://github.com/pinterest/api-description/blob/main/v5/openapi.yaml); its [base64 media model](https://github.com/pinterest/pinterest-python-generated-api-client/blob/main/docs/PinMediaSourceImageBase64.md) requires `source_type`, `content_type`, and `data`. Make lists its authorized API-call module in the [Pinterest integration catalog](https://www.make.com/integrations/make/pinterest).

Place **Webhook response last**, with status `200`, header `Content-Type: application/json`, and this body, mapping the actual Pinterest result ID as a **string**:

```json
{"id":"<Pinterest result ID>"}
```

Do not return a board ID, job ID, full Pinterest response wrapper, or fabricated success. Numeric JSON IDs are rejected: Pinterest IDs can exceed JavaScript's safe integer range, so preserve them as quoted strings throughout Make. The worker validates this ID and writes the corresponding Pin URL to the Sheet. If using the API-call module, map the returned body's `id` (parse the JSON response first if the module exposes raw text).

Set the scenario to execute immediately and enable **Process data in order** (called sequential processing in some interfaces). Make otherwise permits parallel webhook executions. Its default `Accepted` response only acknowledges receipt, so the custom response is required. [Make webhook execution behavior](https://help.make.com/webhooks).

Leave **Store incomplete executions** off and do not add Retry handlers around Pinterest creation. Make can otherwise automatically retry some failed executions. Never manually replay a creation whose outcome is unknown. [Make incomplete executions](https://help.make.com/incomplete-executions).

### Replay protection and timeouts

Keep `job_id` in Make's execution history for reconciliation. For extra protection against manually replayed webhook requests, add a Make Data Store keyed by `job_id`: return the stored Pin ID for a `posted` record; stop with a non-success response for a `publishing` record; otherwise create a `publishing` record before calling Pinterest, then update it with the returned Pin ID. This is a scenario configuration you must build; the supplied worker does not create that Data Store. Use sequential execution and never clear an uncertain record until you reconcile it. [Make Data Stores](https://help.make.com/data-stores).

Current Make documentation gives a **180-second** response window; older guides may say 40 seconds. When that window expires, Make can return `Accepted` while processing may continue. The worker waits up to 190 seconds, but any timeout, invalid JSON, missing Pin ID, or lost completion update is still treated as uncertain. Do not retry solely because a request timed out. [Make response timeout](https://apps.make.com/gateway#webhook-response-module).

## 4. Run and review a preview

In GitHub, open **Actions → Pinterest Autopilot → Run workflow**. Choose `preview` and provide a public article URL. Only Gemini and article/image retrieval are used; the Sheet and Make publishing credentials are not needed for this mode.

Download the `autopilot-preview` artifact. Inspect `preview.png` at mobile feed width and `preview.json` for correct title, description, alt text, destination URL, and board. The artifact is retained for three days. Check readability, photo crops, factual claims, relevance, and rights to the content. A preview is newly generated when you run it; the later live run may generate different copy.

For local preview, copy `.env.example` to `.env`, set `GEMINI_API_KEY`, `GEMINI_MODEL`, `AUTOPILOT_BOARDS_JSON`, and `AUTOPILOT_PREVIEW_URL`, keep `AUTOPILOT_MODE=preview`, then run:

```sh
npm run autopilot
```

The command loads `.env` when present. Output goes to `output/autopilot/`. Do not put secrets in `VITE_` variables, committed files, or browser fields. Preview calls can still incur provider charges.

## 5. Enable one live run, then the timer

1. Activate the completed Make scenario and add one `Pending` row to the Sheet. Start with `DAILY_LIMIT=1`.
2. Set GitHub's `AUTOPILOT_ENABLED=true` and Script Property `ENABLED=true`. Both are required; configuring only one does not publish.
3. Manually run the workflow once in `publish` mode. The preview URL input is ignored; the worker claims the next eligible Sheet row.
4. Verify that the Sheet becomes `Posted`, its Pin URL opens the intended Pin, and the image, board, link, title, and alt text are correct.
5. Run `installTimer` from Apps Script. It replaces existing `tick` triggers in this script with a 15-minute trigger. Increase `DAILY_LIMIT` only within the supported 1–10 range once the first run is verified.

The timer checks whether work is due, then dispatches GitHub Actions. It does not promise exact clock-time delivery. Apps Script triggers run under their creator's account and are subject to provider scheduling and quotas. [Installable trigger documentation](https://developers.google.com/apps-script/guides/triggers/installable).

To pause, set Script Property `ENABLED=false` and GitHub's `AUTOPILOT_ENABLED=false`. Remove the `tick` trigger if no future checks should run. A request already sent to Make may still publish; inspect active GitHub and Make runs before changing rows.

## 6. Optional: run Autopilot from PinCraft

The **Autopilot** page has a control panel: see the queue, add article links, turn publishing on or off in the Sheet, set the daily limit (1–10), start a preview or a publish run, Retry/Skip rows and follow recent runs. It talks only to PinCraft's own server, which forwards to the Sheet web app; the Sheet starts GitHub runs with its `GITHUB_TOKEN`. The browser never sees the Sheet secret or any token.

1. Paste the latest `google-sheet-script.gs` over the old script and deploy a **new version** of the same web app (Deploy → Manage deployments → Edit → New version). The URL does not change.
2. In Vercel (Project → Settings → Environment Variables) add:
   - `AUTOPILOT_SHEET_URL` — the same `/exec` URL as the GitHub secret
   - `AUTOPILOT_SHEET_SECRET` — the same value as the GitHub secret and the Sheet's `SHARED_SECRET`
   - `AUTOPILOT_ADMIN_KEY` — a password only you know, 16+ characters. Anyone with it can control the queue, so keep it private.
3. Redeploy, open the Autopilot page and enter the admin key (kept for that browser tab only).

The panel only allows safe status changes (Error → Retry, Pending/Retry/Error → Skip, Skip → Pending). **Needs review** rows still have to be checked against Pinterest and Make and fixed in the Sheet. Turning publishing on in the panel sets the Sheet's `ENABLED`; GitHub's `AUTOPILOT_ENABLED` must also be `true`.

For local testing put the three values in `.env` and run `npm run ai-proxy`.

## Several Pins per article

One article can get up to 5 different Pins. In the PinCraft Autopilot page choose **Pins per article** before adding links, or add rows yourself: the plain link is Pin 1, then the same link ending in `#pin-2`, `#pin-3` … up to `#pin-5`.

- Each Pin gets its own template, lead photo, colour and Gemini copy written from a different angle. Every Pin links to the plain article URL.
- Pins of one article go out at least `SAME_ARTICLE_GAP_HOURS` apart (24 by default); other articles fill the slots in between. The daily limit and interval still apply to every Pin.
- Adding an article that already has Pins with a higher count adds only the missing ones.
- A preview run can show several Pins of one article: `preview.png`, `preview-2.png` … (workflow input **pins**).

After updating PinCraft, paste the new `google-sheet-script.gs` into Apps Script and deploy a new version of the web app (Deploy → Manage deployments → Edit → New version), so the Sheet understands `#pin-N` rows.

## Pin design: photos, sizes, colours and fonts

In the Autopilot page, **Pin design** sets how every Pin is drawn:

- **Photos per Pin** — Random, 4, 6 or 8. Eight-photo Pins use templates I and J; an article with fewer photos uses the largest layout it can fill.
- **Pin sizes** — any of 2:3 (1000×1500), 1:2 (1000×2000), 9:16 (1000×1778), 3:4, 4:5 and 1:1. With several, Pins rotate through them. The text panel keeps its design; only the photo areas grow or shrink.
- Every Pin gets its own colours and one of several bold headline fonts (Poppins, Titan One, Kanit, Luckiest Guy, Archivo Black, Anton, Lilita One), so Pins of one article never look alike.

Large images (1:2, 9:16) are sent as JPEG when a PNG would push the Make payload past 5 MiB; `image_mime` and `filename` say which. The settings travel to each run as the workflow inputs **photos** and **sizes**, which a manual run can also set.

## Recovery and duplicate handling

| Sheet state | Meaning and operator action |
|---|---|
| `Pending` or empty | Eligible when enabled and due |
| `Processing` | A worker owns the row; do not edit or retry while it runs |
| `Publishing` | Intent/quota recorded before Make; publication may have occurred |
| `Posted` | Valid Pin ID acknowledged and its link saved |
| `Error` | Failed before confirmed publishing intent; fix the article or configuration, then set `Retry` after the worker finishes |
| `Retry` | Explicit operator request to try again when due |
| `Skip` | Not eligible; also used for duplicate posted article URLs |
| `Needs review` | Outcome uncertain; the queue stops until reconciled |

On the next timer tick or claim, a lease unchanged for 20 minutes is expired under the Sheet lock. A stale `Processing` row becomes `Error` and may be retried manually; a stale `Publishing` row becomes `Needs review` and blocks further publication. This exceeds the worker's 15-minute workflow timeout. Expiry never retries the row automatically. An `Error` row does not block other pending rows.

For **Processing**, **Publishing**, or **Needs review** stuck after a run ends:

1. Pause both enable flags. Confirm that the GitHub job has ended and no matching Make run is active or queued.
2. Find the Sheet Job ID in Make history. Check Pinterest itself for the article and publication time; a failed response does not prove that creation failed.
3. If published, enter its exact Pinterest URL in **Pin URL** and set **Status=Posted**. Preserve Job ID and attempt history.
4. Only when you establish that no Pin was created and no request is still pending, fix the cause and set **Retry**. If using a Make Data Store ledger, reconcile its entry too.
5. Re-enable publishing when all blocked rows are resolved. Do not restore an old queue backup over new successful posts without merging those statuses first.

Posted article URLs are checked for duplicates with limited URL normalization. Different tracking queries, redirects, or different URLs serving the same article can escape that check. There is no external Pinterest idempotency guarantee; human reconciliation remains necessary after a crash or ambiguous response. The queue never automatically reclaims a row that may already have published.

For an `Invalid or duplicate Job ID` error caused by copying a row, confirm it has never published, clear that row's **Job ID** and **Lease**, then set **Retry** so it receives a new identity. Never clear a published or uncertain job's identity as a way to bypass reconciliation. Keep Board ID cells as plain text; re-enter an ID from its original source if Sheets has already rounded it.

Failures before publication consume no publishing attempt. Once publishing intent is recorded, its attempt remains counted even if the response is uncertain or the row requires review. Operator-set Retry does not bypass the interval or limit.

## Architecture and delivery notes

### Framework and stack

This change keeps the established **React 18 + TypeScript strict mode + Vite** application, using its existing CSS tokens and Lucide icons. The prior scope explicitly chose an external Sheets/Make cloud bot; replacing the working canvas editor with Next.js would add migration risk without improving that workflow. Astro would suit a separate public marketing site, while Next.js remains an appropriate future choice if scheduling becomes an authenticated multi-tenant product. Neither migration is part of this delivery.

The new server-side stack is **Node 22, Sharp, Zod, Gemini's HTTPS API, Google Apps Script/Sheets, GitHub Actions, and Make/Pinterest OAuth**. Existing Konva/Zustand/IndexedDB editing and optional Supabase accounts/storage remain independent. No Redis, paid storage service, payment integration, Drizzle schema, or new application authentication is needed for this owner-operated queue.

### Files and data model

```text
src/dashboard/AutopilotPage.tsx       setup UI and downloads
autopilot/core.mjs                    article, copy, and publishing workflow rules
autopilot/design.mjs                  server-side Pin image renderer
autopilot/run.mjs                     preview/publish command and provider adapters
autopilot/google-sheet-script.gs      locked queue API and timer
.github/workflows/pinterest-autopilot.yml  cloud worker
src/test/autopilot*.test.ts           isolated automated checks
docs/AUTOPILOT_SETUP.md               installation and operating guide
.env.example                         configuration names without credentials
```

The Sheet row is the job entity: article URL, optional board ID, status, Pin URL, error, stable Job ID, per-claim lease, and update timestamp. Script properties store schedule settings and attempt timestamps. The worker's copy object contains keyword, title, description, alt text, CTA, and board ID. It never treats AI output as trusted executable instructions. No application database migration is added. If this becomes multi-user, move jobs/attempts/connections into PostgreSQL with workspace foreign keys, unique idempotency keys, indexed due times/status, audit fields, and transactional claims before enabling shared use.

### API, authentication, and permissions

The Apps Script POST endpoint accepts `claim`, `publishing`, `complete`, and `fail`. All calls require the shared secret; state-changing calls after claim also require the matching Job ID and lease. A script lock protects the decision and update. The timer uses GitHub's authenticated dispatch API. Only the worker calls Gemini and the Make webhook. Pinterest OAuth stays in Make. The browser does not receive a publish credential or perform a private server action.

Operators are trusted Sheet/repository/Make administrators; there is no per-user RBAC or tenant isolation for this queue. Restrict those accounts and sharing permissions accordingly. Deploy a separate Sheet/script and environment for another owner. Existing PinCraft SaaS authentication does not grant or revoke remote queue access.

### Security and privacy checklist

- Keep all provider secrets in GitHub environment secrets or Apps Script properties; enable Make webhook authentication. Use HTTPS endpoints.
- Restrict the GitHub dispatch token to this repository and rotate it when needed. Limit repository and Sheet editors.
- Article/image retrieval uses the existing public-network checks and size limits. The renderer rejects undecodable/oversized image inputs. AI content is schema-validated, with board selection constrained to the configured list.
- Keep posting limits, state checks, leases, and workflow concurrency enabled. Do not introduce automated retries around irreversible publication.
- No API keys, raw provider errors, or base64 images should appear in worker logs. Provider execution histories and preview artifacts can contain article content and generated images; give access only to intended operators.
- Only article content and alt labels go to Gemini. Make receives the rendered image and generated copy; Pinterest receives the published Pin. This external data flow is separate from local-only editing.
- The secret-authenticated queue API does not rely on browser cookies, so it is not a cookie-based CSRF flow. Apps Script is not a general WAF or high-volume public API; move to an authenticated service if those requirements arise.

### SEO, performance, and accessibility checklist

- This setup screen is an application route, not an SEO landing page. It introduces no public article routes, canonical URLs, sitemap, or structured-data claims. Public-site SEO work remains separate.
- Check readable AI copy and descriptive alt text for each content category. AI suggestions do not guarantee ranking or reach.
- Keep image processing out of the browser bundle; use the cloud worker for Sharp rendering.
- Verify setup-page labels, keyboard focus, error feedback, usable downloads/links, and narrow-screen layout. Existing editor accessibility and performance need their own regression checks.

### Testing, deployment, and CI/CD

Before merging, run `npm run lint`, `npm test`, `npm run test:autopilot`, `npm run typecheck`, and `npm run build`. The lint configuration covers the Autopilot feature; it is not a claim that the entire existing application has been brought under ESLint. Automated checks exercise queue authorization and transitions, quota/interval boundaries, duplicate handling, invalid board IDs/copy, failed preparation, uncertain publication, failed completion updates, preview isolation, and valid image dimensions. Never run tests against a live publishing webhook.

Use the checks in `.github/workflows/ci.yml` on pull requests and review a preview deployment for the PinCraft UI. The existing Vercel/static-host deployment serves the setup page; GitHub Actions hosts the worker, Apps Script hosts the queue API, and Make hosts the publishing scenario. Require the CI checks in branch protection and protect the GitHub `autopilot` environment; those repository settings are an operator setup step. A green local test suite does not verify provider credentials, Apps Script deployment policy, Make module mapping, or live Pinterest access: complete the controlled preview and single-Pin test above before unattended operation.

Monitor GitHub run failures, Apps Script trigger failures, Make execution failures, and Sheet Error/Needs review rows. Configure provider notifications for the operator and review pending rows regularly; there is no new Sentry/uptime-monitor installation or automatic alert integration in this change. Track counts and outcomes without recording unnecessary personal data.

Back up the Sheet and script before updates, retaining Posted IDs and attempt history. Store credential backups separately in a secure secrets system. Roll back by pausing both enable flags, stopping the timer, reconciling in-flight work, then restoring a reviewed worker commit and Apps Script deployment version. A code rollback does not undo a Pin already published. Resume only after previewing the restored version and merging any newer posted records into the queue.

### Phased rollout and tradeoffs

1. Ship the setup UI, downloads, queue, and worker with publishing disabled.
2. Run isolated automated checks and inspect desktop/mobile setup behavior.
3. Configure external accounts and run preview artifacts.
4. Publish one approved article with a daily limit of one.
5. Enable the timer and monitor outcomes before increasing volume.

The result favors a small, inspectable owner workflow over a new SaaS backend. Queue visibility and edits stay in Sheets; Make setup is manual; the renderer uses a small set of deterministic layouts and does not import the editor's template library or Brand Kit. No cloud editor projects are created for generated Pins. Provider costs, execution delays, AI copy variability, image-source availability, and manual recovery after ambiguous outcomes are material operating constraints.
