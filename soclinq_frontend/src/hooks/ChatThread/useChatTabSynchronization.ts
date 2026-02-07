import { useEffect, useRef } from "react";

type Options = {
  threadId: string;
  onSeenSync?: (messageIds: string[]) => void;
  onDraftSync?: (draft: string) => void;
};

type Payload =
  | { type: "SEEN"; messageIds: string[] }
  | { type: "DRAFT"; draft: string };

export function useChatTabSynchronization({
  threadId,
  onSeenSync,
  onDraftSync,
}: Options) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const selfIdRef = useRef<string>(
    crypto.randomUUID()
  );

  useEffect(() => {
    if (!threadId) return;

    const channelName = `soclinq_chat_${threadId}`;
    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    channel.onmessage = (e) => {
      const { sender, payload } = e.data || {};
      if (sender === selfIdRef.current) return;

      if (!payload) return;

      switch (payload.type) {
        case "SEEN":
          onSeenSync?.(payload.messageIds);
          break;
        case "DRAFT":
          onDraftSync?.(payload.draft);
          break;
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [threadId, onSeenSync, onDraftSync]);

  function broadcast(payload: Payload) {
    channelRef.current?.postMessage({
      sender: selfIdRef.current,
      payload,
    });
  }

  return {
    broadcastSeen(messageIds: string[]) {
      broadcast({ type: "SEEN", messageIds });
    },
    broadcastDraft(draft: string) {
      broadcast({ type: "DRAFT", draft });
    },
  };
}
