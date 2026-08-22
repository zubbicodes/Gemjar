import type { StateStorage } from "zustand/middleware";

const DATABASE = "gemjar-offline";
const STORE = "state";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = action(database.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

export const indexedDbStorage: StateStorage = {
  getItem: (name) => transaction("readonly", (store) => store.get(name)),
  setItem: async (name, value) => {
    await transaction("readwrite", (store) => store.put(value, name));
  },
  removeItem: async (name) => {
    await transaction("readwrite", (store) => store.delete(name));
  },
};
