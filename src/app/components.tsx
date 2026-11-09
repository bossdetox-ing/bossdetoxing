import { Button } from '../components/ui/button';
import { reflectionFor } from '../domain/mantras';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Select as SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '../components/ui/command';
import { Icon } from './PixelIcon';
import { useId, useState, type ReactNode } from 'react';
import { messages as t } from '../content';
import { copyRisks } from '../domain/copy-review';
export function PageTitle({ children, intro }: { children: ReactNode; intro?: string }) {
  return (
    <div className="page-title">
      <h1 tabIndex={-1}>{children}</h1>
      {intro && <p className="muted">{intro}</p>}
    </div>
  );
}
export function CopyButton({
  value,
  label = t.copy,
  review = false,
  disabled = false,
  compact = false,
}: {
  value: string;
  label?: string;
  review?: boolean;
  disabled?: boolean;
  /** Icon-only; the label becomes the accessible name. */
  compact?: boolean;
}) {
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
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
      // Compact buttons confirm with a brief check mark instead of visible text.
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setStatus(t.copyFailed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="copy-control">
      <Button
        className={compact ? 'icon-button copy-icon' : 'primary'}
        aria-label={compact ? label : undefined}
        disabled={disabled || busy}
        onClick={() => void write()}
      >
        {!compact && label}
        <Icon name={compact && copied ? 'check' : 'copy'} />
      </Button>
      {pending && (
        <section className="notice">
          <h3>{t.copyReview}</h3>
          <p>{t.copyWarning}</p>
          <Button onClick={() => void write(true)}>{t.copyAnyway}</Button>
          <Button onClick={() => setPending(false)}>{t.cancel}</Button>
        </section>
      )}
      <p
        className={compact && status === t.copied ? 'feedback visually-hidden' : 'feedback'}
        role="status"
      >
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
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  hint?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  const id = useId();
  const describedBy = hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <Textarea
          id={id}
          aria-describedby={describedBy}
          value={value}
          maxLength={maxLength ?? 20000}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      ) : (
        <Input
          id={id}
          aria-describedby={describedBy}
          type={type}
          value={value}
          maxLength={maxLength ?? (type === 'password' ? 1024 : 20000)}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      )}{' '}
      {hint && <small id={describedBy}>{hint}</small>}
    </div>
  );
}
// Radix items cannot use '' as a value; '' options ("Automatic") travel under this sentinel.
const EMPTY = '__empty__';
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
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  if (options.length > 12)
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              id={id}
              type="button"
              role="combobox"
              aria-expanded={open}
              className="select-trigger"
            >
              <span>{current?.label ?? value}</span>
              <span className="select-chevron" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="combobox-content">
            <Command
              filter={(item, search) => (item.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
            >
              <CommandInput placeholder={t.searchList} aria-label={`${t.searchList}: ${label}`} />
              <CommandList>
                <CommandEmpty className="select-empty">{t.noMatches}</CommandEmpty>
                {options.map((o) => (
                  <CommandItem
                    key={o.value || EMPTY}
                    value={`${o.label} ${o.value}`}
                    data-checked={o.value === value}
                    onSelect={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    {o.label}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <SelectRoot
        value={value || EMPTY}
        onValueChange={(next) => onChange((next === EMPTY ? '' : next) as T)}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value || EMPTY} value={o.value || EMPTY}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectRoot>
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

/** "Read more" under a line: opens its reflection inline, and stays open only for that line. */
export function ReadMore({ mantraId }: { mantraId: string }) {
  const [openId, setOpenId] = useState<string>();
  const reflection = reflectionFor(mantraId);
  if (!reflection) return null;
  const open = openId === mantraId;
  return (
    <>
      <Button
        className="text-button read-more"
        aria-expanded={open}
        aria-controls="mantra-reflection"
        onClick={() => setOpenId(open ? undefined : mantraId)}
      >
        {open ? t.redesign.readLess : t.redesign.readMore}
      </Button>
      {open && (
        <div id="mantra-reflection" className="mantra-reflection">
          <p>{reflection.text}</p>
          <p className="mantra-prompt">{reflection.prompt}</p>
        </div>
      )}
    </>
  );
}
