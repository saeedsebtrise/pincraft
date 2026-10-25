// Supabase Edge Function (Deno): receives Lemon Squeezy subscription webhooks
// and updates the user's plan in public.profiles.
//
// Deploy:  supabase functions deploy lemon-webhook --no-verify-jwt
// Secrets: supabase secrets set LEMONSQUEEZY_WEBHOOK_SECRET=…
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { profileUpdateFromEvent, verifySignature } from './logic.ts';

const secret = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET') ?? '';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  const raw = await req.text();
  if (!(await verifySignature(raw, req.headers.get('X-Signature'), secret))) return json(401, { error: 'Invalid signature' });

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }
  const update = profileUpdateFromEvent(payload as Parameters<typeof profileUpdateFromEvent>[0]);
  if (!update) return json(200, { ignored: true });

  // Prefer the user id passed through checkout; fall back to a known subscription id (renewals, portal changes).
  let query = admin.from('profiles').update(update.patch);
  query = update.userId ? query.eq('id', update.userId) : query.eq('lemon_subscription_id', update.subscriptionId);
  const { data, error } = await query.select('id');
  if (error) {
    console.error('profile update failed', error.message);
    return json(500, { error: 'Update failed' }); // Lemon Squeezy retries non-2xx responses
  }
  if (!data?.length) console.warn('no profile matched subscription', update.subscriptionId);
  return json(200, { ok: true, updated: data?.length ?? 0 });
});
