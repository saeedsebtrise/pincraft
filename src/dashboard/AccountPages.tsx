/**
 * Billing and Settings pages: subscription, usage & storage, account,
 * security, Pinterest connection status, scheduling, workspace and API access.
 */
import {
  Activity as ActivityIcon,
  ArrowRight,
  Building2,
  CalendarClock,
  CalendarDays,
  Check,
  CircleCheck,
  CreditCard,
  ExternalLink,
  Gauge,
  KeyRound,
  Mail,
  Pin,
  RefreshCw,
  Shield,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from '../saas/accountStore';
import { cloudEnabled } from '../saas/config';
import { PLANS } from '../saas/plans';
import { planLabel, UpgradeButton } from '../saas/ui/PlanViews';
import { logActivity } from '../services/activity';
import { useUi } from '../store/uiStore';
import { DEFAULT_PREFS, useWorkspace, windowError } from '../store/workspaceStore';
import { Field } from '../ui/controls';
import { formatBytes, useUsage, type UsageLine } from './usage';

const SUPPORT_EMAIL: string | undefined = import.meta.env.VITE_SUPPORT_EMAIL || undefined;

// ---------------------------------------------------------------- shared bits

function UsageCard({ line }: { line: UsageLine }) {
  const f = line.format ?? ((n: number) => n.toLocaleString());
  const pct = line.limit ? Math.min(100, Math.round((line.used / line.limit) * 100)) : 0;
  const left = line.limit === null ? null : Math.max(0, line.limit - line.used);
  return (
    <div className="usage-card">
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <div className="stack-sm" style={{ gap: 2 }}>
          <strong>{line.label}</strong>
          <span className="subtle">{line.hint}</span>
        </div>
        {line.locked ? (
          <span className="chip chip-custom">Locked</span>
        ) : line.limit !== null ? (
          <span className={`chip ${pct >= 100 ? 'chip-warn' : ''}`}>{pct}%</span>
        ) : (
          <span className="chip chip-rec">Unlimited</span>
        )}
      </div>
      <div className="row-between" style={{ alignItems: 'baseline' }}>
        <span className="usage-num">{f(line.used)}</span>
        {line.limit !== null && <span className="subtle">of {f(line.limit)}</span>}
      </div>
      {line.limit !== null && (
        <div className="usage-bar" role="progressbar" aria-valuemin={0} aria-valuemax={line.limit} aria-valuenow={line.used} aria-label={line.label}>
          <span style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--warning)' : undefined }} />
        </div>
      )}
      <span className="subtle">
        {line.locked ? 'Upgrade to Pro to save your own templates.' : left === null ? 'No limit on your plan.' : `${f(left)} remaining.`}
      </span>
    </div>
  );
}

