import { useEffect, useState } from "react";
import type { TypingUser } from "@/components/reg-users/pages/Chat/ChatThread/components/ChatTypingBar";
export function useChatTypingState(threadId: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    function onTypingEvent(e: CustomEvent) {
      const { user, typing, eventThreadId } = e.detail;
      if (eventThreadId !== threadId) return;

      setTypingUsers((prev) => {
        if (typing) {
          if (prev.some((u) => u.userId === user.userId)) return prev;
          return [...prev, user];
        }
        return prev.filter((u) => u.userId !== user.userId);
      });
    }

    window.addEventListener("chat:typing-ws", onTypingEvent as EventListener);
    return () =>
      window.removeEventListener("chat:typing-ws", onTypingEvent as EventListener);
  }, [threadId]);

  return typingUsers;
}
