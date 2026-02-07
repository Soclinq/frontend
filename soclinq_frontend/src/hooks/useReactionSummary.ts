// hooks/useReactionSummary.ts
import { useState } from "react";
import type { ChatMessage } from "@/types/chat";

export function useReactionSummary() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<ChatMessage | null>(null);

  const openSummary = (msg: ChatMessage) => {
    setMessage(msg);
    setOpen(true);
  };

  const closeSummary = () => {
    setOpen(false);
    setMessage(null);
  };

  return { open, message, openSummary, closeSummary };
}
