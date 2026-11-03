/**
 * Plan gates used by the UI. Each returns true when the action may proceed;
 * otherwise it opens the upgrade dialog with the reason. The server enforces
 * the same rules (supabase/migrations), so these are about clear UX, not trust.
 */
import { create } from 'zustand';
import { useUi } from '../store/uiStore';
import { useAccount } from './accountStore';
import { LimitError } from './cloudRepos';
import { FEATURE_LABEL, type ProFeature } from './plans';
import { logActivity } from '../services/activity';

export const useUpgradePrompt = create<{ reason: string | null; open: (reason: string) => void; close: () => void }>((set) => ({
  reason: null,
  open: (reason) => set({ reason }),
  close: () => set({ reason: null }),
}));

export function requirePro(feature: ProFeature): boolean {
  if (useAccount.getState().can(feature)) return true;
  useUpgradePrompt.getState().open(`${FEATURE_LABEL[feature]} is part of PinCraft Pro.`);
  return false;
}

export async function ensureCanCreateProject(): Promise<boolean> {
  const check = await useAccount.getState().checkNewProject();
  if (check.ok) return true;
  useUpgradePrompt.getState().open(check.reason);
  return false;
}

/** Checks and records `count` exports (server-side in cloud mode). */
export async function ensureCanExport(count: number): Promise<boolean> {
  const pre = useAccount.getState().checkExport(count);
  const what = `${count} Pin${count === 1 ? '' : 's'}`;
  if (!pre.ok) {
    logActivity({ area: 'Export', outcome: 'warning', title: 'Export limit reached', detail: pre.reason, link: { href: '#/billing', label: 'See your plan' } });
    useUpgradePrompt.getState().open(pre.reason);
    return false;
  }
  try {
    await useAccount.getState().recordExports(count);
    logActivity({ area: 'Export', outcome: 'completed', title: `Exported ${what}`, data: { pins: count } });
    return true;
  } catch (e) {
    logActivity({ area: 'Export', outcome: e instanceof LimitError ? 'warning' : 'failed', title: e instanceof LimitError ? 'Export limit reached' : 'Export failed', detail: (e as Error).message, link: { href: '#/billing', label: 'See your plan' } });
    if (e instanceof LimitError) useUpgradePrompt.getState().open(e.message);
    else useUi.getState().toast((e as Error).message, 'error');
    return false;
  }
}

/** Turns server limit errors from saves into the upgrade dialog; rethrows anything else. */
export function handleLimitError(e: unknown): boolean {
  if (e instanceof LimitError) {
    useUpgradePrompt.getState().open(e.message);
    return true;
  }
  return false;
}
