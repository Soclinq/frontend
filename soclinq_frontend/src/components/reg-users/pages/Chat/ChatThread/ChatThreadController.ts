"use client";

import { useRef, useState } from "react";
import type { ChatAdapter } from "@/types/chatAdapterTypes";
import type { ChatMessage } from "@/types/chat";

import {
  useRouteThreadGuard,
  useChatMessages,
  useChatMessageDeduplication,
  useChatOptimisticReconciliation,
  useChatMessageIntegrity,
  useChatUnreadTracker,
  useChatTabSynchronization,
  useChatNetworkAwareness,
  useChatRateLimiter,
  useChatVisibilityLifecycle,
  useConnectionStates,
  useMessageReceipts,
  useReactionUI,
  useChatTypingEmitter,
  useChatTypingState,
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
  const { user } = useUser(); // UserProfile | null

  const currentUserId = user?.identity.id;

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
  const {
    messages,
    setMessages,
    loading,
    error,
  } = useChatMessages({ threadId, adapter });

  useChatMessageDeduplication(messages, setMessages);
  useChatOptimisticReconciliation(messages, setMessages);

  const safeMessages: ChatMessage[] =
    useChatMessageIntegrity(messages);

  /* ================= WebSocket ================= */
  const ws = useChatThreadWS({
    threadId,
    adapter,
    setMessages,
    currentUserId,
  });

  useConnectionStates(ws.connected);

  /* ================= Reactions ================= */
  const reactionUI = useReactionUI({
    currentUserId,
    setMessages,
  });

  /* ================= Typing ================= */
  const typingEmitter = useChatTypingEmitter(adapter, threadId);
  const typingUsers = useChatTypingState(threadId);

  /* ================= Receipts ================= */
  const receipts = useMessageReceipts({
    messages,
    adapter,
  });

  /* ================= Unread + Tabs ================= */
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

  /* ================= Network + Safety ================= */
  const network = useChatNetworkAwareness();

  const rateLimiter = useChatRateLimiter({
    max: 5,
    perMs: 3000,
  });

  useChatVisibilityLifecycle({
    onHidden: typingEmitter.stop,
  });

  /* ================= PUBLIC API ================= */
  return {
    /* ----- guards ----- */
    guardLoading,

    /* ----- current user (PUBLIC projection) ----- */
    currentUser: user
      ? {
          id: user.identity.id,
          username: user.identity.username ?? null,
          full_name: user.identity.full_name ?? null,
          photo: user.identity.photo ?? null,
          role: user.role,
          is_verified: user.security.is_verified,
        }
      : null,

    /* ----- refs ----- */
    refs: {
      containerRef,
    },

    /* ----- data ----- */
    data: {
      messages: safeMessages,
      rawMessages: messages,
      loading,
      error,
      unreadCount: unread.unreadCount,
      online: network.online,
      typingUsers,
    },

    /* ----- actions (NORMALIZED) ----- */
    actions: {
      /* messages */
      setMessages,

      /* typing */
      typing: typingEmitter,

      /* receipts */
      receipts,

      /* unread sync */
      tabSync,

      /* rate limit */
      rateLimiter,

      /* reactions (single, stable API) */
      reactions: {
        react: reactionUI.toggleReactionLocal,
        spawnBurst: reactionUI.spawnBurst,
      },
    },

    /* ----- transport ----- */
    ws,
  };
}
