import { ChatAdapter } from "@/types/chatAdapterTypes";

export const privateChatAdapter: ChatAdapter = {
  /* ================= META ================= */
  mode: "private",

  /* ================= INBOX ================= */
  inbox: () => `/communities/private/chat/inbox/`,
  searchInbox: (q) =>
    `/communities/private/chat/search/?q=${encodeURIComponent(q)}`,

  /* ================= THREAD ================= */
  getOrCreateConversation: () =>
    `/communities/private/chat/conversations/get-or-create/`,

  threadInfo: (id) =>
    `/communities/private/chat/conversations/${id}/`,

  pinThread: (id) =>
    `/communities/private/chat/conversations/${id}/pin/`,
  unpinThread: (id) =>
    `/communities/private/chat/conversations/${id}/unpin/`,

  muteThread: (id) =>
    `/communities/private/chat/conversations/${id}/mute/`,
  unmuteThread: (id) =>
    `/communities/private/chat/conversations/${id}/unmute/`,

  archiveThread: (id) =>
    `/communities/private/chat/conversations/${id}/archive/`,
  unarchiveThread: (id) =>
    `/communities/private/chat/conversations/${id}/unarchive/`,

  /* ================= READ / RECEIPTS ================= */
  markRead: (id) =>
    `/communities/private/chat/conversations/${id}/mark-read/`,

  // 🔄 Optional batch endpoints (enable only if backend supports them)
  // markSeenBatch: () => `/communities/private/chat/messages/seen/batch/`,
  // markDeliveredBatch: () => `/communities/private/chat/messages/delivered/batch/`,

  /* ================= MESSAGES ================= */
  listMessages: (id) =>
    `/communities/private/chat/conversations/${id}/messages/`,

  listMessagesOlder: (id, cursor) =>
    `/communities/private/chat/conversations/${id}/messages/?cursor=${encodeURIComponent(
      cursor
    )}`,

  sendMessage: (id) =>
    `/communities/private/chat/conversations/${id}/messages/`,

  edit: (messageId) =>
    `/communities/private/chat/messages/${messageId}/edit/`,

  deleteForMe: (messageId) =>
    `/communities/private/chat/messages/${messageId}/delete-for-me/`,

  deleteForEveryone: (messageId) =>
    `/communities/private/chat/messages/${messageId}/`,

  messageInfo: (messageId) =>
    `/communities/private/chat/messages/${messageId}/info/`,

  /* ================= REACTIONS ================= */
  react: (messageId) =>
    `/communities/private/chat/messages/${messageId}/reactions/`,

  /* ================= FORWARD ================= */
  forwardTargets: () =>
    `/communities/private/chat/forward-targets/`,

  forwardMessage: (messageId) =>
    `/communities/private/chat/messages/${messageId}/forward/`,

  /* ================= UPLOAD ================= */
  upload: () =>
    `/communities/private/chat/uploads/`,

  uploadPresign: () =>
    `/communities/private/chat/uploads/presign/`,

  /* ================= SAFETY ================= */
  reportMessage: (messageId) =>
    `/communities/private/chat/messages/${messageId}/report/`,

  blockUser: () =>
    `/communities/private/chat/block/`,
  unblockUser: () =>
    `/communities/private/chat/unblock/`,
  reportUser: () =>
    `/communities/private/chat/report/`,

  /* ================= 🔐 E2EE (READY) ================= */
  // Enable once backend is live
  // e2eeHandshake: (threadId) =>
  //   `/communities/private/chat/conversations/${threadId}/e2ee/handshake/`,
  // rotateE2EEKey: () =>
  //   `/communities/private/chat/e2ee/rotate-key/`,

  /* ================= 📴 OFFLINE (READY) ================= */
  // replayOfflineMessages: () =>
  //   `/communities/private/chat/messages/replay/`,

  /* ================= WEBSOCKET ================= */
  wsPath: (id) =>
    `/ws/private-chat/${id}/`,

  wsTypingPath: (id) =>
    `/ws/private-chat/${id}/typing/`,

  wsPresencePath: (id) =>
    `/ws/private-chat/${id}/presence/`,

  /* ================= FEATURES ================= */
  features: {
    /* Core */
    reactions: true,
    forward: true,
    typing: true,
    edit: true,
    deleteForEveryone: true,

    /* Inbox */
    inbox: true,
    searchInbox: true,

    /* Read receipts */
    markRead: true,
    readReceipts: "per-user", // ✅ IMPORTANT

    /* Thread */
    pin: true,
    mute: true,
    archive: true,
    threadInfo: true,

    /* Upload */
    uploadPresign: true,

    /* Presence */
    presence: true,

    /* Safety */
    reporting: true,
    safety: true,

    /* 🔐 Security */
    e2ee: true,
    e2eeKeyRotation: true,

    /* 🧠 Transport */
    batching: true,        // client supports batching
    offlineReplay: true,  // client can replay
  },
};
