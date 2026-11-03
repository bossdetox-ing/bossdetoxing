import { useCallback, useEffect, useRef, useState } from 'react';
import { defaults, loadSettings, saveSettings, type Settings } from '../browser/settings';
import { messages as t } from '../content';
import { Vault } from '../vault/service';
import { PageTitle, Sigil } from './components';
import { Home, Shield, Reply, Serious } from './views/Support';
import { TaskShield } from './views/TaskShield';
import { Grimoire, Closure } from './views/Grimoire';
import { Explore, Bestiary, Tarot, Bingo, Focus } from './views/Explore';
import { Onboarding, Preferences } from './views/Preferences';
export type Route =
  | 'home'
  | 'shield'
  | 'reply'
  | 'task'
  | 'diary'
  | 'closure'
  | 'explore'
  | 'bestiary'
  | 'tarot'
  | 'bingo'
  | 'focus'
  | 'settings'
  | 'serious'
  | 'blank';
export type Navigate = (route: Route) => void;

export function App() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [ready, setReady] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const [route, setRoute] = useState<Route>('home');
  const [serious, setSerious] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [vault] = useState(() => new Vault());
  const lastActivity = useRef(Date.now());
  const mainRef = useRef<HTMLElement>(null);
  const settingsRevision = useRef(0);
  const blank = useCallback(() => {
    vault.lock();
    setGeneration((n) => n + 1);
    setSerious(false);
    setRoute('blank');
  }, [vault]);
  const panic = useCallback(() => {
    blank();
    if (typeof chrome !== 'undefined')
      void chrome.runtime.sendMessage({ type: 'safe-blank' }).catch(() => undefined);
  }, [blank]);
  const lock = useCallback(() => {
    vault.lock();
    setGeneration((n) => n + 1);
    if (typeof chrome !== 'undefined')
      void chrome.runtime.sendMessage({ type: 'safe-blank' }).catch(() => undefined);
  }, [vault]);
  useEffect(() => {
    let live = true;
    void loadSettings()
      .then((value) => {
        if (live) {
          setSettings(value);
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
  }, [vault]);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.dataset.motion = settings.reducedMotion ? 'reduce' : 'system';
  }, [settings]);
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
    if (globalThis.chrome?.runtime?.onMessage) chrome.runtime.onMessage.addListener(message);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('pointerdown', activity);
      document.removeEventListener('keydown', activity);
      document.removeEventListener('keydown', key);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', blank);
      if (globalThis.chrome?.runtime?.onMessage) chrome.runtime.onMessage.removeListener(message);
    };
  }, [blank, panic, vault, settings.lockMinutes]);
  useEffect(() => {
    const target = mainRef.current?.querySelector<HTMLElement>('h1') ?? mainRef.current;
    target?.focus();
    window.scrollTo(0, 0);
  }, [route]);
  async function updateSettings(next: Settings) {
    const revision = ++settingsRevision.current;
    const previous = settings;
    setSettings(next);
    setSettingsError(false);
    try {
      await saveSettings(next);
    } catch {
      if (revision === settingsRevision.current) {
        setSettings(previous);
        setSettingsError(true);
      }
    }
  }
  function navigate(next: Route) {
    if (next === 'serious') setSerious(true);
    if ((serious || !settings.humor || settings.quiet) && (next === 'tarot' || next === 'bingo'))
      return;
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
        <PageTitle>{t.notes}</PageTitle>
        <button onClick={() => setRoute('home')}>{t.resume}</button>
      </main>
    );
  const common = { navigate, settings };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t.home}
      </a>
      <header className="topbar">
        <button className="wordmark" onClick={() => navigate('home')} aria-label={t.home}>
          <Sigil />
          {settings.quiet ? t.notes : t.brand}
        </button>
        <button className="blank-button" onClick={panic}>
          {t.blank}
          <kbd>Esc</kbd>
        </button>
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
            {route !== 'home' && (
              <button className="back" onClick={() => navigate('home')}>
                ← {t.home}
              </button>
            )}
            {route === 'home' && <Home {...common} serious={serious} />}
            {route === 'shield' && <Shield {...common} serious={serious} />}
            {route === 'reply' && <Reply {...common} />}
            {route === 'task' && <TaskShield vault={vault} navigate={navigate} />}
            {route === 'diary' && <Grimoire vault={vault} lock={lock} />}
            {route === 'closure' && <Closure vault={vault} navigate={navigate} />}
            {route === 'explore' && <Explore {...common} serious={serious} />}
            {route === 'bestiary' && <Bestiary navigate={navigate} />}
            {route === 'tarot' && !serious && settings.humor && !settings.quiet && (
              <Tarot navigate={navigate} />
            )}
            {route === 'bingo' && !serious && settings.humor && !settings.quiet && (
              <Bingo navigate={navigate} />
            )}
            {route === 'focus' && <Focus />}
            {route === 'settings' && (
              <Preferences
                settings={settings}
                update={updateSettings}
                vault={vault}
                reset={async () => {
                  await vault.wipe();
                  if (globalThis.chrome?.storage?.local) await chrome.storage.local.clear();
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
            <button
              aria-current={route === 'home' ? 'page' : undefined}
              onClick={() => navigate('home')}
            >
              {t.home}
            </button>
            <button
              aria-current={route === 'explore' ? 'page' : undefined}
              onClick={() => navigate('explore')}
            >
              {t.explore}
            </button>
            <button
              aria-current={route === 'settings' ? 'page' : undefined}
              onClick={() => navigate('settings')}
            >
              {t.settings}
            </button>
          </nav>
          <footer>
            <p>{t.local}</p>
            <button className="text-button" onClick={() => navigate('serious')}>
              {t.support}
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
