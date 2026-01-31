import { ChatAdapter } from "./adapterTypes";

export type ChatThreadProps = {
    threadId: string;         // groupId or conversationId
    adapter: ChatAdapter;     // communityChatAdapter or privateChatAdapter
  };
  