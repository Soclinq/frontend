"use client";

import { useState, useMemo } from "react";
import type { ChatMessage, SendMessagePayload } from "@/types/chat";
import type { ChatAdapter } from "@/types/chatAdapterTypes";

import {
  useChatComposer,
  useChatDrafts,
  useChatUploads,
  useChatRateLimiter,
  useChatNetworkAwareness,
  useChatErrorBoundary,
  useChatTyping,
} from "@/hooks/ChatThread";

import { queueOfflineMessage } from "@/lib/chatOfflineQueue";

type Options = {
  threadId: string;
  adapter: ChatAdapter;
  currentUserId: string;
  sendMessageWS: (payload: SendMessagePayload) => void;
  addOptimisticMessage: (msg: ChatMessage) => void;
};

export function useChatComposerController({
  threadId,
  adapter,
  currentUserId,
  sendMessageWS,
  addOptimisticMessage,
}: Options) {
  /* ================= Core input ================= */
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ================= Hooks ================= */
  const composer = useChatComposer();
  const drafts = useChatDrafts(threadId);
  const uploads = useChatUploads(adapter);
  const typing = useChatTyping(adapter, threadId);

  const rateLimiter = useChatRateLimiter({
    max: 5,
    perMs: 3000,
  });

  const network = useChatNetworkAwareness();
  const reportError = useChatErrorBoundary();

  /* ================= Derived ================= */
  const canSend = useMemo(() => {
    return Boolean(
      input.trim() ||
        attachments.length > 0 ||
        editingId
    );
  }, [input, attachments, editingId]);

  /* ================= Draft sync ================= */
  function updateInput(v: string) {
    setInput(v);
    drafts.save(v);
    typing.send();
  }

  /* ================= Reply / Edit ================= */
  function startReply(msg: ChatMessage) {
    setReplyTo(msg);
  }

  function cancelReply() {
    setReplyTo(null);
  }

  function startEdit(msg: ChatMessage) {
    setEditingId(msg.id);
    setInput(msg.text || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setInput("");
  }

  /* ================= SEND PIPELINE ================= */
  async function send() {
    if (!canSend) return;

    if (!rateLimiter.canSend()) {
      return;
    }

    rateLimiter.registerSend();
    typing.stop();

    try {
      // EDIT FLOW
      if (editingId) {
        await composer.edit({
          messageId: editingId,
          text: input.trim(),
          adapter,
        });

        cancelEdit();
        return;
      }

      // BUILD PAYLOAD
      const built = composer.build({
        text: input,
        attachments,
        replyTo,
        threadId,
        senderId: currentUserId,
      });

      // optimistic message
      addOptimisticMessage(built.optimistic);

      // clear UI early
      setInput("");
      setAttachments([]);
      cancelReply();
      drafts.clear();

      // OFFLINE QUEUE
      if (!network.online) {
        await queueOfflineMessage({
          clientTempId: built.payload.clientTempId,
          threadId,
          payload: built.payload,
          createdAt: Date.now(),
        });
        return;
      }

      // UPLOAD (if any)
      if (attachments.length) {
        const uploaded = await uploads.upload(
          attachments
        );
        built.payload.attachments = uploaded;
      }

      // SEND WS
      sendMessageWS(built.payload);
    } catch (err) {
      reportError(err);
    }
  }

  /* ================= VOICE ================= */
  async function sendVoice(file: File) {
    try {
      const built = composer.buildVoice({
        file,
        threadId,
        senderId: currentUserId,
      });

      addOptimisticMessage(built.optimistic);

      if (!network.online) {
        await queueOfflineMessage({
          clientTempId: built.payload.clientTempId,
          threadId,
          payload: built.payload,
          createdAt: Date.now(),
        });
        return;
      }

      const uploaded = await uploads.upload([file]);
      built.payload.attachments = uploaded;

      sendMessageWS(built.payload);
    } catch (err) {
      reportError(err);
    }
  }

  /* ================= API ================= */
  return {
    input,
    setInput: updateInput,

    attachments,
    setAttachments,

    replyTo,
    startReply,
    cancelReply,

    editingId,
    startEdit,
    cancelEdit,

    canSend,
    send,
    sendVoice,
  };
}
