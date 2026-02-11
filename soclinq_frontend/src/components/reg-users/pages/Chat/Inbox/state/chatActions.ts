import { authFetch } from "@/lib/authFetch";

/* =====================================================
   HELPERS
===================================================== */

async function parseJSON(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || "Request failed");
  }
  return data;
}

/* =====================================================
   CHAT OPEN / CREATE
===================================================== */

export async function openPrivateChat(userId: string) {
  const res = await authFetch("/communities/private/open/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });

  return parseJSON(res);
}

export async function createGroupChat(userIds: string[]) {
  const res = await authFetch("/communities/private/create-group/", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_ids: userIds }),
  });

  return parseJSON(res);
}

/* =====================================================
   INBOX ACTIONS
===================================================== */

export async function pinChats(chatIds: string[]) {
  const res = await authFetch("/communities/chats/pin/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_ids: chatIds }),
  });

  return parseJSON(res);
}

export async function muteChats(chatIds: string[]) {
  const res = await authFetch("/communities/chats/mute/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_ids: chatIds }),
  });

  return parseJSON(res);
}

export async function archiveChats(chatIds: string[]) {
  const res = await authFetch("/communities/chats/archive/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_ids: chatIds }),
  });

  return parseJSON(res);
}

export async function markChatsRead(chatIds: string[], read: boolean) {
  const res = await authFetch("/communities/chats/mark-read/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_ids: chatIds, read }),
  });

  return parseJSON(res);
}

export async function deleteChats(chatIds: string[]) {
  const res = await authFetch("/communities/chats/delete/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_ids: chatIds }),
  });

  return parseJSON(res);
}

/* =====================================================
   GROUP ACTIONS
===================================================== */

export async function exitGroup(groupId: string) {
  const res = await authFetch(`/communities/groups/${groupId}/exit/`, {
    method: "POST",
  });

  return parseJSON(res);
}

export async function shareGroup(groupId: string) {
  const res = await authFetch(`/communities/groups/${groupId}/share/`);
  return parseJSON(res);
}

/* =====================================================
   CONTACT ACTIONS
===================================================== */

export async function blockContact(userId: string) {
  const res = await authFetch("/users/block/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });

  return parseJSON(res);
}

/* =====================================================
   MESSAGE ACTIONS
===================================================== */

export async function deleteMessages(messageIds: string[]) {
  const res = await authFetch("/messages/delete/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message_ids: messageIds }),
  });

  return parseJSON(res);
}

export async function forwardMessages(
  messageIds: string[],
  targetChatId: string
) {
  const res = await authFetch("/messages/forward/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message_ids: messageIds, target_chat_id: targetChatId }),
  });

  return parseJSON(res);
}
