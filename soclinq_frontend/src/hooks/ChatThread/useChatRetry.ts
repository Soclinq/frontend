import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/types/chat";
import { saveRetry, removeRetry, loadRetries } from "@/lib/retryStore";

type Params = {
  onRetryMessage?: (msg: ChatMessage) => Promise<void>;
  sendChunk?: (opts: {
    msg: ChatMessage;
    chunkIndex: number;
    totalChunks: number;
  }) => Promise<void>;
};

const MAX_CONCURRENT = 2;
const BASE_DELAY = 1500;

export function useChatRetry(
  { onRetryMessage, sendChunk }: Params = {}
) {
  const queue = useRef<ChatMessage[]>([]);
  const inflight = useRef(0);
  const timers = useRef<Map<string, number>>(new Map());
  const [retrying, setRetrying] = useState<Set<string>>(new Set());

  const keyOf = (m: ChatMessage) =>
    m.clientTempId || m.messageHash || m.id;

  const drain = async () => {
    if (inflight.current >= MAX_CONCURRENT) return;
    const msg = queue.current.shift();
    if (!msg) return;

    inflight.current++;
    setRetrying((s) => new Set(s).add(keyOf(msg)));

    try {
      if (msg.attachments?.some((a) => a.type === "VIDEO") && sendChunk) {
        // simplified: resume from chunk 0
        await sendChunk({ msg, chunkIndex: 0, totalChunks: 1 });
      } else if (onRetryMessage) {
        await onRetryMessage(msg);
      }

      await removeRetry(msg);
    } catch {
      schedule(msg);
    } finally {
      inflight.current--;
      setRetrying((s) => {
        const n = new Set(s);
        n.delete(keyOf(msg));
        return n;
      });
      drain();
    }
  };

  const schedule = (msg: ChatMessage) => {
    const key = keyOf(msg);
    if (timers.current.has(key)) return;

    saveRetry(msg);

    const delay = BASE_DELAY * 2;
    const t = window.setTimeout(() => {
      timers.current.delete(key);
      queue.current.push(msg);
      drain();
    }, delay);

    timers.current.set(key, t);
  };

  const retryMessage = useCallback((msg: ChatMessage) => {
    queue.current.push(msg);
    drain();
  }, []);

  const autoRetryFailed = useCallback((messages: ChatMessage[]) => {
    messages.forEach((m) => {
      if (m.isMine && m.status === "failed") {
        schedule(m);
      }
    });
  }, []);

  const isRetrying = useCallback(
    (msg: ChatMessage) => retrying.has(keyOf(msg)),
    [retrying]
  );

  useEffect(() => {
    loadRetries().then((msgs) => {
      queue.current.push(...msgs);
      drain();
    });
  }, []);

  return {
    retryMessage,
    autoRetryFailed,
    isRetrying,
  };
}
