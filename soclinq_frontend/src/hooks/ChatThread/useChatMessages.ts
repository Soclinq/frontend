import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import type {
  ChatAdapter,
  SendMessagePayload,
} from "@/types/chatAdapterTypes";
import type { ChatMessage } from "@/types/chat";

type Params = {
  threadId: string;
  adapter: ChatAdapter;
  ws: {
    connected: boolean;
    sendMessageWS: (payload: SendMessagePayload) => void;
    scrollToBottom: (smooth?: boolean) => void;
  };
};

export function useChatMessages({ threadId, adapter, ws }: Params) {
  /* ================= STATE ================= */

  const [list, setList] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const listRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    listRef.current = list;
  }, [list]);

  /* ================= HELPERS ================= */

  const updateMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setList((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
      );
    },
    []
  );

  const addMessage = useCallback((msg: ChatMessage) => {
    setList((prev) => [...prev, msg]);
  }, []);

  /* ================= LOAD INITIAL ================= */

  useEffect(() => {
    if (!threadId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await authFetch(adapter.listMessages(threadId), {
          credentials: "include",
        });

        const data = await res.json();
        if (!res.ok) throw new Error();

        if (!cancelled) {
          setList(data.messages || []);
        }
      } catch {
        if (!cancelled) setError("Failed to load messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadId, adapter]);

  /* ================= SEND TEXT ================= */

  const sendText = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      const clientTempId = `tmp-${Date.now()}`;

      const optimistic: ChatMessage = {
        id: clientTempId,
        clientTempId,
        hubId: threadId,
        messageType: "TEXT",
        text: clean,
        createdAt: new Date().toISOString(),
        isMine: true,
        status: "sending",
        replyTo: replyTo
          ? {
              id: replyTo.id,
              senderName: replyTo.isMine ? "You" : replyTo.sender.name,
              text: replyTo.text || "Message",
            }
          : null,
        reactions: [],
        sender: { id: "me", name: "You" },
      };

      addMessage(optimistic);
      setReplyTo(null);
      ws.scrollToBottom(true);

      if (!ws.connected) {
        updateMessage(clientTempId, { status: "failed" });
        return;
      }

      try {
        setSending(true);

        const payload: SendMessagePayload = {
          clientTempId,
          messageType: "TEXT",
          text: clean,
          replyToId: replyTo?.id ?? null,
        };

        ws.sendMessageWS(payload);
      } catch {
        updateMessage(clientTempId, { status: "failed" });
      } finally {
        setSending(false);
      }
    },
    [threadId, ws, replyTo, addMessage, updateMessage]
  );

  /* ================= EDIT ================= */

  const editMessage = useCallback(
    async (id: string, newText: string) => {
      const clean = newText.trim();
      if (!clean) return;

      updateMessage(id, { text: clean });
      setEditingId(null);

      try {
        await authFetch(adapter.edit(id), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text: clean }),
        });
      } catch {
        // soft-fail, UI already updated
      }
    },
    [adapter, updateMessage]
  );

  /* ================= RETRY ================= */

  const retryMessage = useCallback(
    (msg: ChatMessage) => {
      if (msg.status !== "failed") return;

      updateMessage(msg.id, { status: "sending" });

      const payload: SendMessagePayload = {
        clientTempId: msg.clientTempId || msg.id,
        messageType: msg.messageType,
        text: msg.text || "",
        replyToId: msg.replyTo?.id ?? null,
      };

      ws.sendMessageWS(payload);
    },
    [ws, updateMessage]
  );

  /* ================= PUBLIC API ================= */

  return {
    /* data */
    list,
    loading,
    sending,
    error,

    /* reply */
    replyTo,
    startReply: setReplyTo,
    clearReply: () => setReplyTo(null),

    /* edit */
    editingId,
    startEdit: setEditingId,
    editMessage,

    /* send */
    sendText,

    /* retry */
    retryMessage,

    /* internal (used by ws hook) */
    setList,
  };
}
