import { useState } from 'react';
import variants from '../content/view-copy.en.json';
import { useCompanion } from './companion-store';
const recent = new Map<string, string>();
export function clearCopyHistory() {
  recent.clear();
}
export function useViewCopy(key: keyof typeof variants) {
  const { store } = useCompanion();
  const playful = store.isPlayful();
  const [text] = useState(() => {
    const pool = [...variants[key].plain, ...(playful ? variants[key].playful : [])].filter(
      (text) => text !== recent.get(key),
    );
    const selected = pool[Math.floor(Math.random() * pool.length)]!;
    recent.set(key, selected);
    return selected;
  });
  return text;
}
