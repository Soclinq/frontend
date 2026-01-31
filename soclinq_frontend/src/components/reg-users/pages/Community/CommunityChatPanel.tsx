import ChatThread from "../Chat/ChatThread";
import { communityChatAdapter } from "@/lib/communityAdapter"; 

export default function CommunityChatPanel({
  conversationId,
}: {
  conversationId: string;
}) {
  return <ChatThread threadId={conversationId} adapter={communityChatAdapter} />;
}
