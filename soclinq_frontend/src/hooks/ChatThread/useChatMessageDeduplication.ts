import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types/chat";

type SetMessages = React.Dispatch<React.SetStateAction<ChatMessage[]>>;

export function useChatMessageDeduplication(
  messages: ChatMessage[],
  setMessages: SetMessages
) {
  useEffect(() => {
    if (!messages?.length) return;

    const seen = new Set<string>();   // ✅ LOCAL PER RUN
    const next: ChatMessage[] = [];
    let mutated = false;

    for (const msg of messages) {
      const key = msg.id || msg.clientTempId;

      if (!key) {
        next.push(msg);
        continue;
      }

      if (seen.has(key)) {
        mutated = true;
        continue;
      }

      seen.add(key);
      next.push(msg);
    }

    if (mutated) {
      setMessages(next);
    }
  }, [messages, setMessages]);
}
