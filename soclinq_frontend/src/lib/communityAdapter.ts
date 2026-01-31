import { ChatAdapter } from "@/types/adapterTypes";
export const communityChatAdapter: ChatAdapter = {
  mode: "community",

  listMessages: (id) => `/communities/chat/groups/${id}/messages/`,
  listMessagesOlder: (id, cursor) =>
    `/communities/chat/groups/${id}/messages/?cursor=${encodeURIComponent(cursor)}`,

  sendMessage: (id) => `/communities/chat/groups/${id}/messages/`,
  upload: () => `/communities/chat/uploads/`,

  deleteForMe: (messageId) => `/communities/chat/messages/${messageId}/delete-for-me/`,
  deleteForEveryone: (messageId) => `/communities/chat/messages/${messageId}/`,

  edit: (messageId) => `/communities/chat/messages/${messageId}/edit/`,

  forwardTargets: () => `/communities/chat/forward-targets/`,
  forwardMessage: (messageId) => `/communities/chat/messages/${messageId}/forward/`,

  messageInfo: (messageId) => `/communities/chat/messages/${messageId}/info/`,
  react: (messageId) => `/communities/chat/messages/${messageId}/reactions/`,

  wsPath: (id) => `/ws/chat/${id}/`,

  features: {
    reactions: true,
    forward: true,
    typing: true,
    edit: true,
    deleteForEveryone: true,
  },
};
