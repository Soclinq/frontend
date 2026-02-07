/* ================= CORE MODES ================= */

export type ChatMode = "community" | "private";

/* ================= FEATURE FLAGS ================= */

export type ChatFeatureFlags = {
  /* Core messaging */
  reactions: boolean;
  forward: boolean;
  typing: boolean;
  edit: boolean;
  deleteForEveryone: boolean;

  /* Inbox / discovery */
  inbox?: boolean;
  searchInbox?: boolean;

  /* Read receipts */
  markRead?: boolean;               // legacy "mark read"
  readReceipts?: "thread" | "per-user"; // ✅ NEW (per-user seen)

  /* Thread management */
  pin?: boolean;
  mute?: boolean;
  archive?: boolean;

  joinLeave?: boolean;
  threadInfo?: boolean;

  /* Safety & moderation */
  reporting?: boolean;
  moderation?: boolean;
  safety?: boolean;

  emergencyAlerts?: boolean;

  /* Uploads */
  uploadPresign?: boolean;

  /* Presence */
  presence?: boolean;

  /* 🔐 Security */
  e2ee?: boolean;                  // encryption enabled
  e2eeKeyRotation?: boolean;       // supports rotating keys

  /* 🧠 Transport hints */
  batching?: boolean;              // server supports batching ACK/SEEN
  offlineReplay?: boolean;         // server can accept replayed messages
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

/* ================= E2EE ================= */

export type E2EEHandshake = {
  keyId: string;
  publicKey: string;
  createdAt: string;
};

export type RotateKeyPayload = {
  previousKeyId: string;
  newKeyId: string;
  publicKey: string;
};

/* ================= OFFLINE SYNC ================= */

export type OfflineReplayPayload = {
  clientTempId: string;
  threadId: string;
  payload: any;
  createdAt: number;
};

/* ================= CHAT ADAPTER ================= */

export type ChatAdapter = {
  /* ---------- Meta ---------- */
  mode: ChatMode;
  features: ChatFeatureFlags;

  /* ---------- Inbox ---------- */
  inbox?: () => string;
  searchInbox?: (q: string) => string;

  /* ---------- Thread ---------- */
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

  /* ---------- Read / Receipts ---------- */
  markRead?: (threadId: string) => string;

  markSeenBatch?: () => string;        // ✅ POST seen batch
  markDeliveredBatch?: () => string;   // ✅ POST delivered batch

  /* ---------- Messages ---------- */
  listMessages: (threadId: string) => string;
  listMessagesOlder: (threadId: string, cursor: string) => string;

  sendMessage: (threadId: string) => string;
  edit: (messageId: string) => string;

  deleteForMe: (messageId: string) => string;
  deleteForEveryone: (messageId: string) => string;

  messageInfo: (messageId: string) => string;

  /* ---------- Reactions ---------- */
  react: (messageId: string) => string;

  /* ---------- Forwarding ---------- */
  forwardTargets: () => string;
  forwardMessage: (messageId: string) => string;

  /* ---------- Upload ---------- */
  upload: () => string;
  uploadPresign?: () => string;

  /* ---------- Moderation ---------- */
  reportMessage?: (messageId: string) => string;

  modRemoveMessage?: (messageId: string) => string;
  modMuteUser?: (threadId: string) => string;
  modBanUser?: (threadId: string) => string;

  /* ---------- User Safety ---------- */
  blockUser?: () => string;
  unblockUser?: () => string;
  reportUser?: () => string;

  /* ---------- Alerts ---------- */
  sendAlert?: (threadId: string) => string;

  /* ---------- 🔐 E2EE ---------- */
  e2eeHandshake?: (threadId: string) => string; // fetch keys
  rotateE2EEKey?: () => string;                 // rotate key

  /* ---------- 📴 Offline ---------- */
  replayOfflineMessages?: () => string;         // bulk replay endpoint
  markSeenBulk?: (ids: string[]) => Promise<void>;


  /* ---------- WebSocket ---------- */
  wsPath: (threadId: string) => string;
  wsTypingPath?: (threadId: string) => string;
  wsPresencePath?: (threadId: string) => string;
};
