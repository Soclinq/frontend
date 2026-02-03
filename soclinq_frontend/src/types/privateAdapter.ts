import { ChatAdapter } from "@/types/chatAdapterTypes";

export const privateChatAdapter: ChatAdapter = {
  mode: "private",

  /* =========================
     Inbox
  ========================= */
  inbox: () => `/private/chat/inbox/`,

  /* =========================
     Thread info / creation
     ✅ use generic "threadInfo" and "joinThread/leaveThread" are not used here
  ========================= */
  threadInfo: (conversationId) => `/private/chat/conversations/${conversationId}/`,
  listMessages: (conversationId) =>
    `/private/chat/conversations/${conversationId}/messages/`,

  listMessagesOlder: (conversationId, cursor) =>
    `/private/chat/conversations/${conversationId}/messages/?cursor=${encodeURIComponent(
      cursor
    )}`,

  sendMessage: (conversationId) =>
    `/private/chat/conversations/${conversationId}/messages/`,

  /* =========================
     Read sync
  ========================= */
  markRead: (conversationId) =>
    `/private/chat/conversations/${conversationId}/mark-read/`,

  /* =========================
     Uploads
  ========================= */
  upload: () => `/private/chat/uploads/`,
  uploadPresign: () => `/private/chat/uploads/presign/`,

  /* =========================
     Message actions
  ========================= */
  deleteForMe: (messageId) => `/private/chat/messages/${messageId}/delete-for-me/`,
  deleteForEveryone: (messageId) => `/private/chat/messages/${messageId}/`,

  edit: (messageId) => `/private/chat/messages/${messageId}/edit/`,

  forwardTargets: () => `/private/chat/forward-targets/`,
  forwardMessage: (messageId) => `/private/chat/messages/${messageId}/forward/`,

  messageInfo: (messageId) => `/private/chat/messages/${messageId}/info/`,
  react: (messageId) => `/private/chat/messages/${messageId}/reactions/`,

  /* =========================
     Per-user conversation controls
  ========================= */
  pinThread: (conversationId) => `/private/chat/conversations/${conversationId}/pin/`,
  unpinThread: (conversationId) => `/private/chat/conversations/${conversationId}/unpin/`,

  muteThread: (conversationId) => `/private/chat/conversations/${conversationId}/mute/`,
  unmuteThread: (conversationId) => `/private/chat/conversations/${conversationId}/unmute/`,

  archiveThread: (conversationId) =>
    `/private/chat/conversations/${conversationId}/archive/`,
  unarchiveThread: (conversationId) =>
    `/private/chat/conversations/${conversationId}/unarchive/`,

  /* =========================
     Safety + reporting
  ========================= */
  reportMessage: (messageId) => `/private/chat/messages/${messageId}/report/`,

  /* =========================
     Websocket
  ========================= */
  wsPath: (conversationId) => `/ws/private-chat/${conversationId}/`,
  wsTypingPath: (conversationId) => `/ws/private-chat/${conversationId}/typing/`,
  wsPresencePath: () => `/ws/presence/`,

  /* =========================
     Feature flags
  ========================= */
  features: {
    reactions: true,
    forward: true,
    typing: true,
    edit: true,
    deleteForEveryone: true,

    inbox: true,
    markRead: true,
    pin: true,
    mute: true,
    archive: true,

    reporting: true,
    uploadPresign: true,
    presence: true,
  },
};
