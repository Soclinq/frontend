type OfflineQueuedMessage = {
    clientTempId: string;
    threadId: string;
    payload: any;
    createdAt: number;
  };
  
  const DB_NAME = "soclinq-chat";
  const STORE = "offline-messages";
  const VERSION = 1;
  
  function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
  
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "clientTempId" });
        }
      };
  
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  
  export async function queueOfflineMessage(msg: OfflineQueuedMessage) {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(msg);
    return tx.complete;
  }
  
  export async function getOfflineMessages(threadId: string) {
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
  
    return new Promise<OfflineQueuedMessage[]>((resolve) => {
      const req = store.getAll();
      req.onsuccess = () =>
        resolve(req.result.filter((m) => m.threadId === threadId));
    });
  }
  
  export async function removeOfflineMessage(clientTempId: string) {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(clientTempId);
    return tx.complete;
  }
  