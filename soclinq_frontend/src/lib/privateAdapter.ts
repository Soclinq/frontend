import type { ChatAdapter } from "@/types/chatAdapterTypes";

/* ================= BASE URLS ================= */

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export const privateChatAdapter: ChatAdapter = {
  mode: "private",

  features: {
    reactions: true,
    forward: true,
    typing: true,
    edit: true,
    deleteForEveryone: true,
    joinLeave: true,

    inbox: true,
    searchInbox: true,

    markRead: true,
    readReceipts: "per-user",

    pin: true,
    mute: true,
    archive: true,
    threadInfo: true,

    uploads: true,
    uploadPresign: true,
    presence: true,
    reporting: true,
    safety: true,

    e2ee: true,
    e2eeKeyRotation: true,

    batching: true,
    offlineReplay: true,
  },

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

  /* ================= READ ================= */

  markRead: (id) =>
    `/communities/private/chat/conversations/${id}/mark-read/`,

  markSeenBatch: () =>
    `/communities/private/chat/messages/seen/batch/`,

  markDeliveredBatch: () =>
    `/communities/private/chat/messages/delivered/batch/`,

  /* ================= MESSAGES ================= */

  listMessages: (id) =>
    `/communities/private/chat/conversations/${id}/messages/`,
  forwardMessages: () =>
    `/communities/private/chat/messages/forward/`,

  listMessagesOlder: (id, cursor) =>
    `/communities/private/chat/conversations/${id}/messages/?cursor=${encodeURIComponent(cursor)}`,

  sendMessage: (id) =>
    `/communities/private/chat/conversations/${id}/messages/`,

  editMessage: (messageId) =>
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

  uploadEndpoint: `/communities/private/chat/uploads/`,
  uploadPresignEndpoint: `/communities/private/chat/uploads/presign/`,

  /* ================= SAFETY ================= */

  reportMessage: (messageId) =>
    `/communities/private/chat/messages/${messageId}/report/`,

  blockUser: () => `/communities/private/chat/block/`,
  unblockUser: () => `/communities/private/chat/unblock/`,
  reportUser: () => `/communities/private/chat/report/`,

  /* ================= OFFLINE ================= */

  replayOfflineMessages: () =>
    `/communities/private/chat/messages/replay/`,

  /* ================= TYPING ================= */

  sendTyping: (threadId) => {
    window.dispatchEvent(
      new CustomEvent("chat:typing", {
        detail: { threadId, typing: true },
      })
    );
  },

  sendTypingStop: (threadId) => {
    window.dispatchEvent(
      new CustomEvent("chat:typing", {
        detail: { threadId, typing: false },
      })
    );
  },

  /* ================= WEBSOCKET ================= */

  wsThread: (id) => `${WS_BASE}/ws/private-chat/${id}/`,
  wsTyping: (id) => `${WS_BASE}/ws/private-chat/${id}/typing/`,
  wsPresence: (id) => `${WS_BASE}/ws/private-chat/${id}/presence/`,
};
