"use client";

import { useRef, useState, useEffect } from "react";
import type { ChatAdapter } from "@/types/chatAdapterTypes";
import type { ChatMessage } from "@/types/chat";

import {
  useRouteThreadGuard,
  useChatMessages,
  useChatMessageDeduplication,
  useChatOptimisticReconciliation,
  useChatMessageIntegrity,
  useChatRetry,
  useChatUploads,
  useChatTyping,
  useChatUnreadTracker,
  useChatTabSynchronization,
  useChatNetworkAwareness,
  useChatRateLimiter,
  useChatVisibilityLifecycle,
  useConnectionStates,
  useMessageReceipts,
} from "@/hooks/ChatThread";

import { useChatThreadWS } from "@/hooks/useChatThreadWS";
import { useNotify } from "@/components/utils/NotificationContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

export function useChatThreadController(
  threadId: string,
  adapter: ChatAdapter
) {
  const notify = useNotify();
  const router = useRouter();
  const { user } = useUser();
  const currentUserId = user?.id;

  /* ================= Access Guard ================= */
  const [guardLoading, setGuardLoading] = useState(true);

  useRouteThreadGuard({
    threadId,
    adapter,
    onInvalid: () => {
      notify({
        type: "error",
        title: "Access denied",
        message: "You no longer have access to this chat",
      });
      router.replace("/chats");
    },
    onLoadingChange: setGuardLoading,
  });

  /* ================= Messages ================= */
  const { messages, setMessages, loading, error } =
    useChatMessages({ threadId, adapter });

  useChatMessageDeduplication(messages, setMessages);
  useChatOptimisticReconciliation(messages, setMessages);

  const safeMessages = useChatMessageIntegrity(messages);

  /* ================= WebSocket ================= */
  const ws = useChatThreadWS({
    threadId,
    adapter,
    setMessages,
    currentUserId,
  });

  useConnectionStates(ws.connected);

  /* ================= Typing ================= */
  const typing = useChatTyping(adapter, threadId);

  /* ================= Seen / receipts ================= */
  const receipts = useMessageReceipts({
    messages,
    adapter,
  });

  /* ================= Retry / uploads ================= */
  useChatRetry(messages, ws);
  useChatUploads(messages, ws, notify);

  /* ================= Unread + tabs ================= */
  const containerRef = useRef<HTMLDivElement | null>(null);

  const unread = useChatUnreadTracker({
    threadId,
    messages,
    containerRef,
  });

  const tabSync = useChatTabSynchronization({
    threadId,
    onSeenSync: unread.markAllRead,
  });

  /* ================= Network + safety ================= */
  const network = useChatNetworkAwareness();
  const rateLimiter = useChatRateLimiter({
    max: 5,
    perMs: 3000,
  });

  useChatVisibilityLifecycle({
    onHidden: typing.stop,
  });

  return {
    guardLoading,

    refs: {
      containerRef,
    },

    data: {
      messages: safeMessages,
      rawMessages: messages,
      loading,
      error,
      unreadCount: unread.unreadCount,
      online: network.online,
    },

    actions: {
      setMessages,
      typing,
      receipts,
      tabSync,
      rateLimiter,
    },

    ws,
  };
}
