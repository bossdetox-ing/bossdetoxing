<p align="center">
  <img src="docs/readme/logo.png" alt="bossdetox.ing logo" width="120" height="120" />
</p>

<h1 align="center">bossdetox.ing</h1>

<p align="center"><strong>Keep your soul. Keep your paycheck.</strong></p>

<p align="center">
  A free pocket ward for toxic-boss days: what to say, what to send, a daily tarot pull and your boss's horoscope.<br />
  Works offline. Tells no one. No accounts, no AI, no ads, no tracking.
</p>

<p align="center">
  <a href="https://ass.bossdetox.ing"><strong>Open the app</strong></a> ·
  <a href="https://github.com/demetriusk/bossdetoxing/releases/latest"><strong>Download the extension</strong></a> ·
  <a href="https://bossdetox.ing">Website</a>
</p>

<p align="center">
  <img src="docs/readme/demo.gif" alt="Demo: the sky forecast, the daily tarot card, the threat grid, a threat with lines to say and write, and the encrypted Grimoire." width="640" />
</p>

## What's inside

- **Name the threat.** Twenty classics, from the moving goalpost to the meeting about the meeting. Tap one and get a line to say out loud and a line to write in the email.
- **Pick your rock.** Yellow Rock is warm. Grey Rock is boring on purpose. Firm Rock says no, politely.
- **Pull a card.** One card a day from a 78-card corporate deck: famous paintings turned stickers, each with a mantra and one next step for the actual job.
- **Your boss's horoscope.** The real moon, Mercury and planets, calculated on your device. The boss forecast is for fun. Get it in writing anyway.
- **The Grimoire keeps receipts.** A private calendar of what happened and when, locked with your passphrase. One tap on the eye hides everything.

## Install

You have two options. Pick one, or use both.

### Option 1: the app (phone or computer, nothing to install)

1. Open **[ass.bossdetox.ing](https://ass.bossdetox.ing)** in your browser.
2. That's it. After the first visit it works offline too.
3. Optional, for an icon on your home screen:
   - **iPhone (Safari):** tap the Share button, then **Add to Home Screen**.
   - **Android (Chrome):** tap the ⋮ menu, then **Add to Home screen** or **Install app**.
   - **Computer (Chrome or Edge):** click the install icon at the right end of the address bar.

### Option 2: the browser extension (opens in a side panel next to your work)

You need **Google Chrome**, version 116 or newer. It takes about 2 minutes.

1. **Download the ZIP.** Go to the [latest release](https://github.com/demetriusk/bossdetoxing/releases/latest) and click **`bossdetox-ing-1.1.0-chrome.zip`** under **Assets**.
2. **Unzip it.**
   - **Mac:** double-click the ZIP in Downloads. A folder appears next to it.
   - **Windows:** right-click the ZIP, choose **Extract All…**, then **Extract**.
   - Move that folder somewhere you won't tidy away by accident, like Documents. Chrome loads the extension from this folder, so don't delete it later.
3. **Open the extensions page.** In Chrome, type `chrome://extensions` in the address bar and press Enter.
4. **Turn on Developer mode.** Flip the **Developer mode** switch in the top-right corner. Three new buttons appear.
5. **Load it.** Click **Load unpacked** and choose the folder you unzipped. Pick the folder that has `manifest.json` directly inside it.
6. **Pin it.** Click the puzzle-piece icon in Chrome's toolbar and click the pin next to **bossdetox.ing**. Its toolbar icon is a plain magnifying glass, on purpose.
7. **Open it.** Click the magnifying glass, or press **Alt+Shift+O** (**Option+Shift+O** on a Mac). The side panel opens.

**If something goes wrong:**

| What you see                                 | What to do                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| "Manifest file is missing or unreadable"     | You picked the wrong folder. Open the unzipped folder: if there's another folder inside it, choose that inner one.    |
| No Developer mode switch, or it's greyed out | Your company manages this Chrome profile and blocks extensions. Use the app from Option 1 instead, on your own phone. |
| A "Disable developer mode extensions" popup  | Chrome may show this for extensions installed this way. Close it; don't click **Disable**.                            |
| The extension disappeared                    | The folder was moved or deleted. Put it back, or repeat steps 1 to 5.                                                 |

**Updating:** download the new ZIP from the [latest release](https://github.com/demetriusk/bossdetoxing/releases/latest) and unzip it. Delete everything inside your old extension folder, copy the new files into that same folder, then click the ↻ reload arrow on the bossdetox.ing card at `chrome://extensions`. Keep the same folder: Chrome treats a different folder as a brand-new install, with empty history.

## Privacy, in plain words

- The extension makes zero network requests. The app only downloads itself and its updates. Nothing you tap or type is sent anywhere.
- History is optional, encrypted with your passphrase and stored only in your browser. No account, no cloud, no recovery: lose the passphrase, lose the history.
- **The limits are real.** A work laptop, monitoring software, screen sharing, screenshots or clipboard history can still show what's on your screen. The eye button hides everything in one tap, but nothing makes you invisible on a managed device.

Details: [PRIVACY.md](docs/PRIVACY.md) · [SECURITY_THREAT_MODEL.md](docs/SECURITY_THREAT_MODEL.md)

**This is a coping tool for a bad day at work, not therapy or legal advice.** If you're dealing with threats, harassment or danger, go to [Support without jokes](https://bossdetox.ing/support/).

## For developers

The extension (WXT, Chrome MV3), the PWA (`pwa/`, Vite) and the shared React app (`src/`) live in this repo, along with the Astro/EmDash marketing site (`website/`). Use Node **22.23.4 or later**.

```sh
npm ci
npm run dev          # extension dev build (development only)
npm test             # unit tests
npm run test:e2e     # typecheck, production build, privacy audit, extension browser tests
npm run package      # loadable ZIP in release/ with SHA-256 checksums
```

Run `npx playwright install chromium` once before the browser tests. The PWA and the site:

```sh
npm run build:web                 # PWA into pwa/dist
node scripts/site-assets.mjs      # shared art, fonts and notices into website/public
npm ci --prefix website
npm run --prefix website build
npm run test:web                  # PWA and site browser tests, including axe
```

| Area                                                      | Location                        |
| --------------------------------------------------------- | ------------------------------- |
| Browser action, service worker, MV3 policy                | `entrypoints/`, `wxt.config.ts` |
| Screens and components                                    | `src/app/`, `src/components/`   |
| Deterministic selection, content contracts, session logic | `src/domain/`                   |
| Copy, mantras, tarot and threats                          | `src/content/`                  |
| PBKDF2/AES-GCM vault, encrypted archives                  | `src/vault/`                    |
| Tokens and styles                                         | `src/styles/`                   |
| Tests                                                     | `tests/`                        |

Live state: [CURRENT.md](docs/CURRENT.md). Deployment: [WEB_DEPLOYMENT.md](docs/WEB_DEPLOYMENT.md). Release gates: [RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md). Localization: [LOCALIZATION.md](docs/LOCALIZATION.md).

## License

Code is [MIT](LICENSE). Tarot art comes from public-domain paintings via Wikimedia Commons; fonts and other third-party pieces keep their own licences, listed in [LICENSES.md](docs/LICENSES.md).
