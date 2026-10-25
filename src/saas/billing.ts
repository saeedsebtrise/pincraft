import { PRO_CHECKOUT_URL } from './config';
import type { Account } from './accountStore';

/**
 * Lemon Squeezy hosted checkout for Pro. The user id travels as custom data so
 * the webhook can attach the subscription to the right account.
 */
export function proCheckoutUrl(account: Account): string | null {
  if (!PRO_CHECKOUT_URL || account.id === 'local') return null;
  const url = new URL(PRO_CHECKOUT_URL);
  if (account.email) url.searchParams.set('checkout[email]', account.email);
  url.searchParams.set('checkout[name]', account.name);
  url.searchParams.set('checkout[custom][user_id]', account.id);
  return url.toString();
}
