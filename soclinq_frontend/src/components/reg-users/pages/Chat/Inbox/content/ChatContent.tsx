"use client";

import ChatView from "../components/ChatView";
import { useChatUI } from "../state/ChatUIContext";

export default function ChatContent() {
  const ui = useChatUI();
  const chat = ui.activeChat;

  if (!chat) return null;

  return (
    <ChatView
      mode={chat.kind}
      groupId={chat.kind === "COMMUNITY" ? chat.id : undefined}
      conversationId={chat.kind === "PRIVATE" ? chat.id : undefined}
      onSelectionChange={(payload) => {
        ui.setSelection({
          ...payload,
          context: "CHAT",
        });
      }}
    />
  );
}
