"use client";

import { useChatUI } from "../state/ChatUIContext";
import NewChatPickerOverlay from "./NewChatPickerOverlay";
import ChangeLGAModalOverlay from "./ChangeLGAModalOverlay";
import CreateHubModalOverlay from "./CreateHubModalOverlay";
import NewChatFab from "../NewChatFab";

export default function ChatOverlaySlot() {
  const ui = useChatUI();

  return (
    <>
      {/* NEW CHAT FLOW */}
      {ui.mode === "NEW_CHAT" && <NewChatPickerOverlay />}

      {/* GLOBAL MODALS */}
      <ChangeLGAModalOverlay />
      <CreateHubModalOverlay />

      {/* FLOATING ACTION */}
      {ui.mode === "INBOX" && (
        <NewChatFab onClick={ui.openNewChat} />
      )}
    </>
  );
}
