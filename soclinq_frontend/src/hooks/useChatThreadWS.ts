"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWebSocketChat } from "@/hooks/useWebSocketChat";
import type { ChatAdapter } from "@/types/chatAdapterTypes";
import type { ChatMessage, ChatReaction } from "@/types/chat";

/* ================= TYPES ================= */

type WSIncoming =
  | { type: "message:new"; payload: ChatMessage }
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
      payload:
        | { userId: string; online: boolean; lastSeen?: string | null }
        | { user?: { id: string }; online: boolean; lastSeen?: string | null };
    }
  | { type: "ERROR"; message: string }
  | { type: string; payload?: any }; // ✅ allows unknown events safely

export type PresenceState = {
  online: boolean;
  lastSeen?: string | null;
};

export type PresenceMap = Record<string, PresenceState>;

/* ================= HELPERS ================= */

function buildWsUrl(path: string) {
  const raw = process.env.NEXT_PUBLIC_WS_URL;

  if (!raw) {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${window.location.host}${path}`;
  }

  if (raw.startsWith("http://")) return raw.replace("http://", "ws://") + path;
  if (raw.startsWith("https://")) return raw.replace("https://", "wss://") + path;

  return raw + path;
}

function normalizeTypingPayload(payload: any): {
  userId: string;
  name: string;
  isTyping: boolean;
} | null {
  const userId = payload?.userId ?? payload?.user?.id;
  const name = payload?.name ?? payload?.user?.name;
  const isTyping = !!payload?.isTyping;

  if (!userId) return null;

  return {
    userId: String(userId),
    name: String(name || "Someone"),
    isTyping,
  };
}

/** ✅ WhatsApp-like: only autoscroll if user is already near bottom */
function isNearBottom(el: HTMLElement, thresholdPx = 140) {
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  return distanceFromBottom <= thresholdPx;
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
  currentUserId?: string; // ✅ needed for myReaction updates
}) {
  const [typingUsers, setTypingUsers] = useState<{ userId: string; name: string }[]>(
    []
  );

  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});

  /** ✅ used for smart autoscroll detection */
  const containerRef = useRef<HTMLDivElement | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  /** ✅ prevents stuck typing */
  const typingTimers = useRef<Record<string, any>>({});

  const wsUrl = useMemo(() => {
    if (!threadId) return "";
    return buildWsUrl(adapter.wsPath(threadId));
  }, [threadId, adapter]);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const scrollToBottomSafe = useCallback(
    (smooth = true) => {
      requestAnimationFrame(() => scrollToBottom(smooth));
    },
    [scrollToBottom]
  );

  /** ✅ Track whether we should auto-scroll */
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      shouldAutoScrollRef.current = isNearBottom(el, 180);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  const { connected, state, sendRaw, typing, typingStop } = useWebSocketChat({
    wsUrl,
    debug: false,

    onEvent: (evt: any) => {
      const payload = evt as WSIncoming;

      if (payload.type === "ERROR") return;

      /* ✅ MESSAGE NEW */
      if (payload.type === "message:new") {
        const msg = payload.payload;

        setMessages((prev) => {
          // prevent duplicates by id
          if (prev.some((m) => m.id === msg.id)) return prev;

          // replace temp message if clientTempId matches
          if (msg.clientTempId) {
            const idx = prev.findIndex((m) => m.clientTempId === msg.clientTempId);
            if (idx !== -1) {
              const copy = [...prev];
              copy[idx] = { ...msg, status: "sent" };
              return copy;
            }
          }

          return [...prev, { ...msg, status: "sent" }];
        });

        // ✅ WhatsApp-like: only auto scroll if user is already near bottom
        if (shouldAutoScrollRef.current) {
          scrollToBottomSafe(true);
        }

        return;
      }

      /* ✅ REACTION UPDATE (+ myReaction support) */
      if (payload.type === "reaction:update") {
        const { messageId, emoji, action, userId } = payload.payload;

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;

            const reactions: ChatReaction[] = m.reactions ? [...m.reactions] : [];
            const idx = reactions.findIndex((r) => r.emoji === emoji);

            // count update
            if (idx === -1 && action === "added") {
              reactions.push({ emoji, count: 1 });
            } else if (idx !== -1) {
              const current = reactions[idx];
              const nextCount = action === "added" ? current.count + 1 : current.count - 1;

              if (nextCount <= 0) reactions.splice(idx, 1);
              else reactions[idx] = { ...current, count: nextCount };
            }

            // ✅ update myReaction if this event belongs to the current user
            let myReaction = m.myReaction ?? null;
            if (currentUserId && String(userId) === String(currentUserId)) {
              if (action === "added") myReaction = emoji;
              if (action === "removed" && myReaction === emoji) myReaction = null;
            }

            return { ...m, reactions, myReaction };
          })
        );

        return;
      }

      /* ✅ TYPING UPDATE */
      if (payload.type === "typing:update") {
        const t = normalizeTypingPayload(payload.payload);
        if (!t) return;

        // ✅ ignore own typing events if server mistakenly echoes
        if (currentUserId && String(t.userId) === String(currentUserId)) return;

        // ✅ auto-clear typing after 3s if no updates
        if (t.isTyping) {
          if (typingTimers.current[t.userId]) clearTimeout(typingTimers.current[t.userId]);

          typingTimers.current[t.userId] = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((x) => x.userId !== t.userId));
            delete typingTimers.current[t.userId];
          }, 3000);
        } else {
          if (typingTimers.current[t.userId]) {
            clearTimeout(typingTimers.current[t.userId]);
            delete typingTimers.current[t.userId];
          }
        }

        setTypingUsers((prev) => {
          if (t.isTyping) {
            if (prev.some((x) => x.userId === t.userId)) return prev;
            return [...prev, { userId: t.userId, name: t.name }];
          }
          return prev.filter((x) => x.userId !== t.userId);
        });

        return;
      }

      /* ✅ DELETE */
      if (payload.type === "message:delete") {
        const { messageId, deletedAt } = payload.payload;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  deletedAt: deletedAt || new Date().toISOString(),
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

      /* ✅ EDIT */
      if (payload.type === "message:edit") {
        const edited = payload.payload;
        setMessages((prev) => prev.map((m) => (m.id === edited.id ? { ...m, ...edited } : m)));
        return;
      }

      /* ✅ PRESENCE UPDATE (ONLINE DOT) */
      if (payload.type === "presence:update") {
        const raw: any = payload.payload || {};
        const userId = raw.userId || raw.user?.id;
        if (!userId) return;

        setPresenceMap((prev) => ({
          ...prev,
          [String(userId)]: {
            online: !!raw.online,
            lastSeen: raw.lastSeen ?? null,
          },
        }));

        return;
      }

      /* ✅ Unknown events (dev logging) */
      if (process.env.NODE_ENV === "development") {
        console.warn("[WS] Unhandled event:", payload);
      }
    },
  });

  /* ✅ Clear typing when WS disconnects */
  useEffect(() => {
    if (!connected) {
      setTypingUsers([]);
    }
  }, [connected]);

  /* ✅ Reset typing timers + (optional) presence per thread to avoid growth */
  useEffect(() => {
    setTypingUsers([]);

    Object.values(typingTimers.current).forEach((t) => clearTimeout(t));
    typingTimers.current = {};

    // ✅ prevents presenceMap growing forever
    setPresenceMap({});

    return () => {
      Object.values(typingTimers.current).forEach((t) => clearTimeout(t));
      typingTimers.current = {};
    };
  }, [threadId]);

  useEffect(() => {
    if (!connected) return;
  
    const t = setInterval(() => {
      sendRaw({ type: "ping", payload: {} });
    }, 15000);
  
    return () => clearInterval(t);
  }, [connected, sendRaw]);
  
  return {
    connected,
    wsState: state,

    typingUsers,
    presenceMap,

    containerRef, // ✅ NEW (for smart autoscroll detection)
    bottomRef,

    scrollToBottom: scrollToBottomSafe,

    typing,
    typingStop,

    sendRaw,
  };
}
