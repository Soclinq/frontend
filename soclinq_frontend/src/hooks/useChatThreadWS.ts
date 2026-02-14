"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useWebSocketChat } from "@/hooks/useWebSocketChat";
import type { ChatAdapter } from "@/types/chatAdapterTypes";
import type { ChatMessage } from "@/types/chat";

/* ================= TYPES ================= */

type SeenByMap = Record<string, string>;

type WSIncoming =
  | { type: "message:new"; payload: ChatMessage }
  | { type: "message:ack"; payload: ChatMessage }
  | { type: "message:delivered"; payload: { messageId: string } }
  | { type: "message:seen"; payload: { messageId: string; userId: string } }
  | {
      type: "reaction:update";
      payload: {
        messageId: string;
        emoji: string;
        userId: string;
        action: "added" | "removed";
      };
    }
  | {
      type: "typing:update";
      payload: {
        threadId: string;
        userId: string;
        name?: string;
        isTyping: boolean;
      };
    }
  | { type: "message:delete"; payload: { messageId: string; deletedAt?: string } }
  | { type: "message:edit"; payload: ChatMessage }
  | {
      type: "presence:update";
      payload: {
        userId: string;
        online: boolean;
        lastSeen?: string | null;
      };
    }
  | { type: "ERROR"; message: string }
  | { type: string; payload?: any };

/* ================= HELPERS ================= */

function hashMessage(msg: ChatMessage) {
  return `${msg.clientTempId ?? ""}|${msg.text ?? ""}`;
}

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
  currentUserId?: string | null;
}) {
  /* ================= REFS ================= */

  const knownHashes = useRef<Set<string>>(new Set());

  /* ================= WS URL ================= */

  const wsThread = adapter?.wsThread;

  const wsUrl = useMemo(() => {
    if (!threadId) return "";
    if (typeof wsThread !== "function") return "";
  
    return wsThread(threadId);
  }, [threadId, wsThread]);
  

  /* ================= WS CORE ================= */

  const { connected, state, sendRaw } = useWebSocketChat({
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
        const msg = normalizeMine(evt.payload);
        const hash = hashMessage(msg);
      
        if (knownHashes.current.has(hash)) return;
        knownHashes.current.add(hash);
      
        setMessages(prev => {
          const idx =
            msg.clientTempId != null
              ? prev.findIndex(m => m.clientTempId === msg.clientTempId)
              : -1;
      
          if (idx !== -1) {
            const copy = [...prev];
      
            /* ✅ ACK → message left sender → SINGLE TICK */
            copy[idx] = { ...copy[idx], ...msg, status: "sent" };
      
            return copy;
          }
      
          if (prev.some(m => m.id === msg.id)) return prev;
      
          return [...prev, { ...msg, status: msg.status ?? "sent" }];
        });
      
        return;
      }
      
      /* ---------- DELIVERED ---------- */

      if (evt.type === "message:delivered") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === evt.payload.messageId
              ? {
                  ...m,
                  status: m.status === "seen" ? "seen" : "delivered",
                }
              : m
          )
        );
        return;
      }

      /* ---------- SEEN ---------- */

      if (evt.type === "message:seen") {
        const { messageId, userId } = evt.payload;
      
        setMessages(prev =>
          prev.map(m => {
            if (m.id !== messageId) return m;
      
            const seenBy = {
              ...(m.seenBy ?? {}),
              [userId]: new Date().toISOString(),
            };
      
            return {
              ...m,
              seenBy,     // ✅ source of truth
            };
          })
        );
      
        return;
      }
      

      /* ---------- REACTIONS ---------- */

      if (evt.type === "reaction:update") {
        const { messageId, emoji, action, userId } = evt.payload;
      
        setMessages(prev =>
          prev.map(m => {
            if (m.id !== messageId) return m;
      
            const reactions = [...(m.reactions ?? [])];
      
            const idx = reactions.findIndex(r => r.emoji === emoji);
      
            if (action === "added") {
              if (idx === -1) {
                reactions.push({
                  emoji,
                  userIds: [userId],   // ✅ REQUIRED
                  count: 1,
                  reactedByMe: String(userId) === String(currentUserId),
                });
              } else {
                const r = reactions[idx];
      
                if (!r.userIds.includes(userId)) {
                  reactions[idx] = {
                    ...r,
                    userIds: [...r.userIds, userId],
                    count: r.count + 1,
                    reactedByMe:
                      String(userId) === String(currentUserId)
                        ? true
                        : r.reactedByMe,
                  };
                }
              }
            }
      
            if (action === "removed" && idx !== -1) {
              const r = reactions[idx];
      
              const nextUserIds = r.userIds.filter(id => id !== userId);
              const nextCount = Math.max(0, r.count - 1);
      
              if (nextCount === 0) {
                reactions.splice(idx, 1);
              } else {
                reactions[idx] = {
                  ...r,
                  userIds: nextUserIds,
                  count: nextCount,
                  reactedByMe:
                    String(userId) === String(currentUserId)
                      ? false
                      : r.reactedByMe,
                };
              }
            }
      
            return {
              ...m,
              reactions,
              myReaction:
                String(userId) === String(currentUserId)
                  ? action === "added"
                    ? emoji
                    : null
                  : m.myReaction,
            };
          })
        );
      
        return;
      }
      

      /* ---------- TYPING (EMIT ONLY) ---------- */

      if (evt.type === "typing:update") {
        window.dispatchEvent(
          new CustomEvent("chat:typing-ws", {
            detail: evt.payload,
          })
        );
        return;
      }

      /* ---------- DELETE ---------- */

      if (evt.type === "message:delete") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === evt.payload.messageId
              ? {
                  ...m,
                  deletedAt:
                    evt.payload.deletedAt ?? new Date().toISOString(),
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

      /* ---------- EDIT ---------- */

      if (evt.type === "message:edit") {
        const edited = normalizeMine(evt.payload);
        setMessages((prev) =>
          prev.map((m) => (m.id === edited.id ? { ...m, ...edited } : m))
        );
        return;
      }

      /* ---------- PRESENCE ---------- */

      if (evt.type === "presence:update") {
        window.dispatchEvent(
          new CustomEvent("chat:presence-ws", {
            detail: evt.payload,
          })
        );
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

  /* ================= RESET ON THREAD CHANGE ================= */

  useEffect(() => {
    knownHashes.current.clear();
  }, [threadId]);

  /* ================= PUBLIC API ================= */

  return {
    connected,
    wsState: state,
    sendMessageWS,
  };
}
