import { Check, Crown, ExternalLink, LogOut, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Field, Modal } from '../../ui/controls';
import { useUi } from '../../store/uiStore';
import { useAccount } from '../accountStore';
import { proCheckoutUrl } from '../billing';
import { billingEnabled } from '../config';
import { useUpgradePrompt } from '../gates';
import { importLocalProjects } from '../importLocal';
import { PLANS, type PlanTier } from '../plans';

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';
}

export function Avatar({ size = 36 }: { size?: number }) {
  const name = useAccount((s) => s.account?.name ?? '?');
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {initials(name)}
    </span>
  );
}

export function planLabel(tier: PlanTier, status: string | null): string {
  if (status === 'local') return 'Local mode';
  return `${PLANS[tier].name} Plan`;
}

/** Sidebar user card (bottom of the dashboard sidebar). */
export function UserCard() {
  const acc = useAccount();
  if (!acc.account) return null;
  return (
    <a className="user-card" href="#/account">
      <Avatar />
      <span className="user-card-text">
        <strong>{acc.account.name}</strong>
        <span>{planLabel(acc.subscription.tier, acc.subscription.status)}</span>
      </span>
    </a>
  );
}

function openCheckout() {
  const acc = useAccount.getState();
  const url = acc.account && proCheckoutUrl(acc.account);
  if (!url) return;
  window.open(url, '_blank', 'noopener');
  useUi.getState().toast('Checkout opened in a new tab. Your plan updates here as soon as payment completes.', 'info');
}

export function UpgradeButton({ className = 'btn btn-pink' }: { className?: string }) {
  const tier = useAccount((s) => s.subscription.tier);
  const mode = useAccount((s) => s.mode);
  if (tier === 'pro' || mode === 'local') return null;
  return (
    <a className={className} href="#/pricing">
      <Crown size={16} /> Upgrade
    </a>
  );
}

