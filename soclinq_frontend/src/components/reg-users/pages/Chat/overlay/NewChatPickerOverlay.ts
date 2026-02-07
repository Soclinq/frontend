"use client";

import NewChatPicker from "../NewChatPicker";
import { useChatUI } from "../state/ChatUIContext";
import { openPrivateChat } from "../state/chatActions";

export default function NewChatPickerOverlay() {
  const ui = useChatUI();

  return (
    <NewChatPicker
      open
      searchValue={ui.newChatSearch}
      onSearchChange={ui.setNewChatSearch}
      onClose={ui.closeNewChat}
      onOpenPrivateChat={async (userId) => {
        try {
          const conversation = await openPrivateChat(userId);
          if (!conversation?.conversation_id) return;

          ui.openChat({
            kind: "PRIVATE",
            id: conversation.conversation_id,
          });
        } catch (e) {
          console.error("open private chat failed", e);
        }
      }}
      onCreateGroup={(userIds) => {
        // future: open create group modal
        console.log("create group with", userIds);
      }}
      onViewProfile={(userId) => {
        console.log("view profile", userId);
      }}
      onSelectionChange={(payload) => {
        ui.setSelection({
          ...payload,
          context: "NEW_CHAT",
        });
      }}
    />
  );
}
