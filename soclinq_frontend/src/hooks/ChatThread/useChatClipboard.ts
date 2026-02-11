"use client";

import { useCallback } from "react";
import type { ChatMessage } from "@/types/chat";


export function useChatClipboard() {
  const copy = useCallback((messages: ChatMessage[]) => {
    if (!messages || messages.length === 0) return;

    const text = messages
      .filter((m) => m.text)
      .map((m) => {
        const sender = m.senderName ?? "Unknown";
        return `${sender}: ${m.text}`;
      })
      .join("\n");

    if (!text) return;

    navigator.clipboard.writeText(text).catch(() => {
      // fail silently (WhatsApp does)
    });
  }, []);

  return {
    copy,
  };
}
