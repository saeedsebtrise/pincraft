/**
 * Pure logic for the Lemon Squeezy webhook (shared by the Deno edge function
 * and the unit tests): signature verification and subscription → profile mapping.
 */

/** Lemon Squeezy signs the raw body with HMAC-SHA256 (hex) in the X-Signature header. */
export async function verifySignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  const expected = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
  const given = signature.trim().toLowerCase();
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

export interface ProfileUpdate {
  userId: string | null;
  subscriptionId: string;
  patch: {
    plan_status: string;
    plan_renews_at: string | null;
    plan_ends_at: string | null;
    lemon_customer_id: string | null;
    lemon_subscription_id: string;
    customer_portal_url: string | null;
  };
}

interface LemonPayload {
  meta?: { event_name?: string; custom_data?: { user_id?: string } };
  data?: {
    id?: string | number;
    type?: string;
    attributes?: {
      status?: string;
      renews_at?: string | null;
      ends_at?: string | null;
      customer_id?: string | number | null;
      urls?: { customer_portal?: string | null };
    };
  };
}

/** Maps a subscription_* event to a profile update; null for events we ignore. */
export function profileUpdateFromEvent(payload: LemonPayload): ProfileUpdate | null {
  const event = payload.meta?.event_name ?? '';
  if (!event.startsWith('subscription_') || payload.data?.type !== 'subscriptions') return null;
  if (event.startsWith('subscription_payment')) return null; // payment events don't change the plan by themselves
  const a = payload.data.attributes ?? {};
  if (!a.status || payload.data.id === undefined) return null;
  return {
    userId: payload.meta?.custom_data?.user_id ?? null,
    subscriptionId: String(payload.data.id),
    patch: {
      plan_status: a.status,
      plan_renews_at: a.renews_at ?? null,
      plan_ends_at: a.ends_at ?? null,
      lemon_customer_id: a.customer_id != null ? String(a.customer_id) : null,
      lemon_subscription_id: String(payload.data.id),
      customer_portal_url: a.urls?.customer_portal ?? null,
    },
  };
}
