/**
 * "How to connect Pinterest": a checklist of what's ready (server, Pinterest
 * app keys, account) and the exact steps for whatever is missing — with
 * copy buttons for the redirect address, the .env lines and the commands.
 */
import { Check, CheckCircle2, Circle, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { connectPinterest, usePinterest } from '../services/pinterest';
import { useUi } from '../store/uiStore';
import { Modal } from '../ui/controls';

function CopyBox({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy-box">
      <pre>{text}</pre>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => {
          void navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        aria-label={`Copy ${label ?? 'text'}`}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function Status({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <div className={`guide-status ${ok ? 'is-ok' : ''}`}>
      {ok ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      <span className="stack-sm" style={{ gap: 0 }}>
        <strong>{label}</strong>
        <span className="subtle">{hint}</span>
      </span>
    </div>
  );
}

/** A random secret for PINTEREST_TOKEN_SECRET (made in the browser, never sent anywhere). */
const randomSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');

export function PinterestGuide({ onClose }: { onClose: () => void }) {
  const pin = usePinterest();
  const [checking, setChecking] = useState(false);
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const callback = `${location.origin}/api/pinterest/callback`;
  const secret = useMemo(randomSecret, []);
  const serverOk = !pin.serverOffline && pin.configured !== null;
  const keysOk = pin.configured === true;
  const check = async () => {
    setChecking(true);
    await pin.refresh();
    setChecking(false);
    const s = usePinterest.getState();
    useUi.getState().toast(s.connected ? 'Pinterest is connected' : s.configured ? 'Ready — click Connect Pinterest' : s.serverOffline ? 'The PinCraft server isn’t running yet' : 'Pinterest keys are not set yet', s.configured ? 'success' : 'info');
  };

  return (
    <Modal
      title="How to connect Pinterest"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" disabled={checking} onClick={() => void check()}>
            {checking ? <Loader2 size={15} /> : <RefreshCw size={15} />} Check again
          </button>
          <button className="btn btn-pink" disabled={!keysOk} onClick={connectPinterest} title={keysOk ? '' : 'Finish the steps above first'}>
            Connect Pinterest
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="guide-checklist">
          <Status ok={serverOk} label="PinCraft server" hint={serverOk ? 'Running' : local ? 'Not running — step 3' : 'Not reachable — redeploy on Vercel'} />
          <Status ok={keysOk} label="Pinterest app keys" hint={keysOk ? 'Added' : 'Missing — steps 1–2'} />
          <Status ok={pin.connected} label="Your Pinterest account" hint={pin.connected ? `Connected${pin.account ? ` as @${pin.account.username}` : ''}` : 'Not connected — step 4'} />
        </div>

        <ol className="guide-steps">
          <li>
            <strong>Create a Pinterest app</strong> (once, takes ~5 minutes)
            <span className="muted">
              Sign in at Pinterest Developers with your Pinterest <strong>business</strong> account, click <em>Connect app</em>, and fill in the name (e.g. PinCraft), a short description
              and your website.
            </span>
            <a className="btn btn-sm btn-outline" href="https://developers.pinterest.com/apps/" target="_blank" rel="noopener noreferrer" style={{ alignSelf: 'flex-start' }}>
              Open Pinterest Developers <ExternalLink size={13} />
            </a>
            <span className="muted">
              In the app's settings, add this <strong>Redirect URI</strong> exactly{local ? ' (and later your live Vercel address the same way)' : ''}:
            </span>
            <CopyBox text={callback} label="redirect URI" />
            <span className="muted">Then copy the app's <strong>App ID</strong> and <strong>App secret key</strong>.</span>
          </li>

          <li>
            <strong>Add the keys to PinCraft's server</strong>
            {local ? (
              <>
                <span className="muted">
                  In the project folder, open (or create) the file <code>.env</code> and paste these lines, putting your App ID and secret after the <code>=</code>. The last line is a random
                  secret made for you — keep it as is.
                </span>
                <CopyBox label=".env lines" text={`PINTEREST_APP_ID=\nPINTEREST_APP_SECRET=\nPINTEREST_TOKEN_SECRET=${secret}`} />
                <span className="subtle">.env is private: it's never uploaded to GitHub or shown in the browser.</span>
              </>
            ) : (
              <>
                <span className="muted">
                  In Vercel open your project → <strong>Settings → Environment Variables</strong> and add these three. Use the random secret below for the last one.
                </span>
                <CopyBox label="variable names" text={`PINTEREST_APP_ID\nPINTEREST_APP_SECRET\nPINTEREST_TOKEN_SECRET`} />
                <CopyBox label="token secret" text={secret} />
              </>
            )}
          </li>

          <li>
            <strong>{local ? 'Start the PinCraft server' : 'Redeploy'}</strong>
            {local ? (
              <>
                <span className="muted">Open a second terminal in the project folder, run this and leave it open while you use PinCraft:</span>
                <CopyBox label="command" text="npm run ai-proxy" />
                <span className="subtle">It prints “Pinterest: ready” when the keys are found.</span>
              </>
            ) : (
              <span className="muted">In Vercel → Deployments, click ⋯ on the latest deployment → <strong>Redeploy</strong>, so the new keys are used.</span>
            )}
          </li>

          <li>
            <strong>Connect your account</strong>
            <span className="muted">
              Click <em>Check again</em> below, then <strong>Connect Pinterest</strong>. Pinterest asks you to allow PinCraft — click <em>Allow</em> and you come straight back here.
            </span>
            <span className="subtle">
              New Pinterest apps start in <em>Trial access</em>: only your own account can connect. To let other users connect, request <em>Standard access</em> on the app page.
            </span>
          </li>
        </ol>
      </div>
    </Modal>
  );
}
