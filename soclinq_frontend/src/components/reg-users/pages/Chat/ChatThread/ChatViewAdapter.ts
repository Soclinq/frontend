"use client";

import { useMemo } from "react";
import type { ChatMessage } from "@/types/chat";

import {
  useScrollAnchoring,
  useChatScrollRestoration,
  useViewportObserver,
  useChatRenderGuard,
} from "@/hooks/ChatThread";

type Options = {
  threadId: string;
  containerRef: React.RefObject<HTMLDivElement>;
  bottomRef: React.RefObject<HTMLDivElement>;
  messages: ChatMessage[];
};

export function useChatViewAdapter({
  threadId,
  containerRef,
  bottomRef,
  messages,
}: Options) {
  /* ================= Scroll ================= */

  useChatScrollRestoration(containerRef, threadId);

  const {
    isAtBottom,
    scrollToBottom,
    onUserScroll,
  } = useScrollAnchoring({
    containerRef,
    bottomRef,
  });

  /* ================= Viewport ================= */

  const visibleMessageIds =
    useViewportObserver(containerRef);

  /* ================= Render Guard ================= */

  const renderMessages = useChatRenderGuard(messages);

  /* ================= Derived ================= */

  const showScrollToBottom = useMemo(() => {
    return !isAtBottom;
  }, [isAtBottom]);

  /* ================= API ================= */

  return {
    // render-safe messages
    messages: renderMessages,

    // scroll helpers
    scroll: {
      isAtBottom,
      scrollToBottom,
      onUserScroll,
      showScrollToBottom,
    },

    // viewport intelligence
    viewport: {
      visibleMessageIds,
    },
  };
}
