import { Pipette, X } from 'lucide-react';
import { Component, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { PRESET_COLORS } from '../config/colors';
import { isValidHex, normalizeHex, hexToRgb, rgbToHex } from '../model/docOps';
import { useUi } from '../store/uiStore';

export function IconButton({
  label,
  onClick,
  children,
  pressed,
  disabled,
  tipPos,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  tipPos?: 'right' | 'top';
}) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      data-tip={label}
      data-tip-pos={tipPos}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

/** Numeric input that commits on blur/Enter so typing "1" on the way to "120" doesn't apply. */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  const [draft, setDraft] = useState(String(round(value)));
  useEffect(() => setDraft(String(round(value))), [value]);
  const commit = () => {
    let v = parseFloat(draft);
    if (Number.isNaN(v)) return setDraft(String(round(value)));
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    if (v !== value) onChange(v);
    setDraft(String(round(v)));
  };
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="num">
        <input
          className="input input-sm"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const d = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
              let v = value + d;
              if (min !== undefined) v = Math.max(min, v);
              if (max !== undefined) v = Math.min(max, v);
              onChange(v);
            }
          }}
          aria-label={label}
        />
        {unit && <span className="unit">{unit}</span>}
      </span>
    </label>
  );
}

const round = (v: number) => Math.round(v * 100) / 100;

export function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="range-row">
        <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
        <span className="subtle" style={{ textAlign: 'right' }}>
          {format ? format(value) : round(value)}
        </span>
      </div>
    </div>
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode; title: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} aria-label={o.title} data-tip={o.title} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; group?: string }[];
}) {
  const groups = [...new Set(options.map((o) => o.group ?? ''))];
  return (
    <Field label={label}>
      <select className="select input-sm" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {groups.map((g) =>
          g ? (
            <optgroup key={g} label={g}>
              {options.filter((o) => o.group === g).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ) : (
            options.filter((o) => !o.group).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          ),
        )}
      </select>
    </Field>
  );
}

declare global {
  interface Window {
    EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> };
  }
}

/**
 * Color picker: native picker + HEX + RGB, plus brand, document, recent and preset swatches.
 */
export function ColorField({
  label,
  value,
  onChange,
  brandColors = [],
  docColors = [],
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  brandColors?: string[];
  docColors?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  const ref = useRef<HTMLDivElement>(null);
  const recent = useUi((s) => s.recentColors);
  const pushRecent = useUi((s) => s.pushRecentColor);
  useEffect(() => setHex(value), [value]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  const pick = (c: string) => {
    const n = normalizeHex(c);
    onChange(n);
    pushRecent(n);
  };
  const [r, g, b] = hexToRgb(value);
  const group = (title: string, colors: string[]) =>
    colors.length > 0 && (
      <div className="stack-sm">
        <span className="subtle">{title}</span>
        <div className="swatches">
          {colors.map((c, i) => (
            <button key={c + i} type="button" style={{ background: c }} aria-label={`${title} ${c}`} title={c} aria-pressed={c.toUpperCase() === value.toUpperCase()} onClick={() => pick(c)} />
          ))}
        </div>
      </div>
    );

  return (
    <div className="field" ref={ref} style={{ position: 'relative' }}>
      <span className="field-label">{label}</span>
      <button type="button" className="color-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`${label}: ${value}`}>
        <span className="swatch" style={{ background: value }} />
        {value.toUpperCase()}
      </button>
      {open && (
        <div className="popover stack" style={{ top: '100%', left: 0, marginTop: 4 }} role="dialog" aria-label={`${label} picker`}>
          <div className="row">
            <input type="color" value={normalizeHex(value).slice(0, 7)} onChange={(e) => onChange(normalizeHex(e.target.value))} onBlur={() => pushRecent(value)} aria-label="Color picker" style={{ width: 40, height: 34, border: 0, padding: 0, background: 'none' }} />
            <input
              className="input input-sm grow"
              value={hex}
              aria-label="HEX"
              onChange={(e) => {
                setHex(e.target.value);
                if (isValidHex(e.target.value)) onChange(normalizeHex(e.target.value));
              }}
              onBlur={() => isValidHex(hex) && pushRecent(normalizeHex(hex))}
            />
            {window.EyeDropper && (
              <IconButton
                label="Pick color from screen"
                onClick={async () => {
                  try {
                    const res = await new window.EyeDropper!().open();
                    pick(res.sRGBHex);
                  } catch {
                    /* user cancelled */
                  }
                }}
              >
                <Pipette size={16} />
              </IconButton>
            )}
          </div>
          <div className="grid-3">
            {(['R', 'G', 'B'] as const).map((ch, i) => (
              <label key={ch} className="num">
                <span className="unit">{ch}</span>
                <input
                  className="input input-sm"
                  type="number"
                  min={0}
                  max={255}
                  value={[r, g, b][i]}
                  aria-label={ch}
                  onChange={(e) => {
                    const v = [r, g, b];
                    v[i] = Math.max(0, Math.min(255, parseInt(e.target.value || '0', 10)));
                    onChange(rgbToHex(v[0], v[1], v[2]));
                  }}
                />
              </label>
            ))}
          </div>
          {group('Brand', brandColors)}
          {group('In this design', docColors)}
          {group('Recent', recent)}
          {group('Presets', PRESET_COLORS)}
        </div>
      )}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, button, select, textarea')?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('keydown', esc);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismissToast);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          <span>{t.message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: (e: Error, reset: () => void) => ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error(error);
  }
  render() {
    if (this.state.error) {
      const reset = () => this.setState({ error: null });
      return (
        this.props.fallback?.(this.state.error, reset) ?? (
          <div className="error-screen">
            <div className="stack" style={{ maxWidth: 420 }}>
              <h2>Something went wrong</h2>
              <p className="muted">Your work is autosaved. Reload to continue where you left off.</p>
              <code className="subtle">{this.state.error.message}</code>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="btn" onClick={reset}>
                  Try again
                </button>
                <button className="btn btn-dark" onClick={() => location.assign('#/')}>
                  Back to dashboard
                </button>
              </div>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
