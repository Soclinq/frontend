import { privateChatAdapter } from "@/lib/privateAdapter";
import ChatThread from "../Chat/ChatThread";

export default function PrivateChatPanel({
  conversationId,
}: {
  conversationId: string;
}) {
  return <ChatThread threadId={conversationId} adapter={privateChatAdapter} />;
}
