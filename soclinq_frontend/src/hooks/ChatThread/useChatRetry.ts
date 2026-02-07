import { useCallback, useEffect, useRef } from "react";
import { openDB } from "idb";
import type { ChatMessage, SendMessagePayload } from "@/types/chat";

/* ================= Config ================= */

const DB_NAME = "chat-retry-db";
const STORE = "retryQueue";

const MAX_RETRIES = 5;
const BASE_DELAY = 800; // ms

/* ================= IndexedDB ================= */

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE, { keyPath: "key" });
    }
  },
});

/* ================= Types ================= */

type RetryEntry = {
  key: string;
  payload: SendMessagePayload;
  retryCount: number;
  lastTriedAt: number;
};

/* ================= Hook ================= */

export function useChatRetryQueue({
  connected,
  sendMessage,
}: {
  connected: boolean;
  sendMessage: (payload: SendMessagePayload) => void;
}) {
  const inflightRef = useRef<Set<string>>(new Set());

  /* ================= helpers ================= */

  const getDelay = (retryCount: number) =>
    Math.min(BASE_DELAY * Math.pow(1.7, retryCount), 15_000);

  const loadAll = async (): Promise<RetryEntry[]> => {
    const db = await dbPromise;
    return (await db.getAll(STORE)) as RetryEntry[];
  };

  const save = async (entry: RetryEntry) => {
    const db = await dbPromise;
    await db.put(STORE, entry);
  };

  const remove = async (key: string) => {
    const db = await dbPromise;
    await db.delete(STORE, key);
  };

  /* ================= enqueue ================= */

  const enqueueRetry = useCallback(
    async (msg: ChatMessage) => {
      if (!msg.clientTempId) return;
      if (msg.messageType !== "TEXT") return;

      const key = msg.clientTempId;

      const entry: RetryEntry = {
        key,
        payload: {
          clientTempId: msg.clientTempId,
          text: msg.text || "",
          messageType: "TEXT",
          replyToId: msg.replyTo?.id ?? null,
          attachments: [],
        },
        retryCount: msg.retryCount ?? 0,
        lastTriedAt: Date.now(),
      };

      await save(entry);
    },
    []
  );

  /* ================= retry engine ================= */

  const processQueue = useCallback(async () => {
    if (!connected) return;

    const all = await loadAll();
    const now = Date.now();

    for (const entry of all) {
      if (inflightRef.current.has(entry.key)) continue;
      if (entry.retryCount >= MAX_RETRIES) {
        await remove(entry.key);
        continue;
      }

      const delay = getDelay(entry.retryCount);
      if (now - entry.lastTriedAt < delay) continue;

      inflightRef.current.add(entry.key);

      try {
        sendMessage(entry.payload);

        await remove(entry.key);
      } catch {
        await save({
          ...entry,
          retryCount: entry.retryCount + 1,
          lastTriedAt: Date.now(),
        });
      } finally {
        inflightRef.current.delete(entry.key);
      }
    }
  }, [connected, sendMessage]);

  /* ================= triggers ================= */

  // reconnect
  useEffect(() => {
    if (connected) processQueue();
  }, [connected, processQueue]);

  // focus retry
  useEffect(() => {
    const onFocus = () => processQueue();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [processQueue]);

  /* ================= public API ================= */

  return {
    enqueueRetry,
    processQueue,
  };
}
