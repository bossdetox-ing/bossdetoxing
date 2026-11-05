import { broadcastBlank, clearPublic, isExtension } from '../browser/platform';
import { clearReplyHistory } from '../domain/replies';
import { Daily } from './views/Daily';
import { chooseHeading, headingText } from '../domain/headings';
import { disguiseTitle } from '../domain/disguise';
import { BrandLogo } from './BrandLogo';
import { randomLogo } from '../domain/logo';
import { Button } from '../components/ui/button';
import { useCallback, useEffect, useRef, useState } from 'react';
import { defaults, loadSettings, saveSettings, type Settings } from '../browser/settings';
import { messages as t } from '../content';
import { Vault } from '../vault/service';
import { CompanionContext, CompanionStore } from './companion-store';
import { PainHome, ProtectionCard, Icon } from './views/Protection';
import { PrivateCalendar } from './views/Calendar';
import { PageTitle } from './components';
import { Tarot } from './views/Explore';
import { Onboarding, Preferences } from './views/Preferences';
export type Route =
  'home' | 'situations' | 'protection' | 'calendar' | 'tarot' | 'settings' | 'blank';
export type Navigate = (route: Route) => void;

export function App() {
  const [logoId, setLogoId] = useState(() => randomLogo());
  const [headlineId, setHeadlineId] = useState(() => chooseHeading(true, true));
  const [settings, setSettings] = useState<Settings>(defaults);
  const [ready, setReady] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const [route, setRoute] = useState<Route>('home');
  const [generation, setGeneration] = useState(0);
  const [vault] = useState(() => new Vault());
  const [companion] = useState(() => new CompanionStore(vault));
  const lastActivity = useRef(Date.now());
  const mainRef = useRef<HTMLElement>(null);
  const settingsRevision = useRef(0);
  const blank = useCallback(() => {
    vault.lock();
    companion.clear();
    clearReplyHistory();
    setGeneration((n) => n + 1);
    setRoute('blank');
  }, [vault, companion]);
  const panic = useCallback(() => {
    blank();
    broadcastBlank();
  }, [blank]);
  useEffect(() => {
    let live = true;
    void loadSettings()
      .then((value) => {
        if (live) {
          companion.configure(value.privateLogging, true, false);
          setSettings(value);
          setHeadlineId(chooseHeading(true, value.strongLanguage));
          setReady(true);
        }
      })
      .catch(() => {
        if (live) {
          setReady(true);
          setSettingsError(true);
        }
      });
    return () => {
      live = false;
      vault.lock();
    };
  }, [vault, companion]);
  useEffect(() => {
    companion.configure(settings.privateLogging, true, false);
  }, [companion, settings.privateLogging]);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings]);
  useEffect(() => {
    if (!ready) return;
    document.title = disguiseTitle(settings.icon);
    if (!isExtension()) {
      const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (link) link.href = `/disguise/${settings.icon}.svg`;
      return;
    }
    // The toolbar icon follows the browser's light/dark chrome; remember it for startup.
    const media = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      const scheme = media.matches ? 'dark' : 'light';
      if (scheme === settings.toolbarScheme) return;
      void updateSettings({ ...settings, toolbarScheme: scheme });
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, settings.icon, settings.toolbarScheme]);
  useEffect(() => {
    const activity = () => {
      lastActivity.current = Date.now();
    };
    const key = (event: KeyboardEvent) => {
      // Escape closes an open popover, dropdown or card first; only a bare Escape hides and locks.
      const layer = document.querySelector(
        '[data-radix-popper-content-wrapper], [role="dialog"][data-state="open"]',
      );
      if (event.key === 'Escape' && !layer) panic();
    };
    const message = (message: unknown) => {
      if (
        typeof message === 'object' &&
        message &&
        'type' in message &&
        message.type === 'safe-blank'
      )
        blank();
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden') blank();
    };
    const interval = window.setInterval(() => {
      if (
        settings.lockMinutes &&
        vault.unlocked &&
        Date.now() - lastActivity.current >= settings.lockMinutes * 60_000
      )
        blank();
    }, 1000);
    document.addEventListener('pointerdown', activity);
    document.addEventListener('keydown', activity);
    document.addEventListener('keydown', key);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', blank);
    if (isExtension()) chrome.runtime.onMessage.addListener(message);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('pointerdown', activity);
      document.removeEventListener('keydown', activity);
      document.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', blank);
      if (isExtension()) chrome.runtime.onMessage.removeListener(message);
    };
  }, [blank, panic, vault, settings.lockMinutes]);
  // "D" flips light and dark from whatever is showing now; typing and shortcuts are left alone.
  const toggleTheme = useRef(() => {});
  toggleTheme.current = () => {
    const dark =
      settings.theme === 'system'
        ? matchMedia('(prefers-color-scheme: dark)').matches
        : settings.theme === 'dark';
    void updateSettings({ ...settings, theme: dark ? 'light' : 'dark' });
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'd' || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]'))
        return;
      toggleTheme.current();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    const target = mainRef.current?.querySelector<HTMLElement>('h1') ?? mainRef.current;
    target?.focus();
    mainRef.current?.scrollTo(0, 0);
  }, [route]);
  async function updateSettings(next: Settings) {
    const revision = ++settingsRevision.current;
    const previous = settings;
    setSettings(next);
    companion.configure(next.privateLogging, true, false);
    setSettingsError(false);
    try {
      await saveSettings(next);
    } catch {
      if (revision === settingsRevision.current) {
        setSettings(previous);
        companion.configure(previous.privateLogging, true, false);
        setSettingsError(true);
      }
    }
  }
  function navigate(next: Route) {
    setLogoId((current) => randomLogo(current));
    if (next === 'situations')
      setHeadlineId((current) => chooseHeading(true, settings.strongLanguage, current));
    setRoute(next);
  }
  if (!ready)
    return (
      <main>
        <p role="status">{t.busy}</p>
      </main>
    );
  if (route === 'blank')
    return (
      <main className="blank">
        <PageTitle>{t.neutralTitle}</PageTitle>
        <Button onClick={() => navigate('home')}>{t.resume}</Button>
      </main>
    );
  return (
    <CompanionContext.Provider value={companion}>
      <div className="app-shell">
        <a className="skip-link" href="#main">
          {t.home}
        </a>
        <header className="topbar">
          <Button className="wordmark" onClick={() => navigate('home')} aria-label={t.home}>
            <BrandLogo index={logoId} />
          </Button>
          <div className="header-actions">
            <Button
              className="icon-button"
              aria-label={t.redesign.openCalendar}
              onClick={() => navigate('calendar')}
            >
              <Icon name="calendar" />
            </Button>
            <Button
              className="icon-button"
              aria-label={t.settings}
              aria-current={route === 'settings' ? 'page' : undefined}
              onClick={() => navigate('settings')}
            >
              <Icon name="settings" />
            </Button>
            <Button className="icon-button" aria-label={t.blank} title={t.blank} onClick={panic}>
              <Icon name="blank" />
            </Button>
          </div>
        </header>
        <main ref={mainRef} id="main" tabIndex={-1} key={`${generation}-${route}`}>
          {settingsError && (
            <p role="alert" className="notice">
              {t.settingsError}
            </p>
          )}
          {!settings.onboarded ? (
            <Onboarding settings={settings} update={updateSettings} />
          ) : (
            <>
              {route === 'situations' && (
                <PainHome
                  navigate={navigate}
                  strongLanguage={settings.strongLanguage}
                  title={headingText(
                    headlineId,
                    settings.bossPronouns,
                    true,
                    settings.strongLanguage,
                    settings.bossName,
                  )}
                />
              )}
              {route === 'home' && (
                <Daily
                  navigate={navigate}
                  strongLanguage={settings.strongLanguage}
                  timeZone={settings.timeZone}
                  bossName={settings.bossName}
                />
              )}
              {route === 'protection' && (
                <ProtectionCard
                  navigate={navigate}
                  defaultTone={settings.tone}
                  vault={vault}
                  settings={settings}
                  update={updateSettings}
                />
              )}
              {route === 'calendar' && (
                <PrivateCalendar vault={vault} settings={settings} update={updateSettings} />
              )}
              {route === 'tarot' && <Tarot />}
              {route === 'settings' && (
                <Preferences
                  settings={settings}
                  update={updateSettings}
                  vault={vault}
                  reset={async () => {
                    await vault.wipe();
                    await clearPublic();
                    await updateSettings(defaults);
                    panic();
                    setRoute('home');
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>
    </CompanionContext.Provider>
  );
}
