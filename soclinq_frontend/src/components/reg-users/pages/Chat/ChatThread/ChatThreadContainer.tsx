"use client";

import { useRef } from "react";
import type { ChatAdapter } from "@/types/chatAdapterTypes";

import { useChatThreadController } from "./ChatThreadController";
import { useChatComposerController } from "./ChatComposerController";
import { useChatOverlayController } from "./ChatOverlayController";
import { useChatViewAdapter } from "./ChatViewAdapter";
import { ChatThreadView } from "./ChatThreadView";

type Props = {
  threadId: string;
  adapter: ChatAdapter;
};

export default function ChatThreadContainer({
  threadId,
  adapter,
}: Props) {
  /* ================= Shared Refs ================= */
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  /* ================= Thread Controller ================= */
  const thread = useChatThreadController(threadId, adapter);

  if (thread.guardLoading) {
    return <div />; // skeleton handled higher up
  }

  /* ================= Composer Controller ================= */
  const composer = useChatComposerController({
    threadId,
    adapter,
    currentUserId: thread.ws.currentUserId!,
    sendMessageWS: thread.ws.sendMessageWS,
    addOptimisticMessage: (msg) =>
      thread.actions.setMessages((prev) => [...prev, msg]),
  });

  /* ================= Overlay Controller ================= */
  const overlays = useChatOverlayController({
    inputRef,
  });

  /* ================= View Adapter ================= */
  const view = useChatViewAdapter({
    threadId,
    containerRef,
    bottomRef,
    messages: thread.data.messages,
  });

  /* ================= Final Model ================= */
  const model = {
    thread,
    composer,
    overlays,
    view,

    refs: {
      containerRef,
      bottomRef,
      inputRef,
    },
  };

  return <ChatThreadView model={model} />;
}
