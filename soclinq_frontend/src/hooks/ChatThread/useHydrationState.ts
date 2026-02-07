import { useEffect } from "react";
import type { ChatMessage } from "@/types/chat";

type Options = {
  threadId: string;
  messages: ChatMessage[];
  setMessages: React.Dispatch<
    React.SetStateAction<ChatMessage[]>
  >;
};

const KEY = "soclinq_chat_cache_v1";

function loadCache(threadId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return Array.isArray(parsed?.[threadId])
      ? parsed[threadId]
      : [];
  } catch {
    return [];
  }
}

function saveCache(threadId: string, msgs: ChatMessage[]) {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[threadId] = msgs.slice(-100); // cap
    localStorage.setItem(KEY, JSON.stringify(parsed));
  } catch {}
}

export function useChatStateHydration({
  threadId,
  messages,
  setMessages,
}: Options) {
  // hydrate once
  useEffect(() => {
    const cached = loadCache(threadId);
    if (cached.length) {
      setMessages((prev) => merge(prev, cached));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // persist
  useEffect(() => {
    if (messages.length) {
      saveCache(threadId, messages);
    }
  }, [messages, threadId]);
}

function merge(
  current: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const map = new Map<string, ChatMessage>();

  [...current, ...incoming].forEach((m) => {
    const key = m.id || m.clientTempId;
    if (!key) return;

    const existing = map.get(key);
    map.set(
      key,
      existing
        ? { ...existing, ...m }
        : m
    );
  });

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(a.createdAt).getTime() -
      new Date(b.createdAt).getTime()
  );
}
