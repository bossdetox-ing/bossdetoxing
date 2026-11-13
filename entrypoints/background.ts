import { dailyCard } from '../src/domain/daily';
import { defineBackground } from 'wxt/utils/define-background';
import { settingsSchema, toolbarIconPath } from '../src/browser/settings';
import { disguiseTitle } from '../src/domain/disguise';

// Firefox only: its sidebar API, which Chrome lacks.
const sidebar = (globalThis as { browser?: { sidebarAction?: { toggle(): Promise<void> } } })
  .browser?.sidebarAction;

export default defineBackground(() => {
  let dailyQueue = Promise.resolve();
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (
      message?.type !== 'daily-card' ||
      sender.id !== chrome.runtime.id ||
      typeof message.day !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(message.day)
    )
      return;
    dailyQueue = dailyQueue
      .then(async () => {
        const stored = await chrome.storage.local.get('dailyCard');
        const card = dailyCard(stored.dailyCard, message.day);
        if (JSON.stringify(card) !== JSON.stringify(stored.dailyCard))
          await chrome.storage.local.set({ dailyCard: card });
        reply({ ok: true, card });
      })
      .catch(() => reply({ ok: false }));
    return true;
  });
  const configure = () => {
    void chrome.storage.local
      .get('preferences')
      .then(({ preferences }) => {
        const saved = settingsSchema.safeParse(preferences ?? {});
        if (saved.success)
          return Promise.all([
            chrome.action.setIcon({
              path: toolbarIconPath(saved.data.icon, saved.data.toolbarScheme),
            }),
            chrome.action.setTitle({ title: disguiseTitle(saved.data.icon) }),
          ]);
      })
      .catch(() => undefined);
    // The side panel is home. Browsers without Chrome's side panel API (Opera, Arc) open the same
    // app as a toolbar popup instead, so the icon never does nothing. Firefox toggles its sidebar.
    const usePopup = () =>
      chrome.action.setPopup({ popup: 'sidepanel.html?surface=popup' }).catch(() => undefined);
    const panel = chrome.sidePanel as typeof chrome.sidePanel | undefined;
    if (sidebar) return;
    if (panel?.setPanelBehavior)
      void panel.setPanelBehavior({ openPanelOnActionClick: true }).catch(usePopup);
    else void usePopup();
  };
  if (sidebar) chrome.action.onClicked.addListener(() => void sidebar.toggle());
  configure();
  chrome.runtime.onInstalled.addListener(configure);
  chrome.runtime.onStartup.addListener(configure);
  // A new icon in Settings applies to the toolbar straight away, title included.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && 'preferences' in changes) configure();
  });
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'blank-panel')
      void chrome.runtime.sendMessage({ type: 'safe-blank' }).catch(() => undefined);
  });
});
