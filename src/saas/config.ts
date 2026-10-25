/**
 * SaaS configuration. Everything here is PUBLIC client configuration — the
 * Supabase anon key is designed to be shipped to browsers (row-level security
 * protects the data). Secret keys (service role, Lemon Squeezy signing secret,
 * Anthropic key) live only in server functions, never here.
 *
 * Without VITE_SUPABASE_URL the app runs in "local mode": no accounts, projects
 * stay in this browser, free-plan limits are tracked on the device.
 */
const env = import.meta.env;

export const SUPABASE_URL: string | undefined = env.VITE_SUPABASE_URL || undefined;
export const SUPABASE_ANON_KEY: string | undefined = env.VITE_SUPABASE_ANON_KEY || undefined;

/** Lemon Squeezy hosted checkout link for the Pro plan (Store → Products → Share). */
export const PRO_CHECKOUT_URL: string | undefined = env.VITE_LEMON_CHECKOUT_URL || undefined;

export const cloudEnabled = (): boolean => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
export const billingEnabled = (): boolean => cloudEnabled() && !!PRO_CHECKOUT_URL;
