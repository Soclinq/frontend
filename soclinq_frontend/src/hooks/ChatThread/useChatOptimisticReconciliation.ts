import { useEffect } from "react";
import type { ChatMessage } from "@/types/chat";

type SetMessages = React.Dispatch<React.SetStateAction<ChatMessage[]>>;

export function useChatOptimisticReconciliation(
  messages: ChatMessage[],
  setMessages: SetMessages
) {
  useEffect(() => {
    if (!messages?.length) return;

    const byClientTempId = new Map<string, ChatMessage>();

    for (const msg of messages) {
      if (msg.clientTempId) {
        byClientTempId.set(msg.clientTempId, msg);
      }
    }

    let changed = false;

    const reconciled = messages.map((msg) => {
      // Server message with real ID
      if (
        msg.clientTempId &&
        msg.id &&
        msg.id !== msg.clientTempId
      ) {
        const optimistic = byClientTempId.get(msg.clientTempId);

        if (optimistic && optimistic.id === msg.clientTempId) {
          changed = true;

          return {
            ...msg,
            // preserve UI-only state
            reactions: optimistic.reactions ?? msg.reactions,
            myReaction: optimistic.myReaction ?? msg.myReaction,
            status: msg.status ?? "sent",
          };
        }
      }

      return msg;
    });

    if (changed) {
      setMessages(reconciled);
    }
  }, [messages, setMessages]);
}
