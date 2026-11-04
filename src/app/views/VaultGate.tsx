import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { messages as t } from '../../content';
import type { Vault } from '../../vault/service';
import { Field, Toggle } from '../components';

export function VaultGate({ vault, opened }: { vault: Vault; opened: () => void }) {
  const [exists, setExists] = useState<boolean>();
  const [pass, setPass] = useState('');
  const [repeat, setRepeat] = useState('');
  const [ack, setAck] = useState(false);
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
    <section>
      <h2>{t.vaultLocked}</h2>
      <p className="muted">{t.quickUi.vaultPrivacy}</p>
      <details>
        <summary>{t.quickUi.privacyDetails}</summary>
        <p>{t.privacy}</p>
      </details>
      {exists !== undefined && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Field
            label={t.passphrase}
            type="password"
            value={pass}
            onChange={setPass}
            hint={!exists ? t.passHint : undefined}
            required
          />
          {!exists && (
            <>
              <Field
                label={t.confirmPassphrase}
                type="password"
                value={repeat}
                onChange={setRepeat}
                required
              />
              <p className="notice">{t.noRecovery}</p>
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
