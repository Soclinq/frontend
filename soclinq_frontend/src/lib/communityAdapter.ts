import type { ChatAdapter } from "@/types/chatAdapterTypes";

export const communityChatAdapter: ChatAdapter = {
  /* ================= META ================= */

  mode: "community",

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
    readReceipts: "thread",

    /* Thread */
    pin: true,
    joinLeave: true,
    mute: true,
    archive: true,
    threadInfo: true,

    /* Uploads */
    uploads: true,
    uploadPresign: true,

    /* Presence */
    presence: true,

    /* Safety */
    reporting: true,
    safety: true,

    /* Security */
    e2ee: false,
    e2eeKeyRotation: false,

    /* Transport */
    batching: true,
    offlineReplay: true,
  },

  /* ================= INBOX ================= */

  inbox: () => `/communities/chat/inbox/`,

  searchInbox: (q: string) =>
    `/communities/search/?q=${encodeURIComponent(q)}`,

  /* ================= THREAD ================= */

  getOrCreateConversation: () => "", // not applicable for community

  threadInfo: (threadId: string) =>
    `/communities/hubs/${threadId}/`,

  pinThread: (threadId: string) =>
    `/communities/hubs/${threadId}/pin/`,

  unpinThread: (threadId: string) =>
    `/communities/hubs/${threadId}/unpin/`,

  muteThread: (threadId: string) =>
    `/communities/hubs/${threadId}/mute/`,

  unmuteThread: (threadId: string) =>
    `/communities/hubs/${threadId}/unmute/`,

  archiveThread: (threadId: string) =>
    `/communities/hubs/${threadId}/archive/`,

  unarchiveThread: (threadId: string) =>
    `/communities/hubs/${threadId}/unarchive/`,

  /* ================= READ / RECEIPTS ================= */

  markRead: (threadId: string) =>
    `/communities/chat/groups/${threadId}/mark-read/`,

  markSeenBatch: () => "",        // optional in community mode
  markDeliveredBatch: () => "",   // optional in community mode

  /* ================= MESSAGES ================= */

  listMessages: (threadId: string) =>
    `/communities/chat/groups/${threadId}/messages/`,

  listMessagesOlder: (threadId: string, cursor: string) =>
    `/communities/chat/groups/${threadId}/messages/?cursor=${encodeURIComponent(cursor)}`,

  sendMessage: (threadId: string) =>
    `/communities/chat/groups/${threadId}/messages/`,

  editMessage: (messageId: string) =>
    `/communities/chat/messages/${messageId}/edit/`,

  deleteForMe: (messageId: string) =>
    `/communities/chat/messages/${messageId}/delete-for-me/`,

  deleteForEveryone: (messageId: string) =>
    `/communities/chat/messages/${messageId}/`,

  messageInfo: (messageId: string) =>
    `/communities/chat/messages/${messageId}/info/`,

  /* ================= REACTIONS ================= */

  react: (messageId: string) =>
    `/communities/chat/messages/${messageId}/reactions/`,

  /* ================= FORWARD ================= */

  forwardTargets: () =>
    `/communities/chat/forward-targets/`,

  forwardMessage: (messageId: string) =>
    `/communities/chat/messages/${messageId}/forward/`,

  /* ================= UPLOAD ================= */

  uploadEndpoint: `/communities/chat/uploads/`,
  uploadPresignEndpoint: `/communities/chat/uploads/presign/`,

  /* ================= SAFETY ================= */

  reportMessage: (messageId: string) =>
    `/communities/chat/messages/${messageId}/report/`,

  blockUser: () => "",     // not valid in community chats
  unblockUser: () => "",
  reportUser: () => "",

  /* ================= OFFLINE ================= */

  replayOfflineMessages: () => "",

  sendTyping: () => {},      // handled by WS channel
  sendTypingStop: () => {},

  /* ================= WEBSOCKET ================= */

  wsThread: (threadId: string) =>
    `/ws/community-chat/${threadId}/`,

  wsTyping: (threadId: string) =>
    `/ws/community-chat/${threadId}/typing/`,

  wsPresence: (threadId: string) =>
    `/ws/community-chat/${threadId}/presence/`,
};