export function PricingPage() {
  const acc = useAccount();
  const canPay = billingEnabled() && acc.mode === 'cloud' && acc.status === 'signedIn';
  return (
    <div className="dash-main">
      <div className="stack-sm" style={{ textAlign: 'center', alignItems: 'center' }}>
        <h1 className="dash-h1">Simple pricing for Pinterest creators</h1>
        <p className="muted">Start free. Upgrade when you publish Pins every day.</p>
      </div>
      <div className="pricing-grid">
        {(['free', 'pro'] as PlanTier[]).map((tier) => {
          const plan = PLANS[tier];
          const current = acc.subscription.tier === tier && acc.mode === 'cloud';
          return (
            <div key={tier} className={`card price-card ${tier === 'pro' ? 'price-card-pro' : ''}`}>
              {tier === 'pro' && <span className="chip chip-pro">Most popular</span>}
              <h2>{plan.name}</h2>
              <p className="price">{plan.price}</p>
              <p className="muted">{plan.tagline}</p>
              <ul className="price-list">
                {plan.highlights.map((h) => (
                  <li key={h}>
                    <Check size={16} /> {h}
                  </li>
                ))}
              </ul>
              {tier === 'pro' ? (
                current ? (
                  <a className="btn btn-outline btn-lg btn-block" href="#/account">
                    Manage subscription
                  </a>
                ) : (
                  <button className="btn btn-pink btn-lg btn-block" disabled={!canPay} onClick={openCheckout}>
                    <Crown size={17} /> Upgrade to Pro
                  </button>
                )
              ) : (
                <button className="btn btn-outline btn-lg btn-block" disabled>
                  {current ? 'Your current plan' : 'Included'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {!canPay && (
        <p className="subtle" style={{ textAlign: 'center' }}>
          {acc.mode === 'local'
            ? 'You are in local mode on this device, with every feature unlocked. Accounts and payments turn on when the app is connected to Supabase and Lemon Squeezy (docs/SAAS_SETUP.md).'
            : 'Payments are not connected yet — set VITE_LEMON_CHECKOUT_URL (docs/SAAS_SETUP.md).'}
        </p>
      )}
      <p className="subtle" style={{ textAlign: 'center' }}>Payments are processed securely by Lemon Squeezy. Cancel any time from your account.</p>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div className="stack-sm">
      <div className="row-between">
        <span>{label}</span>
        <strong>{limit === null ? `${used} · unlimited` : `${used} / ${limit}`}</strong>
      </div>
      {limit !== null && (
        <div className="usage-bar" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used} aria-label={label}>
          <span style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--danger)' : undefined }} />
        </div>
      )}
    </div>
  );
}

export function AccountPage() {
  const acc = useAccount();
  const [name, setName] = useState(acc.account?.name ?? '');
  useEffect(() => {
    void acc.refresh();
  }, []);
  useEffect(() => setName(acc.account?.name ?? ''), [acc.account?.name]);
  if (!acc.account) return null;
  const plan = PLANS[acc.subscription.tier];
  const sub = acc.subscription;
  const date = (s: string | null) => (s ? new Date(s).toLocaleDateString() : null);

  return (
    <div className="dash-main" style={{ maxWidth: 760 }}>
      <h1 className="dash-h1">Account</h1>
      {acc.mode === 'local' && (
        <div className="ok-box">
          Local mode: projects are saved in this browser and every feature is unlocked. Connect Supabase to turn on accounts, cloud projects and plans (docs/SAAS_SETUP.md).
        </div>
      )}
      <section className="card account-card">
        <div className="row" style={{ gap: 14 }}>
          <Avatar size={56} />
          <div className="stack-sm grow">
            <strong style={{ fontSize: 18 }}>{acc.account.name}</strong>
            {acc.account.email && <span className="muted">{acc.account.email}</span>}
          </div>
          {acc.mode === 'cloud' && (
            <button className="btn btn-outline" onClick={() => acc.signOut().then(() => (location.hash = '#/login'))}>
              <LogOut size={16} /> Sign out
            </button>
          )}
        </div>
        <form
          className="row"
          style={{ alignItems: 'flex-end' }}
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await acc.updateName(name.trim());
              useUi.getState().toast('Name updated', 'success');
            } catch (err) {
              useUi.getState().toast((err as Error).message, 'error');
            }
          }}
        >
          <Field label="Display name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <button className="btn" disabled={!name.trim() || name.trim() === acc.account.name}>
            Save
          </button>
        </form>
      </section>

      <section className="card account-card">
        <div className="row-between">
          <div className="stack-sm">
            <span className="field-label">Plan</span>
            <strong style={{ fontSize: 20 }}>{planLabel(sub.tier, sub.status)}</strong>
            {sub.status && sub.status !== 'local' && (
              <span className="subtle">
                Status: {sub.status.replace('_', ' ')}
                {sub.renewsAt && sub.status !== 'cancelled' ? ` · renews ${date(sub.renewsAt)}` : ''}
                {sub.endsAt ? ` · ends ${date(sub.endsAt)}` : ''}
              </span>
            )}
          </div>
          {sub.portalUrl ? (
            <a className="btn btn-outline" href={sub.portalUrl} target="_blank" rel="noopener noreferrer">
              Manage billing <ExternalLink size={14} />
            </a>
          ) : (
            <UpgradeButton />
          )}
        </div>
        <UsageBar label="Pin exports this month" used={acc.usage.exportsThisMonth} limit={acc.mode === 'local' ? null : plan.exportsPerMonth} />
        <UsageBar label="Projects" used={acc.usage.projects} limit={acc.mode === 'local' ? null : plan.maxProjects} />
        <span className="subtle">Export quotas reset on the 1st of each month (UTC).</span>
      </section>
      {acc.mode === 'cloud' && <ImportLocalCard />}
    </div>
  );
}

function ImportLocalCard() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <section className="card account-card">
      <strong>Projects from this browser</strong>
      <span className="muted">Made Pins here before signing in? Copy them (with their images) into your account.</span>
      <div className="row">
        <button
          className="btn btn-outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            try {
              const r = await importLocalProjects((d, t) => setMsg(`Importing ${d} of ${t}…`));
              await useAccount.getState().refresh();
              setMsg(
                r.stoppedByLimit
                  ? `Imported ${r.imported}. ${r.stoppedByLimit}`
                  : r.imported
                    ? `Imported ${r.imported} project${r.imported === 1 ? '' : 's'}.`
                    : 'Nothing new to import.',
              );
            } catch (e) {
              setMsg(`Import failed: ${(e as Error).message}`);
            } finally {
              setBusy(false);
            }
          }}
        >
          Import local projects
        </button>
        {msg && <span className="subtle">{msg}</span>}
      </div>
    </section>
  );
}

/** Shown when an action needs Pro or a Free limit is reached. */
export function UpgradeDialog() {
  const { reason, close } = useUpgradePrompt();
  if (!reason) return null;
  return (
    <Modal
      title="Upgrade to PinCraft Pro"
      onClose={close}
      footer={
        <>
          <button className="btn" onClick={close}>
            <X size={15} /> Not now
          </button>
          <a
            className="btn btn-pink"
            href="#/pricing"
            onClick={() => {
              close();
              useUi.getState().set({ modal: null });
            }}
          >
            <Sparkles size={15} /> See Pro
          </a>
        </>
      }
    >
      <div className="stack">
        <p>{reason}</p>
        <ul className="price-list">
          {PLANS.pro.highlights.map((h) => (
            <li key={h}>
              <Check size={16} /> {h}
            </li>
          ))}
        </ul>
        <p className="subtle">Your work is saved — nothing is lost if you upgrade later.</p>
      </div>
    </Modal>
  );
}
