// hooks/useChatDedup.ts
import { useMemo } from "react";
import type { ChatMessage } from "@/types/chat";

export function useChatDedup(messages: ChatMessage[]) {
  return useMemo(() => {
    const seen = new Set<string>();

    return messages.filter((m) => {
      const key =
        m.messageHash ??
        m.clientTempId ??
        m.id;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [messages]);
}
