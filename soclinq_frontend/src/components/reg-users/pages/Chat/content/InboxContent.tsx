"use client";

import { useRef } from "react";
import GroupsContainer from "../GroupsContainer";
import { useChatUI } from "../state/ChatUIContext";
import type { ActiveChat } from "./content.types";

export default function InboxContent() {
  const ui = useChatUI();
  const reloadRef = useRef<null | (() => void)>(null);

  return (
    <GroupsContainer
      searchValue={ui.inboxSearch}
      onOpenChat={(chat: ActiveChat) => {
        ui.openChat(chat);
      }}
      exposeReload={(fn) => {
        reloadRef.current = fn;
      }}
      onSelectionChange={(payload) => {
        ui.setSelection({
          ...payload,
          context: "INBOX",
        });
      }}
    />
  );
}
