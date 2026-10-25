import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

let client: SupabaseClient | null = null;

/** Lazily created Supabase client, or null in local mode. */
export function supabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // PKCE puts the auth code in the query string (?code=…), which keeps the
      // app's hash routes (#/editor/…) free for navigation.
      flowType: 'pkce',
    },
  });
  return client;
}

export const ASSET_BUCKET = 'assets';
