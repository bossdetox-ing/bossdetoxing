import { isExtension, readPublic, writePublic } from './platform';
import { z } from 'zod';
import { extensionIcons, legacyIcons, webIcons } from '../domain/disguise';
const iconChoices = () => (isExtension() ? extensionIcons : webIcons);
export const settingsSchema = z.object({
  bossPronouns: z.enum(['he', 'she', 'they']).default('they'),
  strongLanguage: z.boolean().default(true),
  onboarded: z.boolean().default(false),
  privateLogging: z.boolean().default(false),
  tone: z.enum(['yellow', 'grey', 'firm']).default('yellow'),
  theme: z.enum(['system', 'dark', 'light']).default('system'),
  humor: z.boolean().default(true),
  reducedMotion: z.boolean().default(false),
  quiet: z.boolean().default(false),
  icon: z
    .string()
    .default(() => (isExtension() ? 'search' : 'google'))
    .transform((id) => legacyIcons[id] ?? id)
    .transform((id) => (iconChoices().includes(id) ? id : isExtension() ? 'search' : 'google')),
  toolbarScheme: z.enum(['light', 'dark']).default('light'),
  // '' follows the device. Unknown zones fall back to the device zone.
  timeZone: z
    .string()
    .default('')
    .transform((zone) => {
      if (!zone) return '';
      try {
        new Intl.DateTimeFormat('en', { timeZone: zone });
        return zone;
      } catch {
        return '';
      }
    }),
  lockMinutes: z.union([z.literal(1), z.literal(5), z.literal(15)]).default(5),
});
export type Settings = z.infer<typeof settingsSchema>;
export const defaults = settingsSchema.parse({});
export async function loadSettings(): Promise<Settings> {
  const saved = await readPublic('preferences');
  const parsed = settingsSchema.safeParse(saved ?? {});
  return parsed.success ? parsed.data : defaults;
}
export async function saveSettings(settings: Settings) {
  const safe = settingsSchema.parse(settings);
  await writePublic('preferences', safe);
  if (!isExtension()) return;
  await chrome.action.setIcon({ path: toolbarIconPath(safe.icon, safe.toolbarScheme) });
}
// Black glyph for light browser toolbars, white for dark ones.
export function toolbarIconPath(icon: string, scheme: 'light' | 'dark') {
  return Object.fromEntries(
    [16, 32].map((size) => [size, `disguise/png/${icon}-${scheme}-${size}.png`]),
  );
}