function SectionHead({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return (
    <div className="stack-sm settings-head">
      <span className="kicker">{kicker}</span>
      <h2 style={{ fontSize: 22 }}>{title}</h2>
      <span className="muted">{text}</span>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'ok' | 'accent' }) {
  return (
    <div className="fact">
      <span className="field-label">{label}</span>
      <strong className={tone === 'ok' ? 'tone-ok' : tone === 'accent' ? 'tone-accent' : undefined}>{value}</strong>
    </div>
  );
}

// ---------------------------------------------------------------- Billing

export function BillingPage() {
  const { acc, plan, local, period, lines, storageLine } = useUsage();
  const sub = acc.subscription;
  const date = (s: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null);
  const status = local ? 'Active' : sub.status ? sub.status.replace('_', ' ') : 'Active';
  const cycle = local ? 'No billing on this device' : sub.tier === 'pro' ? 'Monthly' : 'Free plan';
  const planPeriod = sub.renewsAt && sub.status !== 'cancelled' ? `Renews ${date(sub.renewsAt)}` : sub.endsAt ? `Ends ${date(sub.endsAt)}` : 'Ongoing';

  return (
    <div className="dash-main">
      <div className="stack-sm">
        <h1 className="dash-h1">Billing</h1>
        <span className="muted">Your subscription, renewal and payment details.</span>
      </div>

      <section className="card billing-hero">
        <div className="row-between" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div className="stack">
            <span className="kicker-pill">
              <CreditCard size={14} /> Current subscription
            </span>
            <div className="row" style={{ gap: 10 }}>
              <h2 style={{ fontSize: 24 }}>{planLabel(sub.tier, sub.status)}</h2>
              <span className="chip chip-rec" style={{ textTransform: 'capitalize' }}>
                {status}
              </span>
            </div>
            <span className="muted">Manage your plan and payments in one place.</span>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <a className="btn btn-pink" href="#/pricing">
                Compare plans <ArrowRight size={15} />
              </a>
              {sub.portalUrl && (
                <a className="btn btn-outline" href={sub.portalUrl} target="_blank" rel="noopener noreferrer">
                  Manage billing <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
          <div className="price-box">
            <span className="field-label">{local ? 'Plan price' : 'Standard plan price'}</span>
            <strong className="price-big">{local ? '$0' : plan.price.replace('/month', '')}</strong>
            <span className="subtle">{local ? 'Everything unlocked on this device.' : sub.tier === 'pro' ? 'per month' : 'No subscription charge.'}</span>
          </div>
        </div>
        <div className="billing-facts">
          <div className="billing-fact">
            <CreditCard size={18} />
            <div className="stack-sm" style={{ gap: 2 }}>
              <span className="field-label">Billing cycle</span>
              <strong>{cycle}</strong>
            </div>
          </div>
          <div className="billing-fact">
            <CalendarDays size={18} />
            <div className="stack-sm" style={{ gap: 2 }}>
              <span className="field-label">Plan period</span>
              <strong>{planPeriod}</strong>
            </div>
          </div>
          <div className="billing-fact">
            <Gauge size={18} />
            <div className="stack-sm" style={{ gap: 2 }}>
              <span className="field-label">Usage period</span>
              <strong>{period.label}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="billing-grid">
        <section className="card account-card">
          <div className="row" style={{ gap: 10 }}>
            <span className="soft-icon">
              <CircleCheck size={18} />
            </span>
            <div className="stack-sm" style={{ gap: 2 }}>
              <strong style={{ fontSize: 17 }}>Included with {local ? 'local mode' : plan.name}</strong>
              <span className="subtle">Available on your current plan.</span>
            </div>
          </div>
          <ul className="included-list">
            {(local ? PLANS.pro.highlights : plan.highlights).map((h) => (
              <li key={h}>
                <Check size={15} /> {h}
              </li>
            ))}
          </ul>
          {!local && sub.tier === 'free' && <UpgradeButton className="btn btn-pink" />}
        </section>
        <section className="card account-card">
          <strong style={{ fontSize: 17 }}>Billing help</strong>
          <span className="muted">Questions about a charge, invoice or your subscription? We can help.</span>
          {sub.portalUrl ? (
            <a className="btn btn-outline row-between" href={sub.portalUrl} target="_blank" rel="noopener noreferrer">
              Invoices & payment method <ExternalLink size={14} />
            </a>
          ) : null}
          {SUPPORT_EMAIL ? (
            <a className="btn btn-outline row-between" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('PinCraft billing question')}`}>
              Contact billing support <ArrowRight size={15} />
            </a>
          ) : (
            <span className="subtle">{local ? 'No payments are taken in local mode.' : 'Reply to your payment receipt email to reach billing support.'}</span>
          )}
        </section>
      </div>

      <section className="card account-card">
        <div className="row-between">
          <div className="stack-sm" style={{ gap: 2 }}>
            <strong>Usage & storage</strong>
            <span className="subtle">This period's exports, AI requests, projects and stored images.</span>
          </div>
          <a className="link-btn" href="#/settings?tab=usage">
            View usage <ArrowRight size={14} />
          </a>
        </div>
        <div className="usage-grid">
          {[lines[0], lines[2], storageLine].map((l) => (
            <UsageCard key={l.label} line={l} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Settings

type SettingsTab = 'account' | 'security' | 'pinterest' | 'scheduling' | 'workspace' | 'api' | 'usage';

const TABS: { id: SettingsTab; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: 'account', label: 'PinCraft Account', hint: 'Login and subscription', icon: <User size={17} /> },
  { id: 'security', label: 'Security', hint: 'Account protection', icon: <Shield size={17} /> },
  { id: 'pinterest', label: 'Pinterest', hint: 'Connection and publishing', icon: <Pin size={17} /> },
  { id: 'scheduling', label: 'Scheduling', hint: 'Timezone and posting hours', icon: <CalendarClock size={17} /> },
  { id: 'workspace', label: 'Workspace', hint: 'Name and team access', icon: <Building2 size={17} /> },
  { id: 'api', label: 'API & integrations', hint: 'Custom tools and API keys', icon: <KeyRound size={17} /> },
  { id: 'usage', label: 'Usage & storage', hint: 'Credits and stored media', icon: <Gauge size={17} /> },
];

export function SettingsPage({ initialTab }: { initialTab?: string }) {
  const tab: SettingsTab = TABS.some((t) => t.id === initialTab) ? (initialTab as SettingsTab) : 'account';
  // On phones the menu is a scrolling strip: bring the open section into view.
  useEffect(() => {
    document.querySelector('.settings-item[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [tab]);
  return (
    <div className="dash-main">
      <div className="stack-sm">
        <h1 className="dash-h1">Settings</h1>
        <span className="muted">Manage your account, connected profiles and workspace preferences.</span>
      </div>
      <div className="settings-layout">
        <nav className="card settings-menu" aria-label="Settings sections">
          <span className="field-label">Settings menu</span>
          <span className="subtle" style={{ marginBottom: 6 }}>
            Choose a section to review or update.
          </span>
          {TABS.map((t) => (
            <a key={t.id} href={`#/settings?tab=${t.id}`} className="settings-item" aria-current={tab === t.id ? 'page' : undefined}>
              {t.icon}
              <span className="stack-sm" style={{ gap: 0 }}>
                <strong>{t.label}</strong>
                <span className="subtle">{t.hint}</span>
              </span>
            </a>
          ))}
        </nav>
        <div className="card settings-body">
          {tab === 'account' && <AccountSection />}
          {tab === 'security' && <SecuritySection />}
          {tab === 'pinterest' && <PinterestSection />}
          {tab === 'scheduling' && <SchedulingSection />}
          {tab === 'workspace' && <WorkspaceSection />}
          {tab === 'api' && <ApiSection />}
          {tab === 'usage' && <UsageSection />}
        </div>
      </div>
    </div>
  );
}

function AccountSection() {
  const acc = useAccount();
  const prefs = useWorkspace((s) => s.prefs);
  const [name, setName] = useState(acc.account?.name ?? '');
  useEffect(() => setName(acc.account?.name ?? ''), [acc.account?.name]);
  if (!acc.account) return null;
  const sub = acc.subscription;
  return (
    <div className="stack">
      <SectionHead kicker="Account settings" title="PinCraft Account" text="Your login details, subscription and email preferences." />
      <section className="settings-card">
        <strong>Account summary</strong>
        <span className="subtle">These details identify the signed-in account and its current subscription.</span>
        <div className="fact-grid">
          <Fact label="Email address" value={acc.account.email ?? 'Local mode — no email'} />
          <Fact label="Role" value="Owner" />
          <Fact label="Plan" value={planLabel(sub.tier, sub.status)} tone="accent" />
          <Fact label="Workspace" value={prefs.workspaceName} />
          <Fact label="Subscription status" value={acc.mode === 'local' ? 'Local mode' : (sub.status ?? 'active').replace('_', ' ')} tone="ok" />
        </div>
      </section>
      <section className="settings-card">
        <form
          className="row"
          style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await acc.updateName(name.trim());
              logActivity({ area: 'Account', outcome: 'update', title: 'Display name changed', detail: `Now “${name.trim()}”.` });
              useUi.getState().toast('Name updated', 'success');
            } catch (err) {
              useUi.getState().toast((err as Error).message, 'error');
            }
          }}
        >
          <Field label="Display name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} style={{ minWidth: 260 }} />
          </Field>
          <button className="btn" disabled={!name.trim() || name.trim() === acc.account.name}>
            Save
          </button>
        </form>
      </section>
      <section className="settings-card row-between">
        <div className="stack-sm" style={{ gap: 2 }}>
          <strong>Scheduling timezone</strong>
          <span className="muted">{prefs.timezone}</span>
        </div>
        <a className="link-btn" href="#/settings?tab=scheduling">
          Manage scheduling <ArrowRight size={14} />
        </a>
      </section>
      <section className="settings-card row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="soft-icon">
            <Mail size={17} />
          </span>
          <div className="stack-sm" style={{ gap: 2 }}>
            <strong>Email preferences</strong>
            <span className="subtle">Choose whether you want practical Pinterest tips and product updates.</span>
          </div>
        </div>
        <button
          className={prefs.emailTips ? 'btn btn-outline' : 'btn btn-pink'}
          onClick={() => {
            useWorkspace.getState().update({ emailTips: !prefs.emailTips });
            logActivity({ area: 'Account', outcome: 'update', title: prefs.emailTips ? 'Stopped Pinterest tips emails' : 'Subscribed to Pinterest tips', detail: 'Email preference saved.' });
          }}
        >
          {prefs.emailTips ? 'Stop sending me tips' : 'Send me Pinterest tips'}
        </button>
      </section>
      {acc.mode === 'cloud' && (
        <section className="settings-card danger-card">
          <strong>Account deletion</strong>
          <span className="muted">
            Permanently remove your account, projects, templates and stored images. To delete your account, email us from your account email
            {SUPPORT_EMAIL ? ` at ${SUPPORT_EMAIL}` : ''} — we confirm before anything is removed.
          </span>
        </section>
      )}
    </div>
  );
}

