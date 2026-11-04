import { useEffect, useId, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import { messages as t } from '../../content';
import { suggestPassphrase } from '../../domain/passphrase';
import type { Vault } from '../../vault/service';
import { Toggle } from '../components';
import { Icon } from '../PixelIcon';

// A passphrase input with an eye button; both fields share one show/hide state.
function PassField({
  label,
  value,
  onChange,
  shown,
  onToggle,
  hint,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  shown: boolean;
  onToggle: () => void;
  hint?: string;
  autoComplete: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pass-input">
        <Input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          maxLength={1024}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <Button
          type="button"
          className="icon-button"
          aria-label={shown ? t.passHide : t.passShow}
          aria-pressed={shown}
          onClick={onToggle}
        >
          <Icon name={shown ? 'hide' : 'show'} />
        </Button>
      </div>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}

export function VaultGate({ vault, opened }: { vault: Vault; opened: () => void }) {
  const [exists, setExists] = useState<boolean>();
  const [pass, setPass] = useState('');
  const [repeat, setRepeat] = useState('');
  const [ack, setAck] = useState(false);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void vault
      .exists()
      .then((value) => {
        if (active) setExists(value);
      })
      .catch(() => {
        if (active) setError(t.storageError);
      });
    return () => {
      active = false;
    };
  }, [vault]);
  async function submit() {
    if (!exists && pass !== repeat) {
      setError(t.mismatch);
      return;
    }
    const secret = pass;
    setBusy(true);
    setError('');
    setPass('');
    setRepeat('');
    try {
      if (exists) await vault.unlock(secret);
      else await vault.create(secret);
      opened();
    } catch {
      setError(t.vaultError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="vault-gate">
      <h2>{t.vaultLocked}</h2>
      <p className="muted">{t.quickUi.vaultPrivacy}</p>
      <Accordion type="single" collapsible>
        <AccordionItem value="privacy">
          <AccordionTrigger>{t.quickUi.privacyDetails}</AccordionTrigger>
          <AccordionContent>
            <p>{t.privacy}</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {exists !== undefined && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <PassField
            label={t.passphrase}
            value={pass}
            onChange={setPass}
            shown={shown}
            onToggle={() => setShown(!shown)}
            hint={!exists ? t.passHint : undefined}
            autoComplete={exists ? 'current-password' : 'new-password'}
          />
          {!exists && (
            <>
              {/* Six random words, shown so they can be written down. */}
              <Button
                type="button"
                className="text-button suggest-pass"
                onClick={() => {
                  const suggestion = suggestPassphrase();
                  setPass(suggestion);
                  setRepeat(suggestion);
                  setShown(true);
                }}
              >
                {t.passSuggest}
              </Button>
              <PassField
                label={t.confirmPassphrase}
                value={repeat}
                onChange={setRepeat}
                shown={shown}
                onToggle={() => setShown(!shown)}
                autoComplete="new-password"
              />
              <p className="vault-warning">{t.noRecovery}</p>
              <Toggle label={t.recoveryAck} checked={ack} onChange={setAck} />
            </>
          )}
          <Button
            className="primary"
            disabled={busy || !pass || (!exists && (!ack || pass.length < 12))}
          >
            {busy ? t.busy : exists ? t.vaultUnlock : t.vaultCreate}
          </Button>
        </form>
      )}
      <p role="alert">{error}</p>
    </section>
  );
}
