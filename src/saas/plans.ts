/**
 * Plans and entitlements — the single place that decides what each plan may do.
 * The same limits are enforced on the server (supabase/migrations) so a modified
 * client can't bypass them; this module drives the UI.
 */
export type PlanTier = 'free' | 'pro';

export type ProFeature = 'aiText' | 'aiDesign' | 'pinResearch' | 'batchVariations' | 'saveTemplate' | 'multipleBrandKits';

export interface PlanDef {
  tier: PlanTier;
  name: string;
  price: string;
  tagline: string;
  /** null = unlimited */
  exportsPerMonth: number | null;
  maxProjects: number | null;
  features: ProFeature[];
  highlights: string[];
}

export const PLANS: Record<PlanTier, PlanDef> = {
  free: {
    tier: 'free',
    name: 'Free',
    price: '$0',
    tagline: 'Everything you need to try PinCraft.',
    exportsPerMonth: 10,
    maxProjects: 3,
    features: [],
    highlights: [
      '10 Pin exports per month',
      '3 projects (multiple pages each)',
      'All 71 templates & every Pin size',
      'Collage editor, text, badges, footers',
      'On-device headline suggestions',
      'No watermark',
    ],
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    price: '$12/month',
    tagline: 'For bloggers publishing Pins every day.',
    exportsPerMonth: null,
    maxProjects: null,
    features: ['aiText', 'aiDesign', 'pinResearch', 'batchVariations', 'saveTemplate', 'multipleBrandKits'],
    highlights: [
      'Unlimited Pin exports',
      'Unlimited projects',
      'AI Text Assistant (headlines, subtitles, CTAs)',
      'AI designs: brand-new, original Pin layouts for every post',
      'Pinterest research: AI studies the top Pins for your keyword',
      'Batch variations from one article',
      'Save your own templates',
      'Multiple brand kits',
    ],
  },
};

export const FEATURE_LABEL: Record<ProFeature, string> = {
  aiText: 'AI Text Assistant',
  aiDesign: 'AI designs',
  pinResearch: 'Pinterest research',
  batchVariations: 'Batch variations',
  saveTemplate: 'Save as template',
  multipleBrandKits: 'Multiple brand kits',
};

export function hasFeature(tier: PlanTier, feature: ProFeature): boolean {
  return PLANS[tier].features.includes(feature);
}

export interface UsageSnapshot {
  exportsThisMonth: number;
  projects: number;
}

export type LimitCheck = { ok: true; remaining: number | null } | { ok: false; reason: string };

export function canExport(tier: PlanTier, usage: UsageSnapshot, count = 1): LimitCheck {
  const limit = PLANS[tier].exportsPerMonth;
  if (limit === null) return { ok: true, remaining: null };
  const remaining = limit - usage.exportsThisMonth;
  if (remaining >= count) return { ok: true, remaining: remaining - count };
  return {
    ok: false,
    reason:
      remaining > 0
        ? `You have ${remaining} export${remaining === 1 ? '' : 's'} left this month on the Free plan, but this needs ${count}.`
        : `You've used all ${limit} Free exports this month.`,
  };
}

export function canCreateProject(tier: PlanTier, usage: UsageSnapshot): LimitCheck {
  const limit = PLANS[tier].maxProjects;
  if (limit === null) return { ok: true, remaining: null };
  if (usage.projects < limit) return { ok: true, remaining: limit - usage.projects - 1 };
  return { ok: false, reason: `The Free plan includes ${limit} projects. Delete one, add pages to an existing project, or upgrade to Pro.` };
}

/** "2026-10" — export quotas reset on the 1st of each month (UTC). */
export function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Plan from a Lemon Squeezy subscription status (mirrors the webhook and SQL logic). */
export function tierFromSubscription(status: string | null | undefined, endsAt: string | null | undefined, now = new Date()): PlanTier {
  if (!status) return 'free';
  if (status === 'active' || status === 'on_trial' || status === 'past_due') return 'pro';
  // Cancelled subscriptions stay Pro until the paid period ends.
  if (status === 'cancelled' && endsAt && new Date(endsAt) > now) return 'pro';
  return 'free';
}
