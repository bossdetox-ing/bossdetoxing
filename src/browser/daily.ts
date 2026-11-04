import { dailyCard, dailySchema } from '../domain/daily';
import { isExtension, readPublic, writePublic } from './platform';
export async function loadDaily(day: string) {
  if (isExtension()) {
    const result = await chrome.runtime.sendMessage({ type: 'daily-card', day });
    if (!result?.ok) throw new Error('daily-storage');
    return dailySchema.parse(result.card);
  }
  async function select() {
    const previous = await readPublic('dailyCard');
    const card = dailyCard(previous, day);
    await writePublic('dailyCard', card);
    return card;
  }
  return navigator.locks ? navigator.locks.request('bossdetox-daily', select) : select();
}
