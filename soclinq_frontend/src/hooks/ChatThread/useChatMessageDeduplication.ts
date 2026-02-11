import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types/chat";

type SetMessages = React.Dispatch<React.SetStateAction<ChatMessage[]>>;

export function useChatMessageDeduplication(
  messages: ChatMessage[],
  setMessages: SetMessages
) {
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!messages?.length) return;

    const next: ChatMessage[] = [];
    let mutated = false;

    for (const msg of messages) {
      const key = msg.id || msg.clientTempId;
      if (!key) {
        next.push(msg);
        continue;
      }

      if (seenRef.current.has(key)) {
        mutated = true;
        continue;
      }

      seenRef.current.add(key);
      next.push(msg);
    }

    if (mutated) {
      setMessages(next);
    }
  }, [messages, setMessages]);
}
