/**
 * Account state: who is signed in, their plan and their usage.
 *
 * Cloud mode (Supabase configured): real accounts; plan comes from the
 * `profiles` row that the billing webhook maintains; export quota is checked
 * and recorded server-side by the `record_export` function.
 * Local mode (no Supabase configured — your own machine / self-hosting): a single
 * on-device profile with every feature and no quotas, since there are no
 * accounts or billing to upgrade through. Exports are still counted for display.
 */
import { create } from 'zustand';
import { createLocalRepositories, repos, setRepositories } from '../storage/repositories';
import { useLibrary } from '../store/libraryStore';
import { createCloudRepositories, LimitError } from './cloudRepos';
import { cloudEnabled } from './config';
import { canCreateProject, canExport, hasFeature, monthKey, tierFromSubscription, type LimitCheck, type PlanTier, type ProFeature, type UsageSnapshot } from './plans';
import { supabase } from './supabase';

export interface Account {
  id: string;
  email: string | null;
  name: string;
}

export interface Subscription {
  tier: PlanTier;
  status: string | null;
  renewsAt: string | null;
  endsAt: string | null;
  portalUrl: string | null;
}

const LOCAL_USAGE_KEY = 'pincraft.localUsage';
const LOCAL_NAME_KEY = 'pincraft.localName';

function readLocalUsage(): { month: string; exports: number } {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_USAGE_KEY) ?? 'null');
    if (v && v.month === monthKey()) return v;
  } catch {
    /* fall through */
  }
  return { month: monthKey(), exports: 0 };
}

interface AccountState {
  mode: 'local' | 'cloud';
  status: 'loading' | 'signedOut' | 'signedIn';
  account: Account | null;
  subscription: Subscription;
  usage: UsageSnapshot;
  /** Set when the user arrives from a password-reset email. */
  recovering: boolean;

  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<'signedIn' | 'confirmEmail'>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
  /** Checks the quota and records `count` exports; throws LimitError when over the limit. */
  recordExports: (count: number) => Promise<void>;
  checkExport: (count: number) => LimitCheck;
  checkNewProject: () => Promise<LimitCheck>;
  can: (feature: ProFeature) => boolean;
}

const FREE: Subscription = { tier: 'free', status: null, renewsAt: null, endsAt: null, portalUrl: null };
const LOCAL: Subscription = { tier: 'pro', status: 'local', renewsAt: null, endsAt: null, portalUrl: null };

export const useAccount = create<AccountState>((set, get) => {
  const enterCloud = async (uid: string) => {
    const sb = supabase()!;
    setRepositories(createCloudRepositories(sb, uid));
    await Promise.all([get().refresh(), useLibrary.getState().load()]);
  };

  const leaveCloud = async () => {
    setRepositories(createLocalRepositories());
    set({ status: 'signedOut', account: null, subscription: FREE, usage: { exportsThisMonth: 0, projects: 0 } });
    await useLibrary.getState().load();
  };

  return {
    mode: cloudEnabled() ? 'cloud' : 'local',
    status: 'loading',
    account: null,
    subscription: FREE,
    usage: { exportsThisMonth: 0, projects: 0 },
    recovering: false,

    init: async () => {
      const sb = supabase();
      if (!sb) {
        const name = localStorage.getItem(LOCAL_NAME_KEY) || 'You';
        set({ mode: 'local', status: 'signedIn', account: { id: 'local', email: null, name }, subscription: LOCAL });
        await get().refresh();
        return;
      }
      sb.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          set({ recovering: true });
          location.hash = '#/reset-password';
        }
        if (event === 'SIGNED_OUT') void leaveCloud();
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session && get().account?.id !== session.user.id) {
          const u = session.user;
          set({ status: 'signedIn', account: { id: u.id, email: u.email ?? null, name: (u.user_metadata?.display_name as string) || u.email?.split('@')[0] || 'You' } });
          void enterCloud(u.id);
        }
      });
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      if (u) {
        set({ status: 'signedIn', account: { id: u.id, email: u.email ?? null, name: (u.user_metadata?.display_name as string) || u.email?.split('@')[0] || 'You' } });
        await enterCloud(u.id);
      } else {
        set({ status: 'signedOut' });
      }
    },

    signIn: async (email, password) => {
      const { error } = await supabase()!.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    signUp: async (name, email, password) => {
      const { data, error } = await supabase()!.auth.signUp({
        email,
        password,
        options: { data: { display_name: name }, emailRedirectTo: location.origin + location.pathname },
      });
      if (error) throw new Error(error.message);
      return data.session ? 'signedIn' : 'confirmEmail';
    },
    signOut: async () => {
      const sb = supabase();
      if (sb) await sb.auth.signOut();
    },
    sendPasswordReset: async (email) => {
      const { error } = await supabase()!.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error) throw new Error(error.message);
    },
    updatePassword: async (password) => {
      const { error } = await supabase()!.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      set({ recovering: false });
    },
    updateName: async (name) => {
      const sb = supabase();
      if (!sb) {
        localStorage.setItem(LOCAL_NAME_KEY, name);
      } else {
        const { error } = await sb.auth.updateUser({ data: { display_name: name } });
        if (error) throw new Error(error.message);
        await sb.from('profiles').update({ display_name: name }).eq('id', get().account!.id);
      }
      set({ account: { ...get().account!, name } });
    },

    refresh: async () => {
      const projects = (await repos.projects.list().catch(() => [])).length;
      const sb = supabase();
      if (!sb || get().mode === 'local') {
        set({ usage: { projects, exportsThisMonth: readLocalUsage().exports } });
        return;
      }
      const uid = get().account?.id;
      if (!uid) return;
      const [{ data: profile }, { data: exports }] = await Promise.all([
        sb.from('profiles').select('plan_status, plan_renews_at, plan_ends_at, customer_portal_url').eq('id', uid).maybeSingle(),
        sb.rpc('exports_this_month'),
      ]);
      set({
        subscription: {
          tier: tierFromSubscription(profile?.plan_status, profile?.plan_ends_at),
          status: profile?.plan_status ?? null,
          renewsAt: profile?.plan_renews_at ?? null,
          endsAt: profile?.plan_ends_at ?? null,
          portalUrl: profile?.customer_portal_url ?? null,
        },
        usage: { projects, exportsThisMonth: typeof exports === 'number' ? exports : 0 },
      });
    },

    checkExport: (count) => canExport(get().subscription.tier, get().usage, count),
    checkNewProject: async () => {
      await get().refresh();
      return canCreateProject(get().subscription.tier, get().usage);
    },
    recordExports: async (count) => {
      const local = readLocalUsage();
      const sb = supabase();
      if (!sb || get().mode === 'local') {
        const next = { month: local.month, exports: local.exports + count };
        localStorage.setItem(LOCAL_USAGE_KEY, JSON.stringify(next));
        set({ usage: { ...get().usage, exportsThisMonth: next.exports } });
        return;
      }
      // Server decides (plan + monthly count) and records atomically.
      const { data, error } = await sb.rpc('record_export', { export_count: count });
      if (error) {
        if (/export_limit/.test(error.message)) {
          await get().refresh();
          const check = canExport(get().subscription.tier, get().usage, count);
          throw new LimitError(check.ok ? 'Monthly export limit reached.' : check.reason);
        }
        throw new Error(`Couldn't record the export: ${error.message}`);
      }
      set({ usage: { ...get().usage, exportsThisMonth: typeof data === 'number' ? data : get().usage.exportsThisMonth + count } });
    },
    can: (feature) => hasFeature(get().subscription.tier, feature),
  };
});
