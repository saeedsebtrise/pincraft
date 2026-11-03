# Connecting Pinterest

PinCraft talks to Pinterest through the official **Pinterest API v5**. Once it's set up, users can connect their Pinterest account in **Settings → Pinterest**, then:

- **Boards** — sync their boards, create new ones (public or secret) and pick a default board.
- **Publish** — in the editor, **Export → Publish to Pinterest** sends the Pin straight to a board with its title, description, link and alt text.
- **Analytics** — impressions, engagements, outbound clicks, Pin clicks and saves for the last 7, 30 or 90 days.
- **Trends** — Pinterest's top and growing search keywords by region (needs a Pinterest **business** account).

## 1. Create the Pinterest app

1. Sign in at **https://developers.pinterest.com/apps/** with the Pinterest account that will own the app (a business account is best).
2. **Connect app** → fill in the app name (e.g. PinCraft), a short description and your site's address.
3. Under **Redirect URIs**, add every address PinCraft runs on, exactly:
   - `https://YOUR-DOMAIN/api/pinterest/callback` (your live site, e.g. the Vercel domain)
   - `http://localhost:5173/api/pinterest/callback` (only if you want to test on your own computer)
4. Pinterest first gives the app **Trial access**. That's enough to connect *your own* account and test. To let other users connect, request **Standard access** from the app page — Pinterest reviews the app (they usually ask for a short screen recording showing sign-in, publishing a Pin and the privacy policy).
5. Copy the **App ID** and **App secret key**.

Scopes PinCraft asks for: `boards:read, boards:write, pins:read, pins:write, user_accounts:read`.

## 2. Add the keys to the server

Never put these in the browser or in `VITE_` variables.

| Name | Value |
|---|---|
| `PINTEREST_APP_ID` | the App ID |
| `PINTEREST_APP_SECRET` | the App secret key |
| `PINTEREST_TOKEN_SECRET` | any long random string (32+ characters). It encrypts the users' Pinterest tokens. Changing it disconnects everyone. |
| `PINTEREST_REDIRECT_URI` | optional — only if the callback address differs from `<your site>/api/pinterest/callback` |

- **Vercel:** Project → Settings → Environment Variables, then **Redeploy**.
- **Your computer:** put them in a `.env` file in the project folder (it's git-ignored), then run `npm run ai-proxy` in a second terminal and leave it open. The local server reads `.env` itself and prints `Pinterest: ready` when the keys are found:
  ```
  PINTEREST_APP_ID=...
  PINTEREST_APP_SECRET=...
  PINTEREST_TOKEN_SECRET=...
  ```

In the app, **Connect Pinterest → How to connect** shows the same steps with a checklist (server running, keys added, account connected), copy buttons for the redirect URI and `.env` lines, and a ready-made random `PINTEREST_TOKEN_SECRET`.

## How it stays safe

- The Pinterest sign-in uses OAuth with a one-time `state` check, so another site can't connect an account on someone's behalf.
- The access and refresh tokens are stored only in an **encrypted, httpOnly cookie** (AES-256-GCM with `PINTEREST_TOKEN_SECRET`). Browser JavaScript can't read them, and they are never written to the database.
- Expired tokens are refreshed automatically; if Pinterest revokes access, the cookie is cleared and the user is asked to connect again.
- **Disconnect** in Settings removes the connection from that browser. Users can also remove PinCraft from their Pinterest account settings (Security → Apps).

## Limits to know

- A published Pin image is sent as a JPEG up to about 4 MB (Vercel's request limit); PinCraft lowers the quality automatically if needed.
- Pinterest analytics cover at most the last 90 days and can lag by a day.
- Trends need a Pinterest business account.
