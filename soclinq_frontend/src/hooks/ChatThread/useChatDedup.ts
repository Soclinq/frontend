// hooks/useChatDedup.ts
import { useMemo } from "react";
import type { ChatMessage } from "@/types/chat";

export function useChatDedup(messages: ChatMessage[]) {
  return useMemo(() => {
    const seen = new Set<string>();

    return messages.filter((m) => {
      /* ✅ Ignore empty / invalid identifiers */
      const key =
        (m.messageHash && m.messageHash.trim()) ||
        (m.clientTempId && m.clientTempId.trim()) ||
        m.id;

      if (!key) return true; // ultra-defensive safeguard

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [messages]);
}
