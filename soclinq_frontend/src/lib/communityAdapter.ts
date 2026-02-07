import { ChatAdapter } from "@/types/chatAdapterTypes";

export const communityChatAdapter: ChatAdapter = {
  mode: "community",

  inbox: () => `/communities/chat/inbox/`,
  searchInbox: (q) => `/communities/search/?q=${encodeURIComponent(q)}`,

  threadInfo: (hubId) => `/communities/hubs/${hubId}/`,

  joinThread: (hubId) => `/communities/hubs/${hubId}/join/`,
  leaveThread: (hubId) => `/communities/hubs/${hubId}/leave/`,

  pinThread: (hubId) => `/communities/hubs/${hubId}/pin/`,
  unpinThread: (hubId) => `/communities/hubs/${hubId}/unpin/`,

  muteThread: (hubId) => `/communities/hubs/${hubId}/mute/`,
  unmuteThread: (hubId) => `/communities/hubs/${hubId}/unmute/`,

  archiveThread: (hubId) => `/communities/hubs/${hubId}/archive/`,
  unarchiveThread: (hubId) => `/communities/hubs/${hubId}/unarchive/`,

  markRead: (hubId) => `/communities/chat/groups/${hubId}/mark-read/`,

  listMessages: (hubId) => `/communities/chat/groups/${hubId}/messages/`,
  listMessagesOlder: (hubId, cursor) =>
    `/communities/chat/groups/${hubId}/messages/?cursor=${encodeURIComponent(
      cursor
    )}`,

  sendMessage: (hubId) => `/communities/chat/groups/${hubId}/messages/`,

  upload: () => `/communities/chat/uploads/`,
  uploadPresign: () => `/communities/chat/uploads/presign/`,

  deleteForMe: (messageId) =>
    `/communities/chat/messages/${messageId}/delete-for-me/`,
  deleteForEveryone: (messageId) => `/communities/chat/messages/${messageId}/`,

  edit: (messageId) => `/communities/chat/messages/${messageId}/edit/`,

  forwardTargets: () => `/communities/chat/forward-targets/`,
  forwardMessage: (messageId) =>
    `/communities/chat/messages/${messageId}/forward/`,

  messageInfo: (messageId) => `/communities/chat/messages/${messageId}/info/`,
  react: (messageId) => `/communities/chat/messages/${messageId}/reactions/`,

  reportMessage: (messageId) => `/communities/chat/messages/${messageId}/report/`,

  modRemoveMessage: (messageId) =>
    `/communities/mod/messages/${messageId}/remove/`,
  modMuteUser: (hubId) => `/communities/mod/hubs/${hubId}/mute-user/`,
  modBanUser: (hubId) => `/communities/mod/hubs/${hubId}/ban-user/`,

  sendAlert: (hubId) => `/communities/chat/groups/${hubId}/alerts/`,

  wsPath: (hubId) => `/ws/community-chat/${hubId}/`,
  wsTypingPath: (hubId) => `/ws/community-chat/${hubId}/typing/`,
  wsPresencePath: (hubId) => `/ws/community-chat/${hubId}/presence/`,

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

    joinLeave: true,
    threadInfo: true,

    reporting: true,
    moderation: true,
    emergencyAlerts: true,

    uploadPresign: true,

    presence: true,
  },
};
