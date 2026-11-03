import { z } from 'zod';
export const settingsSchema = z.object({
  onboarded: z.boolean().default(false),
  privateLogging: z.boolean().default(false),
  tone: z.enum(['yellow', 'grey', 'firm']).default('yellow'),
  theme: z.enum(['system', 'dark', 'light']).default('system'),
  humor: z.boolean().default(true),
  reducedMotion: z.boolean().default(false),
  quiet: z.boolean().default(false),
  icon: z.enum(['search', 'notes', 'sigil']).default('search'),
  lockMinutes: z.union([z.literal(1), z.literal(5), z.literal(15)]).default(5),
});
export type Settings = z.infer<typeof settingsSchema>;
export const defaults = settingsSchema.parse({});
export async function loadSettings(): Promise<Settings> {
  if (!globalThis.chrome?.storage?.local) return defaults;
  const saved = await chrome.storage.local.get('preferences');
  const parsed = settingsSchema.safeParse(saved.preferences ?? {});
  return parsed.success ? parsed.data : defaults;
}
export async function saveSettings(settings: Settings) {
  const safe = settingsSchema.parse(settings);
  if (!globalThis.chrome?.storage?.local) return;
  await chrome.storage.local.set({ preferences: safe });
  await chrome.action.setIcon({
    path: Object.fromEntries(
      [16, 32, 48, 128].map((size) => [size, `icons/${safe.icon}${size}.png`]),
    ),
  });
}
