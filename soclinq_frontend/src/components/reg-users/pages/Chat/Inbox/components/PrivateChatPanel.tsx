import { privateChatAdapter } from "@/lib/privateAdapter";
import ChatThread from "../Chat/Chatpanel";

export default function PrivateChatPanel({
  conversationId,
  onSelectionChange,
}: {
  conversationId: string;
  onSelectionChange?: any;
}) {
  return (
    <ChatThread
      threadId={conversationId}
      adapter={privateChatAdapter}
      onSelectionChange={onSelectionChange}
    />
  );
}
