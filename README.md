# bossdetox.ing

A free, local-first Chrome side-panel companion for calm, professional responses, private mantras, Tarot and Bingo. No accounts, AI, backend, tracking, recording, automatic website access or runtime network services.

## Install the production extension

1. Extract `release/bossdetox-ing-1.0.0-chrome.zip` into an ordinary folder.
2. In Chrome 116 or later, enter `chrome://extensions` and enable Developer mode.
3. Choose **Load unpacked** and select the extracted folder containing `manifest.json`. Source builds use `.output/chrome-mv3`.
4. Pin the original Search-style toolbar icon. Click it to open the side panel.
5. Read the privacy disclosure and select **Open my tools**. The daily Tarot card opens first. Choose **Deal with my boss**, then tap a situation for a private charm and professional sentence.

No browser is opened automatically by these instructions or the dev command. Chrome may prevent installation on managed profiles. The neutral icon is a discretion choice; the extension identity remains visible in Chrome.

## Develop and verify

Use Node **22.23.4 or later** and npm. Dependency versions are locked in `package-lock.json`. Network access is needed to install tooling, never to use the built extension.

```sh
npm ci
npm run dev
```

The dev server is for development only and WXT may add reload permissions/connections. Use a **production build** for privacy audits and private use.

```sh
npm run validate:content
npm run typecheck
npm run lint
npm test
npm run build
npm run audit:build
```

To run the extension browser tests, install Playwright's development browser once:

```sh
npx playwright install chromium
npm run test:e2e
```

An existing compatible Chrome for Testing executable can instead be supplied with the `PLAYWRIGHT_CHROMIUM_EXECUTABLE` environment variable. Tests run headlessly against the real production extension, not a web mock. Clipboard assertions intercept write calls; tests never read the system clipboard. Source/help links are the only intentional external navigations.

```sh
npm run format
npm run package
```

Packaging typechecks, rebuilds and audits the extension, then produces the loadable ZIP in `release/` with SHA-256 checksums. `npm ci` plus the lockfile reproduces dependencies; the ZIP script uses sorted file order and fixed archive timestamps. Browser tests always typecheck, rebuild and audit before loading the extension.

## Product and code map

The binding feature/privacy scope is [BOSSDETOX_V1_FULL_SPEC.md](BOSSDETOX_ING_V1_HANDOFF/BOSSDETOX_V1_FULL_SPEC.md). The supplied [v1.1 redesign brief](BOSSDETOX_REDESIGN_FILES/BOSSDETOX_VISUAL_UX_BRIEF.md) supersedes its visual hierarchy. The owner’s newer WordArt/ASCII/color references supersede that brief’s restrained visual palette; see [current interface captures](docs/UX_REVISION.md). [REDESIGN_PLAN.md](docs/REDESIGN_PLAN.md) records the component and state architecture. Older `The Ward` documents are reference material and never override the current name, privacy decisions or full v1 scope. DOCX copies are for reading; Markdown wins conflicts.

| Area                                                            | Location                        |
| --------------------------------------------------------------- | ------------------------------- |
| Browser action, service worker, MV3 policy                      | `entrypoints/`, `wxt.config.ts` |
| UI, Quick/Deep support and feature screens                      | `src/app/`                      |
| Deterministic selection, content contracts, session logic       | `src/domain/`                   |
| English dictionary, original practices, safety edits            | `src/content/`                  |
| PBKDF2/AES-GCM, authenticated archives, atomic IndexedDB writes | `src/vault/`                    |
| Non-sensitive preferences                                       | `src/browser/settings.ts`       |
| Semantic color/spacing tokens and responsive CSS                | `src/styles/`                   |
| Unit/security and extension tests                               | `tests/`                        |

## Languages

Multilingual support is a recorded product requirement. English is the initial pack. Interface strings are externalized, nested copy can fall back to English through `resolveLocale`, structured content uses stable IDs and runtime schemas, and dates use `Intl`. Read [LOCALIZATION.md](docs/LOCALIZATION.md) before adding a language. Additional translations are not shipped yet.

## Private history

Note-taking has been removed at the owner's request: no incident diary, task-notes/brief workflow, closure writing, calendar annotations or add-facts form. Response editing and custom Bingo squares remain. Focus was also explicitly removed. These decisions supersede the corresponding original v1 requirements.

Pain taps create session-only calendar events with a selected mantra; Done records a planned response, never a sent message. Optional encrypted history saves these events, favorites and recent-mantra IDs only after consent and while the vault is unlocked. Enable it from the calendar. Mantras stay pinned until an explicit new selection or reroll.

New exports use archive version 2 and still accept authenticated version 1 backups. Existing encrypted incident/task records and legacy calendar annotations are preserved for backup compatibility, but have no reading, creation or editing screen. Removing a feature does not erase existing user data. Export an encrypted backup or deliberately delete all local data in Settings. There is no account, passphrase recovery or cloud sync.

**Hide & lock**, Escape, the registered blank shortcut, panel backgrounding and idle lock remove private session state and lock the vault. The panel starts locked after reload. Response edits and custom Bingo boards are volatile. The daily card ID/date and appearance preferences are non-sensitive local Chrome storage; private history uses encrypted IndexedDB.

**Screen sharing, employer-managed devices/profiles, endpoint monitoring, screenshots and clipboard history can expose activity or copied text. No claim of invisibility is made.** See [PRIVACY.md](docs/PRIVACY.md), [SECURITY_THREAT_MODEL.md](docs/SECURITY_THREAT_MODEL.md) and [SCREEN_SHARE_QA.md](docs/SCREEN_SHARE_QA.md).

## Release status

See [RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) for measured checks and remaining manual gates. A loadable candidate ZIP is not a claim that receiver-view sharing, volunteer usability, screen-reader conformance or independent security review has happened. No Web Store publication is authorized or performed. Original project code is MIT licensed; third-party licenses and artwork provenance are listed in [LICENSES.md](docs/LICENSES.md).

## Website and PWA

The shared PWA lives in `pwa/`; the separate Astro/EmDash site lives in `website/`. Build the extension first so its dependency notices and download ZIP are current, then build the web outputs:

```sh
npm run package
npm run build:web
node scripts/site-assets.mjs
npm ci --prefix website
npm run --prefix website build
```

The app has no authentication or private-data server. The CMS has administrator authentication for public publishing only. See [WEB_DEPLOYMENT.md](docs/WEB_DEPLOYMENT.md) for free-tier deployment and first-admin setup.
