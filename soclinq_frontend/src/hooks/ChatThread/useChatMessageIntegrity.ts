import { useMemo } from "react";
import type { ChatMessage } from "@/types/chat";

const SAFE_MESSAGE_TYPE = new Set([
  "TEXT",
  "MEDIA",
  "SYSTEM",
]);

export function useChatMessageIntegrity(
  messages: ChatMessage[] | undefined | null
): ChatMessage[] {
  return useMemo(() => {
    if (!Array.isArray(messages)) return [];
    return messages.map((m) => {  
      const safe: ChatMessage = {
        ...m,

        id: String(m.id ?? m.clientTempId ?? crypto.randomUUID()),

        createdAt: m.createdAt
          ? new Date(m.createdAt).toISOString()
          : new Date().toISOString(),

        sender: m.sender ?? {
          id: "unknown",
          name: "Unknown",
        },

        messageType: SAFE_MESSAGE_TYPE.has(m.messageType)
          ? m.messageType
          : "TEXT",

        attachments: Array.isArray(m.attachments)
          ? m.attachments.filter(Boolean)
          : [],

        reactions: Array.isArray(m.reactions)
          ? m.reactions
          : [],

        text: typeof m.text === "string" ? m.text : "",
      };

      return safe;
    });
  }, [messages]);
}