function SecuritySection() {
  const acc = useAccount();
  const [busy, setBusy] = useState(false);
  const email = acc.account?.email;
  return (
    <div className="stack">
      <SectionHead kicker="Account protection" title="Security" text="Manage your password and account activity." />
      <section className="settings-card">
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <span className="soft-icon">
              <KeyRound size={17} />
            </span>
            <div className="stack-sm" style={{ gap: 2 }}>
              <strong>Password</strong>
              <span className="muted">{email ? 'Set a new password using a reset link sent to your account email.' : 'Local mode has no password — your work stays in this browser.'}</span>
              {email && <span>{email}</span>}
            </div>
          </div>
          {email && (
            <button
              className="btn btn-pink"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await acc.sendPasswordReset(email);
                  logActivity({ area: 'Account', outcome: 'completed', title: 'Password reset link sent', detail: `Sent to ${email}.` });
                  useUi.getState().toast('Reset link sent — check your email.', 'success');
                } catch (e) {
                  logActivity({ area: 'Account', outcome: 'failed', title: 'Password reset failed', detail: (e as Error).message });
                  useUi.getState().toast((e as Error).message, 'error');
                } finally {
                  setBusy(false);
                }
              }}
            >
              Reset password <ExternalLink size={14} />
            </button>
          )}
        </div>
        <hr className="divider" />
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
            <span className="soft-icon">
              <ActivityIcon size={17} />
            </span>
            <div className="stack-sm" style={{ gap: 2 }}>
              <strong>Account activity</strong>
              <span className="muted">See the actions recorded in your workspace activity log.</span>
            </div>
          </div>
          <a className="btn btn-outline" href="#/activity">
            View activity <ArrowRight size={14} />
          </a>
        </div>
      </section>
    </div>
  );
}

