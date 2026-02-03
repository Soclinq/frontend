import type { PublicUserProfile } from "@/types/profile";

/* =========================
   Chat Core Types
========================= */

export type ChatThreadType = "COMMUNITY" | "PRIVATE";

export type ChatMessageType = "TEXT" | "MEDIA" | "SYSTEM";

export type ChatMessageStatus = "sending" | "sent" | "failed";

export type ChatAttachmentType = "IMAGE" | "AUDIO" | "VIDEO" | "FILE";

export type ChatAttachment = {
  id: string;
  type: ChatAttachmentType;
  url: string;

  fileName?: string;
  mimeType?: string;
  thumbnailUrl?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  durationMs?: number;
};

export type ChatReaction = {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
};

/**
 * ✅ Used inside message.replyTo
 */
export type ChatReplyPreview = {
  id: string;
  text?: string;
  senderName?: string;
} | null;

/**
 * ✅ The ONE message type for your whole app
 */
export type ChatMessage = {
  id: string;
  clientTempId?: string;

  /** for grouping (hub / thread / conversation) */
  hubId: string;

  messageType: ChatMessageType;

  /** optional because MEDIA and SYSTEM may not have text */
  text?: string;

  /** use public profile format */
  sender: Pick<PublicUserProfile, "id" | "full_name" | "username" | "photo"> & {
    name: string; // keep your existing usage msg.sender.name
  };

  createdAt: string;

  isMine: boolean;
  status?: ChatMessageStatus;

  editedAt?: string | null;
  deletedAt?: string | null;

  replyTo?: ChatReplyPreview;

  attachments?: ChatAttachment[];
  reactions?: ChatReaction[];

  myReaction?: string | null;
};
