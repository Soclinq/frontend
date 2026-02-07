"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWebSocketChat } from "@/hooks/useWebSocketChat";
import type { ChatAdapter } from "@/types/chatAdapterTypes";
import type { ChatMessage, ChatReaction } from "@/types/chat";

/* ================= TYPES ================= */

type SeenByMap = Record<string, string>; // userId -> ISO timestamp

type WSIncoming =
  | { type: "message:new"; payload: ChatMessage }
  | { type: "message:ack"; payload: ChatMessage }
  | { type: "message:delivered"; payload: { messageId: string } }
  | {
      type: "message:seen";
      payload: { messageId: string; userId: string };
    }
  | {
      type: "reaction:update";
      payload: {
        messageId: string;
        emoji: string;
        userId: string;
        action: "added" | "removed";
      };
    }
  | { type: "typing:update"; payload: any }
  | { type: "message:delete"; payload: { messageId: string; deletedAt?: string } }
  | { type: "message:edit"; payload: ChatMessage }
  | {
      type: "presence:update";
      payload: {
        userId?: string;
        user?: { id: string };
        online: boolean;
        lastSeen?: string | null;
      };
    }
  | { type: "ERROR"; message: string }
  | { type: string; payload?: any };

export type PresenceState = {
  online: boolean;
  lastSeen?: string | null;
};

export type PresenceMap = Record<string, PresenceState>;

/* ================= HELPERS ================= */

function isNearBottom(el: HTMLElement, threshold = 160) {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
}

function hashMessage(msg: ChatMessage) {
  return `${msg.clientTempId ?? ""}|${msg.text ?? ""}`;
}

/* ================= E2EE MANAGER ================= */

type E2EEManager = {
  enabled: boolean;
  currentKeyId: string;
  decrypt: (cipher: string, keyId: string) => Promise<string>;
};

const e2ee: E2EEManager =
  (globalThis as any).SOC_E2EE ?? {
    enabled: false,
    currentKeyId: "default",
    decrypt: async (t: string) => t,
  };

/* ================= HOOK ================= */

