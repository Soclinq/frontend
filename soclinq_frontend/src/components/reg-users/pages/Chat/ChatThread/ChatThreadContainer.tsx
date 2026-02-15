"use client";

import { useRef, useState } from "react";
import type { ChatAdapter } from "@/types/chatAdapterTypes";

import { useChatThreadController } from "./ChatThreadController";
import { useChatComposerController } from "./ChatComposerController";
import { useChatOverlayController } from "./ChatOverlayController";
import { useChatViewAdapter } from "./ChatViewAdapter";
import ChatThreadView from "./ChatThreadView";

type Props = {
  threadId: string;
  adapter: ChatAdapter;
};

export default function ChatThreadContainer({
  threadId,
  adapter,
}: Props) {
  /* ================= Refs ================= */
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* ================= Hooks (always called) ================= */
  const thread = useChatThreadController(threadId, adapter);

  const composer = useChatComposerController({
    threadId,
    adapter,
    currentUser: thread.currentUser,
    sendMessageWS: thread.ws.sendMessageWS,
    addOptimisticMessage: (msg) =>
      thread.actions.setMessages((prev) => [...prev, msg]),
  });

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const clearSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };
  
  const selection = {
    active: isSelectionMode,
    ids: selectedIds,
    count: selectedIds.size,
  
    isSelected: (id: string) => selectedIds.has(id),
  
    toggle: (id: string) => {
      setSelectedIds(prev => {
        const next = new Set(prev);
  
        next.has(id) ? next.delete(id) : next.add(id);
  
        // ✅ AUTO-EXIT SELECTION MODE
        if (next.size === 0) {
          setIsSelectionMode(false);
          return new Set();
        }
  
        return next;
      });
    },
  
    enter: (id: string) => {
      setIsSelectionMode(true);
      setSelectedIds(new Set([id]));
    },
  
    clear: clearSelection,
  };
  


  const overlays = useChatOverlayController({
    inputRef,
  });

  const view = useChatViewAdapter({
    threadId,
    containerRef,
    bottomRef,
    messages: thread.data.messages,
  });

  /* ================= Render Guard ================= */
  if (thread.guardLoading) {
    return <div />; // skeleton higher up
  }

  /* ================= Final Model ================= */
  return (
    <ChatThreadView
      model={{
        adapter,
        threadId,
        thread,
        composer,
        overlays,
        view,
        ui: {
          selection,
          startReply: (id) => {
            const msg = thread.data.messages.find(m => m.id === id);
            if (msg) {
              composer.startReply(msg);
              clearSelection();
            }
          },
        },
        refs: {
          containerRef,
          bottomRef,
          inputRef,
        },
      }}
    />


  );
}
