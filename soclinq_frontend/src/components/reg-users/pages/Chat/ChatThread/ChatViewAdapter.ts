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
  containerRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  messages: ChatMessage[];
};

export function useChatViewAdapter({
  threadId,
  containerRef,
  bottomRef,
  messages,
}: Options) {
  /* ================= Scroll restore ================= */

  useChatScrollRestoration(containerRef, threadId);

  const anchoring = useScrollAnchoring({
    containerRef,
    bottomRef,
    itemCount: messages.length,
  });

  /* ================= Viewport ================= */

  const visibleMessageIds = useViewportObserver({
    rootRef: containerRef,
  });
  
  /* ================= Render Guard ================= */

  const renderMessages = useChatRenderGuard(messages);

  /* ================= Derived ================= */

  const showScrollToBottom = useMemo(() => {
    return !anchoring.isNearBottom();
  }, [anchoring]);

  /* ================= API ================= */

  return {
    // render-safe messages
    messages: renderMessages,

    // scroll helpers
    scroll: {
      isNearBottom: anchoring.isNearBottom,
      showScrollToBottom,
      scrollToMessage: anchoring.scrollToMessage,
      highlightedId: anchoring.highlightedId,

      // prepend-safe loading
      captureAnchorBeforePrepend:
        anchoring.captureAnchorBeforePrepend,
      restoreAnchorAfterPrepend:
        anchoring.restoreAnchorAfterPrepend,
    },

    // viewport intelligence
    viewport: {
      visibleMessageIds,
    },
  };
}
