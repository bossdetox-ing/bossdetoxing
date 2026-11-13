import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()], build: { modulePreload: { polyfill: false } } }),
  manifest: ({ browser }) => ({
    name: 'bossdetox.ing',
    description:
      'A private workplace companion for calm, clarity and professional responses. Free. Local. No AI.',
    version: '1.3.3',
    ...(browser === 'firefox'
      ? {
          // Firefox shows the side panel as its sidebar (WXT maps it) and needs a fixed ID.
          // Nothing leaves the device, so the data consent screen says so.
          permissions: ['storage'],
          browser_specific_settings: {
            gecko: {
              id: 'extension@bossdetox.ing',
              strict_min_version: '142.0',
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : { minimum_chrome_version: '116', permissions: ['sidePanel', 'storage'] }),
    host_permissions: [],
    action: {
      default_title: 'Open desk',
      default_icon: {
        16: 'disguise/png/search-light-16.png',
        32: 'disguise/png/search-light-32.png',
      },
    },
    icons: {
      16: 'icons/logo16.png',
      32: 'icons/logo32.png',
      48: 'icons/logo48.png',
      128: 'icons/logo128.png',
    },
    commands: {
      _execute_action: { suggested_key: { default: 'Alt+Shift+O' } },
      'blank-panel': {
        suggested_key: { default: 'Alt+Shift+X' },
        description: 'Blank bossdetox.ing and lock saved history',
      },
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'none'; connect-src 'none'; img-src 'self' data:; style-src 'self'; base-uri 'none'; form-action 'none'",
    },
  }),
});