/** Shared "Pinterest isn't connected" notice — boards, analytics and publishing need a Pinterest developer app. */
export function PinterestNotConnected({ what }: { what: string }) {
  return (
    <div className="pin-alert">
      <div className="row" style={{ gap: 8 }}>
        <XCircle size={18} />
        <strong>Pinterest profile not connected</strong>
      </div>
      <span>
        {what} PinCraft needs a Pinterest connection for this, and connecting needs a Pinterest developer app (approved by Pinterest) set up for this site. Until then, design and export
        your Pins here and upload them to Pinterest yourself.
      </span>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-pink" disabled title="Available once the Pinterest app is set up">
          Connect Pinterest
        </button>
        <a className="btn btn-outline" href="https://developers.pinterest.com/" target="_blank" rel="noopener noreferrer">
          Pinterest developer apps <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}

function PinterestSection() {
  return (
    <div className="stack">
      <SectionHead
        kicker="Connected profiles"
        title="Pinterest"
        text="Manage the Pinterest profiles used for boards, scheduling and publishing. Choose a default profile when more than one is connected."
      />
      <section className="settings-card">
        <div className="row-between">
          <div className="stack-sm" style={{ gap: 2 }}>
            <strong>Connected profiles</strong>
            <span className="subtle">Your default profile is used automatically unless a campaign picks another one.</span>
          </div>
          <span className="act-badge act-fail">Disconnected</span>
        </div>
        <PinterestNotConnected what="Publishing, board sync and analytics come from your Pinterest account." />
      </section>
    </div>
  );
}

function SchedulingSection() {
  const prefs = useWorkspace((s) => s.prefs);
  const [tz, setTz] = useState(prefs.timezone);
  const [start, setStart] = useState(String(prefs.windowStart));
  const [end, setEnd] = useState(String(prefs.windowEnd));
  const [pace, setPace] = useState(String(prefs.dailyPace));
  const zones = useMemo(() => {
    try {
      return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [prefs.timezone];
    } catch {
      return [prefs.timezone];
    }
  }, []);
  const err = windowError(Number(start), Number(end)) ?? (Number(pace) >= 1 && Number(pace) <= 200 ? null : 'Daily pace must be between 1 and 200 Pins.');
  const changed = tz !== prefs.timezone || Number(start) !== prefs.windowStart || Number(end) !== prefs.windowEnd || Number(pace) !== prefs.dailyPace;
  const hour = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: 'numeric' });

  return (
    <div className="stack">
      <SectionHead kicker="Scheduling preferences" title="Scheduling" text="Set the timezone and posting hours for this workspace." />
      <section className="settings-card">
        <strong>Publishing schedule</strong>
        <span className="subtle">All posting hours use the timezone below, independent of your device. Daylight saving changes are applied automatically.</span>
        <div className="sched-grid">
          <Field label="Timezone">
            <select className="select" value={tz} onChange={(e) => setTz(e.target.value)}>
              {(zones.includes(tz) ? zones : [tz, ...zones]).map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </Field>
          <div className="info-box">
            <strong>Smart publishing times</strong>
            <span className="subtle">Pins are spread inside your posting window. Set the hours below to control when your Pins go out.</span>
          </div>
          <Field label="Posting window starts">
            <input className="input" type="number" min={0} max={23} value={start} onChange={(e) => setStart(e.target.value)} />
            <span className="subtle">Earliest posting hour (0–23){Number.isInteger(Number(start)) ? ` · ${hour(Number(start))}` : ''}.</span>
          </Field>
          <Field label="Posting window ends">
            <input className="input" type="number" min={1} max={23} value={end} onChange={(e) => setEnd(e.target.value)} />
            <span className="subtle">Last posting hour (1–23){Number.isInteger(Number(end)) ? ` · ${hour(Number(end))}` : ''}.</span>
          </Field>
          <Field label="Daily pace (Pins per day)">
            <input className="input" type="number" min={1} max={200} value={pace} onChange={(e) => setPace(e.target.value)} />
            <span className="subtle">A target, not a rule — Pins continue on the next days when needed.</span>
          </Field>
        </div>
        <div className="info-box">
          <strong>Automatically spread across days</strong>
          <span className="subtle">Pins are spaced within your posting window and continue on following days when needed. Your daily pace is a target, not a requirement.</span>
        </div>
        {err && <div className="issue">{err}</div>}
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 8 }}>
          <span className="subtle">Applies to new schedules. Publishing needs a connected Pinterest profile.</span>
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn"
              onClick={() => {
                setTz(DEFAULT_PREFS.timezone);
                setStart(String(DEFAULT_PREFS.windowStart));
                setEnd(String(DEFAULT_PREFS.windowEnd));
                setPace(String(DEFAULT_PREFS.dailyPace));
              }}
            >
              Reset
            </button>
            <button
              className="btn btn-pink"
              disabled={!!err || !changed}
              onClick={() => {
                useWorkspace.getState().update({ timezone: tz, windowStart: Number(start), windowEnd: Number(end), dailyPace: Number(pace) });
                logActivity({ area: 'Account', outcome: 'update', title: 'Scheduling updated', detail: `${tz.replace(/_/g, ' ')} · ${hour(Number(start))}–${hour(Number(end))} · ${pace} Pins/day` });
                useUi.getState().toast('Scheduling saved', 'success');
              }}
            >
              Save scheduling
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function WorkspaceSection() {
  const acc = useAccount();
  const prefs = useWorkspace((s) => s.prefs);
  const [name, setName] = useState(prefs.workspaceName);
  const [editing, setEditing] = useState(false);
  const me = acc.account;
  return (
    <div className="stack">
      <SectionHead kicker="Workspace preferences" title="Workspace" text="Name your workspace and see who can access it." />
      <section className="settings-card">
        <div className="row-between">
          <div className="stack-sm" style={{ gap: 2 }}>
            <strong>Workspace</strong>
            <span className="subtle">Your branding, projects, templates and drafts live together here.</span>
          </div>
          <span className="chip">1 / 1</span>
        </div>
        <div className="ws-row">
          {editing ? (
            <form
              className="row grow"
              style={{ gap: 8 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) return;
                useWorkspace.getState().update({ workspaceName: name.trim() });
                logActivity({ area: 'Account', outcome: 'update', title: 'Workspace renamed', detail: `Now “${name.trim()}”.` });
                setEditing(false);
              }}
            >
              <input className="input grow" value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Workspace name" />
              <button className="btn btn-pink" disabled={!name.trim()}>
                Save
              </button>
              <button type="button" className="btn" onClick={() => (setName(prefs.workspaceName), setEditing(false))}>
                Cancel
              </button>
            </form>
          ) : (
            <>
              <span className="row" style={{ gap: 8 }}>
                <strong>{prefs.workspaceName}</strong>
                <span className="chip chip-rec">Active</span>
              </span>
              <button className="btn btn-sm" onClick={() => setEditing(true)}>
                Rename
              </button>
            </>
          )}
        </div>
      </section>
      <section className="settings-card">
        <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="soft-icon">
              <Users size={17} />
            </span>
            <div className="stack-sm" style={{ gap: 2 }}>
              <strong>Team access</strong>
              <span className="subtle">Who can sign in to this workspace.</span>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Fact label="Team seats" value="1 / 1" />
            <Fact label="Workspaces" value="1 / 1" />
          </div>
        </div>
        <div className="note-box">Team invitations are not available yet — each account is a single-person workspace for now.</div>
        <details className="act-details">
          <summary>Understand team roles</summary>
          <div className="stack-sm" style={{ marginTop: 8 }}>
            <span>
              <strong>Owner</strong> — billing, every workspace setting and the Pinterest connection.
            </span>
            <span>
              <strong>Admin</strong> — can open every workspace and manage its Pinterest connection.
            </span>
            <span>
              <strong>Member</strong> — can design, import and publish in assigned workspaces, but can't change billing or invite others.
            </span>
          </div>
        </details>
        <span className="field-label">Active members · 1</span>
        <div className="member-row">
          <span className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
            {(me?.name ?? '?').slice(0, 2).toUpperCase()}
          </span>
          <div className="stack-sm grow" style={{ gap: 2 }}>
            <span className="row" style={{ gap: 6 }}>
              <strong>{me?.name}</strong>
              <span className="chip chip-rec">Active</span>
            </span>
            {me?.email && <span className="subtle">{me.email}</span>}
            <span className="row" style={{ gap: 6 }}>
              <span className="chip">Owner</span>
              <span className="chip">All workspaces</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function ApiSection() {
  return (
    <div className="stack">
      <SectionHead kicker="Integrations" title="API & integrations" text="Connect your own tools and workflows to this workspace." />
      <section className="settings-card">
        <div className="row-between">
          <div className="row" style={{ gap: 8 }}>
            <KeyRound size={17} />
            <strong>Developer API access</strong>
          </div>
          <span className="chip chip-warn">Not available yet</span>
        </div>
        <span className="muted">
          A developer API (API keys for your own tools) is not offered yet. Today you can bring content in with <strong>Blog URL → Pins</strong>, <strong>Bulk Design</strong> (many
          post links at once) and image uploads, and take Pins out with Export.
        </span>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <a className="btn btn-outline" href="#/auto?mode=bulk">
            Bulk Design <ArrowRight size={14} />
          </a>
          <a className="btn btn-outline" href="#/auto">
            Blog URL → Pins <ArrowRight size={14} />
          </a>
        </div>
      </section>
    </div>
  );
}

function UsageSection() {
  const { local, plan, lines, storageLine, fileLimits, acc } = useUsage();
  return (
    <div className="stack">
      <SectionHead kicker="Plan capacity" title="Usage & storage" text="See your plan usage, available capacity and stored media." />
      <section className="settings-card">
        <div className="row-between">
          <div className="row" style={{ gap: 10 }}>
            <span className="soft-icon">
              <Gauge size={17} />
            </span>
            <div className="stack-sm" style={{ gap: 2 }}>
              <strong style={{ fontSize: 17 }}>Plan usage</strong>
              <span className="subtle">
                {local ? 'Local mode has no limits — counts are shown for your reference.' : `Your ${plan.name} plan. Exports reset on the 1st of each month; AI requests reset daily.`}
              </span>
            </div>
          </div>
          <a className="btn btn-sm btn-outline" href="#/billing">
            Manage billing
          </a>
        </div>
        <div className="usage-grid">
          {lines.map((l) => (
            <UsageCard key={l.label} line={l} />
          ))}
        </div>
      </section>
      <section className="settings-card">
        <div className="row-between">
          <div className="stack-sm" style={{ gap: 2 }}>
            <strong style={{ fontSize: 17 }}>Storage & drafts</strong>
            <span className="subtle">Uploaded images and photos read from blog posts, stored {acc.mode === 'cloud' ? 'in your account' : 'in this browser'}.</span>
          </div>
          <button className="btn btn-sm" onClick={() => void acc.refresh()} aria-label="Refresh usage">
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="usage-grid">
          <UsageCard line={storageLine} />
        </div>
        <details className="act-details">
          <summary>File size limits</summary>
          <div className="stack-sm" style={{ marginTop: 8 }}>
            <span className="subtle">Maximum size for each file type on your plan.</span>
            {fileLimits.map((f) => (
              <span key={f.label}>
                {f.label}: <strong>{f.value}</strong>
              </span>
            ))}
            {!cloudEnabled() && <span className="subtle">Browser storage space depends on your device ({formatBytes(0) === '0 B' ? 'usually several GB' : ''}).</span>}
          </div>
        </details>
      </section>
    </div>
  );
}
