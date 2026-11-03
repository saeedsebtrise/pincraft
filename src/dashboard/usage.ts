/**
 * What the workspace has used this period — for the Billing page and the
 * Usage & storage settings. Numbers come from the account (exports, projects),
 * the activity log (AI requests), the library and the stored images.
 */
import { useEffect, useState } from 'react';
import { UPLOAD_LIMITS } from '../config/colors';
import { PLANS } from '../saas/plans';
import { useAccount } from '../saas/accountStore';
import { useActivity } from '../services/activity';
import { repos } from '../storage/repositories';
import { useLibrary } from '../store/libraryStore';

/** Daily AI allowance per plan (mirrors supabase/migrations/0002_ai_usage.sql). */
export const AI_PER_DAY = { free: 10, pro: 150 } as const;
/** Image storage allowance shown per plan. */
export const STORAGE_BYTES = { free: 500 * 1024 * 1024, pro: 10 * 1024 * 1024 * 1024 } as const;

export interface UsageLine {
  label: string;
  hint: string;
  used: number;
  /** null = unlimited */
  limit: number | null;
  /** How `used` / `limit` are shown ("12 MB"). */
  format?: (n: number) => string;
  locked?: boolean;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

/** This billing period: the calendar month (quotas reset on the 1st, UTC). */
export function usagePeriod(now = new Date()): { start: Date; end: Date; label: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
}

/** Bytes of images stored for this workspace (projects and uploads). */
async function storedBytes(): Promise<{ bytes: number; count: number }> {
  const ids = await repos.assets.ids().catch(() => [] as string[]);
  let bytes = 0;
  for (const id of ids.slice(0, 500)) {
    const a = await repos.assets.get(id).catch(() => undefined);
    bytes += a?.meta.size ?? a?.blob.size ?? 0;
  }
  return { bytes, count: ids.length };
}

export function useUsage() {
  const acc = useAccount();
  const events = useActivity((s) => s.events);
  const templates = useLibrary((s) => s.userTemplates.length);
  const kits = useLibrary((s) => s.brandKits.length);
  const [storage, setStorage] = useState<{ bytes: number; count: number } | null>(null);
  useEffect(() => {
    void acc.refresh();
    void storedBytes().then(setStorage);
  }, []);

  const local = acc.mode === 'local';
  const tier = acc.subscription.tier;
  const plan = PLANS[tier];
  const today = new Date().setHours(0, 0, 0, 0);
  const aiToday = events.filter((e) => e.at >= today && e.outcome === 'completed' && (e.area === 'AI' || e.area === 'Research' || e.title.startsWith('Template made from'))).length;
  const period = usagePeriod();
  const exportsThisPeriod = acc.usage.exportsThisMonth;

  const lines: UsageLine[] = [
    { label: 'Pin exports', hint: 'Pins exported as images this month.', used: exportsThisPeriod, limit: local ? null : plan.exportsPerMonth },
    { label: 'Projects', hint: 'Projects saved in your workspace (each can hold many Pins).', used: acc.usage.projects, limit: local ? null : plan.maxProjects },
    { label: 'AI requests today', hint: 'AI designs, AI text, Pinterest research and Pin-image templates. Resets at midnight (UTC).', used: aiToday, limit: local ? null : AI_PER_DAY[tier] },
    { label: 'Saved templates', hint: 'Your own templates in My Templates.', used: templates, limit: local || plan.features.includes('saveTemplate') ? null : 0, locked: !local && !plan.features.includes('saveTemplate') },
    { label: 'Brand kits', hint: 'Colours, fonts and website used on your Pins.', used: kits, limit: local || plan.features.includes('multipleBrandKits') ? null : 1 },
  ];
  const storageLine: UsageLine = {
    label: 'Image storage',
    hint: storage ? `${storage.count} image${storage.count === 1 ? '' : 's'} stored (uploads and photos read from blog posts).` : 'Counting your images…',
    used: storage?.bytes ?? 0,
    limit: local ? null : STORAGE_BYTES[tier],
    format: formatBytes,
  };
  const fileLimits = [
    { label: 'Image upload', value: formatBytes(UPLOAD_LIMITS.maxFileBytes) },
    { label: 'Largest image side', value: `${UPLOAD_LIMITS.maxDimension.toLocaleString()} px` },
    { label: 'Images per project', value: String(UPLOAD_LIMITS.maxImagesPerProject) },
    { label: 'Pinterest screenshot (research)', value: '4 MB' },
  ];
  return { acc, plan, local, period, lines, storageLine, fileLimits, loadingStorage: !storage };
}
