import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'bossdetox.ing',
    description: 'A private workplace companion for calm, clarity and professional responses. Free. Local. No AI.',
    version: '1.0.0',
    minimum_chrome_version: '116',
    permissions: ['sidePanel', 'storage'],
    host_permissions: [],
    action: {
      default_title: 'Open notes',
      default_icon: { 16: 'icons/search16.png', 32: 'icons/search32.png' },
    },
    icons: { 16: 'icons/sigil16.png', 48: 'icons/sigil48.png', 128: 'icons/sigil128.png' },
    commands: {
      '_execute_action': { suggested_key: { default: 'Alt+Shift+O' } },
      'blank-panel': { suggested_key: { default: 'Alt+Shift+X' }, description: 'Blank bossdetox.ing and lock saved notes' },
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'none'; connect-src 'none'; img-src 'self' data:; style-src 'self'; base-uri 'none'; form-action 'none'",
    },
  },
});
