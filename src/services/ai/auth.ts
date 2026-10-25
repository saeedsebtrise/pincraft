import { supabase } from '../../saas/supabase';

/**
 * The signed-in user's access token for the AI routes. Online they only serve
 * signed-in users (each call counts toward the plan's daily allowance); in
 * local mode there is no token and the local AI server doesn't ask for one.
 */
export async function aiAuthHeaders(): Promise<Record<string, string>> {
  const sb = supabase();
  if (!sb) return {};
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
