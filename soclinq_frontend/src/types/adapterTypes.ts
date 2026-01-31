export type ChatMode = "community" | "private";

export type ChatAdapter = {
  mode: ChatMode;

  // REST endpoints
  listMessages: (threadId: string) => string;
  listMessagesOlder: (threadId: string, cursor: string) => string;

  sendMessage: (threadId: string) => string;
  upload: () => string;

  deleteForMe: (messageId: string) => string;
  deleteForEveryone: (messageId: string) => string;

  edit: (messageId: string) => string;

  forwardTargets: () => string;
  forwardMessage: (messageId: string) => string;

  messageInfo: (messageId: string) => string;
  react: (messageId: string) => string;

  // websocket path
  wsPath: (threadId: string) => string;

  // feature flags
  features: {
    reactions: boolean;
    forward: boolean;
    typing: boolean;
    edit: boolean;
    deleteForEveryone: boolean;
  };
};
