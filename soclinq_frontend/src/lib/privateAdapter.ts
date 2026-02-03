import { ChatAdapter } from "@/types/chatAdapterTypes";

export const privateChatAdapter: ChatAdapter = {
  mode: "private",

  inbox: () => `/private/chat/inbox/`,
  searchInbox: (q) => `/private/chat/search/?q=${encodeURIComponent(q)}`,

  getOrCreateConversation: () => `/private/chat/conversations/get-or-create/`,
  threadInfo: (id) => `/private/chat/conversations/${id}/`,

  pinThread: (id) => `/private/chat/conversations/${id}/pin/`,
  unpinThread: (id) => `/private/chat/conversations/${id}/unpin/`,

  muteThread: (id) => `/private/chat/conversations/${id}/mute/`,
  unmuteThread: (id) => `/private/chat/conversations/${id}/unmute/`,

  archiveThread: (id) => `/private/chat/conversations/${id}/archive/`,
  unarchiveThread: (id) => `/private/chat/conversations/${id}/unarchive/`,

  markRead: (id) => `/private/chat/conversations/${id}/mark-read/`,

  listMessages: (id) => `/private/chat/conversations/${id}/messages/`,
  listMessagesOlder: (id, cursor) =>
    `/private/chat/conversations/${id}/messages/?cursor=${encodeURIComponent(
      cursor
    )}`,

  sendMessage: (id) => `/private/chat/conversations/${id}/messages/`,

  upload: () => `/private/chat/uploads/`,
  uploadPresign: () => `/private/chat/uploads/presign/`,

  deleteForMe: (messageId) => `/private/chat/messages/${messageId}/delete-for-me/`,
  deleteForEveryone: (messageId) => `/private/chat/messages/${messageId}/`,

  edit: (messageId) => `/private/chat/messages/${messageId}/edit/`,

  forwardTargets: () => `/private/chat/forward-targets/`,
  forwardMessage: (messageId) => `/private/chat/messages/${messageId}/forward/`,

  messageInfo: (messageId) => `/private/chat/messages/${messageId}/info/`,
  react: (messageId) => `/private/chat/messages/${messageId}/reactions/`,

  reportMessage: (messageId) => `/private/chat/messages/${messageId}/report/`,

  blockUser: () => `/private/chat/block/`,
  unblockUser: () => `/private/chat/unblock/`,
  reportUser: () => `/private/chat/report/`,

  wsPath: (id) => `/ws/private-chat/${id}/`,
  wsTypingPath: (id) => `/ws/private-chat/${id}/typing/`,
  wsPresencePath: (id) => `/ws/private-chat/${id}/presence/`,

  features: {
    reactions: true,
    forward: true,
    typing: true,
    edit: true,
    deleteForEveryone: true,

    inbox: true,
    searchInbox: true,

    markRead: true,

    pin: true,
    mute: true,
    archive: true,

    threadInfo: true,

    reporting: true,
    uploadPresign: true,

    presence: true,

    safety: true,
  },
};
