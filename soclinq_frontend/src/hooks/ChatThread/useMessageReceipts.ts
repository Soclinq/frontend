"use client";

import { useEffect, useRef, useCallback } from "react";
import { authFetch } from "@/lib/authFetch";
import type { ChatMessage } from "@/types/chat";
import type { ChatAdapter } from "@/types/chatAdapterTypes";

/* ================= Types ================= */

export type ReceiptStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read";

type Params = {
  messages: ChatMessage[];
  adapter: ChatAdapter;
  currentUserId?: string;

  /** optional local optimistic updater */
  onLocalUpdate?: (
    updater: (prev: ChatMessage[]) => ChatMessage[]
  ) => void;
};

/* ================= Hook ================= */

export function useMessageReceipts({
  messages,
  adapter,
  currentUserId,
  onLocalUpdate,
}: Params) {
  /* ================= refs ================= */

  const deliveredSet = useRef<Set<string>>(new Set());
  const readSet = useRef<Set<string>>(new Set());

  const deliverQueue = useRef<string[]>([]);
  const readQueue = useRef<string[]>([]);

  const deliverTimer = useRef<number | null>(null);
  const readTimer = useRef<number | null>(null);

  /* ================= helpers ================= */

  const flushDelivered = useCallback(async () => {
    if (!deliverQueue.current.length) return;

    const ids = Array.from(
      new Set(deliverQueue.current.splice(0))
    );

    try {
      await authFetch(adapter.markDeliveredBatch(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageIds: ids }),
      });
    } catch {
      // soft-fail
    }
  }, [adapter]);

  const flushRead = useCallback(async () => {
    if (!readQueue.current.length) return;

    const ids = Array.from(
      new Set(readQueue.current.splice(0))
    );

    try {
      await authFetch(adapter.markSeenBatch(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageIds: ids }),
      });
    } catch {
      // soft-fail
    }
  }, [adapter]);

  /* ================= mark delivered ================= */

  const markDelivered = useCallback(
    (msg: ChatMessage) => {
      if (!msg?.id) return;
      if (!currentUserId) return;
      if (msg.sender?.id === currentUserId) return;
      if (deliveredSet.current.has(msg.id)) return;

      deliveredSet.current.add(msg.id);
      deliverQueue.current.push(msg.id);

      if (!deliverTimer.current) {
        deliverTimer.current = window.setTimeout(() => {
          deliverTimer.current = null;
          flushDelivered();
        }, 250);
      }
    },
    [currentUserId, flushDelivered]
  );

  /* ================= mark read ================= */

  const markRead = useCallback(
    (msg: ChatMessage) => {
      if (!msg?.id) return;
      if (!currentUserId) return;
      if (msg.sender?.id === currentUserId) return;
      if (readSet.current.has(msg.id)) return;

      readSet.current.add(msg.id);
      readQueue.current.push(msg.id);

      if (!readTimer.current) {
        readTimer.current = window.setTimeout(() => {
          readTimer.current = null;
          flushRead();
        }, 400);
      }

      // optimistic UI update
      onLocalUpdate?.((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, status: "seen" }
            : m
        )
      );      
    },
    [currentUserId, flushRead, onLocalUpdate]
  );

  /* ================= auto-deliver ================= */

  useEffect(() => {
    if (!currentUserId) return;

    messages.forEach((msg) => {
      if (!msg) return;
      if (
        msg.status === "sent" ||
        msg.status === "delivered"
      ) {
        markDelivered(msg);
      }
    });
  }, [messages, currentUserId, markDelivered]);

  /* ================= cleanup ================= */

  useEffect(() => {
    return () => {
      if (deliverTimer.current) {
        window.clearTimeout(deliverTimer.current);
        flushDelivered();
      }
      if (readTimer.current) {
        window.clearTimeout(readTimer.current);
        flushRead();
      }
    };
  }, [flushDelivered, flushRead]);

  /* ================= public API ================= */

  return {
    markRead,
    markDelivered,
  };
}
