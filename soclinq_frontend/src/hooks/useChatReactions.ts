import type { ChatMessage } from "@/types/chat";

export function useChatReactions(
  reactToMessage: (msg: ChatMessage, emoji: string) => void
) {
  const onReact = (msg: ChatMessage, emoji: string) => {
    reactToMessage(msg, emoji);
  };

  return { onReact };
}
