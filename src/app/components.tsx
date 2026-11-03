import { useId, useState, type ReactNode } from 'react';
import { messages as t } from '../content';
import { copyRisks } from '../domain/task';
export function storageFeedback(error: unknown) {
  return error instanceof Error && error.message === 'record-limit'
    ? t.recordLimit
    : t.storageError;
}

export function Sigil({ decorative = true }: { decorative?: boolean }) {
  return (
    <svg
      className="sigil"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden={decorative}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : t.tarotArt}
    >
      <circle cx="24" cy="24" r="20" />
      <circle cx="24" cy="24" r="16" strokeDasharray="1 5" />
      <path d="M24 5v38M9 33 24 12l15 21H9ZM17 24h14" />
    </svg>
  );
}
export function PageTitle({
  eyebrow,
  children,
  intro,
}: {
  eyebrow?: string;
  children: ReactNode;
  intro?: string;
}) {
  return (
    <div className="page-title">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 tabIndex={-1}>{children}</h1>
      {intro && <p className="muted">{intro}</p>}
    </div>
  );
}
export function Voice({
  inside,
  outside,
  action,
}: {
  inside: string;
  outside?: string;
  action?: ReactNode;
}) {
  return (
    <section className="voices">
      <div className="inside">
        <p className="eyebrow">{t.private}</p>
        <p className="mantra">{inside}</p>
      </div>
      {outside && (
        <div className="outside">
          <p className="eyebrow">{t.professional}</p>
          <p className="sentence">{outside}</p>
          {action}
        </div>
      )}
    </section>
  );
}
export function CopyButton({
  value,
  label = t.copy,
  review = false,
  disabled = false,
}: {
  value: string;
  label?: string;
  review?: boolean;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  async function write(approved = false) {
    if (!approved && review && copyRisks(value)) {
      setPending(true);
      return;
    }
    setBusy(true);
    try {
      await navigator.clipboard.writeText(value);
      setStatus(t.copied);
      setPending(false);
    } catch {
      setStatus(t.copyFailed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="copy-control">
      <button className="primary" disabled={disabled || busy} onClick={() => void write()}>
        {label}
        <span aria-hidden="true"> ↗</span>
      </button>
      {pending && (
        <section className="notice">
          <h3>{t.copyReview}</h3>
          <p>{t.copyWarning}</p>
          <button onClick={() => void write(true)}>{t.copyAnyway}</button>
          <button onClick={() => setPending(false)}>{t.cancel}</button>
        </section>
      )}
      <p className="feedback" role="status">
        {status}
      </p>
    </div>
  );
}
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = 'text',
  hint,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  hint?: string;
  required?: boolean;
}) {
  const id = useId();
  const describedBy = hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          aria-describedby={describedBy}
          value={value}
          maxLength={20000}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      ) : (
        <input
          id={id}
          aria-describedby={describedBy}
          type={type}
          value={value}
          maxLength={type === 'password' ? 1024 : 20000}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}{' '}
      {hint && <small id={describedBy}>{hint}</small>}
    </div>
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
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
