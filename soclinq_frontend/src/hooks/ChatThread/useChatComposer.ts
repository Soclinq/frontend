import { useCallback, useRef, useState } from "react";
import type { ChatMessage, SendMessagePayload } from "@/types/chat";

/* ================= TYPES ================= */

type Params = {
  threadId: string;
  currentUserId: string;

  connected: boolean;
  sendMessageWS: (payload: SendMessagePayload) => void;

  draft: {
    text: string;
    replyToId: string | null;
    attachments: any[];
  };

  clearDraft: () => void;

  uploadAttachments: (files: File[]) => Promise<any[]>;

  queueOfflineMessage?: (item: {
    clientTempId: string;
    threadId: string;
    payload: SendMessagePayload;
    createdAt: number;
  }) => Promise<void>;

  encrypt?: (text: string) => Promise<string>;
};

/* ================= HOOK ================= */

export function useChatComposer({
  threadId,
  currentUserId,
  connected,
  sendMessageWS,
  draft,
  clearDraft,
  uploadAttachments,
  queueOfflineMessage,
  encrypt,
}: Params) {
  const [sending, setSending] = useState(false);
  const inflightRef = useRef<Set<string>>(new Set());

  /* ================= HELPERS ================= */

  const markInflight = (id: string) => {
    inflightRef.current.add(id);
    setTimeout(() => inflightRef.current.delete(id), 1000 * 60 * 10);
  };

  /* ================= SEND ================= */

  const send = useCallback(async () => {
    const hasText = Boolean(draft.text.trim());
    const hasFiles = draft.attachments.length > 0;

    if (!hasText && !hasFiles) return;
    if (sending) return;

    const clientTempId = `tmp-${Date.now()}`;

    let encryptedText = draft.text;
    if (encrypt && draft.text) {
      try {
        encryptedText = await encrypt(draft.text);
      } catch {
        encryptedText = draft.text;
      }
    }

    const payload: SendMessagePayload = {
      clientTempId,
      text: encryptedText,
      messageType: hasFiles ? "MEDIA" : "TEXT",
      replyToId: draft.replyToId,
      attachments: [],
    };

    clearDraft();

    // OFFLINE → queue and bail
    if (!connected) {
      if (queueOfflineMessage) {
        await queueOfflineMessage({
          clientTempId,
          threadId,
          payload,
          createdAt: Date.now(),
        });
      }
      return;
    }

    try {
      setSending(true);

      // Upload first if needed
      if (hasFiles) {
        payload.attachments = await uploadAttachments(
          draft.attachments.map((a) => a.file).filter(Boolean)
        );
      }

      if (inflightRef.current.has(clientTempId)) return;

      markInflight(clientTempId);
      sendMessageWS(payload);
    } finally {
      setSending(false);
    }
  }, [
    draft,
    connected,
    encrypt,
    clearDraft,
    queueOfflineMessage,
    sendMessageWS,
    uploadAttachments,
    sending,
  ]);

  /* ================= VOICE ================= */

  const sendVoice = useCallback(
    async (file: File) => {
      if (!connected) return;

      const clientTempId = `tmp-voice-${Date.now()}`;

      const attachments = await uploadAttachments([file]);

      const payload: SendMessagePayload = {
        clientTempId,
        messageType: "MEDIA",
        attachments,
      };

      if (inflightRef.current.has(clientTempId)) return;

      markInflight(clientTempId);
      sendMessageWS(payload);
    },
    [connected, uploadAttachments, sendMessageWS]
  );

  return {
    send,
    sendVoice,
    sending,
  };
}
