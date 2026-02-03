import { communityChatAdapter } from "@/lib/communityAdapter";
import ChatThread from "../Chat/Chatpanel";

export default function CommunityChatPanel({
  conversationId,
  onSelectionChange,
}: {
  conversationId: string;
  onSelectionChange?: any;
}) {
  return (
    <ChatThread
      threadId={conversationId}
      adapter={communityChatAdapter}
      onSelectionChange={onSelectionChange}
    />
  );
}

