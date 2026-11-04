import { dailyCard } from '../src/domain/daily';
import { defineBackground } from 'wxt/utils/define-background';
import { settingsSchema, toolbarIconPath } from '../src/browser/settings';
import { disguiseTitle } from '../src/domain/disguise';

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
    void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
      void chrome.action.setTitle({
        title: 'Open Chrome’s side panel and choose bossdetox.ing (Chrome 116+ required)',
      });
    });
  };
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
