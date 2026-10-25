# Turning PinCraft into a live SaaS

Without these settings the app runs in **local mode**: no accounts, projects saved in the browser, every feature unlocked. Add them and it becomes a SaaS with accounts, cloud projects, Free/Pro plans and billing.

## 1. Supabase (accounts, database, image storage)
1. Create a free project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`. It creates the tables, row-level security, the storage bucket and the Free-plan limits (10 exports/month, 3 projects).
3. Under Authentication → URL configuration, set the Site URL to your app's address.
4. Copy the Project URL and the **anon** key into `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
   The anon key is safe in the browser. Never put the service-role key in `.env` for the app.

## 2. Lemon Squeezy (Pro payments)
1. Create a store and a subscription product "PinCraft Pro" ($12/month, or your own price).
2. Copy the product's checkout link into `.env` as `VITE_LEMON_CHECKOUT_URL=...`.
3. Deploy the webhook function: `supabase functions deploy lemon-webhook --no-verify-jwt`
4. Set its secret: `supabase secrets set LEMONSQUEEZY_WEBHOOK_SECRET=<signing secret>`
5. In Lemon Squeezy → Settings → Webhooks, add `https://xxxx.supabase.co/functions/v1/lemon-webhook` with the same signing secret. Select the subscription_created, subscription_updated, subscription_cancelled, subscription_resumed and subscription_expired events.

## 3. Deploy on Vercel (app + API + your domain)
The repo is ready for Vercel: `vercel.json` builds the app, and the `api/` folder becomes serverless functions for Blog URL → Pins (`/api/page`, `/api/image`) and the AI features (`/api/ai`, `/api/ai-design`, `/api/pin-research`).

1. In Supabase's SQL editor also run `supabase/migrations/0002_ai_usage.sql` — the daily AI allowance (Free 10, Pro 150 requests a day).
2. Push the project to a GitHub repository, then in Vercel: **Add New → Project → Import** that repository. Vercel detects Vite; keep the defaults.
3. In the project's **Settings → Environment Variables** add:

   | Name | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | your Claude API key (server only — never prefix with `VITE_`) |
   | `VITE_AI_PROXY_URL` | `/api/ai` |
   | `VITE_SUPABASE_URL` | your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
   | `VITE_LEMON_CHECKOUT_URL` | your Pro checkout link (optional) |

   Then **Deployments → Redeploy** so the build picks them up.
4. **Settings → Domains → Add** your domain and copy the DNS records Vercel shows into your domain registrar. HTTPS is automatic.
5. In Supabase → Authentication → URL configuration, set the Site URL to your domain.

Online, the AI routes answer only signed-in users and count every call against their daily allowance, so nobody can spend your Claude credits anonymously. Research screenshots are shrunk in the browser to stay under Vercel's 4.5 MB request limit.

## What is enforced where
- **Server (Postgres):** project limit, export quota (`record_export`), Pro-only template saving, billing columns writable only by the webhook, and each user sees only their own rows and files.
- **Browser:** the same rules drive the UI, showing upgrade prompts instead of errors.
