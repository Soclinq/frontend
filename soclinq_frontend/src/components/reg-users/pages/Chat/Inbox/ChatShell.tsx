"use client";

import { ChatUIProvider, useChatUI } from "./state/ChatUIContext";
import UnifiedHeaderSlot from "./header/UnifiedHeaderSlot";
import InboxContent from "./content/InboxContent";
import ChatContent from "./content/ChatContent";
import NewChatContent from "./content/NewChatContent";
import OverlaySlot from "./overlay/OverlaySlot";

function Shell() {
  const ui = useChatUI();

  return (
    <>

      {ui.mode === "INBOX" && <InboxContent />}
      {ui.mode === "CHAT" && <ChatContent />}
      {ui.mode === "NEW_CHAT" && <NewChatContent />}

      <OverlaySlot />
    </>
  );
}

export default function ChatShell() {
  return (
    <ChatUIProvider>
      <Shell />
    </ChatUIProvider>
  );
}
