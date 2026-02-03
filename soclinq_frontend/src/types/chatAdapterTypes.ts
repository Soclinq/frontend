export type ChatMode = "community" | "private";

export type ChatFeatureFlags = {
  reactions: boolean;
  forward: boolean;
  typing: boolean;
  edit: boolean;
  deleteForEveryone: boolean;

  inbox?: boolean;
  searchInbox?: boolean;

  markRead?: boolean;

  pin?: boolean;
  mute?: boolean;
  archive?: boolean;

  joinLeave?: boolean;
  threadInfo?: boolean;

  reporting?: boolean;
  moderation?: boolean;

  emergencyAlerts?: boolean;

  uploadPresign?: boolean;

  presence?: boolean;

  safety?: boolean;
};

export type ChatAdapter = {
  mode: ChatMode;

  inbox?: () => string;
  searchInbox?: (q: string) => string;

  getOrCreateConversation?: () => string;

  threadInfo?: (threadId: string) => string;

  joinThread?: (threadId: string) => string;
  leaveThread?: (threadId: string) => string;

  pinThread?: (threadId: string) => string;
  unpinThread?: (threadId: string) => string;

  muteThread?: (threadId: string) => string;
  unmuteThread?: (threadId: string) => string;

  archiveThread?: (threadId: string) => string;
  unarchiveThread?: (threadId: string) => string;

  markRead?: (threadId: string) => string;

  listMessages: (threadId: string) => string;
  listMessagesOlder: (threadId: string, cursor: string) => string;

  sendMessage: (threadId: string) => string;

  upload: () => string;
  uploadPresign?: () => string;

  deleteForMe: (messageId: string) => string;
  deleteForEveryone: (messageId: string) => string;

  edit: (messageId: string) => string;

  forwardTargets: () => string;
  forwardMessage: (messageId: string) => string;

  messageInfo: (messageId: string) => string;
  react: (messageId: string) => string;

  reportMessage?: (messageId: string) => string;

  modRemoveMessage?: (messageId: string) => string;
  modMuteUser?: (threadId: string) => string;
  modBanUser?: (threadId: string) => string;

  sendAlert?: (threadId: string) => string;

  blockUser?: () => string;
  unblockUser?: () => string;
  reportUser?: () => string;

  wsPath: (threadId: string) => string;
  wsTypingPath?: (threadId: string) => string;
  wsPresencePath?: (threadId: string) => string;

  features: ChatFeatureFlags;
};
