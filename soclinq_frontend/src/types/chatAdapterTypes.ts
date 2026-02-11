/* ================= CORE MODES ================= */

export type ChatMode = "community" | "private";

/* ================= FEATURE FLAGS ================= */

export type ChatFeatureFlags = {
  /* Core */
  reactions: boolean;
  forward: boolean;
  typing: boolean;
  edit: boolean;
  deleteForEveryone: boolean;

  /* Inbox */
  inbox: boolean;
  searchInbox: boolean;

  /* Read receipts */
  markRead: boolean;
  readReceipts: "thread" | "per-user";

  /* Thread */
  pin: boolean;
  joinLeave: boolean;
  mute: boolean;
  archive: boolean;
  threadInfo: boolean;

  /* Uploads */
  uploads: boolean;
  uploadPresign: boolean;

  /* Presence */
  presence: boolean;

  /* Safety */
  reporting: boolean;
  safety: boolean;

  /* 🔐 Security */
  e2ee: boolean;
  e2eeKeyRotation: boolean;

  /* 🧠 Transport */
  batching: boolean;
  offlineReplay: boolean;
};

/* ================= BATCH PAYLOADS ================= */

export type SeenBatchPayload = {
  threadId: string;
  messageIds: string[];
};

export type DeliveredBatchPayload = {
  threadId: string;
  messageIds: string[];
};

/* ================= OFFLINE ================= */

export type OfflineReplayPayload = {
  clientTempId: string;
  threadId: string;
  payload: unknown;
  createdAt: number;
};

/* ================= CHAT ADAPTER ================= */

export type ChatAdapter = {
  /* ---------- Meta ---------- */
  mode: ChatMode;
  features: ChatFeatureFlags;

  /* ---------- Inbox ---------- */
  inbox: () => string;
  searchInbox: (q: string) => string;

  /* ---------- Thread ---------- */
  getOrCreateConversation: () => string;
  threadInfo: (threadId: string) => string;

  pinThread: (threadId: string) => string;
  unpinThread: (threadId: string) => string;

  muteThread: (threadId: string) => string;
  unmuteThread: (threadId: string) => string;

  archiveThread: (threadId: string) => string;
  unarchiveThread: (threadId: string) => string;

  /* ---------- Read / Receipts ---------- */
  markRead: (threadId: string) => string;

  markSeenBatch: () => string;
  markDeliveredBatch: () => string;

  /* ---------- Messages ---------- */
  listMessages: (threadId: string) => string;
  listMessagesOlder: (threadId: string, cursor: string) => string;

  sendMessage: (threadId: string) => string;
  editMessage: (messageId: string) => string;

  deleteForMe: (messageId: string) => string;
  deleteForEveryone: (messageId: string) => string;

  messageInfo: (messageId: string) => string;

  /* ---------- Reactions ---------- */
  react: (messageId: string) => string;

  /* ---------- Forward ---------- */
  forwardTargets: () => string;
  forwardMessage: (messageId: string) => string;

  /* ---------- Upload ---------- */
  uploadEndpoint: string;
  uploadPresignEndpoint: string;

  /* ---------- Moderation / Safety ---------- */
  reportMessage: (messageId: string) => string;

  blockUser: () => string;
  unblockUser: () => string;
  reportUser: () => string;

  /* ---------- Offline ---------- */
  replayOfflineMessages: () => string;

  sendTyping: (threadId: string) => void;
  sendTypingStop: (threadId: string) => void;
  
  /* ---------- WebSocket ---------- */
  wsThread: (threadId: string) => string;
  wsTyping: (threadId: string) => string;
  wsPresence: (threadId: string) => string;
};
