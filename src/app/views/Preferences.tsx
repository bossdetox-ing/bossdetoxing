import { useState } from 'react';
import type { Settings } from '../../browser/settings';
import { messages as t } from '../../content';
import { content, evidenceLabels } from '../../domain/content';
import { MAX_ARCHIVE_BYTES, type Vault } from '../../vault/service';
import { Field, PageTitle, Select, Sigil, Toggle } from '../components';
type Props = { settings: Settings; update: (settings: Settings) => Promise<void> };

function Appearance({ settings, update }: Props) {
  const patch = (value: Partial<Settings>) => void update({ ...settings, ...value });
  return (
    <div className="stack">
      <Select
        label={t.theme}
        value={settings.theme}
        onChange={(theme) => patch({ theme })}
        options={Object.entries(t.themes).map(([value, label]) => ({
          value: value as Settings['theme'],
          label,
        }))}
      />
      <Select
        label={t.icon}
        value={settings.icon}
        onChange={(icon) => patch({ icon })}
        options={Object.entries(t.icons).map(([value, label]) => ({
          value: value as Settings['icon'],
          label,
        }))}
      />
      <Select
        label={t.tone}
        value={settings.tone}
        onChange={(tone) => patch({ tone })}
        options={Object.entries(t.tones).map(([value, label]) => ({
          value: value as Settings['tone'],
          label,
        }))}
      />
      <Toggle label={t.humor} checked={settings.humor} onChange={(humor) => patch({ humor })} />
      <Toggle
        label={t.motion}
        checked={settings.reducedMotion}
        onChange={(reducedMotion) => patch({ reducedMotion })}
      />
      <Toggle label={t.quiet} checked={settings.quiet} onChange={(quiet) => patch({ quiet })} />
    </div>
  );
}
export function Onboarding({ settings, update }: Props) {
  return (
    <section className="onboarding">
      <Sigil />
      <PageTitle intro={t.welcomeIntro}>{t.welcome}</PageTitle>
      <section className="notice">
        <h2>{t.privacyTitle}</h2>
        <p>{t.privacy}</p>
        <p>{t.sharing}</p>
        <a
          href="https://support.google.com/chrome/answer/9281740"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.manageHelp} ↗
        </a>
      </section>
      <button className="primary" onClick={() => void update({ ...settings, onboarded: true })}>
        {t.start}
      </button>
      <details>
        <summary>{t.preferences}</summary>
        <Appearance settings={settings} update={update} />
      </details>
    </section>
  );
}
function Backup({ vault }: { vault: Vault }) {
  const [raw, setRaw] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  async function exportArchive() {
    setBusy(true);
    try {
      const data = await vault.export();
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `bossdetox-ing-encrypted-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(t.exportDone);
    } catch {
      setStatus(t.storageError);
    } finally {
      setBusy(false);
    }
  }
  async function restoreArchive() {
    setBusy(true);
    const secret = passphrase;
    setPassphrase('');
    try {
      await vault.restore(raw, secret, replace);
      setStatus(t.restoreDone);
      setRaw('');
      setReplace(false);
    } catch {
      setStatus(t.vaultError);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="stack">
      <button disabled={busy} onClick={() => void exportArchive()}>
        {t.export}
      </button>
      <details>
        <summary>{t.import}</summary>
        <p>{t.noRecovery}</p>
        <label className="field">
          <span>{t.archiveFile}</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              setRaw('');
              setStatus('');
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > MAX_ARCHIVE_BYTES) {
                setStatus(t.fileError);
                return;
              }
              void file
                .text()
                .then(setRaw)
                .catch(() => setStatus(t.fileError));
            }}
          />
        </label>
        <Field
          label={t.archivePassword}
          type="password"
          value={passphrase}
          onChange={setPassphrase}
        />
        <Toggle label={t.replaceVault} checked={replace} onChange={setReplace} />
        <button disabled={!raw || !passphrase || busy} onClick={() => void restoreArchive()}>
          {busy ? t.busy : t.restore}
        </button>
      </details>
      <p role="status">{status}</p>
    </section>
  );
}
export function Preferences({
  settings,
  update,
  vault,
  reset,
}: Props & { vault: Vault; reset: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <>
      <PageTitle>{t.settingsTitle}</PageTitle>
      <h2>{t.appearance}</h2>
      <Appearance settings={settings} update={update} />
      <h2>{t.language}</h2>
      <p>{t.english}</p>
      <p className="muted">{t.languageHint}</p>
      <h2>{t.shortcuts}</h2>
      <p>{t.shortcutsText}</p>
      <h2>{t.data}</h2>
      <Select
        label={t.autoLock}
        value={String(settings.lockMinutes)}
        onChange={(value) =>
          void update({ ...settings, lockMinutes: Number(value) as Settings['lockMinutes'] })
        }
        options={[1, 5, 15].map((value) => ({
          value: String(value),
          label: `${value} ${t.minutes}`,
        }))}
      />
      <Backup vault={vault} />
      <details>
        <summary>{t.privacyHeading}</summary>
        <p>{t.privacyDetail}</p>
        <p>{t.privacy}</p>
        <p>{t.sharing}</p>
        <p>{t.disclaimer}</p>
        <a
          href="https://support.google.com/chrome/answer/9281740"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.manageHelp} ↗
        </a>
      </details>
      <details>
        <summary>{t.sources}</summary>
        {Object.values(evidenceLabels).map((label) => (
          <p key={label}>{label}</p>
        ))}
        <p>{t.evidenceLimit}</p>
        {content.sources.map((source) => (
          <p key={source.id}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title} ↗
            </a>
          </p>
        ))}
      </details>
      <button className="danger" onClick={() => setDeleting(true)}>
        {t.wipe}
      </button>
      {deleting && (
        <section className="notice">
          <p>{t.wipeWarning}</p>
          <Toggle label={t.wipeAck} checked={ack} onChange={setAck} />
          <button
            disabled={!ack || busy}
            className="danger"
            onClick={() => {
              setBusy(true);
              void reset().catch(() => {
                setError(t.storageError);
                setBusy(false);
              });
            }}
          >
            {t.wipeConfirm}
          </button>
          <button onClick={() => setDeleting(false)}>{t.cancel}</button>
        </section>
      )}
      <p role="alert">{error}</p>
      <p className="muted">{t.version}</p>
    </>
  );
}
