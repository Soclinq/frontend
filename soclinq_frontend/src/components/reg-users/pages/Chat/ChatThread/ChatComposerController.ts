"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, SendMessagePayload } from "@/types/chat";
import type { ChatAdapter } from "@/types/chatAdapterTypes";
import type { PublicUserProfile } from "@/types/profile";

import {
  useChatComposer,
  useChatDrafts,
  useChatUploads,
  useChatRateLimiter,
  useChatNetworkAwareness,
  useChatErrorBoundary,
  useChatRetry,
} from "@/hooks/ChatThread";

import { useChatTypingEmitter } from "@/hooks/ChatThread/useChatTypingEmitter";
import { queueOfflineMessage } from "@/lib/chatOfflineQueue";

type Options = {
  threadId: string;
  adapter: ChatAdapter;
  currentUser: PublicUserProfile | null;
  sendMessageWS: (payload: SendMessagePayload) => void;
  addOptimisticMessage: (msg: ChatMessage) => void;
};

export function useChatComposerController({
  threadId,
  adapter,
  currentUser,
  sendMessageWS,
  addOptimisticMessage,
}: Options) {
  /* ================= Core state ================= */
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const draftHydratedThreadRef = useRef<string | null>(null);

  /* ================= Hooks ================= */
  const composer = useChatComposer();
  const drafts = useChatDrafts({ threadId });

  const uploads = useChatUploads({
    uploadEndpoint: adapter.uploadEndpoint,
    maxParallel: 2,
  });

  const typing = useChatTypingEmitter(adapter, threadId);
  const rateLimiter = useChatRateLimiter({ max: 5, perMs: 3000 });
  const network = useChatNetworkAwareness();
  const reportError = useChatErrorBoundary();

  /* ================= Retry ================= */
  useChatRetry({
    onRetryMessage: async (msg) => {
      if (msg.messageType === "SYSTEM") return;

      sendMessageWS({
        clientTempId: msg.clientTempId ?? msg.id,
        messageType: msg.messageType,
        text: msg.text,
        replyToId: msg.replyTo?.id ?? null,
        attachments: msg.attachments,
      });
    },
  });

  /* ================= Derived ================= */
  const canSend = useMemo(
    () => Boolean(input.trim() || attachments.length || editingId),
    [input, attachments, editingId]
  );

  /* ================= Input ================= */
  function updateInput(v: string) {
    setInput(v);
    drafts.save(v);
    typing.send(); // ✅ emit typing:start
  }

  useEffect(() => {
    if (!drafts.isHydrated) return;
    if (draftHydratedThreadRef.current === threadId) return;

    setInput(drafts.draft.text);
    draftHydratedThreadRef.current = threadId;
  }, [drafts.draft.text, drafts.isHydrated, threadId]);

  useEffect(() => {
    draftHydratedThreadRef.current = null;
    setInput("");
    setAttachments([]);
    setReplyTo(null);
    setEditingId(null);
  }, [threadId]);

  /* ================= Send ================= */
  async function send() {
    
    if (!currentUser) return;
    const hasContent =
        Boolean(input.trim()) ||
        attachments.length > 0 ||
        editingId !== null;
  
    if (!hasContent || !rateLimiter.canSend()) return;
    
    rateLimiter.registerSend();
    typing.stop();
  
    const currentAttachments = attachments;
    const currentInput = input;
    const currentReply = replyTo;
  
    try {
      if (editingId) {
        await composer.edit({
          messageId: editingId,
          text: currentInput.trim(),
          adapter,
        });
  
        setEditingId(null);
        setInput("");
        return;
      }
  
      const built = composer.build({
        text: currentInput,
        attachments: currentAttachments,
        replyTo: currentReply,
        hubId: threadId,
        sender: currentUser,
      });

      // inside send() in ChatComposerController.ts
    console.log('[composer] optimistic add', built.payload.clientTempId, built.payload.text);
    console.log("[SEND TRIGGERED]");
    console.log("[payload]", built.payload);
    
    
  
      addOptimisticMessage(built.optimistic);
  
      // ✅ Clear UI AFTER capture
      setInput("");
      setAttachments([]);
      setReplyTo(null);
      drafts.clear();
  
      if (!network.online) {
        await queueOfflineMessage({
          clientTempId: built.payload.clientTempId,
          threadId,
          payload: built.payload,
          createdAt: Date.now(),
        });
        return;
      }
  
      if (uploads && currentAttachments.length) {
        for (const file of currentAttachments) {
          await uploads.enqueueUpload(file, {
            threadId,
            clientTempId: built.payload.clientTempId,
          });
        }
      }
  
      sendMessageWS(built.payload);
    } catch (err) {
      reportError(err);
    }
  }
  

  /* ================= Voice ================= */
  async function sendVoice(file: File) {
    if (!currentUser) return;

    typing.stop(); // ✅ voice cancels typing

    try {
      const built = composer.buildVoice({
        file,
        hubId: threadId,
        sender: currentUser,
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

      if (uploads) {
        await uploads.enqueueUpload(file, {
          threadId,
          clientTempId: built.payload.clientTempId,
        });
      }

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
    startReply: setReplyTo,
    cancelReply: () => setReplyTo(null),
    editingId,
    startEdit: (m: ChatMessage) => {
      setEditingId(m.id);
      setInput(m.text ?? "");
    },
    cancelEdit: () => {
      setEditingId(null);
      setInput("");
    },
    canSend,
    send,
    sendVoice,
  };
}
