"use client";

import { useChatUI } from "../state/ChatUIContext";

import NewChatPickerOverlay from "./NewChatPickerOverlay";
import CreateHubModalOverlay from "./CreateHubModalOverlay";
import ChangeLGAModalOverlay from "./ChangeLGAModalOverlay";


export default function OverlaySlot() {
  const ui = useChatUI();
  console.log("ChatUI instance", ui);


  return (
    <>
      {/* NEW CHAT PICKER */}
      {ui.mode === "NEW_CHAT" && <NewChatPickerOverlay />}

      {/* CREATE HUB */}
      {ui.createHubOpen && <CreateHubModalOverlay />}

      {/* CHANGE LGA */}
      {ui.changeLGAOpen && <ChangeLGAModalOverlay />}
      </>
  );
}
