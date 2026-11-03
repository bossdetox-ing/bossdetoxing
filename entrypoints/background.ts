import { defineBackground } from 'wxt/utils/define-background';

export default defineBackground(() => {
  const configure = () => {
    void chrome.storage.local
      .get('preferences')
      .then(({ preferences }) => {
        const icon =
          preferences && typeof preferences === 'object' && 'icon' in preferences
            ? preferences.icon
            : undefined;
        if (icon === 'search' || icon === 'notes' || icon === 'sigil')
          return chrome.action.setIcon({
            path: Object.fromEntries(
              [16, 32, 48, 128].map((size) => [size, `icons/${icon}${size}.png`]),
            ),
          });
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
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'blank-panel')
      void chrome.runtime.sendMessage({ type: 'safe-blank' }).catch(() => undefined);
  });
});
