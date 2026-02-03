import { ChatAdapter } from "./chatAdapterTypes";

export type ChatThreadProps = {
    threadId: string;         // groupId or conversationId
    adapter: ChatAdapter;     // communityChatAdapter or privateChatAdapter
  };
  