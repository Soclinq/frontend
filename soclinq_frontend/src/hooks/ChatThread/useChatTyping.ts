import { useCallback, useEffect, useRef } from "react";
import type { ChatAdapter } from "@/types/chatAdapterTypes";

/**
 * Handles typing start / stop signals in a safe, debounced way.
 * This hook does NOT manage UI state.
 */
export function useChatTyping(
  adapter: ChatAdapter,
  threadId: string
) {
  const typingRef = useRef(false);
  const stopTimerRef = useRef<number | null>(null);

  const TYPING_STOP_DELAY = 1800; // ms

  const canType =
    adapter?.features?.typing &&
    typeof adapter.sendTyping === "function" &&
    typeof adapter.sendTypingStop === "function";

  /**
   * Emit typing:start (debounced)
   */
  const send = useCallback(() => {
    if (!canType) return;

    // first keystroke
    if (!typingRef.current) {
      typingRef.current = true;
      try {
        adapter.sendTyping(threadId);
      } catch {
        // never throw
      }
    }

    // reset stop timer
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
    }

    stopTimerRef.current = window.setTimeout(() => {
      stop();
    }, TYPING_STOP_DELAY);
  }, [adapter, threadId, canType]);

  /**
   * Emit typing:stop (idempotent)
   */
  const stop = useCallback(() => {
    if (!canType) return;
    if (!typingRef.current) return;

    typingRef.current = false;

    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }

    try {
      adapter.sendTypingStop(threadId);
    } catch {
      // never throw
    }
  }, [adapter, threadId, canType]);

  /**
   * Stop typing on unmount / tab close
   */
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    send, // call on input change
    stop, // call on blur / idle / send
  };
}
