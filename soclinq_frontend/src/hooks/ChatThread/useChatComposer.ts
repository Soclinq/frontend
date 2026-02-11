// hooks/ChatThread/useChatComposer.ts

import { nanoid } from "nanoid";
import type {
  ChatMessage,
  ChatAttachment,
  SendMessagePayload,
} from "@/types/chat";
import type { ChatAdapter } from "@/types/chatAdapterTypes";
import type { PublicUserProfile } from "@/types/profile";

export function useChatComposer() {
  function build({
    text,
    attachments,
    replyTo,
    hubId,
    sender,
  }: {
    text: string;
    attachments: File[];
    replyTo: ChatMessage["replyTo"];
    hubId: string;
    sender: PublicUserProfile;
  }) {
    const clientTempId = `tmp-${nanoid()}`;
    const createdAt = new Date().toISOString();

    const optimisticAttachments: ChatAttachment[] = attachments.map(file => ({
      id: nanoid(),
      type: inferAttachmentType(file),
      url: "", // server fills later
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    }));
    
    const payload: SendMessagePayload = {
      clientTempId,
      text: text.trim() || undefined,
      messageType: optimisticAttachments.length > 0 ? "MEDIA" : "TEXT",
      replyToId: replyTo?.id ?? null,
      attachments: optimisticAttachments,   // ✅ FIXED
    };
    
    const optimistic: ChatMessage = {
      id: clientTempId,
      clientTempId,
      hubId,

      messageType: payload.messageType,
      text: payload.text,

      sender: mapSender(sender),

      createdAt,
      replyTo: replyTo ?? null,
      attachments: optimisticAttachments,
      isMine: true,
      status: "sending",
    };

    return { payload, optimistic };
  }

  /* =========================
     BUILD VOICE MESSAGE
  ========================= */

  function buildVoice({
    file,
    hubId,
    sender,
  }: {
    file: File;
    hubId: string;
    sender: PublicUserProfile;
  }) {
    const clientTempId = `tmp-voice-${nanoid()}`;
    const createdAt = new Date().toISOString();

    const payload: SendMessagePayload = {
      clientTempId,
      messageType: "MEDIA",
      attachments: [],
    };

    const optimistic: ChatMessage = {
      id: clientTempId,
      clientTempId,
      hubId,

      messageType: "MEDIA",

      sender: mapSender(sender),

      createdAt,
      attachments: [
        {
          id: nanoid(),
          type: "AUDIO",
          url: "",
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        },
      ],
      isMine: true,
      status: "sending",
    };

    return { payload, optimistic };
  }

  /* =========================
     EDIT MESSAGE
  ========================= */

  async function edit({
    messageId,
    text,
    adapter,
  }: {
    messageId: string;
    text: string;
    adapter: ChatAdapter;
  }) {
    await adapter.editMessage(messageId);
  }

  return {
    build,
    buildVoice,
    edit,
  };
}

/* =========================
   HELPERS
========================= */

function mapSender(
  user: PublicUserProfile | null | undefined
): ChatMessage["sender"] {
  if (!user) {
    console.error("❌ mapSender received invalid user:", user);

    return {
      id: "unknown",
      name: "Unknown",
      photo: null,
    };
  }

  return {
    id: user.id,
    name:
      user.full_name ??
      user.username ??
      "Unknown",
    photo: user.photo ?? null,
  };
}


function inferAttachmentType(file: File): ChatAttachment["type"] {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (file.type.startsWith("audio/")) return "AUDIO";
  if (file.type.startsWith("video/")) return "VIDEO";
  return "FILE";
}
