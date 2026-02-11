import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types/chat";

type Options = {
  threadId: string;
  messages: ChatMessage[];
  containerRef: React.RefObject<HTMLElement | null>;
};

const KEY = "soclinq_unread_v1";
const BOTTOM_THRESHOLD = 24;

/* ================= persistence ================= */

function loadUnread(threadId: string): number {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed?.[threadId] === "number"
      ? parsed[threadId]
      : 0;
  } catch {
    return 0;
  }
}

function saveUnread(threadId: string, count: number) {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[threadId] = count;
    localStorage.setItem(KEY, JSON.stringify(parsed));
  } catch {}
}

/* ================= helpers ================= */

function isAtBottom(el: HTMLElement | null) {
  if (!el) return true;
  return (
    el.scrollHeight - el.scrollTop - el.clientHeight <
    BOTTOM_THRESHOLD
  );
}

/* ================= hook ================= */

export function useChatUnreadTracker({
  threadId,
  messages,
  containerRef,
}: Options) {
  const [unreadCount, setUnreadCount] = useState(() =>
    loadUnread(threadId)
  );

  const lastCountedIdRef = useRef<string | null>(null);

  /* ================= increment on new incoming ================= */

  useEffect(() => {
    if (!messages.length) return;

    const last = messages[messages.length - 1];
    if (!last) return;

    // ignore my messages or deleted messages
    if (last.isMine || last.deletedAt) return;

    // already counted this message
    if (lastCountedIdRef.current === last.id) return;

    const el = containerRef.current;
    const shouldIncrement =
      document.visibilityState !== "visible" ||
      !isAtBottom(el);

    if (shouldIncrement) {
      setUnreadCount((prev) => {
        const next = prev + 1;
        saveUnread(threadId, next);
        return next;
      });
    }

    lastCountedIdRef.current = last.id;
  }, [messages, threadId, containerRef]);

  /* ================= reset on scroll to bottom ================= */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onScroll() {
      if (isAtBottom(el)) {
        setUnreadCount(0);
        saveUnread(threadId, 0);
      }
    }

    el.addEventListener("scroll", onScroll, {
      passive: true,
    });

    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [threadId, containerRef]);

  /* ================= reset on tab focus ================= */

  useEffect(() => {
    function onVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        isAtBottom(containerRef.current)
      ) {
        setUnreadCount(0);
        saveUnread(threadId, 0);
      }
    }

    document.addEventListener(
      "visibilitychange",
      onVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );
    };
  }, [threadId, containerRef]);

  /* ================= public API ================= */

  function markAllRead() {
    setUnreadCount(0);
    saveUnread(threadId, 0);
  }

  return {
    unreadCount,
    markAllRead,
  };
}
