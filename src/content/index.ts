// Locale packs are an explicit boundary: UI copy and structured content travel together.
// Add complete translations here; absent keys/content fall back to the English pack.
import { en } from './en';
import { content } from '../domain/content';
export const defaultLocale = 'en';
export const supportedLocales = ['en'] as const;
export const messages = en;
export const contentPack = content;
type PartialCopy<T> = {
  [K in keyof T]?: T[K] extends string[]
    ? string[]
    : T[K] extends Record<string, unknown>
      ? PartialCopy<T[K]>
      : T[K];
};
export type LocalePack = {
  locale: string;
  messages?: PartialCopy<typeof en>;
  content?: typeof content;
};
function mergeCopy<T extends Record<string, unknown>>(
  fallback: T,
  translated: PartialCopy<T> = {},
): T {
  const merged = { ...fallback };
  for (const key of Object.keys(fallback) as (keyof T)[]) {
    const value = translated[key];
    if (value === undefined) continue;
    const original = fallback[key];
    merged[key] =
      typeof original === 'object' && original !== null && !Array.isArray(original)
        ? (mergeCopy(
            original as Record<string, unknown>,
            value as PartialCopy<Record<string, unknown>>,
          ) as T[keyof T])
        : (value as T[keyof T]);
  }
  return merged;
}
export function resolveLocale(pack?: LocalePack) {
  return {
    locale: pack?.locale ?? defaultLocale,
    messages: mergeCopy(en, pack?.messages),
    content: pack?.content ?? content,
  };
}
export function formatDate(iso: string, locale = defaultLocale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}
