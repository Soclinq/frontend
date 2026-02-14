"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import type { ChatAdapter } from "@/types/chatAdapterTypes";
import type { ChatMessage } from "@/types/chat";

/* ================= Types ================= */

type Params = {
  threadId: string;
  adapter: ChatAdapter;
};

type OlderCursor = string | null;

/* ================= Hook ================= */

export function useChatMessages({
  threadId,
  adapter,
}: Params) {
  /* ================= State ================= */

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<OlderCursor>(null);

  /* keep ref for sync-safe access */
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /* ================= Helpers ================= */

  const replaceMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
      );
    },
    []
  );

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const prependMessages = useCallback(
    (older: ChatMessage[]) => {
      setMessages((prev) => [...older, ...prev]);
    },
    []
  );

  /* ================= Initial Load ================= */

  useEffect(() => {
    if (!threadId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await authFetch(
          adapter.listMessages(threadId),
          { credentials: "include" }
        );
        
        if (!res.ok) {
          const text = await res.text();
          console.error("listMessages failed:", res.status, text);
          throw new Error(`HTTP ${res.status}`);
        }
        

        const data = await res.json();

        if (cancelled) return;

        const list: ChatMessage[] = data.messages ?? [];

        setMessages(list);
        setHasMore(Boolean(data.nextCursor));
        cursorRef.current = data.nextCursor ?? null;
      } catch {
        if (!cancelled) {
          setError("Failed to load messages");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadId, adapter]);

  /* ================= Load Older ================= */

  const loadOlder = useCallback(async () => {
    if (!hasMore || loadingOlder || !cursorRef.current) return;

    setLoadingOlder(true);

    try {
      const res = await authFetch(
        adapter.listMessagesOlder(threadId, cursorRef.current),
        { credentials: "include" }
      );

      if (!res.ok) throw new Error();

      const data = await res.json();

      const older: ChatMessage[] = data.messages ?? [];

      prependMessages(older);
      setHasMore(Boolean(data.nextCursor));
      cursorRef.current = data.nextCursor ?? null;
    } catch {
      // silent fail, user can retry by scrolling
    } finally {
      setLoadingOlder(false);
    }
  }, [
    adapter,
    threadId,
    hasMore,
    loadingOlder,
    prependMessages,
  ]);

  /* ================= Optimistic Helpers ================= */

  const addOptimistic = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const markFailed = useCallback((id: string) => {
    replaceMessage(id, { status: "failed" });
  }, [replaceMessage]);

  const markSent = useCallback((id: string) => {
    replaceMessage(id, { status: "sent" });
  }, [replaceMessage]);

  /* ================= Public API ================= */

  return {
    /* data */
    messages,
    loading,
    loadingOlder,
    error,
    hasMore,

    /* pagination */
    loadOlder,

    /* mutation helpers */
    setMessages,
    addOptimistic,
    replaceMessage,
    markFailed,
    markSent,
    appendMessage,
  };
}
