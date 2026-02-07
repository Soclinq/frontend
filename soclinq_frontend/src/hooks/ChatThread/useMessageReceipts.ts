import { useEffect, useRef, useCallback } from "react";
import type { ChatMessage } from "@/types/chat";

/* ================= Types ================= */

export type ReceiptStatus =
  | "sending"     // ⏳ local only
  | "sent"        // ✓ server ack
  | "delivered"   // ✓✓ peer received
  | "read";       // ✓✓ blue

type Params = {
  messages: ChatMessage[];
  currentUserId?: string;

  /** called when we should notify backend */
  sendReceipt: (payload: {
    messageIds: string[];
    type: "delivered" | "read";
  }) => void;

  /** optional: for WS push updates */
  onLocalUpdate?: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
};

/* ================= Hook ================= */

export function useMessageReceipts({
  messages,
  currentUserId,
  sendReceipt,
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

  const flushDelivered = useCallback(() => {
    if (!deliverQueue.current.length) return;

    const ids = Array.from(new Set(deliverQueue.current.splice(0)));
    sendReceipt({ messageIds: ids, type: "delivered" });
  }, [sendReceipt]);

  const flushRead = useCallback(() => {
    if (!readQueue.current.length) return;

    const ids = Array.from(new Set(readQueue.current.splice(0)));
    sendReceipt({ messageIds: ids, type: "read" });
  }, [sendReceipt]);

  /* ================= mark delivered ================= */

  const markDelivered = useCallback(
    (msg: ChatMessage) => {
      if (!msg.id) return;
      if (msg.sender?.id === currentUserId) return;
      if (msg.status === "read") return;

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
      if (!msg.id) return;
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

      // optimistic UI update (blue ticks)
      onLocalUpdate?.((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, status: "read" }
            : m
        )
      );
    },
    [currentUserId, flushRead, onLocalUpdate]
  );

  /* ================= auto-detect delivered ================= */

  useEffect(() => {
    if (!currentUserId) return;

    messages.forEach((msg) => {
      if (!msg) return;
      if (msg.status === "sent" || msg.status === "delivered") {
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
    markRead,        // call when message enters viewport
    markDelivered,  // exposed for WS events
  };
}
