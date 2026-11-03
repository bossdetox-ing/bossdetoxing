import type { Archive } from './service';
export const DB_NAME = 'bossdetox-vault';
async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('vault');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Local storage unavailable'));
    request.onblocked = () => reject(new Error('Close other extension panels and retry'));
  });
}
export async function readArchive(): Promise<Archive | undefined> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('vault', 'readonly').objectStore('vault').get('current');
      request.onsuccess = () => resolve(request.result as Archive | undefined);
      request.onerror = () => reject(new Error('Could not read local vault'));
    });
  } finally {
    db.close();
  }
}
// A single read/write transaction makes restore atomic and detects stale panels.
export async function commitArchive(
  next: Archive | undefined,
  expectedRevision: string | undefined,
): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('vault', 'readwrite');
      const store = transaction.objectStore('vault');
      const read = store.get('current');
      let conflict = false;
      read.onsuccess = () => {
        const current = read.result as Archive | undefined;
        if (current?.revision !== expectedRevision) {
          conflict = true;
          transaction.abort();
          return;
        }
        if (next) store.put(next, 'current');
        else store.delete('current');
      };
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () =>
        reject(
          new Error(
            conflict
              ? 'Vault changed in another panel. Lock and unlock before retrying.'
              : 'Local write failed; previous data is unchanged',
          ),
        );
    });
  } finally {
    db.close();
  }
}
