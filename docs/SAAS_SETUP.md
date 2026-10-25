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

## 3. Deploy the app
Run `npm run build`, then upload `dist/` to any static host (Vercel, Netlify, Cloudflare Pages), with the same `VITE_*` variables set in the host's settings.

## What is enforced where
- **Server (Postgres):** project limit, export quota (`record_export`), Pro-only template saving, billing columns writable only by the webhook, and each user sees only their own rows and files.
- **Browser:** the same rules drive the UI, showing upgrade prompts instead of errors.
