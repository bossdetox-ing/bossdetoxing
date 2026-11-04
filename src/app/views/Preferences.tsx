import { HistoryDialog } from '../HistoryDialog';
import { Button } from '../../components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import { useEffect, useState } from 'react';
import { demonNames } from '../../domain/boss-name';
import type { Settings } from '../../browser/settings';
import { messages as t } from '../../content';
import { MAX_ARCHIVE_BYTES, type Vault } from '../../vault/service';
import { Field, PageTitle, Select, Toggle } from '../components';
import { isExtension } from '../../browser/platform';
import { brandNames, brands, lookAlikes, monkeys } from '../../domain/disguise';
type Props = { settings: Settings; update: (settings: Settings) => Promise<void> };

function iconName(id: string) {
  if (id.startsWith('monkey-')) return `${t.icons.monkey} ${Number(id.slice(7))}`;
  return brandNames[id as keyof typeof brandNames] ?? t.icons[id as keyof typeof t.icons] ?? id;
}
function IconPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const groups = [
    ...(isExtension() ? [] : [{ label: t.iconGroups.apps, ids: brands as readonly string[] }]),
    { label: t.iconGroups.lookAlikes, ids: lookAlikes as readonly string[] },
    { label: t.iconGroups.monkeys, ids: monkeys },
  ];
  const title = isExtension() ? t.icon : t.tabIcon;
  return (
    <div className="icon-picker" role="radiogroup" aria-label={title}>
      <p className="field-label">{title}</p>
      <p className="muted small-copy">{t.iconHint}</p>
      {groups.map((group) => (
        <div key={group.label} className="icon-group">
          <p className="group-label">{group.label}</p>
          <div className="icon-grid">
            {group.ids.map((id) => (
              <Button
                key={id}
                role="radio"
                aria-checked={value === id}
                aria-label={iconName(id)}
                title={iconName(id)}
                onClick={() => onChange(id)}
              >
                <img src={`/disguise/mono/${id}.svg`} alt="" />
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
// While the field is empty its placeholder cycles through demon names.
function BossName({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (value) return;
    const slow = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % demonNames.length),
      slow ? 2400 : 650,
    );
    return () => window.clearInterval(timer);
  }, [value]);
  return (
    <Field
      label={t.bossName}
      hint={t.bossNameHint}
      value={value}
      maxLength={40}
      placeholder={demonNames[index]}
      onChange={onChange}
    />
  );
}
function Appearance({ settings, update }: Props) {
  const patch = (value: Partial<Settings>) => void update({ ...settings, ...value });
  return (
    <div className="stack">
      <Select
        label={t.bossPronouns}
        value={settings.bossPronouns}
        onChange={(bossPronouns) => patch({ bossPronouns })}
        options={Object.entries(t.pronouns).map(([value, label]) => ({
          value: value as Settings['bossPronouns'],
          label,
        }))}
      />
      <BossName value={settings.bossName} onChange={(bossName) => patch({ bossName })} />
      <Toggle
        label={t.strongLanguage}
        checked={settings.strongLanguage}
        onChange={(strongLanguage) => patch({ strongLanguage })}
      />
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
        label={t.timeZone}
        value={settings.timeZone}
        onChange={(timeZone) => patch({ timeZone })}
        options={[
          { value: '', label: t.timeZoneAuto },
          ...Intl.supportedValuesOf('timeZone').map((zone) => ({
            value: zone,
            label: zone.replaceAll('_', ' '),
          })),
        ]}
      />
      <IconPicker value={settings.icon} onChange={(icon) => patch({ icon })} />
      <Select
        label={t.tone}
        value={settings.tone}
        onChange={(tone) => patch({ tone })}
        options={Object.entries(t.tones).map(([value, label]) => ({
          value: value as Settings['tone'],
          label,
        }))}
      />
    </div>
  );
}
export function Onboarding({ settings, update }: Props) {
  return (
    <section className="onboarding">
      <PageTitle intro={t.welcomeIntro}>{t.welcome}</PageTitle>
      <Accordion type="single" collapsible className="notice">
        <AccordionItem value="privacy">
          <AccordionTrigger>{t.privacyTitle}</AccordionTrigger>
          <AccordionContent>
            <p>{t.privacy}</p>
            <p>{t.sharing}</p>
            <a
              href="https://support.google.com/chrome/answer/9281740"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.manageHelp} ↗
            </a>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Button className="primary" onClick={() => void update({ ...settings, onboarded: true })}>
        {t.start}
      </Button>
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
      <Button disabled={busy} onClick={() => void exportArchive()}>
        {t.export}
      </Button>
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
        <Button disabled={!raw || !passphrase || busy} onClick={() => void restoreArchive()}>
          {busy ? t.busy : t.restore}
        </Button>
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
  const [history, setHistory] = useState(false);
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
      <h2>{t.shortcuts}</h2>
      <p>{t.shortcutsText}</p>
      <h2>{t.data}</h2>
      <Select
        label={t.autoLock}
        value={String(settings.lockMinutes)}
        onChange={(value) =>
          void update({ ...settings, lockMinutes: Number(value) as Settings['lockMinutes'] })
        }
        options={([1, 5, 15, 60, 1440, 0] as const).map((value) => ({
          value: String(value),
          label: t.lockChoices[value],
        }))}
      />
      {(!settings.privateLogging || !vault.unlocked) && (
        <Button onClick={() => setHistory(true)}>{t.redesign.enableHistory}</Button>
      )}
      <HistoryDialog
        vault={vault}
        settings={settings}
        update={update}
        open={history}
        onOpenChange={setHistory}
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
      <Button className="danger" onClick={() => setDeleting(true)}>
        {t.wipe}
      </Button>
      {deleting && (
        <section className="notice">
          <p>{t.wipeWarning}</p>
          <Toggle label={t.wipeAck} checked={ack} onChange={setAck} />
          <Button
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
          </Button>
          <Button onClick={() => setDeleting(false)}>{t.cancel}</Button>
        </section>
      )}
      <p role="alert">{error}</p>
      <p className="muted">{t.version}</p>
    </>
  );
}
