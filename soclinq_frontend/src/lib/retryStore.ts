import { openDB, DBSchema } from "idb";
import type { ChatMessage } from "@/types/chat";

interface RetryDB extends DBSchema {
  retryQueue: {
    key: string;
    value: {
      key: string;
      msg: ChatMessage;
      ts: number;
      chunkIndex?: number;
      totalChunks?: number;
    };
    indexes: { "by-ts": number };
  };
}

const DB_NAME = "chat-retry-db";
const STORE = "retryQueue";

export const retryDB = openDB<RetryDB>(DB_NAME, 1, {
  upgrade(db) {
    const store = db.createObjectStore(STORE, { keyPath: "key" });
    store.createIndex("by-ts", "ts");
  },
});

const getKey = (msg: ChatMessage) =>
  msg.clientTempId || msg.messageHash || msg.id;

export async function saveRetry(
  msg: ChatMessage,
  meta?: { chunkIndex?: number; totalChunks?: number }
) {
  const db = await retryDB;
  await db.put(STORE, {
    key: getKey(msg),
    msg,
    ts: Date.now(),
    ...meta,
  });
}

export async function removeRetry(msg: ChatMessage) {
  const db = await retryDB;
  await db.delete(STORE, getKey(msg));
}

export async function loadRetries(): Promise<ChatMessage[]> {
  const db = await retryDB;
  const entries = await db.getAllFromIndex(STORE, "by-ts");

  const seen = new Set<string>();
  const result: ChatMessage[] = [];

  for (const e of entries) {
    const key = getKey(e.msg);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(e.msg);
  }

  return result;
}
