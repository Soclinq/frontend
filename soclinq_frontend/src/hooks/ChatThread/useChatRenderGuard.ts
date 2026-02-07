import { useDeferredValue, useMemo } from "react";
import type { ChatMessage } from "@/types/chat";

export function useChatRenderGuard(
  messages: ChatMessage[]
) {
  const deferredMessages = useDeferredValue(messages);

  const stable = useMemo(() => {
    return deferredMessages;
  }, [deferredMessages]);

  return stable;
}