export function useChatThreadWS({
  threadId,
  adapter,
  setMessages,
  currentUserId,
}: {
  threadId: string;
  adapter: ChatAdapter;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentUserId?: string;
}) {
  /* ---------- State ---------- */

  const [typingUsers, setTypingUsers] = useState<{ userId: string; name: string }[]>([]);
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  /* ---------- Refs ---------- */

  const knownMessageHashes = useRef<Set<string>>(new Set());
  const typingTimers = useRef<Record<string, any>>({});
  const autoScrollRef = useRef(true);

  /* ---------- Batching ---------- */

  const deliveredBatch = useRef<Set<string>>(new Set());
  const deliveredTimer = useRef<number | null>(null);

  const seenBatch = useRef<{ messageId: string; userId: string }[]>([]);
  const seenTimer = useRef<number | null>(null);

  /* ---------- WS URL ---------- */

  const wsUrl = useMemo(() => {
    if (!threadId) return "";
    return adapter.wsPath(threadId);
  }, [threadId, adapter]);

  /* ---------- Scroll ---------- */

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      autoScrollRef.current = isNearBottom(el);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  /* ================= WS CORE ================= */

  const { connected, state, sendRaw, typing, typingStop } = useWebSocketChat({
    wsUrl,
    debug: false,

    onEvent: async (evt: WSIncoming) => {
      if (evt.type === "ERROR") return;

      const normalizeMine = (m: ChatMessage): ChatMessage => ({
        ...m,
        isMine: String(m.sender?.id) === String(currentUserId),
      });

      /* ---------- MESSAGE NEW / ACK ---------- */

      if (evt.type === "message:new" || evt.type === "message:ack") {
        let msg = normalizeMine(evt.payload);

        if (e2ee.enabled && msg.text) {
          try {
            msg = {
              ...msg,
              text: await e2ee.decrypt(
                msg.text,
                msg.e2eeKeyId ?? e2ee.currentKeyId
              ),
            };
          } catch {
            msg = { ...msg, text: "🔒 Unable to decrypt message" };
          }
        }

        const hash = hashMessage(msg);
        if (knownMessageHashes.current.has(hash)) return;
        knownMessageHashes.current.add(hash);

        setMessages((prev) => {
          const idx = msg.clientTempId
            ? prev.findIndex((m) => m.clientTempId === msg.clientTempId)
            : -1;

          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = { ...msg, status: "sent" };
            return copy;
          }

          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, { ...msg, status: "sent" }];
        });

        if (autoScrollRef.current) scrollToBottom(true);
        return;
      }

      /* ---------- DELIVERED (batched) ---------- */

      if (evt.type === "message:delivered") {
        deliveredBatch.current.add(evt.payload.messageId);

        if (!deliveredTimer.current) {
          deliveredTimer.current = window.setTimeout(() => {
            const ids = new Set(deliveredBatch.current);
            deliveredBatch.current.clear();
            deliveredTimer.current = null;

            setMessages((prev) =>
              prev.map((m) =>
                ids.has(m.id)
                  ? { ...m, status: m.status === "seen" ? "seen" : "delivered" }
                  : m
              )
            );
          }, 400);
        }
        return;
      }

      /* ---------- SEEN (per-user, batched) ---------- */

      if (evt.type === "message:seen") {
        seenBatch.current.push(evt.payload);

        if (!seenTimer.current) {
          seenTimer.current = window.setTimeout(() => {
            const batch = [...seenBatch.current];
            seenBatch.current = [];
            seenTimer.current = null;

            setMessages((prev) =>
              prev.map((m) => {
                const hits = batch.filter((b) => b.messageId === m.id);
                if (!hits.length) return m;

                const seenBy: SeenByMap = { ...(m.seenBy ?? {}) };
                hits.forEach((h) => {
                  seenBy[h.userId] = new Date().toISOString();
                });

                return {
                  ...m,
                  seenBy,
                  status: m.isMine ? "seen" : m.status,
                };
              })
            );
          }, 300);
        }
        return;
      }

      /* ---------- REACTIONS ---------- */

      if (evt.type === "reaction:update") {
        const { messageId, emoji, action, userId } = evt.payload;

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;

            const reactions = [...(m.reactions ?? [])];
            const idx = reactions.findIndex((r) => r.emoji === emoji);

            if (action === "added") {
              if (idx === -1) reactions.push({ emoji, count: 1 });
              else reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1 };
            } else {
              if (idx !== -1) {
                const c = reactions[idx].count - 1;
                if (c <= 0) reactions.splice(idx, 1);
                else reactions[idx] = { ...reactions[idx], count: c };
              }
            }

            let myReaction = m.myReaction ?? null;
            if (String(userId) === String(currentUserId)) {
              myReaction = action === "added" ? emoji : null;
            }

            return { ...m, reactions, myReaction };
          })
        );
        return;
      }

      /* ---------- TYPING ---------- */

      if (evt.type === "typing:update") {
        const u = evt.payload?.userId ?? evt.payload?.user?.id;
        const name = evt.payload?.name ?? evt.payload?.user?.name ?? "Someone";
        const isTyping = !!evt.payload?.isTyping;

        if (!u || String(u) === String(currentUserId)) return;

        if (typingTimers.current[u]) clearTimeout(typingTimers.current[u]);

        if (isTyping) {
          typingTimers.current[u] = setTimeout(() => {
            setTypingUsers((p) => p.filter((x) => x.userId !== String(u)));
            delete typingTimers.current[u];
          }, 3000);

          setTypingUsers((p) =>
            p.some((x) => x.userId === String(u))
              ? p
              : [...p, { userId: String(u), name }]
          );
        } else {
          setTypingUsers((p) => p.filter((x) => x.userId !== String(u)));
        }
        return;
      }

      /* ---------- DELETE / EDIT ---------- */

      if (evt.type === "message:delete") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === evt.payload.messageId
              ? {
                  ...m,
                  deletedAt: evt.payload.deletedAt ?? new Date().toISOString(),
                  text: "",
                  attachments: [],
                  reactions: [],
                  myReaction: null,
                }
              : m
          )
        );
        return;
      }

      if (evt.type === "message:edit") {
        const edited = normalizeMine(evt.payload);
        setMessages((prev) =>
          prev.map((m) => (m.id === edited.id ? { ...m, ...edited } : m))
        );
        return;
      }

      /* ---------- PRESENCE ---------- */

      if (evt.type === "presence:update") {
        const u = evt.payload.userId ?? evt.payload.user?.id;
        if (!u) return;

        setPresenceMap((p) => ({
          ...p,
          [String(u)]: {
            online: !!evt.payload.online,
            lastSeen: evt.payload.lastSeen ?? null,
          },
        }));
      }
    },
  });

  /* ================= SEND ================= */

  const sendMessageWS = useCallback(
    (payload: {
      clientTempId: string;
      text?: string;
      messageType: "TEXT" | "MEDIA";
      replyToId?: string | null;
      attachments?: any[];
    }) => {
      sendRaw({ type: "message:send", payload });
    },
    [sendRaw]
  );

  /* ---------- Cleanup ---------- */

  
  useEffect(() => {
    if (!connected) setTypingUsers([]);
  }, [connected]);

  useEffect(() => {
    Object.values(typingTimers.current).forEach(clearTimeout);
    typingTimers.current = {};
    setTypingUsers([]);
    setPresenceMap({});
  }, [threadId]);

  return {
    connected,
    wsState: state,

    typingUsers,
    presenceMap,

    containerRef,
    bottomRef,

    scrollToBottom,
    typing,
    typingStop,

    sendMessageWS,
  };
}
