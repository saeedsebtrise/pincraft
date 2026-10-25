import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { BrandMark } from '../../ui/BrandMark';
import { Field } from '../../ui/controls';
import { useAccount } from '../accountStore';

export type AuthView = 'login' | 'signup' | 'forgot' | 'reset';

/** Sign in, sign up, forgot password and set-new-password (after the reset email). */
export function AuthScreen({ view }: { view: AuthView }) {
  const acc = useAccount();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<AuthView, [string, string]> = {
    login: ['Welcome back', 'Sign in to your PinCraft studio.'],
    signup: ['Create your account', 'Free plan — no card needed.'],
    forgot: ['Reset your password', "We'll email you a link to set a new one."],
    reset: ['Set a new password', 'Choose a password with at least 8 characters.'],
  };

  return (
    <div className="auth">
      <div className="auth-art" aria-hidden>
        <div className="auth-art-inner">
          <BrandMark size={56} />
          <h2>Design Pinterest Pins in minutes</h2>
          <p>Collages, listicle badges, script + bold headlines and editorial blocks — exported at exact Pinterest sizes.</p>
        </div>
      </div>
      <div className="auth-form-wrap">
        <form
          className="auth-form card"
          onSubmit={(e) => {
            e.preventDefault();
            if (view === 'login') void run(async () => {
              await acc.signIn(email, password);
              location.hash = '#/';
            });
            if (view === 'signup') void run(async () => {
              if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
              const r = await acc.signUp(name.trim() || email.split('@')[0], email, password);
              if (r === 'confirmEmail') setNotice(`Check ${email} — click the link we sent to confirm your account, then sign in.`);
              else location.hash = '#/';
            });
            if (view === 'forgot') void run(async () => {
              await acc.sendPasswordReset(email);
              setNotice(`If an account exists for ${email}, a reset link is on its way.`);
            });
            if (view === 'reset') void run(async () => {
              if (password.length < 8) throw new Error('Use at least 8 characters for your password.');
              await acc.updatePassword(password);
              location.hash = '#/';
            });
          }}
        >
          <div className="row" style={{ gap: 10 }}>
            <BrandMark size={34} />
            <strong style={{ fontSize: 18 }}>PinCraft</strong>
          </div>
          <div className="stack-sm">
            <h1 className="dash-h1">{titles[view][0]}</h1>
            <p className="muted">{titles[view][1]}</p>
          </div>
          {view === 'signup' && (
            <Field label="Name">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
          )}
          {view !== 'reset' && (
            <Field label="Email">
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
          )}
          {(view === 'login' || view === 'signup' || view === 'reset') && (
            <Field label={view === 'reset' ? 'New password' : 'Password'}>
              <input
                className="input"
                type="password"
                required
                minLength={view === 'login' ? undefined : 8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={view === 'login' ? 'current-password' : 'new-password'}
              />
            </Field>
          )}
          {error && <div className="issue" role="alert">{error}</div>}
          {notice && <div className="ok-box" role="status">{notice}</div>}
          <button className="btn btn-pink btn-lg btn-block" disabled={busy}>
            {busy && <Loader2 size={16} />}
            {{ login: 'Sign in', signup: 'Create free account', forgot: 'Send reset link', reset: 'Save password' }[view]}
          </button>
          <div className="auth-links">
            {view === 'login' && (
              <>
                <a href="#/forgot">Forgot password?</a>
                <span>
                  New here? <a href="#/signup">Create an account</a>
                </span>
              </>
            )}
            {view === 'signup' && (
              <span>
                Already have an account? <a href="#/login">Sign in</a>
              </span>
            )}
            {(view === 'forgot' || view === 'reset') && <a href="#/login">Back to sign in</a>}
          </div>
        </form>
      </div>
    </div>
  );
}
