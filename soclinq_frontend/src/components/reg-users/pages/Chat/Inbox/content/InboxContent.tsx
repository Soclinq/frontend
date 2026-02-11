"use client";

import { useChatUI } from "../state/ChatUIContext";
import InboxEngine from "./InboxEngine";
import UnifiedHeaderSlot from "../header/UnifiedHeaderSlot";
export default function InboxContent() {
  const ui = useChatUI();
  

  
  return (
    <>
    <UnifiedHeaderSlot />
    <InboxEngine
      searchValue={ui.inboxSearch}
      onOpenChat={ui.openChat}
      exposeReload={ui.registerInboxReload}
      onSelectionChange={ui.setSelection}
    />
    </>
  );
}
