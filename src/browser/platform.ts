export function isExtension() {
  return !!globalThis.chrome?.runtime?.id;
}
const keys = { preferences: 'bossdetox:preferences', dailyCard: 'bossdetox:daily-card' } as const;
export async function readPublic(key: keyof typeof keys): Promise<unknown> {
  if (isExtension()) return (await chrome.storage.local.get(key))[key];
  const raw = localStorage.getItem(keys[key]);
  return raw === null ? undefined : JSON.parse(raw);
}
export async function writePublic(key: keyof typeof keys, value: unknown) {
  if (isExtension()) await chrome.storage.local.set({ [key]: value });
  else localStorage.setItem(keys[key], JSON.stringify(value));
}
export async function clearPublic() {
  if (isExtension()) await chrome.storage.local.clear();
  else for (const key of Object.values(keys)) localStorage.removeItem(key);
}
export function broadcastBlank() {
  if (isExtension()) void chrome.runtime.sendMessage({ type: 'safe-blank' }).catch(() => undefined);
}
