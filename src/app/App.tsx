import { broadcastBlank, clearPublic, isExtension } from '../browser/platform';
import { clearReplyHistory } from '../domain/replies';
import { Daily } from './views/Daily';
import { clearCopyHistory } from './useViewCopy';
import { chooseHeading, headingText } from '../domain/headings';
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
import { Home, Shield, Reply, Serious } from './views/Support';
import { Closure } from './views/Closure';
import { Explore, Bestiary, Tarot, Bingo } from './views/Explore';
import { Onboarding, Preferences } from './views/Preferences';
export type Route =
  | 'home'
  | 'situations'
  | 'tools'
  | 'protection'
  | 'calendar'
  | 'shield'
  | 'reply'
  | 'closure'
  | 'explore'
  | 'bestiary'
  | 'tarot'
  | 'bingo'
  | 'settings'
  | 'serious'
  | 'blank';
export type Navigate = (route: Route) => void;

export function App() {
  const [logoId, setLogoId] = useState(() => randomLogo());
  const [headlineId, setHeadlineId] = useState(() => chooseHeading(true, true));
  const [settings, setSettings] = useState<Settings>(defaults);
  const [ready, setReady] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const [route, setRoute] = useState<Route>('home');
  const [serious, setSerious] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [vault] = useState(() => new Vault());
  const [companion] = useState(() => new CompanionStore(vault));
  const lastActivity = useRef(Date.now());
  const mainRef = useRef<HTMLElement>(null);
  const settingsRevision = useRef(0);
  const blank = useCallback(() => {
    vault.lock();
    companion.clear();
    clearCopyHistory();
    clearReplyHistory();
    setGeneration((n) => n + 1);
    setSerious(false);
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
          companion.configure(value.privateLogging, value.humor && !value.quiet, false);
          setSettings(value);
          setHeadlineId(chooseHeading(value.humor && !value.quiet, value.strongLanguage));
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
    companion.configure(settings.privateLogging, settings.humor && !settings.quiet, serious);
  }, [companion, settings.privateLogging, settings.humor, settings.quiet, serious]);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.motion = settings.reducedMotion ? 'reduce' : 'system';
  }, [settings]);
  useEffect(() => {
    if (!ready) return;
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
      if (event.key === 'Escape') panic();
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
      if (vault.unlocked && Date.now() - lastActivity.current >= settings.lockMinutes * 60_000)
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
  useEffect(() => {
    const target = mainRef.current?.querySelector<HTMLElement>('h1') ?? mainRef.current;
    target?.focus();
    mainRef.current?.scrollTo(0, 0);
  }, [route]);
  async function updateSettings(next: Settings) {
    const revision = ++settingsRevision.current;
    const previous = settings;
    setSettings(next);
    companion.configure(next.privateLogging, next.humor && !next.quiet, serious);
    setSettingsError(false);
    try {
      await saveSettings(next);
    } catch {
      if (revision === settingsRevision.current) {
        setSettings(previous);
        companion.configure(previous.privateLogging, previous.humor && !previous.quiet, serious);
        setSettingsError(true);
      }
    }
  }
  function navigate(next: Route) {
    if (next === 'serious') setSerious(true);
    if ((serious || !settings.humor || settings.quiet) && (next === 'tarot' || next === 'bingo'))
      return;
    if (next === 'shield')
      companion.loose('shield', { situationId: undefined, purpose: 'grounding' });
    if (next === 'reply')
      companion.loose('reply:vague_accusation', { situationId: 'vague_accusation' });
    setLogoId((current) => randomLogo(current));
    if (next === 'situations')
      setHeadlineId((current) =>
        chooseHeading(
          settings.humor && !settings.quiet && !serious,
          settings.strongLanguage,
          current,
        ),
      );
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
  const common = { navigate, settings };
  return (
    <CompanionContext.Provider value={companion}>
      <div className="app-shell">
        <a className="skip-link" href="#main">
          {t.home}
        </a>
        <header className="topbar">
          <Button className="wordmark" onClick={() => navigate('home')} aria-label={t.home}>
            <BrandLogo index={logoId} />
            {settings.quiet ? t.neutralTitle : t.brand}
          </Button>
          <div className="header-actions">
            <Button
              className="icon-button"
              aria-label={t.redesign.openCalendar}
              onClick={() => navigate('calendar')}
            >
              <Icon name="calendar" />
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
            <Onboarding settings={settings} update={updateSettings} logoId={logoId} />
          ) : (
            <>
              {(route === 'situations' ||
                (route === 'home' && (!settings.humor || settings.quiet || serious))) && (
                <PainHome
                  navigate={navigate}
                  title={headingText(
                    headlineId,
                    settings.bossPronouns,
                    settings.humor && !settings.quiet && !serious,
                    settings.strongLanguage,
                  )}
                />
              )}
              {route === 'home' && settings.humor && !settings.quiet && !serious && (
                <Daily
                  navigate={navigate}
                  strongLanguage={settings.strongLanguage}
                  timeZone={settings.timeZone}
                />
              )}
              {route === 'tools' && <Home {...common} serious={serious} />}
              {route === 'protection' && (
                <ProtectionCard
                  navigate={navigate}
                  defaultTone={settings.tone}
                  humorAllowed={settings.humor && !settings.quiet && !serious}
                />
              )}
              {route === 'calendar' && (
                <PrivateCalendar vault={vault} settings={settings} update={updateSettings} />
              )}
              {route === 'shield' && <Shield {...common} serious={serious} />}
              {route === 'reply' && <Reply {...common} serious={serious} />}
              {route === 'closure' && <Closure navigate={navigate} />}
              {route === 'explore' && <Explore {...common} serious={serious} />}
              {route === 'bestiary' && <Bestiary navigate={navigate} />}
              {route === 'tarot' && !serious && settings.humor && !settings.quiet && (
                <Tarot navigate={navigate} />
              )}
              {route === 'bingo' && !serious && settings.humor && !settings.quiet && (
                <Bingo navigate={navigate} />
              )}
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
              {route === 'serious' && (
                <Serious
                  leave={() => {
                    setSerious(false);
                    navigate('home');
                  }}
                />
              )}
            </>
          )}
        </main>
        {settings.onboarded && (
          <>
            <nav className="bottom-nav" aria-label={t.explore}>
              <Button
                aria-current={route === 'home' || route === 'situations' ? 'page' : undefined}
                onClick={() => navigate('home')}
              >
                <Icon name="home" />
                <span>{t.home}</span>
              </Button>
              <Button
                aria-current={route === 'tools' ? 'page' : undefined}
                onClick={() => navigate('tools')}
              >
                <Icon name="tools" />
                <span>{t.redesign.tools}</span>
              </Button>
              <Button
                aria-current={route === 'explore' ? 'page' : undefined}
                onClick={() => navigate('explore')}
              >
                <Icon name="explore" />
                <span>{t.explore}</span>
              </Button>
              <Button
                aria-current={route === 'settings' ? 'page' : undefined}
                onClick={() => navigate('settings')}
              >
                <Icon name="settings" />
                <span>{t.settings}</span>
              </Button>
            </nav>
          </>
        )}
      </div>
    </CompanionContext.Provider>
  );
}
