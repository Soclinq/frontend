import type { PublicUserProfile } from "@/types/profile";

/* =========================
   Chat Core Types
========================= */

export type ChatThreadType = "COMMUNITY" | "PRIVATE";

export type ChatMessageType = "TEXT" | "MEDIA" | "SYSTEM";

export type ChatMessageStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "seen"
  | "failed";

export type ChatAttachmentType = "IMAGE" | "AUDIO" | "VIDEO" | "FILE";

export type ChatAttachment = {
  id: string;
  type: ChatAttachmentType;
  url: string;
  thumbnailUrl?: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  durationMs?: number;
};

export type ChatReaction = {
  emoji: string;
  userIds: string[];
  count: number;
  reactedByMe?: boolean;
};

export type ChatReadReceipt = {
  user: PublicUserProfile;
  readAt?: string;
};

export type ChatDeliveredReceipt = {
  user: PublicUserProfile;
  deliveredAt?: string;
};

export type ChatReactionReceipt = {
  emoji: string;
  user: PublicUserProfile;
  createdAt?: string;
};


/**
 * ✅ Used inside message.replyTo
 */
export type ChatReplyPreview = {
  id: string;
  text?: string;
  senderName?: string;
} | null;

export type SeenByMap = Record<string, string>; // userId -> ISO timestamp

export type ChatThreadMeta = {
  isGroup?: boolean;
  memberCount?: number;
};

export interface ChatMessage {
  reactionReceipts?: ChatReactionReceipt[];
  deliveredReceipts?: ChatDeliveredReceipt[];
  threadMembers?: PublicUserProfile[];
  readReceipts?: ChatReadReceipt[];
  id: string;
  clientTempId?: string;
  hubId: string;

  messageType: "TEXT" | "MEDIA" | "SYSTEM";
  text?: string;

  sender: Sender;
  createdAt: string;
  threadMeta?: ChatThreadMeta;

  myReaction?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  retryCount?: number;

  replyTo?: {
    id: string;
    text?: string;
    senderName?: string;
  } | null;

  attachments?: ChatAttachment[];
  reactions?: ChatReaction[];
  isMine: boolean;
  status?: ChatMessageStatus;
  seenBy?: SeenByMap;
  e2eeKeyId?: string;
  messageHash?: string;
}

export type Sender = {
  id: string;
  name: string;
  photo?: string | null;
};


export type ForwardTarget = {
  id: string;
  name: string;
  type?: string;
  photo?: string | null;
};

export type SendMessagePayload = {
  clientTempId: string;
  text?: string;
  messageType: "TEXT" | "MEDIA";
  replyToId?: string | null;
  attachments?: ChatAttachment[];
};


