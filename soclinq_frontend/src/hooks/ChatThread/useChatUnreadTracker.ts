import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types/chat";

type Options = {
  threadId: string;
  messages: ChatMessage[];
  containerRef: React.RefObject<HTMLElement>;
};

const KEY = "soclinq_unread_v1";

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

export function useChatUnreadTracker({
  threadId,
  messages,
  containerRef,
}: Options) {
  const [unreadCount, setUnreadCount] = useState(() =>
    loadUnread(threadId)
  );

  const lastSeenIdRef = useRef<string | null>(null);

  // track new incoming messages
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;

    if (last.isMine || last.deletedAt) return;

    if (
      document.visibilityState !== "visible" ||
      !isAtBottom(containerRef.current)
    ) {
      setUnreadCount((c) => {
        const next = c + 1;
        saveUnread(threadId, next);
        return next;
      });
    }

    lastSeenIdRef.current = last.id;
  }, [messages, threadId, containerRef]);

  // reset when user reaches bottom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onScroll() {
      if (isAtBottom(el)) {
        setUnreadCount(0);
        saveUnread(threadId, 0);
      }
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [threadId, containerRef]);

  function markAllRead() {
    setUnreadCount(0);
    saveUnread(threadId, 0);
  }

  return {
    unreadCount,
    markAllRead,
  };
}

function isAtBottom(el: HTMLElement | null) {
  if (!el) return true;
  return (
    el.scrollHeight - el.scrollTop - el.clientHeight < 24
  );
}
