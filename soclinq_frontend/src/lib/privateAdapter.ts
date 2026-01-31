import { ChatAdapter } from "@/types/adapterTypes";

export const privateChatAdapter: ChatAdapter = {
  mode: "private",

  listMessages: (id) => `/private/chat/conversations/${id}/messages/`,
  listMessagesOlder: (id, cursor) =>
    `/private/chat/conversations/${id}/messages/?cursor=${encodeURIComponent(cursor)}`,

  sendMessage: (id) => `/private/chat/conversations/${id}/messages/`,
  upload: () => `/private/chat/uploads/`,

  deleteForMe: (messageId) => `/private/chat/messages/${messageId}/delete-for-me/`,
  deleteForEveryone: (messageId) => `/private/chat/messages/${messageId}/`,

  edit: (messageId) => `/private/chat/messages/${messageId}/edit/`,

  forwardTargets: () => `/private/chat/forward-targets/`,
  forwardMessage: (messageId) => `/private/chat/messages/${messageId}/forward/`,

  messageInfo: (messageId) => `/private/chat/messages/${messageId}/info/`,
  react: (messageId) => `/private/chat/messages/${messageId}/reactions/`,

  wsPath: (id) => `/ws/private-chat/${id}/`,

  features: {
    reactions: true,
    forward: true,
    typing: true,
    edit: true,
    deleteForEveryone: true,
  },
};
