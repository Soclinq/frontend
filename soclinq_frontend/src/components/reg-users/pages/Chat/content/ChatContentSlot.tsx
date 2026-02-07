"use client";

import { useChatUI } from "../state/ChatUIContext";
import InboxContent from "./InboxContent";
import ChatContent from "./ChatContent";
import NewChatContent from "./NewChatContent";

export default function ChatContentSlot() {
  const ui = useChatUI();

  if (ui.mode === "NEW_CHAT") return <NewChatContent />;
  if (ui.mode === "CHAT") return <ChatContent />;

  return <InboxContent />;
}
